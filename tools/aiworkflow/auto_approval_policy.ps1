param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "evaluate", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$PolicyEvaluationId = "",

    [string]$CompletionReportId = "",

    [string]$FinalizationLogId = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText { return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz") }
function Get-Stamp { return (Get-Date -Format "yyyyMMdd-HHmmss-fff") }
function New-ShortGuid { return ([Guid]::NewGuid().ToString("N").Substring(0, 8)) }
function New-PolicyEvaluationId { return ("autoeval-" + (Get-Stamp) + "-" + (New-ShortGuid)) }
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

function Get-SafePolicyEvaluationIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^autoeval-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid policy_evaluation_id."
    }
    if ($trimmed.Contains("..")) { throw "Invalid policy_evaluation_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeCompletionReportIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid completion_report_id."
    }
    if ($trimmed.Contains("..")) { throw "Invalid completion_report_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeFinalizationLogIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^finalization-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid finalization_log_id."
    }
    if ($trimmed.Contains("..")) { throw "Invalid finalization_log_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-WorkspacePaths {
    param([string]$Repo, [string]$TaskId)
    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"
    $reportsDir = Join-Path $evidenceDir "reports"
    $completionDir = Join-Path $reportsDir "completion"
    $finalizationDir = Join-Path $reportsDir "finalization"
    $autoApprovalDir = Join-Path $reportsDir "auto_approval"
    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        completion_results_dir = Join-Path $completionDir "reports"
        completion_manifest_path = Join-Path $completionDir "completion_manifest.json"
        approval_history_dir = Join-Path $finalizationDir "approval_history"
        approval_history_manifest_path = Join-Path $finalizationDir "approval_history_manifest.json"
        finalization_logs_dir = Join-Path $finalizationDir "finalization_logs"
        finalization_manifest_path = Join-Path $finalizationDir "finalization_manifest.json"
        auto_approval_dir = $autoApprovalDir
        auto_approval_evaluations_dir = Join-Path $autoApprovalDir "evaluations"
        auto_approval_manifest_path = Join-Path $autoApprovalDir "auto_approval_policy_manifest.json"
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
        New-Item -ItemType Directory -Path $paths.auto_approval_evaluations_dir -Force | Out-Null
    }
    return [pscustomobject]@{ paths = $paths; metadata = $metadata; task_run_state = $taskRunState }
}

function Get-PolicyManifest {
    param([string]$Path, [string]$TaskId, [string]$WorkspaceId)
    $existing = Read-JsonFileOrNull -Path $Path
    if ($null -ne $existing) { return $existing }
    return [pscustomobject]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        policy_evaluation_ids = @()
        latest_policy_evaluation_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-PolicyManifest {
    param($Manifest, [string]$Path, [string]$Id)
    $ids = @($Manifest.policy_evaluation_ids)
    if (-not ($ids -contains $Id)) { $ids += $Id }
    Set-ObjectProperty -Object $Manifest -Name "policy_evaluation_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_policy_evaluation_id" -Value $Id
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
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

function Get-CompletionReportPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Get-FinalizationLogPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Get-ApprovalPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Get-PolicyEvaluationPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Resolve-CompletionReport {
    param([string]$Repo, $Runtime, [string]$RequestedId)
    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.completion_manifest_path
    $selectedId = $RequestedId
    if ([string]::IsNullOrWhiteSpace($selectedId) -and $null -ne $manifest) {
        $selectedId = [string]$manifest.latest_completion_report_id
    }
    if ([string]::IsNullOrWhiteSpace($selectedId)) {
        return [pscustomobject]@{ present = $false; selected_id = $null; path = $null; report = $null; missing_reason = "No CompletionReport exists." }
    }
    $path = Get-CompletionReportPath -Dir $Runtime.paths.completion_results_dir -Id $selectedId
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{ present = $false; selected_id = $selectedId; path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path; report = $null; missing_reason = "CompletionReport file was not found: $selectedId" }
    }
    return [pscustomobject]@{ present = $true; selected_id = $selectedId; path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path; report = Read-JsonFile -Path $path; missing_reason = $null }
}

function Resolve-FinalizationLog {
    param([string]$Repo, $Runtime, [string]$RequestedId)
    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.finalization_manifest_path
    $selectedId = $RequestedId
    if ([string]::IsNullOrWhiteSpace($selectedId) -and $null -ne $manifest) {
        $selectedId = [string]$manifest.latest_finalization_log_id
    }
    if ([string]::IsNullOrWhiteSpace($selectedId)) {
        return [pscustomobject]@{ present = $false; selected_id = $null; path = $null; log = $null; approval = $null; missing_reason = "No FinalizationLog exists." }
    }
    $path = Get-FinalizationLogPath -Dir $Runtime.paths.finalization_logs_dir -Id $selectedId
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{ present = $false; selected_id = $selectedId; path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path; log = $null; approval = $null; missing_reason = "FinalizationLog file was not found: $selectedId" }
    }
    $log = Read-JsonFile -Path $path
    $approvalId = [string]$log.sources.approval_history.approval_record_id
    $approvalPath = if ([string]::IsNullOrWhiteSpace($approvalId)) { $null } else { Get-ApprovalPath -Dir $Runtime.paths.approval_history_dir -Id $approvalId }
    $approval = if ($null -ne $approvalPath -and (Test-Path -LiteralPath $approvalPath)) { Read-JsonFile -Path $approvalPath } else { $null }
    return [pscustomobject]@{
        present = $true
        selected_id = $selectedId
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        log = $log
        approval = $approval
        missing_reason = $null
    }
}

function New-Rule {
    param([string]$Id, [string]$Status, [string]$Summary, [string]$Severity = "info")
    return [ordered]@{
        id = $Id
        status = $Status
        severity = $Severity
        summary = $Summary
    }
}

function Add-PolicyRule {
    param([System.Collections.ArrayList]$Rules, [System.Collections.ArrayList]$Blockers, [System.Collections.ArrayList]$Reasons, [string]$Id, [bool]$Passed, [string]$PassSummary, [string]$FailSummary, [string]$Severity = "blocker")
    if ($Passed) {
        [void]$Rules.Add((New-Rule -Id $Id -Status "pass" -Summary $PassSummary))
        [void]$Reasons.Add($PassSummary)
    }
    else {
        [void]$Rules.Add((New-Rule -Id $Id -Status "fail" -Summary $FailSummary -Severity $Severity))
        if ($Severity -eq "blocker") {
            [void]$Blockers.Add($FailSummary)
        }
        else {
            [void]$Reasons.Add($FailSummary)
        }
    }
}

function Get-RiskClass {
    param($Task)
    if ($null -eq $Task) { return "unknown" }
    switch ([string]$Task.priority) {
        "P0" { return "critical" }
        "P1" { return "high" }
        "P2" { return "low" }
        "P3" { return "low" }
        default { return "unknown" }
    }
}

function Test-LowRiskKind {
    param([string]$Kind)
    return @("documentation", "validation", "maintenance", "automation", "workflow") -contains $Kind
}

function Build-PolicyEvaluation {
    param([string]$Repo, $Runtime, [string]$EvaluationId, $Task, $CompletionSource, $FinalizationSource)

    $rules = New-Object System.Collections.ArrayList
    $blockers = New-Object System.Collections.ArrayList
    $reasons = New-Object System.Collections.ArrayList
    $humanDecisions = New-Object System.Collections.ArrayList

    $riskClass = Get-RiskClass -Task $Task
    $kind = if ($null -eq $Task) { "" } else { [string]$Task.kind }
    $priority = if ($null -eq $Task) { "" } else { [string]$Task.priority }
    $status = if ($null -eq $Task) { "" } else { [string]$Task.status }
    $completion = $CompletionSource.report
    $finalization = $FinalizationSource.log
    $completionReady = $CompletionSource.present -and $completion.completion_readiness.can_mark_task_done_manually -eq $true
    $completionReadyWithoutNotes = $CompletionSource.present -and [string]$completion.completion_readiness.level -eq "READY"
    $acceptedDecisions = @("accept_completion", "accept_with_concerns")
    $finalizationAccepted = $FinalizationSource.present -and ($acceptedDecisions -contains [string]$finalization.final_decision)
    $approvalPresent = $FinalizationSource.present -and $null -ne $FinalizationSource.approval
    $lowRiskPriority = @("P2", "P3") -contains $priority
    $safeKind = Test-LowRiskKind -Kind $kind
    $blockedStatus = @("blocked", "deferred") -contains $status

    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "task_found" -Passed ($null -ne $Task) -PassSummary "Backlog task context was found." -FailSummary "Backlog task context is missing."
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "low_risk_priority" -Passed $lowRiskPriority -PassSummary "Task priority is eligible for conditional auto approval." -FailSummary "Task priority requires human approval for this policy."
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "safe_kind" -Passed $safeKind -PassSummary "Task kind is in the low-risk policy allowlist." -FailSummary "Task kind is outside the low-risk policy allowlist."
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "not_blocked_status" -Passed (-not $blockedStatus) -PassSummary "Backlog status is not blocked or deferred." -FailSummary "Backlog status is blocked or deferred."
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "completion_report_ready" -Passed $completionReady -PassSummary "CompletionReport allows manual done review." -FailSummary "CompletionReport is missing or not ready for completion."
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "completion_without_notes" -Passed $completionReadyWithoutNotes -PassSummary "CompletionReport readiness is READY without notes." -FailSummary "CompletionReport has notes, concerns, blockers, failed checks, or missing verification." -Severity "warning"
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "human_finalization_recorded" -Passed $finalizationAccepted -PassSummary "Human completion acceptance is recorded in FinalizationLog." -FailSummary "Accepted FinalizationLog is missing."
    Add-PolicyRule -Rules $rules -Blockers $blockers -Reasons $reasons -Id "approval_history_present" -Passed $approvalPresent -PassSummary "ApprovalHistory record is linked to FinalizationLog." -FailSummary "Linked ApprovalHistory record is missing."

    if (-not $lowRiskPriority) {
        [void]$humanDecisions.Add("Priority is P0/P1 or unknown; Human Director approval remains required.")
    }
    if (-not $safeKind) {
        [void]$humanDecisions.Add("Task kind is not eligible for conditional auto approval.")
    }
    if (-not $completionReady) {
        [void]$humanDecisions.Add("Completion evidence is not ready; user review is required.")
    }
    if (-not $finalizationAccepted) {
        [void]$humanDecisions.Add("No accepted finalization decision exists; do not infer approval.")
    }

    $blockingCount = @($blockers).Count
    $warningCount = @($rules | Where-Object { $_.status -eq "fail" -and $_.severity -eq "warning" }).Count
    $eligible = ($blockingCount -eq 0 -and $warningCount -eq 0)
    $candidate = ($blockingCount -eq 0)
    $decision = if ($eligible) { "eligible_candidate" } elseif ($candidate) { "needs_human_review" } else { "human_approval_required" }
    $confidence = if ($eligible) { 0.9 } elseif ($candidate) { 0.55 } else { 0.2 }
    $recommendedAction = switch ($decision) {
        "eligible_candidate" { "Record as a candidate for future conditional auto approval. Do not apply approval automatically in WF-308." }
        "needs_human_review" { "Human review is still required because non-blocking notes remain." }
        default { "Human approval remains required. Do not auto approve." }
    }

    return [ordered]@{
        schema_version = 1
        policy_evaluation_id = $EvaluationId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        evaluated_at = Get-NowText
        evaluator = "auto_approval_policy"
        policy_version = "wf-308.v1"
        policy_mode = "evaluate_only"
        task_context = [ordered]@{
            found_in_backlog = ($null -ne $Task)
            priority = if ($null -eq $Task) { $null } else { $Task.priority }
            status = if ($null -eq $Task) { $null } else { $Task.status }
            kind = if ($null -eq $Task) { $null } else { $Task.kind }
            title = if ($null -eq $Task) { $null } else { $Task.title }
            risk_class = $riskClass
        }
        sources = [ordered]@{
            completion_report = [ordered]@{
                present = [bool]$CompletionSource.present
                completion_report_id = $CompletionSource.selected_id
                completion_report_path = $CompletionSource.path
                completion_state = if ($CompletionSource.present) { $completion.completion_state } else { $null }
                readiness_level = if ($CompletionSource.present) { $completion.completion_readiness.level } else { $null }
                missing_reason = $CompletionSource.missing_reason
            }
            finalization_log = [ordered]@{
                present = [bool]$FinalizationSource.present
                finalization_log_id = $FinalizationSource.selected_id
                finalization_log_path = $FinalizationSource.path
                final_decision = if ($FinalizationSource.present) { $finalization.final_decision } else { $null }
                finalization_state = if ($FinalizationSource.present) { $finalization.finalization_state } else { $null }
                missing_reason = $FinalizationSource.missing_reason
            }
            approval_history = [ordered]@{
                present = [bool]($null -ne $FinalizationSource.approval)
                approval_record_id = if ($null -ne $FinalizationSource.approval) { $FinalizationSource.approval.approval_record_id } else { $null }
                decision = if ($null -ne $FinalizationSource.approval) { $FinalizationSource.approval.decision } else { $null }
            }
        }
        evaluation = [ordered]@{
            decision = $decision
            eligible_for_conditional_auto_approval = $eligible
            candidate_requires_human_review = (-not $eligible)
            can_auto_approve_now = $false
            confidence = $confidence
            recommended_action = $recommendedAction
            blockers = @($blockers)
            reasons = @($reasons | Select-Object -First 12)
            human_decisions_required = @($humanDecisions | Select-Object -Unique)
            rule_results = @($rules)
        }
        suggested_next_manual_commands = @(
            "/ai auto-approval read id:$($Runtime.metadata.task_id) policy-evaluation-id:$EvaluationId",
            "Keep using explicit Human Director approval until a future apply layer is separately approved.",
            "Proceed to WF-309 Follow-up Task Generator after this policy layer is committed."
        )
        invariants = [ordered]@{
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_finalization_log_written = $true
            no_follow_up_task_generator = $true
            no_auto_approval_applied = $true
            no_commit_or_push = $true
        }
    }
}

function Update-TaskRunPolicyState {
    param([string]$Repo, $TaskRunState, [string]$TaskRunStatePath, $Evaluation, [string]$EvaluationPath)
    if ($null -eq $TaskRunState.auto_approval_policy) {
        Set-ObjectProperty -Object $TaskRunState -Name "auto_approval_policy" -Value ([pscustomobject]@{})
    }
    Set-ObjectProperty -Object $TaskRunState.auto_approval_policy -Name "latest_policy_evaluation_id" -Value $Evaluation.policy_evaluation_id
    Set-ObjectProperty -Object $TaskRunState.auto_approval_policy -Name "latest_policy_evaluation_path" -Value (ConvertTo-RepoRelativePath -Repo $Repo -Path $EvaluationPath)
    Set-ObjectProperty -Object $TaskRunState.auto_approval_policy -Name "decision" -Value $Evaluation.evaluation.decision
    Set-ObjectProperty -Object $TaskRunState.auto_approval_policy -Name "eligible_for_conditional_auto_approval" -Value $Evaluation.evaluation.eligible_for_conditional_auto_approval
    Set-ObjectProperty -Object $TaskRunState.auto_approval_policy -Name "can_auto_approve_now" -Value $Evaluation.evaluation.can_auto_approve_now
    Set-ObjectProperty -Object $TaskRunState.auto_approval_policy -Name "latest_evaluated_at" -Value $Evaluation.evaluated_at
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param([string]$Path, [string]$TaskId, [string]$RunId, [string]$EvaluationId, [string]$Decision)
    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "auto_approval_policy_evaluated"
        severity = "info"
        message = "Auto approval policy evaluated."
        source = "auto_approval_policy"
        data = [ordered]@{
            policy_evaluation_id = $EvaluationId
            decision = $Decision
            evaluate_only = $true
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
    Write-Host "AIWorkflow Auto Approval Policy"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.policy_evaluation_id)) {
        Write-Host "PolicyEvaluation: $($Result.policy_evaluation_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.decision)) {
        Write-Host "Decision: $($Result.decision)"
    }
    Write-Host "============================================================"
    exit $ExitCode
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = Join-Path $PSScriptRoot "..\.." }
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $safePolicyEvaluationId = Get-SafePolicyEvaluationIdOrEmpty -Value $PolicyEvaluationId
    $safeCompletionReportId = Get-SafeCompletionReportIdOrEmpty -Value $CompletionReportId
    $safeFinalizationLogId = Get-SafeFinalizationLogIdOrEmpty -Value $FinalizationLogId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureDirs:($Command -eq "evaluate")
    $manifest = Get-PolicyManifest -Path $runtime.paths.auto_approval_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $ids = @($manifest.policy_evaluation_ids)
        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            policy_evaluation_count = $ids.Count
            latest_policy_evaluation_id = $manifest.latest_policy_evaluation_id
            auto_approval_policy_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.auto_approval_manifest_path
            task_run_auto_approval_policy = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "auto_approval_policy"
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safePolicyEvaluationId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string]$manifest.latest_policy_evaluation_id
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) { throw "No policy_evaluation_id was provided and no latest policy evaluation exists." }
        $path = Get-PolicyEvaluationPath -Dir $runtime.paths.auto_approval_evaluations_dir -Id $targetId
        if (-not (Test-Path -LiteralPath $path)) { throw "AutoApprovalPolicy evaluation does not exist: $targetId" }
        $evaluation = Read-JsonFile -Path $path
        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            policy_evaluation_id = $targetId
            policy_evaluation_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            decision = $evaluation.evaluation.decision
            policy_evaluation = $evaluation
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "evaluate") {
        $evaluationId = if ([string]::IsNullOrWhiteSpace($safePolicyEvaluationId)) { New-PolicyEvaluationId } else { $safePolicyEvaluationId }
        $evaluationPath = Get-PolicyEvaluationPath -Dir $runtime.paths.auto_approval_evaluations_dir -Id $evaluationId
        if (Test-Path -LiteralPath $evaluationPath) { throw "AutoApprovalPolicy evaluation already exists: $evaluationId" }
        $task = Get-BacklogTaskOrNull -Repo $repo -TaskId $safeTaskId
        $completionSource = Resolve-CompletionReport -Repo $repo -Runtime $runtime -RequestedId $safeCompletionReportId
        $finalizationSource = Resolve-FinalizationLog -Repo $repo -Runtime $runtime -RequestedId $safeFinalizationLogId
        $evaluation = Build-PolicyEvaluation -Repo $repo -Runtime $runtime -EvaluationId $evaluationId -Task $task -CompletionSource $completionSource -FinalizationSource $finalizationSource
        Save-JsonFile -Path $evaluationPath -Value $evaluation
        Save-PolicyManifest -Manifest $manifest -Path $runtime.paths.auto_approval_manifest_path -Id $evaluationId
        Update-TaskRunPolicyState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Evaluation $evaluation -EvaluationPath $evaluationPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -EvaluationId $evaluationId -Decision $evaluation.evaluation.decision
        $result = [pscustomobject]@{
            ok = $true
            command = "evaluate"
            task_id = $safeTaskId
            policy_evaluation_id = $evaluationId
            policy_evaluation_path = ConvertTo-RepoRelativePath -Repo $repo -Path $evaluationPath
            latest_progress_event_id = $eventId
            decision = $evaluation.evaluation.decision
            eligible_for_conditional_auto_approval = $evaluation.evaluation.eligible_for_conditional_auto_approval
            can_auto_approve_now = $evaluation.evaluation.can_auto_approve_now
            policy_evaluation = $evaluation
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
        policy_evaluation_id = $PolicyEvaluationId
        completion_report_id = $CompletionReportId
        finalization_log_id = $FinalizationLogId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }
    Write-ObjectResult -Result $result -ExitCode 1
}
