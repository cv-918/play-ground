$ErrorActionPreference = "Stop"

function Resolve-Paths {
    $scriptDir = Split-Path -Parent $PSCommandPath
    $botRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
    $repoRoot = (Resolve-Path (Join-Path $botRoot "..\..")).Path
    $stateDir = Join-Path $repoRoot "_Temp\AIWorkflowDiscordBot"

    [PSCustomObject]@{
        BotRoot = $botRoot
        RepoRoot = $repoRoot
        StateDir = $stateDir
        LogsDir = Join-Path $stateDir "logs"
        StateFile = Join-Path $stateDir "state.json"
    }
}

function Redact-Secret {
    param([string]$Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return $Text
    }

    $token = $env:AIWORKFLOW_DISCORD_BOT_TOKEN
    if (-not [string]::IsNullOrWhiteSpace($token)) {
        return $Text.Replace($token, "[REDACTED_TOKEN]")
    }

    return $Text
}

function Write-LogTail {
    param(
        [string]$Label,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    Write-Host ""
    Write-Host "$Label log: $Path"

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "(log file not found)"
        return
    }

    Write-Host "last 30 lines:"
    $lines = Get-Content -LiteralPath $Path -Tail 30 -ErrorAction SilentlyContinue
    if ($null -eq $lines) {
        Write-Host "(no log output yet)"
        return
    }

    foreach ($line in $lines) {
        Write-Host (Redact-Secret -Text $line)
    }
}

function Get-LatestLogFromPointer {
    param([string]$PointerFile)

    if (Test-Path -LiteralPath $PointerFile) {
        $path = Get-Content -LiteralPath $PointerFile -Raw -ErrorAction SilentlyContinue
        if (-not [string]::IsNullOrWhiteSpace($path)) {
            return $path.Trim()
        }
    }

    return $null
}

function Test-ProcessMatchesState {
    param(
        $Process,
        $State
    )

    if ($null -eq $Process -or $Process.ProcessName -ine "node") {
        return $false
    }

    if ($State.process_started_at) {
        try {
            $recordedStart = [datetime]$State.process_started_at
            $actualStart = $Process.StartTime
            return ([math]::Abs(($actualStart - $recordedStart).TotalSeconds) -le 2)
        }
        catch {
            return $false
        }
    }

    return $true
}

function Get-GitState {
    param([string]$RepoRoot)

    try {
        $branch = (& git -C $RepoRoot branch --show-current 2>$null).Trim()
        $head = (& git -C $RepoRoot rev-parse HEAD 2>$null).Trim()
        $short = (& git -C $RepoRoot rev-parse --short HEAD 2>$null).Trim()
        $committedAt = (& git -C $RepoRoot log -1 --format=%cI 2>$null).Trim()

        return [PSCustomObject]@{
            Branch = $branch
            Head = $head
            Short = $short
            CommittedAt = $committedAt
        }
    }
    catch {
        return [PSCustomObject]@{
            Branch = ""
            Head = ""
            Short = ""
            CommittedAt = ""
        }
    }
}

function Write-GitFreshness {
    param(
        $State,
        $Git,
        [bool]$Running
    )

    $stateHead = ""
    $stateShort = ""
    $stateBranch = ""
    if ($null -ne $State) {
        $stateHead = [string]$State.git_head
        $stateShort = [string]$State.git_head_short
        $stateBranch = [string]$State.git_branch
    }

    Write-Host "git_head_running: $(if ([string]::IsNullOrWhiteSpace($stateShort)) { 'unknown' } else { $stateShort })"
    Write-Host "git_head_current: $(if ([string]::IsNullOrWhiteSpace($Git.Short)) { 'unknown' } else { $Git.Short })"
    Write-Host "git_branch_running: $(if ([string]::IsNullOrWhiteSpace($stateBranch)) { 'unknown' } else { $stateBranch })"
    Write-Host "git_branch_current: $(if ([string]::IsNullOrWhiteSpace($Git.Branch)) { 'unknown' } else { $Git.Branch })"

    $restartRecommended = $false
    $restartReason = "running bot matches current Git HEAD"
    if (-not $Running) {
        $restartReason = "bot is not running"
    }
    elseif (-not [string]::IsNullOrWhiteSpace($stateHead) -and -not [string]::IsNullOrWhiteSpace($Git.Head) -and $stateHead -ne $Git.Head) {
        $restartRecommended = $true
        $restartReason = "bot started from an older Git HEAD"
    }
    elseif ([string]::IsNullOrWhiteSpace($stateHead) -and $null -ne $State -and $State.process_started_at -and -not [string]::IsNullOrWhiteSpace($Git.CommittedAt)) {
        try {
            $processStartedAt = [datetime]$State.process_started_at
            $headCommittedAt = [datetime]$Git.CommittedAt
            if ($headCommittedAt -gt $processStartedAt) {
                $restartRecommended = $true
                $restartReason = "current Git HEAD is newer than the running bot process"
            }
        }
        catch {}
    }

    Write-Host "restart_recommended: $(if ($restartRecommended) { 'yes' } else { 'no' })"
    Write-Host "restart_reason: $restartReason"
}

$paths = Resolve-Paths
$exitCode = 1
$stdoutLog = $null
$stderrLog = $null
$state = $null
$isRunning = $false
$gitState = Get-GitState -RepoRoot $paths.RepoRoot

Write-Host "AIWorkflow Discord Bot Status"
Write-Host "state path: $($paths.StateFile)"
Write-Host "logs path: $($paths.LogsDir)"

if (-not (Test-Path -LiteralPath $paths.StateFile)) {
    Write-Host "state: stopped"
    $stdoutLog = Get-LatestLogFromPointer -PointerFile (Join-Path $paths.StateDir "latest_stdout_log.txt")
    $stderrLog = Get-LatestLogFromPointer -PointerFile (Join-Path $paths.StateDir "latest_stderr_log.txt")
}
else {
    try {
        $state = Get-Content -LiteralPath $paths.StateFile -Raw | ConvertFrom-Json
        $stdoutLog = $state.stdout_log
        $stderrLog = $state.stderr_log

        if ($null -eq $state.pid) {
            Write-Host "state: stopped"
            Write-Host "reason: state file has no PID"
        }
        else {
            $pidValue = [int]$state.pid
            $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue

            if (Test-ProcessMatchesState -Process $process -State $state) {
                Write-Host "state: running"
                Write-Host "PID: $pidValue"
                Write-Host "started_at: $($state.started_at)"
                Write-Host "command: $($state.command)"
                Write-Host "working_directory: $($state.working_directory)"
                $isRunning = $true
                $exitCode = 0
            }
            elseif ($null -ne $process) {
                Write-Host "state: stopped"
                Write-Host "reason: recorded PID is alive but does not match the recorded bot process"
                Write-Host "recorded PID: $pidValue"
                Write-Host "process name: $($process.ProcessName)"
            }
            else {
                Write-Host "state: stopped"
                Write-Host "reason: recorded PID is not running"
                Write-Host "recorded PID: $pidValue"
            }
        }
    }
    catch {
        Write-Host "state: stopped"
        Write-Host "reason: state file could not be parsed"
        $stdoutLog = Get-LatestLogFromPointer -PointerFile (Join-Path $paths.StateDir "latest_stdout_log.txt")
        $stderrLog = Get-LatestLogFromPointer -PointerFile (Join-Path $paths.StateDir "latest_stderr_log.txt")
    }
}

Write-GitFreshness -State $state -Git $gitState -Running $isRunning

Write-LogTail -Label "stdout" -Path $stdoutLog
Write-LogTail -Label "stderr" -Path $stderrLog

exit $exitCode
