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

function Assert-Match {
    param([string]$Name, [string]$Text, [string]$Pattern)
    if (-not [regex]::IsMatch($Text, $Pattern)) {
        Write-Host "FAIL $Name"
        return $false
    }
    return $true
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
$decisionPath = Join-Path $repo "_Docs\AIWorkflow\Studio\ResultReviews\2026-06-11_game009_schema_field_decision_pass.md"
$auditPath = Join-Path $repo "_Docs\AIWorkflow\Studio\ResultReviews\2026-06-10_game008_unused_schema_fields_audit.md"
$stageJsonPath = Join-Path $repo "PlayGround\Data\Stage.json"
$stageLoaderHeaderPath = Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\StageJsonDataManager.h"
$attributeTooltipPath = Join-Path $repo "PlayGround\Project\Gameplay\UI\Widgets\AttributeNodeToolTip.cpp"
$townPlacementParserPath = Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\TownNpcPlacementDataManager.cpp"
$townPlacementSpawnerPath = Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\TownNpcPlacementSpawner.cpp"
$stageManagerPath = Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\StageManager.cpp"
$skillHeaderPath = Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\SkillJsonDataManager.h"

$decision = Read-Utf8Text $decisionPath
$audit = Read-Utf8Text $auditPath
$stageJson = Read-Utf8Text $stageJsonPath
$stageHeader = Read-Utf8Text $stageLoaderHeaderPath
$attributeTooltip = Read-Utf8Text $attributeTooltipPath
$townParser = Read-Utf8Text $townPlacementParserPath
$townSpawner = Read-Utf8Text $townPlacementSpawnerPath
$stageManager = Read-Utf8Text $stageManagerPath
$skillHeader = Read-Utf8Text $skillHeaderPath

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
foreach ($anchor in @(
    'GAME-008 audit is accepted',
    '`grade_` | `AttributeNode.json`',
    '`facing` / `facing_`',
    '`spawn_interval_`',
    '`unlock_type_`',
    '`grade_` | `Stage.json`',
    'GAME-010: Remove stale Stage.json grade_ field'
)) {
    if (-not $decision.Contains($anchor)) { $issues.Add("decision doc missing anchor: $anchor") }
}
foreach ($decisionWord in @("keep_active", "keep_reserved_inactive", "remove_later")) {
    if ($decision -notlike "*$decisionWord*") { $issues.Add("decision doc missing decision bucket: $decisionWord") }
}
$allOk = (Complete-Step "decision document anchors" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if ($audit -notmatch "GAME-008 Unused Schema Fields Audit") { $issues.Add("GAME-008 audit report missing") }
if (-not (Assert-Match "Stage.json contains stale grade_ evidence" $stageJson '"grade_"\s*:\s*0')) { $issues.Add("Stage.json grade_ stale evidence changed") }
if ([regex]::IsMatch($stageHeader, "(?s)StageJsonInfo,\s*id_,\s*grade_,\s*spawn_pool_id_")) { $issues.Add("StageJsonInfo now parses grade_; decision needs review") }
if (-not (Assert-Match "StageJsonInfo ignores grade_ anchor" $stageHeader "(?s)StageJsonInfo,\s*id_,\s*spawn_pool_id_")) { $issues.Add("StageJsonInfo parser anchor changed") }
$allOk = (Complete-Step "stage grade decision evidence" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-Match "AttributeNode tooltip consumes grade" $attributeTooltip "target_info->grade_")) { $issues.Add("AttributeNode grade consumer changed") }
if (-not (Assert-Match "Town placement parses facing" $townParser 'entry\.facing_\s*=\s*entry_json\["facing"\]')) { $issues.Add("TownNpcPlacement facing parser changed") }
if ([regex]::IsMatch($townSpawner, "facing_")) { $issues.Add("TownNpcPlacementSpawner now consumes facing_; decision needs review") }
if (-not (Assert-Match "StageManager uses global spawn interval" $stageManager "spawn_interval_\s*=\s*1\.0\s*/")) { $issues.Add("StageManager global spawn interval anchor changed") }
if (-not (Assert-Match "Skill loader parses unlock_type" $skillHeader "unlock_type_")) { $issues.Add("Skill unlock_type parser anchor changed") }
$allOk = (Complete-Step "reserved field evidence" $issues) -and $allOk

if (-not $allOk) { exit 1 }
exit 0
