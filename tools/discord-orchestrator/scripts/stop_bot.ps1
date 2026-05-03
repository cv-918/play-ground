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

function Remove-StateFile {
    param([string]$StateFile)

    if (Test-Path -LiteralPath $StateFile) {
        Remove-Item -LiteralPath $StateFile -Force
    }
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

function Wait-RecordedProcessExit {
    param(
        [int]$ProcessId,
        [int]$TimeoutSeconds = 15,
        [int]$PollMilliseconds = 250
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        $current = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $current) {
            return $true
        }

        Start-Sleep -Milliseconds $PollMilliseconds
    }

    $final = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    return ($null -eq $final)
}

$paths = Resolve-Paths

if (-not (Test-Path -LiteralPath $paths.StateFile)) {
    Write-Host "[STOPPED] No state file found."
    Write-Host "state path: $($paths.StateFile)"
    exit 0
}

try {
    $state = Get-Content -LiteralPath $paths.StateFile -Raw | ConvertFrom-Json
}
catch {
    Write-Error "State file exists but could not be parsed. Not stopping any process: $($paths.StateFile)"
    exit 1
}

if ($null -eq $state.pid) {
    Write-Warning "State file has no PID. Removing stale state file."
    Remove-StateFile -StateFile $paths.StateFile
    exit 0
}

$pidValue = [int]$state.pid
$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue

if ($null -eq $process) {
    Write-Host "[STOPPED] Recorded PID is not running. Removing stale state file."
    Write-Host "stale PID: $pidValue"
    Remove-StateFile -StateFile $paths.StateFile
    exit 0
}

if (-not (Test-ProcessMatchesState -Process $process -State $state)) {
    Write-Warning "Recorded PID is running but does not match the recorded bot process. Leaving process untouched and removing stale state."
    Write-Host "PID: $pidValue"
    Write-Host "process name: $($process.ProcessName)"
    Remove-StateFile -StateFile $paths.StateFile
    exit 0
}

Write-Host "[STOPPING] AIWorkflow Discord bot."
Write-Host "PID: $pidValue"

try {
    Stop-Process -Id $pidValue -ErrorAction Stop
}
catch {
    $afterStopError = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($null -eq $afterStopError) {
        Remove-StateFile -StateFile $paths.StateFile
        Write-Host "[STOPPED] Recorded bot process was already gone."
        exit 0
    }

    Write-Error "Failed to stop recorded bot process: PID $pidValue"
    exit 1
}

$stopped = Wait-RecordedProcessExit -ProcessId $pidValue -TimeoutSeconds 15 -PollMilliseconds 250
if (-not $stopped) {
    $finalProcess = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($null -eq $finalProcess) {
        Remove-StateFile -StateFile $paths.StateFile
        Write-Host "[STOPPED] AIWorkflow Discord bot stopped after final check."
        exit 0
    }

    if (-not (Test-ProcessMatchesState -Process $finalProcess -State $state)) {
        Write-Warning "Recorded PID is still alive but no longer matches the recorded bot process. Removing stale state without stopping that process."
        Write-Host "PID: $pidValue"
        Write-Host "process name: $($finalProcess.ProcessName)"
        Remove-StateFile -StateFile $paths.StateFile
        exit 0
    }

    Write-Error "Recorded bot process is still running after stop timeout: PID $pidValue"
    exit 1
}

Remove-StateFile -StateFile $paths.StateFile
Write-Host "[STOPPED] AIWorkflow Discord bot stopped."
exit 0
