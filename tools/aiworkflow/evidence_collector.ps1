param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("create", "read", "update", "status")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$SessionId = "",

    [string]$EvidenceId = "",

    [string]$Executor = "",

    [string]$CommandLine = "",

    [string]$WorkingDirectory = "",

    [string]$StartedAt = "",

    [string]$EndedAt = "",

    [string]$ExitCode = "",

    [string]$StdoutLog = "",

    [string]$StderrLog = "",

    [string]$ChangedFiles = "",

    [string]$DiffSnapshotPath = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

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

function Read-JsonFileOrNull {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
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

function Get-SafeEvidenceId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Evidence id is required for this command."
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^evidence-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid evidence id. Use evidence-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid evidence id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function New-EvidenceId {
    param([string]$RecordsDir)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    for ($i = 1; $i -le 999; $i++) {
        $candidate = ("evidence-{0}-{1:D3}" -f $stamp, $i)
        $path = Join-Path $RecordsDir ($candidate + ".json")
        if (-not (Test-Path -LiteralPath $path)) {
            return $candidate
        }
    }

    throw "Unable to allocate a unique evidence_id for timestamp $stamp."
}

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        sessions_dir = Join-Path $workspacePath "sessions"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        evidence_dir = $evidenceDir
        records_dir = Join-Path $evidenceDir "records"
        logs_dir = Join-Path $evidenceDir "logs"
        diffs_dir = Join-Path $evidenceDir "diffs"
        reports_dir = Join-Path $evidenceDir "reports"
        manifest_path = Join-Path $evidenceDir "manifest.json"
    }
}

function Get-SessionPath {
    param(
        [string]$SessionsDir,
        [string]$SessionId
    )

    return (Join-Path $SessionsDir ($SessionId + ".json"))
}

function Get-EvidencePath {
    param(
        [string]$RecordsDir,
        [string]$EvidenceId
    )

    return (Join-Path $RecordsDir ($EvidenceId + ".json"))
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

function Split-ChangedFiles {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }

    $items = @()
    foreach ($part in ($Value -split "[;,]")) {
        $trimmed = ([string]$part).Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) {
            continue
        }

        if ($trimmed.Contains("..") -or $trimmed -match "^[A-Za-z]:|^\\\\") {
            throw "Changed file paths must be repository-relative and must not contain parent traversal."
        }

        $items += ($trimmed -replace "\\", "/")
    }

    return @($items)
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId
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

    if ([string]::IsNullOrWhiteSpace($metadata.workspace_id)) {
        throw "Workspace metadata is missing workspace_id."
    }

    if ($taskRunState.task_id -ne $TaskId) {
        throw "TaskRunState task_id mismatch. Expected $TaskId, found $($taskRunState.task_id)."
    }

    $sessionPath = Get-SessionPath -SessionsDir $paths.sessions_dir -SessionId $SessionId
    $session = Read-JsonFile -Path $sessionPath

    if ($session.task_id -ne $TaskId) {
        throw "Session task_id mismatch. Expected $TaskId, found $($session.task_id)."
    }

    if ($session.session_id -ne $SessionId) {
        throw "Session id mismatch. Expected $SessionId, found $($session.session_id)."
    }

    if ($session.workspace_id -ne $metadata.workspace_id) {
        throw "Session workspace_id mismatch. Expected $($metadata.workspace_id), found $($session.workspace_id)."
    }

    foreach ($dir in @($paths.evidence_dir, $paths.records_dir, $paths.logs_dir, $paths.diffs_dir, $paths.reports_dir)) {
        if (-not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    if (-not (Test-Path -LiteralPath $paths.progress_event_log_path)) {
        Write-Utf8Text -Path $paths.progress_event_log_path -Text ""
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
        session = $session
        session_path = $sessionPath
    }
}

function Read-Manifest {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$WorkspaceId
    )

    $manifest = Read-JsonFileOrNull -Path $Path
    if ($null -ne $manifest) {
        return $manifest
    }

    return [pscustomobject]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        evidence_ids = @()
        latest_evidence_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-Manifest {
    param(
        $Manifest,
        [string]$Path,
        [string]$EvidenceId,
        [string]$Now
    )

    $ids = @()
    if ($null -ne $Manifest.evidence_ids) {
        $ids = @($Manifest.evidence_ids)
    }

    if (-not ($ids -contains $EvidenceId)) {
        $ids += $EvidenceId
    }

    Set-ObjectProperty -Object $Manifest -Name "evidence_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_evidence_id" -Value $EvidenceId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value $Now
    Save-JsonFile -Path $Path -Value $Manifest
}

function Update-SessionOutputs {
    param(
        $Session,
        [string]$SessionPath,
        [string]$StdoutLog,
        [string]$StderrLog,
        [string]$Now
    )

    if ($null -eq $Session.outputs) {
        Set-ObjectProperty -Object $Session -Name "outputs" -Value ([pscustomobject]@{})
    }

    if (-not [string]::IsNullOrWhiteSpace($StdoutLog)) {
        Set-ObjectProperty -Object $Session.outputs -Name "stdout_log" -Value $StdoutLog
    }

    if (-not [string]::IsNullOrWhiteSpace($StderrLog)) {
        Set-ObjectProperty -Object $Session.outputs -Name "stderr_log" -Value $StderrLog
    }

    Set-ObjectProperty -Object $Session -Name "updated_at" -Value $Now
    Save-JsonFile -Path $SessionPath -Value $Session
}

function Update-TaskRunEvidence {
    param(
        $TaskRunState,
        [string]$TaskRunStatePath,
        [string]$ManifestPath,
        [string]$Now
    )

    if ($null -eq $TaskRunState.evidence) {
        Set-ObjectProperty -Object $TaskRunState -Name "evidence" -Value ([pscustomobject]@{})
    }

    Set-ObjectProperty -Object $TaskRunState.evidence -Name "manifest_path" -Value $ManifestPath
    Set-ObjectProperty -Object $TaskRunState.evidence -Name "collector_status" -Value "recorded"
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value $Now
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$SessionId,
        [string]$EvidenceId,
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
        source = "evidence_collector"
        data = [ordered]@{
            evidence_id = $EvidenceId
            details = $Data
        }
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 10)
}

function Add-DiffSnapshotReference {
    param(
        $Evidence,
        [string]$Repo,
        [string]$Path,
        [string]$Now
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $relative = ConvertTo-RepoRelativePath -Repo $Repo -Path $Path
    $snapshots = @()
    if ($null -ne $Evidence.git_diff_snapshots) {
        $snapshots = @($Evidence.git_diff_snapshots)
    }

    $snapshots += [pscustomobject]@{
        snapshot_id = "diff-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff") + "-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8))
        path = $relative
        capture_mode = "reference"
        captured_at = $Now
    }

    Set-ObjectProperty -Object $Evidence -Name "git_diff_snapshots" -Value @($snapshots)
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
    Write-Host "AIWorkflow Evidence Collector"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    Write-Host "Session: $($Result.session_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.evidence_id)) {
        Write-Host "Evidence: $($Result.evidence_id)"
    }
    if ($null -ne $Result.status) {
        Write-Host "Status: $($Result.status)"
    }
    if ($null -ne $Result.evidence_count) {
        Write-Host "Evidence count: $($Result.evidence_count)"
    }
    if ($null -ne $Result.evidence_path) {
        Write-Host "Path: $($Result.evidence_path)"
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
    $safeSessionId = Get-SafeSessionId -Value $SessionId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -SessionId $safeSessionId
    $paths = $runtime.paths
    $metadata = $runtime.metadata
    $taskRunState = $runtime.task_run_state
    $session = $runtime.session
    $workspaceId = [string]$metadata.workspace_id

    if ($Command -eq "status") {
        $records = @(Get-ChildItem -LiteralPath $paths.records_dir -Filter "evidence-*.json" -File | Sort-Object Name | ForEach-Object {
            $record = Read-JsonFile -Path $_.FullName
            if ($record.task_id -eq $safeTaskId -and $record.session_id -eq $safeSessionId) {
                [pscustomobject]@{
                    evidence_id = $record.evidence_id
                    status = $record.status
                    executor = $record.executor
                    path = ConvertTo-RepoRelativePath -Repo $repo -Path $_.FullName
                    updated_at = $record.updated_at
                }
            }
        } | Where-Object { $null -ne $_ })

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeSessionId
            evidence_count = $records.Count
            evidence = @($records)
            manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.manifest_path
        }

        Write-ObjectResult -Result $result
    }

    $safeEvidenceId = if ($Command -eq "create" -and [string]::IsNullOrWhiteSpace($EvidenceId)) {
        New-EvidenceId -RecordsDir $paths.records_dir
    }
    else {
        Get-SafeEvidenceId -Value $EvidenceId
    }

    $evidencePath = Get-EvidencePath -RecordsDir $paths.records_dir -EvidenceId $safeEvidenceId

    if ($Command -eq "create") {
        if (Test-Path -LiteralPath $evidencePath) {
            throw "Evidence record already exists for session_id ${safeSessionId}: $safeEvidenceId"
        }

        $now = Get-NowText
        $stdoutRef = ConvertTo-RepoRelativePath -Repo $repo -Path $StdoutLog
        $stderrRef = ConvertTo-RepoRelativePath -Repo $repo -Path $StderrLog
        $changed = Split-ChangedFiles -Value $ChangedFiles

        $evidence = [pscustomobject][ordered]@{
            schema_version = 1
            task_id = $safeTaskId
            run_id = $taskRunState.run_id
            workspace_id = $workspaceId
            session_id = $safeSessionId
            evidence_id = $safeEvidenceId
            status = "created"
            executor = if ([string]::IsNullOrWhiteSpace($Executor)) { $session.executor.executor_type } else { $Executor }
            execution = [ordered]@{
                command = if ([string]::IsNullOrWhiteSpace($CommandLine)) { $null } else { $CommandLine }
                working_directory = ConvertTo-RepoRelativePath -Repo $repo -Path $WorkingDirectory
                started_at = if ([string]::IsNullOrWhiteSpace($StartedAt)) { $null } else { $StartedAt }
                ended_at = if ([string]::IsNullOrWhiteSpace($EndedAt)) { $null } else { $EndedAt }
                exit_code = if ([string]::IsNullOrWhiteSpace($ExitCode)) { $null } else { [int]$ExitCode }
            }
            logs = [ordered]@{
                stdout_log = $stdoutRef
                stderr_log = $stderrRef
            }
            changed_files = @($changed)
            git_diff_snapshots = @()
            judgment = [ordered]@{
                pass_fail = $null
                verdict = $null
                note = "WF-204 records evidence only and does not judge pass/fail."
            }
            handoff = [ordered]@{
                wf_205_codex_cli_execution_adapter = [ordered]@{
                    may_write_evidence_record = $true
                    may_write_stdout_stderr_paths = $true
                    may_write_exit_code = $true
                    must_not_set_pass_fail = $true
                }
            }
            created_at = $now
            updated_at = $now
        }

        Add-DiffSnapshotReference -Evidence $evidence -Repo $repo -Path $DiffSnapshotPath -Now $now
        Save-JsonFile -Path $evidencePath -Value $evidence

        $manifest = Read-Manifest -Path $paths.manifest_path -TaskId $safeTaskId -WorkspaceId $workspaceId
        Save-Manifest -Manifest $manifest -Path $paths.manifest_path -EvidenceId $safeEvidenceId -Now $now
        Update-SessionOutputs -Session $session -SessionPath $runtime.session_path -StdoutLog $stdoutRef -StderrLog $stderrRef -Now $now
        Update-TaskRunEvidence -TaskRunState $taskRunState -TaskRunStatePath $paths.task_run_state_path -ManifestPath (ConvertTo-RepoRelativePath -Repo $repo -Path $paths.manifest_path) -Now $now

        if ($changed.Count -gt 0) {
            Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EvidenceId $safeEvidenceId -EventType "file_change_detected" -Message "Changed file references recorded." -Data ([ordered]@{ changed_files = @($changed) })
        }
        if (-not [string]::IsNullOrWhiteSpace($DiffSnapshotPath)) {
            Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EvidenceId $safeEvidenceId -EventType "diff_snapshot_created" -Message "Git diff snapshot reference recorded." -Data ([ordered]@{ diff_snapshot_path = ConvertTo-RepoRelativePath -Repo $repo -Path $DiffSnapshotPath })
        }
        Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EvidenceId $safeEvidenceId -EventType "evidence_collected" -Message "Evidence record created." -Data ([ordered]@{ evidence_id = $safeEvidenceId })

        $result = [pscustomobject]@{
            ok = $true
            command = "create"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeSessionId
            evidence_id = $safeEvidenceId
            status = "created"
            evidence_path = ConvertTo-RepoRelativePath -Repo $repo -Path $evidencePath
            manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.manifest_path
            evidence = $evidence
        }

        Write-ObjectResult -Result $result
    }

    if (-not (Test-Path -LiteralPath $evidencePath)) {
        throw "Evidence record does not exist for session_id ${safeSessionId}: $safeEvidenceId"
    }

    $existing = Read-JsonFile -Path $evidencePath
    if ($existing.task_id -ne $safeTaskId) {
        throw "Evidence task_id mismatch. Expected $safeTaskId, found $($existing.task_id)."
    }
    if ($existing.session_id -ne $safeSessionId) {
        throw "Evidence session_id mismatch. Expected $safeSessionId, found $($existing.session_id)."
    }
    if ($existing.workspace_id -ne $workspaceId) {
        throw "Evidence workspace_id mismatch. Expected $workspaceId, found $($existing.workspace_id)."
    }

    if ($Command -eq "read") {
        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeSessionId
            evidence_id = $safeEvidenceId
            status = $existing.status
            evidence_path = ConvertTo-RepoRelativePath -Repo $repo -Path $evidencePath
            evidence = $existing
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "update") {
        $now = Get-NowText

        if (-not [string]::IsNullOrWhiteSpace($Executor)) {
            Set-ObjectProperty -Object $existing -Name "executor" -Value $Executor
        }

        if ($null -eq $existing.execution) {
            Set-ObjectProperty -Object $existing -Name "execution" -Value ([pscustomobject]@{})
        }

        if (-not [string]::IsNullOrWhiteSpace($CommandLine)) {
            Set-ObjectProperty -Object $existing.execution -Name "command" -Value $CommandLine
        }
        if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
            Set-ObjectProperty -Object $existing.execution -Name "working_directory" -Value (ConvertTo-RepoRelativePath -Repo $repo -Path $WorkingDirectory)
        }
        if (-not [string]::IsNullOrWhiteSpace($StartedAt)) {
            Set-ObjectProperty -Object $existing.execution -Name "started_at" -Value $StartedAt
        }
        if (-not [string]::IsNullOrWhiteSpace($EndedAt)) {
            Set-ObjectProperty -Object $existing.execution -Name "ended_at" -Value $EndedAt
        }
        if (-not [string]::IsNullOrWhiteSpace($ExitCode)) {
            Set-ObjectProperty -Object $existing.execution -Name "exit_code" -Value ([int]$ExitCode)
        }

        if ($null -eq $existing.logs) {
            Set-ObjectProperty -Object $existing -Name "logs" -Value ([pscustomobject]@{})
        }

        $stdoutRef = ConvertTo-RepoRelativePath -Repo $repo -Path $StdoutLog
        $stderrRef = ConvertTo-RepoRelativePath -Repo $repo -Path $StderrLog

        if (-not [string]::IsNullOrWhiteSpace($stdoutRef)) {
            Set-ObjectProperty -Object $existing.logs -Name "stdout_log" -Value $stdoutRef
        }
        if (-not [string]::IsNullOrWhiteSpace($stderrRef)) {
            Set-ObjectProperty -Object $existing.logs -Name "stderr_log" -Value $stderrRef
        }

        $changed = Split-ChangedFiles -Value $ChangedFiles
        if ($changed.Count -gt 0) {
            Set-ObjectProperty -Object $existing -Name "changed_files" -Value @($changed)
        }

        Add-DiffSnapshotReference -Evidence $existing -Repo $repo -Path $DiffSnapshotPath -Now $now
        Set-ObjectProperty -Object $existing -Name "status" -Value "updated"
        Set-ObjectProperty -Object $existing -Name "updated_at" -Value $now
        Save-JsonFile -Path $evidencePath -Value $existing

        $manifest = Read-Manifest -Path $paths.manifest_path -TaskId $safeTaskId -WorkspaceId $workspaceId
        Save-Manifest -Manifest $manifest -Path $paths.manifest_path -EvidenceId $safeEvidenceId -Now $now
        Update-SessionOutputs -Session $session -SessionPath $runtime.session_path -StdoutLog $stdoutRef -StderrLog $stderrRef -Now $now
        Update-TaskRunEvidence -TaskRunState $taskRunState -TaskRunStatePath $paths.task_run_state_path -ManifestPath (ConvertTo-RepoRelativePath -Repo $repo -Path $paths.manifest_path) -Now $now

        if ($changed.Count -gt 0) {
            Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EvidenceId $safeEvidenceId -EventType "file_change_detected" -Message "Changed file references updated." -Data ([ordered]@{ changed_files = @($changed) })
        }
        if (-not [string]::IsNullOrWhiteSpace($DiffSnapshotPath)) {
            Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EvidenceId $safeEvidenceId -EventType "diff_snapshot_created" -Message "Git diff snapshot reference updated." -Data ([ordered]@{ diff_snapshot_path = ConvertTo-RepoRelativePath -Repo $repo -Path $DiffSnapshotPath })
        }
        Append-ProgressEvent -Path $paths.progress_event_log_path -TaskId $safeTaskId -RunId $taskRunState.run_id -SessionId $safeSessionId -EvidenceId $safeEvidenceId -EventType "evidence_collected" -Message "Evidence record updated." -Data ([ordered]@{ evidence_id = $safeEvidenceId })

        $result = [pscustomobject]@{
            ok = $true
            command = "update"
            task_id = $safeTaskId
            workspace_id = $workspaceId
            session_id = $safeSessionId
            evidence_id = $safeEvidenceId
            status = $existing.status
            evidence_path = ConvertTo-RepoRelativePath -Repo $repo -Path $evidencePath
            evidence = $existing
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
        evidence_id = $EvidenceId
        error = $_.Exception.Message
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
