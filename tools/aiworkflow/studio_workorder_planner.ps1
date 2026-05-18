param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

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
    return [pscustomobject]@{
        read_only = $true
        backlog_written = $false
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

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_workorder_planner.bat plan <work_order_json_path> [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    foreach ($arg in @($CommandArgs)) {
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -ne 2 -or ([string]$cleanArgs[0]).ToLowerInvariant() -ne "plan") {
        $result = New-UsageResult
        if ($json) {
            ConvertTo-StudioJson -Value $result
        } else {
            Write-Host "[ERROR] $($result.error)"
        }
        exit 1
    }

    $result = New-PlanResult -Root $repo -WorkOrderPath ([string]$cleanArgs[1])
    if ($json) {
        ConvertTo-StudioJson -Value $result
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
