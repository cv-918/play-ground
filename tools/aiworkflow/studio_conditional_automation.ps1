param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

$PolicyVersion = "studio-conditional-automation-v0.1"

function ConvertTo-StudioJson {
    param([object]$Value)

    $Value | ConvertTo-Json -Depth 64
}

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "File not found: $Path"
    }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Read-JsonFile {
    param([string]$Path)

    $text = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw "JSON file is empty: $Path"
    }
    return ($text | ConvertFrom-Json)
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Resolve-RepoPath {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return (Resolve-Path -LiteralPath $Path).Path
    }
    return (Resolve-Path -LiteralPath (Join-Path $Root $Path)).Path
}

function Get-DefaultCasesPath {
    param([string]$Root)

    return (Join-Path $Root "_Docs\AIWorkflow\Studio\Examples\conditional_automation_cases.example.json")
}

function Get-DefaultOutputDir {
    param([string]$Root)

    return (Join-Path $Root "_Temp\AIWorkflowStudio\conditional_automation")
}

function Get-Stamp {
    return (Get-Date -Format "yyyyMMdd-HHmmss-fff")
}

function New-ShortGuid {
    return ([Guid]::NewGuid().ToString("N").Substring(0, 8))
}

function New-EvaluationId {
    return ("studio-autoeval-" + (Get-Stamp) + "-" + (New-ShortGuid))
}

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
}

function Get-ObjectProperty {
    param(
        [object]$Value,
        [string]$Name,
        [object]$DefaultValue = $null
    )

    if ($null -eq $Value) { return $DefaultValue }
    $property = $Value.PSObject.Properties[$Name]
    if ($null -eq $property) { return $DefaultValue }
    return $property.Value
}

function Get-BoolProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    $raw = Get-ObjectProperty -Value $Value -Name $Name -DefaultValue $false
    if ($null -eq $raw) { return $false }
    return [System.Convert]::ToBoolean($raw)
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) { return @() }
    return @($Value | ForEach-Object { [string]$_ })
}

function Add-Unique {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    if (-not $List.Contains($Value)) { $List.Add($Value) }
}

function Test-CaseShape {
    param([object]$Case)

    $errors = New-Object "System.Collections.Generic.List[string]"
    $required = @("case_id", "title", "description", "input", "expected_decision", "expected_reasons")
    foreach ($name in $required) {
        if (-not (Test-HasProperty -Value $Case -Name $name)) {
            Add-Unique -List $errors -Value "Missing required field: $name"
        }
    }
    $caseId = [string](Get-ObjectProperty -Value $Case -Name "case_id" -DefaultValue "")
    if ($caseId -notmatch "^AUTOCASE-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Unique -List $errors -Value "Invalid case_id: $caseId"
    }
    $expectedDecision = [string](Get-ObjectProperty -Value $Case -Name "expected_decision" -DefaultValue "")
    if (@("auto_allowed", "human_required", "blocked") -notcontains $expectedDecision) {
        Add-Unique -List $errors -Value "Invalid expected_decision: $expectedDecision"
    }
    $inputObject = Get-ObjectProperty -Value $Case -Name "input"
    if ($null -eq $inputObject) {
        Add-Unique -List $errors -Value "Missing input object."
    } else {
        foreach ($name in @("source_type", "category", "kind", "priority", "risk", "status", "requested_actions", "safety", "evidence")) {
            if (-not (Test-HasProperty -Value $inputObject -Name $name)) {
                Add-Unique -List $errors -Value "Missing input field: $name"
            }
        }
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        case_id = $caseId
        errors = $errors.ToArray()
    }
}

function Evaluate-Input {
    param([object]$CaseInput)

    $reasons = New-Object "System.Collections.Generic.List[string]"
    $blockers = New-Object "System.Collections.Generic.List[string]"
    $human = New-Object "System.Collections.Generic.List[string]"

    $priority = [string](Get-ObjectProperty -Value $CaseInput -Name "priority" -DefaultValue "")
    $risk = [string](Get-ObjectProperty -Value $CaseInput -Name "risk" -DefaultValue "")
    $status = [string](Get-ObjectProperty -Value $CaseInput -Name "status" -DefaultValue "")
    $actions = Get-StringArray -Value (Get-ObjectProperty -Value $CaseInput -Name "requested_actions")
    $safety = Get-ObjectProperty -Value $CaseInput -Name "safety"
    $evidence = Get-ObjectProperty -Value $CaseInput -Name "evidence"

    if ($priority -eq "P2" -or $priority -eq "P3") {
        Add-Unique -List $reasons -Value "low_risk_priority"
    } else {
        Add-Unique -List $human -Value "priority_requires_human"
    }

    if ($risk -eq "low") {
        Add-Unique -List $reasons -Value "low_risk"
    } else {
        Add-Unique -List $human -Value "risk_requires_human"
    }

    $hasScope = Get-BoolProperty -Value $evidence -Name "has_scope"
    $hasNonGoals = Get-BoolProperty -Value $evidence -Name "has_non_goals"
    $hasValidationPlan = Get-BoolProperty -Value $evidence -Name "has_validation_plan"
    $hasRollbackPlan = Get-BoolProperty -Value $evidence -Name "has_rollback_plan"
    $hasDecisionRef = Get-BoolProperty -Value $evidence -Name "has_decision_ref"

    $sourceWrite = Get-BoolProperty -Value $safety -Name "source_write"
    $dataWrite = Get-BoolProperty -Value $safety -Name "data_write"
    $schemaChange = Get-BoolProperty -Value $safety -Name "schema_change"
    $canonWrite = Get-BoolProperty -Value $safety -Name "canon_write"
    $assetImport = Get-BoolProperty -Value $safety -Name "asset_import"
    $externalCall = Get-BoolProperty -Value $safety -Name "external_call"
    $costPossible = Get-BoolProperty -Value $safety -Name "cost_possible"
    $commitOrPush = Get-BoolProperty -Value $safety -Name "commit_or_push"
    $destructive = Get-BoolProperty -Value $safety -Name "destructive"

    if ($hasScope -and $hasNonGoals) {
        Add-Unique -List $reasons -Value "scope_ready"
    } elseif (-not $hasScope -and -not $hasNonGoals) {
        Add-Unique -List $blockers -Value "missing_scope_and_non_goals"
    } else {
        Add-Unique -List $human -Value "scope_or_non_goals_incomplete"
    }

    if ($hasValidationPlan) {
        Add-Unique -List $reasons -Value "validation_ready"
    } else {
        Add-Unique -List $human -Value "validation_plan_required"
    }

    if ($destructive) {
        Add-Unique -List $blockers -Value "destructive_action"
    }
    if ($schemaChange -and -not $hasDecisionRef) {
        Add-Unique -List $blockers -Value "schema_change_without_decision"
    }
    if ($canonWrite -and -not $hasDecisionRef) {
        Add-Unique -List $human -Value "canon_write_requires_human"
    }
    if ($externalCall -and $costPossible -and -not $hasDecisionRef) {
        Add-Unique -List $human -Value "external_cost_requires_human"
    }

    if ($sourceWrite) { Add-Unique -List $human -Value "source_write_requires_human" }
    if ($dataWrite) { Add-Unique -List $human -Value "data_write_requires_human" }
    if ($assetImport) { Add-Unique -List $human -Value "asset_import_requires_human" }
    if ($externalCall) { Add-Unique -List $human -Value "external_call_requires_human" }
    if ($costPossible) { Add-Unique -List $human -Value "cost_requires_human" }
    if ($commitOrPush) { Add-Unique -List $human -Value "commit_or_push_requires_human" }

    foreach ($action in $actions) {
        $lower = $action.ToLowerInvariant()
        if ($lower -match "approve|finalize|commit|push") {
            Add-Unique -List $blockers -Value "self_approval_or_git_action"
        }
    }

    if ($status -match "needs_director_decision|approval_required|blocked") {
        Add-Unique -List $human -Value "status_needs_director_decision"
    }

    if ($sourceWrite -or $dataWrite -or $schemaChange -or $assetImport) {
        if (-not $hasRollbackPlan) {
            Add-Unique -List $human -Value "rollback_plan_required"
        }
    }

    if (-not $sourceWrite -and -not $dataWrite -and -not $schemaChange -and -not $canonWrite -and -not $assetImport -and -not $externalCall -and -not $costPossible -and -not $commitOrPush -and -not $destructive) {
        Add-Unique -List $reasons -Value "safe_actions"
    }

    $decision = "auto_allowed"
    if ($blockers.Count -gt 0) {
        $decision = "blocked"
    } elseif ($human.Count -gt 0) {
        $decision = "human_required"
    }

    return [pscustomobject]@{
        policy_version = $PolicyVersion
        decision = $decision
        reasons = $reasons.ToArray()
        human_required_reasons = $human.ToArray()
        blockers = $blockers.ToArray()
        can_auto_advance = ($decision -eq "auto_allowed")
    }
}

function New-CaseEvaluation {
    param([object]$Case)

    $shape = Test-CaseShape -Case $Case
    if (-not $shape.ok) {
        return [pscustomobject]@{
            ok = $false
            case_id = [string](Get-ObjectProperty -Value $Case -Name "case_id" -DefaultValue "")
            title = [string](Get-ObjectProperty -Value $Case -Name "title" -DefaultValue "")
            policy_version = $PolicyVersion
            expected_decision = [string](Get-ObjectProperty -Value $Case -Name "expected_decision" -DefaultValue "")
            actual_decision = "blocked"
            passed = $false
            shape_errors = $shape.errors
            evaluation = [pscustomobject]@{
                policy_version = $PolicyVersion
                decision = "blocked"
                reasons = @()
                human_required_reasons = @()
                blockers = @("invalid_case_shape")
                can_auto_advance = $false
            }
        }
    }

    $caseInput = Get-ObjectProperty -Value $Case -Name "input"
    $evaluation = Evaluate-Input -CaseInput $caseInput
    $expected = [string](Get-ObjectProperty -Value $Case -Name "expected_decision" -DefaultValue "")
    $passed = ($evaluation.decision -eq $expected)
    $expectedReasons = Get-StringArray -Value (Get-ObjectProperty -Value $Case -Name "expected_reasons")
    foreach ($reason in $expectedReasons) {
        if (($evaluation.reasons -notcontains $reason) -and ($evaluation.human_required_reasons -notcontains $reason) -and ($evaluation.blockers -notcontains $reason)) {
            $passed = $false
        }
    }

    return [pscustomobject]@{
        ok = $true
        case_id = [string](Get-ObjectProperty -Value $Case -Name "case_id" -DefaultValue "")
        title = [string](Get-ObjectProperty -Value $Case -Name "title" -DefaultValue "")
        policy_version = $PolicyVersion
        expected_decision = $expected
        actual_decision = $evaluation.decision
        passed = $passed
        expected_reasons = $expectedReasons
        evaluation = $evaluation
        input = $caseInput
    }
}

function Read-Cases {
    param(
        [string]$Root,
        [string]$Path
    )

    $target = $Path
    if ([string]::IsNullOrWhiteSpace($target)) {
        $target = Get-DefaultCasesPath -Root $Root
    } else {
        $target = Resolve-RepoPath -Root $Root -Path $target
    }
    return [pscustomobject]@{
        path = $target
        data = (Read-JsonFile -Path $target)
    }
}

function New-ValidateResult {
    param(
        [string]$Root,
        [string]$CasesPath
    )

    $casesSource = Read-Cases -Root $Root -Path $CasesPath
    $validations = @()
    foreach ($case in @($casesSource.data.cases)) {
        $validations += (Test-CaseShape -Case $case)
    }
    $errorCount = 0
    foreach ($validation in @($validations)) {
        $errorCount += @($validation.errors).Count
    }
    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        policy_version = $PolicyVersion
        cases_path = $casesSource.path
        case_count = @($casesSource.data.cases).Count
        error_count = $errorCount
        validations = @($validations)
        safety = [pscustomobject]@{
            read_only = $true
            workflow_changed = $false
            git_changed = $false
        }
    }
}

function New-TestResult {
    param(
        [string]$Root,
        [string]$CasesPath,
        [bool]$Execute
    )

    $casesSource = Read-Cases -Root $Root -Path $CasesPath
    $evaluations = @()
    foreach ($case in @($casesSource.data.cases)) {
        $evaluations += (New-CaseEvaluation -Case $case)
    }
    $failed = @($evaluations | Where-Object { -not $_.passed })
    $result = [pscustomobject]@{
        ok = (@($failed).Count -eq 0)
        command = "test"
        execute = $Execute
        policy_version = $PolicyVersion
        cases_path = $casesSource.path
        case_count = @($evaluations).Count
        passed_count = (@($evaluations).Count - @($failed).Count)
        failed_count = @($failed).Count
        evaluations = @($evaluations)
        output_path = $null
        safety = [pscustomobject]@{
            read_only = (-not $Execute)
            temp_evaluation_written = $false
            workflow_changed = $false
            git_changed = $false
        }
    }

    if ($Execute) {
        $outDir = Get-DefaultOutputDir -Root $Root
        if (-not (Test-Path -LiteralPath $outDir)) {
            New-Item -ItemType Directory -Path $outDir -Force | Out-Null
        }
        $outPath = Join-Path $outDir ("conditional-automation-test-" + (Get-Stamp) + ".json")
        Write-Utf8Text -Path $outPath -Text (($result | ConvertTo-Json -Depth 64) + [Environment]::NewLine)
        $result.output_path = $outPath
        $result.safety.read_only = $false
        $result.safety.temp_evaluation_written = $true
    }

    return $result
}

function New-ReplayResult {
    param(
        [string]$Root,
        [string]$EvaluationPath
    )

    $path = Resolve-RepoPath -Root $Root -Path $EvaluationPath
    $record = Read-JsonFile -Path $path
    $replayed = @()
    foreach ($entry in @($record.evaluations)) {
        $fakeCase = [pscustomobject]@{
            case_id = Get-ObjectProperty -Value $entry -Name "case_id" -DefaultValue ""
            title = Get-ObjectProperty -Value $entry -Name "title" -DefaultValue ""
            description = "Replay case"
            input = Get-ObjectProperty -Value $entry -Name "input"
            expected_decision = Get-ObjectProperty -Value $entry -Name "expected_decision" -DefaultValue ""
            expected_reasons = Get-ObjectProperty -Value $entry -Name "expected_reasons"
        }
        $newEval = New-CaseEvaluation -Case $fakeCase
        $matches = (
            [string]$newEval.actual_decision -eq [string]$entry.actual_decision -and
            [string]$newEval.expected_decision -eq [string]$entry.expected_decision
        )
        $replayed += [pscustomobject]@{
            case_id = $entry.case_id
            recorded_decision = [string]$entry.actual_decision
            replayed_decision = [string]$newEval.actual_decision
            matches = $matches
            replay_passed = $newEval.passed
            blockers = $newEval.evaluation.blockers
            human_required_reasons = $newEval.evaluation.human_required_reasons
        }
    }
    $mismatches = @($replayed | Where-Object { -not $_.matches })
    return [pscustomobject]@{
        ok = (@($mismatches).Count -eq 0)
        command = "replay"
        policy_version = $PolicyVersion
        evaluation_path = $path
        case_count = @($replayed).Count
        mismatch_count = @($mismatches).Count
        replay = @($replayed)
        safety = [pscustomobject]@{
            read_only = $true
            workflow_changed = $false
            git_changed = $false
        }
    }
}

function New-RepairPlan {
    param(
        [string]$Root,
        [string]$EvaluationPath
    )

    $replay = New-ReplayResult -Root $Root -EvaluationPath $EvaluationPath
    $actions = New-Object "System.Collections.Generic.List[string]"
    foreach ($entry in @($replay.replay)) {
        foreach ($blocker in (Get-StringArray -Value $entry.blockers)) {
            switch ($blocker) {
                "missing_scope_and_non_goals" { Add-Unique -List $actions -Value "Add explicit scope and non-goals before automation." }
                "schema_change_without_decision" { Add-Unique -List $actions -Value "Request Human Director decision for schema change or split into manual task." }
                "destructive_action" { Add-Unique -List $actions -Value "Keep destructive action manual; do not automate." }
                "self_approval_or_git_action" { Add-Unique -List $actions -Value "Remove approval/finalization/git action from automation request." }
                default { Add-Unique -List $actions -Value "Review blocker: $blocker" }
            }
        }
        foreach ($reason in (Get-StringArray -Value $entry.human_required_reasons)) {
            switch ($reason) {
                "validation_plan_required" { Add-Unique -List $actions -Value "Add validation plan." }
                "rollback_plan_required" { Add-Unique -List $actions -Value "Add rollback or correction plan for change-capable work." }
                "cost_requires_human" { Add-Unique -List $actions -Value "Ask Human Director to approve possible cost before automation." }
                "external_call_requires_human" { Add-Unique -List $actions -Value "Ask Human Director to approve external tool call before automation." }
                "canon_write_requires_human" { Add-Unique -List $actions -Value "Ask Human Director to approve canon write with Decision ref." }
                default { Add-Unique -List $actions -Value "Resolve human gate: $reason" }
            }
        }
    }
    if ($actions.Count -eq 0) {
        Add-Unique -List $actions -Value "No repair needed. Replay matched recorded policy decisions."
    }
    return [pscustomobject]@{
        ok = $true
        command = "repair-plan"
        policy_version = $PolicyVersion
        evaluation_path = $replay.evaluation_path
        replay_ok = $replay.ok
        actions = $actions.ToArray()
        safety = [pscustomobject]@{
            read_only = $true
            workflow_changed = $false
            git_changed = $false
        }
    }
}

function New-StatusResult {
    param([string]$Root)

    $casesPath = Get-DefaultCasesPath -Root $Root
    $cases = Read-JsonFile -Path $casesPath
    return [pscustomobject]@{
        ok = $true
        command = "status"
        policy_version = $PolicyVersion
        default_cases_path = $casesPath
        case_count = @($cases.cases).Count
        output_dir = (Get-DefaultOutputDir -Root $Root)
        safety = [pscustomobject]@{
            read_only = $true
            workflow_changed = $false
            git_changed = $false
        }
    }
}

function Write-List {
    param(
        [string]$Label,
        [object[]]$Items
    )

    Write-Host ""
    Write-Host "[$Label]"
    if ($null -eq $Items -or @($Items).Count -eq 0) {
        Write-Host "- None."
        return
    }
    foreach ($item in @($Items)) { Write-Host "- $item" }
}

function Show-Status {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Conditional Automation"
    Write-Host "============================================================"
    Write-Host "Policy: $($Result.policy_version)"
    Write-Host "Cases: $($Result.case_count)"
    Write-Host "Default cases: $($Result.default_cases_path)"
    Write-Host "Output dir: $($Result.output_dir)"
}

function Show-Validate {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "Studio Conditional Automation Case Validation"
    Write-Host "============================================================"
    Write-Host "Cases: $($Result.case_count)"
    Write-Host "Errors: $($Result.error_count)"
    foreach ($validation in @($Result.validations)) {
        $state = "PASS"
        if (-not $validation.ok) { $state = "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($validation.case_id)"
        foreach ($err in @($validation.errors)) { Write-Host "  - error: $err" }
    }
}

function Show-Test {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "Studio Conditional Automation Policy Test"
    Write-Host "============================================================"
    Write-Host "Cases: $($Result.case_count)"
    Write-Host "Passed/failed: $($Result.passed_count) / $($Result.failed_count)"
    if (-not [string]::IsNullOrWhiteSpace([string]$Result.output_path)) {
        Write-Host "Output: $($Result.output_path)"
    }
    foreach ($entry in @($Result.evaluations)) {
        $state = "PASS"
        if (-not $entry.passed) { $state = "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($entry.case_id)"
        Write-Host "- expected/actual: $($entry.expected_decision) / $($entry.actual_decision)"
        Write-List -Label "Reasons" -Items $entry.evaluation.reasons
        Write-List -Label "Human gates" -Items $entry.evaluation.human_required_reasons
        Write-List -Label "Blockers" -Items $entry.evaluation.blockers
    }
}

function Show-Replay {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "Studio Conditional Automation Replay"
    Write-Host "============================================================"
    Write-Host "Cases: $($Result.case_count)"
    Write-Host "Mismatches: $($Result.mismatch_count)"
    foreach ($entry in @($Result.replay)) {
        $state = "MATCH"
        if (-not $entry.matches) { $state = "MISMATCH" }
        Write-Host ""
        Write-Host "[$state] $($entry.case_id)"
        Write-Host "- recorded/replayed: $($entry.recorded_decision) / $($entry.replayed_decision)"
    }
}

function Show-RepairPlan {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "Studio Conditional Automation Repair Plan"
    Write-Host "============================================================"
    Write-Host "Replay OK: $($Result.replay_ok)"
    Write-List -Label "Actions" -Items $Result.actions
    Write-List -Label "Safety" -Items @(
        "No workflow state changed",
        "No task created",
        "No approval changed",
        "No runner started",
        "No git changed"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_conditional_automation.bat status|validate [cases_json]|test [cases_json] [--execute]|replay <evaluation_json>|repair-plan <evaluation_json> [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $cleanArgs = New-Object "System.Collections.Generic.List[string]"
    $argsList = @()
    if ($null -ne $CommandArgs) { $argsList = @($CommandArgs) }

    for ($index = 0; $index -lt $argsList.Count; $index += 1) {
        $arg = [string]$argsList[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -eq 0) { $cleanArgs.Add("status") }
    $command = ([string]$cleanArgs[0]).ToLowerInvariant()

    if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
        $result = New-StatusResult -Root $repo
    } elseif ($command -eq "validate" -and $cleanArgs.Count -le 2) {
        $path = ""
        if ($cleanArgs.Count -eq 2) { $path = [string]$cleanArgs[1] }
        $result = New-ValidateResult -Root $repo -CasesPath $path
    } elseif ($command -eq "test" -and $cleanArgs.Count -le 2) {
        $path = ""
        if ($cleanArgs.Count -eq 2) { $path = [string]$cleanArgs[1] }
        $result = New-TestResult -Root $repo -CasesPath $path -Execute $execute
    } elseif ($command -eq "replay" -and $cleanArgs.Count -eq 2) {
        $result = New-ReplayResult -Root $repo -EvaluationPath ([string]$cleanArgs[1])
    } elseif ($command -eq "repair-plan" -and $cleanArgs.Count -eq 2) {
        $result = New-RepairPlan -Root $repo -EvaluationPath ([string]$cleanArgs[1])
    } else {
        $result = New-UsageResult
        if ($json) { ConvertTo-StudioJson -Value $result } else { Write-Host "[ERROR] $($result.error)" }
        exit 1
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } elseif ($command -eq "status") {
        Show-Status -Result $result
    } elseif ($command -eq "validate") {
        Show-Validate -Result $result
    } elseif ($command -eq "test") {
        Show-Test -Result $result
    } elseif ($command -eq "replay") {
        Show-Replay -Result $result
    } elseif ($command -eq "repair-plan") {
        Show-RepairPlan -Result $result
    }

    if ($result.ok) { exit 0 }
    exit 1
} catch {
    $message = $_.Exception.Message
    if ($json) {
        [pscustomobject]@{ ok = $false; error = $message } | ConvertTo-StudioJson
    } else {
        Write-Host "[ERROR] $message"
    }
    exit 1
}
