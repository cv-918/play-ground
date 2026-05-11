param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "list", "dry-run", "run", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$CommandId = "",

    [string]$BuildTestId = "",

    [string]$ConfigPath = "tools\aiworkflow\build_test_runner.example.json",

    [string]$RepoRoot = "",

    [switch]$Execute,

    [switch]$Approved,

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

function New-BuildTestId {
    param([string]$Kind)

    $safeKind = if ([string]::IsNullOrWhiteSpace($Kind)) { "check" } else { $Kind -replace "[^A-Za-z0-9_-]", "-" }
    return ("bt-" + $safeKind + "-" + (Get-Stamp) + "-" + (New-ShortGuid))
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

function Resolve-RepoPath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $Repo
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
    }

    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path escapes repository root: $Path"
    }

    return $full
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

function Get-SafeCommandIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid command_id. Use only letters, numbers, underscore, dash, and dot."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid command_id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function Get-SafeBuildTestIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^bt-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid build_test_id. Use bt-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid build_test_id. Parent path traversal is not allowed."
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
    $buildTestDir = Join-Path $reportsDir "build_test"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        reports_dir = $reportsDir
        build_test_dir = $buildTestDir
        build_test_results_dir = Join-Path $buildTestDir "results"
        build_test_logs_dir = Join-Path $buildTestDir "logs"
        build_test_manifest_path = Join-Path $buildTestDir "build_test_manifest.json"
    }
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [bool]$EnsureBuildTestDirs = $false
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

    if ($EnsureBuildTestDirs) {
        New-Item -ItemType Directory -Path $paths.build_test_results_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.build_test_logs_dir -Force | Out-Null
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Resolve-ConfigPath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "Config path is required."
    }

    return Resolve-RepoPath -Repo $Repo -Path $Path
}

function Read-RunnerConfig {
    param([string]$Path)

    $config = Read-JsonFile -Path $Path
    if ($null -eq $config.commands) {
        Set-ObjectProperty -Object $config -Name "commands" -Value @()
    }
    if ($null -eq $config.enabled) {
        Set-ObjectProperty -Object $config -Name "enabled" -Value $false
    }
    if ($null -eq $config.allowed_task_statuses) {
        Set-ObjectProperty -Object $config -Name "allowed_task_statuses" -Value @("ready_for_implementation", "in_progress")
    }
    if ($null -eq $config.require_backlog_approval) {
        Set-ObjectProperty -Object $config -Name "require_backlog_approval" -Value $true
    }

    return $config
}

function Get-ConfigCommands {
    param($Config)

    return @(As-Array -Value $Config.commands)
}

function Get-CommandEntry {
    param(
        $Config,
        [string]$CommandId
    )

    if ([string]::IsNullOrWhiteSpace($CommandId)) {
        throw "command_id is required."
    }

    $matches = @(Get-ConfigCommands -Config $Config | Where-Object { $_.command_id -eq $CommandId })
    if ($matches.Count -gt 1) {
        throw "Duplicate command_id found in build/test config: $CommandId"
    }
    if ($matches.Count -eq 0) {
        throw "command_id is not allowlisted in build/test config: $CommandId"
    }

    return $matches[0]
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
            validation = $cells[7]
        }
    }

    return @($rows)
}

function Get-BacklogTask {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $backlogPath = Join-Path $Repo "_Docs\AIWorkflow\Backlog.md"
    $rows = @(Parse-BacklogRows -Text (Read-Utf8Text -Path $backlogPath) | Where-Object { $_.id -eq $TaskId })
    if ($rows.Count -gt 1) {
        throw "Duplicate task_id found in Backlog.md: $TaskId"
    }
    if ($rows.Count -eq 0) {
        throw "task_id not found in Backlog.md: $TaskId"
    }

    return $rows[0]
}

function Assert-RunAllowed {
    param(
        [string]$Repo,
        [string]$TaskId,
        $Config,
        $CommandEntry,
        [bool]$ExecuteFlag,
        [bool]$ApprovedFlag
    )

    if (-not $ExecuteFlag) {
        throw "run requires --execute."
    }
    if (-not [bool]$Config.enabled) {
        throw "Build/Test Runner config is disabled."
    }
    if (-not [bool]$CommandEntry.enabled) {
        throw "build/test command is disabled: $($CommandEntry.command_id)"
    }

    $task = Get-BacklogTask -Repo $Repo -TaskId $TaskId
    $allowedStatuses = @(As-Array -Value $Config.allowed_task_statuses | ForEach-Object { [string]$_ })
    if (-not ($allowedStatuses -contains [string]$task.status)) {
        throw "Task status is not allowed for Build/Test Runner execution: $($task.status)"
    }

    $approvalLevel = [string](Get-ObjectPropertyValue -Object $CommandEntry -Name "approval_level")
    if ([string]::IsNullOrWhiteSpace($approvalLevel)) {
        $approvalLevel = "approval_required"
    }
    if ($approvalLevel -eq "approval_required" -and -not $ApprovedFlag) {
        throw "build/test command requires explicit approval flag: $($CommandEntry.command_id)"
    }
    if ($approvalLevel -notin @("auto_allowed", "approval_required")) {
        throw "Unsupported approval_level for command_id $($CommandEntry.command_id): $approvalLevel"
    }

    return $task
}

function Get-BuildTestManifest {
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
        build_test_ids = @()
        latest_build_test_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-BuildTestManifest {
    param(
        [string]$Path,
        $Manifest,
        [string]$BuildTestId
    )

    $ids = @($Manifest.build_test_ids)
    if (-not ($ids -contains $BuildTestId)) {
        $ids += $BuildTestId
    }

    Set-ObjectProperty -Object $Manifest -Name "build_test_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_build_test_id" -Value $BuildTestId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
}

function Get-BuildTestPath {
    param(
        [string]$ResultsDir,
        [string]$BuildTestId
    )

    return (Join-Path $ResultsDir ($BuildTestId + ".json"))
}

function Invoke-WithFileLock {
    param(
        [string]$Path,
        [scriptblock]$Script
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $stream = $null
    for ($attempt = 1; $attempt -le 80; $attempt++) {
        try {
            $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
            break
        }
        catch {
            if ($attempt -eq 80) {
                throw "Could not acquire build/test runner lock: $Path"
            }
            Start-Sleep -Milliseconds 100
        }
    }

    try {
        return (& $Script)
    }
    finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
    }
}

function Get-SafeCommandSummary {
    param($CommandEntry)

    return [pscustomobject][ordered]@{
        command_id = $CommandEntry.command_id
        kind = if ($null -eq $CommandEntry.kind) { "validation" } else { $CommandEntry.kind }
        label = $CommandEntry.label
        enabled = [bool]$CommandEntry.enabled
        approval_level = if ([string]::IsNullOrWhiteSpace([string]$CommandEntry.approval_level)) { "approval_required" } else { $CommandEntry.approval_level }
        command = $CommandEntry.command
        args = @(As-Array -Value $CommandEntry.args)
        working_directory = if ([string]::IsNullOrWhiteSpace([string]$CommandEntry.working_directory)) { "." } else { $CommandEntry.working_directory }
        timeout_seconds = if ($null -eq $CommandEntry.timeout_seconds) { 300 } else { [int]$CommandEntry.timeout_seconds }
    }
}

function ConvertTo-ProcessArgumentText {
    param([string]$Value)

    if ($null -eq $Value) {
        return '""'
    }

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + ($Value -replace '"', '\"') + '"'
}

function Join-ProcessArguments {
    param($InputArgs)

    return (@($InputArgs) | ForEach-Object { ConvertTo-ProcessArgumentText -Value ([string]$_) }) -join " "
}

function Invoke-BuildTestCommand {
    param(
        [string]$Repo,
        $Runtime,
        $CommandEntry,
        [string]$BuildTestId,
        [string]$ConfigPath,
        $TaskLifecycle
    )

    $summary = Get-SafeCommandSummary -CommandEntry $CommandEntry
    if ([string]::IsNullOrWhiteSpace([string]$summary.command)) {
        throw "build/test command path is empty for command_id $($summary.command_id)"
    }
    if ([int]$summary.timeout_seconds -lt 1) {
        throw "timeout_seconds must be 1 or greater for command_id $($summary.command_id)"
    }

    $workingDir = Resolve-RepoPath -Repo $Repo -Path ([string]$summary.working_directory)
    if (-not (Test-Path -LiteralPath $workingDir)) {
        throw "working_directory does not exist for command_id $($summary.command_id): $($summary.working_directory)"
    }

    $stdoutPath = Join-Path $Runtime.paths.build_test_logs_dir ($BuildTestId + ".stdout.log")
    $stderrPath = Join-Path $Runtime.paths.build_test_logs_dir ($BuildTestId + ".stderr.log")
    $startedAt = Get-NowText
    $startedTime = [DateTimeOffset]::Now

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = [string]$summary.command
    $psi.Arguments = Join-ProcessArguments -InputArgs @($summary.args)
    $psi.WorkingDirectory = $workingDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $env = Get-ObjectPropertyValue -Object $CommandEntry -Name "env"
    if ($null -ne $env) {
        foreach ($property in $env.PSObject.Properties) {
            $psi.Environment[$property.Name] = [string]$property.Value
        }
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    $timedOut = $false
    $spawned = $false
    $exitCode = $null
    $spawnError = $null

    try {
        $spawned = $process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit([int]$summary.timeout_seconds * 1000)) {
            $timedOut = $true
            try {
                $process.Kill()
            }
            catch {
            }
            $process.WaitForExit()
        }
        else {
            $process.WaitForExit()
        }
        $exitCode = $process.ExitCode
        $stdout = $stdoutTask.Result
        $stderr = $stderrTask.Result
    }
    catch {
        $spawnError = $_.Exception.Message
        $stdout = ""
        $stderr = $spawnError
    }
    finally {
        $endedAt = Get-NowText
        $endedTime = [DateTimeOffset]::Now
        $process.Dispose()
    }

    Write-Utf8Text -Path $stdoutPath -Text $stdout
    Write-Utf8Text -Path $stderrPath -Text $stderr

    $observedState = "spawn_failed"
    if ($spawned -and $timedOut) {
        $observedState = "timeout"
    }
    elseif ($spawned -and $exitCode -eq 0) {
        $observedState = "exit_zero"
    }
    elseif ($spawned -and $null -ne $exitCode -and $exitCode -ne 0) {
        $observedState = "exit_nonzero"
    }

    $durationMs = [int][Math]::Round(($endedTime - $startedTime).TotalMilliseconds)
    $commandLine = (($summary.command + " " + $psi.Arguments).Trim())

    return [ordered]@{
        schema_version = 1
        build_test_id = $BuildTestId
        task_id = $Runtime.task_run_state.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        command = [ordered]@{
            command_id = $summary.command_id
            kind = $summary.kind
            label = $summary.label
            approval_level = $summary.approval_level
            command_line = $commandLine
            working_directory = ConvertTo-RepoRelativePath -Repo $Repo -Path $workingDir
            config_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $ConfigPath
        }
        execution = [ordered]@{
            status = "recorded"
            runner = "build_test_runner"
            started_at = $startedAt
            ended_at = $endedAt
            duration_ms = $durationMs
            spawned = $spawned
            timed_out = $timedOut
            exit_code = $exitCode
            observed_exit_state = $observedState
            spawn_error = $spawnError
            verification_judgment = $null
            completion_state = $null
            task_lifecycle_unchanged = $true
        }
        logs = [ordered]@{
            stdout_log = ConvertTo-RepoRelativePath -Repo $Repo -Path $stdoutPath
            stderr_log = ConvertTo-RepoRelativePath -Repo $Repo -Path $stderrPath
            stdout_bytes = ([System.Text.Encoding]::UTF8.GetByteCount($stdout))
            stderr_bytes = ([System.Text.Encoding]::UTF8.GetByteCount($stderr))
        }
        task_lifecycle = $TaskLifecycle
        handoff = [ordered]@{
            wf_304_verification_report = [ordered]@{
                may_read_build_test_result = $true
                owns_pass_fail_judgment = $true
            }
            no_verification_judgment = $true
            no_completion_decision = $true
        }
    }
}

function Update-TaskRunBuildTestState {
    param(
        [string]$Repo,
        $TaskRunState,
        [string]$TaskRunStatePath,
        $BuildTestResult,
        [string]$BuildTestPath
    )

    if ($null -eq $TaskRunState.build_test_runner) {
        Set-ObjectProperty -Object $TaskRunState -Name "build_test_runner" -Value ([pscustomobject]@{})
    }

    $ref = ConvertTo-RepoRelativePath -Repo $Repo -Path $BuildTestPath
    Set-ObjectProperty -Object $TaskRunState.build_test_runner -Name "latest_build_test_id" -Value $BuildTestResult.build_test_id
    Set-ObjectProperty -Object $TaskRunState.build_test_runner -Name "latest_build_test_path" -Value $ref
    Set-ObjectProperty -Object $TaskRunState.build_test_runner -Name "latest_command_id" -Value $BuildTestResult.command.command_id
    Set-ObjectProperty -Object $TaskRunState.build_test_runner -Name "latest_observed_exit_state" -Value $BuildTestResult.execution.observed_exit_state
    Set-ObjectProperty -Object $TaskRunState.build_test_runner -Name "latest_exit_code" -Value $BuildTestResult.execution.exit_code
    Set-ObjectProperty -Object $TaskRunState.build_test_runner -Name "latest_recorded_at" -Value $BuildTestResult.execution.ended_at
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$BuildTestId,
        [string]$BuildTestPath,
        [string]$CommandId,
        [string]$ObservedExitState
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "build_test_result_recorded"
        severity = "info"
        message = "Build/test result recorded."
        source = "build_test_runner"
        data = [ordered]@{
            build_test_id = $BuildTestId
            build_test_path = $BuildTestPath
            command_id = $CommandId
            observed_exit_state = $ObservedExitState
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
    Write-Host "AIWorkflow Build/Test Runner"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.command_id)) {
        Write-Host "Command id: $($Result.command_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.build_test_id)) {
        Write-Host "Build/Test: $($Result.build_test_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.observed_exit_state)) {
        Write-Host "Observed exit: $($Result.observed_exit_state)"
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
    $safeCommandId = Get-SafeCommandIdOrEmpty -Value $CommandId
    $safeBuildTestId = Get-SafeBuildTestIdOrEmpty -Value $BuildTestId
    $configFullPath = Resolve-ConfigPath -Repo $repo -Path $ConfigPath
    $config = Read-RunnerConfig -Path $configFullPath
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureBuildTestDirs:($Command -eq "run")
    $manifest = Get-BuildTestManifest -Path $runtime.paths.build_test_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $ids = @($manifest.build_test_ids)
        $latestId = if ([string]::IsNullOrWhiteSpace([string]$manifest.latest_build_test_id)) { $null } else { [string]$manifest.latest_build_test_id }
        $latestPath = if ($null -eq $latestId) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-BuildTestPath -ResultsDir $runtime.paths.build_test_results_dir -BuildTestId $latestId) }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_enabled = [bool]$config.enabled
            command_count = @(Get-ConfigCommands -Config $config).Count
            build_test_count = $ids.Count
            latest_build_test_id = $latestId
            latest_build_test_path = $latestPath
            build_test_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.build_test_manifest_path
            task_run_build_test_runner = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "build_test_runner"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "list") {
        $commands = @(Get-ConfigCommands -Config $config | ForEach-Object { Get-SafeCommandSummary -CommandEntry $_ })
        $result = [pscustomobject]@{
            ok = $true
            command = "list"
            task_id = $safeTaskId
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_enabled = [bool]$config.enabled
            commands = @($commands)
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "dry-run") {
        $entry = Get-CommandEntry -Config $config -CommandId $safeCommandId
        $summary = Get-SafeCommandSummary -CommandEntry $entry
        $workingDir = Resolve-RepoPath -Repo $repo -Path ([string]$summary.working_directory)
        $result = [pscustomobject]@{
            ok = $true
            command = "dry-run"
            task_id = $safeTaskId
            command_id = $safeCommandId
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            command_summary = $summary
            resolved_working_directory = ConvertTo-RepoRelativePath -Repo $repo -Path $workingDir
            would_execute = $false
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safeBuildTestId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string]$manifest.latest_build_test_id
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            throw "No build_test_id was provided and no latest BuildTestResult exists."
        }

        $path = Get-BuildTestPath -ResultsDir $runtime.paths.build_test_results_dir -BuildTestId $targetId
        if (-not (Test-Path -LiteralPath $path)) {
            throw "BuildTestResult does not exist: $targetId"
        }
        $buildTestResult = Read-JsonFile -Path $path

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            build_test_id = $targetId
            build_test_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            build_test_result = $buildTestResult
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "run") {
        $entry = Get-CommandEntry -Config $config -CommandId $safeCommandId
        $task = Assert-RunAllowed -Repo $repo -TaskId $safeTaskId -Config $config -CommandEntry $entry -ExecuteFlag ([bool]$Execute) -ApprovedFlag ([bool]$Approved)
        $buildTestIdToWrite = if ([string]::IsNullOrWhiteSpace($safeBuildTestId)) { New-BuildTestId -Kind ([string]$entry.kind) } else { $safeBuildTestId }
        $buildTestPath = Get-BuildTestPath -ResultsDir $runtime.paths.build_test_results_dir -BuildTestId $buildTestIdToWrite
        if (Test-Path -LiteralPath $buildTestPath) {
            throw "BuildTestResult already exists: $buildTestIdToWrite"
        }

        $buildTestResult = Invoke-BuildTestCommand -Repo $repo -Runtime $runtime -CommandEntry $entry -BuildTestId $buildTestIdToWrite -ConfigPath $configFullPath -TaskLifecycle $task
        $buildTestRef = ConvertTo-RepoRelativePath -Repo $repo -Path $buildTestPath
        $lockPath = Join-Path $runtime.paths.build_test_dir ".build_test_runner.lock"
        $eventId = Invoke-WithFileLock -Path $lockPath -Script {
            if (Test-Path -LiteralPath $buildTestPath) {
                throw "BuildTestResult already exists: $buildTestIdToWrite"
            }

            Save-JsonFile -Path $buildTestPath -Value $buildTestResult
            $latestManifest = Get-BuildTestManifest -Path $runtime.paths.build_test_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id
            Save-BuildTestManifest -Path $runtime.paths.build_test_manifest_path -Manifest $latestManifest -BuildTestId $buildTestIdToWrite
            $latestTaskRunState = Read-JsonFile -Path $runtime.paths.task_run_state_path
            Update-TaskRunBuildTestState -Repo $repo -TaskRunState $latestTaskRunState -TaskRunStatePath $runtime.paths.task_run_state_path -BuildTestResult $buildTestResult -BuildTestPath $buildTestPath
            Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -BuildTestId $buildTestIdToWrite -BuildTestPath $buildTestRef -CommandId $safeCommandId -ObservedExitState $buildTestResult.execution.observed_exit_state
        }

        $result = [pscustomobject]@{
            ok = $true
            command = "run"
            task_id = $safeTaskId
            command_id = $safeCommandId
            build_test_id = $buildTestIdToWrite
            build_test_path = $buildTestRef
            latest_progress_event_id = $eventId
            observed_exit_state = $buildTestResult.execution.observed_exit_state
            exit_code = $buildTestResult.execution.exit_code
            build_test_result = $buildTestResult
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
        command_id = $CommandId
        build_test_id = $BuildTestId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
