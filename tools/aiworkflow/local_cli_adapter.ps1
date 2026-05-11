param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "dry-run", "run")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$CommandId = "",

    [string]$ConfigPath = "",

    [string]$SessionId = "",

    [string]$EvidenceId = "",

    [switch]$Execute,

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText {
    return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

function Get-Stamp {
    return (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
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
        return ""
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
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

function Get-SafeCommandId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "command_id is required."
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z][A-Za-z0-9_.-]*$") {
        throw "Invalid command_id. Use only letters, numbers, underscore, dash, and dot."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid command_id. Parent path traversal is not allowed."
    }

    return $trimmed
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

        $body = $line.Trim("|".ToCharArray())
        $cells = @($body.Split("|".ToCharArray()) | ForEach-Object {
            if ($null -eq $_) { "" } else { ([string]$_).Trim() }
        })

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
        throw "Task id not found in Backlog.md: $TaskId"
    }

    return $rows[0]
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
        logs_dir = Join-Path $evidenceDir "logs"
        diffs_dir = Join-Path $evidenceDir "diffs"
    }
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

    $metadata = Read-JsonFile -Path $paths.metadata_path
    $taskRunState = Read-JsonFile -Path $paths.task_run_state_path

    if ($metadata.task_id -ne $TaskId) {
        throw "Workspace metadata task_id mismatch. Expected $TaskId, found $($metadata.task_id)."
    }

    if ($taskRunState.task_id -ne $TaskId) {
        throw "TaskRunState task_id mismatch. Expected $TaskId, found $($taskRunState.task_id)."
    }

    foreach ($dir in @($paths.sessions_dir, $paths.logs_dir, $paths.diffs_dir)) {
        if (-not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
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

    if (-not [string]::IsNullOrWhiteSpace($Path)) {
        return (Resolve-RepoPath -Repo $Repo -Path $Path)
    }

    return (Join-Path $Repo "_Local\AIWorkflow\local_cli_adapter.local.json")
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

function Get-ConfigCommands {
    param($Config)

    if ($null -eq $Config.commands) {
        return @()
    }

    return @(As-Array -Value $Config.commands)
}

function Get-CommandEntry {
    param(
        $Config,
        [string]$CommandId
    )

    $matches = @(Get-ConfigCommands -Config $Config | Where-Object { $_.command_id -eq $CommandId })

    if ($matches.Count -gt 1) {
        throw "Duplicate command_id found in local CLI config: $CommandId"
    }

    if ($matches.Count -eq 0) {
        throw "command_id is not allowlisted in local CLI config: $CommandId"
    }

    return $matches[0]
}

function Test-TaskApproval {
    param(
        $Task,
        $Config
    )

    $allowed = @("ready_for_implementation", "in_progress")
    if ($null -ne $Config.allowed_task_statuses) {
        $allowed = @(As-Array -Value $Config.allowed_task_statuses)
    }

    if (-not ($allowed -contains $Task.status)) {
        throw "Task status is not allowed for Local CLI execution: $($Task.status)"
    }

    $requireApproval = $true
    if ($null -ne $Config.require_backlog_approval) {
        $requireApproval = [bool]$Config.require_backlog_approval
    }

    if ($requireApproval -and ($Task.validation -notmatch "(?i)approved")) {
        throw "Backlog validation field does not contain an approval marker."
    }
}

function Assert-SafeCommandEntry {
    param($CommandEntry)

    if ([string]::IsNullOrWhiteSpace($CommandEntry.command)) {
        throw "Allowlisted command entry is missing command."
    }

    if ([string]$CommandEntry.command -match "[\r\n&|;<>]") {
        throw "Allowlisted command contains shell control characters. Local CLI adapter does not accept shell command strings."
    }

    foreach ($arg in @(As-Array -Value $CommandEntry.args)) {
        if ([string]$arg -match "[\r\n]") {
            throw "Allowlisted command argument contains a newline."
        }
    }
}

function New-SessionId {
    param([string]$CommandId)
    return ("session-local-" + $CommandId + "-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

function New-EvidenceId {
    param([string]$CommandId)
    return ("evidence-local-" + $CommandId + "-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

function Invoke-WorkflowScript {
    param(
        [string]$Script,
        [string[]]$ArgsList
    )

    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $Script @ArgsList 2>&1
    $exitCode = $LASTEXITCODE
    $text = ""
    if ($null -ne $output) {
        $text = ($output | Out-String).Trim()
    }

    if ($exitCode -ne 0) {
        throw "Workflow script failed ($Script): $text"
    }

    return $text
}

function Invoke-CapturedProcess {
    param(
        [string]$FileName,
        [string[]]$ArgumentsList,
        [string]$WorkingDirectory
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FileName
    $psi.Arguments = ConvertTo-ProcessArguments -ArgumentsList $ArgumentsList
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()

    return [pscustomobject]@{
        stdout = $stdoutTask.Result
        stderr = $stderrTask.Result
        exit_code = $process.ExitCode
    }
}

function Invoke-GitCapture {
    param(
        [string]$Repo,
        [string]$DiffPath
    )

    $changedResult = Invoke-CapturedProcess -FileName "git" -ArgumentsList @("diff", "--name-only") -WorkingDirectory $Repo
    if ($changedResult.exit_code -ne 0) {
        throw ("git diff --name-only failed: " + ($changedResult.stderr + $changedResult.stdout).Trim())
    }

    $diffResult = Invoke-CapturedProcess -FileName "git" -ArgumentsList @("diff") -WorkingDirectory $Repo
    if ($diffResult.exit_code -ne 0) {
        throw ("git diff failed: " + ($diffResult.stderr + $diffResult.stdout).Trim())
    }

    Write-Utf8Text -Path $DiffPath -Text ($diffResult.stdout.TrimEnd() + [Environment]::NewLine)

    $changed = @()
    foreach ($line in ($changedResult.stdout -split "`r?`n")) {
        $value = ([string]$line).Trim()
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $changed += ($value -replace "\\", "/")
        }
    }

    return @($changed)
}

function Invoke-LocalProcess {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        $CommandEntry,
        [string]$StdoutPath,
        [string]$StderrPath
    )

    $commandPath = [string]$CommandEntry.command
    Assert-SafeCommandEntry -CommandEntry $CommandEntry

    $args = @(As-Array -Value $CommandEntry.args | ForEach-Object { [string]$_ })
    $workingDir = Resolve-RepoPath -Repo $Repo -Path ([string]$CommandEntry.working_directory)
    if ([string]::IsNullOrWhiteSpace($workingDir)) {
        $workingDir = $Repo
    }

    if (-not (Test-Path -LiteralPath $workingDir)) {
        throw "Configured working_directory does not exist: $workingDir"
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $commandPath
    $psi.WorkingDirectory = $workingDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    $psi.Arguments = ConvertTo-ProcessArguments -ArgumentsList $args

    if ($null -ne $CommandEntry.env) {
        foreach ($property in $CommandEntry.env.PSObject.Properties) {
            $name = [string]$property.Name
            if ($name -match "[\r\n=]") {
                throw "Invalid environment variable name in command config."
            }
            $psi.Environment[$name] = [string]$property.Value
        }
    }

    $timeout = 0
    if ($null -ne $CommandEntry.timeout_seconds) {
        $timeout = [int]$CommandEntry.timeout_seconds
    }

    $startedAt = Get-NowText
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    [void]$process.Start()
    Update-Session -Repo $Repo -TaskId $TaskId -SessionId $SessionId -Status "running" -Activity "Local CLI process started for command_id $([string]$CommandEntry.command_id)." -ProcessId ([string]$process.Id) -ProcessStartedAt $startedAt -CommandLine (($commandPath + " " + ($args -join " ")).Trim()) -WorkingDirectory $workingDir
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()

    $timedOut = $false
    if ($timeout -gt 0) {
        if (-not $process.WaitForExit($timeout * 1000)) {
            $timedOut = $true
            try {
                $process.Kill()
            }
            catch {}
        }
    }
    else {
        $process.WaitForExit()
    }

    $process.WaitForExit()
    $stdoutText = $stdoutTask.Result
    $stderrText = $stderrTask.Result

    $endedAt = Get-NowText
    if ($timedOut) {
        $stderrText = $stderrText + "Local CLI adapter timeout after $timeout seconds." + [Environment]::NewLine
    }

    Write-Utf8Text -Path $StdoutPath -Text $stdoutText
    Write-Utf8Text -Path $StderrPath -Text $stderrText

    $exitCode = if ($timedOut) { -1 } else { $process.ExitCode }

    return [pscustomobject]@{
        command_line = ($commandPath + " " + ($args -join " ")).Trim()
        working_directory = $workingDir
        started_at = $startedAt
        ended_at = $endedAt
        exit_code = $exitCode
        timed_out = $timedOut
    }
}

function Get-ConfiguredCommandLine {
    param($CommandEntry)

    if ($null -eq $CommandEntry) {
        return ""
    }

    $commandPath = [string]$CommandEntry.command
    $args = @(As-Array -Value $CommandEntry.args | ForEach-Object { [string]$_ })
    return ($commandPath + " " + ($args -join " ")).Trim()
}

function Get-ConfiguredWorkingDirectory {
    param(
        [string]$Repo,
        $CommandEntry
    )

    if ($null -eq $CommandEntry) {
        return $Repo
    }

    $workingDir = Resolve-RepoPath -Repo $Repo -Path ([string]$CommandEntry.working_directory)
    if ([string]::IsNullOrWhiteSpace($workingDir)) {
        return $Repo
    }

    return $workingDir
}

function Get-SessionStatusFromWorkspace {
    param(
        $Workspace,
        [string]$SessionId
    )

    $path = Join-Path $Workspace.paths.sessions_dir ($SessionId + ".json")
    if (-not (Test-Path -LiteralPath $path)) {
        return ""
    }

    try {
        $session = Read-JsonFile -Path $path
        return ([string]$session.status)
    }
    catch {
        return ""
    }
}

function Record-Evidence {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$EvidenceId,
        [string]$CommandLine,
        [string]$WorkingDirectory,
        [string]$StartedAt,
        [string]$EndedAt,
        [int]$ExitCode,
        [string]$StdoutLog,
        [string]$StderrLog,
        [string[]]$ChangedFiles,
        [string]$DiffSnapshot
    )

    $script = Join-Path $PSScriptRoot "evidence_collector.ps1"
    $changed = ($ChangedFiles -join ",")
    $args = @(
        "-RepoRoot", $Repo,
        "-Command", "create",
        "-TaskId", $TaskId,
        "-SessionId", $SessionId,
        "-EvidenceId", $EvidenceId,
        "-Executor", "local_cli",
        "-ExitCode", ([string]$ExitCode),
        "-Json"
    )

    if (-not [string]::IsNullOrWhiteSpace($CommandLine)) {
        $args += @("-CommandLine", $CommandLine)
    }
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $args += @("-WorkingDirectory", $WorkingDirectory)
    }
    if (-not [string]::IsNullOrWhiteSpace($StartedAt)) {
        $args += @("-StartedAt", $StartedAt)
    }
    if (-not [string]::IsNullOrWhiteSpace($EndedAt)) {
        $args += @("-EndedAt", $EndedAt)
    }
    if (-not [string]::IsNullOrWhiteSpace($StdoutLog)) {
        $args += @("-StdoutLog", $StdoutLog)
    }
    if (-not [string]::IsNullOrWhiteSpace($StderrLog)) {
        $args += @("-StderrLog", $StderrLog)
    }
    if (-not [string]::IsNullOrWhiteSpace($changed)) {
        $args += @("-ChangedFiles", $changed)
    }
    if (-not [string]::IsNullOrWhiteSpace($DiffSnapshot)) {
        $args += @("-DiffSnapshotPath", $DiffSnapshot)
    }

    Invoke-WorkflowScript -Script $script -ArgsList $args | Out-Null
}

function Update-Session {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$Status,
        [string]$Activity,
        [string]$ProcessId = "",
        [string]$ProcessStartedAt = "",
        [string]$ProcessEndedAt = "",
        [string]$ProcessExitCode = "",
        [string]$CommandLine = "",
        [string]$WorkingDirectory = ""
    )

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

    if (-not [string]::IsNullOrWhiteSpace($ProcessId)) {
        $args += @("-ProcessId", $ProcessId)
    }
    if (-not [string]::IsNullOrWhiteSpace($ProcessStartedAt)) {
        $args += @("-ProcessStartedAt", $ProcessStartedAt)
    }
    if (-not [string]::IsNullOrWhiteSpace($ProcessEndedAt)) {
        $args += @("-ProcessEndedAt", $ProcessEndedAt)
    }
    if (-not [string]::IsNullOrWhiteSpace($ProcessExitCode)) {
        $args += @("-ProcessExitCode", $ProcessExitCode)
    }
    if (-not [string]::IsNullOrWhiteSpace($CommandLine)) {
        $args += @("-CommandLine", $CommandLine)
    }
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $args += @("-WorkingDirectory", $WorkingDirectory)
    }

    Invoke-WorkflowScript -Script $script -ArgsList $args | Out-Null
}

function Create-Session {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$CommandId
    )

    $script = Join-Path $PSScriptRoot "session_supervisor.ps1"
    $args = @(
        "-RepoRoot", $Repo,
        "-Command", "create",
        "-TaskId", $TaskId,
        "-SessionId", $SessionId,
        "-ExecutorType", "local_cli",
        "-Activity", "Local CLI adapter session created for command_id $CommandId.",
        "-Json"
    )

    Invoke-WorkflowScript -Script $script -ArgsList $args | Out-Null
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
    Write-Host "AIWorkflow Local CLI Execution Adapter"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    Write-Host "Command ID: $($Result.command_id)"
    if ($null -ne $Result.config_enabled) {
        Write-Host "Config enabled: $($Result.config_enabled)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.session_id)) {
        Write-Host "Session: $($Result.session_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.evidence_id)) {
        Write-Host "Evidence: $($Result.evidence_id)"
    }
    if ($null -ne $Result.exit_code) {
        Write-Host "Exit code: $($Result.exit_code)"
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
    $safeCommandId = Get-SafeCommandId -Value $CommandId
    $configFullPath = Resolve-ConfigPath -Repo $repo -Path $ConfigPath
    $configExists = Test-Path -LiteralPath $configFullPath
    $config = $null
    if ($configExists) {
        $config = Read-JsonFile -Path $configFullPath
    }

    $workspace = Assert-Workspace -Repo $repo -TaskId $safeTaskId
    $task = Get-BacklogTask -Repo $repo -TaskId $safeTaskId
    $entry = $null
    if ($null -ne $config) {
        Test-TaskApproval -Task $task -Config $config
        $entry = Get-CommandEntry -Config $config -CommandId $safeCommandId
        Assert-SafeCommandEntry -CommandEntry $entry
    }

    $configEnabled = $false
    $entryEnabled = $false
    if ($null -ne $config) {
        $configEnabled = [bool]$config.enabled
    }
    if ($null -ne $entry -and $null -ne $entry.enabled) {
        $entryEnabled = [bool]$entry.enabled
    }
    elseif ($null -ne $entry) {
        $entryEnabled = $true
    }

    if ($Command -eq "status" -or $Command -eq "dry-run") {
        $result = [pscustomobject]@{
            ok = $true
            command = $Command
            task_id = $safeTaskId
            command_id = $safeCommandId
            task_status = $task.status
            approved = ($task.validation -match "(?i)approved")
            workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $workspace.paths.workspace_path
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_exists = $configExists
            config_enabled = $configEnabled
            command_allowlisted = ($null -ne $entry)
            command_enabled = $entryEnabled
            planned_command = if ($null -eq $entry) { $null } else { [string]$entry.command }
            planned_args = if ($null -eq $entry) { @() } else { @(As-Array -Value $entry.args | ForEach-Object { [string]$_ }) }
            working_directory = if ($null -eq $entry) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Resolve-RepoPath -Repo $repo -Path ([string]$entry.working_directory)) }
            external_execution_performed = $false
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "run") {
        if (-not $Execute) {
            throw "run requires --execute. Use dry-run to inspect without execution."
        }

        $session = if ([string]::IsNullOrWhiteSpace($SessionId)) { New-SessionId -CommandId $safeCommandId } else { $SessionId }
        $evidence = if ([string]::IsNullOrWhiteSpace($EvidenceId)) { New-EvidenceId -CommandId $safeCommandId } else { $EvidenceId }
        $stamp = Get-Stamp
        $stdoutPath = Join-Path $workspace.paths.logs_dir ("local_cli_" + $safeCommandId + "_" + $stamp + ".stdout.log")
        $stderrPath = Join-Path $workspace.paths.logs_dir ("local_cli_" + $safeCommandId + "_" + $stamp + ".stderr.log")
        $diffPath = Join-Path $workspace.paths.diffs_dir ("local_cli_" + $safeCommandId + "_" + $stamp + ".diff")

        Create-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -CommandId $safeCommandId
        Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "starting" -Activity "Local CLI adapter guard checks started."

        if (-not $configExists) {
            $now = Get-NowText
            Write-Utf8Text -Path $stderrPath -Text "Local CLI adapter config is missing: $configFullPath`n"
            Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "failed" -Activity "Local CLI adapter config missing."
            Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -CommandLine "" -WorkingDirectory $repo -StartedAt $now -EndedAt (Get-NowText) -ExitCode -1 -StdoutLog "" -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @() -DiffSnapshot ""
            throw "Local CLI adapter config is missing."
        }

        if (-not $configEnabled) {
            $now = Get-NowText
            Write-Utf8Text -Path $stderrPath -Text "Local CLI adapter config is disabled. Set enabled=true in local config for real execution.`n"
            Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "failed" -Activity "Local CLI adapter config disabled."
            Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -CommandLine ([string]$entry.command) -WorkingDirectory (Resolve-RepoPath -Repo $repo -Path ([string]$entry.working_directory)) -StartedAt $now -EndedAt (Get-NowText) -ExitCode -1 -StdoutLog "" -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @() -DiffSnapshot ""
            throw "Local CLI adapter config is disabled."
        }

        if (-not $entryEnabled) {
            $now = Get-NowText
            Write-Utf8Text -Path $stderrPath -Text "Local CLI command_id is disabled: $safeCommandId`n"
            Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "failed" -Activity "Local CLI command_id disabled."
            Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -CommandLine ([string]$entry.command) -WorkingDirectory (Resolve-RepoPath -Repo $repo -Path ([string]$entry.working_directory)) -StartedAt $now -EndedAt (Get-NowText) -ExitCode -1 -StdoutLog "" -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @() -DiffSnapshot ""
            throw "Local CLI command_id is disabled."
        }

        try {
            $processResult = Invoke-LocalProcess -Repo $repo -TaskId $safeTaskId -SessionId $session -CommandEntry $entry -StdoutPath $stdoutPath -StderrPath $stderrPath
        }
        catch {
            $now = Get-NowText
            $message = $_.Exception.Message
            Write-Utf8Text -Path $stdoutPath -Text ""
            Write-Utf8Text -Path $stderrPath -Text ("Local CLI adapter spawn/execution failure: " + $message + [Environment]::NewLine)
            Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "failed" -Activity "Local CLI command_id $safeCommandId failed before exit_code capture."
            Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -CommandLine (Get-ConfiguredCommandLine -CommandEntry $entry) -WorkingDirectory (Get-ConfiguredWorkingDirectory -Repo $repo -CommandEntry $entry) -StartedAt $now -EndedAt (Get-NowText) -ExitCode -1 -StdoutLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stdoutPath) -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @() -DiffSnapshot ""
            throw
        }

        $captureChanged = $true
        if ($null -ne $entry.capture_changed_files) {
            $captureChanged = [bool]$entry.capture_changed_files
        }
        $captureDiff = $true
        if ($null -ne $entry.capture_diff_snapshot) {
            $captureDiff = [bool]$entry.capture_diff_snapshot
        }

        $changed = @()
        $diffRef = ""
        if ($captureChanged -or $captureDiff) {
            $changed = @(Invoke-GitCapture -Repo $repo -DiffPath $diffPath)
            if ($captureDiff -and (Test-Path -LiteralPath $diffPath)) {
                $diffRef = ConvertTo-RepoRelativePath -Repo $repo -Path $diffPath
            }
        }

        $currentSessionStatus = Get-SessionStatusFromWorkspace -Workspace $workspace -SessionId $session
        $finalStatus = if ($currentSessionStatus -in @("cancelled", "stopping")) { "cancelled" } elseif ($processResult.exit_code -eq 0) { "completed" } else { "failed" }
        Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status $finalStatus -Activity "Local CLI command_id $safeCommandId exited with code $($processResult.exit_code)." -ProcessEndedAt $processResult.ended_at -ProcessExitCode ([string]$processResult.exit_code)
        Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -CommandLine $processResult.command_line -WorkingDirectory $processResult.working_directory -StartedAt $processResult.started_at -EndedAt $processResult.ended_at -ExitCode $processResult.exit_code -StdoutLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stdoutPath) -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @($changed) -DiffSnapshot $diffRef

        $result = [pscustomobject]@{
            ok = ($processResult.exit_code -eq 0)
            command = "run"
            task_id = $safeTaskId
            command_id = $safeCommandId
            session_id = $session
            evidence_id = $evidence
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_enabled = $configEnabled
            command_enabled = $entryEnabled
            exit_code = $processResult.exit_code
            timed_out = $processResult.timed_out
            stdout_log = ConvertTo-RepoRelativePath -Repo $repo -Path $stdoutPath
            stderr_log = ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath
            diff_snapshot = $diffRef
            changed_files = @($changed)
            external_execution_performed = $true
            pass_fail_judgment = $null
        }

        $exit = if ($processResult.exit_code -eq 0) { 0 } else { 1 }
        Write-ObjectResult -Result $result -ExitCode $exit
    }
}
catch {
    $result = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $TaskId
        command_id = $CommandId
        error = $_.Exception.Message
        external_execution_performed = $false
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
