$ErrorActionPreference = "Stop"

function Resolve-Paths {
    $scriptDir = Split-Path -Parent $PSCommandPath
    $botRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
    $repoRoot = (Resolve-Path (Join-Path $botRoot "..\..")).Path
    $stateDir = Join-Path $repoRoot "_Temp\AIWorkflowDiscordBot"
    $logsDir = Join-Path $stateDir "logs"

    [PSCustomObject]@{
        BotRoot = $botRoot
        RepoRoot = $repoRoot
        StateDir = $stateDir
        LogsDir = $logsDir
        StateFile = Join-Path $stateDir "state.json"
    }
}

function Get-State {
    param([string]$StateFile)

    if (-not (Test-Path -LiteralPath $StateFile)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    }
    catch {
        Write-Warning "State file exists but could not be parsed: $StateFile"
        return $null
    }
}

function Get-RecordedNodeProcess {
    param($State)

    if ($null -eq $State -or $null -eq $State.pid) {
        return $null
    }

    $process = Get-Process -Id ([int]$State.pid) -ErrorAction SilentlyContinue
    if ($null -ne $process -and $process.ProcessName -ieq "node") {
        if ($State.process_started_at) {
            try {
                $recordedStart = [datetime]$State.process_started_at
                $actualStart = $process.StartTime
                if ([math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) {
                    return $null
                }
            }
            catch {
                return $null
            }
        }

        return $process
    }

    return $null
}

$paths = Resolve-Paths

$packageJson = Join-Path $paths.BotRoot "package.json"
$nodeModules = Join-Path $paths.BotRoot "node_modules"
$localConfig = Join-Path $paths.RepoRoot "_Local\AIWorkflow\discord_bot.local.json"

if (-not (Test-Path -LiteralPath $packageJson)) {
    Write-Error "package.json was not found: $packageJson"
    exit 1
}

if (-not (Test-Path -LiteralPath $nodeModules)) {
    Write-Host "Run npm install first."
    exit 1
}

if (-not (Test-Path -LiteralPath $localConfig)) {
    Write-Error "Missing local Discord bot config: $localConfig"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($env:AIWORKFLOW_DISCORD_BOT_TOKEN)) {
    Write-Error "Missing required environment variable: AIWORKFLOW_DISCORD_BOT_TOKEN"
    exit 1
}

$nodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
    Write-Error "node.exe was not found in PATH."
    exit 1
}

New-Item -ItemType Directory -Force -Path $paths.StateDir | Out-Null
New-Item -ItemType Directory -Force -Path $paths.LogsDir | Out-Null

$state = Get-State -StateFile $paths.StateFile
$existingProcess = Get-RecordedNodeProcess -State $state
if ($null -ne $existingProcess) {
    Write-Host "[RUNNING] AIWorkflow Discord bot is already running."
    Write-Host "PID: $($existingProcess.Id)"
    if ($state.stdout_log) {
        Write-Host "stdout log: $($state.stdout_log)"
    }
    if ($state.stderr_log) {
        Write-Host "stderr log: $($state.stderr_log)"
    }
    exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$stdoutLog = Join-Path $paths.LogsDir "discord_bot_$timestamp.stdout.log"
$stderrLog = Join-Path $paths.LogsDir "discord_bot_$timestamp.stderr.log"

$gitBranch = ""
$gitHead = ""
$gitHeadShort = ""
$gitHeadCommittedAt = ""
try {
    $gitBranch = (& git -C $paths.RepoRoot branch --show-current 2>$null).Trim()
    $gitHead = (& git -C $paths.RepoRoot rev-parse HEAD 2>$null).Trim()
    $gitHeadShort = (& git -C $paths.RepoRoot rev-parse --short HEAD 2>$null).Trim()
    $gitHeadCommittedAt = (& git -C $paths.RepoRoot log -1 --format=%cI 2>$null).Trim()
}
catch {
    Write-Warning "Could not record Git HEAD in bot state: $($_.Exception.Message)"
}

$process = Start-Process `
    -FilePath $nodeCommand.Source `
    -ArgumentList @("src/index.js") `
    -WorkingDirectory $paths.BotRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru

$state = [PSCustomObject]@{
    pid = $process.Id
    started_at = (Get-Date).ToString("o")
    process_started_at = $process.StartTime.ToString("o")
    command = "node src/index.js"
    working_directory = $paths.BotRoot
    git_branch = $gitBranch
    git_head = $gitHead
    git_head_short = $gitHeadShort
    git_head_committed_at = $gitHeadCommittedAt
    stdout_log = $stdoutLog
    stderr_log = $stderrLog
}

$state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $paths.StateFile -Encoding UTF8
Set-Content -LiteralPath (Join-Path $paths.StateDir "latest_stdout_log.txt") -Value $stdoutLog -Encoding UTF8
Set-Content -LiteralPath (Join-Path $paths.StateDir "latest_stderr_log.txt") -Value $stderrLog -Encoding UTF8

Write-Host "[STARTED] AIWorkflow Discord bot started in the background."
Write-Host "PID: $($process.Id)"
Write-Host "stdout log: $stdoutLog"
Write-Host "stderr log: $stderrLog"
exit 0
