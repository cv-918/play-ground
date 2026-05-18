param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

function ConvertTo-StudioJson {
    param([object]$Value)

    $Value | ConvertTo-Json -Depth 64
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing JSON file: $Path"
    }
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw "JSON file is empty: $Path"
    }
    return $text | ConvertFrom-Json
}

function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Value
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    $jsonText = $Value | ConvertTo-Json -Depth 64
    [System.IO.File]::WriteAllText($Path, $jsonText + [Environment]::NewLine, $encoding)
}

function Resolve-RepoFilePath {
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

function Get-StoreRoot {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Docs\AIWorkflow\Studio")
    }

    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--store-root override is only allowed under _Temp for validation safety: $resolved"
    }
    return $resolved
}

function Get-Stores {
    param([string]$StoreRoot)

    return [pscustomobject]@{
        root = $StoreRoot
        proposals = Join-Path $StoreRoot "Proposals"
        memory = Join-Path $StoreRoot "MemoryRecords"
        workorders = Join-Path $StoreRoot "WorkOrders"
        handoffs = Join-Path $StoreRoot "Handoffs"
        materializations = Join-Path $StoreRoot "Materializations"
    }
}

function New-SafetyState {
    param(
        [bool]$MaterializationWritten = $false,
        [bool]$ProposalWritten = $false,
        [bool]$MemoryWritten = $false,
        [bool]$WorkOrderWritten = $false,
        [bool]$HandoffWritten = $false
    )

    return [pscustomobject]@{
        read_only = (-not ($MaterializationWritten -or $ProposalWritten -or $MemoryWritten -or $WorkOrderWritten -or $HandoffWritten))
        materialization_written = $MaterializationWritten
        proposal_written = $ProposalWritten
        memory_written = $MemoryWritten
        workorder_written = $WorkOrderWritten
        handoff_written = $HandoffWritten
        task_created = $false
        approval_changed = $false
        canon_changed = $false
        source_changed = $false
        git_changed = $false
        llm_called = $false
    }
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }
    return @($Value | ForEach-Object { [string]$_ })
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

function Get-UniqueStrings {
    param([object[]]$Items)

    $list = New-Object System.Collections.Generic.List[string]
    foreach ($item in @($Items)) {
        Add-Unique -List $list -Value ([string]$item)
    }
    return $list.ToArray()
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

function ConvertTo-Slug {
    param(
        [string]$Value,
        [int]$Max = 42
    )

    $slug = ([string]$Value).ToLowerInvariant()
    $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-").Trim("-")
    if ([string]::IsNullOrWhiteSpace($slug)) {
        $slug = "item"
    }
    if ($slug.Length -gt $Max) {
        $slug = $slug.Substring(0, $Max).Trim("-")
    }
    if ([string]::IsNullOrWhiteSpace($slug)) {
        $slug = "item"
    }
    return $slug
}

function Get-OutputIdParts {
    param([object]$Output)

    $outputId = [string]$Output.output_id
    if ($outputId -match "^RRO-([0-9]{8})-([0-9]{6})-(.+)$") {
        return [pscustomobject]@{ date = $Matches[1]; time = $Matches[2]; slug = (ConvertTo-Slug -Value $Matches[3]) }
    }
    return [pscustomobject]@{ date = (Get-Date -Format "yyyyMMdd"); time = (Get-Date -Format "HHmmss"); slug = "output" }
}

function New-RecordId {
    param(
        [string]$Prefix,
        [object]$Output,
        [string]$Kind,
        [int]$Index,
        [string]$Title
    )

    $parts = Get-OutputIdParts -Output $Output
    $titleSlug = ConvertTo-Slug -Value $Title -Max 28
    return ("{0}-{1}-{2}-{3}-{4}{5:00}-{6}" -f $Prefix.ToUpperInvariant(), $parts.date, $parts.time, $parts.slug, $Kind, $Index, $titleSlug)
}

function New-MaterializationId {
    param([object]$Output)

    $parts = Get-OutputIdParts -Output $Output
    return ("MAT-{0}-{1}-{2}" -f $parts.date, $parts.time, $parts.slug)
}

function Get-IsoNow {
    return (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
}

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
}

function Test-RoleRunOutputShape {
    param([object]$Output)

    $errors = New-Object System.Collections.Generic.List[string]
    $warnings = New-Object System.Collections.Generic.List[string]
    foreach ($field in @("output_id", "role_run_id", "agent_id", "status", "plain_language_summary", "proposals", "objections", "questions", "approval_items", "handoff_requests", "workorder_recommendations", "evidence_refs", "memory_write_requests", "safety")) {
        if (-not (Test-HasProperty -Value $Output -Name $field)) {
            Add-Unique -List $errors -Value "Missing required field: $field"
        }
    }
    if ([string]$Output.output_id -notmatch "^RRO-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Unique -List $errors -Value "Invalid output_id: $($Output.output_id)"
    }
    if ([string]$Output.role_run_id -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Unique -List $errors -Value "Invalid role_run_id: $($Output.role_run_id)"
    }
    if (@("output_ready", "needs_director_decision", "needs_evidence", "handoff_requested", "blocked", "failed") -notcontains ([string]$Output.status)) {
        Add-Unique -List $errors -Value "Invalid output status: $($Output.status)"
    }
    if ($Output.safety.source_changed -or $Output.safety.task_created -or $Output.safety.approval_changed -or $Output.safety.canon_changed -or $Output.safety.commit_or_push_performed) {
        Add-Unique -List $errors -Value "RoleRunOutput safety claims direct side effects. Materialization refuses unsafe outputs."
    }
    foreach ($memory in @($Output.memory_write_requests)) {
        if ([string]$memory.status -eq "canon" -and -not [bool]$memory.requires_approval) {
            Add-Unique -List $errors -Value "canon memory request must require approval."
        }
    }
    if (@($Output.proposals).Count + @($Output.handoff_requests).Count + @($Output.workorder_recommendations).Count + @($Output.memory_write_requests).Count -eq 0) {
        Add-Unique -List $warnings -Value "Output has no materializable proposals, handoffs, workorders, or memory requests."
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        output_id = [string]$Output.output_id
        role_run_id = [string]$Output.role_run_id
        agent_id = [string]$Output.agent_id
        errors = $errors.ToArray()
        warnings = $warnings.ToArray()
    }
}

function Convert-ApprovalItems {
    param(
        [object]$Output,
        [string]$FallbackSummary
    )

    $items = @()
    foreach ($item in @($Output.approval_items)) {
        $items += [pscustomobject]@{
            type = if ([string]::IsNullOrWhiteSpace([string]$item.type)) { "scope" } else { [string]$item.type }
            plain_language_summary = if ([string]::IsNullOrWhiteSpace([string]$item.plain_language_summary)) { $FallbackSummary } else { [string]$item.plain_language_summary }
            what_will_change = @(Get-StringArray -Value $item.what_will_change)
            what_will_not_change = @(Get-StringArray -Value $item.what_will_not_change)
            files_or_memory_affected = @(Get-StringArray -Value $item.files_or_memory_affected)
            risks = @(Get-StringArray -Value $item.risks)
            rollback_plan = @(Get-StringArray -Value $item.rollback_plan)
            evidence_required = @(Get-StringArray -Value $item.evidence_required)
        }
    }
    if (@($items).Count -eq 0) {
        $items += [pscustomobject]@{
            type = "scope"
            plain_language_summary = $FallbackSummary
            what_will_change = @("Review and accept this materialized draft before downstream execution.")
            what_will_not_change = @("No source files, canon memory, task lifecycle state, commits, or pushes are changed by materialization.")
            files_or_memory_affected = @()
            risks = @("Accepted drafts can influence later work if reviewed carelessly.")
            rollback_plan = @("Delete or supersede the draft record before using it downstream.")
            evidence_required = @("RoleRunOutput review")
        }
    }
    return @($items)
}

function Convert-ProposalStatus {
    param([string]$Status)

    if ($Status -eq "recommended" -or $Status -eq "proposed") { return "submitted" }
    if ($Status -eq "not_recommended") { return "rejected" }
    return "draft"
}

function Convert-MemoryType {
    param([string]$RequestedStatus)

    switch ($RequestedStatus) {
        "canon" { return "canon" }
        "approved" { return "decision" }
        "rejected" { return "rejection" }
        "evidence" { return "evidence" }
        "lesson" { return "lesson" }
        default { return "proposal" }
    }
}

function Convert-MemoryStatus {
    param(
        [string]$RequestedStatus,
        [bool]$RequiresApproval
    )

    if ($RequiresApproval -or $RequestedStatus -in @("approved", "canon")) {
        return "proposed"
    }
    return $RequestedStatus
}

function Convert-MemoryScope {
    param([string]$RequestedScope)

    if (@("global", "project", "agent", "department", "meeting", "task", "canon") -contains $RequestedScope) {
        return $RequestedScope
    }
    return "project"
}

function New-MaterializedRecords {
    param(
        [object]$Output,
        [string]$ProjectId
    )

    $records = New-Object System.Collections.Generic.List[object]
    $evidenceRefs = Get-UniqueStrings -Items (@($Output.evidence_refs) + @($Output.output_id) + @($Output.role_run_id))
    $index = 0
    foreach ($proposal in @($Output.proposals)) {
        $index += 1
        $proposalId = New-RecordId -Prefix "PROP" -Output $Output -Kind "p" -Index $index -Title ([string]$proposal.title)
        $risks = @(Get-StringArray -Value $proposal.risks)
        $evidenceRequired = @(Get-StringArray -Value $proposal.evidence_required)
        $record = [pscustomobject]@{
            proposal_id = $proposalId
            source_agent_id = [string]$Output.agent_id
            source_type = "role_run_output"
            source_ref = [string]$Output.output_id
            title = [string]$proposal.title
            summary = [string]$proposal.summary
            rationale = [string]$Output.plain_language_summary
            options = @(
                [pscustomobject]@{
                    option_id = "option-001"
                    title = [string]$proposal.title
                    summary = [string]$proposal.summary
                    tradeoffs = @(Get-UniqueStrings -Items (@($risks) + @($evidenceRequired)))
                }
            )
            risks = @($risks)
            dependencies = @($evidenceRequired)
            approval_items = @($Output.approval_items | ForEach-Object { [string]$_.plain_language_summary })
            evidence_refs = @($evidenceRefs)
            status = (Convert-ProposalStatus -Status ([string]$proposal.status))
        }
        $records.Add([pscustomobject]@{ kind = "proposal"; id = $proposalId; record = $record; human_required = $true; status = $record.status })
    }

    $index = 0
    foreach ($memory in @($Output.memory_write_requests)) {
        $index += 1
        $requestedStatus = [string]$memory.status
        $requestedScope = [string]$memory.scope
        $requiresApproval = [bool]$memory.requires_approval
        $materializedStatus = Convert-MemoryStatus -RequestedStatus $requestedStatus -RequiresApproval $requiresApproval
        $materializedScope = Convert-MemoryScope -RequestedScope $requestedScope
        $content = [string]$memory.summary
        if ($materializedStatus -ne $requestedStatus) {
            $content = "Requested $requestedStatus memory from RoleRunOutput; requires Human Director approval before use as $requestedStatus. $content"
        }
        if ($materializedScope -ne $requestedScope) {
            $content = "Requested memory scope '$requestedScope' was materialized as '$materializedScope' because durable MemoryRecord scope must use the approved scope enum. $content"
        }
        $memoryId = New-RecordId -Prefix "MEM" -Output $Output -Kind "m" -Index $index -Title $content
        $record = [pscustomobject]@{
            memory_id = $memoryId
            project_id = $ProjectId
            scope = $materializedScope
            type = (Convert-MemoryType -RequestedStatus $requestedStatus)
            status = $materializedStatus
            content = $content
            source_refs = @($evidenceRefs)
            confidence = "medium"
            owner_agent_id = [string]$Output.agent_id
            created_at = Get-IsoNow
            updated_at = Get-IsoNow
        }
        $records.Add([pscustomobject]@{ kind = "memory"; id = $memoryId; record = $record; human_required = ($requiresApproval -or $requestedStatus -in @("approved", "canon")); status = $record.status })
    }

    $index = 0
    foreach ($workOrder in @($Output.workorder_recommendations)) {
        $index += 1
        $workOrderId = New-RecordId -Prefix "WO" -Output $Output -Kind "w" -Index $index -Title ([string]$workOrder.objective)
        $record = [pscustomobject]@{
            work_order_id = $workOrderId
            source_type = "role_run_output"
            source_ref = [string]$Output.output_id
            objective = [string]$workOrder.objective
            department_id = [string]$workOrder.department_id
            assigned_agents = @()
            scope = @(Get-StringArray -Value $workOrder.scope)
            non_goals = @(Get-StringArray -Value $workOrder.non_goals)
            expected_outputs = @(Get-StringArray -Value $workOrder.expected_outputs)
            approval_items = @(Convert-ApprovalItems -Output $Output -FallbackSummary "Approve this WorkOrder draft before converting it into executable tasks.")
            evidence_requirements = @(Get-StringArray -Value $workOrder.expected_outputs)
            verification_plan = @(Get-StringArray -Value $workOrder.expected_outputs)
            handoff_plan = @("Review this WorkOrder draft, then create a StaffContextPacket or AIWorkflow task only after approval.")
            target_project_profile = $ProjectId
            status = "draft"
        }
        $records.Add([pscustomobject]@{ kind = "work_order"; id = $workOrderId; record = $record; human_required = $true; status = $record.status })
    }

    $index = 0
    foreach ($handoff in @($Output.handoff_requests)) {
        $index += 1
        $handoffId = New-RecordId -Prefix "HAND" -Output $Output -Kind "h" -Index $index -Title ([string]$handoff.objective)
        $record = [pscustomobject]@{
            handoff_id = $handoffId
            from_agent_id = [string]$Output.agent_id
            to_agent_id = [string]$handoff.target_agent_id
            reason = [string]$handoff.objective
            input_contract = @(Get-StringArray -Value $handoff.required_context)
            expected_output = @(Get-StringArray -Value $handoff.expected_output)
            constraints = @("Create or review a StaffContextPacket before running the target agent.", "Do not execute the target agent automatically from this handoff.")
            evidence_refs = @($evidenceRefs)
            status = "proposed"
        }
        $records.Add([pscustomobject]@{ kind = "handoff"; id = $handoffId; record = $record; human_required = $false; status = $record.status })
    }

    return $records.ToArray()
}

function Get-RecordPath {
    param(
        [object]$Stores,
        [string]$Kind,
        [string]$Id
    )

    switch ($Kind) {
        "proposal" { return (Join-Path $Stores.proposals ($Id + ".json")) }
        "memory" { return (Join-Path $Stores.memory ($Id + ".json")) }
        "work_order" { return (Join-Path $Stores.workorders ($Id + ".json")) }
        "handoff" { return (Join-Path $Stores.handoffs ($Id + ".json")) }
    }
    throw "Unsupported record kind: $Kind"
}

function New-MaterializationManifest {
    param(
        [object]$Output,
        [object[]]$Records,
        [object]$Stores
    )

    $created = @()
    foreach ($item in @($Records)) {
        $created += [pscustomobject]@{
            record_type = [string]$item.kind
            record_id = [string]$item.id
            path = (Get-RecordPath -Stores $Stores -Kind ([string]$item.kind) -Id ([string]$item.id))
            status = [string]$item.status
            human_required = [bool]$item.human_required
        }
    }

    return [pscustomobject]@{
        materialization_id = (New-MaterializationId -Output $Output)
        source_output_id = [string]$Output.output_id
        source_role_run_id = [string]$Output.role_run_id
        source_agent_id = [string]$Output.agent_id
        created_at = Get-IsoNow
        created_records = @($created)
        skipped_items = @()
        safety = [pscustomobject]@{
            task_created = $false
            approval_changed = $false
            canon_changed = $false
            source_changed = $false
            git_changed = $false
            llm_called = $false
        }
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$OutputPath,
        [string]$StoreRootOverride,
        [string]$ProjectId
    )

    $path = Resolve-RepoFilePath -Root $Root -Path $OutputPath
    $output = Read-JsonFile -Path $path
    $validation = Test-RoleRunOutputShape -Output $output
    $storeRoot = Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride
    $stores = Get-Stores -StoreRoot $storeRoot
    $records = if ($validation.ok) { New-MaterializedRecords -Output $output -ProjectId $ProjectId } else { @() }
    $manifest = if ($validation.ok) { New-MaterializationManifest -Output $output -Records $records -Stores $stores } else { $null }

    return [pscustomobject]@{
        ok = $validation.ok
        command = "plan"
        output_path = $path
        store_root = $storeRoot
        output_id = [string]$output.output_id
        role_run_id = [string]$output.role_run_id
        agent_id = [string]$output.agent_id
        validation = $validation
        materialization = $manifest
        counts = [pscustomobject]@{
            proposals = @($records | Where-Object { $_.kind -eq "proposal" }).Count
            memory = @($records | Where-Object { $_.kind -eq "memory" }).Count
            work_orders = @($records | Where-Object { $_.kind -eq "work_order" }).Count
            handoffs = @($records | Where-Object { $_.kind -eq "handoff" }).Count
        }
        safety = New-SafetyState
    }
}

function New-MaterializeResult {
    param(
        [string]$Root,
        [string]$OutputPath,
        [string]$StoreRootOverride,
        [string]$ProjectId,
        [bool]$Execute
    )

    $plan = New-PlanResult -Root $Root -OutputPath $OutputPath -StoreRootOverride $StoreRootOverride -ProjectId $ProjectId
    if (-not $plan.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "materialize"
            execute = $Execute
            error = "RoleRunOutput validation failed. Nothing was written."
            plan = $plan
            safety = New-SafetyState
        }
    }

    $output = Read-JsonFile -Path $plan.output_path
    $stores = Get-Stores -StoreRoot $plan.store_root
    $records = New-MaterializedRecords -Output $output -ProjectId $ProjectId
    $manifest = New-MaterializationManifest -Output $output -Records $records -Stores $stores
    $manifestPath = Join-Path $stores.materializations ($manifest.materialization_id + ".json")
    $targetPaths = @($manifest.created_records | ForEach-Object { [string]$_.path }) + @($manifestPath)
    $duplicates = @($targetPaths | Where-Object { Test-Path -LiteralPath $_ })

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = (@($duplicates).Count -eq 0)
            command = "materialize"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with materialize <role_run_output_json> --execute to write draft records."
            materialization_path = $manifestPath
            duplicate_paths = @($duplicates)
            plan = $plan
            safety = New-SafetyState
        }
    }

    if (@($duplicates).Count -gt 0) {
        return [pscustomobject]@{
            ok = $false
            command = "materialize"
            execute = $true
            error = "Target materialization records already exist. Nothing was written."
            duplicate_paths = @($duplicates)
            materialization_path = $manifestPath
            plan = $plan
            safety = New-SafetyState
        }
    }

    foreach ($item in @($records)) {
        $path = Get-RecordPath -Stores $stores -Kind ([string]$item.kind) -Id ([string]$item.id)
        Write-JsonFile -Path $path -Value $item.record
    }
    Write-JsonFile -Path $manifestPath -Value $manifest

    return [pscustomobject]@{
        ok = $true
        command = "materialize"
        execute = $true
        materialization_id = [string]$manifest.materialization_id
        materialization_path = $manifestPath
        created_records = @($manifest.created_records)
        plan = $plan
        safety = New-SafetyState `
            -MaterializationWritten $true `
            -ProposalWritten (@($records | Where-Object { $_.kind -eq "proposal" }).Count -gt 0) `
            -MemoryWritten (@($records | Where-Object { $_.kind -eq "memory" }).Count -gt 0) `
            -WorkOrderWritten (@($records | Where-Object { $_.kind -eq "work_order" }).Count -gt 0) `
            -HandoffWritten (@($records | Where-Object { $_.kind -eq "handoff" }).Count -gt 0)
    }
}

function Get-MaterializationFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }
    return @(Get-ChildItem -LiteralPath $StorePath -Filter "MAT-*.json" -File | Sort-Object Name)
}

function Test-Materialization {
    param([object]$Record)

    $errors = New-Object System.Collections.Generic.List[string]
    foreach ($field in @("materialization_id", "source_output_id", "source_role_run_id", "source_agent_id", "created_at", "created_records", "skipped_items", "safety")) {
        if (-not (Test-HasProperty -Value $Record -Name $field)) {
            Add-Unique -List $errors -Value "Missing required field: $field"
        }
    }
    if ([string]$Record.materialization_id -notmatch "^MAT-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Unique -List $errors -Value "Invalid materialization_id: $($Record.materialization_id)"
    }
    if ($Record.safety.task_created -or $Record.safety.approval_changed -or $Record.safety.canon_changed -or $Record.safety.source_changed -or $Record.safety.git_changed -or $Record.safety.llm_called) {
        Add-Unique -List $errors -Value "Materialization safety claims forbidden side effects."
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        materialization_id = [string]$Record.materialization_id
        errors = $errors.ToArray()
    }
}

function New-StatusResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $files = Get-MaterializationFiles -StorePath $stores.materializations
    return [pscustomobject]@{
        ok = $true
        command = "status"
        store_root = $stores.root
        materialization_count = @($files).Count
        safety = New-SafetyState
    }
}

function New-ValidateResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $validations = @()
    foreach ($file in (Get-MaterializationFiles -StorePath $stores.materializations)) {
        try {
            $validations += Test-Materialization -Record (Read-JsonFile -Path $file.FullName)
        } catch {
            $validations += [pscustomobject]@{ ok = $false; materialization_id = ""; errors = @($_.Exception.Message) }
        }
    }
    $errorCount = 0
    foreach ($validation in @($validations)) {
        $errorCount += @($validation.errors).Count
    }
    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        store_root = $stores.root
        materialization_count = @($validations).Count
        error_count = $errorCount
        validations = @($validations)
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $items = @()
    foreach ($file in (Get-MaterializationFiles -StorePath $stores.materializations)) {
        $record = Read-JsonFile -Path $file.FullName
        $items += [pscustomobject]@{
            materialization_id = [string]$record.materialization_id
            source_output_id = [string]$record.source_output_id
            source_agent_id = [string]$record.source_agent_id
            created_count = @($record.created_records).Count
            file = $file.Name
        }
    }
    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_root = $stores.root
        count = @($items).Count
        items = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride,
        [string]$MaterializationId
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $path = Join-Path $stores.materializations ($MaterializationId + ".json")
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{
            ok = $false
            command = "read"
            materialization_id = $MaterializationId
            error = "Materialization not found: $MaterializationId"
            safety = New-SafetyState
        }
    }
    $record = Read-JsonFile -Path $path
    return [pscustomobject]@{
        ok = $true
        command = "read"
        materialization_id = $MaterializationId
        materialization = $record
        validation = (Test-Materialization -Record $record)
        safety = New-SafetyState
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

function Show-Result {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Output Materializer"
    Write-Host "============================================================"
    Write-Host "Command: $($Result.command)"
    if ($Result.output_id) { Write-Host "Output: $($Result.output_id)" }
    if ($Result.materialization_id) { Write-Host "Materialization: $($Result.materialization_id)" }
    if ($Result.store_root) { Write-Host "Store root: $($Result.store_root)" }
    if ($Result.counts) {
        Write-Host "Counts: proposals=$($Result.counts.proposals), memory=$($Result.counts.memory), workorders=$($Result.counts.work_orders), handoffs=$($Result.counts.handoffs)"
    }
    if ($Result.created_records) {
        Write-List -Label "Created records" -Items ($Result.created_records | ForEach-Object { "$($_.record_type) $($_.record_id) -> $($_.path)" })
    }
    if ($Result.validation) {
        Write-List -Label "Validation errors" -Items $Result.validation.errors
        Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    }
    Write-List -Label "Safety" -Items @(
        "LLM not called",
        "approval unchanged",
        "canon unchanged",
        "task/source/git unchanged"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_output_materializer.bat status|validate|list|read <materialization_id>|plan <role_run_output_json>|materialize <role_run_output_json> [--execute] [--store-root _Temp\\...] [--project-id playground] [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storeRootOverride = ""
    $projectId = "playground"
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--store-root") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--store-root requires a path argument." }
            $index += 1
            $storeRootOverride = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--project-id") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--project-id requires a value." }
            $index += 1
            $projectId = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add($arg)
        }
    }

    if ($cleanArgs.Count -lt 1) {
        $result = New-UsageResult
    } else {
        $command = ([string]$cleanArgs[0]).ToLowerInvariant()
        if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
            $result = New-StatusResult -Root $repo -StoreRootOverride $storeRootOverride
        } elseif ($command -eq "validate" -and $cleanArgs.Count -eq 1) {
            $result = New-ValidateResult -Root $repo -StoreRootOverride $storeRootOverride
        } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
            $result = New-ListResult -Root $repo -StoreRootOverride $storeRootOverride
        } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
            $result = New-ReadResult -Root $repo -StoreRootOverride $storeRootOverride -MaterializationId ([string]$cleanArgs[1])
        } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
            $result = New-PlanResult -Root $repo -OutputPath ([string]$cleanArgs[1]) -StoreRootOverride $storeRootOverride -ProjectId $projectId
        } elseif ($command -eq "materialize" -and $cleanArgs.Count -eq 2) {
            $result = New-MaterializeResult -Root $repo -OutputPath ([string]$cleanArgs[1]) -StoreRootOverride $storeRootOverride -ProjectId $projectId -Execute $execute
        } else {
            $result = New-UsageResult
        }
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } else {
        if ($result.ok -and $result.command) { Show-Result -Result $result } else { Write-Host "[ERROR] $($result.error)" }
    }
    if ($result.ok) { exit 0 }
    exit 1
} catch {
    $message = $_.Exception.Message
    if ($json) {
        [pscustomobject]@{ ok = $false; error = $message } | ConvertTo-StudioJson
    } else {
        Write-Host "[ERROR] $message"
    }
    exit 1
}
