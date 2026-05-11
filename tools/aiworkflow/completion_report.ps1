param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "generate", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$VerificationReportId = "",

    [string]$CompletionReportId = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText {
    return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

function Get-Stamp {
    return (Get-Date -Format "yyyyMMdd-HHmmss-fff")
}

function New-ShortGuid {
    return ([Guid]::NewGuid().ToString("N").Substring(0, 8))
}

function New-CompletionReportId {
    return ("completion-" + (Get-Stamp) + "-" + (New-ShortGuid))
}

function New-EventId {
    return ("event-" + (Get-Stamp) + "-" + (New-ShortGuid))
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::WriteAllText($Path, $Text, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) {
                throw
            }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Append-Utf8Line {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) {
                throw
            }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "JSON file not found: $Path"
    }

    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "JSON file is empty: $Path"
    }

    return ($raw | ConvertFrom-Json)
}

function Read-JsonFileOrNull {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    return ($raw | ConvertFrom-Json)
}

function Save-JsonFile {
    param(
        [string]$Path,
        $Value
    )

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 24) + "`n")
}

function ConvertTo-RepoRelativePath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
    }

    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $full.Substring($root.Length).TrimStart("\", "/")
        if ([string]::IsNullOrWhiteSpace($relative)) {
            return "."
        }
        return ($relative -replace "\\", "/")
    }

    return ($full -replace "\\", "/")
}

function Get-SafeTaskId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Task id is required."
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid task id. Use a plain task id without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid task id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function Get-SafeVerificationReportIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^verification-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid verification_report_id. Use verification-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid verification_report_id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-SafeCompletionReportIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid completion_report_id. Use completion-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid completion_report_id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-ObjectPropertyValue {
    param(
        $Object,
        [string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Set-ObjectProperty {
    param(
        $Object,
        [string]$Name,
        $Value
    )

    if ($null -ne $Object.PSObject.Properties[$Name]) {
        $Object.$Name = $Value
    }
    else {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
    }
}

function As-Array {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }
    if ($Value -is [System.Array]) {
        return @($Value)
    }
    return @($Value)
}

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"
    $reportsDir = Join-Path $evidenceDir "reports"
    $verificationDir = Join-Path $reportsDir "verification"
    $completionDir = Join-Path $reportsDir "completion"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        reports_dir = $reportsDir
        verification_dir = $verificationDir
        verification_results_dir = Join-Path $verificationDir "results"
        verification_manifest_path = Join-Path $verificationDir "verification_manifest.json"
        completion_dir = $completionDir
        completion_results_dir = Join-Path $completionDir "reports"
        completion_manifest_path = Join-Path $completionDir "completion_manifest.json"
    }
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [bool]$EnsureCompletionDirs = $false
    )

    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId

    if (-not (Test-Path -LiteralPath $paths.workspace_path)) {
        throw "Runtime workspace does not exist for task_id $TaskId. Create it with task_workspace_manager first."
    }

    $metadata = Read-JsonFile -Path $paths.metadata_path
    $taskRunState = Read-JsonFile -Path $paths.task_run_state_path

    if ($metadata.task_id -ne $TaskId) {
        throw "Workspace metadata task_id mismatch. Expected $TaskId, found $($metadata.task_id)."
    }
    if ($taskRunState.task_id -ne $TaskId) {
        throw "TaskRunState task_id mismatch. Expected $TaskId, found $($taskRunState.task_id)."
    }

    if ($EnsureCompletionDirs) {
        New-Item -ItemType Directory -Path $paths.completion_results_dir -Force | Out-Null
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Get-VerificationReportPath {
    param(
        [string]$ResultsDir,
        [string]$ReportId
    )

    return (Join-Path $ResultsDir ($ReportId + ".json"))
}

function Get-CompletionReportPath {
    param(
        [string]$ResultsDir,
        [string]$ReportId
    )

    return (Join-Path $ResultsDir ($ReportId + ".json"))
}

function Get-CompletionManifest {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$WorkspaceId
    )

    $existing = Read-JsonFileOrNull -Path $Path
    if ($null -ne $existing) {
        return $existing
    }

    return [pscustomobject]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        completion_report_ids = @()
        latest_completion_report_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-CompletionManifest {
    param(
        [string]$Path,
        $Manifest,
        [string]$ReportId
    )

    $ids = @($Manifest.completion_report_ids)
    if (-not ($ids -contains $ReportId)) {
        $ids += $ReportId
    }

    Set-ObjectProperty -Object $Manifest -Name "completion_report_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_completion_report_id" -Value $ReportId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
}

function Parse-BacklogRows {
    param([string]$Text)

    $rows = @()
    if ([string]::IsNullOrEmpty($Text)) {
        return @()
    }

    foreach ($lineObj in ($Text -split "`r?`n")) {
        $line = ([string]$lineObj).Trim()
        if (-not $line.StartsWith("|")) {
            continue
        }

        $cells = @($line.Trim("|".ToCharArray()).Split("|".ToCharArray()) | ForEach-Object { ([string]$_).Trim() })
        if ($cells.Count -lt 8) {
            continue
        }

        $id = $cells[0]
        if ($id -notmatch "^(WF|GAME|VAL|DOC|UNITY)-") {
            continue
        }

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
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $backlogPath = Join-Path $Repo "_Docs\AIWorkflow\Backlog.md"
    $backlogText = Read-Utf8Text -Path $backlogPath
    $matches = @(Parse-BacklogRows -Text $backlogText | Where-Object { $_.id -eq $TaskId })

    if ($matches.Count -gt 1) {
        throw "Duplicate task_id found in Backlog.md: $TaskId"
    }
    if ($matches.Count -eq 0) {
        return $null
    }

    return $matches[0]
}

function Resolve-VerificationReportSource {
    param(
        [string]$Repo,
        $Runtime,
        [string]$RequestedId
    )

    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.verification_manifest_path
    $selectedId = $RequestedId
    if ([string]::IsNullOrWhiteSpace($selectedId) -and $null -ne $manifest) {
        $selectedId = [string]$manifest.latest_verification_report_id
    }

    if ([string]::IsNullOrWhiteSpace($selectedId)) {
        return [pscustomobject]@{
            present = $false
            selected_id = $null
            path = $null
            report = $null
            verdict = "BLOCKED"
            missing_reason = "No VerificationReport exists. Run verification_report generate before completion review."
        }
    }

    $path = Get-VerificationReportPath -ResultsDir $Runtime.paths.verification_results_dir -ReportId $selectedId
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{
            present = $false
            selected_id = $selectedId
            path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
            report = $null
            verdict = "BLOCKED"
            missing_reason = "VerificationReport file was not found: $selectedId"
        }
    }

    $report = Read-JsonFile -Path $path
    $verdict = [string](Get-ObjectPropertyValue -Object (Get-ObjectPropertyValue -Object $report -Name "verdict") -Name "level")
    if ([string]::IsNullOrWhiteSpace($verdict)) {
        $verdict = "BLOCKED"
    }

    return [pscustomobject]@{
        present = $true
        selected_id = $selectedId
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        report = $report
        verdict = $verdict
        missing_reason = $null
    }
}

function Get-ReadinessFromVerdict {
    param(
        [string]$Verdict,
        [bool]$HasVerification
    )

    if (-not $HasVerification) {
        return [ordered]@{
            level = "BLOCKED"
            state = "blocked_by_missing_verification"
            summary = "Completion review is blocked because no usable VerificationReport was found."
            can_mark_task_done_manually = $false
            can_commit_after_review = $false
            human_review_required = $true
            human_decision_required = $true
            recommended_user_action = "Generate a VerificationReport first, then regenerate CompletionReport."
        }
    }

    switch ($Verdict) {
        "PASS" {
            return [ordered]@{
                level = "READY"
                state = "ready_for_human_completion_review"
                summary = "Verification passed. Human completion review can proceed."
                can_mark_task_done_manually = $true
                can_commit_after_review = $true
                human_review_required = $true
                human_decision_required = $false
                recommended_user_action = "Review CompletionReport/Card, then mark the task done manually if accepted."
            }
        }
        "PASS_WITH_NOTES" {
            return [ordered]@{
                level = "READY_WITH_NOTES"
                state = "ready_for_human_completion_review_with_notes"
                summary = "Verification passed with non-blocking notes. Human completion review can proceed."
                can_mark_task_done_manually = $true
                can_commit_after_review = $true
                human_review_required = $true
                human_decision_required = $false
                recommended_user_action = "Review notes, then mark the task done manually if accepted."
            }
        }
        "CONCERNS" {
            return [ordered]@{
                level = "NEEDS_DECISION"
                state = "needs_human_decision"
                summary = "Verification reported concerns. Human Director decision is required before completion."
                can_mark_task_done_manually = $false
                can_commit_after_review = $false
                human_review_required = $true
                human_decision_required = $true
                recommended_user_action = "Review concerns and either accept risk, request fixes, or create a follow-up."
            }
        }
        "FAIL" {
            return [ordered]@{
                level = "FAILED"
                state = "failed_verification"
                summary = "Verification failed. Completion should not be accepted."
                can_mark_task_done_manually = $false
                can_commit_after_review = $false
                human_review_required = $true
                human_decision_required = $true
                recommended_user_action = "Fix failed checks or choose a recovery task before completion."
            }
        }
        default {
            return [ordered]@{
                level = "BLOCKED"
                state = "blocked_by_verification"
                summary = "Verification is blocked or incomplete. Completion should not be accepted yet."
                can_mark_task_done_manually = $false
                can_commit_after_review = $false
                human_review_required = $true
                human_decision_required = $true
                recommended_user_action = "Provide missing required evidence before completion."
            }
        }
    }
}

function Get-FirstItems {
    param(
        $Values,
        [int]$Limit = 6
    )

    return @(As-Array -Value $Values | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -First $Limit)
}

function Build-HumanDecisions {
    param(
        $VerificationReport,
        $Readiness,
        [string]$MissingReason
    )

    $items = @()
    if (-not [string]::IsNullOrWhiteSpace($MissingReason)) {
        $items += $MissingReason
    }
    if ($Readiness.human_decision_required -eq $true) {
        $items += $Readiness.recommended_user_action
    }
    if ($null -ne $VerificationReport) {
        $items += @(As-Array -Value $VerificationReport.human_decisions)
    }

    return @(Get-FirstItems -Values ($items | Sort-Object -Unique) -Limit 8)
}

function Build-NextCommands {
    param(
        [string]$TaskId,
        [string]$ReportId,
        $Readiness
    )

    if ($Readiness.can_mark_task_done_manually -eq $true) {
        return @(
            "/ai task done id:$TaskId evidence:CompletionReport $ReportId reviewed and accepted.",
            "Review git status/diff before manual commit.",
            "WF-307 handoff: record ApprovalHistory and FinalizationLog after this layer exists."
        )
    }

    return @(
        "Do not mark this task done yet.",
        $Readiness.recommended_user_action,
        "Regenerate VerificationReport and CompletionReport after fixes or added evidence."
    )
}

function New-CompletionReport {
    param(
        [string]$Repo,
        $Runtime,
        [string]$ReportId,
        $Task,
        $VerificationSource
    )

    $verification = $VerificationSource.report
    $verdict = [string]$VerificationSource.verdict
    $readiness = Get-ReadinessFromVerdict -Verdict $verdict -HasVerification ([bool]$VerificationSource.present)
    $warnings = if ($null -eq $verification) { @() } else { Get-FirstItems -Values $verification.warnings -Limit 8 }
    $concerns = if ($null -eq $verification) { @() } else { Get-FirstItems -Values $verification.concerns -Limit 8 }
    $blockers = if ($null -eq $verification) { @() } else { Get-FirstItems -Values $verification.blockers -Limit 8 }
    $failedChecks = if ($null -eq $verification) { @() } else { Get-FirstItems -Values $verification.failed_checks -Limit 8 }
    $humanDecisions = Build-HumanDecisions -VerificationReport $verification -Readiness $readiness -MissingReason $VerificationSource.missing_reason
    $generatedAt = Get-NowText

    return [ordered]@{
        schema_version = 1
        completion_report_id = $ReportId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        generated_at = $generatedAt
        generator = "completion_report"
        task_context = [ordered]@{
            found_in_backlog = ($null -ne $Task)
            priority = if ($null -eq $Task) { $null } else { $Task.priority }
            status = if ($null -eq $Task) { $null } else { $Task.status }
            kind = if ($null -eq $Task) { $null } else { $Task.kind }
            title = if ($null -eq $Task) { $null } else { $Task.title }
            validation = if ($null -eq $Task) { $null } else { $Task.validation }
        }
        sources = [ordered]@{
            verification_report = [ordered]@{
                present = [bool]$VerificationSource.present
                verification_report_id = $VerificationSource.selected_id
                verification_report_path = $VerificationSource.path
                verdict = $verdict
                missing_reason = $VerificationSource.missing_reason
            }
        }
        completion_state = $readiness.state
        completion_readiness = $readiness
        verification_summary = [ordered]@{
            verdict = $verdict
            warning_count = $warnings.Count
            concern_count = $concerns.Count
            blocker_count = $blockers.Count
            failed_check_count = $failedChecks.Count
            recommended_user_action = if ($null -eq $verification) { $readiness.recommended_user_action } else { $verification.verdict.recommended_user_action }
        }
        remaining_risks = [ordered]@{
            warnings = @($warnings)
            concerns = @($concerns)
            blockers = @($blockers)
            failed_checks = @($failedChecks)
        }
        human_decisions_required = @($humanDecisions)
        suggested_next_manual_commands = @(Build-NextCommands -TaskId $Runtime.metadata.task_id -ReportId $ReportId -Readiness $readiness)
        follow_up_candidates = @(
            @($concerns | ForEach-Object { "Concern: $_" })
            @($blockers | ForEach-Object { "Blocker: $_" })
            @($failedChecks | ForEach-Object { "Failed check: $_" })
        )
        invariants = [ordered]@{
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_finalization_log = $true
            no_auto_approval_policy = $true
            no_commit_or_push = $true
        }
        handoff = [ordered]@{
            wf_306_completion_card = [ordered]@{
                can_render_from_this_report = $true
                recommended_command = "completion_card generate $($Runtime.metadata.task_id) $ReportId"
            }
            wf_307_approval_history_and_finalization_log = [ordered]@{
                may_use_completion_report = $true
                must_not_be_skipped = $true
            }
            no_finalization = $true
            no_auto_approval = $true
        }
    }
}

function Update-TaskRunCompletionState {
    param(
        [string]$Repo,
        $TaskRunState,
        [string]$TaskRunStatePath,
        $Report,
        [string]$ReportPath
    )

    if ($null -eq $TaskRunState.completion_report) {
        Set-ObjectProperty -Object $TaskRunState -Name "completion_report" -Value ([pscustomobject]@{})
    }

    $reportRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $ReportPath
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "latest_completion_report_id" -Value $Report.completion_report_id
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "latest_completion_report_path" -Value $reportRef
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "completion_state" -Value $Report.completion_state
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "readiness_level" -Value $Report.completion_readiness.level
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "can_mark_task_done_manually" -Value $Report.completion_readiness.can_mark_task_done_manually
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "human_review_required" -Value $Report.completion_readiness.human_review_required
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "human_decision_required" -Value $Report.completion_readiness.human_decision_required
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "latest_verification_report_id" -Value $Report.sources.verification_report.verification_report_id
    Set-ObjectProperty -Object $TaskRunState.completion_report -Name "latest_generated_at" -Value $Report.generated_at
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$ReportId,
        [string]$ReportPath,
        [string]$State
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "completion_report_created"
        severity = "info"
        message = "Completion report created."
        source = "completion_report"
        data = [ordered]@{
            completion_report_id = $ReportId
            completion_report_path = $ReportPath
            completion_state = $State
            display_only = $true
        }
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 12)
    return $event.event_id
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 24
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Completion Report"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.completion_report_id)) {
        Write-Host "CompletionReport: $($Result.completion_report_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.completion_state)) {
        Write-Host "State: $($Result.completion_state)"
    }
    Write-Host "============================================================"
    exit $ExitCode
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        $RepoRoot = Join-Path $PSScriptRoot "..\.."
    }

    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $safeVerificationReportId = Get-SafeVerificationReportIdOrEmpty -Value $VerificationReportId
    $safeCompletionReportId = Get-SafeCompletionReportIdOrEmpty -Value $CompletionReportId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureCompletionDirs:($Command -eq "generate")
    $manifest = Get-CompletionManifest -Path $runtime.paths.completion_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $ids = @($manifest.completion_report_ids)
        $latestId = if ([string]::IsNullOrWhiteSpace([string]$manifest.latest_completion_report_id)) { $null } else { [string]$manifest.latest_completion_report_id }
        $latestPath = if ($null -eq $latestId) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-CompletionReportPath -ResultsDir $runtime.paths.completion_results_dir -ReportId $latestId) }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            completion_report_count = $ids.Count
            latest_completion_report_id = $latestId
            latest_completion_report_path = $latestPath
            completion_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.completion_manifest_path
            task_run_completion_report = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "completion_report"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safeCompletionReportId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string]$manifest.latest_completion_report_id
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            throw "No completion_report_id was provided and no latest CompletionReport exists."
        }

        $path = Get-CompletionReportPath -ResultsDir $runtime.paths.completion_results_dir -ReportId $targetId
        if (-not (Test-Path -LiteralPath $path)) {
            throw "CompletionReport does not exist: $targetId"
        }
        $report = Read-JsonFile -Path $path

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            completion_report_id = $targetId
            completion_report_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            completion_state = $report.completion_state
            readiness_level = $report.completion_readiness.level
            completion_report = $report
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "generate") {
        $reportIdToWrite = if ([string]::IsNullOrWhiteSpace($safeCompletionReportId)) { New-CompletionReportId } else { $safeCompletionReportId }
        $reportPath = Get-CompletionReportPath -ResultsDir $runtime.paths.completion_results_dir -ReportId $reportIdToWrite
        if (Test-Path -LiteralPath $reportPath) {
            throw "CompletionReport already exists: $reportIdToWrite"
        }

        $task = Get-BacklogTaskOrNull -Repo $repo -TaskId $safeTaskId
        $verificationSource = Resolve-VerificationReportSource -Repo $repo -Runtime $runtime -RequestedId $safeVerificationReportId
        $report = New-CompletionReport -Repo $repo -Runtime $runtime -ReportId $reportIdToWrite -Task $task -VerificationSource $verificationSource
        $reportRef = ConvertTo-RepoRelativePath -Repo $repo -Path $reportPath

        Save-JsonFile -Path $reportPath -Value $report
        Save-CompletionManifest -Path $runtime.paths.completion_manifest_path -Manifest $manifest -ReportId $reportIdToWrite
        Update-TaskRunCompletionState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Report $report -ReportPath $reportPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -ReportId $reportIdToWrite -ReportPath $reportRef -State $report.completion_state

        $result = [pscustomobject]@{
            ok = $true
            command = "generate"
            task_id = $safeTaskId
            completion_report_id = $reportIdToWrite
            completion_report_path = $reportRef
            latest_progress_event_id = $eventId
            completion_state = $report.completion_state
            readiness_level = $report.completion_readiness.level
            human_review_required = $report.completion_readiness.human_review_required
            human_decision_required = $report.completion_readiness.human_decision_required
            recommended_user_action = $report.completion_readiness.recommended_user_action
            completion_report = $report
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
        verification_report_id = $VerificationReportId
        completion_report_id = $CompletionReportId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
