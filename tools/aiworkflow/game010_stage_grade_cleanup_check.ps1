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
$stageJsonPath = Join-Path $repo "PlayGround\Data\Stage.json"
$stageHeaderPath = Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\StageJsonDataManager.h"
$game009DecisionPath = Join-Path $repo "_Docs\AIWorkflow\Studio\ResultReviews\2026-06-11_game009_schema_field_decision_pass.md"

$stageJson = Read-Utf8Text $stageJsonPath
$stageHeader = Read-Utf8Text $stageHeaderPath
$game009Decision = Read-Utf8Text $game009DecisionPath

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
try {
    $parsed = $stageJson | ConvertFrom-Json
} catch {
    $issues.Add("Stage.json does not parse as JSON: $($_.Exception.Message)")
    $parsed = @()
}
if ($parsed -isnot [System.Array]) { $issues.Add("Stage.json top-level value is not an array") }
elseif ($parsed.Count -lt 1) { $issues.Add("Stage.json has no stage records") }
else {
    foreach ($stage in $parsed) {
        $props = @($stage.PSObject.Properties.Name)
        if ($props -contains "grade_") { $issues.Add("Stage id $($stage.id_) still has stale grade_ key") }
        if (-not ($props -contains "id_")) { $issues.Add("a Stage record is missing id_") }
        if (-not ($props -contains "spawn_pool_id_")) { $issues.Add("Stage id $($stage.id_) is missing spawn_pool_id_") }
    }
}
if ($stageJson -match '"grade_"\s*:') { $issues.Add("Stage.json text still contains grade_ key") }
$allOk = (Complete-Step "Stage.json stale grade removed" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not [regex]::IsMatch($stageHeader, "(?s)StageJsonInfo,\s*id_,\s*spawn_pool_id_")) {
    $issues.Add("StageJsonInfo parser no longer has expected id_/spawn_pool_id_ mapping")
}
if ([regex]::IsMatch($stageHeader, "(?s)StageJsonInfo,\s*id_,\s*grade_,\s*spawn_pool_id_")) {
    $issues.Add("StageJsonInfo parses grade_; cleanup contract should be reviewed")
}
$allOk = (Complete-Step "StageJsonInfo grade remains absent" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not $game009Decision.Contains('`grade_` | `Stage.json`')) { $issues.Add("GAME-009 decision doc missing Stage grade row") }
if (-not $game009Decision.Contains('`remove_later`')) { $issues.Add("GAME-009 decision doc no longer records remove_later for Stage grade") }
$allOk = (Complete-Step "GAME-009 removal decision still traceable" $issues) -and $allOk

if (-not $allOk) { exit 1 }
exit 0
