param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("create", "read", "update", "heartbeat", "status")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$SessionId = "",

    [string]$Status = "",

    [string]$Activity = "",

    [string]$ExecutorType = "manual",

    [int]$StalledAfterMinutes = 30,

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

$AllowedSessionStatuses = @(
    "created",
    "starting",
    "running",
    "waiting",
    "paused",
    "stalled",
    "stopping",
    "failed",
    "completed",
    "cancelled"
)

function Get-NowText {
    return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

function Get-EventId {
    return ("event-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff") + "-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8)))
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Append-Utf8Line {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $encoding)
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "JSON file not found: $Path"
    }

    $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "JSON file is empty: $Path"
    }

    return ($raw | ConvertFrom-Json)
}

function ConvertTo-RepoRelativePath {
    param(
        [string]$Repo,
        [string]$Path
    )

    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")

    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $full.Substring($root.Length).TrimStart("\", "/")
        return ($relative -replace "\\", "/")
    }

    return ($full -replace "\\", "/")
}

function Get-SafeTaskId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Task id is required for this command."
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

function Get-SafeSessionId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Session id is required for this command."
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^session-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid session id. Use session-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid session id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $sessionsDir = Join-Path $workspacePath "sessions"
    $evidenceDir = Join-Path $workspacePath "evidence"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        sessions_dir = $sessionsDir
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        evidence_dir = $evidenceDir
        evidence_manifest_path = Join-Path $evidenceDir "manifest.json"
    }
}

function Get-SessionPath {
    param(
        [string]$SessionsDir,
        [string]$SessionId
    )

    return (Join-Path $SessionsDir ($SessionId + ".json"))
}

function Assert-Workspace {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId

    if (-not (Test-Path -LiteralPath $paths.workspace_path)) {
        throw "Runtime workspace does not exist for task_id $TaskId. Create it with task_workspace_manager first."
    }

    if (-not (Test-Path -LiteralPath $paths.metadata_path)) {
        throw "Workspace metadata is missing for task_id $TaskId."
    }

    if (-not (Test-Path -LiteralPath $paths.task_run_state_path)) {
        throw "TaskRunState is missing for task_id $TaskId."
    }

    $metadata = Read-JsonFile -Path $paths.metadata_path
    $taskRunState = Read-JsonFile -Path $paths.task_run_state_path

    if ($metadata.task_id -ne $TaskId) {
        throw "Workspace metadata task_id mismatch. Expected $TaskId, found $($metadata.task_id)."
    }

    if ($taskRunState.task_id -ne $TaskId) {
        throw "TaskRunState task_id mismatch. Expected $TaskId, found $($taskRunState.task_id)."
    }

    if ([string]::IsNullOrWhiteSpace($metadata.workspace_id)) {
        throw "Workspace metadata is missing workspace_id."
    }

    if (-not (Test-Path -LiteralPath $paths.sessions_dir)) {
        New-Item -ItemType Directory -Path $paths.sessions_dir -Force | Out-Null
    }

    if (-not (Test-Path -LiteralPath $paths.progress_event_log_path)) {
        Write-Utf8Text -Path $paths.progress_event_log_path -Text ""
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Set-ObjectProperty {
    param(
        $Object,
        [string]$Name,
        $Value
    )

    if ($null -eq $Object.PSObject.Properties[$Name]) {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value -Force
    }
    else {
        $Object.$Name = $Value
    }
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

function Save-JsonFile {
    param(
        [string]$Path,
        $Value
    )

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 12) + "`n")
}

function New-SessionId {
    param([string]$SessionsDir)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    for ($i = 1; $i -le 999; $i++) {
        $candidate = ("session-{0}-{1:D3}" -f $stamp, $i)
        $path = Get-SessionPath -SessionsDir $SessionsDir -SessionId $candidate
        if (-not (Test-Path -LiteralPath $path)) {
            return $candidate
        }
    }

    throw "Unable to allocate a unique session_id for timestamp $stamp."
}

function Get-IdleInfo {
    param(
        $Session,
        [int]$ThresholdMinutes
    )

    $anchor = $null
    if ($null -ne $Session.heartbeat -and -not [string]::IsNullOrWhiteSpace($Session.heartbeat.last_heartbeat_at)) {
        $anchor = [string]$Session.heartbeat.last_heartbeat_at
    }
    elseif (-not [string]::IsNullOrWhiteSpace($Session.updated_at)) {
        $anchor = [string]$Session.updated_at
    }

    if ([string]::IsNullOrWhiteSpace($anchor)) {
        return [pscustomobject]@{
            idle_seconds = $null
            idle_state = "unknown"
            measured_from = $null
        }
    }

    $parsed = [DateTimeOffset]::Parse($anchor)
    $seconds = [int][Math]::Max(0, [Math]::Floor(([DateTimeOffset]::Now - $parsed).TotalSeconds))
    $state = if ($seconds -ge ($ThresholdMinutes * 60)) { "stalled_candidate" } else { "active_or_recent" }

    return [pscustomobject]@{
        idle_seconds = $seconds
        idle_state = $state
        measured_from = $anchor
    }
}

function Read-ProgressEvents {
    param(
        [string]$Path,
        [string]$SessionId = "",
        [int]$MaxCount = 20
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    $events = @()
    foreach ($line in [System.IO.File]::ReadLines($Path, [System.Text.Encoding]::UTF8)) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            $event = $line | ConvertFrom-Json
        }
        catch {
            continue
        }

        if (-not [string]::IsNullOrWhiteSpace($SessionId) -and $event.session_id -ne $SessionId) {
            continue
        }

        $events += $event
    }

    if ($events.Count -le $MaxCount) {
        return @($events)
    }

    return @($events | Select-Object -Last $MaxCount)
}

function ConvertTo-ArrayValue {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    return @($Value)
}

function Get-EventDetails {
    param($Event)

    if ($null -eq $Event -or $null -eq $Event.data) {
        return $null
    }

    if ($null -ne $Event.data.PSObject.Properties["details"]) {
        return $Event.data.details
    }

    return $Event.data
}

function Get-WorkspaceFileSummary {
    param($Session)

    $workspace = Get-ObjectPropertyValue -Object $Session -Name "workspace"
    $files = @()
    $count = 0
    $snapshotPath = $null
    $lastAt = $null

    if ($null -ne $workspace) {
        $files = @(ConvertTo-ArrayValue -Value (Get-ObjectPropertyValue -Object $workspace -Name "recent_changed_files") | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $countValue = Get-ObjectPropertyValue -Object $workspace -Name "changed_files_count"
        if ($null -ne $countValue) {
            $count = [int]$countValue
        }
        elseif ($files.Count -gt 0) {
            $count = $files.Count
        }
        $snapshotPath = Get-ObjectPropertyValue -Object $workspace -Name "latest_diff_snapshot_path"
        $lastAt = Get-ObjectPropertyValue -Object $workspace -Name "last_file_change_at"
    }

    return [pscustomobject]@{
        changed_files_count = $count
        recent_changed_files = @($files)
        latest_diff_snapshot_path = $snapshotPath
        recent_diff_snapshots = if ([string]::IsNullOrWhiteSpace($snapshotPath)) { @() } else { @($snapshotPath) }
        last_file_change_at = $lastAt
    }
}

function Get-RecentFileChangeSummary {
    param(
        $Events,
        $Session
    )

    $files = @()
    $snapshots = @()
    $lastAt = $null

    foreach ($event in @($Events)) {
        $details = Get-EventDetails -Event $event
        if ($null -eq $details) {
            continue
        }

        if ($event.event_type -eq "file_change_detected") {
            $files += @(ConvertTo-ArrayValue -Value $details.changed_files | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            $lastAt = $event.created_at
        }

        if ($event.event_type -eq "diff_snapshot_created") {
            $path = Get-ObjectPropertyValue -Object $details -Name "diff_snapshot_path"
            if (-not [string]::IsNullOrWhiteSpace($path)) {
                $snapshots += [string]$path
                $lastAt = $event.created_at
            }
        }
    }

    $workspaceSummary = Get-WorkspaceFileSummary -Session $Session
    if ($files.Count -eq 0 -and $workspaceSummary.recent_changed_files.Count -gt 0) {
        $files = @($workspaceSummary.recent_changed_files)
    }
    if ($snapshots.Count -eq 0 -and $workspaceSummary.recent_diff_snapshots.Count -gt 0) {
        $snapshots = @($workspaceSummary.recent_diff_snapshots)
    }
    if ([string]::IsNullOrWhiteSpace($lastAt)) {
        $lastAt = $workspaceSummary.last_file_change_at
    }

    $uniqueFiles = @($files | Select-Object -Unique)
    $uniqueSnapshots = @($snapshots | Select-Object -Unique)

    return [pscustomobject]@{
        changed_files_count = if ($workspaceSummary.changed_files_count -gt $uniqueFiles.Count) { $workspaceSummary.changed_files_count } else { $uniqueFiles.Count }
        recent_changed_files = @($uniqueFiles)
        latest_diff_snapshot_path = if ($uniqueSnapshots.Count -eq 0) { $null } else { $uniqueSnapshots[-1] }
        recent_diff_snapshots = @($uniqueSnapshots)
        last_file_change_at = $lastAt
    }
}

function Get-SessionActivity {
    param($Session)

    $heartbeat = Get-ObjectPropertyValue -Object $Session -Name "heartbeat"
    if ($null -eq $heartbeat) {
        return [pscustomobject]@{
            last_activity_at = Get-ObjectPropertyValue -Object $Session -Name "updated_at"
            last_activity = $null
            activity_summary = $null
        }
    }

    $activitySummary = Get-ObjectPropertyValue -Object $heartbeat -Name "activity_summary"
    $legacySummary = Get-ObjectPropertyValue -Object $heartbeat -Name "last_activity_summary"
    $lastActivity = Get-ObjectPropertyValue -Object $heartbeat -Name "last_activity"
    $lastActivityAt = Get-ObjectPropertyValue -Object $heartbeat -Name "last_activity_at"
    $lastHeartbeatAt = Get-ObjectPropertyValue -Object $heartbeat -Name "last_heartbeat_at"

    $summary = if (-not [string]::IsNullOrWhiteSpace($activitySummary)) {
        [string]$activitySummary
    }
    elseif (-not [string]::IsNullOrWhiteSpace($legacySummary)) {
        [string]$legacySummary
    }
    elseif (-not [string]::IsNullOrWhiteSpace($lastActivity)) {
        [string]$lastActivity
    }
    else {
        $null
    }

    $at = if (-not [string]::IsNullOrWhiteSpace($lastActivityAt)) {
        [string]$lastActivityAt
    }
    elseif (-not [string]::IsNullOrWhiteSpace($lastHeartbeatAt)) {
        [string]$lastHeartbeatAt
    }
    else {
        Get-ObjectPropertyValue -Object $Session -Name "updated_at"
    }

    return [pscustomobject]@{
        last_activity_at = $at
        last_activity = if (-not [string]::IsNullOrWhiteSpace($lastActivity)) { [string]$lastActivity } else { $summary }
        activity_summary = $summary
    }
}

function New-SessionSummary {
    param(
        $Session,
        [int]$ThresholdMinutes
    )

    $idle = Get-IdleInfo -Session $Session -ThresholdMinutes $ThresholdMinutes
    $activity = Get-SessionActivity -Session $Session
    $fileSummary = Get-WorkspaceFileSummary -Session $Session

    return [pscustomobject]@{
        session_id = $Session.session_id
        status = $Session.status
        executor_type = if ($null -eq $Session.executor) { $null } else { $Session.executor.executor_type }
        idle_seconds = $idle.idle_seconds
        idle_state = $idle.idle_state
        idle_stalled_display_only = $true
        last_heartbeat_at = if ($null -eq $Session.heartbeat) { $null } else { $Session.heartbeat.last_heartbeat_at }
        last_activity_at = $activity.last_activity_at
        last_activity = $activity.last_activity
        activity_summary = $activity.activity_summary
        changed_files_count = $fileSummary.changed_files_count
        recent_changed_files = @($fileSummary.recent_changed_files)
        latest_diff_snapshot_path = $fileSummary.latest_diff_snapshot_path
        last_file_change_at = $fileSummary.last_file_change_at
        updated_at = $Session.updated_at
    }
}

function New-TaskRuntimeSummary {
    param(
        [string]$TaskId,
        [string]$WorkspaceId,
        $TaskRunState,
        $Sessions,
        [int]$ThresholdMinutes
    )

    $summaries = @($Sessions | ForEach-Object {
        New-SessionSummary -Session $_ -ThresholdMinutes $ThresholdMinutes
    })

    $running = @($summaries | Where-Object { $_.status -in @("starting", "running", "waiting") })
    $stalled = @($summaries | Where-Object { $_.idle_state -eq "stalled_candidate" })
    $latest = @($summaries | Sort-Object updated_at -Descending | Select-Object -First 1)

    return [pscustomobject]@{
        task_id = $TaskId
        workspace_id = $WorkspaceId
        run_id = $TaskRunState.run_id
        run_status = $TaskRunState.status
        active_session_id = $TaskRunState.active_session_id
        session_count = $summaries.Count
        running_session_count = $running.Count
        stalled_candidate_count = $stalled.Count
        idle_stalled_display_only = $true
        latest_activity = if ($latest.Count -eq 0) { $null } else { $latest[0].activity_summary }
        latest_activity_at = if ($latest.Count -eq 0) { $null } else { $latest[0].last_activity_at }
        sessions = @($summaries)
    }
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$SessionId,
        [string]$EventType,
        [string]$Message,
        $Data
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = Get-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $SessionId
        event_type = $EventType
        severity = "info"
        message = $Message
        source = "session_supervisor"
        data = $Data
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 8)
    return $event.event_id
}

function Convert-SessionStatusToRunStatus {
    param([string]$SessionStatus)

    switch ($SessionStatus) {
        "created" { return "idle" }
        "starting" { return "starting" }
        "running" { return "running" }
        "waiting" { return "idle" }
        "paused" { return "idle" }
        "stalled" { return "stalled" }
        "stopping" { return "idle" }
        "failed" { return "failed" }
        "completed" { return "idle" }
        "cancelled" { return "cancelled" }
        default { return $null }
    }
}

function Update-TaskRunStateForSession {
    param(
        $TaskRunState,
        [string]$TaskRunStatePath,
        [string]$SessionId,
        [string]$Now,
        [string]$CurrentStep,
        [string]$ActivitySummary = "",
        [string]$RunStatus = "",
        [switch]$Heartbeat
    )

    $ids = @()
    if ($null -ne $TaskRunState.session_ids) {
        $ids = @($TaskRunState.session_ids)
    }

    if (-not ($ids -contains $SessionId)) {
        $ids += $SessionId
    }

    Set-ObjectProperty -Object $TaskRunState -Name "session_ids" -Value @($ids)
    Set-ObjectProperty -Object $TaskRunState -Name "active_session_id" -Value $SessionId

    if ($null -eq $TaskRunState.progress) {
        Set-ObjectProperty -Object $TaskRunState -Name "progress" -Value ([pscustomobject]@{})
    }

    Set-ObjectProperty -Object $TaskRunState.progress -Name "last_event_at" -Value $Now
    Set-ObjectProperty -Object $TaskRunState.progress -Name "current_step" -Value $CurrentStep

    if ($Heartbeat) {
        Set-ObjectProperty -Object $TaskRunState.progress -Name "last_heartbeat_at" -Value $Now
    }

    if (-not [string]::IsNullOrWhiteSpace($ActivitySummary)) {
        Set-ObjectProperty -Object $TaskRunState.progress -Name "last_activity_at" -Value $Now
        Set-ObjectProperty -Object $TaskRunState.progress -Name "last_activity" -Value $ActivitySummary
        Set-ObjectProperty -Object $TaskRunState.progress -Name "activity_summary" -Value $ActivitySummary
    }

    if (-not [string]::IsNullOrWhiteSpace($RunStatus)) {
        Set-ObjectProperty -Object $TaskRunState -Name "status" -Value $RunStatus
    }
    elseif ($TaskRunState.status -eq "not_started") {
        Set-ObjectProperty -Object $TaskRunState -Name "status" -Value "idle"
    }

    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value $Now
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 12
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Session Supervisor"
    Write-Host "Command: $($Result.command)"
    if (-not [string]::IsNullOrWhiteSpace($Result.task_id)) {
        Write-Host "Task: $($Result.task_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.session_id)) {
        Write-Host "Session: $($Result.session_id)"
    }
    if ($null -ne $Result.status) {
        Write-Host "Status: $($Result.status)"
    }
    if ($null -ne $Result.idle) {
        Write-Host "Idle: $($Result.idle.idle_seconds)s ($($Result.idle.idle_state))"
    }
    if ($null -ne $Result.session_path) {
        Write-Host "Path: $($Result.session_path)"
    }
    if ($null -ne $Result.session_count) {
        Write-Host "Session count: $($Result.session_count)"
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
    $workspace = Assert-Workspace -Repo $repo -TaskId $safeTaskId
    $paths = $workspace.paths
    $metadata = $workspace.metadata
    $taskRunState = $workspace.task_run_state
    $workspaceId = [string]$metadata.workspace_id

    if ($Command -eq "status") {
        $rawSessions = @(Get-ChildItem -LiteralPath $paths.sessions_dir -Filter "session-*.json" -File | Sort-Object Name | ForEach-Object {
            Read-JsonFile -Path $_.FullName
        })
        $sessions = @(Get-ChildItem -LiteralPath $paths.sessions_dir -Filter "session-*.json" -File | Sort-Object Name | ForEach-Object {
            $session = Read-JsonFile -Path $_.FullName
            $idle = Get-IdleInfo -Session $session -ThresholdMinutes $StalledAfterMinutes
            $summary = New-SessionSummary -Session $session -ThresholdMinutes $StalledAfterMinutes
            [pscustomobject]@{
                session_id = $session.session_id
                status = $session.status
                executor_type = if ($null -eq $session.executor) { $null } else { $session.executor.executor_type }
                idle = $idle
                last_heartbeat_at = $summary.last_heartbeat_at
                last_activity_at = $summary.last_activity_at
                last_activity = $summary.last_activity
                activity_summary = $summary.activity_summary
                changed_files_count = $summary.changed_files_count
                recent_changed_files = @($summary.recent_changed_files)
                latest_diff_snapshot_path = $summary.latest_diff_snapshot_path
                last_file_change_at = $summary.last_file_change_at
                idle_stalled_display_only = $true
                path = ConvertTo-RepoRelativePath -Repo $repo -Path $_.FullName
            }
        })
        $runtimeSummary = New-TaskRuntimeSummary -TaskId $safeTaskId -WorkspaceId $workspaceId -TaskRunState $taskRunState -Sessions $rawSessions -ThresholdMinutes $StalledAfterMinutes

        $specific = $null
        if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
            $safeSessionId = Get-SafeSessionId -Value $SessionId
            $specific = @($sessions | Where-Object { $_.session_id -eq $safeSessionId })
            if ($specific.Count -eq 0) {
                throw "Session does not exist for task_id ${safeTaskId}: $safeSessionId"
            }
        }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = if ($null -eq $specific) { $null } else { $specific[0].session_id }
            status = if ($null -eq $specific) { $null } else { $specific[0].status }
            idle = if ($null -eq $specific) { $null } else { $specific[0].idle }
            runtime_summary = $runtimeSummary
            session_count = $sessions.Count
            sessions = @($sessions)
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "create") {
        $safeSessionId = if ([string]::IsNullOrWhiteSpace($SessionId)) {
            New-SessionId -SessionsDir $paths.sessions_dir
        }
        else {
            Get-SafeSessionId -Value $SessionId
        }

        $sessionPath = Get-SessionPath -SessionsDir $paths.sessions_dir -SessionId $safeSessionId
        if (Test-Path -LiteralPath $sessionPath) {
            throw "Session already exists for task_id ${safeTaskId}: $safeSessionId"
        }

        $now = Get-NowText
        $session = [ordered]@{
            schema_version = 1
            task_id = $safeTaskId
            run_id = $taskRunState.run_id
            workspace_id = $workspaceId
            session_id = $safeSessionId
            status = "created"
            executor = [ordered]@{
                executor_type = $ExecutorType
                adapter_id = $null
                command_line = $null
                working_directory = $null
            }
            process = [ordered]@{
                pid = $null
                started_at = $null
                ended_at = $null
                exit_code = $null
            }
            heartbeat = [ordered]@{
                last_heartbeat_at = $null
                last_activity_at = if ([string]::IsNullOrWhiteSpace($Activity)) { $null } else { $now }
                last_activity = if ([string]::IsNullOrWhiteSpace($Activity)) { $null } else { $Activity }
                activity_summary = if ([string]::IsNullOrWhiteSpace($Activity)) { $null } else { $Activity }
                last_activity_summary = if ([string]::IsNullOrWhiteSpace($Activity)) { $null } else { $Activity }
                idle_seconds = 0
                stalled_after_minutes = $StalledAfterMinutes
            }
            outputs = [ordered]@{
                stdout_log = $null
                stderr_log = $null
                summary_path = $null
            }
            workspace = [ordered]@{
                workspace_id = $workspaceId
                workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.workspace_path
                changed_files_count = 0
            }
            handoff = [ordered]@{
                wf_204_evidence_collector = [ordered]@{
                    evidence_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.evidence_manifest_path
                    progress_event_log = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.progress_event_log_path
                    may_read_outputs = $true
                    owns_session_lifecycle = $false
                }
            }
            created_at = $now
            updated_at = $now
        }

        Save-JsonFile -Path $sessionPath -Value $session
        Update-TaskRunStateForSession -TaskRunState $taskRunState -TaskRunStatePath $paths.task_run_state_path -SessionId $safeSessionId -Now $now -CurrentStep "session_created" -ActivitySummary $Activity -RunStatus "idle"
        $eventId = Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EventType "session_created" -Message "SessionState created." -Data ([ordered]@{ status = "created"; executor_type = $ExecutorType; activity_summary = $Activity })

        $result = [pscustomobject]@{
            ok = $true
            command = "create"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeSessionId
            status = "created"
            latest_progress_event_id = $eventId
            session_path = ConvertTo-RepoRelativePath -Repo $repo -Path $sessionPath
            session = $session
        }

        Write-ObjectResult -Result $result
    }

    $safeExistingSessionId = Get-SafeSessionId -Value $SessionId
    $existingSessionPath = Get-SessionPath -SessionsDir $paths.sessions_dir -SessionId $safeExistingSessionId
    if (-not (Test-Path -LiteralPath $existingSessionPath)) {
        throw "Session does not exist for task_id ${safeTaskId}: $safeExistingSessionId"
    }

    $existingSession = Read-JsonFile -Path $existingSessionPath
    if ($existingSession.task_id -ne $safeTaskId) {
        throw "Session task_id mismatch. Expected $safeTaskId, found $($existingSession.task_id)."
    }

    if ($existingSession.workspace_id -ne $workspaceId) {
        throw "Session workspace_id mismatch. Expected $workspaceId, found $($existingSession.workspace_id)."
    }

    if ($Command -eq "read") {
        $idle = Get-IdleInfo -Session $existingSession -ThresholdMinutes $StalledAfterMinutes
        $summary = New-SessionSummary -Session $existingSession -ThresholdMinutes $StalledAfterMinutes
        $progressEvents = @(Read-ProgressEvents -Path $paths.progress_event_log_path -SessionId $safeExistingSessionId -MaxCount 10)
        $fileChangeSummary = Get-RecentFileChangeSummary -Events $progressEvents -Session $existingSession
        $sessionDetail = [pscustomobject]@{
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeExistingSessionId
            status = $existingSession.status
            executor_type = if ($null -eq $existingSession.executor) { $null } else { $existingSession.executor.executor_type }
            idle = $idle
            idle_stalled_display_only = $true
            last_heartbeat_at = $summary.last_heartbeat_at
            last_activity_at = $summary.last_activity_at
            last_activity = $summary.last_activity
            activity_summary = $summary.activity_summary
            file_change_summary = $fileChangeSummary
            changed_files_count = $fileChangeSummary.changed_files_count
            recent_changed_files = @($fileChangeSummary.recent_changed_files)
            latest_diff_snapshot_path = $fileChangeSummary.latest_diff_snapshot_path
            last_file_change_at = $fileChangeSummary.last_file_change_at
            recent_progress_events = @($progressEvents)
        }
        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeExistingSessionId
            status = $existingSession.status
            idle = $idle
            session_detail = $sessionDetail
            session_path = ConvertTo-RepoRelativePath -Repo $repo -Path $existingSessionPath
            session = $existingSession
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "update" -or $Command -eq "heartbeat") {
        $now = Get-NowText
        $oldStatus = [string]$existingSession.status

        if ($Command -eq "update" -and [string]::IsNullOrWhiteSpace($Status)) {
            throw "update requires --status."
        }

        if (-not [string]::IsNullOrWhiteSpace($Status)) {
            $statusValue = $Status.Trim()
            if (-not ($AllowedSessionStatuses -contains $statusValue)) {
                throw "Invalid session status: $statusValue"
            }
            Set-ObjectProperty -Object $existingSession -Name "status" -Value $statusValue
        }

        if ($null -eq $existingSession.heartbeat) {
            Set-ObjectProperty -Object $existingSession -Name "heartbeat" -Value ([pscustomobject]@{})
        }

        if ($Command -eq "heartbeat") {
            Set-ObjectProperty -Object $existingSession.heartbeat -Name "last_heartbeat_at" -Value $now
            Set-ObjectProperty -Object $existingSession.heartbeat -Name "idle_seconds" -Value 0
        }

        if (-not [string]::IsNullOrWhiteSpace($Activity)) {
            Set-ObjectProperty -Object $existingSession.heartbeat -Name "last_activity_at" -Value $now
            Set-ObjectProperty -Object $existingSession.heartbeat -Name "last_activity" -Value $Activity
            Set-ObjectProperty -Object $existingSession.heartbeat -Name "activity_summary" -Value $Activity
            Set-ObjectProperty -Object $existingSession.heartbeat -Name "last_activity_summary" -Value $Activity
        }

        Set-ObjectProperty -Object $existingSession -Name "updated_at" -Value $now
        Save-JsonFile -Path $existingSessionPath -Value $existingSession

        $eventType = if ($Command -eq "heartbeat") { "heartbeat" } elseif ($existingSession.status -eq "running") { "session_started" } elseif ($existingSession.status -eq "failed") { "failed" } elseif ($existingSession.status -eq "stalled") { "blocked" } else { "manual_note" }
        $message = if ($Command -eq "heartbeat") { "Session heartbeat updated." } else { "Session status updated." }
        $step = if ([string]::IsNullOrWhiteSpace($Activity)) { $message } else { $Activity }

        $runStatus = Convert-SessionStatusToRunStatus -SessionStatus ([string]$existingSession.status)
        Update-TaskRunStateForSession -TaskRunState $taskRunState -TaskRunStatePath $paths.task_run_state_path -SessionId $safeExistingSessionId -Now $now -CurrentStep $step -ActivitySummary $Activity -RunStatus $runStatus -Heartbeat:($Command -eq "heartbeat")
        $eventId = Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeExistingSessionId -EventType $eventType -Message $message -Data ([ordered]@{ old_status = $oldStatus; new_status = $existingSession.status; activity = $Activity; activity_summary = $Activity; display_only = $true })

        $idle = Get-IdleInfo -Session $existingSession -ThresholdMinutes $StalledAfterMinutes
        $summary = New-SessionSummary -Session $existingSession -ThresholdMinutes $StalledAfterMinutes
        $result = [pscustomobject]@{
            ok = $true
            command = $Command
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeExistingSessionId
            status = $existingSession.status
            idle = $idle
            latest_progress_event_id = $eventId
            last_heartbeat_at = $summary.last_heartbeat_at
            last_activity_at = $summary.last_activity_at
            last_activity = $summary.last_activity
            activity_summary = $summary.activity_summary
            changed_files_count = $summary.changed_files_count
            recent_changed_files = @($summary.recent_changed_files)
            latest_diff_snapshot_path = $summary.latest_diff_snapshot_path
            last_file_change_at = $summary.last_file_change_at
            idle_stalled_display_only = $true
            session_path = ConvertTo-RepoRelativePath -Repo $repo -Path $existingSessionPath
            session = $existingSession
        }

        Write-ObjectResult -Result $result
    }
}
catch {
    $result = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $TaskId
        session_id = $SessionId
        error = $_.Exception.Message
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
