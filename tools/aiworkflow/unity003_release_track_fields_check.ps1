param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Read-Utf8Text {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { throw "Required file not found: $Path" }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Complete-Step {
    param([string]$Name, [System.Collections.Generic.List[string]]$Issues)
    if ($Issues.Count -eq 0) { Write-Host "PASS $Name"; return $true }
    foreach ($issue in $Issues) { Write-Host "FAIL $Name :: $issue" }
    return $false
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$docPath = Join-Path $repo "_Docs\AIWorkflow\Unity_Release_Track_Workflow_Fields.md"
$templatePath = Join-Path $repo "_Docs\AIWorkflow\UnityReleaseTrack_Template.json"
$unity001Path = Join-Path $repo "_Docs\AIWorkflow\Unity_Project_Workflow_Profile_Requirements.md"
$unity002Path = Join-Path $repo "_Docs\AIWorkflow\Unity_Validation_Profile_Candidates.md"
$backlogPath = Join-Path $repo "_Docs\AIWorkflow\BacklogArchive.md"
$projectStatusPath = Join-Path $repo "_Docs\AIWorkflow\ProjectStatus.md"

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
try { $doc = Read-Utf8Text $docPath } catch { $issues.Add($_.Exception.Message); $doc = "" }
foreach ($anchor in @(
    '# Unity Release Track Workflow Fields',
    '## Purpose',
    '## Release Track Concept',
    '## Common Release Fields',
    '## Steam / Windows Release Fields',
    '## Google Play / Android Release Fields',
    '## Human Approval Gates',
    '## Automated Validation Fields',
    '## Forbidden Automation Without Explicit Approval',
    '## UNITY-001 / UNITY-002 Links',
    '## Non-goals'
)) {
    if (-not $doc.Contains($anchor)) { $issues.Add("missing document anchor: $anchor") }
}
foreach ($term in @('release_track_id','windows_steam','android_google_play','steam_app_id','depot','application_id','version_code','version_name','keystore','AAB','permissions','privacy_policy','production_release','human approval','publish')) {
    if (-not $doc.Contains($term)) { $issues.Add("missing required term: $term") }
}
$allOk = (Complete-Step "UNITY-003 release track document anchors" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
try {
    $templateText = Read-Utf8Text $templatePath
    $template = $templateText | ConvertFrom-Json
} catch {
    $issues.Add("template missing or invalid JSON: $($_.Exception.Message)")
    $template = $null
}
if ($null -ne $template) {
    foreach ($prop in @('release_track_schema_id','engine','tracks','approval_gates','forbidden_without_approval')) {
        if (-not ($template.PSObject.Properties.Name -contains $prop)) { $issues.Add("template missing top-level property: $prop") }
    }
    if ($template.engine -ne 'unity') { $issues.Add("template engine must be unity") }
    $targets = @($template.tracks | ForEach-Object { $_.target })
    if (-not ($targets -contains 'windows_steam')) { $issues.Add("template missing windows_steam track") }
    if (-not ($targets -contains 'android_google_play')) { $issues.Add("template missing android_google_play track") }
    $trackIds = @($template.tracks | ForEach-Object { $_.release_track_id })
    foreach ($id in @('example_windows_steam_release','example_android_google_play_release')) {
        if (-not ($trackIds -contains $id)) { $issues.Add("template missing release_track_id: $id") }
    }
}
$allOk = (Complete-Step "UnityReleaseTrack template contract" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
try { $unity001 = Read-Utf8Text $unity001Path } catch { $issues.Add($_.Exception.Message); $unity001 = "" }
try { $unity002 = Read-Utf8Text $unity002Path } catch { $issues.Add($_.Exception.Message); $unity002 = "" }
try { $backlog = Read-Utf8Text $backlogPath } catch { $issues.Add($_.Exception.Message); $backlog = "" }
try { $projectStatus = Read-Utf8Text $projectStatusPath } catch { $issues.Add($_.Exception.Message); $projectStatus = "" }
if (-not $unity001.Contains('UNITY-003 should define release-track workflow fields')) { $issues.Add("UNITY-001 release boundary missing") }
if (-not $unity002.Contains('UNITY-003 release boundary')) { $issues.Add("UNITY-002 release boundary missing") }
if (-not $backlog.Contains('| UNITY-003 | P2 | done | release | Define release-track workflow fields for Steam and Google Play |')) { $issues.Add("BacklogArchive missing done UNITY-003 row") }
if (-not $projectStatus.Contains('UNITY-003')) { $issues.Add("ProjectStatus missing UNITY-003 update") }
if (-not $projectStatus.Contains('release-track workflow fields')) { $issues.Add("ProjectStatus missing release-track wording") }
$allOk = (Complete-Step "workflow state and Unity boundary references" $issues) -and $allOk

if (-not $allOk) { exit 1 }
exit 0
