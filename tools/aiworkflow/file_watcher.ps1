param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "snapshot", "watch")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$SessionId = "",

    [string]$EvidenceId = "",

    [string]$ConfigPath = "",

    [int]$IntervalSeconds = 5,

    [int]$DurationSeconds = 30,

    [int]$MaxSnapshots = 20,

    [switch]$SnapshotOnStart,

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

function Get-EventId {
    return ("event-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff") + "-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8)))
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Append-Utf8Line {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::AppendAllText($Path, $Text + [Environment]::NewLine, $encoding)
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

    Write-Utf8Text -Path $Path -Text (($Value | ConvertTo-Json -Depth 14) + "`n")
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

function Resolve-RepoPath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ""
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $Repo $Path))
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

function Get-SafeSessionId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Session id is required."
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^session-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid session id. Use session-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid session id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function Get-SafeEvidenceId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    if ($trimmed -notmatch "^evidence-[A-Za-z0-9][A-Za-z0-9_.-]*$") {
        throw "Invalid evidence id. Use evidence-<safe-id> without path separators, spaces, or shell metacharacters."
    }

    if ($trimmed.Contains("..")) {
        throw "Invalid evidence id. Parent path traversal is not allowed."
    }

    return $trimmed
}

function New-EvidenceId {
    return ("evidence-watch-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff") + "-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8)))
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

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $workspacePath = Join-Path (Join-Path (Join-Path $Repo "_Temp\AIWorkflowRuntime") "tasks") $TaskId
    $evidenceDir = Join-Path $workspacePath "evidence"

    return [pscustomobject]@{
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        sessions_dir = Join-Path $workspacePath "sessions"
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        runtime_control_history_path = Join-Path $workspacePath "runtime_control_history.jsonl"
        file_watcher_state_path = Join-Path $workspacePath "file_watcher_state.json"
        evidence_dir = $evidenceDir
        records_dir = Join-Path $evidenceDir "records"
        logs_dir = Join-Path $evidenceDir "logs"
        diffs_dir = Join-Path $evidenceDir "diffs"
        reports_dir = Join-Path $evidenceDir "reports"
        manifest_path = Join-Path $evidenceDir "manifest.json"
    }
}

function Get-SessionPath {
    param(
        [string]$SessionsDir,
        [string]$SessionId
    )

    return (Join-Path $SessionsDir ($SessionId + ".json"))
}

function Get-EvidencePath {
    param(
        [string]$RecordsDir,
        [string]$EvidenceId
    )

    return (Join-Path $RecordsDir ($EvidenceId + ".json"))
}

function Assert-RuntimeContext {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [bool]$RequireSession
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

    foreach ($dir in @($paths.sessions_dir, $paths.evidence_dir, $paths.records_dir, $paths.logs_dir, $paths.diffs_dir, $paths.reports_dir)) {
        if (-not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }

    if (-not (Test-Path -LiteralPath $paths.progress_event_log_path)) {
        Write-Utf8Text -Path $paths.progress_event_log_path -Text ""
    }

    $session = $null
    $sessionPath = $null
    if ($RequireSession -or -not [string]::IsNullOrWhiteSpace($SessionId)) {
        $sessionPath = Get-SessionPath -SessionsDir $paths.sessions_dir -SessionId $SessionId
        $session = Read-JsonFile -Path $sessionPath

        if ($session.task_id -ne $TaskId) {
            throw "Session task_id mismatch. Expected $TaskId, found $($session.task_id)."
        }

        if ($session.session_id -ne $SessionId) {
            throw "Session id mismatch. Expected $SessionId, found $($session.session_id)."
        }

        if ($session.workspace_id -ne $metadata.workspace_id) {
            throw "Session workspace_id mismatch. Expected $($metadata.workspace_id), found $($session.workspace_id)."
        }
    }

    return [pscustomobject]@{
        paths = $paths
        metadata = $metadata
        task_run_state = $taskRunState
        session = $session
        session_path = $sessionPath
    }
}

function Resolve-ConfigPath {
    param(
        [string]$Repo,
        [string]$Path
    )

    if (-not [string]::IsNullOrWhiteSpace($Path)) {
        return (Resolve-RepoPath -Repo $Repo -Path $Path)
    }

    $local = Join-Path $Repo "_Local\AIWorkflow\file_watcher.local.json"
    if (Test-Path -LiteralPath $local) {
        return $local
    }

    return (Join-Path $Repo "tools\aiworkflow\file_watcher.example.json")
}

function Get-DefaultConfig {
    return [pscustomobject]@{
        schema_version = 1
        include_untracked = $true
        capture_diff_snapshot = $true
        max_recent_changed_files = 12
        ignore_paths = @(
            ".git/**",
            "_Temp/**",
            "_Local/**",
            "node_modules/**",
            ".env",
            "*.log",
            "*.tmp",
            "*.local.json"
        )
    }
}

function Read-FileWatcherConfig {
    param([string]$Path)

    $default = Get-DefaultConfig
    if (-not (Test-Path -LiteralPath $Path)) {
        return $default
    }

    $config = Read-JsonFile -Path $Path
    foreach ($property in $default.PSObject.Properties) {
        if ($null -eq $config.PSObject.Properties[$property.Name]) {
            Set-ObjectProperty -Object $config -Name $property.Name -Value $property.Value
        }
    }

    return $config
}

function Normalize-RepoRelativePath {
    param([string]$Path)

    $value = ([string]$Path).Trim().Trim('"')
    if ([string]::IsNullOrWhiteSpace($value)) {
        return ""
    }

    if ($value -match "\s->\s") {
        $parts = $value -split "\s->\s"
        $value = $parts[$parts.Count - 1]
    }

    return ($value -replace "\\", "/").TrimStart("/")
}

function Test-IgnoredPath {
    param(
        [string]$Path,
        [string[]]$Patterns
    )

    $normalized = Normalize-RepoRelativePath -Path $Path
    foreach ($rawPattern in @($Patterns)) {
        $pattern = Normalize-RepoRelativePath -Path $rawPattern
        if ([string]::IsNullOrWhiteSpace($pattern)) {
            continue
        }

        if ($pattern.EndsWith("/**")) {
            $prefix = $pattern.Substring(0, $pattern.Length - 3).TrimEnd("/")
            if ($normalized -eq $prefix -or $normalized.StartsWith($prefix + "/", [System.StringComparison]::OrdinalIgnoreCase)) {
                return $true
            }
            continue
        }

        if ($normalized -like $pattern) {
            return $true
        }
    }

    return $false
}

function ConvertTo-ProcessArguments {
    param([string[]]$ArgumentsList)

    $parts = @()
    foreach ($arg in @($ArgumentsList)) {
        $value = [string]$arg
        if ($value -eq "") {
            $parts += '""'
        }
        elseif ($value -match '[\s"]') {
            $parts += ('"' + $value.Replace('"', '\"') + '"')
        }
        else {
            $parts += $value
        }
    }

    return ($parts -join " ")
}

function Invoke-Git {
    param(
        [string]$WorkingDirectory,
        [string[]]$ArgsList
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "git"
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = ConvertTo-ProcessArguments -ArgumentsList $ArgsList

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()

    $text = ($stdoutTask.Result + $stderrTask.Result).TrimEnd()
    return [pscustomobject]@{
        exit_code = $process.ExitCode
        output = $text
    }
}

function Assert-GitOk {
    param(
        $Result,
        [string]$Label
    )

    if ($Result.exit_code -ne 0) {
        throw "$Label failed: $($Result.output)"
    }
}

function Format-CommandOutput {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return "(no output)"
    }

    return $Text.TrimEnd()
}

function Get-ObservedWorkspacePath {
    param(
        [string]$Repo,
        $TaskRunState
    )

    $worktreePath = $null
    if ($null -ne $TaskRunState.workspace) {
        $worktreePath = Get-ObjectPropertyValue -Object $TaskRunState.workspace -Name "worktree_path"
    }

    if (-not [string]::IsNullOrWhiteSpace($worktreePath)) {
        $resolved = Resolve-RepoPath -Repo $Repo -Path $worktreePath
        if (-not (Test-Path -LiteralPath $resolved)) {
            throw "Configured worktree_path does not exist: $resolved"
        }
        return $resolved
    }

    return $Repo
}

function Get-GitChangedFiles {
    param(
        [string]$ObservedWorkspace,
        [string[]]$IgnorePatterns,
        [bool]$IncludeUntracked
    )

    $statusArgs = @("status", "--short")
    if ($IncludeUntracked) {
        $statusArgs += "--untracked-files=all"
    }
    else {
        $statusArgs += "--untracked-files=no"
    }

    $status = Invoke-Git -WorkingDirectory $ObservedWorkspace -ArgsList $statusArgs
    Assert-GitOk -Result $status -Label "git status --short"

    $changed = @()
    $ignored = @()

    foreach ($lineObj in ($status.output -split "`r?`n")) {
        $line = ([string]$lineObj)
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $pathText = if ($line.Length -gt 3) { $line.Substring(3) } else { $line.Trim() }
        $path = Normalize-RepoRelativePath -Path $pathText
        if ([string]::IsNullOrWhiteSpace($path)) {
            continue
        }

        if (Test-IgnoredPath -Path $path -Patterns $IgnorePatterns) {
            $ignored += $path
            continue
        }

        $changed += $path
    }

    return [pscustomobject]@{
        changed_files = @($changed | Sort-Object -Unique)
        ignored_files = @($ignored | Sort-Object -Unique)
        status_output = $status.output
    }
}

function Get-GitUntrackedFiles {
    param(
        [string]$ObservedWorkspace,
        [string[]]$IgnorePatterns
    )

    $result = Invoke-Git -WorkingDirectory $ObservedWorkspace -ArgsList @("ls-files", "--others", "--exclude-standard")
    Assert-GitOk -Result $result -Label "git ls-files --others --exclude-standard"

    $files = @()
    foreach ($lineObj in ($result.output -split "`r?`n")) {
        $path = Normalize-RepoRelativePath -Path ([string]$lineObj)
        if ([string]::IsNullOrWhiteSpace($path)) {
            continue
        }

        if (Test-IgnoredPath -Path $path -Patterns $IgnorePatterns) {
            continue
        }

        $files += $path
    }

    return @($files | Sort-Object -Unique)
}

function Resolve-WorkspaceChildPath {
    param(
        [string]$Root,
        [string]$RelativePath
    )

    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))
    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd("\", "/")
    if (-not ($full.StartsWith($rootFull + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or $full -eq $rootFull)) {
        throw "Resolved path escaped observed workspace: $RelativePath"
    }

    return $full
}

function Format-UntrackedFileSnapshot {
    param(
        [string]$ObservedWorkspace,
        [string]$RelativePath,
        [int]$MaxBytes = 204800
    )

    $full = Resolve-WorkspaceChildPath -Root $ObservedWorkspace -RelativePath $RelativePath
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        return @("### $RelativePath", "(missing or not a file)")
    }

    $item = Get-Item -LiteralPath $full
    if ($item.Length -gt $MaxBytes) {
        return @("### $RelativePath", "(omitted: untracked file is larger than $MaxBytes bytes)")
    }

    $bytes = [System.IO.File]::ReadAllBytes($full)
    if ($bytes -contains 0) {
        return @("### $RelativePath", "(omitted: binary-looking untracked file)")
    }

    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $lines = @(
        "diff --git a/$RelativePath b/$RelativePath",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/$RelativePath",
        "@@ untracked file content @@"
    )

    foreach ($line in ($text -split "`r?`n", -1)) {
        $lines += ("+" + $line)
    }

    return $lines
}

function Get-UntrackedFileSnapshotsText {
    param(
        [string]$ObservedWorkspace,
        [string[]]$IgnorePatterns,
        [bool]$IncludeUntracked
    )

    if (-not $IncludeUntracked) {
        return "(disabled)"
    }

    $untracked = @(Get-GitUntrackedFiles -ObservedWorkspace $ObservedWorkspace -IgnorePatterns $IgnorePatterns)
    if ($untracked.Count -eq 0) {
        return "(none)"
    }

    $sections = @()
    foreach ($path in $untracked) {
        $sections += Format-UntrackedFileSnapshot -ObservedWorkspace $ObservedWorkspace -RelativePath $path
        $sections += ""
    }

    return ($sections -join [Environment]::NewLine).TrimEnd()
}

function New-DiffSnapshot {
    param(
        [string]$Repo,
        [string]$ObservedWorkspace,
        [string]$TaskId,
        [string]$SessionId,
        [string]$DiffsDir,
        [string[]]$ChangedFiles,
        [string[]]$IgnoredFiles,
        [string]$StatusOutput,
        [string[]]$IgnorePatterns,
        [bool]$IncludeUntracked
    )

    if (-not (Test-Path -LiteralPath $DiffsDir)) {
        New-Item -ItemType Directory -Path $DiffsDir -Force | Out-Null
    }

    $stamp = Get-Stamp
    $path = Join-Path $DiffsDir ("file_watcher_" + $stamp + ".diff")
    $diffStat = Invoke-Git -WorkingDirectory $ObservedWorkspace -ArgsList @("diff", "--stat")
    Assert-GitOk -Result $diffStat -Label "git diff --stat"
    $diff = Invoke-Git -WorkingDirectory $ObservedWorkspace -ArgsList @("diff")
    Assert-GitOk -Result $diff -Label "git diff"
    $cachedStat = Invoke-Git -WorkingDirectory $ObservedWorkspace -ArgsList @("diff", "--cached", "--stat")
    Assert-GitOk -Result $cachedStat -Label "git diff --cached --stat"
    $cachedDiff = Invoke-Git -WorkingDirectory $ObservedWorkspace -ArgsList @("diff", "--cached")
    Assert-GitOk -Result $cachedDiff -Label "git diff --cached"

    $changedText = if ($ChangedFiles.Count -eq 0) { "(none)" } else { ($ChangedFiles -join [Environment]::NewLine) }
    $ignoredText = if ($IgnoredFiles.Count -eq 0) { "(none)" } else { ($IgnoredFiles -join [Environment]::NewLine) }
    $untrackedSnapshotsText = Get-UntrackedFileSnapshotsText -ObservedWorkspace $ObservedWorkspace -IgnorePatterns $IgnorePatterns -IncludeUntracked $IncludeUntracked

    $content = @(
        "# AIWorkflow File Watcher Diff Snapshot",
        "task_id: $TaskId",
        "session_id: $SessionId",
        "captured_at: $(Get-NowText)",
        "observed_workspace_path: $(ConvertTo-RepoRelativePath -Repo $Repo -Path $ObservedWorkspace)",
        "changed_files_count: $($ChangedFiles.Count)",
        "",
        "## changed files",
        $changedText,
        "",
        "## ignored files",
        $ignoredText,
        "",
        "## git status --short",
        (Format-CommandOutput -Text $StatusOutput),
        "",
        "## git diff --stat",
        (Format-CommandOutput -Text $diffStat.output),
        "",
        "## git diff",
        (Format-CommandOutput -Text $diff.output),
        "",
        "## git diff --cached --stat",
        (Format-CommandOutput -Text $cachedStat.output),
        "",
        "## git diff --cached",
        (Format-CommandOutput -Text $cachedDiff.output),
        "",
        "## untracked file snapshots",
        $untrackedSnapshotsText,
        ""
    ) -join [Environment]::NewLine

    Write-Utf8Text -Path $path -Text $content
    return $path
}

function Invoke-EvidenceCollector {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$EvidenceId,
        [string]$ObservedWorkspace,
        [string[]]$ChangedFiles,
        [string]$DiffSnapshotPath,
        [string]$RecordsDir
    )

    $safeEvidenceId = if ([string]::IsNullOrWhiteSpace($EvidenceId)) {
        New-EvidenceId
    }
    else {
        Get-SafeEvidenceId -Value $EvidenceId
    }

    $existingPath = Get-EvidencePath -RecordsDir $RecordsDir -EvidenceId $safeEvidenceId
    $collectorCommand = if (Test-Path -LiteralPath $existingPath) { "update" } else { "create" }
    $now = Get-NowText
    $changedValue = ($ChangedFiles -join ";")
    $script = Join-Path $PSScriptRoot "evidence_collector.ps1"
    $args = @(
        "-RepoRoot", $Repo,
        "-Command", $collectorCommand,
        "-TaskId", $TaskId,
        "-SessionId", $SessionId,
        "-EvidenceId", $safeEvidenceId,
        "-Executor", "file_watcher",
        "-CommandLine", "file_watcher $Command",
        "-WorkingDirectory", $ObservedWorkspace,
        "-StartedAt", $now,
        "-EndedAt", $now,
        "-ExitCode", "0",
        "-Json"
    )

    if (-not [string]::IsNullOrWhiteSpace($changedValue)) {
        $args += @("-ChangedFiles", $changedValue)
    }
    if (-not [string]::IsNullOrWhiteSpace($DiffSnapshotPath)) {
        $args += @("-DiffSnapshotPath", $DiffSnapshotPath)
    }

    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $script @args 2>&1
    $exitCode = $LASTEXITCODE
    $text = ""
    if ($null -ne $output) {
        $text = ($output | Out-String).Trim()
    }

    if ($exitCode -ne 0) {
        throw "Evidence collector failed: $text"
    }

    return ($text | ConvertFrom-Json)
}

function Update-SessionFileChangeSummary {
    param(
        $Session,
        [string]$SessionPath,
        [string[]]$ChangedFiles,
        [string]$DiffSnapshotPath,
        [string]$Now
    )

    if ($null -eq $Session.workspace) {
        Set-ObjectProperty -Object $Session -Name "workspace" -Value ([pscustomobject]@{})
    }

    Set-ObjectProperty -Object $Session.workspace -Name "changed_files_count" -Value $ChangedFiles.Count
    Set-ObjectProperty -Object $Session.workspace -Name "recent_changed_files" -Value @($ChangedFiles)
    Set-ObjectProperty -Object $Session.workspace -Name "latest_diff_snapshot_path" -Value $DiffSnapshotPath
    Set-ObjectProperty -Object $Session.workspace -Name "last_file_change_at" -Value $Now
    Set-ObjectProperty -Object $Session -Name "updated_at" -Value $Now
    Save-JsonFile -Path $SessionPath -Value $Session
}

function Update-TaskRunFileWatcherSummary {
    param(
        $TaskRunState,
        [string]$TaskRunStatePath,
        [string]$SessionId,
        [string[]]$ChangedFiles,
        [string]$DiffSnapshotPath,
        [string]$ObservedWorkspace,
        [string]$Now
    )

    if ($null -eq $TaskRunState.file_watcher) {
        Set-ObjectProperty -Object $TaskRunState -Name "file_watcher" -Value ([pscustomobject]@{})
    }

    Set-ObjectProperty -Object $TaskRunState.file_watcher -Name "last_session_id" -Value $SessionId
    Set-ObjectProperty -Object $TaskRunState.file_watcher -Name "last_snapshot_at" -Value $Now
    Set-ObjectProperty -Object $TaskRunState.file_watcher -Name "observed_workspace_path" -Value $ObservedWorkspace
    Set-ObjectProperty -Object $TaskRunState.file_watcher -Name "changed_files_count" -Value $ChangedFiles.Count
    Set-ObjectProperty -Object $TaskRunState.file_watcher -Name "recent_changed_files" -Value @($ChangedFiles)
    Set-ObjectProperty -Object $TaskRunState.file_watcher -Name "latest_diff_snapshot_path" -Value $DiffSnapshotPath
    Set-ObjectProperty -Object $TaskRunState -Name "updated_at" -Value $Now
    Save-JsonFile -Path $TaskRunStatePath -Value $TaskRunState
}

function Save-WatcherState {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$WorkspaceId,
        [string]$SessionId,
        [string]$Status,
        [string]$ObservedWorkspace,
        [string[]]$ChangedFiles,
        [string[]]$IgnoredFiles,
        [string]$DiffSnapshotPath,
        [string]$EvidenceId,
        [string[]]$IgnorePatterns,
        [string]$ErrorMessage
    )

    $now = Get-NowText
    $state = [ordered]@{
        schema_version = 1
        task_id = $TaskId
        workspace_id = $WorkspaceId
        session_id = $SessionId
        status = $Status
        observed_workspace_path = $ObservedWorkspace
        changed_files_count = $ChangedFiles.Count
        recent_changed_files = @($ChangedFiles)
        ignored_files = @($IgnoredFiles)
        latest_diff_snapshot_path = $DiffSnapshotPath
        latest_evidence_id = $EvidenceId
        ignore_paths = @($IgnorePatterns)
        last_error = if ([string]::IsNullOrWhiteSpace($ErrorMessage)) { $null } else { $ErrorMessage }
        updated_at = $now
    }

    Save-JsonFile -Path $Path -Value ([pscustomobject]$state)
    return [pscustomobject]$state
}

function Append-FileWatcherErrorEvent {
    param(
        [string]$Path,
        [string]$TaskId,
        [string]$RunId,
        [string]$SessionId,
        [string]$Message
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $event = [ordered]@{
        schema_version = 1
        event_id = Get-EventId
        task_id = $TaskId
        run_id = $RunId
        session_id = $SessionId
        event_type = "failed"
        severity = "error"
        message = "File watcher failed."
        source = "file_watcher"
        data = [ordered]@{
            command = $Command
            error = $Message
            display_only = $true
        }
        created_at = Get-NowText
    }

    Append-Utf8Line -Path $Path -Text ($event | ConvertTo-Json -Compress -Depth 10)
}

function Invoke-SnapshotCore {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$SessionId,
        [string]$EvidenceId,
        $Runtime,
        $Config,
        [string]$ObservedWorkspace
    )

    $paths = $Runtime.paths
    $ignorePatterns = @(As-Array -Value $Config.ignore_paths | ForEach-Object { [string]$_ })
    $includeUntracked = $true
    if ($null -ne $Config.include_untracked) {
        $includeUntracked = [bool]$Config.include_untracked
    }
    $captureDiff = $true
    if ($null -ne $Config.capture_diff_snapshot) {
        $captureDiff = [bool]$Config.capture_diff_snapshot
    }
    $maxRecent = 12
    if ($null -ne $Config.max_recent_changed_files) {
        $maxRecent = [Math]::Max(1, [int]$Config.max_recent_changed_files)
    }

    $changedResult = Get-GitChangedFiles -ObservedWorkspace $ObservedWorkspace -IgnorePatterns $ignorePatterns -IncludeUntracked $includeUntracked
    $changedFiles = @($changedResult.changed_files | Select-Object -First $maxRecent)
    $ignoredFiles = @($changedResult.ignored_files)
    $diffSnapshotPath = ""

    if ($captureDiff) {
        $diffSnapshotPath = New-DiffSnapshot -Repo $Repo -ObservedWorkspace $ObservedWorkspace -TaskId $TaskId -SessionId $SessionId -DiffsDir $paths.diffs_dir -ChangedFiles @($changedResult.changed_files) -IgnoredFiles $ignoredFiles -StatusOutput $changedResult.status_output -IgnorePatterns $ignorePatterns -IncludeUntracked $includeUntracked
    }

    $evidenceResult = Invoke-EvidenceCollector -Repo $Repo -TaskId $TaskId -SessionId $SessionId -EvidenceId $EvidenceId -ObservedWorkspace $ObservedWorkspace -ChangedFiles @($changedResult.changed_files) -DiffSnapshotPath $diffSnapshotPath -RecordsDir $paths.records_dir
    $now = Get-NowText
    $diffRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $diffSnapshotPath
    $observedRef = ConvertTo-RepoRelativePath -Repo $Repo -Path $ObservedWorkspace

    Update-SessionFileChangeSummary -Session $Runtime.session -SessionPath $Runtime.session_path -ChangedFiles $changedFiles -DiffSnapshotPath $diffRef -Now $now
    Update-TaskRunFileWatcherSummary -TaskRunState $Runtime.task_run_state -TaskRunStatePath $paths.task_run_state_path -SessionId $SessionId -ChangedFiles $changedFiles -DiffSnapshotPath $diffRef -ObservedWorkspace $observedRef -Now $now
    $watcherState = Save-WatcherState -Path $paths.file_watcher_state_path -TaskId $TaskId -WorkspaceId $Runtime.metadata.workspace_id -SessionId $SessionId -Status "snapshot_recorded" -ObservedWorkspace $observedRef -ChangedFiles $changedFiles -IgnoredFiles $ignoredFiles -DiffSnapshotPath $diffRef -EvidenceId $evidenceResult.evidence_id -IgnorePatterns $ignorePatterns -ErrorMessage ""

    return [pscustomobject]@{
        ok = $true
        command = "snapshot"
        task_id = $TaskId
        workspace_id = $Runtime.metadata.workspace_id
        session_id = $SessionId
        evidence_id = $evidenceResult.evidence_id
        observed_workspace_path = $observedRef
        changed_files_count = @($changedResult.changed_files).Count
        changed_files = @($changedResult.changed_files)
        ignored_files = $ignoredFiles
        recent_changed_files = $changedFiles
        diff_snapshot_path = $diffRef
        watcher_state_path = ConvertTo-RepoRelativePath -Repo $Repo -Path $paths.file_watcher_state_path
        evidence_path = $evidenceResult.evidence_path
        pass_fail_judgment = $null
        control_action_applied = $false
        watcher_state = $watcherState
    }
}

function Read-ProgressEvents {
    param(
        [string]$Path,
        [string]$SessionId,
        [int]$MaxCount = 20
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    $events = @()
    foreach ($line in [System.IO.File]::ReadLines($Path, [System.Text.Encoding]::UTF8)) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            $event = $line | ConvertFrom-Json
        }
        catch {
            continue
        }

        if (-not [string]::IsNullOrWhiteSpace($SessionId) -and $event.session_id -ne $SessionId) {
            continue
        }

        if ($event.source -eq "file_watcher" -or $event.event_type -in @("file_change_detected", "diff_snapshot_created")) {
            $events += $event
        }
    }

    if ($events.Count -le $MaxCount) {
        return @($events)
    }

    return @($events | Select-Object -Last $MaxCount)
}

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 14
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow File Watcher"
    Write-Host "Command: $($Result.command)"
    Write-Host "Task: $($Result.task_id)"
    if (-not [string]::IsNullOrWhiteSpace($Result.session_id)) {
        Write-Host "Session: $($Result.session_id)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.evidence_id)) {
        Write-Host "Evidence: $($Result.evidence_id)"
    }
    if ($null -ne $Result.changed_files_count) {
        Write-Host "Changed files: $($Result.changed_files_count)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Result.diff_snapshot_path)) {
        Write-Host "Diff snapshot: $($Result.diff_snapshot_path)"
    }
    Write-Host "============================================================"
    exit $ExitCode
}

$repo = $null
$safeTaskId = $null
$safeSessionId = $null
$runtimeForError = $null

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        $RepoRoot = Join-Path $PSScriptRoot "..\.."
    }

    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $safeTaskId = Get-SafeTaskId -Value $TaskId
    $safeSessionId = if ([string]::IsNullOrWhiteSpace($SessionId)) { "" } else { Get-SafeSessionId -Value $SessionId }
    $safeEvidenceId = Get-SafeEvidenceId -Value $EvidenceId
    $configFullPath = Resolve-ConfigPath -Repo $repo -Path $ConfigPath
    $config = Read-FileWatcherConfig -Path $configFullPath
    $requireSession = ($Command -ne "status")
    if ($requireSession -and [string]::IsNullOrWhiteSpace($safeSessionId)) {
        throw "$Command requires session_id."
    }

    if ($IntervalSeconds -lt 1) {
        throw "IntervalSeconds must be 1 or greater."
    }
    if ($DurationSeconds -lt 0) {
        throw "DurationSeconds must be 0 or greater."
    }
    if ($MaxSnapshots -lt 1) {
        throw "MaxSnapshots must be 1 or greater."
    }

    $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -SessionId $safeSessionId -RequireSession $requireSession
    $runtimeForError = $runtime
    $observedWorkspace = Get-ObservedWorkspacePath -Repo $repo -TaskRunState $runtime.task_run_state

    if ($Command -eq "status") {
        $state = Read-JsonFileOrNull -Path $runtime.paths.file_watcher_state_path
        $events = @(Read-ProgressEvents -Path $runtime.paths.progress_event_log_path -SessionId $safeSessionId -MaxCount 20)
        $result = [pscustomobject]@{
            ok = $true
            command = "status"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            session_id = if ([string]::IsNullOrWhiteSpace($safeSessionId)) { $null } else { $safeSessionId }
            observed_workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $observedWorkspace
            config_path = ConvertTo-RepoRelativePath -Repo $repo -Path $configFullPath
            config_exists = (Test-Path -LiteralPath $configFullPath)
            include_untracked = [bool]$config.include_untracked
            capture_diff_snapshot = [bool]$config.capture_diff_snapshot
            ignore_paths = @(As-Array -Value $config.ignore_paths)
            watcher_state_path = ConvertTo-RepoRelativePath -Repo $repo -Path $runtime.paths.file_watcher_state_path
            watcher_state = $state
            recent_file_events = @($events)
            pass_fail_judgment = $null
            control_action_applied = $false
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "snapshot") {
        $result = Invoke-SnapshotCore -Repo $repo -TaskId $safeTaskId -SessionId $safeSessionId -EvidenceId $safeEvidenceId -Runtime $runtime -Config $config -ObservedWorkspace $observedWorkspace
        Write-ObjectResult -Result $result
    }

    if ($Command -eq "watch") {
        $startedAt = Get-NowText
        $deadline = [DateTimeOffset]::Now.AddSeconds($DurationSeconds)
        $snapshots = @()
        $lastSignature = $null
        $iteration = 0

        do {
            $iteration++
            $ignorePatterns = @(As-Array -Value $config.ignore_paths | ForEach-Object { [string]$_ })
            $changedResult = Get-GitChangedFiles -ObservedWorkspace $observedWorkspace -IgnorePatterns $ignorePatterns -IncludeUntracked ([bool]$config.include_untracked)
            $signature = (@($changedResult.changed_files) -join "|")
            $shouldRecord = $false

            if ($iteration -eq 1) {
                $shouldRecord = ($SnapshotOnStart -or @($changedResult.changed_files).Count -gt 0)
            }
            elseif ($signature -ne $lastSignature) {
                $shouldRecord = $true
            }

            if ($shouldRecord -and $snapshots.Count -lt $MaxSnapshots) {
                $snapshot = Invoke-SnapshotCore -Repo $repo -TaskId $safeTaskId -SessionId $safeSessionId -EvidenceId "" -Runtime $runtime -Config $config -ObservedWorkspace $observedWorkspace
                $snapshots += $snapshot
                $runtime = Assert-RuntimeContext -Repo $repo -TaskId $safeTaskId -SessionId $safeSessionId -RequireSession $true
            }

            $lastSignature = $signature
            if ($DurationSeconds -eq 0 -or $snapshots.Count -ge $MaxSnapshots) {
                break
            }

            if ([DateTimeOffset]::Now.AddSeconds($IntervalSeconds) -gt $deadline) {
                break
            }

            Start-Sleep -Seconds $IntervalSeconds
        } while ([DateTimeOffset]::Now -lt $deadline)

        $result = [pscustomobject]@{
            ok = $true
            command = "watch"
            task_id = $safeTaskId
            workspace_id = $runtime.metadata.workspace_id
            session_id = $safeSessionId
            observed_workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $observedWorkspace
            started_at = $startedAt
            ended_at = Get-NowText
            interval_seconds = $IntervalSeconds
            duration_seconds = $DurationSeconds
            max_snapshots = $MaxSnapshots
            snapshot_count = $snapshots.Count
            snapshots = @($snapshots)
            pass_fail_judgment = $null
            control_action_applied = $false
        }

        Write-ObjectResult -Result $result
    }
}
catch {
    $message = $_.Exception.Message

    try {
        if ($null -ne $runtimeForError) {
            $observedRef = if ($null -eq $repo) { "" } else { ConvertTo-RepoRelativePath -Repo $repo -Path (Get-ObservedWorkspacePath -Repo $repo -TaskRunState $runtimeForError.task_run_state) }
            Save-WatcherState -Path $runtimeForError.paths.file_watcher_state_path -TaskId $safeTaskId -WorkspaceId $runtimeForError.metadata.workspace_id -SessionId $safeSessionId -Status "error" -ObservedWorkspace $observedRef -ChangedFiles @() -IgnoredFiles @() -DiffSnapshotPath "" -EvidenceId "" -IgnorePatterns @() -ErrorMessage $message | Out-Null
            Append-FileWatcherErrorEvent -Path $runtimeForError.paths.progress_event_log_path -TaskId $safeTaskId -RunId $runtimeForError.task_run_state.run_id -SessionId $safeSessionId -Message $message
        }
    }
    catch {}

    $result = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $TaskId
        session_id = $SessionId
        error = $message
        pass_fail_judgment = $null
        control_action_applied = $false
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
