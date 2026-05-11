param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "analyze", "read")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$ResultId = "",

    [string]$AnalysisId = "",

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

function New-AnalysisId {
    return ("analysis-" + (Get-Stamp) + "-" + (New-ShortGuid))
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

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 20) + "`n")
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

function Resolve-RepoArtifactPath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw "Artifact path is empty."
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        $full = [System.IO.Path]::GetFullPath($Path)
    }
    else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
    }

    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Artifact path escapes repository root: $Path"
    }

    return $full
}

function Get-Sha256 {
    param([string]$Path)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $bytes = $sha.ComputeHash($stream)
            return ([BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant())
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $sha.Dispose()
    }
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

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"
    $reportsDir = Join-Path $evidenceDir "reports"
    $resultsDir = Join-Path $reportsDir "results"
    $diffAnalysisDir = Join-Path $reportsDir "diff_analysis"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        reports_dir = $reportsDir
        results_dir = $resultsDir
        result_manifest_path = Join-Path $reportsDir "result_manifest.json"
        diff_analysis_dir = $diffAnalysisDir
        diff_analysis_manifest_path = Join-Path $reportsDir "diff_analysis_manifest.json"
    }
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [bool]$EnsureAnalysisDirs = $false
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

    if ($EnsureAnalysisDirs) {
        New-Item -ItemType Directory -Path $paths.reports_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.diff_analysis_dir -Force | Out-Null
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
    }
}

function Read-ResultManifest {
    param([string]$Path)

    $manifest = Read-JsonFileOrNull -Path $Path
    if ($null -eq $manifest) {
        return $null
    }

    return $manifest
}

function Read-AnalysisManifest {
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
        analysis_ids = @()
        latest_analysis_id = $null
        created_at = Get-NowText
        updated_at = Get-NowText
    }
}

function Save-AnalysisManifest {
    param(
        [string]$Path,
        $Manifest,
        [string]$AnalysisId
    )

    $ids = @($Manifest.analysis_ids)
    if (-not ($ids -contains $AnalysisId)) {
        $ids += $AnalysisId
    }

    Set-ObjectProperty -Object $Manifest -Name "analysis_ids" -Value @($ids)
    Set-ObjectProperty -Object $Manifest -Name "latest_analysis_id" -Value $AnalysisId
    Set-ObjectProperty -Object $Manifest -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $Path -Value $Manifest
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

function Resolve-ExecutionResultId {
    param(
        [string]$RequestedResultId,
        $ResultManifest
    )

    if (-not [string]::IsNullOrWhiteSpace($RequestedResultId)) {
        return $RequestedResultId
    }

    if ($null -eq $ResultManifest -or [string]::IsNullOrWhiteSpace([string]$ResultManifest.latest_result_id)) {
        throw "No result_id was provided and no latest ExecutionResult exists. Run result_collector collect first."
    }

    return [string]$ResultManifest.latest_result_id
}

function Get-UniqueStrings {
    param($Values)

    return @($Values | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | ForEach-Object { [string]$_ } | Sort-Object -Unique)
}

function Get-PathForCategory {
    param(
        [string]$OldPath,
        [string]$NewPath
    )

    if (-not [string]::IsNullOrWhiteSpace($NewPath) -and $NewPath -ne "/dev/null") {
        return $NewPath
    }
    return $OldPath
}

function Get-FileCategory {
    param([string]$Path)

    $p = ([string]$Path) -replace "\\", "/"

    if ($p -match "^_Docs/AIWorkflow/(ActiveTask|Backlog|ProjectStatus|ActiveProject)") {
        return "workflow_state"
    }
    if ($p -match "^_Docs/AIWorkflow/") {
        return "workflow_docs"
    }
    if ($p -match "^_DevLog/") {
        return "devlog"
    }
    if ($p -match "^tools/aiworkflow/") {
        return "aiworkflow_tool"
    }
    if ($p -match "^tools/discord-orchestrator/") {
        return "discord_tool"
    }
    if ($p -match "^PlayGround/(Project|Source|Src)/" -or $p -match "^PlayGround/.*\.(c|cc|cpp|h|hpp)$") {
        return "game_source"
    }
    if ($p -match "^PlayGround/Data/") {
        return "game_data"
    }
    if ($p -match "^_Temp/" -or $p -match "^node_modules/") {
        return "runtime_or_dependency"
    }
    if ($p -match "^_Local/" -or $p -match "(^|/)\.env($|\.)" -or $p -match "discord_bot\.local\.json$") {
        return "local_private"
    }

    return "other"
}

function Get-AttentionSignals {
    param(
        [string]$Category,
        [string]$ChangeType,
        [int]$ChangedLines,
        [bool]$Binary
    )

    $signals = @()

    if ($Category -eq "workflow_state") {
        $signals += "workflow_state_changed"
    }
    if ($Category -eq "aiworkflow_tool" -or $Category -eq "discord_tool") {
        $signals += "workflow_tool_changed"
    }
    if ($Category -eq "game_source") {
        $signals += "game_source_changed"
    }
    if ($Category -eq "game_data") {
        $signals += "game_data_changed"
    }
    if ($Category -eq "local_private") {
        $signals += "local_private_path_changed"
    }
    if ($Category -eq "runtime_or_dependency") {
        $signals += "runtime_or_dependency_path_changed"
    }
    if ($ChangeType -eq "deleted") {
        $signals += "file_deleted"
    }
    if ($Binary) {
        $signals += "binary_diff"
    }
    if ($ChangedLines -ge 300) {
        $signals += "large_file_diff"
    }

    return Get-UniqueStrings -Values $signals
}

function New-EmptyDiffFileState {
    return [ordered]@{
        old_path = $null
        new_path = $null
        change_type = "modified"
        additions = 0
        deletions = 0
        hunk_count = 0
        binary = $false
        category = "other"
        attention_signals = @()
    }
}

function Complete-DiffFileState {
    param($State)

    if ($null -eq $State) {
        return $null
    }

    $changeType = $State.change_type
    if ($State.binary) {
        $changeType = if ($changeType -eq "modified") { "binary_modified" } else { $changeType }
    }

    $pathForCategory = Get-PathForCategory -OldPath $State.old_path -NewPath $State.new_path
    $category = Get-FileCategory -Path $pathForCategory
    $changedLines = [int]$State.additions + [int]$State.deletions
    $signals = Get-AttentionSignals -Category $category -ChangeType $changeType -ChangedLines $changedLines -Binary ([bool]$State.binary)

    return [ordered]@{
        old_path = $State.old_path
        new_path = $State.new_path
        effective_path = $pathForCategory
        change_type = $changeType
        additions = [int]$State.additions
        deletions = [int]$State.deletions
        changed_lines = $changedLines
        hunk_count = [int]$State.hunk_count
        binary = [bool]$State.binary
        category = $category
        attention_signals = @($signals)
    }
}

function Convert-GitPath {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    $path = $Value.Trim()
    if ($path.StartsWith("a/") -or $path.StartsWith("b/")) {
        return $path.Substring(2)
    }

    return $path
}

function Analyze-DiffText {
    param(
        [string]$Repo,
        [string]$DiffPath,
        [string]$Text
    )

    $files = @()
    $current = $null

    foreach ($lineObj in ($Text -split "`r?`n")) {
        $line = [string]$lineObj

        if ($line -match "^diff --git a/(.+) b/(.+)$") {
            $completed = Complete-DiffFileState -State $current
            if ($null -ne $completed) {
                $files += [pscustomobject]$completed
            }

            $current = New-EmptyDiffFileState
            $current.old_path = $matches[1]
            $current.new_path = $matches[2]
            continue
        }

        if ($null -eq $current) {
            continue
        }

        if ($line -match "^new file mode ") {
            $current.change_type = "added"
            continue
        }
        if ($line -match "^deleted file mode ") {
            $current.change_type = "deleted"
            continue
        }
        if ($line -match "^rename from (.+)$") {
            $current.change_type = "renamed"
            $current.old_path = $matches[1]
            continue
        }
        if ($line -match "^rename to (.+)$") {
            $current.change_type = "renamed"
            $current.new_path = $matches[1]
            continue
        }
        if ($line -match "^--- (.+)$") {
            $oldPath = Convert-GitPath -Value $matches[1]
            if ($oldPath -ne "/dev/null") {
                $current.old_path = $oldPath
            }
            continue
        }
        if ($line -match "^\+\+\+ (.+)$") {
            $newPath = Convert-GitPath -Value $matches[1]
            if ($newPath -ne "/dev/null") {
                $current.new_path = $newPath
            }
            continue
        }
        if ($line -match "^@@ ") {
            $current.hunk_count = [int]$current.hunk_count + 1
            continue
        }
        if ($line -match "^Binary files " -or $line -eq "GIT binary patch") {
            $current.binary = $true
            continue
        }
        if ($line.StartsWith("+") -and -not $line.StartsWith("+++")) {
            $current.additions = [int]$current.additions + 1
            continue
        }
        if ($line.StartsWith("-") -and -not $line.StartsWith("---")) {
            $current.deletions = [int]$current.deletions + 1
            continue
        }
    }

    $last = Complete-DiffFileState -State $current
    if ($null -ne $last) {
        $files += [pscustomobject]$last
    }

    $relative = ConvertTo-RepoRelativePath -Repo $Repo -Path $DiffPath
    $length = 0
    $sha256 = $null
    if (Test-Path -LiteralPath $DiffPath) {
        $length = (Get-Item -LiteralPath $DiffPath).Length
        $sha256 = Get-Sha256 -Path $DiffPath
    }

    return [ordered]@{
        diff_snapshot_path = $relative
        sha256 = $sha256
        byte_length = $length
        file_count = $files.Count
        empty_diff = ($files.Count -eq 0)
        files = @($files)
    }
}

function Get-CountMap {
    param($Values)

    $map = [ordered]@{}
    foreach ($value in @($Values)) {
        $key = [string]$value
        if ([string]::IsNullOrWhiteSpace($key)) {
            continue
        }
        if (-not $map.Contains($key)) {
            $map[$key] = 0
        }
        $map[$key] = [int]$map[$key] + 1
    }

    return $map
}

function New-DiffAnalysis {
    param(
        [string]$Repo,
        $Runtime,
        [string]$AnalysisId,
        [string]$ResultId,
        [string]$ResultPath,
        $ExecutionResult
    )

    $snapshotRefs = @($ExecutionResult.evidence.git_diff_snapshots | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $snapshotAnalyses = @()
    foreach ($ref in $snapshotRefs) {
        $fullPath = Resolve-RepoArtifactPath -Repo $Repo -Path ([string]$ref)
        if (-not (Test-Path -LiteralPath $fullPath)) {
            throw "Diff snapshot does not exist: $ref"
        }

        $text = Read-Utf8Text -Path $fullPath
        $snapshotAnalyses += [pscustomobject](Analyze-DiffText -Repo $Repo -DiffPath $fullPath -Text $text)
    }

    $allFiles = @($snapshotAnalyses | ForEach-Object { @($_.files) })
    $changedFiles = Get-UniqueStrings -Values @($allFiles | ForEach-Object { $_.effective_path })
    $additions = 0
    $deletions = 0
    foreach ($file in $allFiles) {
        $additions += [int]$file.additions
        $deletions += [int]$file.deletions
    }

    $signals = Get-UniqueStrings -Values @($allFiles | ForEach-Object { @($_.attention_signals) })
    if ($snapshotRefs.Count -eq 0) {
        $signals += "no_diff_snapshots"
    }

    $categoryCounts = Get-CountMap -Values @($allFiles | ForEach-Object { $_.category })
    $changeTypeCounts = Get-CountMap -Values @($allFiles | ForEach-Object { $_.change_type })
    $filesWithAttention = @($allFiles | Where-Object { @($_.attention_signals).Count -gt 0 } | ForEach-Object {
        [ordered]@{
            path = $_.effective_path
            category = $_.category
            signals = @($_.attention_signals)
        }
    })

    $summaryText = "Analyzed $($snapshotRefs.Count) diff snapshot(s), $($changedFiles.Count) changed file(s), $additions addition(s), and $deletions deletion(s)."

    return [ordered]@{
        schema_version = 1
        analysis_id = $AnalysisId
        task_id = $Runtime.task_run_state.task_id
        run_id = $Runtime.task_run_state.run_id
        workspace_id = $Runtime.metadata.workspace_id
        result_id = $ResultId
        source = [ordered]@{
            result_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $ResultPath
            diff_snapshot_count = $snapshotRefs.Count
            diff_snapshots = @($snapshotRefs)
        }
        collection = [ordered]@{
            status = "analyzed"
            analyzer = "diff_analyzer"
            analyzed_at = Get-NowText
            task_lifecycle_unchanged = $true
            verification_judgment = $null
            completion_state = $null
        }
        summary = [ordered]@{
            generated_summary = $summaryText
            snapshot_count = $snapshotRefs.Count
            changed_file_count = $changedFiles.Count
            additions = $additions
            deletions = $deletions
            changed_lines = $additions + $deletions
            category_counts = $categoryCounts
            change_type_counts = $changeTypeCounts
            attention_signals = @(Get-UniqueStrings -Values $signals)
            files_with_attention = @($filesWithAttention)
        }
        snapshots = @($snapshotAnalyses)
        files = @($allFiles)
        handoff = [ordered]@{
            wf_304_verification_report = [ordered]@{
                may_read_diff_analysis = $true
                owns_pass_fail_judgment = $true
            }
            no_verification_judgment = $true
            no_completion_decision = $true
        }
    }
}

function Update-TaskRunDiffAnalysisState {
    param(
        [string]$Repo,
        $TaskRunState,
        [string]$TaskRunStatePath,
        $Analysis,
        [string]$AnalysisPath
    )

    if ($null -eq $TaskRunState.diff_analyzer) {
        Set-ObjectProperty -Object $TaskRunState -Name "diff_analyzer" -Value ([pscustomobject]@{})
    }

    $analysisRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $AnalysisPath
    Set-ObjectProperty -Object $TaskRunState.diff_analyzer -Name "latest_analysis_id" -Value $Analysis.analysis_id
    Set-ObjectProperty -Object $TaskRunState.diff_analyzer -Name "latest_analysis_path" -Value $analysisRef
    Set-ObjectProperty -Object $TaskRunState.diff_analyzer -Name "latest_result_id" -Value $Analysis.result_id
    Set-ObjectProperty -Object $TaskRunState.diff_analyzer -Name "latest_analyzed_at" -Value $Analysis.collection.analyzed_at
    Set-ObjectProperty -Object $TaskRunState.diff_analyzer -Name "latest_summary" -Value $Analysis.summary.generated_summary
    Set-ObjectProperty -Object $TaskRunState.diff_analyzer -Name "attention_signals" -Value @($Analysis.summary.attention_signals)
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value (Get-NowText)
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Append-ProgressEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$AnalysisId,
        [string]$AnalysisPath,
        [string]$Summary
    )

    $event = [ordered]@{
        schema_version = 1
        event_id = New-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $null
        event_type = "diff_analysis_created"
        severity = "info"
        message = "Diff analysis created."
        source = "diff_analyzer"
        data = [ordered]@{
            analysis_id = $AnalysisId
            analysis_path = $AnalysisPath
            summary = $Summary
            display_only = $true
        }
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 10)
    return $event.event_id
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 20
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Diff Analyzer"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.result_id)) {
        Write-Host "Result: $($Result.result_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.analysis_id)) {
        Write-Host "Analysis: $($Result.analysis_id)"
    }
    if ($null -ne $Result.summary) {
        Write-Host "Summary: $($Result.summary)"
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
    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -EnsureAnalysisDirs:($Command -eq "analyze")
    $analysisManifest = Read-AnalysisManifest -Path $runtime.paths.diff_analysis_manifest_path -TaskId $safeTaskId -WorkspaceId $runtime.metadata.workspace_id

    if ($Command -eq "status") {
        $analysisIds = @($analysisManifest.analysis_ids)
        $latestId = if ([string]::IsNullOrWhiteSpace([string]$analysisManifest.latest_analysis_id)) { $null } else { [string]$analysisManifest.latest_analysis_id }
        $latestPath = if ($null -eq $latestId) { $null } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-AnalysisPath -AnalysisDir $runtime.paths.diff_analysis_dir -AnalysisId $latestId) }

        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            run_id = $runtime.task_run_state.run_id
            analysis_count = $analysisIds.Count
            latest_analysis_id = $latestId
            latest_analysis_path = $latestPath
            diff_analysis_manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.diff_analysis_manifest_path
            task_run_diff_analyzer = Get-ObjectPropertyValue -Object $runtime.task_run_state -Name "diff_analyzer"
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        $targetAnalysisId = $safeAnalysisId
        if ([string]::IsNullOrWhiteSpace($targetAnalysisId)) {
            $targetAnalysisId = [string]$analysisManifest.latest_analysis_id
        }
        if ([string]::IsNullOrWhiteSpace($targetAnalysisId)) {
            throw "No analysis_id was provided and no latest DiffAnalysis exists."
        }

        $analysisPath = Get-AnalysisPath -AnalysisDir $runtime.paths.diff_analysis_dir -AnalysisId $targetAnalysisId
        if (-not (Test-Path -LiteralPath $analysisPath)) {
            throw "DiffAnalysis does not exist: $targetAnalysisId"
        }
        $analysis = Read-JsonFile -Path $analysisPath

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            analysis_id = $targetAnalysisId
            analysis_path = ConvertTo-RepoRelativePath -Repo $repo -Path $analysisPath
            diff_analysis = $analysis
            task_lifecycle_unchanged = $true
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "analyze") {
        $resultManifest = Read-ResultManifest -Path $runtime.paths.result_manifest_path
        $targetResultId = Resolve-ExecutionResultId -RequestedResultId $safeResultId -ResultManifest $resultManifest
        $resultPath = Get-ResultPath -ResultsDir $runtime.paths.results_dir -ResultId $targetResultId
        if (-not (Test-Path -LiteralPath $resultPath)) {
            throw "ExecutionResult does not exist: $targetResultId"
        }
        $executionResult = Read-JsonFile -Path $resultPath
        if ($executionResult.task_id -ne $safeTaskId) {
            throw "ExecutionResult task_id mismatch. Expected $safeTaskId, found $($executionResult.task_id)."
        }

        $analysisIdToWrite = if ([string]::IsNullOrWhiteSpace($safeAnalysisId)) { New-AnalysisId } else { $safeAnalysisId }
        $analysisPath = Get-AnalysisPath -AnalysisDir $runtime.paths.diff_analysis_dir -AnalysisId $analysisIdToWrite
        if (Test-Path -LiteralPath $analysisPath) {
            throw "DiffAnalysis already exists: $analysisIdToWrite"
        }

        $analysis = New-DiffAnalysis -Repo $repo -Runtime $runtime -AnalysisId $analysisIdToWrite -ResultId $targetResultId -ResultPath $resultPath -ExecutionResult $executionResult
        Save-JsonFile -Path $analysisPath -Value $analysis
        Save-AnalysisManifest -Path $runtime.paths.diff_analysis_manifest_path -Manifest $analysisManifest -AnalysisId $analysisIdToWrite
        Update-TaskRunDiffAnalysisState -Repo $repo -TaskRunState $runtime.task_run_state -TaskRunStatePath $runtime.paths.task_run_state_path -Analysis $analysis -AnalysisPath $analysisPath
        $analysisRef = ConvertTo-RepoRelativePath -Repo $repo -Path $analysisPath
        $eventId = Append-ProgressEvent -Path $runtime.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtime.task_run_state.run_id -AnalysisId $analysisIdToWrite -AnalysisPath $analysisRef -Summary $analysis.summary.generated_summary

        $result = [pscustomobject]@{
            ok = $true
            command = "analyze"
            task_id = $safeTaskId
            result_id = $targetResultId
            analysis_id = $analysisIdToWrite
            analysis_path = $analysisRef
            latest_progress_event_id = $eventId
            summary = $analysis.summary.generated_summary
            diff_analysis = $analysis
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
        error = $_.Exception.Message
        task_lifecycle_unchanged = $true
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
