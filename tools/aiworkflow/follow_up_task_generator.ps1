param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "generate", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$FollowUpPlanId = "",

    [string]$CompletionReportId = "",

    [string]$FinalizationLogId = "",

    [string]$PolicyEvaluationId = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText { return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz") }
function Get-Stamp { return (Get-Date -Format "yyyyMMdd-HHmmss-fff") }
function New-ShortGuid { return ([Guid]::NewGuid().ToString("N").Substring(0, 8)) }
function New-FollowUpPlanId { return ("followup-" + (Get-Stamp) + "-" + (New-ShortGuid)) }
function New-EventId { return ("event-" + (Get-Stamp) + "-" + (New-ShortGuid)) }

function Write-Utf8Text {
    param([string]$Path, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::WriteAllText($Path, $Text, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Append-Utf8Line {
    param([string]$Path, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Read-Utf8Text {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return "" }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Read-JsonFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { throw "JSON file not found: $Path" }
    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) { throw "JSON file is empty: $Path" }
    return ($raw | ConvertFrom-Json)
}

function Read-JsonFileOrNull {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    return ($raw | ConvertFrom-Json)
}

function Save-JsonFile {
    param([string]$Path, $Value)
    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 28) + "`n")
}

function Set-ObjectProperty {
    param($Object, [string]$Name, $Value)
    if ($null -ne $Object.PSObject.Properties[$Name]) { $Object.$Name = $Value }
    else { $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value }
}

function Get-ObjectPropertyValue {
    param($Object, [string]$Name)
    if ($null -eq $Object) { return $null }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function As-Array {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [System.Array]) { return @($Value) }
    return @($Value)
}

function ConvertTo-RepoRelativePath {
    param([string]$Repo, [string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Path)) {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
    }
    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $full.Substring($root.Length).TrimStart("\", "/")
        if ([string]::IsNullOrWhiteSpace($relative)) { return "." }
        return ($relative -replace "\\", "/")
    }
    return ($full -replace "\\", "/")
}

function Get-SafeTaskId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Task id is required." }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid task id. Use a plain task id without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) { throw "Invalid task id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeFollowUpPlanIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^followup-[A-Za-z0-9][A-Za-z0-9_.-]*$") { throw "Invalid follow_up_plan_id." }
    if ($trimmed.Contains("..")) { throw "Invalid follow_up_plan_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeCompletionReportIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$") { throw "Invalid completion_report_id." }
    if ($trimmed.Contains("..")) { throw "Invalid completion_report_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeFinalizationLogIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^finalization-[A-Za-z0-9][A-Za-z0-9_.-]*$") { throw "Invalid finalization_log_id." }
    if ($trimmed.Contains("..")) { throw "Invalid finalization_log_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafePolicyEvaluationIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^autoeval-[A-Za-z0-9][A-Za-z0-9_.-]*$") { throw "Invalid policy_evaluation_id." }
    if ($trimmed.Contains("..")) { throw "Invalid policy_evaluation_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-WorkspacePaths {
    param([string]$Repo, [string]$TaskId)
    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $reportsDir = Join-Path (Join-Path $workspacePath "evidence") "reports"
    $completionDir = Join-Path $reportsDir "completion"
    $finalizationDir = Join-Path $reportsDir "finalization"
    $autoApprovalDir = Join-Path $reportsDir "auto_approval"
    $followUpDir = Join-Path $reportsDir "follow_up"
    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        completion_results_dir = Join-Path $completionDir "reports"
        completion_manifest_path = Join-Path $completionDir "completion_manifest.json"
        finalization_logs_dir = Join-Path $finalizationDir "finalization_logs"
        finalization_manifest_path = Join-Path $finalizationDir "finalization_manifest.json"
        auto_approval_evaluations_dir = Join-Path $autoApprovalDir "evaluations"
        auto_approval_manifest_path = Join-Path $autoApprovalDir "auto_approval_policy_manifest.json"
        follow_up_dir = $followUpDir
        follow_up_plans_dir = Join-Path $followUpDir "plans"
        follow_up_manifest_path = Join-Path $followUpDir "follow_up_manifest.json"
    }
}

function Assert-RuntimeContext {
    param([string]$Repo, [string]$TaskId, [bool]$EnsureDirs = $false)
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    if (-not (Test-Path -LiteralPath $paths.workspace_path)) {
        throw "Runtime workspace does not exist for task_id $TaskId. Create it with task_workspace_manager first."
    }
    $metadata = Read-JsonFile -Path $paths.metadata_path
    $taskRunState = Read-JsonFile -Path $paths.task_run_state_path
    if ($metadata.task_id -ne $TaskId) { throw "Workspace metadata task_id mismatch. Expected $TaskId, found $($metadata.task_id)." }
    if ($taskRunState.task_id -ne $TaskId) { throw "TaskRunState task_id mismatch. Expected $TaskId, found $($taskRunState.task_id)." }
    if ($EnsureDirs) {
        New-Item -ItemType Directory -Path $paths.follow_up_plans_dir -Force | Out-Null
    }
    return [pscustomobject]@{ paths = $paths; metadata = $metadata; task_run_state = $taskRunState }
}

function Parse-BacklogRows {
    param([string]$Text)
    $rows = @()
    foreach ($lineObj in ($Text -split "`r?`n")) {
        $line = ([string]$lineObj).Trim()
        if (-not $line.StartsWith("|")) { continue }
        $cells = @($line.Trim("|".ToCharArray()).Split("|".ToCharArray()) | ForEach-Object { ([string]$_).Trim() })
        if ($cells.Count -lt 8) { continue }
        if ($cells[0] -notmatch "^(WF|GAME|VAL|DOC|UNITY)-") { continue }
        $rows += [pscustomobject]@{
            id = $cells[0]
            priority = $cells[1]
            status = $cells[2]
            kind = $cells[3]
            title = $cells[4]
            reason = $cells[5]
            tool_route = $cells[6]
            validation = $cells[7]
        }
    }
    return @($rows)
}

function Get-BacklogTaskOrNull {
    param([string]$Repo, [string]$TaskId)
    $backlogPath = Join-Path $Repo "_Docs\AIWorkflow\Backlog.md"
    $matches = @(Parse-BacklogRows -Text (Read-Utf8Text -Path $backlogPath) | Where-Object { $_.id -eq $TaskId })
    if ($matches.Count -gt 1) { throw "Duplicate task_id found in Backlog.md: $TaskId" }
    if ($matches.Count -eq 0) { return $null }
    return $matches[0]
}

function Get-FollowUpManifest {
    param([string]$Path, [string]$TaskId, [string]$WorkspaceId)
    $existing = Read-JsonFileOrNull -Path $Path
    if ($null -ne $existing) { return $existing }
    return [pscustomobject]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        follow_up_plan_ids = @()
        latest_follow_up_plan_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-FollowUpManifest {
    param($Manifest, [string]$Path, [string]$Id)
    $ids = @($Manifest.follow_up_plan_ids)
    if (-not ($ids -contains $Id)) { $ids += $Id }
    Set-ObjectProperty -Object $Manifest -Name "follow_up_plan_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_follow_up_plan_id" -Value $Id
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
}

function Get-JsonArtifact {
    param([string]$Repo, [string]$ManifestPath, [string]$LatestField, [string]$Dir, [string]$RequestedId, [string]$Label)
    $manifest = Read-JsonFileOrNull -Path $ManifestPath
    $selectedId = $RequestedId
    if ([string]::IsNullOrWhiteSpace($selectedId) -and $null -ne $manifest) {
        $selectedId = [string](Get-ObjectPropertyValue -Object $manifest -Name $LatestField)
    }
    if ([string]::IsNullOrWhiteSpace($selectedId)) {
        return [pscustomobject]@{ present = $false; selected_id = $null; path = $null; data = $null; missing_reason = "No $Label exists." }
    }
    $path = Join-Path $Dir ($selectedId + ".json")
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{ present = $false; selected_id = $selectedId; path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path; data = $null; missing_reason = "$Label file was not found: $selectedId" }
    }
    return [pscustomobject]@{ present = $true; selected_id = $selectedId; path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path; data = Read-JsonFile -Path $path; missing_reason = $null }
}

function Normalize-Text {
    param([string]$Value)
    return ([string]$Value).Trim()
}

function New-Candidate {
    param([int]$Index, [string]$Source, [string]$CandidateType, [string]$Priority, [string]$Risk, [string]$Title, [string]$Reason, [string]$Kind = "workflow", [string]$Validation = "Review generated candidate and define validation before implementation.")
    return [ordered]@{
        candidate_id = ("candidate-{0:D3}" -f $Index)
        source = $Source
        candidate_type = $CandidateType
        suggested_category = "WF"
        suggested_priority = $Priority
        suggested_risk = $Risk
        suggested_kind = $Kind
        suggested_workflow_path = "discord_task_management"
        title = $Title
        reason = $Reason
        required_validation = @($Validation, "Run git status --short before implementation.", "Run git diff --check before completion.")
        create_backlog_task = $false
        requires_human_acceptance = $true
    }
}

function Add-Candidate {
    param([System.Collections.ArrayList]$Candidates, [System.Collections.Hashtable]$Seen, [string]$Source, [string]$CandidateType, [string]$Priority, [string]$Risk, [string]$Title, [string]$Reason, [string]$Kind = "workflow", [string]$Validation = "Review generated candidate and define validation before implementation.")
    $normalizedKey = (Normalize-Text -Value ($CandidateType + "|" + $Title + "|" + $Reason)).ToLowerInvariant()
    if ($Seen.ContainsKey($normalizedKey)) { return }
    $Seen[$normalizedKey] = $true
    [void]$Candidates.Add((New-Candidate -Index ($Candidates.Count + 1) -Source $Source -CandidateType $CandidateType -Priority $Priority -Risk $Risk -Title $Title -Reason $Reason -Kind $Kind -Validation $Validation))
}

function Add-ListCandidates {
    param([System.Collections.ArrayList]$Candidates, [System.Collections.Hashtable]$Seen, [string]$Source, [string]$CandidateType, [string]$Priority, [string]$Risk, [string]$TitlePrefix, $Values, [string]$Kind = "workflow", [string]$Validation = "Validate the follow-up evidence and update the original task audit trail.")
    foreach ($value in (As-Array -Value $Values)) {
        $text = Normalize-Text -Value $value
        if ([string]::IsNullOrWhiteSpace($text)) { continue }
        Add-Candidate -Candidates $Candidates -Seen $Seen -Source $Source -CandidateType $CandidateType -Priority $Priority -Risk $Risk -Title "${TitlePrefix}: $text" -Reason $text -Kind $Kind -Validation $Validation
    }
}

function Build-FollowUpPlan {
    param([string]$Repo, $Runtime, [string]$PlanId, $Task, $CompletionSource, $FinalizationSource, $PolicySource)

    $candidates = New-Object System.Collections.ArrayList
    $seen = @{}
    $sourceNotes = New-Object System.Collections.ArrayList
    $completion = $CompletionSource.data
    $finalization = $FinalizationSource.data
    $policy = $PolicySource.data

    if (-not $CompletionSource.present) {
        [void]$sourceNotes.Add($CompletionSource.missing_reason)
        Add-Candidate -Candidates $candidates -Seen $seen -Source "missing_completion_report" -CandidateType "evidence_collection" -Priority "P1" -Risk "medium" -Title "Generate missing CompletionReport for $($Runtime.metadata.task_id)" -Reason $CompletionSource.missing_reason -Kind "validation" -Validation "Generate VerificationReport and CompletionReport before final completion review."
    }
    else {
        $risks = $completion.remaining_risks
        Add-ListCandidates -Candidates $candidates -Seen $seen -Source "completion_report.failed_checks" -CandidateType "fix_failed_validation" -Priority "P1" -Risk "medium" -TitlePrefix "Fix failed validation" -Values $risks.failed_checks -Kind "validation"
        Add-ListCandidates -Candidates $candidates -Seen $seen -Source "completion_report.blockers" -CandidateType "resolve_blocker" -Priority "P1" -Risk "medium" -TitlePrefix "Resolve completion blocker" -Values $risks.blockers -Kind "validation"
        Add-ListCandidates -Candidates $candidates -Seen $seen -Source "completion_report.concerns" -CandidateType "review_concern" -Priority "P2" -Risk "low" -TitlePrefix "Review completion concern" -Values $risks.concerns -Kind "validation"
        Add-ListCandidates -Candidates $candidates -Seen $seen -Source "completion_report.human_decisions" -CandidateType "human_decision_follow_up" -Priority "P2" -Risk "low" -TitlePrefix "Resolve human decision" -Values $completion.human_decisions_required -Kind "workflow"
        Add-ListCandidates -Candidates $candidates -Seen $seen -Source "completion_report.follow_up_candidates" -CandidateType "reported_follow_up" -Priority "P2" -Risk "low" -TitlePrefix "Follow up" -Values $completion.follow_up_candidates -Kind "workflow"

        $state = [string]$completion.completion_state
        if (@("blocked_by_missing_verification", "blocked_by_verification") -contains $state) {
            Add-Candidate -Candidates $candidates -Seen $seen -Source "completion_report.state" -CandidateType "collect_missing_evidence" -Priority "P1" -Risk "medium" -Title "Collect missing verification evidence for $($Runtime.metadata.task_id)" -Reason "CompletionReport state is $state." -Kind "validation" -Validation "Regenerate VerificationReport and CompletionReport after evidence is collected."
        }
        if ($state -eq "failed_verification") {
            Add-Candidate -Candidates $candidates -Seen $seen -Source "completion_report.state" -CandidateType "repair_failed_work" -Priority "P1" -Risk "medium" -Title "Repair failed verification for $($Runtime.metadata.task_id)" -Reason "CompletionReport reports failed verification." -Kind "validation" -Validation "Fix failed checks and regenerate reports."
        }
    }

    if (-not $FinalizationSource.present) {
        [void]$sourceNotes.Add($FinalizationSource.missing_reason)
    }
    else {
        switch ([string]$finalization.final_decision) {
            "request_changes" {
                Add-Candidate -Candidates $candidates -Seen $seen -Source "finalization_log" -CandidateType "requested_change" -Priority "P1" -Risk "medium" -Title "Apply requested completion changes for $($Runtime.metadata.task_id)" -Reason "Human Director requested changes during finalization." -Kind "workflow" -Validation "Regenerate verification, completion, and finalization records after changes."
            }
            "reject_completion" {
                Add-Candidate -Candidates $candidates -Seen $seen -Source "finalization_log" -CandidateType "rework_rejected_completion" -Priority "P1" -Risk "medium" -Title "Rework rejected completion for $($Runtime.metadata.task_id)" -Reason "Human Director rejected completion." -Kind "workflow" -Validation "Produce new evidence and completion report before retrying finalization."
            }
            "defer_completion" {
                Add-Candidate -Candidates $candidates -Seen $seen -Source "finalization_log" -CandidateType "resume_deferred_review" -Priority "P2" -Risk "low" -Title "Resume deferred completion review for $($Runtime.metadata.task_id)" -Reason "Human Director deferred completion review." -Kind "validation" -Validation "Collect the missing decision evidence and rerun completion review."
            }
        }
    }

    if ($PolicySource.present) {
        $evaluation = $policy.evaluation
        if ($evaluation.decision -eq "human_approval_required") {
            Add-ListCandidates -Candidates $candidates -Seen $seen -Source "auto_approval_policy.blockers" -CandidateType "policy_blocker_review" -Priority "P2" -Risk "low" -TitlePrefix "Review auto-approval blocker" -Values $evaluation.blockers -Kind "workflow" -Validation "Review whether this blocker should remain human-controlled or become policy-eligible later."
        }
    }

    $candidateCount = $candidates.Count
    $acceptedDecisions = @("accept_completion", "accept_with_concerns")
    $planState = if ($candidateCount -gt 0) { "follow_up_recommended" } elseif ($CompletionSource.present -and $FinalizationSource.present -and ($acceptedDecisions -contains [string]$finalization.final_decision)) { "no_follow_up_recommended" } else { "insufficient_follow_up_signal" }
    $priority = if (@($candidates | Where-Object { $_.suggested_priority -eq "P1" }).Count -gt 0) { "P1" } elseif ($candidateCount -gt 0) { "P2" } else { "P3" }

    return [ordered]@{
        schema_version = 1
        follow_up_plan_id = $PlanId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        generated_at = Get-NowText
        generator = "follow_up_task_generator"
        plan_state = $planState
        summary = if ($candidateCount -gt 0) { "Follow-up candidates were generated for human review." } else { "No follow-up candidate was generated from the available evidence." }
        candidate_count = $candidateCount
        highest_suggested_priority = $priority
        task_context = [ordered]@{
            found_in_backlog = ($null -ne $Task)
            priority = if ($null -eq $Task) { $null } else { $Task.priority }
            status = if ($null -eq $Task) { $null } else { $Task.status }
            kind = if ($null -eq $Task) { $null } else { $Task.kind }
            title = if ($null -eq $Task) { $null } else { $Task.title }
        }
        sources = [ordered]@{
            completion_report = [ordered]@{
                present = [bool]$CompletionSource.present
                completion_report_id = $CompletionSource.selected_id
                completion_report_path = $CompletionSource.path
                completion_state = if ($CompletionSource.present) { $completion.completion_state } else { $null }
                missing_reason = $CompletionSource.missing_reason
            }
            finalization_log = [ordered]@{
                present = [bool]$FinalizationSource.present
                finalization_log_id = $FinalizationSource.selected_id
                finalization_log_path = $FinalizationSource.path
                final_decision = if ($FinalizationSource.present) { $finalization.final_decision } else { $null }
                missing_reason = $FinalizationSource.missing_reason
            }
            auto_approval_policy = [ordered]@{
                present = [bool]$PolicySource.present
                policy_evaluation_id = $PolicySource.selected_id
                policy_evaluation_path = $PolicySource.path
                decision = if ($PolicySource.present) { $policy.evaluation.decision } else { $null }
                missing_reason = $PolicySource.missing_reason
            }
        }
        source_notes = @($sourceNotes)
        candidates = @($candidates)
        suggested_next_manual_commands = if ($candidateCount -gt 0) {
            @(
                "/ai follow-up read id:$($Runtime.metadata.task_id) follow-up-plan-id:$PlanId",
                "Review candidates and create accepted Backlog tasks manually.",
                "Use /ai intake or /ai task create only after choosing a candidate."
            )
        }
        else {
            @(
                "/ai follow-up read id:$($Runtime.metadata.task_id) follow-up-plan-id:$PlanId",
                "No follow-up task is suggested from current evidence.",
                "Proceed with normal task done/commit decision only if completion was accepted."
            )
        }
        invariants = [ordered]@{
            task_lifecycle_unchanged = $true
            no_backlog_write = $true
            no_active_task_write = $true
            no_task_created = $true
            no_task_approval = $true
            no_task_done = $true
            no_auto_approval_applied = $true
            no_commit_or_push = $true
        }
    }
}

function Update-TaskRunFollowUpState {
    param([string]$Repo, $TaskRunState, [string]$TaskRunStatePath, $Plan, [string]$PlanPath)
    if ($null -eq $TaskRunState.follow_up_task_generator) {
        Set-ObjectProperty -Object $TaskRunState -Name "follow_up_task_generator" -Value ([pscustomobject]@{})
    }
    Set-ObjectProperty -Object $TaskRunState.follow_up_task_generator -Name "latest_follow_up_plan_id" -Value $Plan.follow_up_plan_id
    Set-ObjectProperty -Object $TaskRunState.follow_up_task_generator -Name "latest_follow_up_plan_path" -Value (ConvertTo-RepoRelativePath -Repo $Repo -Path $PlanPath)
    Set-ObjectProperty -Object $TaskRunState.follow_up_task_generator -Name "plan_state" -Value $Plan.plan_state
    Set-ObjectProperty -Object $TaskRunState.follow_up_task_generator -Name "candidate_count" -Value $Plan.candidate_count
    Set-ObjectProperty -Object $TaskRunState.follow_up_task_generator -Name "latest_generated_at" -Value $Plan.generated_at
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param([string]$Path, [string]$TaskId, [string]$RunId, [string]$PlanId, [string]$PlanState, [int]$CandidateCount)
    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "follow_up_plan_generated"
        severity = "info"
        message = "Follow-up task plan generated."
        source = "follow_up_task_generator"
        data = [ordered]@{
            follow_up_plan_id = $PlanId
            plan_state = $PlanState
            candidate_count = $CandidateCount
            create_backlog_task = $false
        }
        created_at = Get-NowText
    }
    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 12)
    return $event.event_id
}

function Write-ObjectResult {
    param($Result, [int]$ExitCode = 0)
    if ($Json) {
        $Result | ConvertTo-Json -Depth 28
        exit $ExitCode
    }
    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }
    Write-Host "============================================================"
    Write-Host "AIWorkflow Follow-up Task Generator"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.follow_up_plan_id)) {
        Write-Host "FollowUpPlan: $($Result.follow_up_plan_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.plan_state)) {
        Write-Host "State: $($Result.plan_state)"
    }
    Write-Host "============================================================"
    exit $ExitCode
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = Join-Path $PSScriptRoot "..\.." }
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $safeFollowUpPlanId = Get-SafeFollowUpPlanIdOrEmpty -Value $FollowUpPlanId
    $safeCompletionReportId = Get-SafeCompletionReportIdOrEmpty -Value $CompletionReportId
    $safeFinalizationLogId = Get-SafeFinalizationLogIdOrEmpty -Value $FinalizationLogId
    $safePolicyEvaluationId = Get-SafePolicyEvaluationIdOrEmpty -Value $PolicyEvaluationId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureDirs:($Command -eq "generate")
    $manifest = Get-FollowUpManifest -Path $runtime.paths.follow_up_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $ids = @($manifest.follow_up_plan_ids)
        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            follow_up_plan_count = $ids.Count
            latest_follow_up_plan_id = $manifest.latest_follow_up_plan_id
            follow_up_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.follow_up_manifest_path
            task_run_follow_up_task_generator = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "follow_up_task_generator"
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safeFollowUpPlanId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string]$manifest.latest_follow_up_plan_id
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) { throw "No follow_up_plan_id was provided and no latest FollowUpPlan exists." }
        $path = Join-Path $runtime.paths.follow_up_plans_dir ($targetId + ".json")
        if (-not (Test-Path -LiteralPath $path)) { throw "FollowUpPlan does not exist: $targetId" }
        $plan = Read-JsonFile -Path $path
        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            follow_up_plan_id = $targetId
            follow_up_plan_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            plan_state = $plan.plan_state
            candidate_count = $plan.candidate_count
            follow_up_plan = $plan
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "generate") {
        $planId = if ([string]::IsNullOrWhiteSpace($safeFollowUpPlanId)) { New-FollowUpPlanId } else { $safeFollowUpPlanId }
        $planPath = Join-Path $runtime.paths.follow_up_plans_dir ($planId + ".json")
        if (Test-Path -LiteralPath $planPath) { throw "FollowUpPlan already exists: $planId" }
        $task = Get-BacklogTaskOrNull -Repo $repo -TaskId $safeTaskId
        $completionSource = Get-JsonArtifact -Repo $repo -ManifestPath $runtime.paths.completion_manifest_path -LatestField "latest_completion_report_id" -Dir $runtime.paths.completion_results_dir -RequestedId $safeCompletionReportId -Label "CompletionReport"
        $finalizationSource = Get-JsonArtifact -Repo $repo -ManifestPath $runtime.paths.finalization_manifest_path -LatestField "latest_finalization_log_id" -Dir $runtime.paths.finalization_logs_dir -RequestedId $safeFinalizationLogId -Label "FinalizationLog"
        $policySource = Get-JsonArtifact -Repo $repo -ManifestPath $runtime.paths.auto_approval_manifest_path -LatestField "latest_policy_evaluation_id" -Dir $runtime.paths.auto_approval_evaluations_dir -RequestedId $safePolicyEvaluationId -Label "AutoApprovalPolicy evaluation"
        $plan = Build-FollowUpPlan -Repo $repo -Runtime $runtime -PlanId $planId -Task $task -CompletionSource $completionSource -FinalizationSource $finalizationSource -PolicySource $policySource
        Save-JsonFile -Path $planPath -Value $plan
        Save-FollowUpManifest -Manifest $manifest -Path $runtime.paths.follow_up_manifest_path -Id $planId
        Update-TaskRunFollowUpState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Plan $plan -PlanPath $planPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -PlanId $planId -PlanState $plan.plan_state -CandidateCount $plan.candidate_count
        $result = [pscustomobject]@{
            ok = $true
            command = "generate"
            task_id = $safeTaskId
            follow_up_plan_id = $planId
            follow_up_plan_path = ConvertTo-RepoRelativePath -Repo $repo -Path $planPath
            latest_progress_event_id = $eventId
            plan_state = $plan.plan_state
            candidate_count = $plan.candidate_count
            follow_up_plan = $plan
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }
}
catch {
    $result = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $TaskId
        follow_up_plan_id = $FollowUpPlanId
        completion_report_id = $CompletionReportId
        finalization_log_id = $FinalizationLogId
        policy_evaluation_id = $PolicyEvaluationId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }
    Write-ObjectResult -Result $result -ExitCode 1
}
