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

$contactAttackCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\Actors\Stage\ContactAttackAbility.cpp")
$projectileAttackCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\Actors\Stage\ProjectileAttackAbility.cpp")
$bulletCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\Actors\Projectile\Bullet.cpp")
$dustCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\Actors\Props\Dust.cpp")
$runStateCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\RunState.cpp")
$stageManagerCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\StageManager.cpp")
$userProfileCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\UserProfile.cpp")
$resultViewCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\UI\Views\InGameResultView.cpp")
$enemyJson = Read-Utf8Text (Join-Path $repo "PlayGround\Data\Enemy.json")
$skillJson = Read-Utf8Text (Join-Path $repo "PlayGround\Data\Skill.json")

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Contact attack listens for collision enter" $contactAttackCpp "(?s)void\s+ContactAttackAbility::OnCollisionEnter.*?_TryAttackPlayer\(")) { $issues.Add("missing collision-enter attack handoff") }
if (-not (Assert-SourcePattern "Contact attack listens for collision stay" $contactAttackCpp "(?s)void\s+ContactAttackAbility::OnCollisionStay.*?_TryAttackPlayer\(")) { $issues.Add("missing collision-stay attack handoff") }
if (-not (Assert-SourcePattern "Contact attack gates player body layer" $contactAttackCpp "CollisionLayer::PlayerBody\s*!=\s*_other->GetLayer\(\)")) { $issues.Add("missing PlayerBody layer gate") }
if (-not (Assert-SourcePattern "Contact attack gates non-positive damage" $contactAttackCpp "info->contact_damage_\s*<=\s*0\.f")) { $issues.Add("missing contact_damage_ <= 0 gate") }
if (-not (Assert-SourcePattern "Contact attack gates per-target cooldown" $contactAttackCpp "_IsTargetOnCooldown\(_other\)")) { $issues.Add("missing cooldown gate") }
if (-not (Assert-SourcePattern "Contact attack builds HitContext" $contactAttackCpp "(?s)HitContext\s+hit;.*?hit\.source_\s*=\s*&_enemy;.*?hit\.damage_\s*=\s*final_damage;.*?hit\.knockback_direction_\s*=\s*knockback_dir;")) { $issues.Add("missing HitContext source/damage/knockback setup") }
if (-not (Assert-SourcePattern "Contact attack applies hit" $contactAttackCpp "damagable->ApplyHit\(hit\);")) { $issues.Add("missing ApplyHit call") }
if (-not (Assert-SourcePattern "Contact attack starts cooldown after live target hit" $contactAttackCpp "(?s)if\s*\(\s*!status->IsDead\(\)\s*\).*?_StartTargetCooldown\(_other,\s*DEFAULT_ATTACK_SPEED\s*-\s*info->attack_speed_\);")) { $issues.Add("missing live-target cooldown start") }
$allOk = (Complete-Step "contact attack anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Projectile attack rejects undefined projectile pattern" $projectileAttackCpp "ProjectilePattern::Undefined\s*==\s*info->projectile_pattern_")) { $issues.Add("missing undefined projectile pattern gate") }
if (-not (Assert-SourcePattern "Projectile attack gates fire cooldown" $projectileAttackCpp "fire_cooldown_acc_\s*<\s*fire_interval_")) { $issues.Add("missing fire cooldown gate") }
if (-not (Assert-SourcePattern "Projectile attack requires target" $projectileAttackCpp "auto\*\s+target\s*=\s*_enemy\.GetPrimaryTarget\(\);")) { $issues.Add("missing primary target lookup") }
if (-not (Assert-SourcePattern "Projectile attack gates attack range" $projectileAttackCpp "distance_sq\s*<=\s*range_sq")) { $issues.Add("missing range gate") }
if (-not (Assert-SourcePattern "Projectile attack spawns after attack duration" $projectileAttackCpp "(?s)attack_motion_elapsed_\s*>=\s*attack_duration.*?_SpawnProjectile\(_enemy\);.*?fired_in_current_attack_\s*=\s*true;")) { $issues.Add("missing duration-gated projectile spawn") }
if (-not (Assert-SourcePattern "Projectile attack requests scene projectile spawn" $projectileAttackCpp "scene->SpawnProjectile\(&_enemy,\s*pos,\s*target_pos,\s*info->projectile_damage_,\s*speed,\s*reaction\);")) { $issues.Add("missing scene SpawnProjectile request") }
if (-not (Assert-SourcePattern "Projectile attack data has projectile configuration" $enemyJson '"projectile_pattern_"\s*:\s*[12]')) { $issues.Add("Enemy.json has no configured projectile-pattern enemy") }
$allOk = (Complete-Step "projectile attack anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Bullet collision builds HitContext" $bulletCpp "(?s)void\s+Bullet::OnCollisionEnter.*?HitContext\s+hit;.*?hit\.source_\s*=\s*owner_;.*?hit\.damage_\s*=\s*damage_;")) { $issues.Add("missing bullet HitContext setup") }
if (-not (Assert-SourcePattern "Bullet collision applies hit" $bulletCpp "ApplyHit\(hit\);")) { $issues.Add("missing bullet ApplyHit") }
if (-not (Assert-SourcePattern "Bullet collision destroys projectile" $bulletCpp "ReserveDestruction\(\);")) { $issues.Add("missing ReserveDestruction after bullet collision") }
if (-not (Assert-SourcePattern "Skill data includes player projectile node" $skillJson '"kind_"\s*:\s*"SpawnProjectile"')) { $issues.Add("Skill.json has no SpawnProjectile node") }
$allOk = (Complete-Step "bullet and player projectile anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "Enemy death records kill reward" $stageManagerCpp "_RunState\.GetEnemyKillReward\(_info\);")) { $issues.Add("missing RunState kill reward recording") }
if (-not (Assert-SourcePattern "Enemy death marks stage clear eligibility" $stageManagerCpp "(?s)if\s*\(\s*_RunState\.IsStageClearEligible\(\)\s*\).*?MarkCanProgressNextStage\(\);")) { $issues.Add("missing stage clear eligibility handoff") }
if (-not (Assert-SourcePattern "Enemy death gates dust by resource count/object manager/node level" $stageManagerCpp "_info->dust_resource_count_\s*<=\s*0\s*\|\|\s*object_manager_\s*==\s*nullptr\s*\|\|\s*dusty_node_lv\s*<=\s*0")) { $issues.Add("missing dust spawn guard") }
if (-not (Assert-SourcePattern "Enemy death spawns dust props" $stageManagerCpp "SpawnProps\(PropsType::Dust,\s*creation_info,\s*\(void\*\)&_info->dust_reward_\);")) { $issues.Add("missing dust prop spawn") }
if (-not (Assert-SourcePattern "Dust collector collision starts bounce" $dustCpp "(?s)CollisionLayer::PlayerCollector.*?BeginBounce\(_other->GameObject\(\)\);")) { $issues.Add("missing player collector bounce start") }
if (-not (Assert-SourcePattern "Dust destruction records earned coin count" $dustCpp "_RunState\.IncreaseEarnedCoinCount\(dust_amount_\);")) { $issues.Add("missing dust earned coin increment on destroy") }
if (-not (Assert-SourcePattern "RunState enemy reward increments kill and experience" $runStateCpp "(?s)\+\+kill_count_;.*?gained_experience_\s*\+=\s*_info->exp_reward_;")) { $issues.Add("missing kill count/experience reward") }
if (-not (Assert-SourcePattern "UserProfile applies dust and experience result" $userProfileCpp "(?s)IncreaseCoins\(applied_coin_count\);.*?experience_\s*\+=\s*_result\.gained_experience_;")) { $issues.Add("missing profile coin/experience application") }
$allOk = (Complete-Step "dust and reward anchor" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
if (-not (Assert-SourcePattern "StageManager timer expiration reaches result" $stageManagerCpp "(?s)stage_elapsed_time_\s*>=\s*stage_duration_.*?_RunState\.MarkEndReason\(RunEndReason::TimeExpired\);.*?ChangeState\(StageState::Result\);")) { $issues.Add("missing TimeExpired -> Result flow") }
if (-not (Assert-SourcePattern "StageManager player death reaches result" $stageManagerCpp "(?s)player_death_elapsed_time_\s*>=\s*PLAYER_DEATH_SEQUENCE_DURATION.*?ChangeState\(StageState::Result\);")) { $issues.Add("missing PlayerDying -> Result flow") }
if (-not (Assert-SourcePattern "StageManager stage-progress action applies stage result" $stageManagerCpp "(?s)_RunState\.MarkEndReason\(RunEndReason::StageProgressed\);.*?ProgressRunSessionResult\(true\);.*?ChangeScene\(SceneType::InGame,\s*true\);")) { $issues.Add("missing StageProgressed apply/restart flow") }
if (-not (Assert-SourcePattern "StageManager exit applies run result" $stageManagerCpp "(?s)void\s+StageManager::_OnExit\(\).*?ProgressRunSessionResult\(\);.*?ChangeScene\(SceneType::OutGame\);")) { $issues.Add("missing exit result application flow") }
if (-not (Assert-SourcePattern "Result view shows player death failure label" $resultViewCpp "(?s)RunEndReason::PlayerDied.*?=== Stage Failed ===")) { $issues.Add("missing PlayerDied result label") }
if (-not (Assert-SourcePattern "Result view shows time-expired completion label" $resultViewCpp "(?s)RunEndReason::TimeExpired.*?=== Run Complete ===")) { $issues.Add("missing TimeExpired result label") }
if (-not (Assert-SourcePattern "Result view shows abandoned label" $resultViewCpp "(?s)RunEndReason::Abandoned.*?=== Run Abandoned ===")) { $issues.Add("missing Abandoned result label") }
if (-not (Assert-SourcePattern "Result view displays half reward for death and zero for ineligible results" $resultViewCpp "(?s)displayed_coin_count\s*=\s*result\.result_apply_eligible_.*?RunEndReason::PlayerDied.*?result\.earned_coin_count_\s*>>\s*1.*?:\s*0;")) { $issues.Add("missing displayed reward policy") }
$allOk = (Complete-Step "result and restart anchor" $issues) -and $allOk

if (-not $allOk) {
    exit 1
}

exit 0
