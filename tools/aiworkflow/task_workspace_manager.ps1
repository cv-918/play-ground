param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("create", "read", "status")]
    [string]$Command,

    [string]$TaskId = "",

    [string]$RepoRoot = "",

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-NowText {
    return (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function ConvertTo-RepoRelativePath {
    param(
        [string]$Repo,
        [string]$Path
    )

    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($Repo).TrimEnd("\", "/")

    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $full.Substring($root.Length).TrimStart("\", "/")
        return ($relative -replace "\\", "/")
    }

    return ($full -replace "\\", "/")
}

function Get-SafeTaskId {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Task id is required for this command."
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

function Parse-BacklogRows {
    param([string]$Text)

    $rows = @()
    if ([string]::IsNullOrEmpty($Text)) {
        return @()
    }

    foreach ($lineObj in ($Text -split "`r?`n")) {
        if ($null -eq $lineObj) {
            continue
        }

        $line = ([string]$lineObj).Trim()
        if (-not $line.StartsWith("|")) {
            continue
        }

        $body = $line.Trim("|".ToCharArray())
        $cells = @($body.Split("|".ToCharArray()) | ForEach-Object {
            if ($null -eq $_) { "" } else { ([string]$_).Trim() }
        })

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

function Get-TaskLifecycleMatches {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $backlogPath = Join-Path $Repo "_Docs\AIWorkflow\Backlog.md"
    $backlogText = Read-Utf8Text -Path $backlogPath
    $rows = @(Parse-BacklogRows -Text $backlogText | Where-Object { $_.id -eq $TaskId })

    return [pscustomobject]@{
        source = "_Docs/AIWorkflow/Backlog.md"
        matches = @($rows)
    }
}

function New-TaskLifecycleSnapshot {
    param(
        [string]$Repo,
        [string]$TaskId,
        [string]$CapturedAt
    )

    $lookup = Get-TaskLifecycleMatches -Repo $Repo -TaskId $TaskId
    $matches = @($lookup.matches)

    if ($matches.Count -gt 1) {
        throw "Duplicate task_id found in Backlog.md: $TaskId"
    }

    if ($matches.Count -eq 0) {
        return [ordered]@{
            source = $lookup.source
            found = $false
            task_status = $null
            priority = $null
            kind = $null
            title = $null
            captured_at = $CapturedAt
            block_reason = "task_id not found in lifecycle layer"
        }
    }

    $task = $matches[0]
    return [ordered]@{
        source = $lookup.source
        found = $true
        task_status = $task.status
        priority = $task.priority
        kind = $task.kind
        title = $task.title
        captured_at = $CapturedAt
    }
}

function Get-WorkspacePaths {
    param(
        [string]$Repo,
        [string]$TaskId
    )

    $runtimeRoot = Join-Path $Repo "_Temp\AIWorkflowRuntime"
    $tasksRoot = Join-Path $runtimeRoot "tasks"
    $workspacePath = Join-Path $tasksRoot $TaskId
    $sessionsDir = Join-Path $workspacePath "sessions"
    $evidenceDir = Join-Path $workspacePath "evidence"

    return [pscustomobject]@{
        runtime_root = $runtimeRoot
        tasks_root = $tasksRoot
        workspace_path = $workspacePath
        metadata_path = Join-Path $workspacePath "workspace_metadata.json"
        task_run_state_path = Join-Path $workspacePath "task_run_state.json"
        sessions_dir = $sessionsDir
        progress_event_log_path = Join-Path $workspacePath "progress_events.jsonl"
        runtime_control_history_path = Join-Path $workspacePath "runtime_control_history.jsonl"
        evidence_dir = $evidenceDir
        evidence_manifest_path = Join-Path $evidenceDir "manifest.json"
        evidence_logs_dir = Join-Path $evidenceDir "logs"
        evidence_diffs_dir = Join-Path $evidenceDir "diffs"
        evidence_reports_dir = Join-Path $evidenceDir "reports"
    }
}

function Read-JsonIfExists {
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

function Write-ObjectResult {
    param(
        $Result,
        [int]$ExitCode = 0
    )

    if ($Json) {
        $Result | ConvertTo-Json -Depth 12
        exit $ExitCode
    }

    if ($Result.ok -eq $false) {
        Write-Host "[ERROR] $($Result.error)"
        exit $ExitCode
    }

    switch ($Result.command) {
        "create" {
            Write-Host "============================================================"
            Write-Host "AIWorkflow Task Workspace Created"
            Write-Host "Task: $($Result.task_id)"
            Write-Host "Run:  $($Result.run_id)"
            Write-Host "State: $($Result.task_run_status)"
            Write-Host "Path: $($Result.workspace_path)"
            Write-Host "Metadata: $($Result.metadata_path)"
            Write-Host "TaskRunState: $($Result.task_run_state_path)"
            if ($Result.task_lifecycle.found -eq $false) {
                Write-Host "Lifecycle: missing in Backlog.md; runtime state was marked blocked."
            }
            else {
                Write-Host "Lifecycle: $($Result.task_lifecycle.task_status)"
            }
            Write-Host "============================================================"
        }
        "read" {
            Write-Host "============================================================"
            Write-Host "AIWorkflow Task Workspace"
            Write-Host "Task: $($Result.task_id)"
            Write-Host "Exists: $($Result.exists)"
            Write-Host "Path: $($Result.workspace_path)"
            Write-Host "TaskRunState: $($Result.task_run_status)"
            Write-Host "Lifecycle: $($Result.lifecycle_status)"
            Write-Host "Metadata: $($Result.metadata_path)"
            Write-Host "============================================================"
        }
        "status" {
            Write-Host "============================================================"
            Write-Host "AIWorkflow Task Workspace Status"
            Write-Host "Runtime root: $($Result.runtime_root)"
            Write-Host "Workspace count: $($Result.workspace_count)"
            if (-not [string]::IsNullOrWhiteSpace($Result.task_id)) {
                Write-Host "Task: $($Result.task_id)"
                Write-Host "Exists: $($Result.exists)"
                Write-Host "Path: $($Result.workspace_path)"
                Write-Host "Lifecycle matches: $($Result.lifecycle_match_count)"
            }
            Write-Host "============================================================"
        }
        default {
            Write-Host ($Result | ConvertTo-Json -Depth 8)
        }
    }

    exit $ExitCode
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        $RepoRoot = Join-Path $PSScriptRoot "..\.."
    }

    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path

    $safeTaskId = ""
    if ($Command -ne "status" -or -not [string]::IsNullOrWhiteSpace($TaskId)) {
        $safeTaskId = Get-SafeTaskId -Value $TaskId
    }

    if ($Command -eq "status") {
        $runtimeRoot = Join-Path $repo "_Temp\AIWorkflowRuntime"
        $tasksRoot = Join-Path $runtimeRoot "tasks"
        $workspaces = @()

        if (Test-Path -LiteralPath $tasksRoot) {
            $workspaces = @(Get-ChildItem -LiteralPath $tasksRoot -Directory | Sort-Object Name | ForEach-Object {
                $metadataPath = Join-Path $_.FullName "workspace_metadata.json"
                $statePath = Join-Path $_.FullName "task_run_state.json"
                $state = Read-JsonIfExists -Path $statePath
                [pscustomobject]@{
                    task_id = $_.Name
                    workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $_.FullName
                    has_metadata = (Test-Path -LiteralPath $metadataPath)
                    task_run_status = if ($null -eq $state) { $null } else { $state.status }
                }
            })
        }

        $result = [ordered]@{
            ok = $true
            command = "status"
            runtime_root = ConvertTo-RepoRelativePath -Repo $repo -Path $runtimeRoot
            tasks_root = ConvertTo-RepoRelativePath -Repo $repo -Path $tasksRoot
            workspace_count = $workspaces.Count
            workspaces = @($workspaces)
        }

        if (-not [string]::IsNullOrWhiteSpace($safeTaskId)) {
            $paths = Get-WorkspacePaths -Repo $repo -TaskId $safeTaskId
            $lookup = Get-TaskLifecycleMatches -Repo $repo -TaskId $safeTaskId
            $result.task_id = $safeTaskId
            $result.exists = (Test-Path -LiteralPath $paths.workspace_path)
            $result.workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.workspace_path
            $result.lifecycle_match_count = @($lookup.matches).Count
        }

        Write-ObjectResult -Result ([pscustomobject]$result)
    }

    $paths = Get-WorkspacePaths -Repo $repo -TaskId $safeTaskId

    if ($Command -eq "create") {
        $now = Get-NowText
        $snapshot = New-TaskLifecycleSnapshot -Repo $repo -TaskId $safeTaskId -CapturedAt $now
        $workspaceExists = Test-Path -LiteralPath $paths.workspace_path

        if ($workspaceExists) {
            $metadataExists = Test-Path -LiteralPath $paths.metadata_path
            $stateExists = Test-Path -LiteralPath $paths.task_run_state_path
            throw "Workspace already exists for task_id $safeTaskId (metadata=$metadataExists, task_run_state=$stateExists). Refusing to overwrite."
        }

        New-Item -ItemType Directory -Path $paths.workspace_path -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.sessions_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.evidence_logs_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.evidence_diffs_dir -Force | Out-Null
        New-Item -ItemType Directory -Path $paths.evidence_reports_dir -Force | Out-Null

        $runId = "run-$safeTaskId-001"
        $workspaceId = "workspace-$safeTaskId"
        $runStatus = if ($snapshot.found -eq $false) { "blocked" } else { "not_started" }

        $metadata = [ordered]@{
            schema_version = 1
            task_id = $safeTaskId
            workspace_id = $workspaceId
            status = "created"
            runtime_root = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.runtime_root
            workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.workspace_path
            state_files = [ordered]@{
                workspace_metadata = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.metadata_path
                task_run_state = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.task_run_state_path
                sessions_dir = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.sessions_dir
                progress_event_log = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.progress_event_log_path
                runtime_control_history = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.runtime_control_history_path
                evidence_dir = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.evidence_dir
            }
            task_lifecycle_link = $snapshot
            handoff = [ordered]@{
                wf_203_session_supervisor = [ordered]@{
                    sessions_dir = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.sessions_dir
                    active_session_id_field = "task_run_state.active_session_id"
                    session_ids_field = "task_run_state.session_ids"
                    progress_event_log = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.progress_event_log_path
                }
                wf_204_evidence_collector = [ordered]@{
                    evidence_dir = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.evidence_dir
                    manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.evidence_manifest_path
                    progress_event_log = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.progress_event_log_path
                }
            }
            created_at = $now
            updated_at = $now
            created_by = "tools/aiworkflow/task_workspace_manager.ps1"
        }

        $taskRunState = [ordered]@{
            schema_version = 1
            task_id = $safeTaskId
            run_id = $runId
            status = $runStatus
            task_lifecycle_snapshot = $snapshot
            active_session_id = $null
            session_ids = @()
            workspace = [ordered]@{
                workspace_id = $workspaceId
                workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.workspace_path
                worktree_path = $null
                created_by = "WF-202 Task Workspace Manager"
            }
            executor_plan = [ordered]@{
                planned_executor = $null
                adapter_id = $null
                adapter_version = $null
            }
            progress = [ordered]@{
                last_event_id = $null
                last_event_at = $null
                last_heartbeat_at = $null
                current_step = $null
            }
            evidence = [ordered]@{
                manifest_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.evidence_manifest_path
                latest_report_path = $null
                collector_status = "not_started"
            }
            control = [ordered]@{
                latest_control_id = $null
                pending_human_decision = $null
            }
            created_at = $now
            updated_at = $now
        }

        Write-Utf8Text -Path $paths.metadata_path -Text (($metadata | ConvertTo-Json -Depth 12) + "`n")
        Write-Utf8Text -Path $paths.task_run_state_path -Text (($taskRunState | ConvertTo-Json -Depth 12) + "`n")
        Write-Utf8Text -Path $paths.progress_event_log_path -Text ""
        Write-Utf8Text -Path $paths.runtime_control_history_path -Text ""

        $result = [pscustomobject]@{
            ok = $true
            command = "create"
            task_id = $safeTaskId
            run_id = $runId
            task_run_status = $runStatus
            workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.workspace_path
            metadata_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.metadata_path
            task_run_state_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.task_run_state_path
            task_lifecycle = [pscustomobject]$snapshot
        }

        Write-ObjectResult -Result $result
    }

    if ($Command -eq "read") {
        if (-not (Test-Path -LiteralPath $paths.workspace_path)) {
            throw "Workspace does not exist for task_id $safeTaskId."
        }

        $metadata = Read-JsonIfExists -Path $paths.metadata_path
        $taskRunState = Read-JsonIfExists -Path $paths.task_run_state_path
        $lifecycleStatus = $null

        if ($null -ne $metadata -and $null -ne $metadata.task_lifecycle_link) {
            $lifecycleStatus = $metadata.task_lifecycle_link.task_status
        }

        $result = [pscustomobject]@{
            ok = $true
            command = "read"
            task_id = $safeTaskId
            exists = $true
            workspace_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.workspace_path
            metadata_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.metadata_path
            task_run_state_path = ConvertTo-RepoRelativePath -Repo $repo -Path $paths.task_run_state_path
            task_run_status = if ($null -eq $taskRunState) { $null } else { $taskRunState.status }
            lifecycle_status = $lifecycleStatus
            metadata = $metadata
            task_run_state = $taskRunState
        }

        Write-ObjectResult -Result $result
    }
}
catch {
    $result = [pscustomobject]@{
        ok = $false
        command = $Command
        task_id = $TaskId
        error = $_.Exception.Message
    }

    Write-ObjectResult -Result $result -ExitCode 1
}
