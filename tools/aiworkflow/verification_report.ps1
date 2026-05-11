param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "generate", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$ResultId = "",

    [string]$AnalysisId = "",

    [string]$BuildTestId = "",

    [string]$ReportId = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText {
    return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

function Get-Stamp {
    return (Get-Date -Format "yyyyMMdd-HHmmss-fff")
}

function New-ShortGuid {
    return ([Guid]::NewGuid().ToString("N").Substring(0, 8))
}

function New-VerificationReportId {
    return ("verification-" + (Get-Stamp) + "-" + (New-ShortGuid))
}

function New-EventId {
    return ("event-" + (Get-Stamp) + "-" + (New-ShortGuid))
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::WriteAllText($Path, $Text, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) {
                throw
            }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Append-Utf8Line {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) {
                throw
            }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "JSON file not found: $Path"
    }

    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "JSON file is empty: $Path"
    }

    return ($raw | ConvertFrom-Json)
}

function Read-JsonFileOrNull {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    return ($raw | ConvertFrom-Json)
}

function Save-JsonFile {
    param(
        [string]$Path,
        $Value
    )

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 24) + "`n")
}

function ConvertTo-RepoRelativePath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
    }

    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $full.Substring($root.Length).TrimStart("\", "/")
        if ([string]::IsNullOrWhiteSpace($relative)) {
            return "."
        }
        return ($relative -replace "\\", "/")
    }

    return ($full -replace "\\", "/")
}

function Get-SafeTaskId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Task id is required."
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid task id. Use a plain task id without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid task id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function Get-SafeResultIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^result-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid result id. Use result-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid result id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-SafeAnalysisIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^analysis-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid analysis id. Use analysis-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid analysis id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-SafeBuildTestIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^bt-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid build_test_id. Use bt-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid build_test_id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-SafeReportIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^verification-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid verification_report_id. Use verification-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid verification_report_id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-ObjectPropertyValue {
    param(
        $Object,
        [string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Set-ObjectProperty {
    param(
        $Object,
        [string]$Name,
        $Value
    )

    if ($null -eq $Object.PSObject.Properties[$Name]) {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value -Force
    }
    else {
        $Object.$Name = $Value
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

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"
    $reportsDir = Join-Path $evidenceDir "reports"
    $verificationDir = Join-Path $reportsDir "verification"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        reports_dir = $reportsDir
        results_dir = Join-Path $reportsDir "results"
        result_manifest_path = Join-Path $reportsDir "result_manifest.json"
        diff_analysis_dir = Join-Path $reportsDir "diff_analysis"
        diff_analysis_manifest_path = Join-Path $reportsDir "diff_analysis_manifest.json"
        build_test_results_dir = Join-Path (Join-Path $reportsDir "build_test") "results"
        build_test_manifest_path = Join-Path (Join-Path $reportsDir "build_test") "build_test_manifest.json"
        verification_dir = $verificationDir
        verification_results_dir = Join-Path $verificationDir "results"
        verification_manifest_path = Join-Path $verificationDir "verification_manifest.json"
    }
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [bool]$EnsureVerificationDirs = $false
    )

    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId

    if (-not (Test-Path -LiteralPath $paths.workspace_path)) {
        throw "Runtime workspace does not exist for task_id $TaskId. Create it with task_workspace_manager first."
    }

    $metadata = Read-JsonFile -Path $paths.metadata_path
    $taskRunState = Read-JsonFile -Path $paths.task_run_state_path

    if ($metadata.task_id -ne $TaskId) {
        throw "Workspace metadata task_id mismatch. Expected $TaskId, found $($metadata.task_id)."
    }
    if ($taskRunState.task_id -ne $TaskId) {
        throw "TaskRunState task_id mismatch. Expected $TaskId, found $($taskRunState.task_id)."
    }

    if ($EnsureVerificationDirs) {
        New-Item -ItemType Directory -Path $paths.verification_results_dir -Force | Out-Null
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Get-ResultPath {
    param(
        [string]$ResultsDir,
        [string]$ResultId
    )

    return (Join-Path $ResultsDir ($ResultId + ".json"))
}

function Get-AnalysisPath {
    param(
        [string]$AnalysisDir,
        [string]$AnalysisId
    )

    return (Join-Path $AnalysisDir ($AnalysisId + ".json"))
}

function Get-BuildTestPath {
    param(
        [string]$ResultsDir,
        [string]$BuildTestId
    )

    return (Join-Path $ResultsDir ($BuildTestId + ".json"))
}

function Get-VerificationReportPath {
    param(
        [string]$ResultsDir,
        [string]$ReportId
    )

    return (Join-Path $ResultsDir ($ReportId + ".json"))
}

function Get-VerificationManifest {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$WorkspaceId
    )

    $existing = Read-JsonFileOrNull -Path $Path
    if ($null -ne $existing) {
        return $existing
    }

    return [pscustomobject]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        verification_report_ids = @()
        latest_verification_report_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-VerificationManifest {
    param(
        [string]$Path,
        $Manifest,
        [string]$ReportId
    )

    $ids = @($Manifest.verification_report_ids)
    if (-not ($ids -contains $ReportId)) {
        $ids += $ReportId
    }

    Set-ObjectProperty -Object $Manifest -Name "verification_report_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_verification_report_id" -Value $ReportId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
}

function Parse-BacklogRows {
    param([string]$Text)

    $rows = @()
    if ([string]::IsNullOrEmpty($Text)) {
        return @()
    }

    foreach ($lineObj in ($Text -split "`r?`n")) {
        $line = ([string]$lineObj).Trim()
        if (-not $line.StartsWith("|")) {
            continue
        }

        $cells = @($line.Trim("|".ToCharArray()).Split("|".ToCharArray()) | ForEach-Object { ([string]$_).Trim() })
        if ($cells.Count -lt 8) {
            continue
        }

        $id = $cells[0]
        if ($id -notmatch "^(WF|GAME|VAL|DOC|UNITY)-") {
            continue
        }

        $rows += [pscustomobject]@{
            id = $cells[0]
            priority = $cells[1]
            status = $cells[2]
            kind = $cells[3]
            title = $cells[4]
            reason = $cells[5]
            tool_route = $cells[6]
            validation = $cells[7]
        }
    }

    return @($rows)
}

function Get-BacklogTaskOrNull {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $backlogPath = Join-Path $Repo "_Docs\AIWorkflow\Backlog.md"
    $rows = @(Parse-BacklogRows -Text (Read-Utf8Text -Path $backlogPath) | Where-Object { $_.id -eq $TaskId })
    if ($rows.Count -gt 1) {
        throw "Duplicate task_id found in Backlog.md: $TaskId"
    }
    if ($rows.Count -eq 0) {
        return $null
    }

    return $rows[0]
}

function Resolve-ExecutionResultSource {
    param(
        [string]$Repo,
        $Runtime,
        [string]$RequestedId
    )

    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.result_manifest_path
    $id = $RequestedId
    if ([string]::IsNullOrWhiteSpace($id) -and $null -ne $manifest) {
        $id = [string]$manifest.latest_result_id
    }

    if ([string]::IsNullOrWhiteSpace($id)) {
        return [pscustomobject]@{
            kind = "execution_result"
            present = $false
            requested_id = $RequestedId
            selected_id = $null
            path = $null
            value = $null
            missing_reason = "No result_id was provided and no latest ExecutionResult exists."
        }
    }

    $path = Get-ResultPath -ResultsDir $Runtime.paths.results_dir -ResultId $id
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{
            kind = "execution_result"
            present = $false
            requested_id = $RequestedId
            selected_id = $id
            path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
            value = $null
            missing_reason = "ExecutionResult does not exist: $id"
        }
    }

    $value = Read-JsonFile -Path $path
    if ($value.task_id -ne $Runtime.metadata.task_id) {
        throw "ExecutionResult task_id mismatch. Expected $($Runtime.metadata.task_id), found $($value.task_id)."
    }

    return [pscustomobject]@{
        kind = "execution_result"
        present = $true
        requested_id = $RequestedId
        selected_id = $id
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        value = $value
        missing_reason = $null
    }
}

function Resolve-DiffAnalysisSource {
    param(
        [string]$Repo,
        $Runtime,
        [string]$RequestedId
    )

    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.diff_analysis_manifest_path
    $id = $RequestedId
    if ([string]::IsNullOrWhiteSpace($id) -and $null -ne $manifest) {
        $id = [string]$manifest.latest_analysis_id
    }

    if ([string]::IsNullOrWhiteSpace($id)) {
        return [pscustomobject]@{
            kind = "diff_analysis"
            present = $false
            requested_id = $RequestedId
            selected_id = $null
            path = $null
            value = $null
            missing_reason = "No analysis_id was provided and no latest DiffAnalysis exists."
        }
    }

    $path = Get-AnalysisPath -AnalysisDir $Runtime.paths.diff_analysis_dir -AnalysisId $id
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{
            kind = "diff_analysis"
            present = $false
            requested_id = $RequestedId
            selected_id = $id
            path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
            value = $null
            missing_reason = "DiffAnalysis does not exist: $id"
        }
    }

    $value = Read-JsonFile -Path $path
    if ($value.task_id -ne $Runtime.metadata.task_id) {
        throw "DiffAnalysis task_id mismatch. Expected $($Runtime.metadata.task_id), found $($value.task_id)."
    }

    return [pscustomobject]@{
        kind = "diff_analysis"
        present = $true
        requested_id = $RequestedId
        selected_id = $id
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        value = $value
        missing_reason = $null
    }
}

function Resolve-BuildTestSource {
    param(
        [string]$Repo,
        $Runtime,
        [string]$RequestedId
    )

    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.build_test_manifest_path
    $id = $RequestedId
    if ([string]::IsNullOrWhiteSpace($id) -and $null -ne $manifest) {
        $id = [string]$manifest.latest_build_test_id
    }

    if ([string]::IsNullOrWhiteSpace($id)) {
        return [pscustomobject]@{
            kind = "build_test_result"
            present = $false
            requested_id = $RequestedId
            selected_id = $null
            path = $null
            value = $null
            missing_reason = "No build_test_id was provided and no latest BuildTestResult exists."
        }
    }

    $path = Get-BuildTestPath -ResultsDir $Runtime.paths.build_test_results_dir -BuildTestId $id
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{
            kind = "build_test_result"
            present = $false
            requested_id = $RequestedId
            selected_id = $id
            path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
            value = $null
            missing_reason = "BuildTestResult does not exist: $id"
        }
    }

    $value = Read-JsonFile -Path $path
    if ($value.task_id -ne $Runtime.metadata.task_id) {
        throw "BuildTestResult task_id mismatch. Expected $($Runtime.metadata.task_id), found $($value.task_id)."
    }

    return [pscustomobject]@{
        kind = "build_test_result"
        present = $true
        requested_id = $RequestedId
        selected_id = $id
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        value = $value
        missing_reason = $null
    }
}

function Get-ExpectedCategoriesForTask {
    param($Task)

    $kind = ""
    if ($null -ne $Task) {
        $kind = ([string]$Task.kind).ToLowerInvariant()
    }

    $base = @("workflow_state", "workflow_docs", "devlog")
    if ($kind -in @("automation", "workflow", "validation", "documentation")) {
        return @($base + @("aiworkflow_tool", "discord_tool"))
    }
    if ($kind -in @("implementation", "refactoring")) {
        return @($base + @("game_source"))
    }
    if ($kind -eq "data") {
        return @($base + @("game_data"))
    }
    if ($kind -in @("architecture", "unity", "release")) {
        return @($base + @("other"))
    }

    return @($base)
}

function New-GateResult {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Summary,
        $Evidence,
        $Warnings = @(),
        $Concerns = @(),
        $Blockers = @(),
        $FailedChecks = @(),
        $HumanDecisions = @()
    )

    return [ordered]@{
        name = $Name
        status = $Status
        summary = $Summary
        evidence = $Evidence
        warnings = @(As-Array -Value $Warnings)
        concerns = @(As-Array -Value $Concerns)
        blockers = @(As-Array -Value $Blockers)
        failed_checks = @(As-Array -Value $FailedChecks)
        human_decisions = @(As-Array -Value $HumanDecisions)
    }
}

function Get-WorstVerdict {
    param($Verdicts)

    $order = @{
        "PASS" = 1
        "PASS_WITH_NOTES" = 2
        "CONCERNS" = 3
        "BLOCKED" = 4
        "FAIL" = 5
    }

    $worst = "PASS"
    foreach ($verdictObj in (As-Array -Value $Verdicts)) {
        $verdict = [string]$verdictObj
        if (-not $order.ContainsKey($verdict)) {
            $verdict = "CONCERNS"
        }
        if ($order[$verdict] -gt $order[$worst]) {
            $worst = $verdict
        }
    }

    return $worst
}

function Evaluate-ExecutionGate {
    param($Source)

    if (-not [bool]$Source.present) {
        return (New-GateResult -Name "execution_result_gate" -Status "BLOCKED" -Summary "ExecutionResult evidence is missing." -Evidence ([ordered]@{
            result_id = $Source.selected_id
            result_path = $Source.path
        }) -Blockers @($Source.missing_reason) -HumanDecisions @("Provide an ExecutionResult or approve a validation route that does not require execution-result evidence."))
    }

    $result = $Source.value
    $warnings = @()
    $concerns = @()
    $status = "PASS"
    $summaryText = [string]$result.observed_summary.generated_summary
    if ([string]::IsNullOrWhiteSpace($summaryText)) {
        $summaryText = "ExecutionResult is present."
    }

    $sessionCount = 0
    if ($null -ne $result.task_run -and $null -ne $result.task_run.session_count) {
        $sessionCount = [int]$result.task_run.session_count
    }
    if ($sessionCount -eq 0) {
        $warnings += "ExecutionResult has no session records; other evidence must carry validation."
        $status = "PASS_WITH_NOTES"
    }

    $observedExitState = [string]$result.observed_summary.observed_exit_state
    if ([string]::IsNullOrWhiteSpace($observedExitState)) {
        $warnings += "ExecutionResult has no observed exit-state summary."
        $status = Get-WorstVerdict -Verdicts @($status, "PASS_WITH_NOTES")
    }
    elseif ($observedExitState -notin @("all_zero", "none", "no_exit_codes")) {
        $concerns += "ExecutionResult observed exit state is $observedExitState."
        $status = "CONCERNS"
    }

    $failedSessions = @(As-Array -Value $result.observed_summary.failed_or_cancelled_sessions)
    if ($failedSessions.Count -gt 0) {
        $concerns += "ExecutionResult includes failed or cancelled session(s): $($failedSessions -join ', ')."
        $status = "CONCERNS"
    }

    return (New-GateResult -Name "execution_result_gate" -Status $status -Summary $summaryText -Evidence ([ordered]@{
        result_id = $Source.selected_id
        result_path = $Source.path
        observed_exit_state = $observedExitState
        session_count = $sessionCount
    }) -Warnings $warnings -Concerns $concerns -HumanDecisions $(if ($concerns.Count -gt 0) { @("Review execution-result concerns before accepting the task.") } else { @() }))
}

function Evaluate-DiffGate {
    param(
        $Source,
        $Task
    )

    if (-not [bool]$Source.present) {
        return (New-GateResult -Name "diff_gate" -Status "CONCERNS" -Summary "DiffAnalysis evidence is missing." -Evidence ([ordered]@{
            analysis_id = $Source.selected_id
            analysis_path = $Source.path
        }) -Concerns @($Source.missing_reason) -HumanDecisions @("Provide DiffAnalysis evidence or accept incomplete diff evidence."))
    }

    $analysis = $Source.value
    $warnings = @()
    $concerns = @()
    $failed = @()
    $status = "PASS"
    $summaryText = [string]$analysis.summary.generated_summary
    if ([string]::IsNullOrWhiteSpace($summaryText)) {
        $summaryText = "DiffAnalysis is present."
    }

    $signals = @(As-Array -Value $analysis.summary.attention_signals | ForEach-Object { [string]$_ })
    $files = @(As-Array -Value $analysis.files)
    $expectedCategories = @(Get-ExpectedCategoriesForTask -Task $Task)
    $unsafeSignals = @($signals | Where-Object { $_ -in @("local_private_path_changed", "runtime_or_dependency_path_changed") })
    if ($unsafeSignals.Count -gt 0) {
        $failed += "Unsafe diff attention signal(s): $($unsafeSignals -join ', ')."
        $status = "FAIL"
    }

    if ($signals -contains "no_diff_snapshots") {
        $warnings += "DiffAnalysis has no diff snapshots."
        $status = Get-WorstVerdict -Verdicts @($status, "PASS_WITH_NOTES")
    }

    $reviewSignals = @(
        "workflow_state_changed",
        "workflow_tool_changed",
        "game_source_changed",
        "game_data_changed"
    )

    foreach ($file in $files) {
        $category = [string]$file.category
        $fileSignals = @(As-Array -Value $file.attention_signals | ForEach-Object { [string]$_ })
        $hasReviewSignal = @(($fileSignals | Where-Object { $_ -in $reviewSignals })).Count -gt 0
        if (-not $hasReviewSignal) {
            continue
        }

        $path = [string]$file.effective_path
        if ($expectedCategories -contains $category) {
            $warnings += "Review signal within expected task category: $path ($category)."
        }
        else {
            $concerns += "Review signal outside expected task category: $path ($category)."
        }
    }

    if ($signals -contains "file_deleted") {
        $concerns += "DiffAnalysis includes file deletion."
    }
    if ($signals -contains "binary_diff") {
        $concerns += "DiffAnalysis includes binary diff."
    }
    if ($signals -contains "large_file_diff") {
        $concerns += "DiffAnalysis includes large-file diff."
    }

    if ($failed.Count -gt 0) {
        $status = "FAIL"
    }
    elseif ($concerns.Count -gt 0) {
        $status = "CONCERNS"
    }
    elseif ($warnings.Count -gt 0) {
        $status = Get-WorstVerdict -Verdicts @($status, "PASS_WITH_NOTES")
    }

    return (New-GateResult -Name "diff_gate" -Status $status -Summary $summaryText -Evidence ([ordered]@{
        analysis_id = $Source.selected_id
        analysis_path = $Source.path
        changed_file_count = $analysis.summary.changed_file_count
        additions = $analysis.summary.additions
        deletions = $analysis.summary.deletions
        attention_signals = @($signals)
        expected_categories = @($expectedCategories)
    }) -Warnings $warnings -Concerns $concerns -FailedChecks $failed -HumanDecisions $(if ($concerns.Count -gt 0 -or $failed.Count -gt 0) { @("Review diff attention signals before accepting the task.") } else { @() }))
}

function Evaluate-BuildTestGate {
    param($Source)

    if (-not [bool]$Source.present) {
        return (New-GateResult -Name "build_test_gate" -Status "CONCERNS" -Summary "BuildTestResult evidence is missing." -Evidence ([ordered]@{
            build_test_id = $Source.selected_id
            build_test_path = $Source.path
        }) -Concerns @($Source.missing_reason) -HumanDecisions @("Provide BuildTestResult evidence or accept incomplete build/test evidence."))
    }

    $build = $Source.value
    $state = [string]$build.execution.observed_exit_state
    $status = "PASS"
    $summaryText = "Build/test command $($build.command.command_id) recorded $state."
    $failed = @()
    $concerns = @()
    $warnings = @()

    if ($state -eq "exit_zero") {
        $status = "PASS"
    }
    elseif ($state -in @("exit_nonzero", "timeout", "spawn_failed")) {
        $status = "FAIL"
        $failed += "Build/test observed exit state is $state."
    }
    else {
        $status = "CONCERNS"
        $concerns += "Build/test observed exit state is missing or unsupported: $state."
    }

    if ($null -ne $build.execution.verification_judgment) {
        $warnings += "BuildTestResult already has verification_judgment populated; WF-303 artifacts normally leave this null."
        $status = Get-WorstVerdict -Verdicts @($status, "PASS_WITH_NOTES")
    }
    if ($null -ne $build.execution.completion_state) {
        $warnings += "BuildTestResult already has completion_state populated; WF-303 artifacts normally leave this null."
        $status = Get-WorstVerdict -Verdicts @($status, "PASS_WITH_NOTES")
    }

    return (New-GateResult -Name "build_test_gate" -Status $status -Summary $summaryText -Evidence ([ordered]@{
        build_test_id = $Source.selected_id
        build_test_path = $Source.path
        command_id = $build.command.command_id
        observed_exit_state = $state
        exit_code = $build.execution.exit_code
        timed_out = $build.execution.timed_out
        spawned = $build.execution.spawned
    }) -Warnings $warnings -Concerns $concerns -FailedChecks $failed -HumanDecisions $(if ($failed.Count -gt 0 -or $concerns.Count -gt 0) { @("Fix failing build/test evidence or explicitly choose a recovery path.") } else { @() }))
}

function Evaluate-SafetyGate {
    param(
        $ExecutionSource,
        $DiffSource,
        $BuildSource
    )

    $failed = @()
    $warnings = @()

    if ($DiffSource.present) {
        $signals = @(As-Array -Value $DiffSource.value.summary.attention_signals | ForEach-Object { [string]$_ })
        if ($signals -contains "local_private_path_changed") {
            $failed += "DiffAnalysis detected local/private path changes."
        }
        if ($signals -contains "runtime_or_dependency_path_changed") {
            $failed += "DiffAnalysis detected runtime/dependency path changes."
        }
    }
    else {
        $warnings += "Safety gate could not inspect diff attention signals because DiffAnalysis is missing."
    }

    $completionMarkers = @()
    if ($ExecutionSource.present -and $null -ne $ExecutionSource.value.collection.completion_state) {
        $completionMarkers += "ExecutionResult.collection.completion_state"
    }
    if ($DiffSource.present -and $null -ne $DiffSource.value.collection.completion_state) {
        $completionMarkers += "DiffAnalysis.collection.completion_state"
    }
    if ($BuildSource.present -and $null -ne $BuildSource.value.execution.completion_state) {
        $completionMarkers += "BuildTestResult.execution.completion_state"
    }
    if ($completionMarkers.Count -gt 0) {
        $failed += "Source artifact already contains completion marker(s): $($completionMarkers -join ', ')."
    }

    if ($failed.Count -gt 0) {
        return (New-GateResult -Name "safety_gate" -Status "FAIL" -Summary "Safety gate found unsafe verification evidence." -Evidence ([ordered]@{
            inspected_sources = @($ExecutionSource.present, $DiffSource.present, $BuildSource.present)
        }) -Warnings $warnings -FailedChecks $failed -HumanDecisions @("Do not mark the task complete until unsafe evidence is resolved."))
    }

    $status = "PASS"
    if ($warnings.Count -gt 0) {
        $status = "PASS_WITH_NOTES"
    }

    return (New-GateResult -Name "safety_gate" -Status $status -Summary "Safety gate found no unsafe local/private, runtime/dependency, or completion-state changes." -Evidence ([ordered]@{
        inspected_sources = @($ExecutionSource.present, $DiffSource.present, $BuildSource.present)
    }) -Warnings $warnings)
}

function Get-RecommendedAction {
    param([string]$Verdict)

    if ($Verdict -eq "PASS") {
        return "Proceed to WF-305 CompletionReport or human completion review."
    }
    if ($Verdict -eq "PASS_WITH_NOTES") {
        return "Proceed after reviewing non-blocking notes."
    }
    if ($Verdict -eq "CONCERNS") {
        return "Human Director should review concerns before accepting completion or commit."
    }
    if ($Verdict -eq "BLOCKED") {
        return "Provide missing required evidence before completion."
    }
    if ($Verdict -eq "FAIL") {
        return "Fix failed checks or choose a recovery task before completion."
    }

    return "Review VerificationReport before continuing."
}

function New-VerificationReport {
    param(
        [string]$Repo,
        $Runtime,
        [string]$ReportId,
        $Task,
        $ExecutionSource,
        $DiffSource,
        $BuildSource
    )

    $executionGate = Evaluate-ExecutionGate -Source $ExecutionSource
    $diffGate = Evaluate-DiffGate -Source $DiffSource -Task $Task
    $buildGate = Evaluate-BuildTestGate -Source $BuildSource
    $safetyGate = Evaluate-SafetyGate -ExecutionSource $ExecutionSource -DiffSource $DiffSource -BuildSource $BuildSource
    $gates = @($executionGate, $diffGate, $buildGate, $safetyGate)
    $verdict = Get-WorstVerdict -Verdicts @($gates | ForEach-Object { $_.status })
    $warnings = @($gates | ForEach-Object { As-Array -Value $_.warnings } | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $concerns = @($gates | ForEach-Object { As-Array -Value $_.concerns } | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $blockers = @($gates | ForEach-Object { As-Array -Value $_.blockers } | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $failedChecks = @($gates | ForEach-Object { As-Array -Value $_.failed_checks } | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $humanDecisions = @($gates | ForEach-Object { As-Array -Value $_.human_decisions } | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Sort-Object -Unique)
    $generatedAt = Get-NowText

    return [ordered]@{
        schema_version = 1
        verification_report_id = $ReportId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        generated_at = $generatedAt
        generator = "verification_report"
        task_context = [ordered]@{
            found_in_backlog = ($null -ne $Task)
            priority = if ($null -eq $Task) { $null } else { $Task.priority }
            status = if ($null -eq $Task) { $null } else { $Task.status }
            kind = if ($null -eq $Task) { $null } else { $Task.kind }
            title = if ($null -eq $Task) { $null } else { $Task.title }
            validation = if ($null -eq $Task) { $null } else { $Task.validation }
        }
        sources = [ordered]@{
            execution_result = [ordered]@{
                present = [bool]$ExecutionSource.present
                result_id = $ExecutionSource.selected_id
                result_path = $ExecutionSource.path
                missing_reason = $ExecutionSource.missing_reason
            }
            diff_analysis = [ordered]@{
                present = [bool]$DiffSource.present
                analysis_id = $DiffSource.selected_id
                analysis_path = $DiffSource.path
                missing_reason = $DiffSource.missing_reason
            }
            build_test_result = [ordered]@{
                present = [bool]$BuildSource.present
                build_test_id = $BuildSource.selected_id
                build_test_path = $BuildSource.path
                missing_reason = $BuildSource.missing_reason
            }
        }
        verdict = [ordered]@{
            level = $verdict
            summary = "VerificationReport verdict is $verdict."
            recommended_user_action = Get-RecommendedAction -Verdict $verdict
            human_decision_required = ($verdict -in @("CONCERNS", "BLOCKED", "FAIL"))
        }
        gates = [ordered]@{
            execution_result_gate = $executionGate
            diff_gate = $diffGate
            build_test_gate = $buildGate
            safety_gate = $safetyGate
        }
        warnings = @($warnings)
        concerns = @($concerns)
        blockers = @($blockers)
        failed_checks = @($failedChecks)
        human_decisions = @($humanDecisions)
        invariants = [ordered]@{
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_commit_or_push = $true
            no_completion_report = $true
            no_auto_approval_policy = $true
        }
        handoff = [ordered]@{
            wf_305_completion_report = [ordered]@{
                may_read_verification_report = $true
                requires_human_review_when_verdict = @("CONCERNS", "BLOCKED", "FAIL")
            }
            no_completion_decision = $true
            no_finalization = $true
        }
    }
}

function Update-TaskRunVerificationState {
    param(
        [string]$Repo,
        $TaskRunState,
        [string]$TaskRunStatePath,
        $Report,
        [string]$ReportPath
    )

    if ($null -eq $TaskRunState.verification_report) {
        Set-ObjectProperty -Object $TaskRunState -Name "verification_report" -Value ([pscustomobject]@{})
    }

    $reportRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $ReportPath
    Set-ObjectProperty -Object $TaskRunState.verification_report -Name "latest_verification_report_id" -Value $Report.verification_report_id
    Set-ObjectProperty -Object $TaskRunState.verification_report -Name "latest_verification_report_path" -Value $reportRef
    Set-ObjectProperty -Object $TaskRunState.verification_report -Name "latest_verdict" -Value $Report.verdict.level
    Set-ObjectProperty -Object $TaskRunState.verification_report -Name "latest_generated_at" -Value $Report.generated_at
    Set-ObjectProperty -Object $TaskRunState.verification_report -Name "human_decision_required" -Value $Report.verdict.human_decision_required
    Set-ObjectProperty -Object $TaskRunState.verification_report -Name "source_ids" -Value ([ordered]@{
        result_id = $Report.sources.execution_result.result_id
        analysis_id = $Report.sources.diff_analysis.analysis_id
        build_test_id = $Report.sources.build_test_result.build_test_id
    })
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$ReportId,
        [string]$ReportPath,
        [string]$Verdict
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "verification_report_created"
        severity = "info"
        message = "Verification report created."
        source = "verification_report"
        data = [ordered]@{
            verification_report_id = $ReportId
            verification_report_path = $ReportPath
            verdict = $Verdict
            display_only = $true
        }
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 12)
    return $event.event_id
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 24
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Verification Report"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.verification_report_id)) {
        Write-Host "VerificationReport: $($Result.verification_report_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.verdict)) {
        Write-Host "Verdict: $($Result.verdict)"
    }
    Write-Host "============================================================"
    exit $ExitCode
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        $RepoRoot = Join-Path $PSScriptRoot "..\.."
    }

    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $safeResultId = Get-SafeResultIdOrEmpty -Value $ResultId
    $safeAnalysisId = Get-SafeAnalysisIdOrEmpty -Value $AnalysisId
    $safeBuildTestId = Get-SafeBuildTestIdOrEmpty -Value $BuildTestId
    $safeReportId = Get-SafeReportIdOrEmpty -Value $ReportId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureVerificationDirs:($Command -eq "generate")
    $manifest = Get-VerificationManifest -Path $runtime.paths.verification_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $ids = @($manifest.verification_report_ids)
        $latestId = if ([string]::IsNullOrWhiteSpace([string]$manifest.latest_verification_report_id)) { $null } else { [string]$manifest.latest_verification_report_id }
        $latestPath = if ($null -eq $latestId) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-VerificationReportPath -ResultsDir $runtime.paths.verification_results_dir -ReportId $latestId) }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            verification_report_count = $ids.Count
            latest_verification_report_id = $latestId
            latest_verification_report_path = $latestPath
            verification_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.verification_manifest_path
            task_run_verification_report = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "verification_report"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safeReportId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string]$manifest.latest_verification_report_id
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            throw "No verification_report_id was provided and no latest VerificationReport exists."
        }

        $path = Get-VerificationReportPath -ResultsDir $runtime.paths.verification_results_dir -ReportId $targetId
        if (-not (Test-Path -LiteralPath $path)) {
            throw "VerificationReport does not exist: $targetId"
        }
        $report = Read-JsonFile -Path $path

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            verification_report_id = $targetId
            verification_report_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            verdict = $report.verdict.level
            verification_report = $report
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "generate") {
        $reportIdToWrite = if ([string]::IsNullOrWhiteSpace($safeReportId)) { New-VerificationReportId } else { $safeReportId }
        $reportPath = Get-VerificationReportPath -ResultsDir $runtime.paths.verification_results_dir -ReportId $reportIdToWrite
        if (Test-Path -LiteralPath $reportPath) {
            throw "VerificationReport already exists: $reportIdToWrite"
        }

        $task = Get-BacklogTaskOrNull -Repo $repo -TaskId $safeTaskId
        $executionSource = Resolve-ExecutionResultSource -Repo $repo -Runtime $runtime -RequestedId $safeResultId
        $diffSource = Resolve-DiffAnalysisSource -Repo $repo -Runtime $runtime -RequestedId $safeAnalysisId
        $buildSource = Resolve-BuildTestSource -Repo $repo -Runtime $runtime -RequestedId $safeBuildTestId
        $report = New-VerificationReport -Repo $repo -Runtime $runtime -ReportId $reportIdToWrite -Task $task -ExecutionSource $executionSource -DiffSource $diffSource -BuildSource $buildSource
        $reportRef = ConvertTo-RepoRelativePath -Repo $repo -Path $reportPath

        Save-JsonFile -Path $reportPath -Value $report
        Save-VerificationManifest -Path $runtime.paths.verification_manifest_path -Manifest $manifest -ReportId $reportIdToWrite
        Update-TaskRunVerificationState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Report $report -ReportPath $reportPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -ReportId $reportIdToWrite -ReportPath $reportRef -Verdict $report.verdict.level

        $result = [pscustomobject]@{
            ok = $true
            command = "generate"
            task_id = $safeTaskId
            verification_report_id = $reportIdToWrite
            verification_report_path = $reportRef
            latest_progress_event_id = $eventId
            verdict = $report.verdict.level
            human_decision_required = $report.verdict.human_decision_required
            recommended_user_action = $report.verdict.recommended_user_action
            verification_report = $report
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }
}
catch {
    $result = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $TaskId
        result_id = $ResultId
        analysis_id = $AnalysisId
        build_test_id = $BuildTestId
        verification_report_id = $ReportId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
