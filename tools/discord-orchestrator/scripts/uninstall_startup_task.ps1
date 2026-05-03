$ErrorActionPreference = "Stop"

$taskNames = @(
    "AIWorkflowDiscordBot-Startup",
    "AIWorkflowDiscordBot-Watchdog"
)

Write-Host "Uninstalling AIWorkflow Discord Bot Scheduled Tasks for the current user."

foreach ($taskName in $taskNames) {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        Write-Host "Task not found: $taskName"
        continue
    }

    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed task: $taskName"
}

Write-Host "[UNINSTALLED] Scheduled task uninstall step completed."
exit 0
