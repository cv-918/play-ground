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
$stageCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\Json\StageJsonDataManager.cpp")

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Stage loader uses local stage table before commit" $stageCpp "std::unordered_map\s*<\s*_uint\s*,\s*StageJsonInfo\s*>\s+loaded_stage_table")) { $issues.Add("missing loaded_stage_table local staging map") }
if (-not (Assert-SourcePattern "Stage loader uses local spawn pool table before commit" $stageCpp "std::unordered_map\s*<\s*_uint\s*,\s*StageSpawnPoolJsonInfo\s*>\s+loaded_pool_table")) { $issues.Add("missing loaded_pool_table local staging map") }
if (-not (Assert-SourcePattern "Stage loader commits after both files parse" $stageCpp "(?s)stage_table_\s*=\s*std::move\(loaded_stage_table\).*?pool_table_\s*=\s*std::move\(loaded_pool_table\)")) { $issues.Add("missing final two-phase commit after both loads") }
if ([regex]::IsMatch($stageCpp, "(?s)_bool\s+StageJsonDataManager::Load.*?stage_table_\.clear\(\).*?pool_table_\.clear\(\)")) { $issues.Add("persistent tables are still cleared before successful full load") }
$allOk = (Complete-Step "stage two-phase commit anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Stage loader catches json exceptions" $stageCpp "catch\s*\(\s*const\s+nlohmann::json::exception\s*&\s*e\s*\)")) { $issues.Add("missing nlohmann::json::exception catch") }
if (-not (Assert-SourcePattern "Stage loader logs parse/open failures" $stageCpp "_SYSTEM_LOG_ERROR\s*\(")) { $issues.Add("missing system error log for failure path") }
if (-not (Assert-SourcePattern "Stage loader reports stage parse failure with path" $stageCpp "Stage data json parse failed")) { $issues.Add("missing explicit stage parse failure message") }
if (-not (Assert-SourcePattern "Stage loader reports spawn pool parse failure with path" $stageCpp "Spawn pool json parse failed")) { $issues.Add("missing explicit spawn pool parse failure message") }
$allOk = (Complete-Step "stage parse failure handling anchor" $issues) -and $allOk

if (-not $allOk) {
    exit 1
}

exit 0
