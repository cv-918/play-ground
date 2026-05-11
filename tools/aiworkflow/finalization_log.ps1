param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "record", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$Decision = "",

    [string]$CompletionReportId = "",

    [string]$ApprovalRecordId = "",

    [string]$FinalizationLogId = "",

    [string]$DecisionBy = "human_director",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText { return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz") }
function Get-Stamp { return (Get-Date -Format "yyyyMMdd-HHmmss-fff") }
function New-ShortGuid { return ([Guid]::NewGuid().ToString("N").Substring(0, 8)) }
function New-ApprovalRecordId { return ("approval-" + (Get-Stamp) + "-" + (New-ShortGuid)) }
function New-FinalizationLogId { return ("finalization-" + (Get-Stamp) + "-" + (New-ShortGuid)) }
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
    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 24) + "`n")
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

function Get-SafeDecision {
    param([string]$Value)
    $trimmed = $Value.Trim()
    $allowed = @("accept_completion", "reject_completion", "request_changes", "defer_completion")
    if (-not ($allowed -contains $trimmed)) {
        throw "Invalid decision. Use accept_completion, reject_completion, request_changes, or defer_completion."
    }
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

function Get-SafeApprovalRecordIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^approval-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid approval_record_id."
    }
    if ($trimmed.Contains("..")) { throw "Invalid approval_record_id. Parent path traversal is not allowed." }
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

function Get-SafeActor {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "human_director" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z0-9_-]{1,80}$") { throw "Invalid decision_by value." }
    return $trimmed
}

function Get-WorkspacePaths {
    param([string]$Repo, [string]$TaskId)
    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"
    $reportsDir = Join-Path $evidenceDir "reports"
    $completionDir = Join-Path $reportsDir "completion"
    $finalizationDir = Join-Path $reportsDir "finalization"
    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        completion_results_dir = Join-Path $completionDir "reports"
        completion_manifest_path = Join-Path $completionDir "completion_manifest.json"
        finalization_dir = $finalizationDir
        approval_history_dir = Join-Path $finalizationDir "approval_history"
        approval_history_manifest_path = Join-Path $finalizationDir "approval_history_manifest.json"
        finalization_logs_dir = Join-Path $finalizationDir "finalization_logs"
        finalization_manifest_path = Join-Path $finalizationDir "finalization_manifest.json"
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
        New-Item -ItemType Directory -Path $paths.approval_history_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.finalization_logs_dir -Force | Out-Null
    }
    return [pscustomobject]@{ paths = $paths; metadata = $metadata; task_run_state = $taskRunState }
}

function Get-CompletionReportPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Get-ApprovalPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Get-FinalizationPath {
    param([string]$Dir, [string]$Id)
    return (Join-Path $Dir ($Id + ".json"))
}

function Get-Manifest {
    param([string]$Path, [string]$TaskId, [string]$WorkspaceId, [string]$IdsField, [string]$LatestField)
    $existing = Read-JsonFileOrNull -Path $Path
    if ($null -ne $existing) { return $existing }
    $manifest = [pscustomobject]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        created_at = Get-NowText
        updated_at = Get-NowText
    }
    Set-ObjectProperty -Object $manifest -Name $IdsField -Value @()
    Set-ObjectProperty -Object $manifest -Name $LatestField -Value $null
    return $manifest
}

function Save-Manifest {
    param($Manifest, [string]$Path, [string]$Id, [string]$IdsField, [string]$LatestField)
    $ids = @(Get-ObjectPropertyValue -Object $Manifest -Name $IdsField)
    if (-not ($ids -contains $Id)) { $ids += $Id }
    Set-ObjectProperty -Object $Manifest -Name $IdsField -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name $LatestField -Value $Id
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

function Assert-DecisionAllowed {
    param([string]$Decision, $CompletionSource)
    if ($Decision -ne "accept_completion") { return }
    if (-not $CompletionSource.present) { throw "accept_completion requires a CompletionReport that can be reviewed." }
    $readiness = $CompletionSource.report.completion_readiness
    if ($readiness.can_mark_task_done_manually -ne $true) {
        throw "CompletionReport is not ready for accept_completion. Current state: $($CompletionSource.report.completion_state)"
    }
}

function Get-FinalizationState {
    param([string]$Decision)
    switch ($Decision) {
        "accept_completion" { return "completion_accepted_pending_task_done" }
        "reject_completion" { return "completion_rejected" }
        "request_changes" { return "changes_requested" }
        "defer_completion" { return "completion_deferred" }
    }
}

function Get-NextCommands {
    param([string]$TaskId, [string]$Decision, [string]$FinalizationId)
    switch ($Decision) {
        "accept_completion" {
            return @(
                "/ai task done id:$TaskId evidence:FinalizationLog $FinalizationId accepted completion.",
                "Review git status/diff before manual commit.",
                "Proceed to WF-308 Auto Approval Policy after this workflow layer is committed."
            )
        }
        "request_changes" {
            return @("Create or approve a focused fix task, then regenerate VerificationReport and CompletionReport.")
        }
        "reject_completion" {
            return @("Keep the task open or block it with a clear reason; do not mark done.")
        }
        "defer_completion" {
            return @("Defer completion review and resume after more evidence or user review.")
        }
    }
}

function Get-GitObservation {
    param([string]$Repo)
    $head = ""
    $status = @()
    try { $head = (& git -C $Repo rev-parse --short HEAD 2>$null) -join "`n" } catch { $head = "" }
    try { $status = @(& git -C $Repo status --short 2>$null) } catch { $status = @() }
    return [ordered]@{
        head = $head.Trim()
        dirty = ($status.Count -gt 0)
        status_short = @($status | Select-Object -First 80)
        observed_at = Get-NowText
    }
}

function New-ApprovalRecord {
    param($Runtime, [string]$ApprovalId, [string]$Decision, [string]$Actor, $Task, $CompletionSource)
    return [ordered]@{
        schema_version = 1
        approval_record_id = $ApprovalId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        decision = $Decision
        decision_by = $Actor
        decided_at = Get-NowText
        decision_source = "human_director_explicit_discord_or_local_command"
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
                completion_state = if ($CompletionSource.present) { $CompletionSource.report.completion_state } else { $null }
                readiness_level = if ($CompletionSource.present) { $CompletionSource.report.completion_readiness.level } else { $null }
                missing_reason = $CompletionSource.missing_reason
            }
        }
        invariants = [ordered]@{
            task_lifecycle_unchanged = $true
            no_task_done = $true
            no_auto_approval_policy = $true
            no_commit_or_push = $true
        }
    }
}

function New-FinalizationLog {
    param([string]$Repo, $Runtime, [string]$FinalizationId, $Approval, [string]$ApprovalPath, $CompletionSource)
    $decision = $Approval.decision
    return [ordered]@{
        schema_version = 1
        finalization_log_id = $FinalizationId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        final_decision = $decision
        finalization_state = Get-FinalizationState -Decision $decision
        final_decision_by = $Approval.decision_by
        decision_time = Get-NowText
        sources = [ordered]@{
            approval_history = [ordered]@{
                approval_record_id = $Approval.approval_record_id
                approval_record_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $ApprovalPath
            }
            completion_report = [ordered]@{
                present = [bool]$CompletionSource.present
                completion_report_id = $CompletionSource.selected_id
                completion_report_path = $CompletionSource.path
                completion_state = if ($CompletionSource.present) { $CompletionSource.report.completion_state } else { $null }
                readiness_level = if ($CompletionSource.present) { $CompletionSource.report.completion_readiness.level } else { $null }
                missing_reason = $CompletionSource.missing_reason
            }
        }
        state_files_updated = $false
        task_lifecycle_updates_applied = $false
        backlog_changes = @()
        active_task_changes = @()
        project_status_changes = @()
        git_worktree_state = Get-GitObservation -Repo $Repo
        suggested_next_manual_commands = @(Get-NextCommands -TaskId $Runtime.metadata.task_id -Decision $decision -FinalizationId $FinalizationId)
        invariants = [ordered]@{
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_auto_approval_policy = $true
            no_follow_up_task_generator = $true
            no_commit_or_push = $true
        }
        handoff = [ordered]@{
            wf_308_auto_approval_policy = [ordered]@{
                may_read_approval_history = $true
                may_read_finalization_log = $true
                must_not_infer_unrecorded_human_approval = $true
            }
            no_auto_approval = $true
        }
    }
}

function Update-TaskRunFinalizationState {
    param([string]$Repo, $TaskRunState, [string]$TaskRunStatePath, $Approval, [string]$ApprovalPath, $Finalization, [string]$FinalizationPath)
    if ($null -eq $TaskRunState.approval_history) {
        Set-ObjectProperty -Object $TaskRunState -Name "approval_history" -Value ([pscustomobject]@{})
    }
    if ($null -eq $TaskRunState.finalization_log) {
        Set-ObjectProperty -Object $TaskRunState -Name "finalization_log" -Value ([pscustomobject]@{})
    }
    Set-ObjectProperty -Object $TaskRunState.approval_history -Name "latest_approval_record_id" -Value $Approval.approval_record_id
    Set-ObjectProperty -Object $TaskRunState.approval_history -Name "latest_approval_record_path" -Value (ConvertTo-RepoRelativePath -Repo $Repo -Path $ApprovalPath)
    Set-ObjectProperty -Object $TaskRunState.approval_history -Name "latest_decision" -Value $Approval.decision
    Set-ObjectProperty -Object $TaskRunState.approval_history -Name "latest_decision_by" -Value $Approval.decision_by
    Set-ObjectProperty -Object $TaskRunState.approval_history -Name "latest_decided_at" -Value $Approval.decided_at
    Set-ObjectProperty -Object $TaskRunState.finalization_log -Name "latest_finalization_log_id" -Value $Finalization.finalization_log_id
    Set-ObjectProperty -Object $TaskRunState.finalization_log -Name "latest_finalization_log_path" -Value (ConvertTo-RepoRelativePath -Repo $Repo -Path $FinalizationPath)
    Set-ObjectProperty -Object $TaskRunState.finalization_log -Name "latest_finalization_state" -Value $Finalization.finalization_state
    Set-ObjectProperty -Object $TaskRunState.finalization_log -Name "latest_final_decision" -Value $Finalization.final_decision
    Set-ObjectProperty -Object $TaskRunState.finalization_log -Name "latest_decision_time" -Value $Finalization.decision_time
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param([string]$Path, [string]$TaskId, [string]$RunId, [string]$FinalizationId, [string]$State)
    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "finalization_log_recorded"
        severity = "info"
        message = "Finalization log recorded."
        source = "finalization_log"
        data = [ordered]@{
            finalization_log_id = $FinalizationId
            finalization_state = $State
            display_only = $true
        }
        created_at = Get-NowText
    }
    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 12)
    return $event.event_id
}

function Write-ObjectResult {
    param($Result, [int]$ExitCode = 0)
    if ($Json) {
        $Result | ConvertTo-Json -Depth 24
        exit $ExitCode
    }
    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }
    Write-Host "============================================================"
    Write-Host "AIWorkflow Finalization Log"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.finalization_log_id)) {
        Write-Host "FinalizationLog: $($Result.finalization_log_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.finalization_state)) {
        Write-Host "State: $($Result.finalization_state)"
    }
    Write-Host "============================================================"
    exit $ExitCode
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = Join-Path $PSScriptRoot "..\.." }
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $safeCompletionReportId = Get-SafeCompletionReportIdOrEmpty -Value $CompletionReportId
    $safeApprovalRecordId = Get-SafeApprovalRecordIdOrEmpty -Value $ApprovalRecordId
    $safeFinalizationLogId = Get-SafeFinalizationLogIdOrEmpty -Value $FinalizationLogId
    $safeActor = Get-SafeActor -Value $DecisionBy
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureDirs:($Command -eq "record")
    $approvalManifest = Get-Manifest -Path $runtime.paths.approval_history_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id -IdsField "approval_record_ids" -LatestField "latest_approval_record_id"
    $finalizationManifest = Get-Manifest -Path $runtime.paths.finalization_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id -IdsField "finalization_log_ids" -LatestField "latest_finalization_log_id"

    if ($Command -eq "status") {
        $approvalIds = @(Get-ObjectPropertyValue -Object $approvalManifest -Name "approval_record_ids")
        $finalizationIds = @(Get-ObjectPropertyValue -Object $finalizationManifest -Name "finalization_log_ids")
        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            approval_record_count = $approvalIds.Count
            latest_approval_record_id = Get-ObjectPropertyValue -Object $approvalManifest -Name "latest_approval_record_id"
            approval_history_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.approval_history_manifest_path
            finalization_log_count = $finalizationIds.Count
            latest_finalization_log_id = Get-ObjectPropertyValue -Object $finalizationManifest -Name "latest_finalization_log_id"
            finalization_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.finalization_manifest_path
            task_run_approval_history = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "approval_history"
            task_run_finalization_log = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "finalization_log"
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safeFinalizationLogId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string](Get-ObjectPropertyValue -Object $finalizationManifest -Name "latest_finalization_log_id")
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) { throw "No finalization_log_id was provided and no latest FinalizationLog exists." }
        $path = Get-FinalizationPath -Dir $runtime.paths.finalization_logs_dir -Id $targetId
        if (-not (Test-Path -LiteralPath $path)) { throw "FinalizationLog does not exist: $targetId" }
        $log = Read-JsonFile -Path $path
        $approvalPath = Get-ApprovalPath -Dir $runtime.paths.approval_history_dir -Id $log.sources.approval_history.approval_record_id
        $approval = if (Test-Path -LiteralPath $approvalPath) { Read-JsonFile -Path $approvalPath } else { $null }
        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            finalization_log_id = $targetId
            finalization_log_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            finalization_state = $log.finalization_state
            approval_record = $approval
            finalization_log = $log
            task_lifecycle_unchanged = $true
        }
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "record") {
        $safeDecision = Get-SafeDecision -Value $Decision
        $completionSource = Resolve-CompletionReport -Repo $repo -Runtime $runtime -RequestedId $safeCompletionReportId
        Assert-DecisionAllowed -Decision $safeDecision -CompletionSource $completionSource
        $approvalId = if ([string]::IsNullOrWhiteSpace($safeApprovalRecordId)) { New-ApprovalRecordId } else { $safeApprovalRecordId }
        $finalizationId = if ([string]::IsNullOrWhiteSpace($safeFinalizationLogId)) { New-FinalizationLogId } else { $safeFinalizationLogId }
        $approvalPath = Get-ApprovalPath -Dir $runtime.paths.approval_history_dir -Id $approvalId
        $finalizationPath = Get-FinalizationPath -Dir $runtime.paths.finalization_logs_dir -Id $finalizationId
        if (Test-Path -LiteralPath $approvalPath) { throw "ApprovalHistory record already exists: $approvalId" }
        if (Test-Path -LiteralPath $finalizationPath) { throw "FinalizationLog already exists: $finalizationId" }
        $task = Get-BacklogTaskOrNull -Repo $repo -TaskId $safeTaskId
        $approval = New-ApprovalRecord -Runtime $runtime -ApprovalId $approvalId -Decision $safeDecision -Actor $safeActor -Task $task -CompletionSource $completionSource
        $finalization = New-FinalizationLog -Repo $repo -Runtime $runtime -FinalizationId $finalizationId -Approval $approval -ApprovalPath $approvalPath -CompletionSource $completionSource
        Save-JsonFile -Path $approvalPath -Value $approval
        Save-JsonFile -Path $finalizationPath -Value $finalization
        Save-Manifest -Manifest $approvalManifest -Path $runtime.paths.approval_history_manifest_path -Id $approvalId -IdsField "approval_record_ids" -LatestField "latest_approval_record_id"
        Save-Manifest -Manifest $finalizationManifest -Path $runtime.paths.finalization_manifest_path -Id $finalizationId -IdsField "finalization_log_ids" -LatestField "latest_finalization_log_id"
        Update-TaskRunFinalizationState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Approval $approval -ApprovalPath $approvalPath -Finalization $finalization -FinalizationPath $finalizationPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -FinalizationId $finalizationId -State $finalization.finalization_state
        $result = [pscustomobject]@{
            ok = $true
            command = "record"
            task_id = $safeTaskId
            approval_record_id = $approvalId
            approval_record_path = ConvertTo-RepoRelativePath -Repo $repo -Path $approvalPath
            finalization_log_id = $finalizationId
            finalization_log_path = ConvertTo-RepoRelativePath -Repo $repo -Path $finalizationPath
            latest_progress_event_id = $eventId
            final_decision = $finalization.final_decision
            finalization_state = $finalization.finalization_state
            approval_record = $approval
            finalization_log = $finalization
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
        decision = $Decision
        completion_report_id = $CompletionReportId
        approval_record_id = $ApprovalRecordId
        finalization_log_id = $FinalizationLogId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }
    Write-ObjectResult -Result $result -ExitCode 1
}
