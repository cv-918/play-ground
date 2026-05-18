param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

function ConvertTo-StudioJson {
    param([object]$Value)

    $Value | ConvertTo-Json -Depth 64
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing JSON file: $Path"
    }
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw "JSON file is empty: $Path"
    }
    return $text | ConvertFrom-Json
}

function Resolve-RepoFilePath {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return (Resolve-Path -LiteralPath $Path).Path
    }
    return (Resolve-Path -LiteralPath (Join-Path $Root $Path)).Path
}

function Get-FullPathNoResolve {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $Root $Path))
}

function Get-OutputPath {
    param(
        [string]$Root,
        [string]$ContextPacketId,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root ("_Temp\AIWorkflowStudio\staff_prompts\{0}.md" -f $ContextPacketId))
    }
    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--output is only allowed under _Temp for validation safety: $resolved"
    }
    return $resolved
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }
    return @($Value | ForEach-Object { [string]$_ })
}

function Limit-Text {
    param(
        [string]$Text,
        [int]$Max = 220
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }
    $clean = [regex]::Replace($Text.Trim(), "\s+", " ")
    if ($clean.Length -le $Max) {
        return $clean
    }
    return $clean.Substring(0, [Math]::Max(0, $Max - 3)).TrimEnd() + "..."
}

function Render-Bullets {
    param([object[]]$Items)

    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($item in @($Items)) {
        if (-not [string]::IsNullOrWhiteSpace([string]$item)) {
            $lines.Add("- " + [string]$item)
        }
    }
    if ($lines.Count -eq 0) {
        $lines.Add("- None.")
    }
    return ($lines.ToArray() -join [Environment]::NewLine)
}

function Render-JsonArray {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "[]"
    }
    return (($Items | ConvertTo-Json -Depth 16) -replace "`r?`n", "`n")
}

function New-OutputSkeleton {
    param([object]$Context)

    return [pscustomobject]@{
        output_id = "RRO-YYYYMMDD-HHMMSS-slug"
        role_run_id = [string]$Context.role_run_id
        agent_id = [string]$Context.agent_id
        status = "output_ready | needs_director_decision | needs_evidence | handoff_requested | blocked | failed"
        plain_language_summary = "Short summary for the Human Director."
        proposals = @()
        objections = @()
        questions = @()
        approval_items = @()
        handoff_requests = @()
        workorder_recommendations = @()
        evidence_refs = @()
        memory_write_requests = @()
        safety = [pscustomobject]@{
            source_changed = $false
            task_created = $false
            approval_changed = $false
            canon_changed = $false
            commit_or_push_performed = $false
        }
    }
}

function New-PromptText {
    param([object]$Context)

    $memory = $Context.memory_context
    $skeleton = New-OutputSkeleton -Context $Context
    $jsonSkeleton = ($skeleton | ConvertTo-Json -Depth 32)

    return @"
# AIWorkflow Studio Staff Execution Prompt

You are a persistent AI staff agent inside the Personal AI Development Studio.
You are not roleplaying loosely. You must work only from the sealed
StaffContextPacket below and return structured RoleRunOutput.

## Provider Policy

- Use the signed-in Codex App/CLI route first.
- Do not require OpenAI API billing by default.
- Do not call external providers unless a separate governed ToolRunRequest and
  Human Director approval allow it.

## Identity

- agent_id: $($Context.agent_id)
- department_id: $($Context.department_id)
- role_run_id: $($Context.role_run_id)
- context_packet_id: $($Context.context_packet_id)

## Source

- source_type: $($Context.source_type)
- source_ref: $($Context.source_ref)
- project_profile: $($Context.current_project_profile)

## Objective

$($Context.objective)

## Director Intent

$($Context.director_intent)

## Approved Scope

$(Render-Bullets -Items $Context.approved_scope)

## Non-Goals

$(Render-Bullets -Items $Context.non_goals)

## Memory Context

- canon_refs: $((Get-StringArray -Value $memory.canon_refs) -join ", ")
- approved_decision_refs: $((Get-StringArray -Value $memory.approved_decision_refs) -join ", ")
- proposal_refs: $((Get-StringArray -Value $memory.proposal_refs) -join ", ")
- rejected_refs: $((Get-StringArray -Value $memory.rejected_refs) -join ", ")
- lesson_refs: $((Get-StringArray -Value $memory.lesson_refs) -join ", ")
- evidence_refs: $((Get-StringArray -Value $memory.evidence_refs) -join ", ")

Do not treat proposals as canon. Do not turn your own suggestion into canon.
If canon status is unclear, ask a question or return blocked.

## Tools

Allowed tools:
$(Render-Bullets -Items $Context.allowed_tools)

Blocked tools:
$(Render-Bullets -Items $Context.blocked_tools)

Approval-required tools:
$(Render-Bullets -Items $Context.approval_required_tools)

You may request a ToolRunRequest, but you may not execute tools directly from
this prompt.

## Required Outputs

$(Render-Bullets -Items $Context.required_outputs)

## Quality Criteria

$(Render-Bullets -Items $Context.quality_criteria)

## Stop Conditions

$(Render-Bullets -Items $Context.stop_conditions)

## RoleRunOutput Field Contract

Use these exact field names. Do not invent alternate names.

- proposals[] requires: title, summary, status, risks, evidence_required.
  status must be draft, proposed, recommended, or not_recommended.
- objections[] requires: summary, reason, severity, blocks_progress.
  severity must be info, minor, major, or blocking.
- questions[] requires: question, why_needed, blocks_progress.
- approval_items[] requires: type, plain_language_summary,
  what_will_change, what_will_not_change, risks, evidence_required.
  type must be scope, canon, implementation, asset_import, external_tool,
  completion, or git.
- handoff_requests[] requires: target_agent_id, objective, required_context,
  expected_output.
- workorder_recommendations[] requires: objective, department_id, scope,
  non_goals, expected_outputs.
- memory_write_requests[] requires: status, scope, summary, requires_approval.

## Hard Safety Rules

- Do not modify source files.
- Do not create tasks.
- Do not approve work.
- Do not write canon.
- Do not commit or push.
- Do not claim validation without evidence refs.
- If required context is missing, return needs_director_decision,
  needs_evidence, or blocked.

## Required Return Format

Return only valid JSON matching this RoleRunOutput shape:

~~~json
$jsonSkeleton
~~~
"@
}

function Test-ContextPacket {
    param([object]$Context)

    $errors = New-Object System.Collections.Generic.List[string]
    foreach ($field in @("context_packet_id", "role_run_id", "agent_id", "department_id", "source_type", "source_ref", "objective", "approved_scope", "non_goals", "memory_context", "allowed_tools", "blocked_tools", "approval_required_tools", "required_outputs", "quality_criteria", "stop_conditions", "safety")) {
        if ($null -eq $Context.PSObject.Properties[$field]) {
            $errors.Add("Missing required field: $field")
        }
    }
    if ([string]$Context.context_packet_id -notmatch "^SCP-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors.Add("Invalid context_packet_id.")
    }
    if ([string]$Context.role_run_id -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors.Add("Invalid role_run_id.")
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        context_packet_id = [string]$Context.context_packet_id
        role_run_id = [string]$Context.role_run_id
        agent_id = [string]$Context.agent_id
        errors = $errors.ToArray()
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$ContextPath
    )

    $path = Resolve-RepoFilePath -Root $Root -Path $ContextPath
    $context = Read-JsonFile -Path $path
    $validation = Test-ContextPacket -Context $context
    $prompt = ""
    if ($validation.ok) {
        $prompt = New-PromptText -Context $context
    }
    return [pscustomobject]@{
        ok = $validation.ok
        command = "plan"
        context_path = $path
        context_packet_id = [string]$context.context_packet_id
        role_run_id = [string]$context.role_run_id
        agent_id = [string]$context.agent_id
        validation = $validation
        prompt_preview = (Limit-Text -Text $prompt -Max 900)
        prompt_line_count = if ([string]::IsNullOrWhiteSpace($prompt)) { 0 } else { @($prompt -split "`r?`n").Count }
        safety = [pscustomobject]@{
            read_only = $true
            prompt_written = $false
            staff_executed = $false
            llm_called = $false
            tool_called = $false
            task_state_changed = $false
            source_changed = $false
            git_changed = $false
        }
    }
}

function New-ExportResult {
    param(
        [string]$Root,
        [string]$ContextPath,
        [string]$OutputOverride
    )

    $path = Resolve-RepoFilePath -Root $Root -Path $ContextPath
    $context = Read-JsonFile -Path $path
    $validation = Test-ContextPacket -Context $context
    if (-not $validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "export"
            context_path = $path
            validation = $validation
            safety = [pscustomobject]@{ prompt_written = $false; llm_called = $false; tool_called = $false; source_changed = $false; git_changed = $false }
        }
    }
    $outputPath = Get-OutputPath -Root $Root -ContextPacketId ([string]$context.context_packet_id) -OverridePath $OutputOverride
    $prompt = New-PromptText -Context $context
    $outputDir = Split-Path -Parent $outputPath
    if (-not (Test-Path -LiteralPath $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outputPath, $prompt + [Environment]::NewLine, $encoding)
    return [pscustomobject]@{
        ok = $true
        command = "export"
        context_path = $path
        output_path = $outputPath
        context_packet_id = [string]$context.context_packet_id
        role_run_id = [string]$context.role_run_id
        agent_id = [string]$context.agent_id
        validation = $validation
        prompt_line_count = @($prompt -split "`r?`n").Count
        safety = [pscustomobject]@{
            read_only = $false
            prompt_written = $true
            staff_executed = $false
            llm_called = $false
            tool_called = $false
            task_state_changed = $false
            source_changed = $false
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
    foreach ($item in @($Items)) {
        Write-Host "- $item"
    }
}

function Show-Result {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Staff Prompt Exporter"
    Write-Host "============================================================"
    Write-Host "Command: $($Result.command)"
    Write-Host "Context: $($Result.context_packet_id)"
    Write-Host "RoleRun: $($Result.role_run_id)"
    Write-Host "Agent: $($Result.agent_id)"
    if ($Result.output_path) {
        Write-Host "Output: $($Result.output_path)"
    }
    Write-Host "Prompt lines: $($Result.prompt_line_count)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Safety" -Items @(
        "prompt written: $($Result.safety.prompt_written)",
        "staff not executed",
        "LLM not called",
        "tools not called",
        "task/source/git unchanged"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_staff_prompt_exporter.bat plan <context_packet_json>|export <context_packet_json> [--output _Temp\\...] [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $outputOverride = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]
    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--output") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--output requires a path argument."
            }
            $index += 1
            $outputOverride = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -ne 2) {
        $result = New-UsageResult
        if ($json) { ConvertTo-StudioJson -Value $result } else { Write-Host "[ERROR] $($result.error)" }
        exit 1
    }
    $command = ([string]$cleanArgs[0]).ToLowerInvariant()
    if ($command -eq "plan") {
        $result = New-PlanResult -Root $repo -ContextPath ([string]$cleanArgs[1])
    } elseif ($command -eq "export") {
        $result = New-ExportResult -Root $repo -ContextPath ([string]$cleanArgs[1]) -OutputOverride $outputOverride
    } else {
        $result = New-UsageResult
        if ($json) { ConvertTo-StudioJson -Value $result } else { Write-Host "[ERROR] $($result.error)" }
        exit 1
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } else {
        Show-Result -Result $result
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
