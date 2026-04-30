param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Get-Scalar {
    param(
        [string]$Text,
        [string]$Key,
        [string]$Default = ""
    )

    if ([string]::IsNullOrEmpty($Text)) {
        return $Default
    }

    $pattern = "(?m)^\s*" + [regex]::Escape($Key) + "\s*:\s*(.*?)\s*$"
    $m = [regex]::Match($Text, $pattern)

    if (-not $m.Success -or $m.Groups.Count -lt 2) {
        return $Default
    }

    $value = [string]$m.Groups[1].Value
    if ($null -eq $value) {
        return $Default
    }

    $value = $value.Trim()

    if ($value.Length -ge 2) {
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
    }

    return $value
}

function Get-SectionText {
    param(
        [string]$Text,
        [string]$Heading
    )

    if ([string]::IsNullOrEmpty($Text)) {
        return ""
    }

    $pattern = "(?ms)^##\s+" + [regex]::Escape($Heading) + "\s*\r?\n(.*?)(?=^##\s+|\z)"
    $m = [regex]::Match($Text, $pattern)

    if (-not $m.Success -or $m.Groups.Count -lt 2) {
        return ""
    }

    $value = [string]$m.Groups[1].Value
    if ($null -eq $value) {
        return ""
    }

    return $value.Trim()
}

function Parse-BacklogRows {
    param([string]$Text)

    $rows = @()

    if ([string]::IsNullOrEmpty($Text)) {
        return @()
    }

    $lines = $Text -split "`r?`n"

    foreach ($lineObj in $lines) {
        if ($null -eq $lineObj) {
            continue
        }

        $line = [string]$lineObj
        $trimmed = $line.Trim()

        if (-not $trimmed.StartsWith("|")) {
            continue
        }

        $body = $trimmed.Trim("|".ToCharArray())
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
            item = $cells[4]
            reason = $cells[5]
            tool_route = $cells[6]
            validation = $cells[7]
        }
    }

    return @($rows)
}

function Get-PriorityRank {
    param([string]$Priority)

    switch ($Priority) {
        "P0" { return 0 }
        "P1" { return 1 }
        "P2" { return 2 }
        "P3" { return 3 }
        default { return 9 }
    }
}

function Invoke-GitCommand {
    param([string[]]$ArgsList)

    $previousLocation = Get-Location

    try {
        Set-Location -LiteralPath $RepoRoot

        # Use PowerShell's call operator instead of ProcessStartInfo.ArgumentList.
        # Windows PowerShell 5.1 may not support ProcessStartInfo.ArgumentList reliably,
        # and attempting to call .Add() on a null ArgumentList was the source of the
        # previous "You cannot call a method on a null-valued expression" failure.
        $output = & git @ArgsList 2>&1
        $exitCode = $LASTEXITCODE

        if ($null -eq $exitCode) {
            $exitCode = 0
        }

        $text = ""
        if ($null -ne $output) {
            $text = ($output | Out-String).Trim()
        }

        return [pscustomobject]@{
            exit_code = $exitCode
            stdout = $text
            stderr = ""
        }
    }
    catch {
        return [pscustomobject]@{
            exit_code = -1
            stdout = ""
            stderr = $_.Exception.Message
        }
    }
    finally {
        Set-Location -LiteralPath $previousLocation
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path

    $docs = Join-Path $repo "_Docs\AIWorkflow"
    $projectStatusPath = Join-Path $docs "ProjectStatus.md"
    $backlogPath = Join-Path $docs "Backlog.md"
    $activeTaskPath = Join-Path $docs "ActiveTask.md"

    $missing = @()
    foreach ($path in @($projectStatusPath, $backlogPath, $activeTaskPath)) {
        if (-not (Test-Path -LiteralPath $path)) {
            $missing += $path
        }
    }

    if ($missing.Count -gt 0) {
        $message = "Required workflow state files are missing: " + ($missing -join ", ")
        if ($Json) {
            [pscustomobject]@{
                ok = $false
                error = $message
                missing = @($missing)
            } | ConvertTo-Json -Depth 4
            exit 2
        }

        Write-Host "[ERROR] $message"
        exit 2
    }

    $projectStatusText = Read-Utf8Text -Path $projectStatusPath
    $backlogText = Read-Utf8Text -Path $backlogPath
    $activeTaskText = Read-Utf8Text -Path $activeTaskPath

    $taskId = Get-Scalar -Text $activeTaskText -Key "task_id" -Default "unknown"
    $title = Get-Scalar -Text $activeTaskText -Key "title" -Default "unknown"
    $status = Get-Scalar -Text $activeTaskText -Key "status" -Default "unknown"
    $workflowPath = Get-Scalar -Text $activeTaskText -Key "workflow_path" -Default "unknown"
    $priority = Get-Scalar -Text $activeTaskText -Key "priority" -Default "unknown"
    $risk = Get-Scalar -Text $activeTaskText -Key "risk_level" -Default "unknown"
    $lastUpdated = Get-Scalar -Text $activeTaskText -Key "last_updated" -Default "unknown"

    $humanAction = Get-SectionText -Text $activeTaskText -Heading "Human Action Required"
    $nextRecommended = Get-SectionText -Text $activeTaskText -Heading "Next Recommended Task"

    $workflowActual = Get-Scalar -Text $projectStatusText -Key "workflow_level_actual" -Default "unknown"
    $workflowTarget = Get-Scalar -Text $projectStatusText -Key "workflow_level_target_next" -Default "unknown"

    $backlogRows = @(Parse-BacklogRows -Text $backlogText)

    $activeStatuses = @(
        "todo",
        "analysis",
        "awaiting_approval",
        "ready_for_implementation",
        "in_progress",
        "review",
        "fixing",
        "validation",
        "ready_to_commit",
        "blocked",
        "partial_done"
    )

    $openItems = @($backlogRows | Where-Object { $activeStatuses -contains $_.status })
    $blockedItems = @($backlogRows | Where-Object { $_.status -eq "blocked" })

    $topItems = @(
        $openItems |
            Sort-Object @{ Expression = { Get-PriorityRank -Priority $_.priority } }, id |
            Select-Object -First 8
    )

    $gitBranch = Invoke-GitCommand -ArgsList @("branch", "--show-current")
    $gitStatus = Invoke-GitCommand -ArgsList @("status", "--short")
    $gitDiffStat = Invoke-GitCommand -ArgsList @("diff", "--stat")
    $gitCachedStat = Invoke-GitCommand -ArgsList @("diff", "--cached", "--stat")

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
    if ([string]::IsNullOrWhiteSpace($humanAction)) {
        Write-Host "(none found)"
    } else {
        Write-Host $humanAction
    }
    Write-Host ""

    Write-Host "[Next Recommended Task]"
    if ([string]::IsNullOrWhiteSpace($nextRecommended)) {
        Write-Host "(none found)"
    } else {
        Write-Host $nextRecommended
    }
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
    if ([string]::IsNullOrWhiteSpace($gitStatus.stdout)) {
        Write-Host "(clean)"
    } else {
        Write-Host $gitStatus.stdout
    }
    Write-Host ""

    Write-Host "[Diff Stat]"
    if ([string]::IsNullOrWhiteSpace($gitDiffStat.stdout)) {
        Write-Host "(no unstaged diff)"
    } else {
        Write-Host $gitDiffStat.stdout
    }
    Write-Host ""

    Write-Host "[Staged Diff Stat]"
    if ([string]::IsNullOrWhiteSpace($gitCachedStat.stdout)) {
        Write-Host "(no staged diff)"
    } else {
        Write-Host $gitCachedStat.stdout
    }
    Write-Host ""

    Write-Host "============================================================"
    Write-Host "Done."
    Write-Host "============================================================"
    exit 0
}
catch {
    if ($Json) {
        [pscustomobject]@{
            ok = $false
            error = $_.Exception.Message
            category = $_.CategoryInfo.Category.ToString()
            script = "workflow_status.ps1"
            line = $_.InvocationInfo.ScriptLineNumber
            command = $_.InvocationInfo.Line
        } | ConvertTo-Json -Depth 4
        exit 1
    }

    Write-Host "[ERROR] workflow_status.ps1 failed: $($_.Exception.Message)"
    Write-Host "Line: $($_.InvocationInfo.ScriptLineNumber)"
    Write-Host "Command: $($_.InvocationInfo.Line)"
    exit 1
}
