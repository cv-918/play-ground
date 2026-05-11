param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "request", "approve", "reject", "apply", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$SessionId = "",

    [string]$ControlId = "",

    [string]$Action = "",

    [string]$Reason = "",

    [string]$Note = "",

    [string]$RequestedBy = "Human Director",

    [string]$RequestSource = "codex_app",

    [string]$TargetExecutor = "",

    [string]$TargetScope = "",

    [string]$ReplanSummary = "",

    [string]$RetryCommandId = "",

    [int]$MaxPidAgeMinutes = 1440,

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

$AllowedActions = @(
    "pause",
    "resume",
    "stop",
    "retry",
    "replan",
    "scope_reduce",
    "executor_change",
    "manual_escalation"
)

$script:NativeProcessControlLoaded = $false

function Get-NowText {
    return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

function Get-Stamp {
    return (Get-Date -Format "yyyyMMdd-HHmmss-fff")
}

function New-ShortGuid {
    return ([Guid]::NewGuid().ToString("N").Substring(0, 8))
}

function New-ControlId {
    return ("control-" + (Get-Stamp) + "-" + (New-ShortGuid))
}

function New-RecordId {
    return ("control-event-" + (Get-Stamp) + "-" + (New-ShortGuid))
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

function Save-JsonFile {
    param(
        [string]$Path,
        $Value
    )

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 14) + "`n")
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

function Get-SafeSessionIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
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

function Get-SafeControlIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^control-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid control id. Use control-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid control id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function Get-SafeAction {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Action is required."
    }

    $trimmed = $Value.Trim()
    if (-not ($AllowedActions -contains $trimmed)) {
        throw "Invalid runtime control action: $trimmed"
    }

    return $trimmed
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

function ConvertTo-ProcessArguments {
    param([string[]]$ArgumentsList)

    $parts = @()
    foreach ($arg in @($ArgumentsList)) {
        $value = [string]$arg
        if ($value -eq "") {
            $parts += '""'
        }
        elseif ($value -match '[\s"]') {
            $parts += ('"' + $value.Replace('"', '\"') + '"')
        }
        else {
            $parts += $value
        }
    }

    return ($parts -join " ")
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

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        sessions_dir = Join-Path $workspacePath "sessions"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        runtime_control_history_path = Join-Path $workspacePath "runtime_control_history.jsonl"
    }
}

function Get-SessionPath {
    param(
        [string]$SessionsDir,
        [string]$SessionId
    )

    return (Join-Path $SessionsDir ($SessionId + ".json"))
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId
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

    if (-not (Test-Path -LiteralPath $paths.sessions_dir)) {
        New-Item -ItemType Directory -Path $paths.sessions_dir -Force | Out-Null
    }

    if (-not (Test-Path -LiteralPath $paths.runtime_control_history_path)) {
        Write-Utf8Text -Path $paths.runtime_control_history_path -Text ""
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

function Read-SessionOrNull {
    param(
        [string]$SessionsDir,
        [string]$SessionId
    )

    if ([string]::IsNullOrWhiteSpace($SessionId)) {
        return $null
    }

    $path = Get-SessionPath -SessionsDir $SessionsDir -SessionId $SessionId
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Session does not exist: $SessionId"
    }

    return (Read-JsonFile -Path $path)
}

function Read-ControlHistory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    $records = @()
    foreach ($line in [System.IO.File]::ReadLines($Path, [System.Text.Encoding]::UTF8)) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            $records += ($line | ConvertFrom-Json)
        }
        catch {
            throw "RuntimeControlHistory contains invalid JSON."
        }
    }

    return @($records)
}

function Get-ControlProjection {
    param($Records)

    $latest = @{}
    foreach ($record in @($Records)) {
        $latest[[string]$record.control_id] = $record
    }

    return @($latest.Values | Sort-Object created_at, control_id, record_id)
}

function Find-Control {
    param(
        $Records,
        [string]$ControlId
    )

    $matches = @($Records | Where-Object { $_.control_id -eq $ControlId })
    if ($matches.Count -eq 0) {
        throw "Control id not found: $ControlId"
    }

    return ($matches | Select-Object -Last 1)
}

function Append-ControlRecord {
    param(
        [string]$Path,
        $Record
    )

    Append-Utf8Line -Path $Path -Text ($Record | ConvertTo-Json -Compress -Depth 12)
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$SessionId,
        [string]$Message,
        $Data
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = if ([string]::IsNullOrWhiteSpace($SessionId)) { $null } else { $SessionId }
        event_type = "manual_note"
        severity = "info"
        message = $Message
        source = "runtime_control_adapter"
        data = $Data
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 10)
    return $event.event_id
}

function Invoke-SessionSupervisorUpdate {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$Status,
        [string]$Activity,
        [string]$ProcessEndedAt = "",
        [string]$ProcessExitCode = ""
    )

    if ([string]::IsNullOrWhiteSpace($SessionId)) {
        return $null
    }

    $script = Join-Path $PSScriptRoot "session_supervisor.ps1"
    $args = @(
        "-RepoRoot", $Repo,
        "-Command", "update",
        "-TaskId", $TaskId,
        "-SessionId", $SessionId,
        "-Status", $Status,
        "-Activity", $Activity,
        "-Json"
    )

    if (-not [string]::IsNullOrWhiteSpace($ProcessEndedAt)) {
        $args += @("-ProcessEndedAt", $ProcessEndedAt)
    }
    if (-not [string]::IsNullOrWhiteSpace($ProcessExitCode)) {
        $args += @("-ProcessExitCode", $ProcessExitCode)
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell"
    $psi.WorkingDirectory = $Repo
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" " + (ConvertTo-ProcessArguments -ArgumentsList $args)

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($process.ExitCode -ne 0) {
        throw "Session Supervisor update failed: $stdout $stderr"
    }

    return ($stdout | ConvertFrom-Json)
}

function Update-TaskRunControlState {
    param(
        $TaskRunState,
        [string]$TaskRunStatePath,
        $Control,
        [string]$StatusNote,
        [bool]$PendingHumanDecision
    )

    if ($null -eq $TaskRunState.control) {
        Set-ObjectProperty -Object $TaskRunState -Name "control" -Value ([pscustomobject]@{})
    }

    Set-ObjectProperty -Object $TaskRunState.control -Name "latest_control_id" -Value $Control.control_id
    Set-ObjectProperty -Object $TaskRunState.control -Name "latest_action" -Value $Control.action
    Set-ObjectProperty -Object $TaskRunState.control -Name "latest_decision" -Value $Control.decision
    Set-ObjectProperty -Object $TaskRunState.control -Name "latest_applied" -Value ([bool]$Control.applied)
    Set-ObjectProperty -Object $TaskRunState.control -Name "latest_note" -Value $StatusNote
    Set-ObjectProperty -Object $TaskRunState.control -Name "pending_human_decision" -Value $(if ($PendingHumanDecision) { $Control.control_id } else { $null })
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)

    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Test-ProcessIsFreshEnough {
    param(
        $Session,
        [int]$MaxMinutes
    )

    $startedAt = Get-ObjectPropertyValue -Object $Session.process -Name "started_at"
    if ([string]::IsNullOrWhiteSpace($startedAt)) {
        return $false
    }

    try {
        $started = [DateTimeOffset]::Parse([string]$startedAt)
    }
    catch {
        return $false
    }

    return ([DateTimeOffset]::Now.Subtract($started).TotalMinutes -le $MaxMinutes)
}

function Ensure-NativeProcessControl {
    if ($script:NativeProcessControlLoaded) {
        return
    }

    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class NativeProcessControl {
    [DllImport("ntdll.dll")]
    public static extern int NtSuspendProcess(IntPtr processHandle);

    [DllImport("ntdll.dll")]
    public static extern int NtResumeProcess(IntPtr processHandle);
}
"@
    $script:NativeProcessControlLoaded = $true
}

function Invoke-RecordedProcessSuspend {
    param([int]$TargetPid)

    if ($TargetPid -eq $PID) {
        throw "Refusing to suspend the current Runtime Control process."
    }

    Ensure-NativeProcessControl
    $process = Get-Process -Id $TargetPid -ErrorAction Stop
    $code = [NativeProcessControl]::NtSuspendProcess($process.Handle)
    if ($code -ne 0) {
        throw "NtSuspendProcess failed with status code $code."
    }
}

function Invoke-RecordedProcessResume {
    param([int]$TargetPid)

    if ($TargetPid -eq $PID) {
        throw "Refusing to resume the current Runtime Control process."
    }

    Ensure-NativeProcessControl
    $process = Get-Process -Id $TargetPid -ErrorAction Stop
    $code = [NativeProcessControl]::NtResumeProcess($process.Handle)
    if ($code -ne 0) {
        throw "NtResumeProcess failed with status code $code."
    }
}

function Get-SessionProcessControlPid {
    param(
        $Session,
        [int]$MaxMinutes
    )

    if ($null -eq $Session -or $null -eq $Session.process) {
        return $null
    }

    $pidValue = Get-ObjectPropertyValue -Object $Session.process -Name "pid"
    $endedAt = Get-ObjectPropertyValue -Object $Session.process -Name "ended_at"
    if ($null -eq $pidValue -or -not [string]::IsNullOrWhiteSpace([string]$endedAt)) {
        return $null
    }

    if (-not (Test-ProcessIsFreshEnough -Session $Session -MaxMinutes $MaxMinutes)) {
        return $null
    }

    return ([int]$pidValue)
}

function Apply-ControlAction {
    param(
        [string]$Repo,
        $Runtime,
        $Control
    )

    $sessionId = if ($null -eq $Control.session_id) { "" } else { [string]$Control.session_id }
    $session = Read-SessionOrNull -SessionsDir $Runtime.paths.sessions_dir -SessionId $sessionId
    $now = Get-NowText
    $action = [string]$Control.action
    $result = [ordered]@{
        action = $action
        session_id = if ([string]::IsNullOrWhiteSpace($sessionId)) { $null } else { $sessionId }
        process_stop_attempted = $false
        process_stop_succeeded = $false
        process_pause_attempted = $false
        process_pause_succeeded = $false
        process_resume_attempted = $false
        process_resume_succeeded = $false
        status_update = $null
        handoff_only = $false
        message = ""
    }

    switch ($action) {
        "pause" {
            $targetPid = Get-SessionProcessControlPid -Session $session -MaxMinutes $MaxPidAgeMinutes
            if ($null -ne $targetPid) {
                $result.process_pause_attempted = $true
                try {
                    Invoke-RecordedProcessSuspend -TargetPid $targetPid
                    $result.process_pause_succeeded = $true
                }
                catch {
                    $result.message = "Process suspend failed: $($_.Exception.Message)"
                }
            }
            Invoke-SessionSupervisorUpdate -Repo $Repo -TaskId $Runtime.task_run_state.task_id -SessionId $sessionId -Status "paused" -Activity "Runtime control pause applied." | Out-Null
            $result.status_update = "paused"
            if ([string]::IsNullOrWhiteSpace($result.message)) {
                if ($result.process_pause_succeeded) {
                    $result.message = "Session process suspended and session marked paused."
                }
                else {
                    $result.message = "No fresh recorded session PID was available; session state marked paused."
                }
            }
        }
        "resume" {
            $resumeStatus = "waiting"
            $targetPid = Get-SessionProcessControlPid -Session $session -MaxMinutes $MaxPidAgeMinutes
            if ($null -ne $targetPid) {
                $result.process_resume_attempted = $true
                try {
                    Invoke-RecordedProcessResume -TargetPid $targetPid
                    $result.process_resume_succeeded = $true
                    $existing = Get-Process -Id $targetPid -ErrorAction Stop
                    if ($null -ne $existing) {
                        $resumeStatus = "running"
                    }
                }
                catch {
                    $result.message = "Process resume failed: $($_.Exception.Message)"
                }
            }
            Invoke-SessionSupervisorUpdate -Repo $Repo -TaskId $Runtime.task_run_state.task_id -SessionId $sessionId -Status $resumeStatus -Activity "Runtime control resume applied." | Out-Null
            $result.status_update = $resumeStatus
            if ([string]::IsNullOrWhiteSpace($result.message)) {
                if ($result.process_resume_succeeded) {
                    $result.message = "Session process resumed and session state updated."
                }
                else {
                    $result.message = "No fresh recorded session PID was available; session resume state applied."
                }
            }
        }
        "stop" {
            if ($null -eq $session) {
                throw "stop requires a session_id."
            }

            $activeStatuses = @("starting", "running", "waiting", "paused", "stopping")
            if (-not ($activeStatuses -contains [string]$session.status)) {
                Invoke-SessionSupervisorUpdate -Repo $Repo -TaskId $Runtime.task_run_state.task_id -SessionId $sessionId -Status "cancelled" -Activity "Runtime control stop applied to non-active session state." -ProcessEndedAt $now -ProcessExitCode "-1" | Out-Null
                $result.status_update = "cancelled"
                $result.message = "Session was not active; state marked cancelled without process stop."
                break
            }

            $targetPid = Get-SessionProcessControlPid -Session $session -MaxMinutes $MaxPidAgeMinutes
            if ($null -ne $targetPid) {
                $result.process_stop_attempted = $true
                try {
                    if ($targetPid -eq $PID) {
                        throw "Refusing to stop the current Runtime Control process."
                    }
                    $target = Get-Process -Id $targetPid -ErrorAction Stop
                    if ($null -ne $target) {
                        Stop-Process -Id $targetPid -Force -ErrorAction Stop
                        $result.process_stop_succeeded = $true
                    }
                }
                catch {
                    $result.process_stop_succeeded = $false
                    $result.message = "Process stop failed or process was already gone: $($_.Exception.Message)"
                }
            }
            else {
                $result.message = "No fresh recorded session PID was available; no process stop was attempted."
            }

            Invoke-SessionSupervisorUpdate -Repo $Repo -TaskId $Runtime.task_run_state.task_id -SessionId $sessionId -Status "cancelled" -Activity "Runtime control stop applied." -ProcessEndedAt $now -ProcessExitCode "-1" | Out-Null
            $result.status_update = "cancelled"
            if ([string]::IsNullOrWhiteSpace($result.message)) {
                $result.message = "Stop applied to the session."
            }
        }
        "retry" {
            $result.handoff_only = $true
            $result.message = "Retry control recorded for the PC Runner/executor adapter handoff."
        }
        "replan" {
            $result.handoff_only = $true
            $result.message = "Replan control recorded for planning handoff."
        }
        "scope_reduce" {
            $result.handoff_only = $true
            $result.message = "Scope reduction control recorded for planning handoff."
        }
        "executor_change" {
            $result.handoff_only = $true
            $result.message = "Executor change control recorded for routing handoff."
        }
        "manual_escalation" {
            $result.handoff_only = $true
            $result.message = "Manual escalation control recorded."
        }
        default {
            throw "Unsupported control action: $action"
        }
    }

    return [pscustomobject]$result
}

function New-ControlRecord {
    param(
        [string]$ControlId,
        [string]$TaskId,
        [string]$RunId,
        [string]$SessionId,
        [string]$Action,
        [string]$RequestedBy,
        [string]$RequestSource,
        [string]$Reason,
        [string]$Decision,
        [bool]$Applied,
        [bool]$RequiresHumanApproval,
        [string]$Note,
        $Data,
        [string]$DecidedAt = "",
        [string]$AppliedAt = ""
    )

    return [ordered]@{
        schema_version = 1
        record_id = New-RecordId
        control_id = $ControlId
        task_id = $TaskId
        run_id = $RunId
        session_id = if ([string]::IsNullOrWhiteSpace($SessionId)) { $null } else { $SessionId }
        action = $Action
        requested_by = $RequestedBy
        request_source = $RequestSource
        reason = $Reason
        decision = $Decision
        applied = $Applied
        requires_human_approval = $RequiresHumanApproval
        note = $Note
        data = $Data
        created_at = Get-NowText
        decided_at = if ([string]::IsNullOrWhiteSpace($DecidedAt)) { $null } else { $DecidedAt }
        applied_at = if ([string]::IsNullOrWhiteSpace($AppliedAt)) { $null } else { $AppliedAt }
    }
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 14
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Runtime Control Adapter"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.control_id)) {
        Write-Host "Control: $($Result.control_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.action)) {
        Write-Host "Action: $($Result.action)"
    }
    if ($null -ne $Result.decision) {
        Write-Host "Decision: $($Result.decision)"
    }
    if ($null -ne $Result.applied) {
        Write-Host "Applied: $($Result.applied)"
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
    $safeSessionId = Get-SafeSessionIdOrEmpty -Value $SessionId
    $safeControlId = Get-SafeControlIdOrEmpty -Value $ControlId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId
    $historyPath = $runtime.paths.runtime_control_history_path
    $records = @(Read-ControlHistory -Path $historyPath)
    $projection = @(Get-ControlProjection -Records $records)

    if ($Command -eq "status") {
        $pending = @($projection | Where-Object { $_.decision -eq "pending" })
        $latest = @($projection | Sort-Object @{ Expression = "created_at"; Descending = $true }, @{ Expression = "control_id"; Descending = $true }, @{ Expression = "record_id"; Descending = $true } | Select-Object -First 1)
        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            session_id = if ([string]::IsNullOrWhiteSpace($safeSessionId)) { $null } else { $safeSessionId }
            history_path = ConvertTo-RepoRelativePath -Repo $repo -Path $historyPath
            control_count = $projection.Count
            pending_count = $pending.Count
            pending_controls = @($pending)
            latest_control = if ($latest.Count -eq 0) { $null } else { $latest[0] }
            task_run_control = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "control"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        if (-not [string]::IsNullOrWhiteSpace($safeControlId)) {
            $control = Find-Control -Records $records -ControlId $safeControlId
            $selected = @($control)
        }
        else {
            $selected = @($projection)
        }

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            control_id = if ([string]::IsNullOrWhiteSpace($safeControlId)) { $null } else { $safeControlId }
            controls = @($selected)
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "request") {
        $safeAction = Get-SafeAction -Value $Action
        if ([string]::IsNullOrWhiteSpace($Reason)) {
            throw "request requires --reason."
        }

        if ($safeAction -in @("pause", "resume", "stop") -and [string]::IsNullOrWhiteSpace($safeSessionId)) {
            throw "$safeAction requires session_id."
        }

        $controlId = if ([string]::IsNullOrWhiteSpace($safeControlId)) { New-ControlId } else { $safeControlId }
        $data = [ordered]@{
            target_executor = if ([string]::IsNullOrWhiteSpace($TargetExecutor)) { $null } else { $TargetExecutor }
            target_scope = if ([string]::IsNullOrWhiteSpace($TargetScope)) { $null } else { $TargetScope }
            replan_summary = if ([string]::IsNullOrWhiteSpace($ReplanSummary)) { $null } else { $ReplanSummary }
            retry_command_id = if ([string]::IsNullOrWhiteSpace($RetryCommandId)) { $null } else { $RetryCommandId }
        }
        $record = New-ControlRecord -ControlId $controlId -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId $safeSessionId -Action $safeAction -RequestedBy $RequestedBy -RequestSource $RequestSource -Reason $Reason -Decision "pending" -Applied:$false -RequiresHumanApproval:$true -Note $Note -Data $data
        Append-ControlRecord -Path $historyPath -Record $record
        Update-TaskRunControlState -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Control $record -StatusNote "Runtime control request pending approval." -PendingHumanDecision:$true
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId $safeSessionId -Message "Runtime control requested." -Data ([ordered]@{ control_id = $controlId; action = $safeAction; decision = "pending"; applied = $false })

        $result = [pscustomobject]@{
            ok = $true
            command = "request"
            task_id = $safeTaskId
            control_id = $controlId
            action = $safeAction
            decision = "pending"
            applied = $false
            requires_human_approval = $true
            latest_progress_event_id = $eventId
            control = $record
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "approve" -or $Command -eq "reject") {
        if ([string]::IsNullOrWhiteSpace($safeControlId)) {
            throw "$Command requires control_id."
        }

        $existing = Find-Control -Records $records -ControlId $safeControlId
        if ($existing.applied -eq $true) {
            throw "Control already applied: $safeControlId"
        }

        $decision = if ($Command -eq "approve") { "approved" } else { "rejected" }
        $record = New-ControlRecord -ControlId $existing.control_id -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId ([string]$existing.session_id) -Action ([string]$existing.action) -RequestedBy ([string]$existing.requested_by) -RequestSource ([string]$existing.request_source) -Reason ([string]$existing.reason) -Decision $decision -Applied:$false -RequiresHumanApproval ([bool]$existing.requires_human_approval) -Note $Note -Data $existing.data -DecidedAt (Get-NowText)
        Append-ControlRecord -Path $historyPath -Record $record
        Update-TaskRunControlState -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Control $record -StatusNote "Runtime control $decision." -PendingHumanDecision:$false
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId ([string]$existing.session_id) -Message "Runtime control $decision." -Data ([ordered]@{ control_id = $existing.control_id; action = $existing.action; decision = $decision; applied = $false })

        $result = [pscustomobject]@{
            ok = $true
            command = $Command
            task_id = $safeTaskId
            control_id = $existing.control_id
            action = $existing.action
            decision = $decision
            applied = $false
            latest_progress_event_id = $eventId
            control = $record
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "apply") {
        if ([string]::IsNullOrWhiteSpace($safeControlId)) {
            throw "apply requires control_id."
        }

        $existing = Find-Control -Records $records -ControlId $safeControlId
        if ($existing.applied -eq $true) {
            Update-TaskRunControlState -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Control $existing -StatusNote "Runtime control projection resynchronized from applied history." -PendingHumanDecision:$false
            $result = [pscustomobject]@{
                ok = $true
                command = "apply"
                task_id = $safeTaskId
                control_id = $existing.control_id
                action = $existing.action
                decision = $existing.decision
                applied = $true
                resynchronized = $true
                apply_result = Get-ObjectPropertyValue -Object $existing.data -Name "apply_result"
                control = $existing
                task_lifecycle_unchanged = $true
            }

            Write-ObjectResult -Result $result
        }
        if ($existing.decision -ne "approved") {
            throw "Control must be approved before apply. Current decision: $($existing.decision)"
        }

        $applyResult = Apply-ControlAction -Repo $repo -Runtime $runtime -Control $existing
        $record = New-ControlRecord -ControlId $existing.control_id -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId ([string]$existing.session_id) -Action ([string]$existing.action) -RequestedBy ([string]$existing.requested_by) -RequestSource ([string]$existing.request_source) -Reason ([string]$existing.reason) -Decision "approved" -Applied:$true -RequiresHumanApproval ([bool]$existing.requires_human_approval) -Note $Note -Data ([ordered]@{ request_data = $existing.data; apply_result = $applyResult }) -DecidedAt ([string]$existing.decided_at) -AppliedAt (Get-NowText)
        Append-ControlRecord -Path $historyPath -Record $record
        Update-TaskRunControlState -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Control $record -StatusNote ([string]$applyResult.message) -PendingHumanDecision:$false
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId ([string]$existing.session_id) -Message "Runtime control applied." -Data ([ordered]@{ control_id = $existing.control_id; action = $existing.action; decision = "approved"; applied = $true; apply_result = $applyResult })

        $result = [pscustomobject]@{
            ok = $true
            command = "apply"
            task_id = $safeTaskId
            control_id = $existing.control_id
            action = $existing.action
            decision = "approved"
            applied = $true
            apply_result = $applyResult
            latest_progress_event_id = $eventId
            control = $record
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
        session_id = $SessionId
        control_id = $ControlId
        action = $Action
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
