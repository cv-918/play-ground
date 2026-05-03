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

$paths = Resolve-Paths
$exitCode = 1
$stdoutLog = $null
$stderrLog = $null

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

Write-LogTail -Label "stdout" -Path $stdoutLog
Write-LogTail -Label "stderr" -Path $stderrLog

exit $exitCode
