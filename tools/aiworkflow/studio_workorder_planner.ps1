param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing JSON file: $Path"
    }

    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    return $text | ConvertFrom-Json
}

function ConvertTo-StudioJson {
    param([object]$Value)

    $Value | ConvertTo-Json -Depth 64
}

function New-SafetyState {
    param(
        [bool]$BacklogWritten = $false,
        [bool]$WorkOrderWritten = $false,
        [bool]$TaskBindingWritten = $false
    )

    return [pscustomobject]@{
        read_only = (-not $BacklogWritten -and -not $WorkOrderWritten -and -not $TaskBindingWritten)
        workorder_written = $WorkOrderWritten
        backlog_written = $BacklogWritten
        task_binding_written = $TaskBindingWritten
        active_task_changed = $false
        approval_changed = $false
        runner_started = $false
        source_changed = $false
        git_changed = $false
    }
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }

    return @($Value | ForEach-Object { [string]$_ })
}

function Limit-Text {
    param(
        [string]$Text,
        [int]$Max = 180
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    $clean = [regex]::Replace($Text.Trim(), "\s+", " ")
    if ($clean.Length -le $Max) {
        return $clean
    }

    return $clean.Substring(0, [Math]::Max(0, $Max - 3)).TrimEnd() + "..."
}

function Add-Unique {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    $trimmed = $Value.Trim()
    if (-not $List.Contains($trimmed)) {
        $List.Add($trimmed)
    }
}

function Read-StaffRegistry {
    param([string]$Root)

    $path = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\staff_agents.initial.json"
    $data = Read-JsonFile -Path $path
    $map = @{}
    foreach ($staff in @($data.staff_agents)) {
        $id = [string]$staff.agent_id
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $map[$id] = $staff
        }
    }
    return $map
}

function Resolve-RepoPath {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return (Resolve-Path -LiteralPath $Path).Path
    }

    return (Resolve-Path -LiteralPath (Join-Path $Root $Path)).Path
}

function Get-FullPathNoResolve {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $Root $Path))
}

function Assert-PathInsideRepo {
    param(
        [string]$Root,
        [string]$Path,
        [string]$Label
    )

    $repo = (Resolve-Path -LiteralPath $Root).Path
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    if ($resolved -ne $repo -and -not $resolved.StartsWith($repo + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "$Label must stay inside repository root: $resolved"
    }
}

function New-EmptyStringList {
    return New-Object System.Collections.Generic.List[string]
}

function Convert-AgentIdToRole {
    param(
        [hashtable]$StaffMap,
        [string]$AgentId
    )

    if ($StaffMap.ContainsKey($AgentId)) {
        return [string]$StaffMap[$AgentId].role_title
    }

    return $AgentId
}

function Test-ContainsAny {
    param(
        [string]$Text,
        [string[]]$Terms
    )

    foreach ($term in $Terms) {
        if ($Text -match [regex]::Escape($term)) {
            return $true
        }
    }
    return $false
}

function Get-TaskClassification {
    param([object]$WorkOrder)

    $department = ([string]$WorkOrder.department_id).ToLowerInvariant()
    $combined = @(
        [string]$WorkOrder.objective
        (Get-StringArray -Value $WorkOrder.scope) -join " "
        (Get-StringArray -Value $WorkOrder.non_goals) -join " "
        (Get-StringArray -Value $WorkOrder.expected_outputs) -join " "
        (Get-StringArray -Value $WorkOrder.verification_plan) -join " "
    ) -join " "

    $lower = $combined.ToLowerInvariant()
    $category = "DOC"
    $kind = "documentation"
    $workflowPath = "studio_workorder_to_task"

    if ($department -eq "engineering") {
        $category = "WF"
        $kind = "implementation"
        $workflowPath = "workflow_maintenance"
    } elseif ($department -eq "qa_testing" -or (Test-ContainsAny -Text $lower -Terms @("validate", "validation", "verify", "test", "qa"))) {
        $category = "VAL"
        $kind = "validation"
        $workflowPath = "validation"
    } elseif ((Test-ContainsAny -Text $lower -Terms @("source code", "game data", "json data", "schema", "runtime", "implementation")) -and -not (Test-ContainsAny -Text $lower -Terms @("no source code", "no game data", "no json data", "no implementation"))) {
        $category = "GAME"
        $kind = "data"
        $workflowPath = "gameplay"
    }

    $approvalTypes = @($WorkOrder.approval_items | ForEach-Object { [string]$_.type })
    $priority = "P2"
    $risk = "low"

    if ($approvalTypes -contains "implementation" -or $approvalTypes -contains "external_tool" -or $approvalTypes -contains "asset_import" -or $approvalTypes -contains "git") {
        $priority = "P1"
        $risk = "high"
    } elseif ($approvalTypes -contains "canon" -or $category -eq "GAME" -or $kind -eq "implementation") {
        $priority = "P1"
        $risk = "medium"
    }

    return [pscustomobject]@{
        category = $category
        kind = $kind
        priority = $priority
        risk = $risk
        workflow_path = $workflowPath
    }
}

function New-TaskDraftFromWorkOrder {
    param(
        [object]$WorkOrder,
        [hashtable]$StaffMap
    )

    $classification = Get-TaskClassification -WorkOrder $WorkOrder
    $roles = New-Object System.Collections.Generic.List[string]
    foreach ($agentId in Get-StringArray -Value $WorkOrder.assigned_agents) {
        Add-Unique -List $roles -Value (Convert-AgentIdToRole -StaffMap $StaffMap -AgentId $agentId)
    }
    if ($roles.Count -eq 0) {
        Add-Unique -List $roles -Value "Orchestrator"
    }
    Add-Unique -List $roles -Value "Reviewer"

    $gates = New-Object System.Collections.Generic.List[string]
    Add-Unique -List $gates -Value "Human Director must review the WorkOrder-derived task scope before Backlog creation."
    Add-Unique -List $gates -Value "WorkOrder approval does not approve task execution, completion, commit, or push."

    foreach ($item in @($WorkOrder.approval_items)) {
        Add-Unique -List $gates -Value ("Approval item: " + (Limit-Text -Text ([string]$item.plain_language_summary) -Max 160))
    }

    $validation = New-Object System.Collections.Generic.List[string]
    foreach ($item in Get-StringArray -Value $WorkOrder.verification_plan) {
        Add-Unique -List $validation -Value $item
    }
    foreach ($item in Get-StringArray -Value $WorkOrder.evidence_requirements) {
        Add-Unique -List $validation -Value ("Evidence required: " + $item)
    }
    Add-Unique -List $validation -Value "Confirm generated task scope matches WorkOrder scope and non-goals."
    Add-Unique -List $validation -Value "Confirm no Backlog, ActiveTask, approval, runner, source, git, commit, or push change happened during planning."

    $questions = New-Object System.Collections.Generic.List[string]
    if ($WorkOrder.status -eq "director_review") {
        Add-Unique -List $questions -Value "Should this WorkOrder be approved for task creation, narrowed, rejected, or sent back for changes?"
    }

    $title = "Studio WorkOrder task: " + (Limit-Text -Text ([string]$WorkOrder.objective) -Max 120)
    $reasonParts = @(
        "Derived read-only from Studio WorkOrder $($WorkOrder.work_order_id)."
        "Source: $($WorkOrder.source_type) $($WorkOrder.source_ref)."
        "Objective: $($WorkOrder.objective)"
        "This is a TaskDraft preview only; it does not create a Backlog task."
    )

    return [pscustomobject]@{
        title = $title
        category = $classification.category
        priority = $classification.priority
        kind = $classification.kind
        reason = ($reasonParts -join " ")
        suggested_risk = $classification.risk
        workflow_path = $classification.workflow_path
        recommended_roles = @($roles)
        human_decision_gates = @($gates)
        required_validation = @($validation)
        suggested_next_manual_action = "Review this WorkOrder-derived TaskDraft. If accepted, create a Backlog task through the regular AIWorkflow task creation path; do not treat this preview as approval."
        clarifying_questions = @($questions)
        confidence = 0.82
    }
}

function New-BacklogRowPreview {
    param(
        [object]$WorkOrder,
        [object]$TaskDraft
    )

    $idPrefix = [string]$TaskDraft.category
    $placeholderId = "$idPrefix-<generated>"
    $reason = Limit-Text -Text ([string]$TaskDraft.reason) -Max 260
    $validation = "studio workorder draft: work_order=$($WorkOrder.work_order_id); risk=$($TaskDraft.suggested_risk); workflow_path=$($TaskDraft.workflow_path); validation pending human approval"
    return "| $placeholderId | $($TaskDraft.priority) | todo | $($TaskDraft.kind) | $($TaskDraft.title) | $reason | Studio WorkOrder -> TaskDraft -> human review | $validation |"
}

function Get-BacklogPath {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Docs\AIWorkflow\Backlog.md")
    }

    $resolved = Resolve-RepoPath -Root $Root -Path $OverridePath
    Assert-PathInsideRepo -Root $Root -Path $resolved -Label "Backlog path override"

    $tempRoot = (Join-Path $Root "_Temp")
    if (-not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "Backlog path override is only allowed under _Temp for validation: $resolved"
    }

    return $resolved
}

function Get-WorkOrderStorePath {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Docs\AIWorkflow\Studio\WorkOrders")
    }

    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $repo = (Resolve-Path -LiteralPath $Root).Path
    if ($resolved -ne $repo -and -not $resolved.StartsWith($repo + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "WorkOrder store override must stay inside repository root: $resolved"
    }

    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if (-not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "WorkOrder store override is only allowed under _Temp for validation: $resolved"
    }

    return $resolved
}

function Get-WorkOrderFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $StorePath -Filter "WO-*.json" -File | Sort-Object Name)
}

function Test-WorkOrderShape {
    param([object]$WorkOrder)

    $errors = New-Object System.Collections.Generic.List[string]
    $required = @(
        "work_order_id",
        "source_type",
        "source_ref",
        "objective",
        "department_id",
        "assigned_agents",
        "scope",
        "non_goals",
        "expected_outputs",
        "approval_items",
        "evidence_requirements",
        "verification_plan",
        "handoff_plan",
        "target_project_profile",
        "status"
    )
    foreach ($field in $required) {
        if ($null -eq $WorkOrder.PSObject.Properties[$field]) {
            Add-Unique -List $errors -Value "Missing required field: $field"
        }
    }

    $workOrderId = [string]$WorkOrder.work_order_id
    if ($workOrderId -notmatch "^WO-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Unique -List $errors -Value "Invalid work_order_id: $workOrderId"
    }
    if (@("draft", "proposed", "director_review", "approved_for_tasking", "tasking", "tasks_open", "completion_review", "completed", "blocked", "rejected", "superseded") -notcontains ([string]$WorkOrder.status)) {
        Add-Unique -List $errors -Value "Invalid status: $($WorkOrder.status)"
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        work_order_id = $workOrderId
        errors = @($errors)
    }
}

function New-StoreStatusResult {
    param(
        [string]$Root,
        [string]$StorePathOverride
    )

    $storePath = Get-WorkOrderStorePath -Root $Root -OverridePath $StorePathOverride
    $files = Get-WorkOrderFiles -StorePath $storePath
    return [pscustomobject]@{
        ok = $true
        command = "status"
        store_path = $storePath
        work_order_count = @($files).Count
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [string]$Root,
        [string]$StorePathOverride
    )

    $storePath = Get-WorkOrderStorePath -Root $Root -OverridePath $StorePathOverride
    $items = @()
    foreach ($file in (Get-WorkOrderFiles -StorePath $storePath)) {
        try {
            $workOrder = Read-JsonFile -Path $file.FullName
            $items += [pscustomobject]@{
                work_order_id = [string]$workOrder.work_order_id
                status = [string]$workOrder.status
                department_id = [string]$workOrder.department_id
                objective = [string]$workOrder.objective
                file = $file.Name
            }
        } catch {
            $items += [pscustomobject]@{
                work_order_id = "(parse failed)"
                status = "invalid"
                department_id = ""
                objective = $_.Exception.Message
                file = $file.Name
            }
        }
    }

    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_path = $storePath
        work_orders = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$WorkOrderId,
        [string]$StorePathOverride
    )

    $storePath = Get-WorkOrderStorePath -Root $Root -OverridePath $StorePathOverride
    $target = Join-Path $storePath ($WorkOrderId + ".json")
    if (-not (Test-Path -LiteralPath $target)) {
        return [pscustomobject]@{
            ok = $false
            command = "read"
            error = "WorkOrder not found: $WorkOrderId"
            store_path = $storePath
            safety = New-SafetyState
        }
    }

    $workOrder = Read-JsonFile -Path $target
    $shape = Test-WorkOrderShape -WorkOrder $workOrder
    return [pscustomobject]@{
        ok = $shape.ok
        command = "read"
        store_path = $storePath
        work_order = $workOrder
        validation = $shape
        safety = New-SafetyState
    }
}

function New-StoreResult {
    param(
        [string]$Root,
        [string]$WorkOrderPath,
        [bool]$Execute,
        [string]$StorePathOverride
    )

    $resolvedPath = Resolve-RepoPath -Root $Root -Path $WorkOrderPath
    $workOrder = Read-JsonFile -Path $resolvedPath
    $shape = Test-WorkOrderShape -WorkOrder $workOrder
    $storePath = Get-WorkOrderStorePath -Root $Root -OverridePath $StorePathOverride
    $targetPath = Join-Path $storePath ([string]$workOrder.work_order_id + ".json")

    if (-not $shape.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "store"
            execute = $Execute
            work_order_path = $resolvedPath
            target_path = $targetPath
            validation = $shape
            safety = New-SafetyState
        }
    }

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "store"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with store <work_order_json_path> --execute to write the WorkOrder record."
            work_order_id = [string]$workOrder.work_order_id
            target_path = $targetPath
            validation = $shape
            safety = New-SafetyState
        }
    }

    if (Test-Path -LiteralPath $targetPath) {
        throw "WorkOrder already exists in store: $targetPath"
    }
    if (-not (Test-Path -LiteralPath $storePath)) {
        New-Item -ItemType Directory -Path $storePath -Force | Out-Null
    }

    $json = ($workOrder | ConvertTo-Json -Depth 64) + [Environment]::NewLine
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, $json, $encoding)

    return [pscustomobject]@{
        ok = $true
        command = "store"
        execute = $true
        work_order_id = [string]$workOrder.work_order_id
        target_path = $targetPath
        validation = $shape
        safety = New-SafetyState -WorkOrderWritten $true
    }
}

function Parse-TableLine {
    param([string]$Line)

    $trimmed = ([string]$Line).Trim()
    if (-not $trimmed.StartsWith("|") -or -not $trimmed.EndsWith("|")) {
        return @()
    }

    $inner = $trimmed.Substring(1, $trimmed.Length - 2)
    $values = New-Object System.Collections.Generic.List[string]
    $current = ""
    for ($index = 0; $index -lt $inner.Length; $index += 1) {
        $char = $inner[$index]
        $previous = if ($index -gt 0) { $inner[$index - 1] } else { [char]0 }
        if ($char -eq "|" -and $previous -ne "\") {
            $values.Add($current.Trim().Replace("\|", "|"))
            $current = ""
        } else {
            $current += $char
        }
    }
    $values.Add($current.Trim().Replace("\|", "|"))
    return @($values)
}

function Format-TableCell {
    param([object]$Value)

    $cellValue = ""
    if ($null -ne $Value) {
        $cellValue = [string]$Value
    }

    $cellValue = $cellValue.Replace("`r", " ")
    $cellValue = $cellValue.Replace("`n", " ")
    $cellValue = $cellValue.Replace("|", "\|")
    return $cellValue.Trim()
}

function Format-BacklogRow {
    param([object]$Task)

    $cells = @(
        $Task.id,
        $Task.priority,
        $Task.status,
        $Task.kind,
        $Task.item,
        $Task.reason,
        $Task.tool_route,
        $Task.validation
    )

    return "| " + (($cells | ForEach-Object { Format-TableCell -Value $_ }) -join " | ") + " |"
}

function Get-BacklogTable {
    param([string]$Content)

    $header = @("ID", "Priority", "Status", "Kind", "Item", "Reason", "Tool Route", "Validation")
    $lines = @($Content -split "`r?`n")
    $headerIndex = -1
    for ($index = 0; $index -lt $lines.Count; $index += 1) {
        $values = @(Parse-TableLine -Line $lines[$index])
        if ($values.Count -eq $header.Count) {
            $same = $true
            for ($i = 0; $i -lt $header.Count; $i += 1) {
                if ($values[$i] -ne $header[$i]) {
                    $same = $false
                    break
                }
            }
            if ($same) {
                $headerIndex = $index
                break
            }
        }
    }

    if ($headerIndex -lt 0) {
        throw "Backlog table header was not found."
    }

    $rowEndIndex = $headerIndex + 2
    $rows = @()
    while ($rowEndIndex -lt $lines.Count -and $lines[$rowEndIndex].Trim().StartsWith("|")) {
        $values = @(Parse-TableLine -Line $lines[$rowEndIndex])
        if ($values.Count -eq $header.Count) {
            $rows += ,$values
        }
        $rowEndIndex += 1
    }

    return [pscustomobject]@{
        lines = $lines
        header_index = $headerIndex
        row_end_index = $rowEndIndex
        rows = @($rows)
    }
}

function New-TaskId {
    param(
        [object]$Table,
        [string]$Category
    )

    $existing = New-Object System.Collections.Generic.HashSet[string]
    foreach ($row in @($Table.rows)) {
        if (@($row).Count -gt 0) {
            [void]$existing.Add([string]$row[0])
        }
    }

    $now = Get-Date
    for ($offset = 0; $offset -lt 60; $offset += 1) {
        $candidateTime = $now.AddSeconds($offset)
        $candidate = ("{0}-{1}" -f $Category, $candidateTime.ToString("yyyyMMdd-HHmmss"))
        if (-not $existing.Contains($candidate)) {
            return $candidate
        }
    }

    throw "Failed to generate unique task id within one minute."
}

function New-BacklogTaskFromDraft {
    param(
        [object]$WorkOrder,
        [object]$Draft,
        [string]$TaskId
    )

    $objective = ([string]$WorkOrder.objective).Trim().TrimEnd(".")
    $reason = "Created from Studio WorkOrder $($WorkOrder.work_order_id) ($($WorkOrder.source_type) $($WorkOrder.source_ref)). Objective: $objective. Requires normal AIWorkflow review, approval, execution, completion, and git gates."

    return [pscustomobject]@{
        id = $TaskId
        priority = $Draft.priority
        status = "todo"
        kind = $Draft.kind
        item = $Draft.title
        reason = Limit-Text -Text $reason -Max 320
        tool_route = "Studio WorkOrder -> TaskDraft -> human review"
        validation = "studio workorder draft: work_order=$($WorkOrder.work_order_id); risk=$($Draft.suggested_risk); workflow_path=$($Draft.workflow_path); validation pending human approval"
    }
}

function Get-TaskBindingStorePath {
    param(
        [string]$Root,
        [string]$BacklogPath
    )

    $approvedBacklog = (Resolve-Path -LiteralPath (Join-Path $Root "_Docs\AIWorkflow\Backlog.md")).Path
    $resolvedBacklog = (Resolve-Path -LiteralPath $BacklogPath).Path
    if ($resolvedBacklog -eq $approvedBacklog) {
        return (Join-Path $Root "_Docs\AIWorkflow\Studio\TaskBindings")
    }
    return (Join-Path $Root "_Temp\AIWorkflowStudio\task_bindings")
}

function New-TaskBindingId {
    param(
        [string]$TaskId,
        [string]$StorePath
    )

    $slug = ([string]$TaskId).ToLowerInvariant() -replace "[^a-z0-9-]", "-"
    $slug = $slug.Trim("-")
    if ($slug.Length -gt 36) {
        $slug = $slug.Substring(0, 36).Trim("-")
    }
    $now = Get-Date
    for ($offset = 0; $offset -lt 60; $offset += 1) {
        $candidateTime = $now.AddSeconds($offset)
        $candidate = "WOTB-{0}-{1}" -f $candidateTime.ToString("yyyyMMdd-HHmmss"), $slug
        $candidatePath = Join-Path $StorePath ($candidate + ".json")
        if (-not (Test-Path -LiteralPath $candidatePath)) {
            return $candidate
        }
    }
    throw "Failed to generate unique WorkOrderTaskBinding id within one minute."
}

function Get-BindingRelationship {
    param([object]$Draft)

    switch ([string]$Draft.kind) {
        "validation" { return "validation_task" }
        "documentation" { return "documentation_task" }
        "data" { return "primary_task" }
        "implementation" { return "primary_task" }
        default { return "primary_task" }
    }
}

function Get-BindingCreationSource {
    param([object]$WorkOrder)

    switch ([string]$WorkOrder.source_type) {
        "meeting" { return "meeting_follow_up" }
        "proposal" { return "proposal_accepted" }
        "finalization" { return "finalization_request_changes" }
        default { return "director_approved" }
    }
}

function New-TaskBinding {
    param(
        [object]$WorkOrder,
        [object]$Draft,
        [object]$Task,
        [string]$StorePath
    )

    $evidenceRefs = New-Object System.Collections.Generic.List[string]
    Add-Unique -List $evidenceRefs -Value ([string]$WorkOrder.source_ref)
    Add-Unique -List $evidenceRefs -Value ([string]$WorkOrder.work_order_id)
    foreach ($item in Get-StringArray -Value $WorkOrder.evidence_requirements) {
        Add-Unique -List $evidenceRefs -Value $item
    }

    return [pscustomobject]@{
        binding_id = New-TaskBindingId -TaskId ([string]$Task.id) -StorePath $StorePath
        work_order_id = [string]$WorkOrder.work_order_id
        task_id = [string]$Task.id
        relationship = Get-BindingRelationship -Draft $Draft
        creation_source = Get-BindingCreationSource -WorkOrder $WorkOrder
        status = "created"
        authorized_scope = @(Get-StringArray -Value $WorkOrder.scope)
        non_goals = @(Get-StringArray -Value $WorkOrder.non_goals)
        approval_refs = @()
        evidence_refs = @($evidenceRefs)
        runner_run_ids = @()
        completion_report_refs = @()
        finalization_refs = @()
        safety = [pscustomobject]@{
            source_write_authorized = $false
            schema_change_authorized = $false
            canon_change_authorized = $false
            asset_import_authorized = $false
            external_tool_authorized = $false
            commit_authorized = $false
        }
    }
}

function Write-TaskBinding {
    param(
        [string]$Root,
        [string]$BacklogPath,
        [object]$WorkOrder,
        [object]$Draft,
        [object]$Task
    )

    $storePath = Get-TaskBindingStorePath -Root $Root -BacklogPath $BacklogPath
    if (-not (Test-Path -LiteralPath $storePath)) {
        New-Item -ItemType Directory -Path $storePath -Force | Out-Null
    }

    $binding = New-TaskBinding -WorkOrder $WorkOrder -Draft $Draft -Task $Task -StorePath $storePath
    $targetPath = Join-Path $storePath ([string]$binding.binding_id + ".json")
    $json = ($binding | ConvertTo-Json -Depth 64) + [Environment]::NewLine
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, $json, $encoding)

    return [pscustomobject]@{
        binding = $binding
        binding_path = $targetPath
    }
}

function Write-BacklogTask {
    param(
        [string]$Root,
        [string]$BacklogPath,
        [object]$WorkOrder,
        [object]$Draft
    )

    Assert-PathInsideRepo -Root $Root -Path $BacklogPath -Label "Backlog target"

    $approvedBacklog = (Join-Path $Root "_Docs\AIWorkflow\Backlog.md")
    $tempRoot = (Join-Path $Root "_Temp")
    $resolvedBacklog = (Resolve-Path -LiteralPath $BacklogPath).Path
    if ($resolvedBacklog -ne (Resolve-Path -LiteralPath $approvedBacklog).Path -and -not $resolvedBacklog.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "Refusing to write outside approved Backlog.md or _Temp validation path: $resolvedBacklog"
    }

    $content = [System.IO.File]::ReadAllText($resolvedBacklog, [System.Text.Encoding]::UTF8)
    $table = Get-BacklogTable -Content $content
    $taskId = New-TaskId -Table $table -Category ([string]$Draft.category)
    $task = New-BacklogTaskFromDraft -WorkOrder $WorkOrder -Draft $Draft -TaskId $taskId
    $row = Format-BacklogRow -Task $task

    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in @($table.lines)) {
        $lines.Add([string]$line)
    }
    $lines.Insert([int]$table.row_end_index, $row)
    $nextContent = $lines -join "`n"

    $backupPath = $null
    if ($resolvedBacklog -eq (Resolve-Path -LiteralPath $approvedBacklog).Path) {
        $backupDir = Join-Path $Root "_Temp\AIWorkflowStudio\backups"
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        $backupPath = Join-Path $backupDir ("Backlog_{0}.md" -f (Get-Date).ToString("yyyyMMdd_HHmmss_fff"))
        [System.IO.File]::Copy($resolvedBacklog, $backupPath, $false)
    }

    [System.IO.File]::WriteAllText($resolvedBacklog, $nextContent, [System.Text.Encoding]::UTF8)

    return [pscustomobject]@{
        task = $task
        row = $row
        backlog_path = $resolvedBacklog
        backup_path = $backupPath
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$WorkOrderPath
    )

    $resolvedPath = Resolve-RepoPath -Root $Root -Path $WorkOrderPath
    $workOrder = Read-JsonFile -Path $resolvedPath
    $staffMap = Read-StaffRegistry -Root $Root
    $draft = New-TaskDraftFromWorkOrder -WorkOrder $workOrder -StaffMap $staffMap
    $row = New-BacklogRowPreview -WorkOrder $workOrder -TaskDraft $draft

    return [pscustomobject]@{
        ok = $true
        command = "plan"
        work_order_path = $resolvedPath
        work_order_id = $workOrder.work_order_id
        work_order_status = $workOrder.status
        task_draft = $draft
        backlog_row_preview = $row
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [string]$Root,
        [string]$WorkOrderPath,
        [bool]$Execute,
        [string]$BacklogPathOverride
    )

    $plan = New-PlanResult -Root $Root -WorkOrderPath $WorkOrderPath
    $backlogPath = Get-BacklogPath -Root $Root -OverridePath $BacklogPathOverride

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "create"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create <work_order_json_path> --execute to write a Backlog task."
            work_order_id = $plan.work_order_id
            task_draft = $plan.task_draft
            backlog_row_preview = $plan.backlog_row_preview
            target_backlog_path = $backlogPath
            safety = New-SafetyState
        }
    }

    $workOrder = Read-JsonFile -Path $plan.work_order_path
    $write = Write-BacklogTask -Root $Root -BacklogPath $backlogPath -WorkOrder $workOrder -Draft $plan.task_draft
    $bindingWrite = Write-TaskBinding -Root $Root -BacklogPath $backlogPath -WorkOrder $workOrder -Draft $plan.task_draft -Task $write.task
    return [pscustomobject]@{
        ok = $true
        command = "create"
        execute = $true
        work_order_id = $plan.work_order_id
        created_task = $write.task
        backlog_row = $write.row
        backlog_path = $write.backlog_path
        backup_path = $write.backup_path
        task_binding = $bindingWrite.binding
        task_binding_path = $bindingWrite.binding_path
        safety = New-SafetyState -BacklogWritten $true -TaskBindingWritten $true
    }
}

function Write-List {
    param(
        [string]$Label,
        [object[]]$Items
    )

    Write-Host ""
    Write-Host "[$Label]"
    if ($null -eq $Items -or @($Items).Count -eq 0) {
        Write-Host "- None."
        return
    }
    foreach ($item in @($Items)) {
        Write-Host "- $item"
    }
}

function Show-Plan {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio WorkOrder Planner"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "WorkOrder: $($Result.work_order_id)"
    Write-Host "Status: $($Result.work_order_status)"
    Write-Host "Read-only: yes"
    Write-Host ""
    Write-Host "[TaskDraft]"
    Write-Host "- title: $($Result.task_draft.title)"
    Write-Host "- category/kind: $($Result.task_draft.category) / $($Result.task_draft.kind)"
    Write-Host "- priority/risk: $($Result.task_draft.priority) / $($Result.task_draft.suggested_risk)"
    Write-Host "- workflow_path: $($Result.task_draft.workflow_path)"
    Write-List -Label "Recommended roles" -Items $Result.task_draft.recommended_roles
    Write-List -Label "Human decision gates" -Items $Result.task_draft.human_decision_gates
    Write-List -Label "Required validation" -Items $Result.task_draft.required_validation
    Write-List -Label "Clarifying questions" -Items $Result.task_draft.clarifying_questions
    Write-Host ""
    Write-Host "[Suggested next action]"
    Write-Host $Result.task_draft.suggested_next_manual_action
    Write-Host ""
    Write-Host "[Backlog row preview]"
    Write-Host $Result.backlog_row_preview
    Write-List -Label "Safety" -Items @(
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function Show-Create {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio WorkOrder Task Create"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "WorkOrder: $($Result.work_order_id)"
    if (-not $Result.execute) {
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
        Write-Host ""
        Write-Host "[Backlog row preview]"
        Write-Host $Result.backlog_row_preview
        Write-List -Label "Safety" -Items @(
            "Backlog not written",
            "ActiveTask not changed",
            "Approval not changed",
            "Runner not started",
            "Source not changed",
            "Git not changed"
        )
        return
    }

    Write-Host "Mode: execute"
    Write-Host "Created task: $($Result.created_task.id)"
    Write-Host "Backlog: $($Result.backlog_path)"
    Write-Host "TaskBinding: $($Result.task_binding_path)"
    if (-not [string]::IsNullOrWhiteSpace([string]$Result.backup_path)) {
        Write-Host "Backup: $($Result.backup_path)"
    }
    Write-Host ""
    Write-Host "[Created row]"
    Write-Host $Result.backlog_row
    Write-List -Label "Safety" -Items @(
        "Backlog written: yes",
        "WorkOrderTaskBinding written: yes",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function Show-StoreStatus {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio WorkOrder Store"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "WorkOrders: $($Result.work_order_count)"
    Write-List -Label "Safety" -Items @(
        "Read-only",
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function Show-List {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio WorkOrders"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    if (@($Result.work_orders).Count -eq 0) {
        Write-Host "No WorkOrders stored yet."
        return
    }
    foreach ($item in @($Result.work_orders)) {
        Write-Host ""
        Write-Host "$($item.work_order_id) [$($item.status)]"
        Write-Host "- department: $($item.department_id)"
        Write-Host "- objective: $(Limit-Text -Text ([string]$item.objective) -Max 180)"
        Write-Host "- file: $($item.file)"
    }
}

function Show-Read {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        return
    }

    $workOrder = $Result.work_order
    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio WorkOrder"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "ID: $($workOrder.work_order_id)"
    Write-Host "Status: $($workOrder.status)"
    Write-Host "Department: $($workOrder.department_id)"
    Write-Host "Objective: $($workOrder.objective)"
    Write-List -Label "Assigned agents" -Items (Get-StringArray -Value $workOrder.assigned_agents)
    Write-List -Label "Scope" -Items (Get-StringArray -Value $workOrder.scope)
    Write-List -Label "Non-goals" -Items (Get-StringArray -Value $workOrder.non_goals)
    Write-List -Label "Expected outputs" -Items (Get-StringArray -Value $workOrder.expected_outputs)
    Write-List -Label "Verification plan" -Items (Get-StringArray -Value $workOrder.verification_plan)
    Write-List -Label "Evidence requirements" -Items (Get-StringArray -Value $workOrder.evidence_requirements)
    Write-List -Label "Validation errors" -Items $Result.validation.errors
}

function Show-Store {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio WorkOrder Store Write"
    Write-Host "============================================================"
    Write-Host ""
    if (-not $Result.ok) {
        Write-Host "[ERROR] WorkOrder validation failed."
        Write-List -Label "Validation errors" -Items $Result.validation.errors
        return
    }
    Write-Host "WorkOrder: $($Result.work_order_id)"
    if (-not $Result.execute) {
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
        Write-Host "Target: $($Result.target_path)"
        Write-List -Label "Safety" -Items @(
            "WorkOrder not written",
            "Backlog not written",
            "ActiveTask not changed",
            "Approval not changed",
            "Runner not started",
            "Source not changed",
            "Git not changed"
        )
        return
    }
    Write-Host "Mode: execute"
    Write-Host "Stored: $($Result.target_path)"
    Write-List -Label "Safety" -Items @(
        "WorkOrder written: yes",
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_workorder_planner.bat status|list|read <work_order_id>|store <work_order_json_path> [--execute]|plan <work_order_json_path>|create <work_order_json_path> [--execute] [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $backlogPathOverride = ""
    $storePathOverride = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--backlog-path") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--backlog-path requires a path argument."
            }
            $index += 1
            $backlogPathOverride = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--store-path") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--store-path requires a path argument."
            }
            $index += 1
            $storePathOverride = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -lt 1) {
        $result = New-UsageResult
        if ($json) {
            ConvertTo-StudioJson -Value $result
        } else {
            Write-Host "[ERROR] $($result.error)"
        }
        exit 1
    }

    $command = ([string]$cleanArgs[0]).ToLowerInvariant()
    if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
        $result = New-StoreStatusResult -Root $repo -StorePathOverride $storePathOverride
    } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
        $result = New-ListResult -Root $repo -StorePathOverride $storePathOverride
    } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
        $result = New-ReadResult -Root $repo -WorkOrderId ([string]$cleanArgs[1]) -StorePathOverride $storePathOverride
    } elseif ($command -eq "store" -and $cleanArgs.Count -eq 2) {
        $result = New-StoreResult -Root $repo -WorkOrderPath ([string]$cleanArgs[1]) -Execute $execute -StorePathOverride $storePathOverride
    } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
        $result = New-PlanResult -Root $repo -WorkOrderPath ([string]$cleanArgs[1])
    } elseif ($command -eq "create" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Root $repo -WorkOrderPath ([string]$cleanArgs[1]) -Execute $execute -BacklogPathOverride $backlogPathOverride
    } else {
        $result = New-UsageResult
        if ($json) {
            ConvertTo-StudioJson -Value $result
        } else {
            Write-Host "[ERROR] $($result.error)"
        }
        exit 1
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } elseif ($command -eq "create") {
        Show-Create -Result $result
    } elseif ($command -eq "status") {
        Show-StoreStatus -Result $result
    } elseif ($command -eq "list") {
        Show-List -Result $result
    } elseif ($command -eq "read") {
        Show-Read -Result $result
    } elseif ($command -eq "store") {
        Show-Store -Result $result
    } else {
        Show-Plan -Result $result
    }
    exit 0
} catch {
    $message = $_.Exception.Message
    if ($json) {
        [pscustomobject]@{
            ok = $false
            error = $message
            safety = New-SafetyState
        } | ConvertTo-StudioJson
    } else {
        Write-Host "[ERROR] $message"
    }
    exit 1
}
