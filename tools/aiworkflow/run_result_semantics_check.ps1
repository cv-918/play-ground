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
        Write-Host "FAIL source contract: $Name"
        return $false
    }

    return $true
}

function New-RunSessionResult {
    param(
        [string]$Reason,
        [bool]$StageClearEligible,
        [int]$EarnedCoins,
        [int]$GainedExperience
    )

    $isRunCompleted = ($Reason -eq "TimeExpired")
    $isFailed = ($Reason -eq "PlayerDied")
    $isStageProgressed = ($Reason -eq "StageProgressed")
    $isAbandoned = ($Reason -eq "Abandoned")
    $resultApplyEligible = ($isRunCompleted -or $isFailed -or $isStageProgressed) -and (-not $isAbandoned)

    [PSCustomObject]@{
        IsCleared = $StageClearEligible
        EndReason = $Reason
        KillGoalReached = $StageClearEligible
        StageClearEligible = $StageClearEligible
        ResultApplyEligible = $resultApplyEligible
        EarnedCoins = $EarnedCoins
        GainedExperience = $GainedExperience
    }
}

function Invoke-ResultApplication {
    param(
        [int]$StageProgress,
        [int]$StageCount,
        [int]$Coins,
        [int]$Experience,
        [bool]$AlreadyApplied,
        [bool]$ApplyStageProgress,
        [object]$Result
    )

    $nextStageProgress = $StageProgress
    $nextCoins = $Coins
    $nextExperience = $Experience
    $saveRequested = $false

    if ($AlreadyApplied) {
        return [PSCustomObject]@{
            StageProgress = $nextStageProgress
            Coins = $nextCoins
            Experience = $nextExperience
            SaveRequested = $saveRequested
            AppliedGuard = $true
        }
    }

    if ($ApplyStageProgress -and $Result.StageClearEligible) {
        if ($nextStageProgress -lt $StageCount) {
            $nextStageProgress++
        }
    }

    if ($Result.ResultApplyEligible) {
        $appliedCoins = $Result.EarnedCoins
        if ($Result.EndReason -eq "PlayerDied") {
            $appliedCoins = [int]($Result.EarnedCoins -shr 1)
        }

        $nextCoins += $appliedCoins
        $nextExperience += $Result.GainedExperience
        $saveRequested = $true
    }

    [PSCustomObject]@{
        StageProgress = $nextStageProgress
        Coins = $nextCoins
        Experience = $nextExperience
        SaveRequested = $saveRequested
        AppliedGuard = $false
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
$runStateCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\RunState.cpp")
$stageManagerCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\StageManager.cpp")
$userProfileCpp = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\GamePlaySystems\UserProfile.cpp")
$commonTypeH = Read-Utf8Text (Join-Path $repo "PlayGround\Project\Gameplay\Common\CommonGamePlayType.h")

$sourceOk = $true
$sourceOk = (Assert-SourcePattern "RunEndReason includes TimeExpired" $commonTypeH "TimeExpired") -and $sourceOk
$sourceOk = (Assert-SourcePattern "RunEndReason includes PlayerDied" $commonTypeH "PlayerDied") -and $sourceOk
$sourceOk = (Assert-SourcePattern "RunEndReason includes StageProgressed" $commonTypeH "StageProgressed") -and $sourceOk
$sourceOk = (Assert-SourcePattern "RunEndReason includes Abandoned" $commonTypeH "Abandoned") -and $sourceOk
$sourceOk = (Assert-SourcePattern "RunState result_apply_eligible policy" $runStateCpp "const\s+_bool\s+result_apply_eligible\s*=\s*\(is_run_completed\s*\|\|\s*is_failed\s*\|\|\s*is_stage_progressed\)\s*&&\s*!is_abandoned;") -and $sourceOk
$sourceOk = (Assert-SourcePattern "StageManager duplicate apply guard" $stageManagerCpp "if\s*\(\s*run_session_result_applied_\s*\)\s*\r?\n\s*return;") -and $sourceOk
$sourceOk = (Assert-SourcePattern "StageManager stage progress condition" $stageManagerCpp "(?s)if\s*\(\s*_apply_stage_progress\s*&&\s*result\.stage_clear_eligible_\s*\)\s*\{.*?if\s*\(\s*curr_stage_lv\s*<\s*_StageDataMgr\.GetStageCount\(\)\s*\)\s*\{.*?_UserProfile\.IncreaseStageProgress\(\);") -and $sourceOk
$sourceOk = (Assert-SourcePattern "StageManager reward and save eligibility gate" $stageManagerCpp "(?s)if\s*\(\s*result\.result_apply_eligible_\s*\)\s*\{.*?_UserProfile\.ApplyRunSessionResult\(result\);.*?_UserDataMgr\.Save\(""Data/UserData\.json""\);") -and $sourceOk
$sourceOk = (Assert-SourcePattern "UserProfile result_apply_eligible guard" $userProfileCpp "if\s*\(\s*!\s*_result\.result_apply_eligible_\s*\)\s*\r?\n\s*return;") -and $sourceOk
$sourceOk = (Assert-SourcePattern "UserProfile PlayerDied half coin policy" $userProfileCpp "(?s)if\s*\(\s*_result\.end_reason_\s*==\s*RunEndReason::PlayerDied\s*\)\s*\{.*?applied_coin_count\s*=\s*earned_coin_count\s*>>\s*1;") -and $sourceOk

if (-not $sourceOk) {
    exit 1
}

$allOk = $true

$issues = New-Object System.Collections.Generic.List[string]
$result = New-RunSessionResult -Reason "TimeExpired" -StageClearEligible $false -EarnedCoins 10 -GainedExperience 7
$applied = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 100 -Experience 20 -AlreadyApplied $false -ApplyStageProgress $false -Result $result
if (-not $result.ResultApplyEligible) { $issues.Add("expected result_apply_eligible true") }
if ($applied.Coins -ne 110) { $issues.Add("expected full coin reward") }
if ($applied.Experience -ne 27) { $issues.Add("expected experience reward") }
if ($applied.StageProgress -ne 1) { $issues.Add("expected no stage_progress increase") }
if (-not $applied.SaveRequested) { $issues.Add("expected save request") }
$allOk = (Complete-Step "TimeExpired" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$result = New-RunSessionResult -Reason "PlayerDied" -StageClearEligible $false -EarnedCoins 11 -GainedExperience 7
$applied = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 100 -Experience 20 -AlreadyApplied $false -ApplyStageProgress $false -Result $result
if (-not $result.ResultApplyEligible) { $issues.Add("expected result_apply_eligible true") }
if ($applied.Coins -ne 105) { $issues.Add("expected half coin reward with integer shift") }
if ($applied.Experience -ne 27) { $issues.Add("expected experience reward") }
if ($applied.StageProgress -ne 1) { $issues.Add("expected no stage_progress increase") }
if (-not $applied.SaveRequested) { $issues.Add("expected save request") }
$allOk = (Complete-Step "PlayerDied" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$result = New-RunSessionResult -Reason "StageProgressed" -StageClearEligible $true -EarnedCoins 10 -GainedExperience 7
$applied = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 100 -Experience 20 -AlreadyApplied $false -ApplyStageProgress $true -Result $result
if (-not $result.ResultApplyEligible) { $issues.Add("expected result_apply_eligible true") }
if ($applied.Coins -ne 110) { $issues.Add("expected full coin reward") }
if ($applied.Experience -ne 27) { $issues.Add("expected experience reward") }
if ($applied.StageProgress -ne 2) { $issues.Add("expected stage_progress increase") }
if (-not $applied.SaveRequested) { $issues.Add("expected save request") }
$allOk = (Complete-Step "StageProgressed" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$result = New-RunSessionResult -Reason "Abandoned" -StageClearEligible $false -EarnedCoins 10 -GainedExperience 7
$applied = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 100 -Experience 20 -AlreadyApplied $false -ApplyStageProgress $false -Result $result
if ($result.ResultApplyEligible) { $issues.Add("expected result_apply_eligible false") }
if ($applied.Coins -ne 100) { $issues.Add("expected no coin reward") }
if ($applied.Experience -ne 20) { $issues.Add("expected no experience reward") }
if ($applied.StageProgress -ne 1) { $issues.Add("expected no stage_progress increase") }
if ($applied.SaveRequested) { $issues.Add("expected no save request") }
$allOk = (Complete-Step "Abandoned" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$result = New-RunSessionResult -Reason "TimeExpired" -StageClearEligible $false -EarnedCoins 10 -GainedExperience 7
$firstApply = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 100 -Experience 20 -AlreadyApplied $false -ApplyStageProgress $false -Result $result
$secondApply = Invoke-ResultApplication -StageProgress $firstApply.StageProgress -StageCount 3 -Coins $firstApply.Coins -Experience $firstApply.Experience -AlreadyApplied $true -ApplyStageProgress $false -Result $result
if (-not $secondApply.AppliedGuard) { $issues.Add("expected duplicate guard to stop second application") }
if ($secondApply.Coins -ne $firstApply.Coins) { $issues.Add("expected no duplicate coin reward") }
if ($secondApply.Experience -ne $firstApply.Experience) { $issues.Add("expected no duplicate experience reward") }
if ($secondApply.StageProgress -ne $firstApply.StageProgress) { $issues.Add("expected no duplicate stage_progress change") }
if ($secondApply.SaveRequested) { $issues.Add("expected no duplicate save request") }
$allOk = (Complete-Step "duplicate apply guard" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$eligibleReasons = @("TimeExpired", "PlayerDied", "StageProgressed")
foreach ($reason in $eligibleReasons) {
    $result = New-RunSessionResult -Reason $reason -StageClearEligible $false -EarnedCoins 0 -GainedExperience 0
    if (-not $result.ResultApplyEligible) { $issues.Add("expected eligible for $reason") }
}
foreach ($reason in @("Abandoned", "Undefined")) {
    $result = New-RunSessionResult -Reason $reason -StageClearEligible $false -EarnedCoins 0 -GainedExperience 0
    if ($result.ResultApplyEligible) { $issues.Add("expected ineligible for $reason") }
}
$allOk = (Complete-Step "result_apply_eligible_ behavior" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$progressable = New-RunSessionResult -Reason "StageProgressed" -StageClearEligible $true -EarnedCoins 0 -GainedExperience 0
$notClearEligible = New-RunSessionResult -Reason "StageProgressed" -StageClearEligible $false -EarnedCoins 0 -GainedExperience 0
$stageIncreased = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 0 -Experience 0 -AlreadyApplied $false -ApplyStageProgress $true -Result $progressable
$applyFlagOff = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 0 -Experience 0 -AlreadyApplied $false -ApplyStageProgress $false -Result $progressable
$clearFlagOff = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 0 -Experience 0 -AlreadyApplied $false -ApplyStageProgress $true -Result $notClearEligible
$atMaxStage = Invoke-ResultApplication -StageProgress 3 -StageCount 3 -Coins 0 -Experience 0 -AlreadyApplied $false -ApplyStageProgress $true -Result $progressable
if ($stageIncreased.StageProgress -ne 2) { $issues.Add("expected increase when apply flag and stage clear eligibility are true") }
if ($applyFlagOff.StageProgress -ne 1) { $issues.Add("expected no increase when apply flag is false") }
if ($clearFlagOff.StageProgress -ne 1) { $issues.Add("expected no increase when stage clear eligibility is false") }
if ($atMaxStage.StageProgress -ne 3) { $issues.Add("expected no increase at max stage") }
$allOk = (Complete-Step "stage_progress condition" $issues) -and $allOk

$issues = New-Object System.Collections.Generic.List[string]
$eligible = New-RunSessionResult -Reason "TimeExpired" -StageClearEligible $false -EarnedCoins 4 -GainedExperience 2
$ineligible = New-RunSessionResult -Reason "Abandoned" -StageClearEligible $false -EarnedCoins 4 -GainedExperience 2
$eligibleApplied = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 0 -Experience 0 -AlreadyApplied $false -ApplyStageProgress $false -Result $eligible
$ineligibleApplied = Invoke-ResultApplication -StageProgress 1 -StageCount 3 -Coins 0 -Experience 0 -AlreadyApplied $false -ApplyStageProgress $false -Result $ineligible
if (-not $eligibleApplied.SaveRequested) { $issues.Add("expected eligible result to request save") }
if ($eligibleApplied.Coins -ne 4) { $issues.Add("expected eligible result to apply reward") }
if ($ineligibleApplied.SaveRequested) { $issues.Add("expected ineligible result to skip save") }
if ($ineligibleApplied.Coins -ne 0) { $issues.Add("expected ineligible result to skip reward") }
$allOk = (Complete-Step "reward/save eligibility rule" $issues) -and $allOk

if (-not $allOk) {
    exit 1
}

exit 0
