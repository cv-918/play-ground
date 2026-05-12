param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "plan", "start", "continue", "stop", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$Profile = "",

    [string]$Executor = "",

    [string]$RunnerRunId = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText { return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz") }
function Get-Stamp { return (Get-Date -Format "yyyyMMdd-HHmmss-fff") }
function New-ShortGuid { return ([Guid]::NewGuid().ToString("N").Substring(0, 8)) }
function New-EventId { return ("event-" + (Get-Stamp) + "-" + (New-ShortGuid)) }

function Write-Utf8Text {
    param([string]$Path, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::WriteAllText($Path, $Text, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Append-Utf8Line {
    param([string]$Path, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $encoding)
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds (100 * $attempt)
        }
    }
}

function Read-Utf8Text {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return "" }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Read-JsonFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { throw "JSON file not found: $Path" }
    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) { throw "JSON file is empty: $Path" }
    return ($raw | ConvertFrom-Json)
}

function Read-JsonFileOrNull {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $raw = Read-Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    return ($raw | ConvertFrom-Json)
}

function Save-JsonFile {
    param([string]$Path, $Value)
    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 40) + "`n")
}

function ConvertTo-RepoRelativePath {
    param([string]$Repo, [string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    if ([System.IO.Path]::IsPathRooted($Path)) {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
    }
    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $full.Substring($root.Length).TrimStart("\", "/")
        if ([string]::IsNullOrWhiteSpace($relative)) { return "." }
        return ($relative -replace "\\", "/")
    }
    return ($full -replace "\\", "/")
}

function Resolve-RepoPath {
    param([string]$Repo, [string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return "" }
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
}

function Get-SafeTaskId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Task id is required." }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid task id. Use a plain task id without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) { throw "Invalid task id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeRunnerRunIdOrEmpty {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^runner-run-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid runner_run_id."
    }
    if ($trimmed.Contains("..")) { throw "Invalid runner_run_id. Parent path traversal is not allowed." }
    return $trimmed
}

function Get-SafeProfile {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "validation" }
    $trimmed = $Value.Trim().ToLowerInvariant()
    if (@("analysis", "implementation", "validation", "documentation") -notcontains $trimmed) {
        throw "Invalid profile. Use analysis, implementation, validation, or documentation."
    }
    return $trimmed
}

function Get-SafeExecutor {
    param([string]$Value, [string]$ProfileValue)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        if ($ProfileValue -eq "validation") { return "local_cli" }
        return "codex_cli"
    }
    $trimmed = $Value.Trim().ToLowerInvariant()
    if (@("codex_cli", "local_cli") -notcontains $trimmed) {
        throw "Invalid executor. Use codex_cli or local_cli."
    }
    return $trimmed
}

function As-Array {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [System.Array]) { return @($Value) }
    return @($Value)
}

function Set-ObjectProperty {
    param($Object, [string]$Name, $Value)
    if ($null -ne $Object.PSObject.Properties[$Name]) { $Object.$Name = $Value }
    else { $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value }
}

function Get-WorkspacePaths {
    param([string]$Repo, [string]$TaskId)
    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $runnerDir = Join-Path $workspacePath "runner"
    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        runtime_control_history_path = Join-Path $workspacePath "runtime_control_history.jsonl"
        runner_dir = $runnerDir
        runner_manifest_path = Join-Path $runnerDir "runner_manifest.json"
        plans_dir = Join-Path $runnerDir "plans"
        runs_dir = Join-Path $runnerDir "runs"
        checkpoints_dir = Join-Path $runnerDir "checkpoints"
        config_dir = Join-Path $runnerDir "config"
        prompts_dir = Join-Path $runnerDir "prompts"
        text_encoding_guard_dir = Join-Path $runnerDir "text_encoding_guard"
    }
}

function Ensure-RunnerDirs {
    param($Paths)
    New-Item -ItemType Directory -Path $Paths.plans_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $Paths.runs_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $Paths.checkpoints_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $Paths.config_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $Paths.prompts_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $Paths.text_encoding_guard_dir -Force | Out-Null
}

function Parse-BacklogRows {
    param([string]$Text)
    $rows = @()
    foreach ($lineObj in ($Text -split "`r?`n")) {
        $line = ([string]$lineObj).Trim()
        if (-not $line.StartsWith("|")) { continue }
        $cells = @($line.Trim("|".ToCharArray()).Split("|".ToCharArray()) | ForEach-Object { ([string]$_).Trim() })
        if ($cells.Count -lt 8) { continue }
        if ($cells[0] -notmatch "^(WF|GAME|VAL|DOC|UNITY)-") { continue }
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

function Get-BacklogTask {
    param([string]$Repo, [string]$TaskId)
    $backlogPath = Join-Path $Repo "_Docs\AIWorkflow\Backlog.md"
    $rows = @(Parse-BacklogRows -Text (Read-Utf8Text -Path $backlogPath) | Where-Object { $_.id -eq $TaskId })
    if ($rows.Count -gt 1) { throw "Duplicate task_id found in Backlog.md: $TaskId" }
    if ($rows.Count -eq 0) { return $null }
    return $rows[0]
}

function Get-ActiveTaskId {
    param([string]$Repo)
    $activePath = Join-Path $Repo "_Docs\AIWorkflow\ActiveTask.md"
    $text = Read-Utf8Text -Path $activePath
    $match = [regex]::Match($text, "(?m)^task_id:\s*(\S+)\s*$")
    if ($match.Success) { return $match.Groups[1].Value.Trim() }
    return ""
}

function Get-GitStatusShort {
    param([string]$Repo)
    $output = & git -C $Repo status --short 2>$null
    if ($null -eq $output) { return @() }
    return @($output | ForEach-Object { [string]$_ })
}

function Invoke-ToolJson {
    param(
        [string]$Repo,
        [string]$RelativeScriptPath,
        [string[]]$Arguments,
        [bool]$AllowFailure = $false
    )
    $scriptPath = Join-Path $Repo $RelativeScriptPath
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "Tool script not found: $RelativeScriptPath"
    }
    $outputLines = & $scriptPath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $stdout = (($outputLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    $parsed = $null
    $parseError = $null
    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
        try { $parsed = ($stdout | ConvertFrom-Json) }
        catch { $parseError = $_.Exception.Message }
    }
    $ok = ($exitCode -eq 0) -and ($null -ne $parsed) -and ($parsed.ok -ne $false)
    if (-not $ok -and -not $AllowFailure) {
        $message = if ($null -ne $parsed -and $parsed.error) { $parsed.error } elseif ($parseError) { $parseError } else { $stdout }
        throw "Tool failed: $RelativeScriptPath $($Arguments -join ' ') :: $message"
    }
    return [pscustomobject]@{
        ok = $ok
        exit_code = $exitCode
        script = $RelativeScriptPath
        args = @($Arguments)
        data = $parsed
        stdout = $stdout
        parse_error = $parseError
    }
}

function Invoke-PowerShellToolJson {
    param(
        [string]$Repo,
        [string]$RelativeScriptPath,
        [hashtable]$Parameters
    )
    $scriptPath = Join-Path $Repo $RelativeScriptPath
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "Tool script not found: $RelativeScriptPath"
    }
    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $scriptPath)
    foreach ($key in $Parameters.Keys) {
        $value = $Parameters[$key]
        if ($null -eq $value) { continue }
        $arguments += "-$key"
        if ($value -is [bool]) {
            if (-not $value) {
                $arguments = $arguments[0..($arguments.Count - 2)]
            }
        }
        else {
            $arguments += [string]$value
        }
    }
    $outputLines = & powershell.exe @arguments 2>&1
    $exitCode = $LASTEXITCODE
    $stdout = (($outputLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    $parsed = $null
    $parseError = $null
    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
        try { $parsed = ($stdout | ConvertFrom-Json) }
        catch { $parseError = $_.Exception.Message }
    }
    $ok = ($exitCode -eq 0) -and ($null -ne $parsed) -and ($parsed.ok -ne $false)
    if (-not $ok) {
        $message = if ($null -ne $parsed -and $parsed.error) { $parsed.error } elseif ($parseError) { $parseError } else { $stdout }
        throw "Tool failed: $RelativeScriptPath :: $message"
    }
    return [pscustomobject]@{
        ok = $ok
        exit_code = $exitCode
        script = $RelativeScriptPath
        data = $parsed
        stdout = $stdout
        parse_error = $parseError
    }
}

function Write-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$RunnerRunId,
        [string]$EventType,
        [string]$Message,
        $Data = $null
    )
    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        runner_run_id = $RunnerRunId
        event_type = $EventType
        severity = "info"
        message = $Message
        source = "pc_runner"
        data = $Data
        created_at = Get-NowText
    }
    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Depth 24 -Compress)
    return $event.event_id
}

function Load-RunnerManifest {
    param($Paths)
    $manifest = Read-JsonFileOrNull -Path $Paths.runner_manifest_path
    if ($null -ne $manifest) { return $manifest }
    return [pscustomobject]@{
        schema_version = 1
        runner = "pc_runner"
        runner_plan_count = 0
        runner_run_count = 0
        latest_runner_plan_id = $null
        latest_runner_run_id = $null
        plans = @()
        runs = @()
        updated_at = $null
    }
}

function Save-RunnerManifest {
    param($Paths, $Manifest)
    Save-JsonFile -Path $Paths.runner_manifest_path -Value $Manifest
}

function Add-ManifestEntry {
    param($Manifest, [string]$Kind, [string]$Id, [string]$Path)
    $entry = [pscustomobject]@{ id = $Id; path = $Path; updated_at = Get-NowText }
    if ($Kind -eq "plan") {
        $items = @(As-Array -Value $Manifest.plans)
        $items = @($items | Where-Object { $_.id -ne $Id })
        $items += $entry
        Set-ObjectProperty -Object $Manifest -Name "plans" -Value @($items)
        Set-ObjectProperty -Object $Manifest -Name "runner_plan_count" -Value $items.Count
        Set-ObjectProperty -Object $Manifest -Name "latest_runner_plan_id" -Value $Id
    }
    if ($Kind -eq "run") {
        $items = @(As-Array -Value $Manifest.runs)
        $items = @($items | Where-Object { $_.id -ne $Id })
        $items += $entry
        Set-ObjectProperty -Object $Manifest -Name "runs" -Value @($items)
        Set-ObjectProperty -Object $Manifest -Name "runner_run_count" -Value $items.Count
        Set-ObjectProperty -Object $Manifest -Name "latest_runner_run_id" -Value $Id
    }
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
}

function New-IdSet {
    param([string]$TaskId)
    $stamp = Get-Stamp
    $safeTask = ($TaskId -replace "[^A-Za-z0-9_.-]", "-").ToLowerInvariant()
    return [pscustomobject]@{
        stamp = $stamp
        runner_plan_id = "runner-plan-$safeTask-$stamp"
        runner_run_id = "runner-run-$safeTask-$stamp"
        checkpoint_prefix = "checkpoint-$safeTask"
        session_id = "session-$safeTask-local-cli-$stamp"
        codex_session_id = "session-$safeTask-codex-cli-$stamp"
        local_evidence_id = "evidence-$safeTask-local-cli-$stamp"
        codex_evidence_id = "evidence-$safeTask-codex-cli-$stamp"
        filewatch_evidence_id = "evidence-$safeTask-filewatch-$stamp"
        prompt_id = "runner-prompt-$safeTask-$stamp"
        text_encoding_guard_id = "textguard-$safeTask-$stamp"
        result_id = "result-$safeTask-$stamp"
        analysis_id = "analysis-$safeTask-$stamp"
        build_test_id = "bt-$safeTask-json-smoke-$stamp"
        verification_id = "verification-$safeTask-$stamp"
        completion_id = "completion-$safeTask-$stamp"
        card_id = "card-$safeTask-$stamp"
        autoeval_id = "autoeval-$safeTask-$stamp"
        followup_id = "followup-$safeTask-$stamp"
    }
}

function New-Preflight {
    param([string]$Repo, [string]$TaskId, [string]$ProfileValue, [string]$ExecutorValue)
    $task = Get-BacklogTask -Repo $Repo -TaskId $TaskId
    $activeTaskId = Get-ActiveTaskId -Repo $Repo
    $statusShort = Get-GitStatusShort -Repo $Repo
    $approvalOk = $false
    $stopReason = $null
    $humanGate = $null
    if ($null -eq $task) {
        $stopReason = "task_not_found"
        $humanGate = "Create or select a valid Backlog task before running PC Runner."
    }
    else {
        $approvalOk = @("ready_for_implementation", "in_progress") -contains $task.status
        if (-not $approvalOk) {
            $stopReason = "approval_required"
            $humanGate = "Approve the task scope before PC Runner start."
        }
        elseif ($activeTaskId -ne $TaskId) {
            $stopReason = "active_task_mismatch"
            $humanGate = "Set ActiveTask to this task or run a read-only plan only."
        }
    }
    $profileSupportedForStart = ($ProfileValue -eq "validation") -or (($ProfileValue -eq "implementation") -and ($ExecutorValue -eq "codex_cli"))
    if ($approvalOk -and $activeTaskId -eq $TaskId -and -not $profileSupportedForStart) {
        $stopReason = "executor_not_ready"
        $humanGate = "This runner profile requires a supported executor. Use validation/local_cli or implementation/codex_cli."
    }
    return [pscustomobject]@{
        task_found = $null -ne $task
        task = $task
        active_task_id = $activeTaskId
        active_task_matches = $activeTaskId -eq $TaskId
        approval_ok = $approvalOk
        profile = $ProfileValue
        executor = $ExecutorValue
        profile_supported_for_start = $profileSupportedForStart
        stop_reason = $stopReason
        human_gate = $humanGate
        git_status_short = @($statusShort)
        checked_at = Get-NowText
    }
}

function New-RunnerPlan {
    param(
        [string]$TaskId,
        [string]$ProfileValue,
        [string]$ExecutorValue,
        $Preflight,
        $Ids
    )
    if ($ProfileValue -eq "implementation") {
        $plannedSteps = @(
            "task_workspace_manager.create_or_read",
            "runner.write_implementation_prompt",
            "codex_cli_adapter.dry-run",
            "codex_cli_adapter.run",
            "runner.text_encoding_guard",
            "file_watcher.snapshot",
            "result_collector.collect",
            "diff_analyzer.analyze",
            "build_test_runner.run.json_smoke",
            "verification_report.generate",
            "completion_report.generate",
            "completion_card.generate",
            "stop.completion_review_required"
        )
        $sessionId = $Ids.codex_session_id
        $evidenceIds = @($Ids.codex_evidence_id, $Ids.filewatch_evidence_id)
    }
    else {
        $plannedSteps = @(
            "task_workspace_manager.create_or_read",
            "local_cli_adapter.run.node_version",
            "file_watcher.snapshot",
            "result_collector.collect",
            "diff_analyzer.analyze",
            "build_test_runner.run.json_smoke",
            "verification_report.generate",
            "completion_report.generate",
            "completion_card.generate",
            "stop.completion_review_required"
        )
        $sessionId = $Ids.session_id
        $evidenceIds = @($Ids.local_evidence_id, $Ids.filewatch_evidence_id)
    }

    return [ordered]@{
        schema_version = 1
        task_id = $TaskId
        runner_plan_id = $Ids.runner_plan_id
        profile = $ProfileValue
        executor = $ExecutorValue
        approval_state = if ($Preflight.approval_ok) { "approved" } else { "approval_required" }
        preflight_result = $Preflight
        planned_steps = @($plannedSteps)
        human_gates = @(
            "approval_required",
            "runtime_control_pending",
            "verification_review_required",
            "completion_review_required",
            "done_or_commit_decision"
        )
        stop_conditions = @(
            "task_not_found",
            "approval_required",
            "active_task_mismatch",
            "profile_not_executable_yet",
            "executor_not_ready",
            "text_encoding_guard_failed",
            "primitive_call_failed",
            "finalization_not_accepted",
            "completion_review_required"
        )
        expected_artifacts = [ordered]@{
            runner_run_id = $Ids.runner_run_id
            session_id = $sessionId
            evidence_ids = @($evidenceIds)
            prompt_id = $(if ($ProfileValue -eq "implementation") { $Ids.prompt_id } else { $null })
            text_encoding_guard_id = $(if ($ProfileValue -eq "implementation") { $Ids.text_encoding_guard_id } else { $null })
            result_id = $Ids.result_id
            analysis_id = $Ids.analysis_id
            build_test_id = $Ids.build_test_id
            verification_report_id = $Ids.verification_id
            completion_report_id = $Ids.completion_id
            completion_card_id = $Ids.card_id
        }
        created_at = Get-NowText
    }
}

function Save-RunnerPlan {
    param($Paths, $Plan)
    Ensure-RunnerDirs -Paths $Paths
    $path = Join-Path $Paths.plans_dir "$($Plan.runner_plan_id).json"
    Save-JsonFile -Path $path -Value $Plan
    $manifest = Load-RunnerManifest -Paths $Paths
    Add-ManifestEntry -Manifest $manifest -Kind "plan" -Id $Plan.runner_plan_id -Path (ConvertTo-RepoRelativePath -Repo $repo -Path $path)
    Save-RunnerManifest -Paths $Paths -Manifest $manifest
    return $path
}

function New-Checkpoint {
    param(
        $Paths,
        [string]$TaskId,
        [string]$RunnerRunId,
        [string]$RunId,
        [string]$Phase,
        [string]$Step,
        [string]$Status,
        $Inputs,
        $Outputs,
        [string]$NextStep = "",
        [string]$StopReason = ""
    )
    $checkpointId = "checkpoint-$($TaskId.ToLowerInvariant())-$Phase-$(Get-Stamp)"
    $checkpoint = [ordered]@{
        schema_version = 1
        task_id = $TaskId
        run_id = $RunId
        runner_run_id = $RunnerRunId
        checkpoint_id = $checkpointId
        phase = $Phase
        step = $Step
        status = $Status
        inputs = $Inputs
        outputs = $Outputs
        next_step = $NextStep
        stop_reason = $StopReason
        created_at = Get-NowText
    }
    $path = Join-Path $Paths.checkpoints_dir "$checkpointId.json"
    Save-JsonFile -Path $path -Value $checkpoint
    return [pscustomobject]@{ id = $checkpointId; path = ConvertTo-RepoRelativePath -Repo $repo -Path $path; checkpoint = $checkpoint }
}

function Save-RunnerRun {
    param($Paths, $RunState)
    Ensure-RunnerDirs -Paths $Paths
    $path = Join-Path $Paths.runs_dir "$($RunState.runner_run_id).json"
    Save-JsonFile -Path $path -Value $RunState
    $manifest = Load-RunnerManifest -Paths $Paths
    Add-ManifestEntry -Manifest $manifest -Kind "run" -Id $RunState.runner_run_id -Path (ConvertTo-RepoRelativePath -Repo $repo -Path $path)
    Save-RunnerManifest -Paths $Paths -Manifest $manifest
    return $path
}

function Set-ReportId {
    param($RunState, [string]$Name, [string]$Value)
    if ($null -eq $RunState.report_ids) {
        Set-ObjectProperty -Object $RunState -Name "report_ids" -Value ([pscustomobject]@{})
    }
    if ($RunState.report_ids -is [System.Collections.IDictionary]) {
        $RunState.report_ids[$Name] = $Value
    }
    else {
        Set-ObjectProperty -Object $RunState.report_ids -Name $Name -Value $Value
    }
}

function Write-ValidationConfigs {
    param($Paths)
    Ensure-RunnerDirs -Paths $Paths
    $localCliConfigPath = Join-Path $Paths.config_dir "local_cli_adapter.pc_runner.json"
    $buildTestConfigPath = Join-Path $Paths.config_dir "build_test_runner.pc_runner.json"
    $fileWatcherConfigPath = Join-Path $Paths.config_dir "file_watcher.pc_runner.json"

    $localCliConfig = [ordered]@{
        schema_version = 1
        enabled = $true
        allowed_task_statuses = @("ready_for_implementation", "in_progress")
        require_backlog_approval = $true
        commands = @(
            [ordered]@{
                command_id = "node_version"
                enabled = $true
                description = "Print Node.js version for PC Runner validation profile smoke."
                command = "node"
                args = @("--version")
                working_directory = "."
                timeout_seconds = 10
                env = @{}
                capture_changed_files = $true
                capture_diff_snapshot = $true
            }
        )
    }

    $buildTestConfig = [ordered]@{
        schema_version = 1
        enabled = $true
        allowed_task_statuses = @("ready_for_implementation", "in_progress")
        require_backlog_approval = $true
        commands = @(
            [ordered]@{
                command_id = "json_smoke"
                kind = "test"
                label = "JSON syntax smoke check"
                enabled = $true
                approval_level = "auto_allowed"
                command = "tools\aiworkflow\json_smoke_check.bat"
                args = @()
                working_directory = "."
                timeout_seconds = 60
                env = @{}
            }
        )
    }

    $fileWatcherConfig = [ordered]@{
        schema_version = 1
        include_untracked = $false
        capture_diff_snapshot = $true
        max_recent_changed_files = 12
        ignore_paths = @(".git/**", "_Temp/**", "_Local/**", "node_modules/**", ".env", "*.log", "*.tmp", "*.local.json")
    }

    Save-JsonFile -Path $localCliConfigPath -Value $localCliConfig
    Save-JsonFile -Path $buildTestConfigPath -Value $buildTestConfig
    Save-JsonFile -Path $fileWatcherConfigPath -Value $fileWatcherConfig

    return [pscustomobject]@{
        local_cli = ConvertTo-RepoRelativePath -Repo $repo -Path $localCliConfigPath
        build_test = ConvertTo-RepoRelativePath -Repo $repo -Path $buildTestConfigPath
        file_watcher = ConvertTo-RepoRelativePath -Repo $repo -Path $fileWatcherConfigPath
    }
}

function Get-MojibakeTokens {
    function New-Token {
        param([int[]]$Codepoints)
        return (-join ($Codepoints | ForEach-Object { [string][char]$_ }))
    }

    return @(
        [string][char]0xFFFD,
        (New-Token @(0x00C3)),
        (New-Token @(0x00C2)),
        (New-Token @(0x00E2, 0x20AC, 0x2122)),
        (New-Token @(0x00E2, 0x20AC, 0x0153)),
        (New-Token @(0x00E2, 0x20AC)),
        (New-Token @(0x00EC)),
        (New-Token @(0x00ED)),
        (New-Token @(0x00EB)),
        (New-Token @(0x00EA)),
        (New-Token @(0xF9CF)),
        (New-Token @(0x8E42)),
        (New-Token @(0x5A9B)),
        (New-Token @(0x8ADB)),
        (New-Token @(0x63F4)),
        (New-Token @(0x6E72)),
        (New-Token @(0x5BC3)),
        (New-Token @(0x81FE)),
        (New-Token @(0xC10F)),
        (New-Token @(0xB349)),
        (New-Token @(0xC496)),
        (New-Token @(0xB4BF)),
        (New-Token @(0xB572)),
        (New-Token @(0xAFA9)),
        (New-Token @(0xBB12)),
        (New-Token @(0xC7FB)),
        (New-Token @(0xC10E)),
        (New-Token @(0xB300, 0xCFB2)),
        (New-Token @(0x8E42, 0x0080)),
        (New-Token @(0x6E72, 0xB349)),
        (New-Token @(0x5BC3, 0x0080)),
        (New-Token @(0xF9DE)),
        (New-Token @(0x91AB))
    )
}

function Get-MojibakeSignals {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return @() }

    $signals = [ordered]@{}
    foreach ($token in @(Get-MojibakeTokens)) {
        if ([string]::IsNullOrEmpty($token)) { continue }
        if ($Text.Contains($token)) {
            $signals[$token] = $true
        }
    }

    return @($signals.Keys)
}

function Get-MojibakeSamples {
    param(
        [string]$Text,
        [string[]]$Signals,
        [int]$MaxSamples = 3
    )
    if ([string]::IsNullOrEmpty($Text) -or $Signals.Count -eq 0) { return @() }

    $samples = @()
    foreach ($line in ($Text -split "`r?`n")) {
        foreach ($signal in @($Signals)) {
            if ($line.Contains($signal)) {
                $sample = $line.Trim()
                if ($sample.Length -gt 180) {
                    $sample = $sample.Substring(0, 180) + "..."
                }
                $samples += $sample
                break
            }
        }
        if ($samples.Count -ge $MaxSamples) { break }
    }

    return @($samples)
}

function Test-TextGuardCandidatePath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    return @(
        ".bat", ".c", ".cc", ".cmd", ".cpp", ".cs", ".csv", ".cxx",
        ".filters", ".h", ".hpp", ".inl", ".js", ".json", ".md",
        ".props", ".ps1", ".psm1", ".sln", ".targets", ".ts", ".txt",
        ".vcxproj", ".xml", ".yaml", ".yml"
    ) -contains $extension
}

function Test-TextEncodingGuardIgnoredLine {
    param([string]$Line)
    if ([string]::IsNullOrWhiteSpace($Line)) { return $false }

    $trimmed = $Line.Trim()
    if ($trimmed -match '(\brg\s+-n\b|powershell(\.exe)?"?\s+-Command.*\brg\s+-n\b|Select-String\s+.*-Pattern)') {
        return $true
    }
    if ($trimmed -match '^\+.*(mojibake|replacement-character|replacement character|guard scan|encoding guard)') {
        return $true
    }

    return $false
}

function Get-TextEncodingGuardScannableText {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return "" }

    $lines = @()
    foreach ($line in ($Text -split "`r?`n")) {
        if (Test-TextEncodingGuardIgnoredLine -Line $line) { continue }
        $lines += $line
    }

    return ($lines -join [Environment]::NewLine)
}

function Get-GitTextEncodingGuardChangedFiles {
    param([string]$Repo)

    $paths = [ordered]@{}
    foreach ($gitArgs in @(
        @("diff", "--name-only"),
        @("diff", "--cached", "--name-only")
    )) {
        $previousErrorActionPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $output = & git -C $Repo @gitArgs 2>$null
            $exitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        if ($exitCode -ne 0 -or $null -eq $output) { continue }
        foreach ($line in @($output)) {
            $value = ([string]$line).Trim()
            if ([string]::IsNullOrWhiteSpace($value)) { continue }
            $paths[$value -replace "\\", "/"] = $true
        }
    }

    return @($paths.Keys)
}

function Add-TextEncodingGuardSource {
    param(
        [System.Collections.ArrayList]$Sources,
        [string]$Repo,
        [string]$SourceType,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) { return }
    $fullPath = Resolve-RepoPath -Repo $Repo -Path $Path
    $repoRoot = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    $repoRootWithSeparator = $repoRoot + [System.IO.Path]::DirectorySeparatorChar
    if ($fullPath -ne $repoRoot -and -not $fullPath.StartsWith($repoRootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) { return }
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { return }

    $item = [pscustomobject]@{
        source_type = $SourceType
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $fullPath
        full_path = $fullPath
    }
    [void]$Sources.Add($item)
}

function Invoke-TextEncodingGuard {
    param(
        [string]$Repo,
        $Paths,
        [string]$TaskId,
        [string]$RunId,
        [string]$RunnerRunId,
        [string]$GuardId,
        [string[]]$ChangedFiles,
        [string]$StdoutLog,
        [string]$StderrLog
    )

    Ensure-RunnerDirs -Paths $Paths
    $sources = New-Object System.Collections.ArrayList
    Add-TextEncodingGuardSource -Sources $sources -Repo $Repo -SourceType "executor_stdout_log" -Path $StdoutLog
    Add-TextEncodingGuardSource -Sources $sources -Repo $Repo -SourceType "executor_stderr_log" -Path $StderrLog

    $candidateFiles = [ordered]@{}
    foreach ($changedPath in @($ChangedFiles)) {
        if ([string]::IsNullOrWhiteSpace($changedPath)) { continue }
        $candidateFiles[$changedPath -replace "\\", "/"] = "adapter_changed_text_file"
    }
    foreach ($changedPath in @(Get-GitTextEncodingGuardChangedFiles -Repo $Repo)) {
        if ([string]::IsNullOrWhiteSpace($changedPath)) { continue }
        if (-not $candidateFiles.Contains($changedPath)) {
            $candidateFiles[$changedPath -replace "\\", "/"] = "git_worktree_text_file"
        }
    }

    foreach ($changedPath in @($candidateFiles.Keys)) {
        if (-not (Test-TextGuardCandidatePath -Path $changedPath)) { continue }
        Add-TextEncodingGuardSource -Sources $sources -Repo $Repo -SourceType $candidateFiles[$changedPath] -Path $changedPath
    }

    $findings = @()
    foreach ($source in @($sources)) {
        $text = Read-Utf8Text -Path $source.full_path
        $scanText = Get-TextEncodingGuardScannableText -Text $text
        $signals = @(Get-MojibakeSignals -Text $scanText)
        if ($signals.Count -eq 0) { continue }
        $severity = if ($source.source_type -eq "executor_stderr_log") { "warning" } else { "blocker" }
        $findings += [pscustomobject]@{
            source_type = $source.source_type
            path = $source.path
            severity = $severity
            signals = @($signals)
            samples = @(Get-MojibakeSamples -Text $scanText -Signals $signals)
        }
    }

    $blockingFindings = @($findings | Where-Object { $_.severity -eq "blocker" })
    $status = if ($blockingFindings.Count -gt 0) {
        "failed"
    }
    elseif ($findings.Count -gt 0) {
        "passed_with_warnings"
    }
    else {
        "passed"
    }
    $guardPath = Join-Path $Paths.text_encoding_guard_dir "$GuardId.json"
    $result = [pscustomobject][ordered]@{
        schema_version = 1
        text_encoding_guard_id = $GuardId
        task_id = $TaskId
        run_id = $RunId
        runner_run_id = $RunnerRunId
        status = $status
        inspected_source_count = $sources.Count
        finding_count = $findings.Count
        blocking_finding_count = $blockingFindings.Count
        findings = @($findings)
        guard_policy = [ordered]@{
            blocks_on_probable_mojibake_in_stdout = $true
            blocks_on_probable_mojibake_in_changed_text_files = $true
            records_stderr_mojibake_as_warning = $true
            scans_executor_stdout = $true
            scans_executor_stderr = $true
            scans_adapter_changed_text_files = $true
            scans_git_worktree_text_files = $true
            scans_untracked_text_files = $false
            ignores_validation_command_echo = $true
            note = "This guard detects common mojibake markers in generated text. It blocks on executor stdout or changed text file findings, and records executor stderr findings as warnings because stderr often contains shell/tool echoes."
        }
        created_at = Get-NowText
    }

    Save-JsonFile -Path $guardPath -Value $result
    Write-ProgressEvent -Path $Paths.progress_event_log_path -TaskId $TaskId -RunId $RunId -RunnerRunId $RunnerRunId -EventType "text_encoding_guard_checked" -Message "PC Runner checked executor output and changed text files for probable mojibake." -Data ([ordered]@{ text_encoding_guard_id = $GuardId; status = $status; finding_count = $findings.Count; blocking_finding_count = $blockingFindings.Count; path = ConvertTo-RepoRelativePath -Repo $Repo -Path $guardPath }) | Out-Null

    return [pscustomobject]@{
        ok = ($blockingFindings.Count -eq 0)
        text_encoding_guard_id = $GuardId
        path = ConvertTo-RepoRelativePath -Repo $Repo -Path $guardPath
        status = $status
        inspected_source_count = $sources.Count
        finding_count = $findings.Count
        blocking_finding_count = $blockingFindings.Count
        findings = @($findings)
    }
}

function Write-ImplementationPrompt {
    param($Paths, [string]$Repo, [string]$TaskId, $Task, [string]$PromptId)
    Ensure-RunnerDirs -Paths $Paths
    $path = Join-Path $Paths.prompts_dir "$PromptId.md"
    $repoLabel = ConvertTo-RepoRelativePath -Repo $Repo -Path $Repo
    $lines = @(
        "# PC Runner Implementation Request",
        "",
        "## Task",
        "- task_id: $TaskId",
        "- title: $($Task.title)",
        "- priority: $($Task.priority)",
        "- status: $($Task.status)",
        "- kind: $($Task.kind)",
        "- reason: $($Task.reason)",
        "- validation: $($Task.validation)",
        "",
        "## Required Context",
        "- Read AGENTS.md before making changes.",
        "- Read _Docs/AIWorkflow/ActiveTask.md and _Docs/AIWorkflow/Backlog.md before making changes.",
        "- Treat the approved ActiveTask and Backlog row as the task contract.",
        "",
        "## Required Scope",
        "- Implement only the approved task scope recorded in Backlog and ActiveTask.",
        "- Do not expand into unrelated cleanup, refactors, game/data changes, releases, deploys, commits, or pushes.",
        "- If the task requires a new approval decision, stop and report the decision needed.",
        "",
        "## Required Workflow Boundaries",
        "- Do not mark the task done.",
        "- Do not approve the task.",
        "- Do not create Backlog tasks.",
        "- Do not commit or push.",
        "- Do not modify _Local/, _Temp/, node_modules/, .env, or local secrets.",
        "- Preserve task lifecycle state and runtime execution state separation.",
        "",
        "## Executor And Runner Ownership",
        "- You are the executor for approved tracked repository changes only.",
        "- PC Runner owns runtime validation, local ignored config, _Temp artifacts, evidence collection, verification reports, completion cards, finalization logs, auto-approval evaluation, and follow-up plan generation.",
        "- Do not report the task blocked only because you cannot modify _Local/ or _Temp/; those paths are runner-owned and may be created by PC Runner outside your executor scope.",
        "- If the task is a runner smoke, make the tracked implementation or documentation changes requested by the task and leave runtime evidence collection to PC Runner.",
        "",
        "## Text And Encoding Requirements",
        "- Write generated text files as UTF-8.",
        "- Korean user-facing documents must contain readable Korean, not mojibake.",
        "- If output or a generated document contains replacement characters or garbled Korean, stop and report the encoding issue instead of completing the task.",
        "",
        "## Required Return Format",
        "1. Implementation summary",
        "2. Files changed",
        "3. Validation commands run",
        "4. Validation results",
        "5. Known risks",
        "6. Human decisions needed",
        "7. Commit recommendation",
        "",
        "## Repository",
        $repoLabel
    )
    Write-Utf8Text -Path $path -Text (($lines -join "`n") + "`n")
    return (ConvertTo-RepoRelativePath -Repo $Repo -Path $path)
}

function Ensure-Workspace {
    param([string]$Repo, [string]$TaskId)
    $status = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\task_workspace_manager.bat" -Arguments @("status", $TaskId, "--json") -AllowFailure $true
    if ($status.ok -and $status.data.exists -eq $true) {
        return Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\task_workspace_manager.bat" -Arguments @("read", $TaskId, "--json")
    }
    return Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\task_workspace_manager.bat" -Arguments @("create", $TaskId, "--json")
}

function Get-RunIdFromWorkspace {
    param($Paths)
    $state = Read-JsonFile -Path $Paths.task_run_state_path
    return $state.run_id
}

function Get-LatestRunnerRun {
    param($Paths)
    $manifest = Load-RunnerManifest -Paths $Paths
    if ([string]::IsNullOrWhiteSpace($manifest.latest_runner_run_id)) { return $null }
    $path = Join-Path $Paths.runs_dir "$($manifest.latest_runner_run_id).json"
    return Read-JsonFileOrNull -Path $path
}

function Get-RunnerRunById {
    param($Paths, [string]$RunnerRunId)
    if ([string]::IsNullOrWhiteSpace($RunnerRunId)) { return Get-LatestRunnerRun -Paths $Paths }
    $path = Join-Path $Paths.runs_dir "$RunnerRunId.json"
    return Read-JsonFileOrNull -Path $path
}

function Invoke-Plan {
    param([string]$Repo, [string]$TaskId, [string]$ProfileValue, [string]$ExecutorValue)
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    Ensure-Workspace -Repo $Repo -TaskId $TaskId | Out-Null
    Ensure-RunnerDirs -Paths $paths
    $ids = New-IdSet -TaskId $TaskId
    $preflight = New-Preflight -Repo $Repo -TaskId $TaskId -ProfileValue $ProfileValue -ExecutorValue $ExecutorValue
    $plan = New-RunnerPlan -TaskId $TaskId -ProfileValue $ProfileValue -ExecutorValue $ExecutorValue -Preflight $preflight -Ids $ids
    $path = Save-RunnerPlan -Paths $paths -Plan $plan
    return [pscustomobject]@{
        ok = $true
        command = "plan"
        task_id = $TaskId
        runner_plan_id = $plan.runner_plan_id
        runner_plan_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        stop_reason = $preflight.stop_reason
        human_gate = $preflight.human_gate
        can_start = [bool]($preflight.approval_ok -and $preflight.active_task_matches -and $preflight.profile_supported_for_start)
        runner_plan = $plan
        task_lifecycle_unchanged = $true
    }
}

function Invoke-ImplementationStart {
    param([string]$Repo, [string]$TaskId, [string]$ExecutorValue, $Paths, $Plan, $RunState, [string]$RunId)
    $runnerRunId = $Plan.expected_artifacts.runner_run_id
    $promptPath = Write-ImplementationPrompt -Paths $Paths -Repo $Repo -TaskId $TaskId -Task $Plan.preflight_result.task -PromptId $Plan.expected_artifacts.prompt_id
    Set-ReportId -RunState $RunState -Name "implementation_prompt_path" -Value $promptPath

    $RunState.status = "starting"
    $RunState.current_phase = "executor_preflight"
    $RunState.current_step = "codex_cli_adapter.dry-run"
    $RunState.updated_at = Get-NowText
    Write-ProgressEvent -Path $Paths.progress_event_log_path -TaskId $TaskId -RunId $RunId -RunnerRunId $runnerRunId -EventType "runner_executor_preflight" -Message "PC Runner implementation profile checking Codex CLI adapter readiness." -Data @{ executor = $ExecutorValue; prompt_file = $promptPath } | Out-Null

    $dryRun = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\codex_cli_adapter.bat" -Arguments @(
        "dry-run", $TaskId, "--prompt-file", $promptPath, "--json"
    ) -AllowFailure $true

    $configReady = $dryRun.ok -and ($dryRun.data.config_exists -eq $true) -and ($dryRun.data.config_enabled -eq $true)
    if (-not $configReady) {
        $RunState.status = "stopped"
        $RunState.current_phase = "human_gate"
        $RunState.current_step = "executor_not_ready"
        $RunState.human_gate_state = [ordered]@{
            stop_reason = "executor_not_ready"
            human_gate = "Enable and review _Local/AIWorkflow/codex_cli_adapter.local.json before implementation runner execution."
            prompt_file = $promptPath
            config_exists = $dryRun.data.config_exists
            config_enabled = $dryRun.data.config_enabled
        }
        $RunState.updated_at = Get-NowText
        $RunState.ended_at = Get-NowText
        $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "executor_preflight" -Step "codex_cli_adapter.dry-run" -Status "stopped" -Inputs @{ prompt_file = $promptPath } -Outputs @{ config_exists = $dryRun.data.config_exists; config_enabled = $dryRun.data.config_enabled; error = $dryRun.data.error } -StopReason "executor_not_ready"
        $RunState.last_checkpoint_id = $checkpoint.id
        Write-ProgressEvent -Path $Paths.progress_event_log_path -TaskId $TaskId -RunId $RunId -RunnerRunId $runnerRunId -EventType "runner_stopped" -Message "PC Runner implementation profile stopped because Codex CLI adapter is not ready." -Data $RunState.human_gate_state | Out-Null
        $runPath = Save-RunnerRun -Paths $Paths -RunState $RunState
        return [pscustomobject]@{
            ok = $false
            command = "start"
            task_id = $TaskId
            runner_run_id = $runnerRunId
            runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
            status = $RunState.status
            stop_reason = "executor_not_ready"
            human_gate = $RunState.human_gate_state.human_gate
            prompt_file = $promptPath
            runner_run = $RunState
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_commit_or_push = $true
            external_execution_performed = $false
        }
    }

    $configPaths = Write-ValidationConfigs -Paths $Paths

    $RunState.status = "running"
    $RunState.current_phase = "execution"
    $RunState.current_step = "codex_cli_adapter.run"
    $RunState.updated_at = Get-NowText
    Write-ProgressEvent -Path $Paths.progress_event_log_path -TaskId $TaskId -RunId $RunId -RunnerRunId $runnerRunId -EventType "runner_started" -Message "PC Runner implementation profile started Codex CLI adapter." -Data @{ executor = $ExecutorValue; prompt_file = $promptPath } | Out-Null

    $codex = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\codex_cli_adapter.bat" -Arguments @(
        "run", $TaskId, "--execute", "--prompt-file", $promptPath,
        "--session-id", $Plan.expected_artifacts.session_id,
        "--evidence-id", $Plan.expected_artifacts.evidence_ids[0],
        "--json"
    ) -AllowFailure $true
    $RunState.session_ids = @($Plan.expected_artifacts.session_id)
    $RunState.evidence_ids = @($Plan.expected_artifacts.evidence_ids[0])
    $checkpointStatus = if ($codex.ok) { "completed" } else { "completed_with_executor_failure" }
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "execution" -Step "codex_cli_adapter.run" -Status $checkpointStatus -Inputs @{ prompt_file = $promptPath } -Outputs @{ session_id = $Plan.expected_artifacts.session_id; evidence_id = $Plan.expected_artifacts.evidence_ids[0]; exit_code = $codex.data.exit_code; ok = $codex.ok; error = $codex.data.error } -NextStep "runner.text_encoding_guard"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_step = "runner.text_encoding_guard"
    $changedFiles = @()
    $stdoutLog = ""
    $stderrLog = ""
    if ($null -ne $codex.data) {
        $changedFiles = @(As-Array -Value $codex.data.changed_files)
        $stdoutLog = [string]$codex.data.stdout_log
        $stderrLog = [string]$codex.data.stderr_log
    }
    $encodingGuard = Invoke-TextEncodingGuard -Repo $Repo -Paths $Paths -TaskId $TaskId -RunId $RunId -RunnerRunId $runnerRunId -GuardId $Plan.expected_artifacts.text_encoding_guard_id -ChangedFiles $changedFiles -StdoutLog $stdoutLog -StderrLog $stderrLog
    Set-ReportId -RunState $RunState -Name "text_encoding_guard_id" -Value $Plan.expected_artifacts.text_encoding_guard_id
    Set-ReportId -RunState $RunState -Name "text_encoding_guard_path" -Value $encodingGuard.path
    $guardCheckpointStatus = if ($encodingGuard.ok) { "completed" } else { "stopped" }
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "execution" -Step "runner.text_encoding_guard" -Status $guardCheckpointStatus -Inputs @{ stdout_log = $stdoutLog; stderr_log = $stderrLog; changed_files_count = $changedFiles.Count } -Outputs @{ text_encoding_guard_id = $encodingGuard.text_encoding_guard_id; status = $encodingGuard.status; finding_count = $encodingGuard.finding_count; path = $encodingGuard.path } -NextStep "file_watcher.snapshot"
    $RunState.last_checkpoint_id = $checkpoint.id
    if (-not $encodingGuard.ok) {
        $RunState.status = "stopped"
        $RunState.current_phase = "human_gate"
        $RunState.current_step = "text_encoding_guard_failed"
        $RunState.human_gate_state = [ordered]@{
            stop_reason = "text_encoding_guard_failed"
            human_gate = "Review probable mojibake in executor output or changed text files before continuing."
            text_encoding_guard_id = $encodingGuard.text_encoding_guard_id
            text_encoding_guard_path = $encodingGuard.path
            finding_count = $encodingGuard.finding_count
        }
        $RunState.updated_at = Get-NowText
        $RunState.ended_at = Get-NowText
        Write-ProgressEvent -Path $Paths.progress_event_log_path -TaskId $TaskId -RunId $RunId -RunnerRunId $runnerRunId -EventType "runner_stopped" -Message "PC Runner stopped because text encoding guard found probable mojibake." -Data $RunState.human_gate_state | Out-Null
        $runPath = Save-RunnerRun -Paths $Paths -RunState $RunState
        return [pscustomobject]@{
            ok = $false
            command = "start"
            task_id = $TaskId
            runner_run_id = $runnerRunId
            runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
            status = $RunState.status
            stop_reason = "text_encoding_guard_failed"
            human_gate = $RunState.human_gate_state.human_gate
            prompt_file = $promptPath
            text_encoding_guard_id = $encodingGuard.text_encoding_guard_id
            text_encoding_guard_path = $encodingGuard.path
            finding_count = $encodingGuard.finding_count
            runner_run = $RunState
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_commit_or_push = $true
            external_execution_performed = if ($null -ne $codex.data) { [bool]$codex.data.external_execution_performed } else { $false }
        }
    }

    $RunState.current_phase = "evidence"
    $RunState.current_step = "file_watcher.snapshot"
    $fileWatch = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\file_watcher.bat" -Arguments @(
        "snapshot", $TaskId, $Plan.expected_artifacts.session_id, $Plan.expected_artifacts.evidence_ids[1],
        "--config", $configPaths.file_watcher, "--json"
    )
    $RunState.evidence_ids = @($Plan.expected_artifacts.evidence_ids)
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "evidence" -Step "file_watcher.snapshot" -Status "completed" -Inputs @{ session_id = $Plan.expected_artifacts.session_id } -Outputs @{ evidence_id = $Plan.expected_artifacts.evidence_ids[1]; changed_files_count = $fileWatch.data.changed_files_count } -NextStep "result_collector.collect"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_phase = "result"
    $RunState.current_step = "result_collector.collect"
    $result = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\result_collector.bat" -Arguments @("collect", $TaskId, $Plan.expected_artifacts.session_id, $Plan.expected_artifacts.result_id, "--json")
    Set-ReportId -RunState $RunState -Name "result_id" -Value $Plan.expected_artifacts.result_id
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "result" -Step "result_collector.collect" -Status "completed" -Inputs @{ session_id = $Plan.expected_artifacts.session_id } -Outputs @{ result_id = $Plan.expected_artifacts.result_id; summary = $result.data.summary } -NextStep "diff_analyzer.analyze"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_phase = "analysis"
    $RunState.current_step = "diff_analyzer.analyze"
    $analysis = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\diff_analyzer.bat" -Arguments @("analyze", $TaskId, $Plan.expected_artifacts.result_id, $Plan.expected_artifacts.analysis_id, "--json")
    Set-ReportId -RunState $RunState -Name "analysis_id" -Value $Plan.expected_artifacts.analysis_id
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "analysis" -Step "diff_analyzer.analyze" -Status "completed" -Inputs @{ result_id = $Plan.expected_artifacts.result_id } -Outputs @{ analysis_id = $Plan.expected_artifacts.analysis_id; summary = $analysis.data.summary } -NextStep "build_test_runner.run.json_smoke"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_phase = "build_test"
    $RunState.current_step = "build_test_runner.run.json_smoke"
    $buildTest = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\build_test_runner.bat" -Arguments @(
        "run", $TaskId, "json_smoke", "--execute", "--build-test-id", $Plan.expected_artifacts.build_test_id,
        "--config", $configPaths.build_test, "--json"
    )
    Set-ReportId -RunState $RunState -Name "build_test_id" -Value $Plan.expected_artifacts.build_test_id
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "build_test" -Step "build_test_runner.run.json_smoke" -Status "completed" -Inputs @{ config = $configPaths.build_test } -Outputs @{ build_test_id = $Plan.expected_artifacts.build_test_id; observed_exit_state = $buildTest.data.observed_exit_state; exit_code = $buildTest.data.exit_code } -NextStep "verification_report.generate"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_phase = "verification"
    $RunState.current_step = "verification_report.generate"
    $verification = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\verification_report.bat" -Arguments @(
        "generate", $TaskId, "--result-id", $Plan.expected_artifacts.result_id,
        "--analysis-id", $Plan.expected_artifacts.analysis_id,
        "--build-test-id", $Plan.expected_artifacts.build_test_id,
        "--report-id", $Plan.expected_artifacts.verification_report_id,
        "--json"
    )
    Set-ReportId -RunState $RunState -Name "verification_report_id" -Value $Plan.expected_artifacts.verification_report_id
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "verification" -Step "verification_report.generate" -Status "completed" -Inputs @{ result_id = $Plan.expected_artifacts.result_id; analysis_id = $Plan.expected_artifacts.analysis_id; build_test_id = $Plan.expected_artifacts.build_test_id } -Outputs @{ verification_report_id = $Plan.expected_artifacts.verification_report_id; verdict = $verification.data.verdict } -NextStep "completion_report.generate"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_phase = "completion"
    $RunState.current_step = "completion_report.generate"
    $completion = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\completion_report.bat" -Arguments @("generate", $TaskId, $Plan.expected_artifacts.verification_report_id, $Plan.expected_artifacts.completion_report_id, "--json")
    Set-ReportId -RunState $RunState -Name "completion_report_id" -Value $Plan.expected_artifacts.completion_report_id
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "completion" -Step "completion_report.generate" -Status "completed" -Inputs @{ verification_report_id = $Plan.expected_artifacts.verification_report_id } -Outputs @{ completion_report_id = $Plan.expected_artifacts.completion_report_id; readiness_level = $completion.data.readiness_level } -NextStep "completion_card.generate"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.current_step = "completion_card.generate"
    $card = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\completion_card.bat" -Arguments @("generate", $TaskId, $Plan.expected_artifacts.completion_report_id, $Plan.expected_artifacts.completion_card_id, "--json")
    Set-ReportId -RunState $RunState -Name "completion_card_id" -Value $Plan.expected_artifacts.completion_card_id
    $checkpoint = New-Checkpoint -Paths $Paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $RunId -Phase "completion" -Step "completion_card.generate" -Status "stopped" -Inputs @{ completion_report_id = $Plan.expected_artifacts.completion_report_id } -Outputs @{ completion_card_id = $Plan.expected_artifacts.completion_card_id; readiness_level = $card.data.readiness_level } -StopReason "completion_review_required"
    $RunState.last_checkpoint_id = $checkpoint.id

    $RunState.status = "stopped"
    $RunState.current_phase = "human_gate"
    $RunState.current_step = "completion_review_required"
    $RunState.human_gate_state = [ordered]@{
        stop_reason = "completion_review_required"
        human_gate = "Review Codex execution evidence and Completion Card, then record finalization decision before pc_runner continue."
        prompt_file = $promptPath
        completion_report_id = $Plan.expected_artifacts.completion_report_id
        completion_card_id = $Plan.expected_artifacts.completion_card_id
        executor_ok = $codex.ok
    }
    $RunState.updated_at = Get-NowText
    $RunState.ended_at = Get-NowText
    Write-ProgressEvent -Path $Paths.progress_event_log_path -TaskId $TaskId -RunId $RunId -RunnerRunId $runnerRunId -EventType "runner_stopped" -Message "PC Runner implementation profile stopped at completion review gate." -Data $RunState.human_gate_state | Out-Null
    $runPath = Save-RunnerRun -Paths $Paths -RunState $RunState

    return [pscustomobject]@{
        ok = $true
        command = "start"
        task_id = $TaskId
        runner_run_id = $runnerRunId
        runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
        status = $RunState.status
        stop_reason = "completion_review_required"
        human_gate = $RunState.human_gate_state.human_gate
        prompt_file = $promptPath
        report_ids = $RunState.report_ids
        runner_run = $RunState
        executor_ok = $codex.ok
        verification_verdict = $verification.data.verdict
        completion_readiness = $completion.data.readiness_level
        task_lifecycle_unchanged = $true
        no_task_approval = $true
        no_task_done = $true
        no_commit_or_push = $true
        external_execution_performed = $true
    }
}

function Invoke-Start {
    param([string]$Repo, [string]$TaskId, [string]$ProfileValue, [string]$ExecutorValue)
    $planResult = Invoke-Plan -Repo $Repo -TaskId $TaskId -ProfileValue $ProfileValue -ExecutorValue $ExecutorValue
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    $runId = Get-RunIdFromWorkspace -Paths $paths
    $plan = $planResult.runner_plan
    $runnerRunId = $plan.expected_artifacts.runner_run_id
    $runState = [ordered]@{
        schema_version = 1
        task_id = $TaskId
        run_id = $runId
        runner_run_id = $runnerRunId
        runner_plan_id = $plan.runner_plan_id
        status = "starting"
        current_phase = "preflight"
        current_step = "preflight"
        last_checkpoint_id = $null
        session_ids = @()
        evidence_ids = @()
        report_ids = [ordered]@{}
        human_gate_state = [ordered]@{
            stop_reason = $planResult.stop_reason
            human_gate = $planResult.human_gate
        }
        runtime_control_state = [ordered]@{
            checked = $false
            pending = $false
        }
        started_at = Get-NowText
        updated_at = Get-NowText
        ended_at = $null
    }

    if (-not $planResult.can_start) {
        $runState.status = "stopped"
        $runState.current_phase = "preflight"
        $runState.current_step = "human_gate"
        $runState.ended_at = Get-NowText
        $runPath = Save-RunnerRun -Paths $paths -RunState $runState
        return [pscustomobject]@{
            ok = $false
            command = "start"
            task_id = $TaskId
            runner_run_id = $runnerRunId
            runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
            stop_reason = $planResult.stop_reason
            human_gate = $planResult.human_gate
            runner_run = $runState
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_commit_or_push = $true
            external_execution_performed = $false
        }
    }

    if ($ProfileValue -eq "implementation") {
        return Invoke-ImplementationStart -Repo $Repo -TaskId $TaskId -ExecutorValue $ExecutorValue -Paths $paths -Plan $plan -RunState $runState -RunId $runId
    }

    $configPaths = Write-ValidationConfigs -Paths $paths
    $runState.status = "running"
    $runState.current_phase = "execution"
    $runState.current_step = "local_cli_adapter.run.node_version"
    $runState.updated_at = Get-NowText
    Write-ProgressEvent -Path $paths.progress_event_log_path -TaskId $TaskId -RunId $runId -RunnerRunId $runnerRunId -EventType "runner_started" -Message "PC Runner validation profile started." -Data @{ profile = $ProfileValue; executor = $ExecutorValue } | Out-Null

    $localCli = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\local_cli_adapter.bat" -Arguments @(
        "run", $TaskId, "node_version", "--execute", "--config", $configPaths.local_cli,
        "--session-id", $plan.expected_artifacts.session_id,
        "--evidence-id", $plan.expected_artifacts.evidence_ids[0],
        "--json"
    )
    $runState.session_ids = @($plan.expected_artifacts.session_id)
    $runState.evidence_ids = @($plan.expected_artifacts.evidence_ids[0])
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "execution" -Step "local_cli_adapter.run.node_version" -Status "completed" -Inputs @{ config = $configPaths.local_cli } -Outputs @{ session_id = $plan.expected_artifacts.session_id; evidence_id = $plan.expected_artifacts.evidence_ids[0]; exit_code = $localCli.data.exit_code } -NextStep "file_watcher.snapshot"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_phase = "evidence"
    $runState.current_step = "file_watcher.snapshot"
    $fileWatch = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\file_watcher.bat" -Arguments @(
        "snapshot", $TaskId, $plan.expected_artifacts.session_id, $plan.expected_artifacts.evidence_ids[1],
        "--config", $configPaths.file_watcher, "--json"
    )
    $runState.evidence_ids = @($plan.expected_artifacts.evidence_ids)
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "evidence" -Step "file_watcher.snapshot" -Status "completed" -Inputs @{ config = $configPaths.file_watcher } -Outputs @{ evidence_id = $plan.expected_artifacts.evidence_ids[1]; changed_files_count = $fileWatch.data.changed_files_count } -NextStep "result_collector.collect"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_phase = "result"
    $runState.current_step = "result_collector.collect"
    $result = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\result_collector.bat" -Arguments @("collect", $TaskId, $plan.expected_artifacts.session_id, $plan.expected_artifacts.result_id, "--json")
    Set-ReportId -RunState $runState -Name "result_id" -Value $plan.expected_artifacts.result_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "result" -Step "result_collector.collect" -Status "completed" -Inputs @{ session_id = $plan.expected_artifacts.session_id } -Outputs @{ result_id = $plan.expected_artifacts.result_id; summary = $result.data.summary } -NextStep "diff_analyzer.analyze"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_phase = "analysis"
    $runState.current_step = "diff_analyzer.analyze"
    $analysis = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\diff_analyzer.bat" -Arguments @("analyze", $TaskId, $plan.expected_artifacts.result_id, $plan.expected_artifacts.analysis_id, "--json")
    Set-ReportId -RunState $runState -Name "analysis_id" -Value $plan.expected_artifacts.analysis_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "analysis" -Step "diff_analyzer.analyze" -Status "completed" -Inputs @{ result_id = $plan.expected_artifacts.result_id } -Outputs @{ analysis_id = $plan.expected_artifacts.analysis_id; summary = $analysis.data.summary } -NextStep "build_test_runner.run.json_smoke"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_phase = "build_test"
    $runState.current_step = "build_test_runner.run.json_smoke"
    $buildTest = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\build_test_runner.bat" -Arguments @(
        "run", $TaskId, "json_smoke", "--execute", "--build-test-id", $plan.expected_artifacts.build_test_id,
        "--config", $configPaths.build_test, "--json"
    )
    Set-ReportId -RunState $runState -Name "build_test_id" -Value $plan.expected_artifacts.build_test_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "build_test" -Step "build_test_runner.run.json_smoke" -Status "completed" -Inputs @{ config = $configPaths.build_test } -Outputs @{ build_test_id = $plan.expected_artifacts.build_test_id; observed_exit_state = $buildTest.data.observed_exit_state; exit_code = $buildTest.data.exit_code } -NextStep "verification_report.generate"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_phase = "verification"
    $runState.current_step = "verification_report.generate"
    $verification = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\verification_report.bat" -Arguments @(
        "generate", $TaskId, "--result-id", $plan.expected_artifacts.result_id,
        "--analysis-id", $plan.expected_artifacts.analysis_id,
        "--build-test-id", $plan.expected_artifacts.build_test_id,
        "--report-id", $plan.expected_artifacts.verification_report_id,
        "--json"
    )
    Set-ReportId -RunState $runState -Name "verification_report_id" -Value $plan.expected_artifacts.verification_report_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "verification" -Step "verification_report.generate" -Status "completed" -Inputs @{ result_id = $plan.expected_artifacts.result_id; analysis_id = $plan.expected_artifacts.analysis_id; build_test_id = $plan.expected_artifacts.build_test_id } -Outputs @{ verification_report_id = $plan.expected_artifacts.verification_report_id; verdict = $verification.data.verdict } -NextStep "completion_report.generate"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_phase = "completion"
    $runState.current_step = "completion_report.generate"
    $completion = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\completion_report.bat" -Arguments @("generate", $TaskId, $plan.expected_artifacts.verification_report_id, $plan.expected_artifacts.completion_report_id, "--json")
    Set-ReportId -RunState $runState -Name "completion_report_id" -Value $plan.expected_artifacts.completion_report_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "completion" -Step "completion_report.generate" -Status "completed" -Inputs @{ verification_report_id = $plan.expected_artifacts.verification_report_id } -Outputs @{ completion_report_id = $plan.expected_artifacts.completion_report_id; readiness_level = $completion.data.readiness_level } -NextStep "completion_card.generate"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_step = "completion_card.generate"
    $card = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\completion_card.bat" -Arguments @("generate", $TaskId, $plan.expected_artifacts.completion_report_id, $plan.expected_artifacts.completion_card_id, "--json")
    Set-ReportId -RunState $runState -Name "completion_card_id" -Value $plan.expected_artifacts.completion_card_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runnerRunId -RunId $runId -Phase "completion" -Step "completion_card.generate" -Status "stopped" -Inputs @{ completion_report_id = $plan.expected_artifacts.completion_report_id } -Outputs @{ completion_card_id = $plan.expected_artifacts.completion_card_id; readiness_level = $card.data.readiness_level } -StopReason "completion_review_required"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.status = "stopped"
    $runState.current_phase = "human_gate"
    $runState.current_step = "completion_review_required"
    $runState.human_gate_state = [ordered]@{
        stop_reason = "completion_review_required"
        human_gate = "Review Completion Card, then record finalization decision before pc_runner continue."
        completion_report_id = $plan.expected_artifacts.completion_report_id
        completion_card_id = $plan.expected_artifacts.completion_card_id
    }
    $runState.updated_at = Get-NowText
    $runState.ended_at = Get-NowText
    Write-ProgressEvent -Path $paths.progress_event_log_path -TaskId $TaskId -RunId $runId -RunnerRunId $runnerRunId -EventType "runner_stopped" -Message "PC Runner stopped at completion review gate." -Data $runState.human_gate_state | Out-Null
    $runPath = Save-RunnerRun -Paths $paths -RunState $runState

    return [pscustomobject]@{
        ok = $true
        command = "start"
        task_id = $TaskId
        runner_run_id = $runnerRunId
        runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
        status = $runState.status
        stop_reason = "completion_review_required"
        human_gate = $runState.human_gate_state.human_gate
        report_ids = $runState.report_ids
        runner_run = $runState
        verification_verdict = $verification.data.verdict
        completion_readiness = $completion.data.readiness_level
        task_lifecycle_unchanged = $true
        no_task_approval = $true
        no_task_done = $true
        no_commit_or_push = $true
    }
}

function Test-AcceptedFinalizationState {
    param([string]$State, [string]$Decision)
    if ($State -eq "completion_accepted_pending_task_done" -and $Decision -eq "accept_completion") { return $true }
    if ($State -eq "completion_accepted_with_concerns_pending_task_done" -and $Decision -eq "accept_with_concerns") { return $true }
    return $false
}

function Invoke-Continue {
    param([string]$Repo, [string]$TaskId, [string]$RunnerRunIdValue)
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    Ensure-RunnerDirs -Paths $paths
    $runState = Get-RunnerRunById -Paths $paths -RunnerRunId $RunnerRunIdValue
    if ($null -eq $runState) {
        throw "Runner run not found. Run pc_runner start first."
    }
    $runId = Get-RunIdFromWorkspace -Paths $paths
    $completionReportId = $runState.report_ids.completion_report_id
    if ([string]::IsNullOrWhiteSpace($completionReportId)) {
        throw "Runner run has no completion_report_id."
    }

    $finalizationStatus = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\finalization_log.bat" -Arguments @("status", $TaskId, "--json") -AllowFailure $true
    $finalizationLogId = $finalizationStatus.data.latest_finalization_log_id
    if ([string]::IsNullOrWhiteSpace($finalizationLogId)) {
        $runState.status = "stopped"
        $runState.current_phase = "human_gate"
        $runState.current_step = "finalization_required"
        $runState.human_gate_state = [ordered]@{
            stop_reason = "finalization_required"
            human_gate = "Record finalization decision before continuing."
            completion_report_id = $completionReportId
        }
        $runState.updated_at = Get-NowText
        $runPath = Save-RunnerRun -Paths $paths -RunState $runState
        return [pscustomobject]@{
            ok = $false
            command = "continue"
            task_id = $TaskId
            runner_run_id = $runState.runner_run_id
            runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
            stop_reason = "finalization_required"
            human_gate = $runState.human_gate_state.human_gate
            task_lifecycle_unchanged = $true
            no_task_done = $true
            no_commit_or_push = $true
        }
    }

    $finalizationRead = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\finalization_log.bat" -Arguments @("read", $TaskId, $finalizationLogId, "--json") -AllowFailure $true
    $finalizationLog = $finalizationRead.data.finalization_log
    $finalizationState = [string]$finalizationLog.finalization_state
    $finalDecision = [string]$finalizationLog.final_decision
    if (-not $finalizationRead.ok -or -not (Test-AcceptedFinalizationState -State $finalizationState -Decision $finalDecision)) {
        $runState.status = "stopped"
        $runState.current_phase = "human_gate"
        $runState.current_step = "finalization_not_accepted"
        $runState.human_gate_state = [ordered]@{
            stop_reason = "finalization_not_accepted"
            human_gate = "Record accept_completion or accept_with_concerns before continuing post-finalization runner steps."
            completion_report_id = $completionReportId
            finalization_log_id = $finalizationLogId
            finalization_state = $finalizationState
            final_decision = $finalDecision
        }
        $runState.updated_at = Get-NowText
        $runPath = Save-RunnerRun -Paths $paths -RunState $runState
        return [pscustomobject]@{
            ok = $false
            command = "continue"
            task_id = $TaskId
            runner_run_id = $runState.runner_run_id
            runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
            stop_reason = "finalization_not_accepted"
            human_gate = $runState.human_gate_state.human_gate
            finalization_log_id = $finalizationLogId
            finalization_state = $finalizationState
            final_decision = $finalDecision
            task_lifecycle_unchanged = $true
            no_task_done = $true
            no_commit_or_push = $true
        }
    }

    $ids = New-IdSet -TaskId $TaskId
    $runState.status = "running"
    $runState.current_phase = "post_finalization"
    $runState.current_step = "auto_approval_policy.evaluate"
    $autoEval = Invoke-ToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\auto_approval_policy.bat" -Arguments @("evaluate", $TaskId, $completionReportId, $finalizationLogId, $ids.autoeval_id, "--json")
    Set-ReportId -RunState $runState -Name "auto_approval_evaluation_id" -Value $ids.autoeval_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runState.runner_run_id -RunId $runId -Phase "post_finalization" -Step "auto_approval_policy.evaluate" -Status "completed" -Inputs @{ completion_report_id = $completionReportId; finalization_log_id = $finalizationLogId } -Outputs @{ policy_evaluation_id = $ids.autoeval_id; decision = $autoEval.data.decision } -NextStep "follow_up_task_generator.generate"
    $runState.last_checkpoint_id = $checkpoint.id

    $runState.current_step = "follow_up_task_generator.generate"
    $followUp = Invoke-PowerShellToolJson -Repo $Repo -RelativeScriptPath "tools\aiworkflow\follow_up_task_generator.ps1" -Parameters @{
        Command = "generate"
        TaskId = $TaskId
        CompletionReportId = $completionReportId
        FinalizationLogId = $finalizationLogId
        PolicyEvaluationId = $ids.autoeval_id
        FollowUpPlanId = $ids.followup_id
        RepoRoot = $Repo
        Json = $true
    }
    Set-ReportId -RunState $runState -Name "follow_up_plan_id" -Value $ids.followup_id
    $checkpoint = New-Checkpoint -Paths $paths -TaskId $TaskId -RunnerRunId $runState.runner_run_id -RunId $runId -Phase "post_finalization" -Step "follow_up_task_generator.generate" -Status "stopped" -Inputs @{ completion_report_id = $completionReportId; finalization_log_id = $finalizationLogId; policy_evaluation_id = $ids.autoeval_id } -Outputs @{ follow_up_plan_id = $ids.followup_id; candidate_count = $followUp.data.candidate_count } -StopReason "done_or_commit_decision"
    $runState.last_checkpoint_id = $checkpoint.id
    $runState.status = "stopped"
    $runState.current_phase = "human_gate"
    $runState.current_step = "done_or_commit_decision"
    $runState.human_gate_state = [ordered]@{
        stop_reason = "done_or_commit_decision"
        human_gate = "Review finalization/follow-up artifacts, then decide task done and commit/push manually."
        finalization_log_id = $finalizationLogId
        policy_evaluation_id = $ids.autoeval_id
        follow_up_plan_id = $ids.followup_id
    }
    $runState.updated_at = Get-NowText
    $runState.ended_at = Get-NowText
    Write-ProgressEvent -Path $paths.progress_event_log_path -TaskId $TaskId -RunId $runId -RunnerRunId $runState.runner_run_id -EventType "runner_stopped" -Message "PC Runner stopped at done/commit decision gate." -Data $runState.human_gate_state | Out-Null
    $runPath = Save-RunnerRun -Paths $paths -RunState $runState
    return [pscustomobject]@{
        ok = $true
        command = "continue"
        task_id = $TaskId
        runner_run_id = $runState.runner_run_id
        runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
        status = $runState.status
        stop_reason = "done_or_commit_decision"
        human_gate = $runState.human_gate_state.human_gate
        report_ids = $runState.report_ids
        auto_approval_decision = $autoEval.data.decision
        follow_up_candidate_count = $followUp.data.candidate_count
        task_lifecycle_unchanged = $true
        no_task_done = $true
        no_commit_or_push = $true
    }
}

function Invoke-Stop {
    param([string]$Repo, [string]$TaskId, [string]$RunnerRunIdValue)
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    Ensure-RunnerDirs -Paths $paths
    $runState = Get-RunnerRunById -Paths $paths -RunnerRunId $RunnerRunIdValue
    if ($null -eq $runState) {
        throw "Runner run not found."
    }
    $runState.status = "stopped"
    $runState.current_phase = "human_gate"
    $runState.current_step = "manual_stop"
    $runState.human_gate_state = [ordered]@{
        stop_reason = "manual_stop"
        human_gate = "Runner stopped by explicit command."
    }
    $runState.updated_at = Get-NowText
    $runState.ended_at = Get-NowText
    $runPath = Save-RunnerRun -Paths $paths -RunState $runState
    return [pscustomobject]@{
        ok = $true
        command = "stop"
        task_id = $TaskId
        runner_run_id = $runState.runner_run_id
        runner_run_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $runPath
        stop_reason = "manual_stop"
        task_lifecycle_unchanged = $true
    }
}

function Invoke-Status {
    param([string]$Repo, [string]$TaskId)
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    $task = Get-BacklogTask -Repo $Repo -TaskId $TaskId
    $manifest = Load-RunnerManifest -Paths $paths
    $latestRun = Get-LatestRunnerRun -Paths $paths
    return [pscustomobject]@{
        ok = $true
        command = "status"
        task_id = $TaskId
        task_found = $null -ne $task
        task_status = if ($null -ne $task) { $task.status } else { $null }
        active_task_id = Get-ActiveTaskId -Repo $Repo
        workspace_exists = Test-Path -LiteralPath $paths.workspace_path
        runner_manifest_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $paths.runner_manifest_path
        runner_plan_count = $manifest.runner_plan_count
        runner_run_count = $manifest.runner_run_count
        latest_runner_plan_id = $manifest.latest_runner_plan_id
        latest_runner_run_id = $manifest.latest_runner_run_id
        latest_runner_run = $latestRun
        task_lifecycle_unchanged = $true
    }
}

function Invoke-Read {
    param([string]$Repo, [string]$TaskId, [string]$RunnerRunIdValue)
    $paths = Get-WorkspacePaths -Repo $Repo -TaskId $TaskId
    $runState = Get-RunnerRunById -Paths $paths -RunnerRunId $RunnerRunIdValue
    if ($null -eq $runState) {
        throw "Runner run not found."
    }
    return [pscustomobject]@{
        ok = $true
        command = "read"
        task_id = $TaskId
        runner_run_id = $runState.runner_run_id
        runner_run = $runState
        task_lifecycle_unchanged = $true
    }
}

function Write-Result {
    param($Result, [int]$ExitCode = 0)
    if ($Json) {
        $Result | ConvertTo-Json -Depth 40
        exit $ExitCode
    }
    if ($Result.ok -eq $false) {
        $message = $Result.stop_reason
        if ([string]::IsNullOrWhiteSpace($message)) {
            $message = $Result.error
        }
        Write-Host "[ERROR] $message"
        if ($Result.human_gate) { Write-Host "Human gate: $($Result.human_gate)" }
        exit $ExitCode
    }
    Write-Host "AIWorkflow PC Runner"
    Write-Host "command: $($Result.command)"
    Write-Host "task: $($Result.task_id)"
    if ($Result.runner_run_id) { Write-Host "runner_run: $($Result.runner_run_id)" }
    if ($Result.status) { Write-Host "status: $($Result.status)" }
    if ($Result.stop_reason) { Write-Host "stop_reason: $($Result.stop_reason)" }
    if ($Result.human_gate) { Write-Host "human_gate: $($Result.human_gate)" }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$repo = [System.IO.Path]::GetFullPath($RepoRoot)
$safeTaskId = Get-SafeTaskId -Value $TaskId
$safeProfile = Get-SafeProfile -Value $Profile
$safeExecutor = Get-SafeExecutor -Value $Executor -ProfileValue $safeProfile
$safeRunnerRunId = Get-SafeRunnerRunIdOrEmpty -Value $RunnerRunId

try {
    if ($Command -eq "status") {
        Write-Result -Result (Invoke-Status -Repo $repo -TaskId $safeTaskId)
    }
    elseif ($Command -eq "plan") {
        Write-Result -Result (Invoke-Plan -Repo $repo -TaskId $safeTaskId -ProfileValue $safeProfile -ExecutorValue $safeExecutor)
    }
    elseif ($Command -eq "start") {
        $result = Invoke-Start -Repo $repo -TaskId $safeTaskId -ProfileValue $safeProfile -ExecutorValue $safeExecutor
        Write-Result -Result $result -ExitCode ($(if ($result.ok) { 0 } else { 2 }))
    }
    elseif ($Command -eq "continue") {
        $result = Invoke-Continue -Repo $repo -TaskId $safeTaskId -RunnerRunIdValue $safeRunnerRunId
        Write-Result -Result $result -ExitCode ($(if ($result.ok) { 0 } else { 2 }))
    }
    elseif ($Command -eq "stop") {
        Write-Result -Result (Invoke-Stop -Repo $repo -TaskId $safeTaskId -RunnerRunIdValue $safeRunnerRunId)
    }
    elseif ($Command -eq "read") {
        Write-Result -Result (Invoke-Read -Repo $repo -TaskId $safeTaskId -RunnerRunIdValue $safeRunnerRunId)
    }
}
catch {
    $failure = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $safeTaskId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
        no_task_done = $true
        no_commit_or_push = $true
    }
    Write-Result -Result $failure -ExitCode 1
}
