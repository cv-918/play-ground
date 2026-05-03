$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $PSCommandPath
$stopScript = Join-Path $scriptDir "stop_bot.ps1"
$startScript = Join-Path $scriptDir "start_bot.ps1"

Write-Host "[RESTART] Stopping AIWorkflow Discord bot if needed."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $stopScript
$stopExitCode = $LASTEXITCODE

if ($stopExitCode -ne 0) {
    Write-Error "Stop step confirmed the recorded bot process may still be running. Restart aborted."
    exit $stopExitCode
}

Write-Host "[RESTART] Stop step completed; continuing to start."
Write-Host "[RESTART] Starting AIWorkflow Discord bot."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript
exit $LASTEXITCODE
