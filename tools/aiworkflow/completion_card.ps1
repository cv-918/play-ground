param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "generate", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$CompletionReportId = "",

    [string]$CompletionCardId = "",

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

function New-CompletionCardId {
    return ("card-" + (Get-Stamp) + "-" + (New-ShortGuid))
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

function Get-SafeCompletionReportIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^completion-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid completion_report_id. Use completion-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid completion_report_id. Parent path traversal is not allowed."
    }
    return $trimmed
}

function Get-SafeCompletionCardIdOrEmpty {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^card-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid completion_card_id. Use card-<safe-id> without path separators, spaces, or shell metacharacters."
    }
    if ($trimmed.Contains("..")) {
        throw "Invalid completion_card_id. Parent path traversal is not allowed."
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

    if ($null -ne $Object.PSObject.Properties[$Name]) {
        $Object.$Name = $Value
    }
    else {
        $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
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
    $completionDir = Join-Path $reportsDir "completion"
    $cardsDir = Join-Path $completionDir "cards"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        completion_dir = $completionDir
        completion_results_dir = Join-Path $completionDir "reports"
        completion_manifest_path = Join-Path $completionDir "completion_manifest.json"
        completion_cards_dir = $cardsDir
        completion_card_manifest_path = Join-Path $cardsDir "completion_card_manifest.json"
    }
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [bool]$EnsureCardDirs = $false
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

    if ($EnsureCardDirs) {
        New-Item -ItemType Directory -Path $paths.completion_cards_dir -Force | Out-Null
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Get-CompletionReportPath {
    param(
        [string]$ResultsDir,
        [string]$ReportId
    )

    return (Join-Path $ResultsDir ($ReportId + ".json"))
}

function Get-CompletionCardPath {
    param(
        [string]$CardsDir,
        [string]$CardId
    )

    return (Join-Path $CardsDir ($CardId + ".json"))
}

function Get-CompletionCardManifest {
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
        completion_card_ids = @()
        latest_completion_card_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-CompletionCardManifest {
    param(
        [string]$Path,
        $Manifest,
        [string]$CardId
    )

    $ids = @($Manifest.completion_card_ids)
    if (-not ($ids -contains $CardId)) {
        $ids += $CardId
    }

    Set-ObjectProperty -Object $Manifest -Name "completion_card_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_completion_card_id" -Value $CardId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
}

function Resolve-CompletionReport {
    param(
        [string]$Repo,
        $Runtime,
        [string]$RequestedId
    )

    $manifest = Read-JsonFileOrNull -Path $Runtime.paths.completion_manifest_path
    $selectedId = $RequestedId
    if ([string]::IsNullOrWhiteSpace($selectedId) -and $null -ne $manifest) {
        $selectedId = [string]$manifest.latest_completion_report_id
    }

    if ([string]::IsNullOrWhiteSpace($selectedId)) {
        throw "No CompletionReport exists. Run completion_report generate first."
    }

    $path = Get-CompletionReportPath -ResultsDir $Runtime.paths.completion_results_dir -ReportId $selectedId
    if (-not (Test-Path -LiteralPath $path)) {
        throw "CompletionReport does not exist: $selectedId"
    }

    return [pscustomobject]@{
        completion_report_id = $selectedId
        completion_report_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $path
        completion_report = Read-JsonFile -Path $path
    }
}

function Get-CardColor {
    param([string]$State)

    switch ($State) {
        "ready_for_human_completion_review" { return "green" }
        "ready_for_human_completion_review_with_notes" { return "yellow" }
        "needs_human_decision" { return "orange" }
        "failed_verification" { return "red" }
        default { return "gray" }
    }
}

function Get-CompactItems {
    param(
        $Values,
        [int]$Limit = 3
    )

    return @(As-Array -Value $Values | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -First $Limit)
}

function New-CompletionCard {
    param(
        $Runtime,
        [string]$CardId,
        $ReportSource
    )

    $report = $ReportSource.completion_report
    $task = $report.task_context
    $readiness = $report.completion_readiness
    $verification = $report.verification_summary
    $risks = $report.remaining_risks
    $warnings = Get-CompactItems -Values $risks.warnings -Limit 3
    $concerns = Get-CompactItems -Values $risks.concerns -Limit 3
    $blockers = Get-CompactItems -Values $risks.blockers -Limit 3
    $failed = Get-CompactItems -Values $risks.failed_checks -Limit 3
    $decisions = Get-CompactItems -Values $report.human_decisions_required -Limit 3
    $commands = Get-CompactItems -Values $report.suggested_next_manual_commands -Limit 3

    return [ordered]@{
        schema_version = 1
        completion_card_id = $CardId
        task_id = $Runtime.metadata.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        generated_at = Get-NowText
        generator = "completion_card"
        sources = [ordered]@{
            completion_report_id = $ReportSource.completion_report_id
            completion_report_path = $ReportSource.completion_report_path
            verification_report_id = $report.sources.verification_report.verification_report_id
        }
        presentation = [ordered]@{
            title = "Task completion review"
            color = Get-CardColor -State $report.completion_state
            task_line = "$($Runtime.metadata.task_id) - $($task.title)"
            state = $report.completion_state
            readiness_level = $readiness.level
            verdict = $verification.verdict
            summary = $readiness.summary
            can_mark_task_done_manually = $readiness.can_mark_task_done_manually
            can_commit_after_review = $readiness.can_commit_after_review
            warnings = @($warnings)
            concerns = @($concerns)
            blockers = @($blockers)
            failed_checks = @($failed)
            human_decisions = @($decisions)
            next_manual_commands = @($commands)
            footer = "Display artifact only. No task approval, done state, finalization, commit, or push was performed."
        }
        invariants = [ordered]@{
            display_only = $true
            task_lifecycle_unchanged = $true
            no_task_approval = $true
            no_task_done = $true
            no_finalization_log = $true
            no_auto_approval_policy = $true
            no_commit_or_push = $true
        }
    }
}

function Update-TaskRunCompletionCardState {
    param(
        [string]$Repo,
        $TaskRunState,
        [string]$TaskRunStatePath,
        $Card,
        [string]$CardPath
    )

    if ($null -eq $TaskRunState.completion_card) {
        Set-ObjectProperty -Object $TaskRunState -Name "completion_card" -Value ([pscustomobject]@{})
    }

    $cardRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $CardPath
    Set-ObjectProperty -Object $TaskRunState.completion_card -Name "latest_completion_card_id" -Value $Card.completion_card_id
    Set-ObjectProperty -Object $TaskRunState.completion_card -Name "latest_completion_card_path" -Value $cardRef
    Set-ObjectProperty -Object $TaskRunState.completion_card -Name "latest_completion_report_id" -Value $Card.sources.completion_report_id
    Set-ObjectProperty -Object $TaskRunState.completion_card -Name "display_state" -Value $Card.presentation.state
    Set-ObjectProperty -Object $TaskRunState.completion_card -Name "readiness_level" -Value $Card.presentation.readiness_level
    Set-ObjectProperty -Object $TaskRunState.completion_card -Name "latest_generated_at" -Value $Card.generated_at
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$CardId,
        [string]$CardPath,
        [string]$State
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "completion_card_created"
        severity = "info"
        message = "Completion card created."
        source = "completion_card"
        data = [ordered]@{
            completion_card_id = $CardId
            completion_card_path = $CardPath
            completion_state = $State
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
    Write-Host "AIWorkflow Completion Card"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.completion_card_id)) {
        Write-Host "CompletionCard: $($Result.completion_card_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.completion_state)) {
        Write-Host "State: $($Result.completion_state)"
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
    $safeCompletionReportId = Get-SafeCompletionReportIdOrEmpty -Value $CompletionReportId
    $safeCompletionCardId = Get-SafeCompletionCardIdOrEmpty -Value $CompletionCardId
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureCardDirs:($Command -eq "generate")
    $manifest = Get-CompletionCardManifest -Path $runtime.paths.completion_card_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $ids = @($manifest.completion_card_ids)
        $latestId = if ([string]::IsNullOrWhiteSpace([string]$manifest.latest_completion_card_id)) { $null } else { [string]$manifest.latest_completion_card_id }
        $latestPath = if ($null -eq $latestId) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-CompletionCardPath -CardsDir $runtime.paths.completion_cards_dir -CardId $latestId) }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            completion_card_count = $ids.Count
            latest_completion_card_id = $latestId
            latest_completion_card_path = $latestPath
            completion_card_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.completion_card_manifest_path
            task_run_completion_card = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "completion_card"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetId = $safeCompletionCardId
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            $targetId = [string]$manifest.latest_completion_card_id
        }
        if ([string]::IsNullOrWhiteSpace($targetId)) {
            throw "No completion_card_id was provided and no latest CompletionCard exists."
        }

        $path = Get-CompletionCardPath -CardsDir $runtime.paths.completion_cards_dir -CardId $targetId
        if (-not (Test-Path -LiteralPath $path)) {
            throw "CompletionCard does not exist: $targetId"
        }
        $card = Read-JsonFile -Path $path

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            completion_card_id = $targetId
            completion_card_path = ConvertTo-RepoRelativePath -Repo $repo -Path $path
            completion_state = $card.presentation.state
            completion_card = $card
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "generate") {
        $cardIdToWrite = if ([string]::IsNullOrWhiteSpace($safeCompletionCardId)) { New-CompletionCardId } else { $safeCompletionCardId }
        $cardPath = Get-CompletionCardPath -CardsDir $runtime.paths.completion_cards_dir -CardId $cardIdToWrite
        if (Test-Path -LiteralPath $cardPath) {
            throw "CompletionCard already exists: $cardIdToWrite"
        }

        $reportSource = Resolve-CompletionReport -Repo $repo -Runtime $runtime -RequestedId $safeCompletionReportId
        $card = New-CompletionCard -Runtime $runtime -CardId $cardIdToWrite -ReportSource $reportSource
        $cardRef = ConvertTo-RepoRelativePath -Repo $repo -Path $cardPath

        Save-JsonFile -Path $cardPath -Value $card
        Save-CompletionCardManifest -Path $runtime.paths.completion_card_manifest_path -Manifest $manifest -CardId $cardIdToWrite
        Update-TaskRunCompletionCardState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Card $card -CardPath $cardPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -CardId $cardIdToWrite -CardPath $cardRef -State $card.presentation.state

        $result = [pscustomobject]@{
            ok = $true
            command = "generate"
            task_id = $safeTaskId
            completion_card_id = $cardIdToWrite
            completion_card_path = $cardRef
            latest_progress_event_id = $eventId
            completion_report_id = $card.sources.completion_report_id
            completion_state = $card.presentation.state
            readiness_level = $card.presentation.readiness_level
            completion_card = $card
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
        completion_report_id = $CompletionReportId
        completion_card_id = $CompletionCardId
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
