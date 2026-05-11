param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "collect", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$SessionId = "",

    [string]$ResultId = "",

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

function New-ResultId {
    return ("result-" + (Get-Stamp) + "-" + (New-ShortGuid))
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

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 18) + "`n")
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

function Get-SafeResultIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^result-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid result id. Use result-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid result id. Parent path traversal is not allowed."
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

    if ($null -eq $Object.PSObject.Properties[$Name]) {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value -Force
    }
    else {
        $Object.$Name = $Value
    }
}

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"
    $reportsDir = Join-Path $evidenceDir "reports"
    $resultsDir = Join-Path $reportsDir "results"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        sessions_dir = Join-Path $workspacePath "sessions"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        runtime_control_history_path = Join-Path $workspacePath "runtime_control_history.jsonl"
        evidence_dir = $evidenceDir
        evidence_manifest_path = Join-Path $evidenceDir "manifest.json"
        evidence_records_dir = Join-Path $evidenceDir "records"
        reports_dir = $reportsDir
        results_dir = $resultsDir
        result_manifest_path = Join-Path $reportsDir "result_manifest.json"
    }
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [bool]$EnsureResultDirs = $false
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

    if ($EnsureResultDirs) {
        New-Item -ItemType Directory -Path $paths.reports_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.results_dir -Force | Out-Null
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Read-JsonLines {
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
            throw "JSONL file contains invalid JSON: $Path"
        }
    }

    return @($records)
}

function Get-ResultPath {
    param(
        [string]$ResultsDir,
        [string]$ResultId
    )

    return (Join-Path $ResultsDir ($ResultId + ".json"))
}

function Read-ResultManifest {
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
        result_ids = @()
        latest_result_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-ResultManifest {
    param(
        [string]$Path,
        $Manifest,
        [string]$ResultId
    )

    $ids = @($Manifest.result_ids)
    if (-not ($ids -contains $ResultId)) {
        $ids += $ResultId
    }

    Set-ObjectProperty -Object $Manifest -Name "result_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_result_id" -Value $ResultId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
}

function Read-Sessions {
    param(
        [string]$SessionsDir,
        [string]$SessionId
    )

    if (-not (Test-Path -LiteralPath $SessionsDir)) {
        return @()
    }

    if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
        $path = Join-Path $SessionsDir ($SessionId + ".json")
        if (-not (Test-Path -LiteralPath $path)) {
            throw "Session does not exist: $SessionId"
        }
        return @((Read-JsonFile -Path $path))
    }

    $sessions = @()
    foreach ($file in @(Get-ChildItem -LiteralPath $SessionsDir -Filter "*.json" -File | Sort-Object Name)) {
        $sessions += (Read-JsonFile -Path $file.FullName)
    }

    return @($sessions)
}

function Read-EvidenceRecords {
    param(
        [string]$ManifestPath,
        [string]$RecordsDir,
        [string[]]$SessionIds
    )

    if (-not (Test-Path -LiteralPath $RecordsDir)) {
        return @()
    }

    $ids = @()
    $manifest = Read-JsonFileOrNull -Path $ManifestPath
    if ($null -ne $manifest) {
        $ids = @($manifest.evidence_ids)
    }

    if ($ids.Count -eq 0) {
        $ids = @(Get-ChildItem -LiteralPath $RecordsDir -Filter "*.json" -File | Sort-Object Name | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) })
    }

    $sessionFilter = @($SessionIds | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $records = @()
    foreach ($id in $ids) {
        $path = Join-Path $RecordsDir ([string]$id + ".json")
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }

        $record = Read-JsonFile -Path $path
        if ($sessionFilter.Count -gt 0 -and -not ($sessionFilter -contains [string]$record.session_id)) {
            continue
        }

        $records += $record
    }

    return @($records)
}

function Get-UniqueStrings {
    param($Values)

    return @($Values | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | ForEach-Object { [string]$_ } | Sort-Object -Unique)
}

function Get-LatestByCreatedAt {
    param($Records)

    $items = @($Records)
    if ($items.Count -eq 0) {
        return $null
    }

    return ($items | Sort-Object created_at, control_id, event_id, record_id | Select-Object -Last 1)
}

function Get-ControlProjection {
    param($Records)

    $latest = @{}
    foreach ($record in @($Records)) {
        $latest[[string]$record.control_id] = $record
    }

    return @($latest.Values | Sort-Object created_at, control_id, record_id)
}

function Get-SessionSummary {
    param($Session)

    return [pscustomobject]@{
        session_id = $Session.session_id
        status = $Session.status
        executor_type = Get-ObjectPropertyValue -Object $Session.executor -Name "executor_type"
        command_line = Get-ObjectPropertyValue -Object $Session.executor -Name "command_line"
        working_directory = Get-ObjectPropertyValue -Object $Session.executor -Name "working_directory"
        process = Get-ObjectPropertyValue -Object $Session -Name "process"
        outputs = Get-ObjectPropertyValue -Object $Session -Name "outputs"
        last_activity = Get-ObjectPropertyValue -Object $Session.heartbeat -Name "last_activity"
        last_activity_at = Get-ObjectPropertyValue -Object $Session.heartbeat -Name "last_activity_at"
        created_at = $Session.created_at
        updated_at = $Session.updated_at
    }
}

function Get-EvidenceSummaryRecord {
    param($Evidence)

    return [pscustomobject]@{
        evidence_id = $Evidence.evidence_id
        session_id = $Evidence.session_id
        status = $Evidence.status
        executor = $Evidence.executor
        command = Get-ObjectPropertyValue -Object $Evidence.execution -Name "command"
        working_directory = Get-ObjectPropertyValue -Object $Evidence.execution -Name "working_directory"
        started_at = Get-ObjectPropertyValue -Object $Evidence.execution -Name "started_at"
        ended_at = Get-ObjectPropertyValue -Object $Evidence.execution -Name "ended_at"
        exit_code = Get-ObjectPropertyValue -Object $Evidence.execution -Name "exit_code"
        stdout_log = Get-ObjectPropertyValue -Object $Evidence.logs -Name "stdout_log"
        stderr_log = Get-ObjectPropertyValue -Object $Evidence.logs -Name "stderr_log"
        changed_files = @($Evidence.changed_files)
        git_diff_snapshots = @($Evidence.git_diff_snapshots)
    }
}

function Get-ExitSummary {
    param($EvidenceRecords)

    $codes = @()
    foreach ($record in @($EvidenceRecords)) {
        $code = Get-ObjectPropertyValue -Object $record.execution -Name "exit_code"
        if ($null -ne $code -and [string]$code -ne "") {
            $codes += ([int]$code)
        }
    }

    $zero = @($codes | Where-Object { $_ -eq 0 }).Count
    $nonzero = @($codes | Where-Object { $_ -ne 0 }).Count
    $state = "no_exit_codes"
    if ($codes.Count -gt 0 -and $nonzero -eq 0) {
        $state = "all_zero"
    }
    elseif ($codes.Count -gt 0 -and $zero -eq 0) {
        $state = "all_nonzero"
    }
    elseif ($codes.Count -gt 0) {
        $state = "mixed"
    }

    return [pscustomobject]@{
        observed_exit_state = $state
        exit_code_count = $codes.Count
        zero_exit_count = $zero
        nonzero_exit_count = $nonzero
        exit_codes = @($codes)
    }
}

function Get-DiffSnapshotPaths {
    param($EvidenceRecords)

    $paths = @()
    foreach ($record in @($EvidenceRecords)) {
        foreach ($snapshot in @($record.git_diff_snapshots)) {
            $path = Get-ObjectPropertyValue -Object $snapshot -Name "path"
            if ([string]::IsNullOrWhiteSpace([string]$path)) {
                $path = [string]$snapshot
            }
            if (-not [string]::IsNullOrWhiteSpace([string]$path)) {
                $paths += [string]$path
            }
        }
    }

    return Get-UniqueStrings -Values $paths
}

function New-ExecutionResult {
    param(
        [string]$Repo,
        $Runtime,
        [string]$ResultId,
        [string]$SessionId
    )

    $paths = $Runtime.paths
    $sessions = @(Read-Sessions -SessionsDir $paths.sessions_dir -SessionId $SessionId)
    $sessionIds = @($sessions | ForEach-Object { [string]$_.session_id })
    $evidenceRecords = @(Read-EvidenceRecords -ManifestPath $paths.evidence_manifest_path -RecordsDir $paths.evidence_records_dir -SessionIds $sessionIds)
    $progressEvents = @(Read-JsonLines -Path $paths.progress_event_log_path)
    $runtimeControlHistory = @(Read-JsonLines -Path $paths.runtime_control_history_path)

    if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
        $progressEvents = @($progressEvents | Where-Object { [string]$_.session_id -eq $SessionId })
        $runtimeControlHistory = @($runtimeControlHistory | Where-Object { [string]$_.session_id -eq $SessionId -or $null -eq $_.session_id })
    }
    $runtimeControls = @(Get-ControlProjection -Records $runtimeControlHistory)

    $sessionSummaries = @($sessions | ForEach-Object { Get-SessionSummary -Session $_ })
    $evidenceSummaries = @($evidenceRecords | ForEach-Object { Get-EvidenceSummaryRecord -Evidence $_ })
    $changedFiles = Get-UniqueStrings -Values @($evidenceRecords | ForEach-Object { @($_.changed_files) })
    $diffSnapshots = Get-DiffSnapshotPaths -EvidenceRecords $evidenceRecords
    $stdoutLogs = Get-UniqueStrings -Values @($evidenceRecords | ForEach-Object { Get-ObjectPropertyValue -Object $_.logs -Name "stdout_log" })
    $stderrLogs = Get-UniqueStrings -Values @($evidenceRecords | ForEach-Object { Get-ObjectPropertyValue -Object $_.logs -Name "stderr_log" })
    $exitSummary = Get-ExitSummary -EvidenceRecords $evidenceRecords
    $latestEvent = Get-LatestByCreatedAt -Records $progressEvents
    $latestControl = Get-LatestByCreatedAt -Records $runtimeControls
    $statuses = Get-UniqueStrings -Values @($sessions | ForEach-Object { $_.status })
    $failedSessions = @($sessions | Where-Object { $_.status -in @("failed", "cancelled", "stalled") } | ForEach-Object { $_.session_id })
    $nonzeroEvidence = @($evidenceSummaries | Where-Object { $null -ne $_.exit_code -and [int]$_.exit_code -ne 0 } | ForEach-Object { $_.evidence_id })
    $summaryText = "Collected $($sessions.Count) session(s), $($evidenceRecords.Count) evidence record(s), $($changedFiles.Count) changed file reference(s), and $($diffSnapshots.Count) diff snapshot reference(s)."

    return [ordered]@{
        schema_version = 1
        result_id = $ResultId
        task_id = $Runtime.task_run_state.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        source_filter = [ordered]@{
            session_id = if ([string]::IsNullOrWhiteSpace($SessionId)) { $null } else { $SessionId }
        }
        collection = [ordered]@{
            status = "collected"
            collector = "result_collector"
            collected_at = Get-NowText
            task_lifecycle_unchanged = $true
            verification_judgment = $null
            completion_state = $null
        }
        task_run = [ordered]@{
            status = $Runtime.task_run_state.status
            active_session_id = $Runtime.task_run_state.active_session_id
            session_count = $sessions.Count
        }
        sessions = @($sessionSummaries)
        evidence = [ordered]@{
            count = $evidenceRecords.Count
            records = @($evidenceSummaries)
            changed_files = @($changedFiles)
            git_diff_snapshots = @($diffSnapshots)
            stdout_logs = @($stdoutLogs)
            stderr_logs = @($stderrLogs)
            exit_summary = $exitSummary
        }
        runtime_controls = [ordered]@{
            count = $runtimeControls.Count
            pending_count = @($runtimeControls | Where-Object { $_.decision -eq "pending" }).Count
            latest_control = $latestControl
            history_count = $runtimeControlHistory.Count
        }
        progress = [ordered]@{
            event_count = $progressEvents.Count
            latest_event = $latestEvent
            recent_events = @($progressEvents | Select-Object -Last 10)
        }
        observed_summary = [ordered]@{
            generated_summary = $summaryText
            session_statuses = @($statuses)
            changed_files_count = $changedFiles.Count
            diff_snapshot_count = $diffSnapshots.Count
            failed_or_cancelled_sessions = @($failedSessions)
            nonzero_exit_evidence_ids = @($nonzeroEvidence)
            observed_exit_state = $exitSummary.observed_exit_state
        }
        handoff = [ordered]@{
            wf_302_diff_analyzer = [ordered]@{
                may_read_changed_files = $true
                changed_files = @($changedFiles)
                git_diff_snapshots = @($diffSnapshots)
            }
            wf_304_verification_report = [ordered]@{
                may_read_execution_result = $true
                owns_pass_fail_judgment = $true
            }
            no_verification_judgment = $true
            no_completion_decision = $true
        }
    }
}

function Update-TaskRunResultState {
    param(
        [string]$Repo,
        $TaskRunState,
        [string]$TaskRunStatePath,
        $Result,
        [string]$ResultPath
    )

    if ($null -eq $TaskRunState.result_collector) {
        Set-ObjectProperty -Object $TaskRunState -Name "result_collector" -Value ([pscustomobject]@{})
    }
    if ($null -eq $TaskRunState.evidence) {
        Set-ObjectProperty -Object $TaskRunState -Name "evidence" -Value ([pscustomobject]@{})
    }

    $resultRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $ResultPath
    Set-ObjectProperty -Object $TaskRunState.result_collector -Name "latest_result_id" -Value $Result.result_id
    Set-ObjectProperty -Object $TaskRunState.result_collector -Name "latest_result_path" -Value $resultRef
    Set-ObjectProperty -Object $TaskRunState.result_collector -Name "latest_collected_at" -Value $Result.collection.collected_at
    Set-ObjectProperty -Object $TaskRunState.result_collector -Name "latest_summary" -Value $Result.observed_summary.generated_summary
    Set-ObjectProperty -Object $TaskRunState.evidence -Name "latest_report_path" -Value $resultRef
    Set-ObjectProperty -Object $TaskRunState.evidence -Name "collector_status" -Value "result_collected"
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$SessionId,
        [string]$ResultId,
        [string]$ResultPath,
        [string]$Summary
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = if ([string]::IsNullOrWhiteSpace($SessionId)) { $null } else { $SessionId }
        event_type = "result_collected"
        severity = "info"
        message = "Execution result collected."
        source = "result_collector"
        data = [ordered]@{
            result_id = $ResultId
            result_path = $ResultPath
            summary = $Summary
            display_only = $true
        }
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 10)
    return $event.event_id
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 18
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Result Collector"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.result_id)) {
        Write-Host "Result: $($Result.result_id)"
    }
    if ($null -ne $Result.result_count) {
        Write-Host "Result count: $($Result.result_count)"
    }
    if ($null -ne $Result.summary) {
        Write-Host "Summary: $($Result.summary)"
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
    $safeResultId = Get-SafeResultIdOrEmpty -Value $ResultId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureResultDirs:($Command -eq "collect")
    $manifest = Read-ResultManifest -Path $runtime.paths.result_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $resultIds = @($manifest.result_ids)
        $latestId = if ([string]::IsNullOrWhiteSpace([string]$manifest.latest_result_id)) { $null } else { [string]$manifest.latest_result_id }
        $latestPath = if ($null -eq $latestId) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-ResultPath -ResultsDir $runtime.paths.results_dir -ResultId $latestId) }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            result_count = $resultIds.Count
            latest_result_id = $latestId
            latest_result_path = $latestPath
            result_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.result_manifest_path
            task_run_result_collector = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "result_collector"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetResultId = $safeResultId
        if ([string]::IsNullOrWhiteSpace($targetResultId)) {
            $targetResultId = [string]$manifest.latest_result_id
        }
        if ([string]::IsNullOrWhiteSpace($targetResultId)) {
            throw "No result_id was provided and no latest result exists."
        }

        $resultPath = Get-ResultPath -ResultsDir $runtime.paths.results_dir -ResultId $targetResultId
        $executionResult = Read-JsonFile -Path $resultPath

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            result_id = $targetResultId
            result_path = ConvertTo-RepoRelativePath -Repo $repo -Path $resultPath
            execution_result = $executionResult
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "collect") {
        $resultIdToWrite = if ([string]::IsNullOrWhiteSpace($safeResultId)) { New-ResultId } else { $safeResultId }
        $resultPath = Get-ResultPath -ResultsDir $runtime.paths.results_dir -ResultId $resultIdToWrite
        if (Test-Path -LiteralPath $resultPath) {
            throw "ExecutionResult already exists: $resultIdToWrite"
        }

        $executionResult = New-ExecutionResult -Repo $repo -Runtime $runtime -ResultId $resultIdToWrite -SessionId $safeSessionId
        Save-JsonFile -Path $resultPath -Value $executionResult
        Save-ResultManifest -Path $runtime.paths.result_manifest_path -Manifest $manifest -ResultId $resultIdToWrite
        Update-TaskRunResultState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Result $executionResult -ResultPath $resultPath
        $resultRef = ConvertTo-RepoRelativePath -Repo $repo -Path $resultPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -SessionId $safeSessionId -ResultId $resultIdToWrite -ResultPath $resultRef -Summary $executionResult.observed_summary.generated_summary

        $result = [pscustomobject]@{
            ok = $true
            command = "collect"
            task_id = $safeTaskId
            result_id = $resultIdToWrite
            result_path = $resultRef
            latest_progress_event_id = $eventId
            summary = $executionResult.observed_summary.generated_summary
            execution_result = $executionResult
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
        result_id = $ResultId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
