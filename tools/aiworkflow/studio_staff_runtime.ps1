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

function New-SafetyState {
    param([bool]$RoleRunWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $RoleRunWritten)
        role_run_written = $RoleRunWritten
        llm_called = $false
        tool_called = $false
        memory_written = $false
        workorder_written = $false
        backlog_written = $false
        active_task_changed = $false
        approval_changed = $false
        runner_started = $false
        source_changed = $false
        git_changed = $false
    }
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

function Get-DefaultStorePath {
    param([string]$Root)

    return (Join-Path $Root "_Docs\AIWorkflow\Studio\RoleRuns")
}

function Get-StorePath {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Get-DefaultStorePath -Root $Root)
    }

    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--store-path override is only allowed under _Temp for validation safety: $resolved"
    }

    return $resolved
}

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
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
        [int]$Max = 160
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

function Read-StaffRegistry {
    param([string]$Root)

    $path = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\staff_agents.initial.json"
    $data = Read-JsonFile -Path $path
    $map = @{}

    foreach ($staff in @($data.staff_agents)) {
        $id = [string]$staff.agent_id
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $map[$id] = $staff
        }
    }

    foreach ($staff in @($data.planned_staff_agents)) {
        $id = [string]$staff.agent_id
        if (-not [string]::IsNullOrWhiteSpace($id) -and -not $map.ContainsKey($id)) {
            $map[$id] = $staff
        }
    }

    return ,$map
}

function Get-RoleRunFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $StorePath -Filter "*.json" -File | Sort-Object Name)
}

function Resolve-RoleRunInput {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$InputValue
    )

    $candidate = Get-FullPathNoResolve -Root $Root -Path $InputValue
    if (Test-Path -LiteralPath $candidate) {
        return $candidate
    }

    $stored = Join-Path $StorePath ($InputValue + ".json")
    if (Test-Path -LiteralPath $stored) {
        return (Resolve-Path -LiteralPath $stored).Path
    }

    throw "RoleRun not found as file path or stored role_run_id: $InputValue"
}

function Test-RequiredFields {
    param(
        [object]$Value,
        [string[]]$Required
    )

    $errors = @()
    foreach ($name in $Required) {
        if (-not (Test-HasProperty -Value $Value -Name $name)) {
            $errors += "Missing required field: $name"
        }
    }
    return @($errors)
}

function Test-ContextPacket {
    param(
        [object]$Context,
        [string]$Path,
        [hashtable]$StaffMap
    )

    $errors = @()
    $warnings = @()

    $errors += Test-RequiredFields -Value $Context -Required @(
        "context_packet_id",
        "role_run_id",
        "agent_id",
        "department_id",
        "source_type",
        "source_ref",
        "objective",
        "current_project_profile",
        "director_intent",
        "approved_scope",
        "non_goals",
        "memory_context",
        "relevant_decision_refs",
        "relevant_evidence_refs",
        "allowed_tools",
        "blocked_tools",
        "approval_required_tools",
        "required_outputs",
        "quality_criteria",
        "stop_conditions",
        "safety"
    )

    $contextId = [string]$Context.context_packet_id
    $roleRunId = [string]$Context.role_run_id
    if (-not [string]::IsNullOrWhiteSpace($contextId) -and $contextId -notmatch "^SCP-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors += "context_packet_id must match SCP-YYYYMMDD-HHMMSS-slug."
    }
    if (-not [string]::IsNullOrWhiteSpace($roleRunId) -and $roleRunId -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors += "role_run_id must match RR-YYYYMMDD-HHMMSS-slug."
    }

    $agentId = [string]$Context.agent_id
    if (-not $StaffMap.ContainsKey($agentId)) {
        $errors += "agent_id is not in staff registry: $agentId"
    } else {
        $staff = $StaffMap[$agentId]
        if ([string]$staff.department_id -ne [string]$Context.department_id) {
            $errors += "department_id does not match staff registry for $agentId."
        }

        $declaredAllowed = Get-StringArray -Value $staff.tool_policy.allowed_tools
        foreach ($tool in (Get-StringArray -Value $Context.allowed_tools)) {
            if ($declaredAllowed -notcontains $tool) {
                $warnings += "allowed_tools includes a tool not declared in staff policy: $tool"
            }
        }
    }

    if (@(Get-StringArray -Value $Context.approved_scope).Count -eq 0) {
        $errors += "approved_scope must contain at least one item."
    }
    if (@(Get-StringArray -Value $Context.required_outputs).Count -eq 0) {
        $errors += "required_outputs must contain at least one item."
    }
    if (@(Get-StringArray -Value $Context.quality_criteria).Count -eq 0) {
        $errors += "quality_criteria must contain at least one item."
    }
    if (@(Get-StringArray -Value $Context.stop_conditions).Count -eq 0) {
        $errors += "stop_conditions must contain at least one item."
    }

    $allowedTools = Get-StringArray -Value $Context.allowed_tools
    $blockedTools = Get-StringArray -Value $Context.blocked_tools
    foreach ($tool in $allowedTools) {
        if ($blockedTools -contains $tool) {
            $errors += "Tool cannot be both allowed and blocked: $tool"
        }
    }

    if ($Context.safety.source_write_allowed -and $blockedTools -contains "source_write") {
        $errors += "source_write_allowed=true conflicts with blocked_tools=source_write."
    }
    if ($Context.safety.canon_write_allowed -and $blockedTools -contains "canon_write") {
        $errors += "canon_write_allowed=true conflicts with blocked_tools=canon_write."
    }
    if ($Context.safety.commit_allowed -and $blockedTools -contains "git_push") {
        $errors += "commit_allowed=true conflicts with blocked_tools=git_push."
    }
    if ($Context.safety.approval_allowed) {
        $warnings += "Staff context allows approval. This should be reserved for deterministic governance policy, not LLM staff judgment."
    }

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        context_packet_id = $contextId
        role_run_id = $roleRunId
        agent_id = $agentId
        department_id = [string]$Context.department_id
        path = $Path
        errors = @($errors)
        warnings = @($warnings)
    }
}

function Get-ReasoningLevel {
    param([object]$Context)

    $combined = @(
        [string]$Context.objective
        [string]$Context.director_intent
        (Get-StringArray -Value $Context.approved_scope) -join " "
        (Get-StringArray -Value $Context.required_outputs) -join " "
    ) -join " "

    $lower = $combined.ToLowerInvariant()
    if ($lower -match "canon|architecture|runtime|schema|approval|decision") {
        return "high"
    }
    return "medium"
}

function New-RoleRunFromContext {
    param([object]$Context)

    $workOrderId = ""
    $meetingId = $null
    if ([string]$Context.source_type -eq "work_order") {
        $workOrderId = [string]$Context.source_ref
    } elseif ([string]$Context.source_type -eq "meeting_session") {
        $meetingId = [string]$Context.source_ref
    }

    $inputRefs = @(
        [string]$Context.context_packet_id,
        [string]$Context.source_ref
    )
    $inputRefs += Get-StringArray -Value $Context.relevant_decision_refs
    $inputRefs += Get-StringArray -Value $Context.relevant_evidence_refs

    return [pscustomobject]@{
        role_run_id = [string]$Context.role_run_id
        agent_id = [string]$Context.agent_id
        context_packet_ref = [string]$Context.context_packet_id
        work_order_id = $workOrderId
        meeting_id = $meetingId
        input_context_refs = @($inputRefs | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -Unique)
        prompt_ref = "generated://aiworkflow-studio/staff-runtime/$($Context.context_packet_id)"
        model_provider = "codex_cli_signed_in"
        model_name = "gpt-5.5"
        reasoning_level = (Get-ReasoningLevel -Context $Context)
        output_refs = @()
        tool_run_refs = @()
        evidence_refs = @()
        status = "created"
    }
}

function New-RoleRunSummary {
    param(
        [object]$RoleRun,
        [string]$Path
    )

    return [pscustomobject]@{
        role_run_id = [string]$RoleRun.role_run_id
        agent_id = [string]$RoleRun.agent_id
        context_packet_ref = [string]$RoleRun.context_packet_ref
        work_order_id = [string]$RoleRun.work_order_id
        meeting_id = $RoleRun.meeting_id
        model_provider = [string]$RoleRun.model_provider
        model_name = [string]$RoleRun.model_name
        reasoning_level = [string]$RoleRun.reasoning_level
        status = [string]$RoleRun.status
        path = $Path
    }
}

function Test-RoleRun {
    param(
        [object]$RoleRun,
        [string]$Path,
        [hashtable]$StaffMap,
        [hashtable]$SeenIds
    )

    $errors = @()
    $warnings = @()
    $errors += Test-RequiredFields -Value $RoleRun -Required @(
        "role_run_id",
        "agent_id",
        "context_packet_ref",
        "work_order_id",
        "meeting_id",
        "input_context_refs",
        "prompt_ref",
        "model_provider",
        "model_name",
        "reasoning_level",
        "output_refs",
        "tool_run_refs",
        "evidence_refs",
        "status"
    )

    $roleRunId = [string]$RoleRun.role_run_id
    if (-not [string]::IsNullOrWhiteSpace($roleRunId)) {
        if ($roleRunId -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
            $errors += "role_run_id must match RR-YYYYMMDD-HHMMSS-slug."
        }
        if ($null -ne $SeenIds) {
            if ($SeenIds.ContainsKey($roleRunId)) {
                $errors += "Duplicate role_run_id also found at: $($SeenIds[$roleRunId])"
            } else {
                $SeenIds[$roleRunId] = $Path
            }
        }
    }

    $agentId = [string]$RoleRun.agent_id
    if (-not $StaffMap.ContainsKey($agentId)) {
        $errors += "agent_id is not in staff registry: $agentId"
    }
    if (@("none", "minimal", "low", "medium", "high", "xhigh") -notcontains ([string]$RoleRun.reasoning_level)) {
        $errors += "Invalid reasoning_level: $($RoleRun.reasoning_level)"
    }
    if (@("created", "context_loaded", "planning", "tool_review", "running", "handoff_pending", "output_ready", "needs_director_decision", "completed", "blocked", "failed", "cancelled") -notcontains ([string]$RoleRun.status)) {
        $errors += "Invalid status: $($RoleRun.status)"
    }
    if ([string]$RoleRun.model_provider -eq "openai_api") {
        $warnings += "model_provider=openai_api is not the default policy. Prefer Codex/ChatGPT subscription-backed execution first."
    }

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        role_run_id = $roleRunId
        agent_id = $agentId
        status = [string]$RoleRun.status
        path = $Path
        errors = @($errors)
        warnings = @($warnings)
    }
}

function Test-RoleRunOutput {
    param(
        [object]$Output,
        [string]$Path,
        [hashtable]$StaffMap
    )

    $errors = @()
    $warnings = @()
    $errors += Test-RequiredFields -Value $Output -Required @(
        "output_id",
        "role_run_id",
        "agent_id",
        "status",
        "plain_language_summary",
        "proposals",
        "objections",
        "questions",
        "approval_items",
        "handoff_requests",
        "workorder_recommendations",
        "evidence_refs",
        "memory_write_requests",
        "safety"
    )

    if ([string]$Output.output_id -notmatch "^RRO-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors += "output_id must match RRO-YYYYMMDD-HHMMSS-slug."
    }
    if ([string]$Output.role_run_id -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors += "role_run_id must match RR-YYYYMMDD-HHMMSS-slug."
    }
    if (-not $StaffMap.ContainsKey([string]$Output.agent_id)) {
        $errors += "agent_id is not in staff registry: $($Output.agent_id)"
    }
    if (@("output_ready", "needs_director_decision", "needs_evidence", "handoff_requested", "blocked", "failed") -notcontains ([string]$Output.status)) {
        $errors += "Invalid output status: $($Output.status)"
    }
    if ([string]::IsNullOrWhiteSpace([string]$Output.plain_language_summary)) {
        $errors += "plain_language_summary is required."
    }

    if ([string]$Output.status -eq "needs_director_decision" -and @(Get-StringArray -Value $Output.approval_items).Count -eq 0 -and @(Get-StringArray -Value $Output.questions).Count -eq 0) {
        $warnings += "needs_director_decision should include approval_items or questions."
    }

    foreach ($memory in @($Output.memory_write_requests)) {
        if ([string]$memory.status -eq "canon" -and -not [bool]$memory.requires_approval) {
            $errors += "canon memory_write_requests must require approval."
        }
    }

    if ($Output.safety.source_changed) { $errors += "RoleRunOutput claims source_changed=true; staff output must not directly change source." }
    if ($Output.safety.task_created) { $errors += "RoleRunOutput claims task_created=true; staff output must not directly create tasks." }
    if ($Output.safety.approval_changed) { $errors += "RoleRunOutput claims approval_changed=true; staff output must not approve work." }
    if ($Output.safety.canon_changed) { $errors += "RoleRunOutput claims canon_changed=true; staff output must not canonize directly." }
    if ($Output.safety.commit_or_push_performed) { $errors += "RoleRunOutput claims commit_or_push_performed=true; staff output must not commit or push." }

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        output_id = [string]$Output.output_id
        role_run_id = [string]$Output.role_run_id
        agent_id = [string]$Output.agent_id
        status = [string]$Output.status
        path = $Path
        errors = @($errors)
        warnings = @($warnings)
    }
}

function Read-StoreRoleRuns {
    param(
        [string]$StorePath,
        [hashtable]$StaffMap
    )

    $records = @()
    $validations = @()
    $seen = @{}

    foreach ($file in (Get-RoleRunFiles -StorePath $StorePath)) {
        try {
            $roleRun = Read-JsonFile -Path $file.FullName
            $validation = Test-RoleRun -RoleRun $roleRun -Path $file.FullName -StaffMap $StaffMap -SeenIds $seen
            $records += [pscustomobject]@{
                role_run = $roleRun
                path = $file.FullName
                validation = $validation
            }
            $validations += $validation
        } catch {
            $validations += [pscustomobject]@{
                ok = $false
                role_run_id = ""
                agent_id = ""
                status = ""
                path = $file.FullName
                errors = @($_.Exception.Message)
                warnings = @()
            }
        }
    }

    return [pscustomobject]@{
        records = @($records)
        validations = @($validations)
    }
}

function New-StatusResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $staffMap = Read-StaffRegistry -Root $Root
    $store = Read-StoreRoleRuns -StorePath $StorePath -StaffMap $staffMap
    $errorCount = 0
    $warningCount = 0
    foreach ($validation in @($store.validations)) {
        $errorCount += @($validation.errors).Count
        $warningCount += @($validation.warnings).Count
    }

    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "status"
        store_path = $StorePath
        store_exists = (Test-Path -LiteralPath $StorePath)
        role_run_count = @($store.records).Count
        error_count = $errorCount
        warning_count = $warningCount
        safety = New-SafetyState
    }
}

function New-ValidateResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $staffMap = Read-StaffRegistry -Root $Root
    $store = Read-StoreRoleRuns -StorePath $StorePath -StaffMap $staffMap
    $errorCount = 0
    $warningCount = 0
    foreach ($validation in @($store.validations)) {
        $errorCount += @($validation.errors).Count
        $warningCount += @($validation.warnings).Count
    }

    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        store_path = $StorePath
        role_run_count = @($store.records).Count
        error_count = $errorCount
        warning_count = $warningCount
        validations = @($store.validations)
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $staffMap = Read-StaffRegistry -Root $Root
    $store = Read-StoreRoleRuns -StorePath $StorePath -StaffMap $staffMap
    $items = @()
    foreach ($item in @($store.records)) {
        $items += (New-RoleRunSummary -RoleRun $item.role_run -Path $item.path)
    }

    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_path = $StorePath
        count = @($items).Count
        items = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$RoleRunId
    )

    $staffMap = Read-StaffRegistry -Root $Root
    $store = Read-StoreRoleRuns -StorePath $StorePath -StaffMap $staffMap
    foreach ($item in @($store.records)) {
        if ([string]$item.role_run.role_run_id -eq $RoleRunId) {
            return [pscustomobject]@{
                ok = $true
                command = "read"
                store_path = $StorePath
                role_run_id = $RoleRunId
                role_run = $item.role_run
                summary = (New-RoleRunSummary -RoleRun $item.role_run -Path $item.path)
                validation = $item.validation
                safety = New-SafetyState
            }
        }
    }

    return [pscustomobject]@{
        ok = $false
        command = "read"
        store_path = $StorePath
        role_run_id = $RoleRunId
        error = "RoleRun not found: $RoleRunId"
        safety = New-SafetyState
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$ContextPath
    )

    $path = Resolve-RepoFilePath -Root $Root -Path $ContextPath
    $context = Read-JsonFile -Path $path
    $staffMap = Read-StaffRegistry -Root $Root
    $contextValidation = Test-ContextPacket -Context $context -Path $path -StaffMap $staffMap
    $roleRun = New-RoleRunFromContext -Context $context
    $roleRunValidation = Test-RoleRun -RoleRun $roleRun -Path "(generated)" -StaffMap $staffMap -SeenIds $null

    $errors = @($contextValidation.errors) + @($roleRunValidation.errors)
    $warnings = @($contextValidation.warnings) + @($roleRunValidation.warnings)

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        command = "plan"
        context_path = $path
        context_validation = $contextValidation
        role_run = $roleRun
        role_run_validation = $roleRunValidation
        provider_policy = "Use Codex App/CLI signed-in subscription route first. Do not require OpenAI API billing by default."
        errors = @($errors)
        warnings = @($warnings)
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$ContextPath,
        [bool]$Execute
    )

    $plan = New-PlanResult -Root $Root -ContextPath $ContextPath
    $roleRunId = [string]$plan.role_run.role_run_id
    $targetPath = Join-Path $StorePath ($roleRunId + ".json")

    $staffMap = Read-StaffRegistry -Root $Root
    $store = Read-StoreRoleRuns -StorePath $StorePath -StaffMap $staffMap
    $duplicate = ""
    foreach ($item in @($store.records)) {
        if ([string]$item.role_run.role_run_id -eq $roleRunId) {
            $duplicate = $item.path
        }
    }

    $errors = @($plan.errors)
    if (-not [string]::IsNullOrWhiteSpace($duplicate)) {
        $errors += "role_run_id already exists in store: $duplicate"
    }

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = (@($errors).Count -eq 0)
            command = "create"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create <context_packet_json_path> --execute to write a RoleRun."
            role_run_id = $roleRunId
            target_path = $targetPath
            plan = $plan
            errors = @($errors)
            safety = New-SafetyState
        }
    }

    if (@($errors).Count -gt 0) {
        return [pscustomobject]@{
            ok = $false
            command = "create"
            execute = $true
            role_run_id = $roleRunId
            target_path = $targetPath
            error = "RoleRun validation failed. Nothing was written."
            plan = $plan
            errors = @($errors)
            safety = New-SafetyState
        }
    }

    if (-not (Test-Path -LiteralPath $StorePath)) {
        New-Item -ItemType Directory -Path $StorePath -Force | Out-Null
    }

    $jsonText = $plan.role_run | ConvertTo-Json -Depth 64
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, $jsonText + [Environment]::NewLine, $utf8NoBom)

    return [pscustomobject]@{
        ok = $true
        command = "create"
        execute = $true
        role_run_id = $roleRunId
        target_path = $targetPath
        plan = $plan
        safety = New-SafetyState -RoleRunWritten $true
    }
}

function New-InspectOutputResult {
    param(
        [string]$Root,
        [string]$OutputPath
    )

    $path = Resolve-RepoFilePath -Root $Root -Path $OutputPath
    $output = Read-JsonFile -Path $path
    $staffMap = Read-StaffRegistry -Root $Root
    $validation = Test-RoleRunOutput -Output $output -Path $path -StaffMap $staffMap

    return [pscustomobject]@{
        ok = $validation.ok
        command = "inspect-output"
        output_path = $path
        output = $output
        summary = [pscustomobject]@{
            output_id = [string]$output.output_id
            role_run_id = [string]$output.role_run_id
            agent_id = [string]$output.agent_id
            status = [string]$output.status
            summary = (Limit-Text -Text ([string]$output.plain_language_summary) -Max 180)
            proposal_count = @($output.proposals).Count
            objection_count = @($output.objections).Count
            question_count = @($output.questions).Count
            approval_item_count = @($output.approval_items).Count
            workorder_recommendation_count = @($output.workorder_recommendations).Count
            memory_write_request_count = @($output.memory_write_requests).Count
        }
        validation = $validation
        safety = New-SafetyState
    }
}

function New-HandoffOutputResult {
    param(
        [string]$Root,
        [string]$OutputPath
    )

    $inspect = New-InspectOutputResult -Root $Root -OutputPath $OutputPath
    $output = $inspect.output
    $nextActions = @(
        "Review questions and approval items before treating staff recommendations as approved.",
        "Create WorkOrders only after Human Director accepts the recommendation.",
        "Write MemoryRecords only through the memory store and only with the required approval state."
    )

    return [pscustomobject]@{
        ok = $inspect.validation.ok
        command = "handoff-output"
        output_id = [string]$output.output_id
        role_run_id = [string]$output.role_run_id
        agent_id = [string]$output.agent_id
        status = [string]$output.status
        plain_language_summary = [string]$output.plain_language_summary
        questions = @($output.questions)
        approval_items = @($output.approval_items)
        handoff_requests = @($output.handoff_requests)
        workorder_recommendations = @($output.workorder_recommendations)
        memory_write_requests = @($output.memory_write_requests)
        next_actions = $nextActions
        validation = $inspect.validation
        safety = New-SafetyState
    }
}

function New-RouteOutputResult {
    param(
        [string]$Root,
        [string]$OutputPath
    )

    $inspect = New-InspectOutputResult -Root $Root -OutputPath $OutputPath
    $output = $inspect.output
    $routes = @()

    foreach ($question in @($output.questions)) {
        $routes += [pscustomobject]@{
            route_type = "director_question"
            human_required = $true
            summary = [string]$question.question
            next_action = "Ask Human Director before treating this RoleRun as complete."
            target = "human_director"
        }
    }
    foreach ($item in @($output.approval_items)) {
        $routes += [pscustomobject]@{
            route_type = "approval_item"
            human_required = $true
            summary = [string]$item.plain_language_summary
            next_action = "Create a Decision or approval record before writing canon, memory, tasks, or implementation."
            target = "human_director"
        }
    }
    foreach ($handoff in @($output.handoff_requests)) {
        $routes += [pscustomobject]@{
            route_type = "staff_handoff"
            human_required = $false
            summary = [string]$handoff.objective
            next_action = "Prepare a StaffContextPacket for the target agent; do not execute automatically."
            target = [string]$handoff.target_agent_id
        }
    }
    foreach ($workOrder in @($output.workorder_recommendations)) {
        $routes += [pscustomobject]@{
            route_type = "workorder_candidate"
            human_required = $true
            summary = [string]$workOrder.objective
            next_action = "Convert to WorkOrder JSON only after Human Director accepts the candidate scope."
            target = [string]$workOrder.department_id
        }
    }
    foreach ($memory in @($output.memory_write_requests)) {
        $requiresApproval = [bool]$memory.requires_approval -or [string]$memory.status -in @("approved", "canon")
        $routes += [pscustomobject]@{
            route_type = "memory_candidate"
            human_required = $requiresApproval
            summary = [string]$memory.summary
            next_action = if ($requiresApproval) { "Create Decision/approval evidence before writing durable memory." } else { "May be drafted through memory store; proposal is not canon." }
            target = [string]$memory.scope
        }
    }

    if (@($routes).Count -eq 0) {
        $routes += [pscustomobject]@{
            route_type = "no_followup"
            human_required = $false
            summary = "No questions, approval items, handoffs, WorkOrders, or memory writes were requested."
            next_action = "Review output summary and close or archive the RoleRun evidence."
            target = "none"
        }
    }

    return [pscustomobject]@{
        ok = $inspect.validation.ok
        command = "route-output"
        output_id = [string]$output.output_id
        role_run_id = [string]$output.role_run_id
        agent_id = [string]$output.agent_id
        status = [string]$output.status
        plain_language_summary = [string]$output.plain_language_summary
        routes = @($routes)
        human_required_count = @($routes | Where-Object { $_.human_required }).Count
        validation = $inspect.validation
        safety = New-SafetyState
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

function Show-Status {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Staff Runtime"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Exists: $($Result.store_exists)"
    Write-Host "RoleRuns: $($Result.role_run_count)"
    Write-Host "Errors: $($Result.error_count)"
    Write-Host "Warnings: $($Result.warning_count)"
    Write-List -Label "Safety" -Items @(
        "RoleRun not written",
        "LLM not called",
        "Tool not called",
        "Memory not written",
        "WorkOrder not written",
        "Task/approval/runner/source/git unchanged"
    )
}

function Show-Validate {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Staff Runtime Validation"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "RoleRuns: $($Result.role_run_count)"
    Write-Host "Errors: $($Result.error_count)"
    Write-Host "Warnings: $($Result.warning_count)"
    if (@($Result.validations).Count -eq 0) {
        Write-Host ""
        Write-Host "No RoleRun JSON files found."
        return
    }
    foreach ($validation in @($Result.validations)) {
        $state = "PASS"
        if (-not $validation.ok) { $state = "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($validation.role_run_id) $($validation.agent_id)/$($validation.status)"
        foreach ($err in @($validation.errors)) { Write-Host "  - error: $err" }
        foreach ($warn in @($validation.warnings)) { Write-Host "  - warning: $warn" }
    }
}

function Show-List {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio RoleRun List"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Count: $($Result.count)"
    foreach ($item in @($Result.items)) {
        Write-Host ""
        Write-Host "$($item.role_run_id) [$($item.agent_id)/$($item.status)]"
        Write-Host "- context: $($item.context_packet_ref)"
        Write-Host "- provider/model: $($item.model_provider) / $($item.model_name)"
        Write-Host "- reasoning: $($item.reasoning_level)"
    }
}

function Show-Read {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        return
    }
    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio RoleRun Read"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "RoleRun: $($Result.role_run_id)"
    Write-Host "Agent/status: $($Result.summary.agent_id) / $($Result.summary.status)"
    Write-Host "Context: $($Result.summary.context_packet_ref)"
    Write-Host "Provider/model: $($Result.summary.model_provider) / $($Result.summary.model_name)"
    Write-Host "Reasoning: $($Result.summary.reasoning_level)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function Show-Plan {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Staff RoleRun Plan"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Context: $($Result.context_validation.context_packet_id)"
    Write-Host "Agent: $($Result.context_validation.agent_id)"
    Write-Host "RoleRun: $($Result.role_run.role_run_id)"
    Write-Host "Provider/model: $($Result.role_run.model_provider) / $($Result.role_run.model_name)"
    Write-Host "Reasoning: $($Result.role_run.reasoning_level)"
    Write-Host "Provider policy: $($Result.provider_policy)"
    Write-List -Label "Errors" -Items $Result.errors
    Write-List -Label "Warnings" -Items $Result.warnings
    Write-List -Label "Input refs" -Items $Result.role_run.input_context_refs
    Write-List -Label "Safety" -Items @(
        "RoleRun not written",
        "LLM not called",
        "Tool not called",
        "Memory not written",
        "WorkOrder not written",
        "Task/approval/runner/source/git unchanged"
    )
}

function Show-Create {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Staff RoleRun Create"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "RoleRun: $($Result.role_run_id)"
    if (-not $Result.execute) {
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
    } else {
        Write-Host "Mode: execute"
    }
    Write-Host "Target: $($Result.target_path)"
    Write-List -Label "Errors" -Items $Result.errors
    if ($Result.plan) {
        Write-List -Label "Warnings" -Items $Result.plan.warnings
    }
    Write-List -Label "Safety" -Items @(
        "RoleRun written: $($Result.safety.role_run_written)",
        "LLM not called",
        "Tool not called",
        "Memory not written",
        "WorkOrder not written",
        "Task/approval/runner/source/git unchanged"
    )
}

function Show-InspectOutput {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[WARN] RoleRunOutput has validation issues."
    }
    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio RoleRunOutput Inspect"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Output: $($Result.summary.output_id)"
    Write-Host "RoleRun: $($Result.summary.role_run_id)"
    Write-Host "Agent/status: $($Result.summary.agent_id) / $($Result.summary.status)"
    Write-Host "Summary: $($Result.summary.summary)"
    Write-Host "Counts: proposals=$($Result.summary.proposal_count), objections=$($Result.summary.objection_count), questions=$($Result.summary.question_count), approvals=$($Result.summary.approval_item_count), workorders=$($Result.summary.workorder_recommendation_count), memory=$($Result.summary.memory_write_request_count)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function Show-HandoffOutput {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio RoleRunOutput Handoff"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Output: $($Result.output_id)"
    Write-Host "Agent/status: $($Result.agent_id) / $($Result.status)"
    Write-Host "Summary: $($Result.plain_language_summary)"
    Write-List -Label "Questions" -Items ($Result.questions | ForEach-Object { $_.question })
    Write-List -Label "Approval items" -Items ($Result.approval_items | ForEach-Object { $_.plain_language_summary })
    Write-List -Label "Handoff requests" -Items ($Result.handoff_requests | ForEach-Object { "$($_.target_agent_id): $($_.objective)" })
    Write-List -Label "WorkOrder recommendations" -Items ($Result.workorder_recommendations | ForEach-Object { $_.objective })
    Write-List -Label "Memory write requests" -Items ($Result.memory_write_requests | ForEach-Object { "$($_.status)/$($_.scope): $($_.summary)" })
    Write-List -Label "Next actions" -Items $Result.next_actions
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function Show-RouteOutput {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio RoleRunOutput Router"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Output: $($Result.output_id)"
    Write-Host "Agent/status: $($Result.agent_id) / $($Result.status)"
    Write-Host "Human-required routes: $($Result.human_required_count)"
    Write-Host "Summary: $($Result.plain_language_summary)"
    foreach ($route in @($Result.routes)) {
        Write-Host ""
        Write-Host "[$($route.route_type)] target=$($route.target)"
        Write-Host "- human_required: $($route.human_required)"
        Write-Host "- summary: $($route.summary)"
        Write-Host "- next: $($route.next_action)"
    }
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    Write-List -Label "Safety" -Items @(
        "No LLM call",
        "No tool call",
        "No memory write",
        "No WorkOrder write",
        "No task/approval/runner/source/git change"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_staff_runtime.bat status|validate|list|read <role_run_id>|plan <context_packet_json>|create <context_packet_json> [--execute]|inspect-output <role_run_output_json>|handoff-output <role_run_output_json>|route-output <role_run_output_json> [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storePathOverride = ""
    $cleanArgs = New-Object "System.Collections.Generic.List[string]"

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--store-path") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--store-path requires a path argument."
            }
            $index += 1
            $storePathOverride = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -eq 0) {
        $cleanArgs.Add("status")
    }

    $command = ([string]$cleanArgs[0]).ToLowerInvariant()
    $storePath = Get-StorePath -Root $repo -OverridePath $storePathOverride

    if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
        $result = New-StatusResult -Root $repo -StorePath $storePath
    } elseif ($command -eq "validate" -and $cleanArgs.Count -eq 1) {
        $result = New-ValidateResult -Root $repo -StorePath $storePath
    } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
        $result = New-ListResult -Root $repo -StorePath $storePath
    } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
        $result = New-ReadResult -Root $repo -StorePath $storePath -RoleRunId ([string]$cleanArgs[1])
    } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
        $result = New-PlanResult -Root $repo -ContextPath ([string]$cleanArgs[1])
    } elseif ($command -eq "create" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Root $repo -StorePath $storePath -ContextPath ([string]$cleanArgs[1]) -Execute $execute
    } elseif ($command -eq "inspect-output" -and $cleanArgs.Count -eq 2) {
        $result = New-InspectOutputResult -Root $repo -OutputPath ([string]$cleanArgs[1])
    } elseif ($command -eq "handoff-output" -and $cleanArgs.Count -eq 2) {
        $result = New-HandoffOutputResult -Root $repo -OutputPath ([string]$cleanArgs[1])
    } elseif ($command -eq "route-output" -and $cleanArgs.Count -eq 2) {
        $result = New-RouteOutputResult -Root $repo -OutputPath ([string]$cleanArgs[1])
    } else {
        $result = New-UsageResult
        if ($json) {
            ConvertTo-StudioJson -Value $result
        } else {
            Write-Host "[ERROR] $($result.error)"
        }
        exit 1
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } elseif ($command -eq "status") {
        Show-Status -Result $result
    } elseif ($command -eq "validate") {
        Show-Validate -Result $result
    } elseif ($command -eq "list") {
        Show-List -Result $result
    } elseif ($command -eq "read") {
        Show-Read -Result $result
    } elseif ($command -eq "plan") {
        Show-Plan -Result $result
    } elseif ($command -eq "create") {
        Show-Create -Result $result
    } elseif ($command -eq "inspect-output") {
        Show-InspectOutput -Result $result
    } elseif ($command -eq "handoff-output") {
        Show-HandoffOutput -Result $result
    } elseif ($command -eq "route-output") {
        Show-RouteOutput -Result $result
    }

    if ($result.ok) {
        exit 0
    }
    exit 1
} catch {
    $message = $_.Exception.Message
    if ($json) {
        [pscustomobject]@{
            ok = $false
            error = $message
            safety = New-SafetyState
        } | ConvertTo-StudioJson
    } else {
        Write-Host "[ERROR] $message"
    }
    exit 1
}
