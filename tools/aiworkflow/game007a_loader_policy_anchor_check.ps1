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
$loaderCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\GameDataLoader.cpp")

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "GameDataLoader has patchable data path resolver" $loaderCpp "ResolvePatchableDataPath\s*\(")) { $issues.Add("missing ResolvePatchableDataPath helper") }
if (-not (Assert-SourcePattern "Resolver preserves absolute paths" $loaderCpp "(?s)std::filesystem::path\s+requested_path.*?requested_path\.is_absolute\(\)")) { $issues.Add("resolver does not preserve absolute paths") }
if (-not (Assert-SourcePattern "Resolver probes current working directory" $loaderCpp "std::filesystem::current_path\(\)\s*/\s*requested_path")) { $issues.Add("resolver does not probe current working directory") }
if (-not (Assert-SourcePattern "Resolver probes executable directory" $loaderCpp "GetModuleFileNameW\s*\(")) { $issues.Add("resolver does not probe executable directory") }
if (-not (Assert-SourcePattern "Resolver returns stable fallback" $loaderCpp "return\s+requested_path\.string\s*\(\s*\)\s*;")) { $issues.Add("resolver has no raw requested-path fallback") }
$allOk = (Complete-Step "patchable data path resolver anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "GameDataLoader has explicit load policy enum" $loaderCpp "enum\s+class\s+LoaderFailurePolicy")) { $issues.Add("missing explicit LoaderFailurePolicy enum") }
if (-not (Assert-SourcePattern "Required policy returns false" $loaderCpp "LoaderFailurePolicy::Required[\s\S]*?return\s+false\s*;")) { $issues.Add("required loader failure is not fatal") }
if (-not (Assert-SourcePattern "Optional policy continues" $loaderCpp "LoaderFailurePolicy::Optional[\s\S]*?return\s+true\s*;")) { $issues.Add("optional loader failure is not non-fatal") }
if (-not (Assert-SourcePattern "Required loader helper exists" $loaderCpp "LoadRequired\s*\(")) { $issues.Add("missing LoadRequired helper") }
if (-not (Assert-SourcePattern "Optional loader helper exists" $loaderCpp "LoadOptional\s*\(")) { $issues.Add("missing LoadOptional helper") }
$allOk = (Complete-Step "explicit loader failure policy anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Enemy load uses resolved path" $loaderCpp "LoadRequired\s*\([^\n]*kEnemyPath")) { $issues.Add("required Enemy load is not routed through policy helper") }
if (-not (Assert-SourcePattern "Stage load uses resolved paths" $loaderCpp "ResolvePatchableDataPath\s*\(\s*kStagePath\s*\)[\s\S]*ResolvePatchableDataPath\s*\(\s*kSpawnPoolPath\s*\)")) { $issues.Add("Stage/SpawnPool paths are not resolved before load") }
if (-not (Assert-SourcePattern "UserData remains separate" $loaderCpp "_UserDataMgr\.LoadUserData\s*\(\s*\)")) { $issues.Add("UserData LocalAppData load path should remain separate") }
if (-not (Assert-SourcePattern "TownNpcPlacement remains optional" $loaderCpp "LoadOptional\s*\([^\n]*kTownNpcPlacementPath")) { $issues.Add("TownNpcPlacement is not explicitly optional") }
$allOk = (Complete-Step "loader call-site policy anchor" $issues) -and $allOk

if (-not $allOk) {
    exit 1
}

exit 0
