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

function Assert-SourcePattern {
    param(
        [string]$Name,
        [string]$Text,
        [string]$Pattern
    )
    if (-not [regex]::IsMatch($Text, $Pattern)) {
        Write-Host "FAIL source anchor: $Name"
        return $false
    }
    return $true
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
$jsonDataManager = Read-Utf8Text (Join-Path $repo "PlayGround\Project\EngineSystems\Json\JsonDataManager.h")
$skillDefinition = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\SkillDefinitionDataManager.cpp")
$stageLoader = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\StageJsonDataManager.cpp")
$townPlacement = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\TownNpcPlacementDataManager.cpp")

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Generic JsonDataManager uses local staging table" $jsonDataManager "std::unordered_map\s*<\s*_uint\s*,\s*T\s*>\s+loaded_data_table")) { $issues.Add("generic loader does not use local staging table") }
if (-not (Assert-SourcePattern "Generic JsonDataManager returns false on duplicate id" $jsonDataManager "(?s)loaded_data_table\.find\(item\.id_\).*?Duplicate ID.*?return\s+false\s*;")) { $issues.Add("generic duplicate id is not fatal") }
if (-not (Assert-SourcePattern "Generic JsonDataManager commits after duplicate scan" $jsonDataManager "(?s)data_table_\s*=\s*std::move\(loaded_data_table\)")) { $issues.Add("generic loader does not commit staged table after successful scan") }
$allOk = (Complete-Step "generic duplicate fatal policy anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "SkillDefinition uses local staging table" $skillDefinition "std::unordered_map\s*<\s*_uint\s*,\s*SkillDefinition\s*>\s+loaded_data_table")) { $issues.Add("skill definition loader does not use local staging table") }
if (-not (Assert-SourcePattern "SkillDefinition duplicate id returns false" $skillDefinition "(?s)loaded_data_table\.find\(record\.id_\).*?Duplicate skill definition ID.*?return\s+false\s*;")) { $issues.Add("skill definition duplicate id is not fatal") }
if ([regex]::IsMatch($skillDefinition, "Duplicate skill definition ID[\s\S]{0,200}continue\s*;")) { $issues.Add("skill definition duplicate still skips instead of failing") }
$allOk = (Complete-Step "skill definition duplicate fatal policy anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Stage duplicate stage id returns false" $stageLoader "Duplicate stage ID[\s\S]*?return\s+false\s*;")) { $issues.Add("stage duplicate id is not fatal") }
if (-not (Assert-SourcePattern "Stage duplicate spawn pool id returns false" $stageLoader "Duplicate spawn pool ID[\s\S]*?return\s+false\s*;")) { $issues.Add("spawn pool duplicate id is not fatal") }
$allOk = (Complete-Step "stage duplicate fatal policy anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "TownNpcPlacement duplicate placement remains skipped" $townPlacement "duplicate placement_id[\s\S]*?continue\s*;")) { $issues.Add("town placement duplicate should remain non-fatal skip") }
if ([regex]::IsMatch($townPlacement, "duplicate placement_id[\s\S]{0,240}return\s+false\s*;")) { $issues.Add("town placement duplicate became fatal but should stay non-fatal") }
$allOk = (Complete-Step "town placement duplicate non-fatal policy anchor" $issues) -and $allOk

if (-not $allOk) {
    exit 1
}

exit 0
