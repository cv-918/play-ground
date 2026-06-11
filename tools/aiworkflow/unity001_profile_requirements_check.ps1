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
    if ($Issues.Count -eq 0) {
        Write-Host "PASS $Name"
        return $true
    }
    foreach ($issue in $Issues) { Write-Host "FAIL $Name :: $issue" }
    return $false
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$docPath = Join-Path $repo "_Docs\AIWorkflow\Unity_Project_Workflow_Profile_Requirements.md"
$templatePath = Join-Path $repo "_Docs\AIWorkflow\UnityProjectProfile_Template.json"
$backlogPath = Join-Path $repo "_Docs\AIWorkflow\BacklogArchive.md"
$projectStatusPath = Join-Path $repo "_Docs\AIWorkflow\ProjectStatus.md"

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
try { $doc = Read-Utf8Text $docPath } catch { $issues.Add($_.Exception.Message); $doc = "" }
foreach ($anchor in @(
    '# Unity Project Workflow Profile Requirements',
    '## Purpose',
    '## Required Profile Fields',
    '## Path Scope Rules',
    '## Human Approval Gates',
    '## Validation Hooks',
    '## Platform / Release Hooks',
    '## Example Profiles',
    '## UNITY-002 / UNITY-003 Boundaries'
)) {
    if (-not $doc.Contains($anchor)) { $issues.Add("missing document anchor: $anchor") }
}
foreach ($term in @('unity_version', 'Assets/Scripts', 'ProjectSettings', 'Packages/manifest.json', 'EditMode', 'PlayMode', 'StandaloneWindows64', 'Android', 'Steam', 'Google Play')) {
    if (-not $doc.Contains($term)) { $issues.Add("missing required term: $term") }
}
$allOk = (Complete-Step "UNITY-001 requirements document anchors" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
try {
    $templateText = Read-Utf8Text $templatePath
    $template = $templateText | ConvertFrom-Json
} catch {
    $issues.Add("template missing or invalid JSON: $($_.Exception.Message)")
    $template = $null
}
if ($null -ne $template) {
    foreach ($prop in @('profile_id','project_id','engine','unity','paths','validation','approval_gates','platform_targets','release_tracks')) {
        if (-not ($template.PSObject.Properties.Name -contains $prop)) { $issues.Add("template missing top-level property: $prop") }
    }
    if ($template.engine -ne 'unity') { $issues.Add("template engine must be unity") }
    if ($template.paths.scripts -ne 'Assets/Scripts') { $issues.Add("template scripts path should be Assets/Scripts") }
    if (-not ($template.platform_targets -contains 'windows_steam')) { $issues.Add("template missing windows_steam target") }
    if (-not ($template.platform_targets -contains 'android_google_play')) { $issues.Add("template missing android_google_play target") }
}
$allOk = (Complete-Step "UnityProjectProfile template contract" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
try { $backlog = Read-Utf8Text $backlogPath } catch { $issues.Add($_.Exception.Message); $backlog = "" }
try { $projectStatus = Read-Utf8Text $projectStatusPath } catch { $issues.Add($_.Exception.Message); $projectStatus = "" }
if (-not $backlog.Contains('| UNITY-001 | P1 | done | unity | Define Unity project workflow profile requirements |')) { $issues.Add("BacklogArchive missing done UNITY-001 row") }
if (-not $projectStatus.Contains('UNITY-001')) { $issues.Add("ProjectStatus missing UNITY-001 update") }
if (-not $projectStatus.Contains('Unity project workflow profile requirements')) { $issues.Add("ProjectStatus missing profile requirements wording") }
$allOk = (Complete-Step "workflow state references" $issues) -and $allOk

if (-not $allOk) { exit 1 }
exit 0
