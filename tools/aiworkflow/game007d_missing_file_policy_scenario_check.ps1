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

function New-ScenarioDataCopy {
    param([string]$SourceDataDir, [string]$ScenarioRoot, [string]$Name)

    $target = Join-Path $ScenarioRoot $Name
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    New-Item -ItemType Directory -Path $target | Out-Null
    Copy-Item -LiteralPath $SourceDataDir -Destination (Join-Path $target "Data") -Recurse -Force
    return (Join-Path $target "Data")
}

function Test-PolicySourceAnchor {
    param([string]$SourceText)

    $issues = New-Object System.Collections.Generic.List[string]
    $requiredAnchors = @(
        "kPlayableCharacterPath",
        "kDialoguePath",
        "kSkillPath",
        "kParticlePath",
        "kParticleEmitterPath",
        "kParticleEventSetPath",
        "kEnemyPath",
        "kAttributeNodePath"
    )

    foreach ($anchor in $requiredAnchors) {
        if (-not [regex]::IsMatch($SourceText, "LoadRequired\s*\([^\n]*$anchor")) {
            $issues.Add("missing LoadRequired source anchor for $anchor")
        }
    }

    if (-not [regex]::IsMatch($SourceText, "(?s)ResolvePatchableDataPath\s*\(\s*kStagePath\s*\).*?ResolvePatchableDataPath\s*\(\s*kSpawnPoolPath\s*\).*?LoaderFailurePolicy::Required")) {
        $issues.Add("missing required Stage/SpawnPool source anchor")
    }

    if (-not [regex]::IsMatch($SourceText, "LoadOptional\s*\([^\n]*kTownNpcPlacementPath")) {
        $issues.Add("missing LoadOptional source anchor for TownNpcPlacement")
    }

    return $issues
}

function Test-DataPolicyScenario {
    param(
        [string]$DataDir,
        [array]$RequiredFiles,
        [array]$OptionalFiles
    )

    $missingRequired = New-Object System.Collections.Generic.List[string]
    $missingOptional = New-Object System.Collections.Generic.List[string]

    foreach ($file in $RequiredFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $DataDir $file))) {
            $missingRequired.Add($file)
        }
    }

    foreach ($file in $OptionalFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $DataDir $file))) {
            $missingOptional.Add($file)
        }
    }

    return [pscustomobject]@{
        ok = ($missingRequired.Count -eq 0)
        missing_required = @($missingRequired)
        missing_optional = @($missingOptional)
    }
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

    foreach ($issue in $Issues) {
        Write-Host "FAIL $Name :: $issue"
    }
    return $false
}

$repo = Resolve-Path $RepoRoot
$sourceDataDir = Join-Path $repo "PlayGround\Data"
$loaderCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\GameDataLoader.cpp")

$requiredFiles = @(
    "PlayableCharacter.json",
    "dialogue_all_samples.json",
    "Skill.json",
    "Particle.json",
    "ParticleEmitter.json",
    "ParticleEventSet.json",
    "Enemy.json",
    "AttributeNode.json",
    "Stage.json",
    "SpawnPool.json"
)
$optionalFiles = @("TownNpcPlacement.json")

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
$scenarioRoot = Join-Path $repo "_Temp\AIWorkflowScenarios\game007d_missing_file_policy_$timestamp"
New-Item -ItemType Directory -Path $scenarioRoot -Force | Out-Null

$allOk = $true

$issues = Test-PolicySourceAnchor $loaderCpp
$allOk = (Complete-Step "source policy anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$baselineData = New-ScenarioDataCopy $sourceDataDir $scenarioRoot "baseline"
$baseline = Test-DataPolicyScenario $baselineData $requiredFiles $optionalFiles
if (-not $baseline.ok) {
    $issues.Add("baseline required files missing: $($baseline.missing_required -join ', ')")
}
if ($baseline.missing_optional.Count -ne 0) {
    $issues.Add("baseline optional files missing: $($baseline.missing_optional -join ', ')")
}
$allOk = (Complete-Step "baseline copied data policy scenario" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$requiredMissingData = New-ScenarioDataCopy $sourceDataDir $scenarioRoot "required_missing_enemy"
Remove-Item -LiteralPath (Join-Path $requiredMissingData "Enemy.json") -Force
$requiredMissing = Test-DataPolicyScenario $requiredMissingData $requiredFiles $optionalFiles
if ($requiredMissing.ok) {
    $issues.Add("required-missing scenario unexpectedly passed")
}
if ($requiredMissing.missing_required -notcontains "Enemy.json") {
    $issues.Add("required-missing scenario did not report Enemy.json")
}
$allOk = (Complete-Step "required missing file scenario" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$optionalMissingData = New-ScenarioDataCopy $sourceDataDir $scenarioRoot "optional_missing_town_npc"
Remove-Item -LiteralPath (Join-Path $optionalMissingData "TownNpcPlacement.json") -Force
$optionalMissing = Test-DataPolicyScenario $optionalMissingData $requiredFiles $optionalFiles
if (-not $optionalMissing.ok) {
    $issues.Add("optional-missing scenario failed required policy: $($optionalMissing.missing_required -join ', ')")
}
if ($optionalMissing.missing_optional -notcontains "TownNpcPlacement.json") {
    $issues.Add("optional-missing scenario did not report TownNpcPlacement.json as optional")
}
$allOk = (Complete-Step "optional missing file scenario" $issues) -and $allOk

Write-Host "Scenario workspace: $scenarioRoot"

if (-not $allOk) {
    exit 1
}

exit 0
