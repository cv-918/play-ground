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
$docPath = Join-Path $repo "_Docs\AIWorkflow\Unity_Validation_Profile_Candidates.md"
$templatePath = Join-Path $repo "_Docs\AIWorkflow\UnityValidationProfiles_Template.json"
$unity001Path = Join-Path $repo "_Docs\AIWorkflow\Unity_Project_Workflow_Profile_Requirements.md"
$backlogPath = Join-Path $repo "_Docs\AIWorkflow\BacklogArchive.md"
$projectStatusPath = Join-Path $repo "_Docs\AIWorkflow\ProjectStatus.md"

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
try { $doc = Read-Utf8Text $docPath } catch { $issues.Add($_.Exception.Message); $doc = "" }
foreach ($anchor in @(
    '# Unity Validation Profile Candidates',
    '## Purpose',
    '## Candidate Profiles',
    '## EditMode Test Profile',
    '## PlayMode Test Profile',
    '## Package Restore / Project Open Profile',
    '## Windows Steam Build Smoke Profile',
    '## Android Google Play Build Smoke Profile',
    '## Asset Reference / Scene Smoke Profiles',
    '## Validation Selection Matrix',
    '## Non-goals'
)) {
    if (-not $doc.Contains($anchor)) { $issues.Add("missing document anchor: $anchor") }
}
foreach ($term in @('EditMode','PlayMode','StandaloneWindows64','Android','Packages/manifest.json','ProjectSettings','testResults','batchmode','build artifact','human approval')) {
    if (-not $doc.Contains($term)) { $issues.Add("missing required term: $term") }
}
$allOk = (Complete-Step "UNITY-002 validation profile document anchors" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
try {
    $templateText = Read-Utf8Text $templatePath
    $template = $templateText | ConvertFrom-Json
} catch {
    $issues.Add("template missing or invalid JSON: $($_.Exception.Message)")
    $template = $null
}
if ($null -ne $template) {
    foreach ($prop in @('profile_set_id','engine','inherits_project_profile','profiles','selection_matrix')) {
        if (-not ($template.PSObject.Properties.Name -contains $prop)) { $issues.Add("template missing top-level property: $prop") }
    }
    if ($template.engine -ne 'unity') { $issues.Add("template engine must be unity") }
    $profileIds = @($template.profiles | ForEach-Object { $_.profile_id })
    foreach ($id in @('unity_project_open','unity_editmode_tests','unity_playmode_tests','unity_windows_steam_build_smoke','unity_android_google_play_build_smoke','unity_asset_reference_check','unity_scene_open_smoke')) {
        if (-not ($profileIds -contains $id)) { $issues.Add("template missing profile_id: $id") }
    }
}
$allOk = (Complete-Step "UnityValidationProfiles template contract" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
try { $unity001 = Read-Utf8Text $unity001Path } catch { $issues.Add($_.Exception.Message); $unity001 = "" }
try { $backlog = Read-Utf8Text $backlogPath } catch { $issues.Add($_.Exception.Message); $backlog = "" }
try { $projectStatus = Read-Utf8Text $projectStatusPath } catch { $issues.Add($_.Exception.Message); $projectStatus = "" }
if (-not $unity001.Contains('UNITY-002 should define concrete validation profile candidates')) { $issues.Add("UNITY-001 handoff boundary missing") }
if (-not $backlog.Contains('| UNITY-002 | P2 | done | unity | Define Unity validation profile candidates |')) { $issues.Add("BacklogArchive missing done UNITY-002 row") }
if (-not $projectStatus.Contains('UNITY-002')) { $issues.Add("ProjectStatus missing UNITY-002 update") }
if (-not $projectStatus.Contains('Unity validation profile candidates')) { $issues.Add("ProjectStatus missing validation profile wording") }
$allOk = (Complete-Step "workflow state and UNITY-001 boundary references" $issues) -and $allOk

if (-not $allOk) { exit 1 }
exit 0
