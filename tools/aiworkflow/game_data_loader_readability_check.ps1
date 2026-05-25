param(
    [string]$RepoRoot = "",
    [string]$DataDir = "PlayGround\Data"
)

$ErrorActionPreference = "Stop"

function Add-Line {
    param([string]$Text)
    $script:lines.Add($Text)
    Write-Host $Text
}

function Add-Failure {
    param([string]$Text)
    $script:failed++
    Add-Line "[FAIL] $Text"
}

function Add-Warning {
    param([string]$Text)
    $script:warningCount++
    Add-Line "[WARN] $Text"
}

function Add-Ok {
    param([string]$Text)
    Add-Line "[OK]   $Text"
}

function Read-Json {
    param([string]$Path)
    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "JSON file is empty."
    }
    $trimmed = $raw.TrimStart()
    $topLevel = if ($trimmed.StartsWith("[")) {
        "array"
    }
    elseif ($trimmed.StartsWith("{")) {
        "object"
    }
    else {
        "unknown"
    }
    return [pscustomobject]@{
        value = ($raw | ConvertFrom-Json)
        top_level = $topLevel
    }
}

function As-Array {
    param($Value)
    if ($null -eq $Value) {
        return @()
    }
    if ($Value -is [System.Array]) {
        return @($Value)
    }
    return @($Value)
}

function Get-Prop {
    param($Object, [string]$Name)
    if ($null -eq $Object -or $null -eq $Object.PSObject.Properties[$Name]) {
        return $null
    }
    return $Object.$Name
}

function Test-HasProp {
    param($Object, [string]$Name)
    return $null -ne $Object -and $null -ne $Object.PSObject.Properties[$Name]
}

function Get-IdSet {
    param($Items, [string]$Field, [string]$Label)
    $set = New-Object "System.Collections.Generic.HashSet[string]"
    $seen = @{}
    foreach ($item in As-Array $Items) {
        if (-not (Test-HasProp $item $Field)) {
            Add-Failure "$Label item is missing $Field."
            continue
        }
        $id = [string](Get-Prop $item $Field)
        if ([string]::IsNullOrWhiteSpace($id)) {
            Add-Failure "$Label item has blank $Field."
            continue
        }
        if ($seen.ContainsKey($id)) {
            Add-Failure "$Label has duplicate $Field value: $id"
        }
        $seen[$id] = $true
        [void]$set.Add($id)
    }
    return $set
}

function Assert-Ref {
    param(
        [string]$Label,
        $Value,
        [System.Collections.Generic.HashSet[string]]$TargetIds,
        [switch]$AllowNegative
    )
    if ($null -eq $Value) {
        Add-Failure "$Label is missing."
        return
    }
    $text = [string]$Value
    if ($AllowNegative -and $text -eq "-1") {
        return
    }
    if (-not $TargetIds.Contains($text)) {
        Add-Failure "$Label references missing id: $text"
    }
}

function Assert-ArrayFile {
    param([string]$Key, [string]$Label)
    $value = $script:data[$Key]
    if ($script:topLevel[$Key] -ne "array") {
        Add-Failure "$Label must be a top-level JSON array."
        return @()
    }
    $items = @(As-Array $value)
    if ($items.Count -eq 0) {
        Add-Failure "$Label must not be empty because GameDataLoader loads it at startup."
    }
    else {
        Add-Ok "$Label array is present with $($items.Count) item(s)."
    }
    return @($items)
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = Join-Path $PSScriptRoot "..\.."
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$dataRoot = if ([System.IO.Path]::IsPathRooted($DataDir)) {
    [System.IO.Path]::GetFullPath($DataDir)
}
else {
    [System.IO.Path]::GetFullPath((Join-Path $repo $DataDir))
}

$repoFull = [System.IO.Path]::GetFullPath($repo).TrimEnd("\", "/")
if (-not $dataRoot.StartsWith($repoFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "DataDir escapes repository root: $DataDir"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
$outDir = Join-Path $repo "_Temp\AIWorkflowReports"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$report = Join-Path $outDir "game_data_loader_readability_$timestamp.txt"

$script:lines = New-Object System.Collections.Generic.List[string]
$script:failed = 0
$script:warningCount = 0
$script:data = @{}
$script:topLevel = @{}

Add-Line "AIWorkflow Game Data Loader Readability Check"
Add-Line "Timestamp: $timestamp"
Add-Line "Repository: $repo"
Add-Line "DataDir: $DataDir"
Add-Line ""

$expectedFiles = @(
    @{ key = "PlayableCharacter"; path = "PlayableCharacter.json"; label = "PlayableCharacter.json" },
    @{ key = "Dialogue"; path = "dialogue_all_samples.json"; label = "dialogue_all_samples.json" },
    @{ key = "Skill"; path = "Skill.json"; label = "Skill.json" },
    @{ key = "Particle"; path = "Particle.json"; label = "Particle.json" },
    @{ key = "ParticleEmitter"; path = "ParticleEmitter.json"; label = "ParticleEmitter.json" },
    @{ key = "Enemy"; path = "Enemy.json"; label = "Enemy.json" },
    @{ key = "AttributeNode"; path = "AttributeNode.json"; label = "AttributeNode.json" },
    @{ key = "Stage"; path = "Stage.json"; label = "Stage.json" },
    @{ key = "SpawnPool"; path = "SpawnPool.json"; label = "SpawnPool.json" },
    @{ key = "TownNpcPlacement"; path = "TownNpcPlacement.json"; label = "TownNpcPlacement.json" }
)

Add-Line "Loader file presence and JSON parse:"
foreach ($entry in $expectedFiles) {
    $path = Join-Path $dataRoot $entry.path
    if (-not (Test-Path -LiteralPath $path)) {
        Add-Failure "$($entry.label) is missing but GameDataLoader expects it."
        continue
    }
    try {
        $parsed = Read-Json -Path $path
        $script:data[$entry.key] = $parsed.value
        $script:topLevel[$entry.key] = $parsed.top_level
        Add-Ok "$($entry.label) exists and parses."
    }
    catch {
        Add-Failure "$($entry.label) parse failed: $($_.Exception.Message)"
    }
}

$optionalUserDataPath = Join-Path $dataRoot "UserData.json"
if (Test-Path -LiteralPath $optionalUserDataPath) {
    try {
        $parsed = Read-Json -Path $optionalUserDataPath
        $script:data["UserData"] = $parsed.value
        $script:topLevel["UserData"] = $parsed.top_level
        Add-Ok "UserData.json exists and parses. This file is treated as local save data, not required publish data."
    }
    catch {
        Add-Failure "UserData.json parse failed: $($_.Exception.Message)"
    }
}
else {
    Add-Ok "UserData.json is absent. This is valid for publish Data because UserDataManager owns LocalAppData save creation."
}

Add-Line ""
Add-Line "Top-level shape checks:"
$playableCharacters = Assert-ArrayFile "PlayableCharacter" "PlayableCharacter"
$dialogues = Assert-ArrayFile "Dialogue" "Dialogue"
$skills = Assert-ArrayFile "Skill" "Skill"
$particles = Assert-ArrayFile "Particle" "Particle"
$particleEmitters = Assert-ArrayFile "ParticleEmitter" "ParticleEmitter"
$enemies = Assert-ArrayFile "Enemy" "Enemy"
$attributeNodes = Assert-ArrayFile "AttributeNode" "AttributeNode"
$stages = Assert-ArrayFile "Stage" "Stage"
$spawnPools = Assert-ArrayFile "SpawnPool" "SpawnPool"
$userData = @()
if ($script:data.ContainsKey("UserData")) {
    $userData = Assert-ArrayFile "UserData" "UserData"
}

$town = $script:data["TownNpcPlacement"]
if ($null -ne $town) {
    if ($town -is [System.Array]) {
        Add-Failure "TownNpcPlacement.json must be a top-level object with placements, not an array."
    }
    elseif (-not (Test-HasProp $town "placements")) {
        Add-Failure "TownNpcPlacement.json is missing placements."
    }
    else {
        $placements = As-Array (Get-Prop $town "placements")
        if ($placements.Count -eq 0) {
            Add-Failure "TownNpcPlacement placements must not be empty."
        }
        else {
            Add-Ok "TownNpcPlacement object has $($placements.Count) placement(s)."
        }
    }
}

Add-Line ""
Add-Line "ID and reference checks:"
$playableIds = Get-IdSet $playableCharacters "id_" "PlayableCharacter"
$skillIds = Get-IdSet $skills "id_" "Skill"
$particleIds = Get-IdSet $particles "id_" "Particle"
$particleEmitterIds = Get-IdSet $particleEmitters "id_" "ParticleEmitter"
$enemyIds = Get-IdSet $enemies "id_" "Enemy"
$attributeNodeIds = Get-IdSet $attributeNodes "id_" "AttributeNode"
$stageIds = Get-IdSet $stages "id_" "Stage"
$spawnPoolIds = Get-IdSet $spawnPools "id_" "SpawnPool"

foreach ($stage in $stages) {
    $stageId = Get-Prop $stage "id_"
    Assert-Ref "Stage[$stageId].spawn_pool_id_" (Get-Prop $stage "spawn_pool_id_") $spawnPoolIds
}

foreach ($pool in $spawnPools) {
    $poolId = Get-Prop $pool "id_"
    $infos = As-Array (Get-Prop $pool "spawn_enemies_info_")
    if ($infos.Count -eq 0) {
        Add-Failure "SpawnPool[$poolId].spawn_enemies_info_ must not be empty."
    }
    foreach ($info in $infos) {
        Assert-Ref "SpawnPool[$poolId].spawn_enemies_info_.id_" (Get-Prop $info "id_") $enemyIds
        if ((Test-HasProp $info "weight_") -and [double](Get-Prop $info "weight_") -lt 0) {
            Add-Failure "SpawnPool[$poolId].spawn_enemies_info_.weight_ must not be negative."
        }
    }
}

foreach ($emitter in $particleEmitters) {
    $emitterId = Get-Prop $emitter "id_"
    Assert-Ref "ParticleEmitter[$emitterId].particle_setting_id_" (Get-Prop $emitter "particle_setting_id_") $particleIds
}

foreach ($node in $attributeNodes) {
    $nodeId = Get-Prop $node "id_"
    Assert-Ref "AttributeNode[$nodeId].parent_node_id_" (Get-Prop $node "parent_node_id_") $attributeNodeIds -AllowNegative
    $children = As-Array (Get-Prop $node "children_nodes_info_")
    foreach ($childInfo in $children) {
        $parts = As-Array $childInfo
        if ($parts.Count -lt 1) {
            Add-Failure "AttributeNode[$nodeId].children_nodes_info_ has an invalid child entry."
            continue
        }
        $childId = [string]$parts[0]
        if ($childId -eq [string]$nodeId) {
            Add-Failure "AttributeNode[$nodeId] cannot reference itself as a child."
        }
        Assert-Ref "AttributeNode[$nodeId].children_nodes_info_.child_id" $childId $attributeNodeIds
    }
}

foreach ($save in $userData) {
    $saveId = Get-Prop $save "id_"
    foreach ($characterId in As-Array (Get-Prop $save "unlocked_character_ids_")) {
        Assert-Ref "UserData[$saveId].unlocked_character_ids_" $characterId $playableIds
    }
    foreach ($nodeInfo in As-Array (Get-Prop $save "acquired_node_ids_")) {
        $parts = As-Array $nodeInfo
        if ($parts.Count -lt 1) {
            Add-Failure "UserData[$saveId].acquired_node_ids_ has an invalid node entry."
            continue
        }
        Assert-Ref "UserData[$saveId].acquired_node_ids_.node_id" $parts[0] $attributeNodeIds
    }
    foreach ($skillId in As-Array (Get-Prop $save "equipped_skill_ids_")) {
        Assert-Ref "UserData[$saveId].equipped_skill_ids_" $skillId $skillIds -AllowNegative
    }
    if ((Test-HasProp $save "stage_progress_") -and [double](Get-Prop $save "stage_progress_") -le 0) {
        Add-Warning "UserData[$saveId].stage_progress_ is <= 0; UserDataManager will normalize it to 1."
    }
}

if ($null -ne $town -and -not ($town -is [System.Array]) -and (Test-HasProp $town "placements")) {
    $placementIds = Get-IdSet (Get-Prop $town "placements") "placement_id" "TownNpcPlacement.placements"
    foreach ($placement in As-Array (Get-Prop $town "placements")) {
        $placementId = Get-Prop $placement "placement_id"
        if (-not (Test-HasProp $placement "npc_id")) {
            Add-Failure "TownNpcPlacement[$placementId] is missing npc_id."
        }
        if (-not (Test-HasProp $placement "position")) {
            Add-Failure "TownNpcPlacement[$placementId] is missing position."
        }
        else {
            $position = Get-Prop $placement "position"
            foreach ($axis in @("x", "y")) {
                if (-not (Test-HasProp $position $axis)) {
                    Add-Failure "TownNpcPlacement[$placementId].position is missing $axis."
                }
            }
        }
    }
    if ($placementIds.Count -gt 0) {
        Add-Ok "TownNpcPlacement placement_id values are readable."
    }
}

Add-Line ""
Add-Line "Summary:"
Add-Line "Expected loader files: $($expectedFiles.Count)"
Add-Line "Parsed loader files: $($script:data.Keys.Count)"
Add-Line "Warnings: $script:warningCount"
Add-Line "Failed: $script:failed"
Add-Line "Report: $report"

$script:lines | Set-Content -LiteralPath $report -Encoding UTF8

if ($script:failed -gt 0) {
    exit 1
}

exit 0
