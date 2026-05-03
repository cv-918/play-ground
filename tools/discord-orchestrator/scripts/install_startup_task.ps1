$ErrorActionPreference = "Stop"

function Resolve-Paths {
    $scriptDir = Split-Path -Parent $PSCommandPath
    $botRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

    [PSCustomObject]@{
        BotRoot = $botRoot
        StartBat = Join-Path $botRoot "start_bot.bat"
    }
}

function Register-BotTask {
    param(
        [string]$TaskName,
        $Trigger,
        [string]$Description,
        [string]$StartBat,
        [string]$WorkingDirectory
    )

    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($null -ne $existing) {
        Write-Host "Existing task found. Replacing: $TaskName"
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    else {
        Write-Host "Creating task: $TaskName"
    }

    $action = New-ScheduledTaskAction `
        -Execute "cmd.exe" `
        -Argument "/c `"$StartBat`"" `
        -WorkingDirectory $WorkingDirectory

    $userId = "$env:USERDOMAIN\$env:USERNAME"
    if ([string]::IsNullOrWhiteSpace($env:USERDOMAIN)) {
        $userId = $env:USERNAME
    }

    $principal = New-ScheduledTaskPrincipal `
        -UserId $userId `
        -LogonType Interactive `
        -RunLevel LeastPrivilege

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $Trigger `
        -Principal $principal `
        -Description $Description | Out-Null

    Write-Host "Registered task: $TaskName"
    Write-Host "Action: cmd.exe /c `"$StartBat`""
}

$paths = Resolve-Paths

if (-not (Test-Path -LiteralPath $paths.StartBat)) {
    Write-Error "start_bot.bat was not found: $($paths.StartBat)"
    exit 1
}

Write-Host "Installing AIWorkflow Discord Bot Scheduled Tasks for the current user."
Write-Host "This script is explicit and user-run only. Normal start_bot.bat does not install scheduler tasks."
Write-Host "Because start_bot.bat is idempotent, the watchdog task will not create duplicate bot processes."

$startupTrigger = New-ScheduledTaskTrigger -AtLogOn
$watchdogTrigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

Register-BotTask `
    -TaskName "AIWorkflowDiscordBot-Startup" `
    -Trigger $startupTrigger `
    -Description "Start the local AIWorkflow Discord read-only bot at user logon." `
    -StartBat $paths.StartBat `
    -WorkingDirectory $paths.BotRoot

Register-BotTask `
    -TaskName "AIWorkflowDiscordBot-Watchdog" `
    -Trigger $watchdogTrigger `
    -Description "Idempotently check/start the local AIWorkflow Discord read-only bot every 5 minutes." `
    -StartBat $paths.StartBat `
    -WorkingDirectory $paths.BotRoot

Write-Host "[INSTALLED] Scheduled tasks are installed."
exit 0
