param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Read-Utf8Text {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file not found: $Path"
    }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Parse-TaskRows {
    param(
        [string]$Text,
        [string]$Source
    )
    $rows = @()
    foreach ($lineObj in ($Text -split "`r?`n")) {
        $line = [string]$lineObj
        $trimmed = $line.Trim()
        if (-not $trimmed.StartsWith("|")) { continue }
        if ($trimmed -match "^\|\s*---") { continue }
        if ($trimmed -match "^\|\s*ID\s*\|") { continue }
        $cells = @($trimmed.Trim("|".ToCharArray()).Split("|".ToCharArray()) | ForEach-Object { ([string]$_).Trim() })
        if ($cells.Count -ne 8) { continue }
        if ($cells[0] -eq "_none_") { continue }
        if ($cells[0] -notmatch "^(WF|GAME|VAL|DOC|UNITY|SUPERBOT)-") { continue }
        $rows += [pscustomobject]@{
            id = $cells[0]
            priority = $cells[1]
            status = $cells[2]
            kind = $cells[3]
            item = $cells[4]
            reason = $cells[5]
            tool_route = $cells[6]
            validation = $cells[7]
            source = $Source
        }
    }
    return @($rows)
}

function Get-ActiveTaskId {
    param([string]$Text)
    $m = [regex]::Match($Text, "(?m)^task_id[ \t]*:[ \t]*(.*?)[ \t]*$")
    if (-not $m.Success) { return "" }
    return $m.Groups[1].Value.Trim().Trim('"').Trim("'")
}

function Complete-Step {
    param(
        [string]$Name,
        [System.Collections.Generic.List[string]]$Issues
    )
    if ($Issues.Count -eq 0) {
        Write-Host "PASS $Name"
        return $true
    }
    foreach ($issue in $Issues) { Write-Host "FAIL $Name :: $issue" }
    return $false
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$docs = Join-Path $repo "_Docs\AIWorkflow"
$backlogPath = Join-Path $docs "Backlog.md"
$archivePath = Join-Path $docs "BacklogArchive.md"
$activeTaskPath = Join-Path $docs "ActiveTask.md"

$backlogText = Read-Utf8Text $backlogPath
$archiveText = Read-Utf8Text $archivePath
$activeTaskText = Read-Utf8Text $activeTaskPath

$backlogRows = @(Parse-TaskRows -Text $backlogText -Source "Backlog.md")
$archiveRows = @(Parse-TaskRows -Text $archiveText -Source "BacklogArchive.md")
$allRows = @($backlogRows + $archiveRows)
$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
if ($backlogText -notmatch "## Active Backlog Items") { $issues.Add("Backlog.md missing Active Backlog Items section") }
if ($backlogText -notmatch "## Parked / Deferred Items") { $issues.Add("Backlog.md missing Parked / Deferred Items section") }
if ($backlogText -notmatch "BacklogArchive.md") { $issues.Add("Backlog.md missing archive pointer") }
if ($archiveText -notmatch "## Archived Done Items") { $issues.Add("BacklogArchive.md missing Archived Done Items section") }
$allOk = (Complete-Step "backlog split structure" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
foreach ($row in $backlogRows) {
    if ($row.status -eq "done") { $issues.Add("done row remains in active Backlog.md: $($row.id)") }
}
foreach ($row in $archiveRows) {
    if ($row.status -ne "done") { $issues.Add("non-done row found in archive: $($row.id) status=$($row.status)") }
}
$allOk = (Complete-Step "active/archive status partition" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$dupes = @($allRows | Group-Object id | Where-Object { $_.Count -gt 1 })
foreach ($dupe in $dupes) { $issues.Add("duplicate task id across Backlog+Archive: $($dupe.Name)") }
if ($allRows.Count -lt 100) { $issues.Add("unexpectedly low combined task row count: $($allRows.Count)") }
$allOk = (Complete-Step "combined task id integrity" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$activeTaskId = Get-ActiveTaskId $activeTaskText
if ([string]::IsNullOrWhiteSpace($activeTaskId)) {
    # Empty ActiveTask is valid when no task is selected.
} else {
    $activeMatches = @($allRows | Where-Object { $_.id -eq $activeTaskId })
    if ($activeMatches.Count -eq 0) { $issues.Add("ActiveTask id not found in Backlog or Archive: $activeTaskId") }
    if ($activeMatches.Count -gt 1) { $issues.Add("ActiveTask id has duplicate rows: $activeTaskId") }
}
$allOk = (Complete-Step "active task reference integrity" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$openRows = @($backlogRows | Where-Object { $_.status -notin @("done", "deferred") })
$deferredRows = @($backlogRows | Where-Object { $_.status -eq "deferred" })
if ($openRows.Count -eq 0) { $issues.Add("no open rows left in Backlog.md") }
if ($deferredRows.Count -eq 0) { $issues.Add("no deferred rows left in Backlog.md; expected parked section to preserve deferred work") }
$allOk = (Complete-Step "active backlog row availability" $issues) -and $allOk

Write-Host "Rows: active=$($openRows.Count), deferred=$($deferredRows.Count), archived=$($archiveRows.Count), combined=$($allRows.Count)"

if (-not $allOk) { exit 1 }
exit 0
