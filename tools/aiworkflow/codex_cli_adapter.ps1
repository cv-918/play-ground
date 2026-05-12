param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "dry-run", "run")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$PromptFile = "",

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

    return (Join-Path $Repo "_Local\AIWorkflow\codex_cli_adapter.local.json")
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

function Test-ArgumentPresent {
    param(
        [string[]]$ArgumentsList,
        [string[]]$Names
    )

    foreach ($arg in @($ArgumentsList)) {
        if ($Names -contains ([string]$arg)) {
            return $true
        }
    }

    return $false
}

function Add-BeforeExec {
    param(
        [string[]]$ArgumentsList,
        [string[]]$Addition
    )

    $resultArgs = @($ArgumentsList)
    $index = [array]::IndexOf($resultArgs, "exec")
    if ($index -lt 0) {
        return @($Addition + $resultArgs)
    }
    if ($index -eq 0) {
        return @($Addition + $resultArgs)
    }
    return @($resultArgs[0..($index - 1)] + $Addition + $resultArgs[$index..($resultArgs.Count - 1)])
}

function Add-AfterExec {
    param(
        [string[]]$ArgumentsList,
        [string[]]$Addition
    )

    $resultArgs = @($ArgumentsList)
    $index = [array]::IndexOf($resultArgs, "exec")
    if ($index -lt 0) {
        return @($resultArgs + $Addition)
    }
    if ($index -eq ($resultArgs.Count - 1)) {
        return @($resultArgs + $Addition)
    }
    return @($resultArgs[0..$index] + $Addition + $resultArgs[($index + 1)..($resultArgs.Count - 1)])
}

function Get-ResolvedCodexArgs {
    param($Config)

    $resultArgs = @(As-Array -Value $Config.args | ForEach-Object { [string]$_ })

    $model = ""
    if ($null -ne $Config.model) {
        $model = ([string]$Config.model).Trim()
    }
    if (-not [string]::IsNullOrWhiteSpace($model) -and -not (Test-ArgumentPresent -ArgumentsList $resultArgs -Names @("-m", "--model"))) {
        $resultArgs = @(Add-BeforeExec -ArgumentsList $resultArgs -Addition @("--model", $model))
    }

    $reasoningEffort = ""
    if ($null -ne $Config.reasoning_effort) {
        $reasoningEffort = ([string]$Config.reasoning_effort).Trim().ToLowerInvariant()
    }
    if (-not [string]::IsNullOrWhiteSpace($reasoningEffort) -and -not (Test-ArgumentPresent -ArgumentsList $resultArgs -Names @("-c", "--config"))) {
        $resultArgs = @(Add-BeforeExec -ArgumentsList $resultArgs -Addition @("-c", "model_reasoning_effort=`"$reasoningEffort`""))
    }

    if ($Config.ephemeral -eq $true -and -not (Test-ArgumentPresent -ArgumentsList $resultArgs -Names @("--ephemeral"))) {
        $resultArgs = @(Add-AfterExec -ArgumentsList $resultArgs -Addition @("--ephemeral"))
    }

    return @($resultArgs)
}

function Get-PromptInputMode {
    param($Config)

    $mode = "argument_path"
    if ($null -ne $Config -and $null -ne $Config.prompt_input_mode) {
        $mode = ([string]$Config.prompt_input_mode).Trim().ToLowerInvariant()
    }

    if (@("argument_path", "stdin_text") -notcontains $mode) {
        throw "Invalid prompt_input_mode. Use argument_path or stdin_text."
    }

    return $mode
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
        throw "Task status is not allowed for Codex CLI execution: $($Task.status)"
    }

    $requireApproval = $true
    if ($null -ne $Config.require_backlog_approval) {
        $requireApproval = [bool]$Config.require_backlog_approval
    }

    if ($requireApproval -and ($Task.validation -notmatch "(?i)approved")) {
        throw "Backlog validation field does not contain an approval marker."
    }
}

function New-SessionId {
    return ("session-codex-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

function New-EvidenceId {
    return ("evidence-codex-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

function Invoke-WorkflowScript {
    param(
        [string]$Script,
        [string[]]$ArgsList
    )

    $processResult = Invoke-CapturedProcess -FileName "powershell" -ArgumentsList (@(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $Script
    ) + @($ArgsList)) -WorkingDirectory $RepoRoot

    if ($processResult.exit_code -ne 0) {
        $text = ($processResult.stderr + $processResult.stdout).Trim()
        throw "Workflow script failed ($Script): $text"
    }

    return $processResult.stdout
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

function Invoke-CodexProcess {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        $Config,
        [string]$PromptPath,
        [string]$StdoutPath,
        [string]$StderrPath
    )

    $commandPath = [string]$Config.command
    if ([string]::IsNullOrWhiteSpace($commandPath)) {
        throw "Config field 'command' is required."
    }

    $args = @(Get-ResolvedCodexArgs -Config $Config)
    $promptInputMode = Get-PromptInputMode -Config $Config

    $appendPrompt = $true
    if ($null -ne $Config.append_prompt_file) {
        $appendPrompt = [bool]$Config.append_prompt_file
    }
    $promptText = ""
    if ($promptInputMode -eq "stdin_text") {
        if ([string]::IsNullOrWhiteSpace($PromptPath)) {
            throw "Prompt file is required when prompt_input_mode is stdin_text."
        }
        $promptText = Read-Utf8Text -Path $PromptPath
        if ([string]::IsNullOrWhiteSpace($promptText)) {
            throw "Prompt file is empty: $PromptPath"
        }
    }
    elseif ($appendPrompt) {
        if ([string]::IsNullOrWhiteSpace($PromptPath)) {
            throw "Prompt file is required when append_prompt_file is true."
        }
        $args += $PromptPath
    }

    $workingDir = Resolve-RepoPath -Repo $Repo -Path ([string]$Config.working_directory)
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
    $psi.RedirectStandardInput = ($promptInputMode -eq "stdin_text")
    $psi.Arguments = ConvertTo-ProcessArguments -ArgumentsList $args

    $timeout = 0
    if ($null -ne $Config.timeout_seconds) {
        $timeout = [int]$Config.timeout_seconds
    }

    $startedAt = Get-NowText
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    [void]$process.Start()
    $script:externalExecutionPerformed = $true
    $commandLine = (($commandPath + " " + (ConvertTo-ProcessArguments -ArgumentsList $args)).Trim())
    if ($promptInputMode -eq "stdin_text") {
        $commandLine = ($commandLine + " < prompt_file")
    }
    Update-Session -Repo $Repo -TaskId $TaskId -SessionId $SessionId -Status "running" -Activity "Codex CLI process started." -ProcessId ([string]$process.Id) -ProcessStartedAt $startedAt -CommandLine $commandLine -WorkingDirectory $workingDir
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    if ($promptInputMode -eq "stdin_text") {
        $process.StandardInput.Write($promptText)
        $process.StandardInput.Close()
    }

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

    $endedAt = Get-NowText
    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    if ($timedOut) {
        $stderr = ($stderr.TrimEnd() + [Environment]::NewLine + "Codex CLI adapter timeout after $timeout seconds." + [Environment]::NewLine)
    }

    Write-Utf8Text -Path $StdoutPath -Text $stdout
    Write-Utf8Text -Path $StderrPath -Text $stderr

    return [pscustomobject]@{
        command_line = $commandLine
        working_directory = $workingDir
        started_at = $startedAt
        ended_at = $endedAt
        exit_code = if ($timedOut) { -1 } else { $process.ExitCode }
    }
}

function Record-Evidence {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$EvidenceId,
        [string]$Executor,
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
        "-Executor", $Executor,
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

function Create-Session {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId
    )

    $script = Join-Path $PSScriptRoot "session_supervisor.ps1"
    $args = @(
        "-RepoRoot", $Repo,
        "-Command", "create",
        "-TaskId", $TaskId,
        "-SessionId", $SessionId,
        "-ExecutorType", "codex_cli",
        "-Activity", "Codex CLI adapter session created.",
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
    Write-Host "AIWorkflow Codex CLI Execution Adapter"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
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

$externalExecutionPerformed = $false

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        $RepoRoot = Join-Path $PSScriptRoot "..\.."
    }

    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $RepoRoot = $repo
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $configFullPath = Resolve-ConfigPath -Repo $repo -Path $ConfigPath
    $configExists = Test-Path -LiteralPath $configFullPath
    $config = $null
    if ($configExists) {
        $config = Read-JsonFile -Path $configFullPath
    }

    $workspace = Assert-Workspace -Repo $repo -TaskId $safeTaskId
    $task = Get-BacklogTask -Repo $repo -TaskId $safeTaskId

    if ($null -ne $config) {
        Test-TaskApproval -Task $task -Config $config
    }

    $promptFullPath = ""
    if (-not [string]::IsNullOrWhiteSpace($PromptFile)) {
        $promptFullPath = Resolve-RepoPath -Repo $repo -Path $PromptFile
        if (-not (Test-Path -LiteralPath $promptFullPath)) {
            throw "Prompt file not found: $promptFullPath"
        }
    }

    $plannedArgs = @()
    $configEnabled = $false
    $promptInputMode = "argument_path"
    if ($null -ne $config) {
        $plannedArgs = @(Get-ResolvedCodexArgs -Config $config)
        $promptInputMode = Get-PromptInputMode -Config $config
        if ($promptInputMode -eq "stdin_text" -and -not [string]::IsNullOrWhiteSpace($promptFullPath)) {
            $plannedArgs += "<prompt stdin>"
        }
        elseif (($null -eq $config.append_prompt_file -or [bool]$config.append_prompt_file) -and -not [string]::IsNullOrWhiteSpace($promptFullPath)) {
            $plannedArgs += $promptFullPath
        }
        $configEnabled = [bool]$config.enabled
    }

    if ($Command -eq "status" -or $Command -eq "dry-run") {
        $result = [pscustomobject]@{
            ok = $true
            command = $Command
            task_id = $safeTaskId
            task_status = $task.status
            approved = ($task.validation -match "(?i)approved")
            workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $workspace.paths.workspace_path
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_exists = $configExists
            config_enabled = $configEnabled
            planned_command = if ($null -eq $config) { $null } else { [string]$config.command }
            planned_args = @($plannedArgs)
            model = if ($null -eq $config -or $null -eq $config.model) { $null } else { [string]$config.model }
            reasoning_effort = if ($null -eq $config -or $null -eq $config.reasoning_effort) { $null } else { [string]$config.reasoning_effort }
            ephemeral = if ($null -eq $config -or $null -eq $config.ephemeral) { $false } else { [bool]$config.ephemeral }
            prompt_input_mode = $promptInputMode
            prompt_file = ConvertTo-RepoRelativePath -Repo $repo -Path $promptFullPath
            external_execution_performed = $false
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "run") {
        if (-not $Execute) {
            throw "run requires --execute. Use dry-run to inspect without execution."
        }

        $session = if ([string]::IsNullOrWhiteSpace($SessionId)) { New-SessionId } else { $SessionId }
        $evidence = if ([string]::IsNullOrWhiteSpace($EvidenceId)) { New-EvidenceId } else { $EvidenceId }
        $stamp = Get-Stamp
        $stdoutPath = Join-Path $workspace.paths.logs_dir ("codex_cli_" + $stamp + ".stdout.log")
        $stderrPath = Join-Path $workspace.paths.logs_dir ("codex_cli_" + $stamp + ".stderr.log")
        $diffPath = Join-Path $workspace.paths.diffs_dir ("codex_cli_" + $stamp + ".diff")

        Create-Session -Repo $repo -TaskId $safeTaskId -SessionId $session
        Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "starting" -Activity "Codex CLI adapter guard checks started."

        if (-not $configExists) {
            $now = Get-NowText
            Write-Utf8Text -Path $stderrPath -Text "Codex CLI adapter config is missing: $configFullPath`n"
            Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "failed" -Activity "Codex CLI adapter config missing."
            Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -Executor "codex_cli" -CommandLine "" -WorkingDirectory $repo -StartedAt $now -EndedAt (Get-NowText) -ExitCode -1 -StdoutLog "" -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @() -DiffSnapshot ""
            throw "Codex CLI adapter config is missing."
        }

        if (-not $configEnabled) {
            $now = Get-NowText
            Write-Utf8Text -Path $stderrPath -Text "Codex CLI adapter config is disabled. Set enabled=true in local config for real execution.`n"
            Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status "failed" -Activity "Codex CLI adapter config disabled."
            Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -Executor "codex_cli" -CommandLine ([string]$config.command) -WorkingDirectory (Resolve-RepoPath -Repo $repo -Path ([string]$config.working_directory)) -StartedAt $now -EndedAt (Get-NowText) -ExitCode -1 -StdoutLog "" -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @() -DiffSnapshot ""
            throw "Codex CLI adapter config is disabled."
        }

        $processResult = Invoke-CodexProcess -Repo $repo -TaskId $safeTaskId -SessionId $session -Config $config -PromptPath $promptFullPath -StdoutPath $stdoutPath -StderrPath $stderrPath

        $changed = @()
        $diffRef = ""
        if ($null -eq $config.capture_changed_files -or [bool]$config.capture_changed_files -or [bool]$config.capture_diff_snapshot) {
            $changed = @(Invoke-GitCapture -Repo $repo -DiffPath $diffPath)
            if (Test-Path -LiteralPath $diffPath) {
                $diffRef = ConvertTo-RepoRelativePath -Repo $repo -Path $diffPath
            }
        }

        $currentSessionStatus = Get-SessionStatusFromWorkspace -Workspace $workspace -SessionId $session
        $finalStatus = if ($currentSessionStatus -in @("cancelled", "stopping")) { "cancelled" } elseif ($processResult.exit_code -eq 0) { "completed" } else { "failed" }
        Update-Session -Repo $repo -TaskId $safeTaskId -SessionId $session -Status $finalStatus -Activity "Codex CLI process exited with code $($processResult.exit_code)." -ProcessEndedAt $processResult.ended_at -ProcessExitCode ([string]$processResult.exit_code)
        Record-Evidence -Repo $repo -TaskId $safeTaskId -SessionId $session -EvidenceId $evidence -Executor "codex_cli" -CommandLine $processResult.command_line -WorkingDirectory $processResult.working_directory -StartedAt $processResult.started_at -EndedAt $processResult.ended_at -ExitCode $processResult.exit_code -StdoutLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stdoutPath) -StderrLog (ConvertTo-RepoRelativePath -Repo $repo -Path $stderrPath) -ChangedFiles @($changed) -DiffSnapshot $diffRef

        $result = [pscustomobject]@{
            ok = ($processResult.exit_code -eq 0)
            command = "run"
            task_id = $safeTaskId
            session_id = $session
            evidence_id = $evidence
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_enabled = $configEnabled
            exit_code = $processResult.exit_code
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
        error = $_.Exception.Message
        external_execution_performed = $externalExecutionPerformed
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
