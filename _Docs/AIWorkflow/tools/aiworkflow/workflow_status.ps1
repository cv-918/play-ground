param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-FirstMatch {
    param([string]$Text, [string]$Pattern, [string]$Default = "")
    $m = [regex]::Match($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if ($m.Success -and $m.Groups.Count -gt 1) { return $m.Groups[1].Value.Trim() }
    return $Default
}

function Get-Section {
    param([string]$Text, [string]$Heading)
    $pattern = "(?ms)^##\s+" + [regex]::Escape($Heading) + "\s*\r?\n(.*?)(?=^##\s+|\z)"
    $m = [regex]::Match($Text, $pattern)
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
    return ""
}

function Get-YamlScalar {
    param([string]$Text, [string]$Key, [string]$Default = "")
    return Get-FirstMatch -Text $Text -Pattern ("(?m)^\s*" + [regex]::Escape($Key) + "\s*:\s*(.+?)\s*$") -Default $Default
}

function Get-BacklogRows {
    param([string]$Text)
    $rows = @()
    $lines = $Text -split "`r?`n"
    foreach ($line in $lines) {
        if ($line -match '^\|\s*(WF|GAME|VAL|DOC|UNITY)-') {
            $cells = $line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() }
            if ($cells.Count -ge 8) {
                $rows += [pscustomobject]@{
                    id = $cells[0]
                    priority = $cells[1]
                    status = $cells[2]
                    kind = $cells[3]
                    item = $cells[4]
                    reason = $cells[5]
                    tool_route = $cells[6]
                    validation = $cells[7]
                }
            }
        }
    }
    return $rows
}

function Get-GitOutput {
    param([string[]]$ArgsList)

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "git"
    foreach ($arg in $ArgsList) { [void]$psi.ArgumentList.Add($arg) }
    $psi.WorkingDirectory = $RepoRoot
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false

    $p = [System.Diagnostics.Process]::Start($psi)
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()

    return [pscustomobject]@{
        exit_code = $p.ExitCode
        stdout = $stdout.Trim()
        stderr = $stderr.Trim()
    }
}

$repo = Resolve-Path $RepoRoot
$docs = Join-Path $repo "_Docs\AIWorkflow"
$projectStatusPath = Join-Path $docs "ProjectStatus.md"
$backlogPath = Join-Path $docs "Backlog.md"
$activeTaskPath = Join-Path $docs "ActiveTask.md"

$missing = @()
foreach ($path in @($projectStatusPath, $backlogPath, $activeTaskPath)) {
    if (-not (Test-Path $path)) { $missing += $path }
}

if ($missing.Count -gt 0) {
    Write-Host "[ERROR] Required workflow state files are missing:"
    foreach ($m in $missing) { Write-Host "  $m" }
    exit 2
}

$projectStatusText = Get-Content -Path $projectStatusPath -Raw -Encoding UTF8
$backlogText = Get-Content -Path $backlogPath -Raw -Encoding UTF8
$activeTaskText = Get-Content -Path $activeTaskPath -Raw -Encoding UTF8

$taskId = Get-YamlScalar -Text $activeTaskText -Key "task_id" -Default "unknown"
$title = Get-YamlScalar -Text $activeTaskText -Key "title" -Default "unknown"
$status = Get-YamlScalar -Text $activeTaskText -Key "status" -Default "unknown"
$workflowPath = Get-YamlScalar -Text $activeTaskText -Key "workflow_path" -Default "unknown"
$priority = Get-YamlScalar -Text $activeTaskText -Key "priority" -Default "unknown"
$risk = Get-YamlScalar -Text $activeTaskText -Key "risk_level" -Default "unknown"
$lastUpdated = Get-YamlScalar -Text $activeTaskText -Key "last_updated" -Default "unknown"

$humanAction = Get-Section -Text $activeTaskText -Heading "Human Action Required"
$nextRecommended = Get-Section -Text $activeTaskText -Heading "Next Recommended Task"

$workflowActual = Get-YamlScalar -Text $projectStatusText -Key "workflow_level_actual" -Default "unknown"
$workflowTarget = Get-YamlScalar -Text $projectStatusText -Key "workflow_level_target_next" -Default "unknown"

$backlogRows = Get-BacklogRows -Text $backlogText
$activeStatuses = @("todo", "analysis", "awaiting_approval", "ready_for_implementation", "in_progress", "review", "validation", "blocked", "partial_done")
$openItems = @($backlogRows | Where-Object { $_.status -in $activeStatuses })
$blockedItems = @($backlogRows | Where-Object { $_.status -eq "blocked" })
$topItems = @($openItems | Sort-Object @{Expression={
    switch ($_.priority) {
        "P0" { 0 }
        "P1" { 1 }
        "P2" { 2 }
        "P3" { 3 }
        default { 9 }
    }
}}, id | Select-Object -First 8)

$gitBranch = Get-GitOutput -ArgsList @("branch", "--show-current")
$gitStatus = Get-GitOutput -ArgsList @("status", "--short")
$gitDiffStat = Get-GitOutput -ArgsList @("diff", "--stat")
$gitCachedStat = Get-GitOutput -ArgsList @("diff", "--cached", "--stat")
$worktreeDirty = -not [string]::IsNullOrWhiteSpace($gitStatus.stdout)

$result = [pscustomobject]@{
    repository = [string]$repo
    branch = $gitBranch.stdout
    worktree_dirty = $worktreeDirty
    workflow = [pscustomobject]@{
        actual = $workflowActual
        target_next = $workflowTarget
    }
    active_task = [pscustomobject]@{
        task_id = $taskId
        title = $title
        status = $status
        workflow_path = $workflowPath
        priority = $priority
        risk_level = $risk
        last_updated = $lastUpdated
        human_action_required = $humanAction
        next_recommended_task = $nextRecommended
    }
    backlog = [pscustomobject]@{
        open_count = @($openItems).Count
        blocked_count = @($blockedItems).Count
        top_items = @($topItems)
    }
    git = [pscustomobject]@{
        status_short = $gitStatus.stdout
        diff_stat = $gitDiffStat.stdout
        staged_diff_stat = $gitCachedStat.stdout
    }
}

if ($Json) {
    $result | ConvertTo-Json -Depth 8
    exit 0
}

Write-Host "============================================================"
Write-Host "AIWorkflow Read-Only Status Summary"
Write-Host "============================================================"
Write-Host ""

Write-Host "[Repository]"
Write-Host "Root:   $repo"
Write-Host "Branch: $($gitBranch.stdout)"
Write-Host "Dirty:  $worktreeDirty"
Write-Host ""

Write-Host "[Workflow Level]"
Write-Host "Actual:      $workflowActual"
Write-Host "Target next: $workflowTarget"
Write-Host ""

Write-Host "[Active Task]"
Write-Host "ID:       $taskId"
Write-Host "Title:    $title"
Write-Host "Status:   $status"
Write-Host "Path:     $workflowPath"
Write-Host "Priority: $priority"
Write-Host "Risk:     $risk"
Write-Host "Updated:  $lastUpdated"
Write-Host ""

Write-Host "[Human Action Required]"
if ([string]::IsNullOrWhiteSpace($humanAction)) { Write-Host "(none found)" } else { Write-Host $humanAction }
Write-Host ""

Write-Host "[Next Recommended Task]"
if ([string]::IsNullOrWhiteSpace($nextRecommended)) { Write-Host "(none found)" } else { Write-Host $nextRecommended }
Write-Host ""

Write-Host "[Backlog Summary]"
Write-Host "Open items:    $(@($openItems).Count)"
Write-Host "Blocked items: $(@($blockedItems).Count)"
Write-Host ""

Write-Host "[Top Open Items]"
if (@($topItems).Count -eq 0) {
    Write-Host "(none)"
} else {
    foreach ($item in $topItems) {
        Write-Host ("- {0} [{1}/{2}] {3}" -f $item.id, $item.priority, $item.status, $item.item)
    }
}
Write-Host ""

Write-Host "[Git Status --short]"
if ([string]::IsNullOrWhiteSpace($gitStatus.stdout)) { Write-Host "(clean)" } else { Write-Host $gitStatus.stdout }
Write-Host ""

Write-Host "[Diff Stat]"
if ([string]::IsNullOrWhiteSpace($gitDiffStat.stdout)) { Write-Host "(no unstaged diff)" } else { Write-Host $gitDiffStat.stdout }
Write-Host ""

Write-Host "[Staged Diff Stat]"
if ([string]::IsNullOrWhiteSpace($gitCachedStat.stdout)) { Write-Host "(no staged diff)" } else { Write-Host $gitCachedStat.stdout }
Write-Host ""

Write-Host "============================================================"
Write-Host "Done."
Write-Host "============================================================"
exit 0
