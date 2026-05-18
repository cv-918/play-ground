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

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing file: $Path"
    }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Read-JsonFile {
    param([string]$Path)

    $text = Read-Utf8Text -Path $Path
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

function ConvertTo-RepoRelativePath {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ""
    }
    $full = [System.IO.Path]::GetFullPath($Path)
    $repo = [System.IO.Path]::GetFullPath($Root).TrimEnd("\", "/")
    if ($full.StartsWith($repo, [System.StringComparison]::OrdinalIgnoreCase)) {
        return ($full.Substring($repo.Length).TrimStart("\", "/") -replace "\\", "/")
    }
    return ($full -replace "\\", "/")
}

function Get-HandoffStorePath {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Docs\AIWorkflow\Studio\Handoffs")
    }
    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--handoff-store-path override is only allowed under _Temp for validation safety: $resolved"
    }
    return $resolved
}

function Get-ContextStorePath {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Docs\AIWorkflow\Studio\ContextPackets")
    }
    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--context-store-path override is only allowed under _Temp for validation safety: $resolved"
    }
    return $resolved
}

function Get-EvidenceSearchRoot {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Temp\AIWorkflowStudio\staff_runs")
    }
    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    $docsRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Docs\AIWorkflow\Studio"))
    if (
        $resolved -ne $tempRoot -and
        -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar) -and
        $resolved -ne $docsRoot -and
        -not $resolved.StartsWith($docsRoot + [System.IO.Path]::DirectorySeparatorChar)
    ) {
        throw "--evidence-search-root override is only allowed under _Temp or _Docs\AIWorkflow\Studio: $resolved"
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

function New-StringList {
    return ,(New-Object "System.Collections.Generic.List[string]")
}

function Add-Message {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string]$Message
    )

    if (-not [string]::IsNullOrWhiteSpace($Message) -and -not $List.Contains($Message)) {
        $List.Add($Message)
    }
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
    return [pscustomobject]@{
        path = $path
        staff = $map
    }
}

function Find-RoleRunOutputById {
    param(
        [string]$Root,
        [string]$EvidenceSearchRoot,
        [string]$OutputId
    )

    $candidateFiles = @()
    if (Test-Path -LiteralPath $EvidenceSearchRoot) {
        $candidateFiles += @(Get-ChildItem -LiteralPath $EvidenceSearchRoot -Filter "role_run_output.json" -Recurse -File -ErrorAction SilentlyContinue)
        $candidateFiles += @(Get-ChildItem -LiteralPath $EvidenceSearchRoot -Filter "*.json" -File -ErrorAction SilentlyContinue)
    }
    $examples = Join-Path $Root "_Docs\AIWorkflow\Studio\Examples"
    if (Test-Path -LiteralPath $examples) {
        $candidateFiles += @(Get-ChildItem -LiteralPath $examples -Filter "*.json" -File -ErrorAction SilentlyContinue)
    }

    $seen = @{}
    $matches = @()
    foreach ($file in $candidateFiles) {
        if ($seen.ContainsKey($file.FullName)) {
            continue
        }
        $seen[$file.FullName] = $true
        try {
            $json = Read-JsonFile -Path $file.FullName
            if ([string]$json.output_id -eq $OutputId) {
                $matches += [pscustomobject]@{
                    json = $json
                    path = $file.FullName
                    last_write_time = $file.LastWriteTimeUtc
                }
            }
        } catch {
        }
    }
    $latest = @($matches | Sort-Object last_write_time -Descending | Select-Object -First 1)
    if (@($latest).Count -gt 0) {
        return $latest[0].json
    }
    return $null
}

function Get-EvidenceSummaries {
    param(
        [string]$Root,
        [string]$EvidenceSearchRoot,
        [object]$Handoff
    )

    $items = New-StringList
    foreach ($ref in Get-StringArray -Value $Handoff.evidence_refs) {
        $evidence = $null
        if (Test-Path -LiteralPath $ref) {
            try { $evidence = Read-JsonFile -Path (Resolve-Path -LiteralPath $ref).Path } catch {}
        } elseif ($ref -match "^RRO-") {
            $evidence = Find-RoleRunOutputById -Root $Root -EvidenceSearchRoot $EvidenceSearchRoot -OutputId $ref
        }
        if ($null -eq $evidence) {
            continue
        }
        Add-Message -List $items -Message ("Evidence " + [string]$evidence.output_id + " summary: " + (Limit-Text -Text ([string]$evidence.plain_language_summary) -Max 260))
        foreach ($proposal in @($evidence.proposals | Select-Object -First 3)) {
            Add-Message -List $items -Message ("Evidence proposal: " + (Limit-Text -Text ([string]$proposal.title) -Max 80) + " - " + (Limit-Text -Text ([string]$proposal.summary) -Max 220))
        }
        foreach ($question in @($evidence.questions | Select-Object -First 3)) {
            $questionText = if (Test-HasProperty -Value $question -Name "question") { [string]$question.question } else { [string]$question }
            if (-not [string]::IsNullOrWhiteSpace($questionText)) {
                Add-Message -List $items -Message ("Evidence question: " + (Limit-Text -Text $questionText -Max 180))
            }
        }
    }
    return $items.ToArray()
}

function Get-HandoffFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }
    return @(Get-ChildItem -LiteralPath $StorePath -Filter "HAND-*.json" -File | Sort-Object Name)
}

function Resolve-HandoffPath {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$InputValue
    )

    if ([string]::IsNullOrWhiteSpace($InputValue)) {
        throw "Handoff id or path is required."
    }
    if (Test-Path -LiteralPath $InputValue) {
        return (Resolve-Path -LiteralPath $InputValue).Path
    }
    $candidate = if ([System.IO.Path]::IsPathRooted($InputValue)) {
        $InputValue
    } else {
        Join-Path $Root $InputValue
    }
    if (Test-Path -LiteralPath $candidate) {
        return (Resolve-Path -LiteralPath $candidate).Path
    }
    $stored = Join-Path $StorePath ($InputValue + ".json")
    if (Test-Path -LiteralPath $stored) {
        return (Resolve-Path -LiteralPath $stored).Path
    }
    throw "Handoff not found as file path or stored handoff_id: $InputValue"
}

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
}

function Test-RequiredFields {
    param(
        [object]$Value,
        [string[]]$Required
    )

    $errors = New-StringList
    foreach ($field in $Required) {
        if (-not (Test-HasProperty -Value $Value -Name $field)) {
            Add-Message -List $errors -Message "Missing required field: $field"
        }
    }
    return $errors.ToArray()
}

function Test-Handoff {
    param(
        [object]$Handoff,
        [string]$Path,
        [hashtable]$StaffMap
    )

    $errors = New-StringList
    $warnings = New-StringList
    foreach ($error in (Test-RequiredFields -Value $Handoff -Required @(
        "handoff_id",
        "from_agent_id",
        "to_agent_id",
        "reason",
        "input_contract",
        "expected_output",
        "constraints",
        "evidence_refs",
        "status"
    ))) {
        Add-Message -List $errors -Message $error
    }

    if ([string]$Handoff.handoff_id -notmatch "^HAND-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "handoff_id must match HAND-YYYYMMDD-HHMMSS-slug."
    }
    $fromId = [string]$Handoff.from_agent_id
    $toId = [string]$Handoff.to_agent_id
    if (-not $StaffMap.ContainsKey($fromId)) {
        Add-Message -List $errors -Message "from_agent_id is not a concrete StaffAgent: $fromId"
    }
    if (-not $StaffMap.ContainsKey($toId)) {
        Add-Message -List $errors -Message "to_agent_id is not a concrete StaffAgent: $toId"
    }
    if ($StaffMap.ContainsKey($fromId)) {
        $allowed = @(Get-StringArray -Value $StaffMap[$fromId].handoff_behavior.can_handoff_to)
        if ($allowed -notcontains $toId) {
            Add-Message -List $errors -Message "StaffAgent '$fromId' is not allowed to hand off to '$toId'."
        }
    }
    if (@("proposed", "accepted", "completed", "rejected") -notcontains ([string]$Handoff.status)) {
        Add-Message -List $errors -Message "Invalid handoff status: $($Handoff.status)"
    }
    if (@(Get-StringArray -Value $Handoff.input_contract).Count -eq 0) {
        Add-Message -List $warnings -Message "input_contract is empty; context packet will use handoff reason as minimal scope."
    }
    if (@(Get-StringArray -Value $Handoff.expected_output).Count -eq 0) {
        Add-Message -List $warnings -Message "expected_output is empty; context packet will fall back to target StaffAgent required outputs."
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        handoff_id = [string]$Handoff.handoff_id
        from_agent_id = $fromId
        to_agent_id = $toId
        status = [string]$Handoff.status
        path = $Path
        errors = $errors.ToArray()
        warnings = $warnings.ToArray()
    }
}

function New-ContextIds {
    param([string]$AgentId)

    $stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
    $slug = $AgentId.Replace("_", "-")
    return [pscustomobject]@{
        context_packet_id = "SCP-$stamp-$slug"
        role_run_id = "RR-$stamp-$slug"
    }
}

function New-MemoryContext {
    param([object]$Handoff)

    return [pscustomobject]@{
        canon_refs = @()
        approved_decision_refs = @()
        proposal_refs = @()
        rejected_refs = @()
        lesson_refs = @()
        evidence_refs = @(Get-StringArray -Value $Handoff.evidence_refs)
    }
}

function New-ContextPacketFromHandoff {
    param(
        [object]$Handoff,
        [object]$TargetStaff,
        [string]$ProjectId,
        [string[]]$EvidenceSummaries
    )

    $ids = New-ContextIds -AgentId ([string]$TargetStaff.agent_id)
    $input = @(Get-StringArray -Value $Handoff.input_contract)
    if (@($input).Count -eq 0) {
        $input = @([string]$Handoff.reason)
    }
    foreach ($summary in @($EvidenceSummaries)) {
        if (-not [string]::IsNullOrWhiteSpace($summary)) {
            $input += $summary
        }
    }
    $expected = @(Get-StringArray -Value $Handoff.expected_output)
    if (@($expected).Count -eq 0) {
        $expected = @(Get-StringArray -Value $TargetStaff.output_contracts.required_outputs)
    }
    $constraints = @(Get-StringArray -Value $Handoff.constraints)
    $stop = New-StringList
    Add-Message -List $stop -Message "Stop if the requested answer exceeds this handoff objective."
    Add-Message -List $stop -Message "Stop if required context from the handoff is missing or ambiguous."
    Add-Message -List $stop -Message "Stop if canon, source write, task creation, approval, commit, push, or external-tool permission is needed."
    foreach ($item in $constraints) {
        Add-Message -List $stop -Message ("Handoff constraint: " + $item)
    }
    foreach ($item in Get-StringArray -Value $TargetStaff.meeting_behavior.must_defer_when) {
        Add-Message -List $stop -Message ("Defer when: " + $item)
    }

    return [pscustomobject]@{
        context_packet_id = $ids.context_packet_id
        role_run_id = $ids.role_run_id
        agent_id = [string]$TargetStaff.agent_id
        department_id = [string]$TargetStaff.department_id
        source_type = "handoff"
        source_ref = [string]$Handoff.handoff_id
        objective = [string]$Handoff.reason
        current_project_profile = $ProjectId
        director_intent = "Continue this staff handoff within the provided context. Ask or block instead of inventing missing canon, evidence, or authority."
        approved_scope = @($input)
        non_goals = @("Do not execute implementation work from this handoff.", "Do not write canon, tasks, approvals, commits, or pushes.", "Do not exceed the target agent role charter.")
        memory_context = (New-MemoryContext -Handoff $Handoff)
        relevant_decision_refs = @()
        relevant_evidence_refs = @(Get-StringArray -Value $Handoff.evidence_refs)
        allowed_tools = @(Get-StringArray -Value $TargetStaff.tool_policy.allowed_tools)
        blocked_tools = @(Get-StringArray -Value $TargetStaff.tool_policy.blocked_tools)
        approval_required_tools = @(Get-StringArray -Value $TargetStaff.tool_policy.approval_required_tools)
        required_outputs = @($expected)
        quality_criteria = @(Get-StringArray -Value $TargetStaff.quality_criteria.pass_conditions)
        stop_conditions = $stop.ToArray()
        safety = [pscustomobject]@{
            source_write_allowed = $false
            canon_write_allowed = $false
            task_creation_allowed = $false
            approval_allowed = $false
            commit_allowed = $false
            external_tool_allowed = $false
        }
    }
}

function Test-ContextPacket {
    param([object]$Packet)

    $errors = New-StringList
    foreach ($error in (Test-RequiredFields -Value $Packet -Required @(
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
    ))) {
        Add-Message -List $errors -Message $error
    }
    if ([string]$Packet.context_packet_id -notmatch "^SCP-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "Invalid context_packet_id."
    }
    if ([string]$Packet.role_run_id -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "Invalid role_run_id."
    }
    if ([string]$Packet.source_type -ne "handoff") {
        Add-Message -List $errors -Message "Handoff router must produce source_type=handoff."
    }
    if (@(Get-StringArray -Value $Packet.approved_scope).Count -eq 0) {
        Add-Message -List $errors -Message "approved_scope must contain at least one item."
    }
    if (@(Get-StringArray -Value $Packet.required_outputs).Count -eq 0) {
        Add-Message -List $errors -Message "required_outputs must contain at least one item."
    }
    if ($null -eq $Packet.safety -or [bool]$Packet.safety.source_write_allowed -or [bool]$Packet.safety.canon_write_allowed -or [bool]$Packet.safety.task_creation_allowed -or [bool]$Packet.safety.approval_allowed -or [bool]$Packet.safety.commit_allowed -or [bool]$Packet.safety.external_tool_allowed) {
        Add-Message -List $errors -Message "Handoff context packets must keep source/canon/task/approval/commit/external-tool permissions false."
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        context_packet_id = [string]$Packet.context_packet_id
        role_run_id = [string]$Packet.role_run_id
        agent_id = [string]$Packet.agent_id
        source_ref = [string]$Packet.source_ref
        errors = $errors.ToArray()
    }
}

function New-SafetyState {
    param([bool]$ContextWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $ContextWritten)
        context_packet_written = $ContextWritten
        staff_executed = $false
        llm_called = $false
        tool_called = $false
        memory_written = $false
        workorder_written = $false
        task_state_changed = $false
        approval_changed = $false
        source_changed = $false
        git_changed = $false
    }
}

function New-StatusResult {
    param([string]$StorePath)

    $files = @(Get-HandoffFiles -StorePath $StorePath)
    return [pscustomobject]@{
        ok = $true
        command = "status"
        store_path = $StorePath
        handoff_count = @($files).Count
        safety = New-SafetyState
    }
}

function New-ListResult {
    param([string]$StorePath)

    $records = @()
    foreach ($file in (Get-HandoffFiles -StorePath $StorePath)) {
        try {
            $handoff = Read-JsonFile -Path $file.FullName
            $records += [pscustomobject]@{
                handoff_id = [string]$handoff.handoff_id
                from_agent_id = [string]$handoff.from_agent_id
                to_agent_id = [string]$handoff.to_agent_id
                status = [string]$handoff.status
                reason = [string]$handoff.reason
                path = $file.FullName
            }
        } catch {
            $records += [pscustomobject]@{
                handoff_id = ""
                from_agent_id = ""
                to_agent_id = ""
                status = "invalid"
                reason = $_.Exception.Message
                path = $file.FullName
            }
        }
    }
    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_path = $StorePath
        handoffs = @($records)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$HandoffInput
    )

    $registry = Read-StaffRegistry -Root $Root
    $path = Resolve-HandoffPath -Root $Root -StorePath $StorePath -InputValue $HandoffInput
    $handoff = Read-JsonFile -Path $path
    $validation = Test-Handoff -Handoff $handoff -Path $path -StaffMap $registry.staff
    return [pscustomobject]@{
        ok = $validation.ok
        command = "read"
        handoff_path = $path
        handoff = $handoff
        validation = $validation
        safety = New-SafetyState
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$HandoffInput,
        [string]$ProjectId,
        [string]$EvidenceSearchRoot
    )

    $read = New-ReadResult -Root $Root -StorePath $StorePath -HandoffInput $HandoffInput
    if (-not $read.validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "plan"
            handoff_path = $read.handoff_path
            handoff_id = [string]$read.handoff.handoff_id
            validation = $read.validation
            context_packet = $null
            context_validation = $null
            safety = New-SafetyState
        }
    }
    $target = (Read-StaffRegistry -Root $Root).staff[[string]$read.handoff.to_agent_id]
    $evidenceSummaries = @(Get-EvidenceSummaries -Root $Root -EvidenceSearchRoot $EvidenceSearchRoot -Handoff $read.handoff)
    $packet = New-ContextPacketFromHandoff -Handoff $read.handoff -TargetStaff $target -ProjectId $ProjectId -EvidenceSummaries $evidenceSummaries
    $contextValidation = Test-ContextPacket -Packet $packet
    return [pscustomobject]@{
        ok = $contextValidation.ok
        command = "plan"
        handoff_path = $read.handoff_path
        handoff_id = [string]$read.handoff.handoff_id
        from_agent_id = [string]$read.handoff.from_agent_id
        to_agent_id = [string]$read.handoff.to_agent_id
        project_id = $ProjectId
        evidence_search_root = $EvidenceSearchRoot
        evidence_summary_count = @($evidenceSummaries).Count
        validation = $read.validation
        context_packet = $packet
        context_validation = $contextValidation
        next_action = "Review this StaffContextPacket, then run studio_staff_executor only if the Human Director accepts the handoff scope."
        safety = New-SafetyState
    }
}

function New-CreateContextResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$ContextStorePath,
        [string]$HandoffInput,
        [string]$ProjectId,
        [string]$EvidenceSearchRoot,
        [bool]$Execute
    )

    $plan = New-PlanResult -Root $Root -StorePath $StorePath -HandoffInput $HandoffInput -ProjectId $ProjectId -EvidenceSearchRoot $EvidenceSearchRoot
    if (-not $plan.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "create-context"
            execute = $Execute
            plan = $plan
            safety = New-SafetyState
        }
    }
    $contextPath = Join-Path $ContextStorePath ($plan.context_packet.context_packet_id + ".json")
    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "create-context"
            execute = $false
            execute_required = $true
            planned_context_path = $contextPath
            plan = $plan
            safety = New-SafetyState
        }
    }
    Write-Utf8Text -Path $contextPath -Text (($plan.context_packet | ConvertTo-Json -Depth 64) + [Environment]::NewLine)
    return [pscustomobject]@{
        ok = $true
        command = "create-context"
        execute = $true
        handoff_id = $plan.handoff_id
        context_packet_id = [string]$plan.context_packet.context_packet_id
        role_run_id = [string]$plan.context_packet.role_run_id
        agent_id = [string]$plan.context_packet.agent_id
        context_path = $contextPath
        plan = $plan
        safety = New-SafetyState -ContextWritten $true
    }
}

function New-ValidateResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $registry = Read-StaffRegistry -Root $Root
    $validations = @()
    foreach ($file in (Get-HandoffFiles -StorePath $StorePath)) {
        try {
            $handoff = Read-JsonFile -Path $file.FullName
            $validations += (Test-Handoff -Handoff $handoff -Path $file.FullName -StaffMap $registry.staff)
        } catch {
            $validations += [pscustomobject]@{
                ok = $false
                handoff_id = ""
                from_agent_id = ""
                to_agent_id = ""
                status = ""
                path = $file.FullName
                errors = @($_.Exception.Message)
                warnings = @()
            }
        }
    }
    $errorCount = 0
    $warningCount = 0
    foreach ($validation in @($validations)) {
        if (-not $validation.ok) { $errorCount += @($validation.errors).Count }
        $warningCount += @($validation.warnings).Count
    }
    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        store_path = $StorePath
        handoff_count = @($validations).Count
        error_count = $errorCount
        warning_count = $warningCount
        validations = @($validations)
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

function Show-Result {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Handoff Router"
    Write-Host "============================================================"
    Write-Host "Command: $($Result.command)"
    if ($Result.handoff_id) { Write-Host "Handoff: $($Result.handoff_id)" }
    if ($Result.to_agent_id) { Write-Host "Target: $($Result.to_agent_id)" }
    if ($Result.context_packet_id) { Write-Host "ContextPacket: $($Result.context_packet_id)" }
    if ($Result.context_path) { Write-Host "Context path: $($Result.context_path)" }
    Write-List -Label "Safety" -Items @(
        "does not execute target staff",
        "does not write canon, task state, approvals, source files, commits, or pushes"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_handoff_router.bat status|validate|list|read <handoff_id_or_json>|plan <handoff_id_or_json>|create-context <handoff_id_or_json> [--execute] [--handoff-store-path _Temp\\...] [--context-store-path _Temp\\...] [--evidence-search-root _Temp\\...] [--project-id playground] [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $projectId = "playground"
    $handoffStoreOverride = ""
    $contextStoreOverride = ""
    $evidenceSearchOverride = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--project-id") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--project-id requires a value." }
            $index += 1
            $projectId = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--handoff-store-path") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--handoff-store-path requires a path." }
            $index += 1
            $handoffStoreOverride = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--context-store-path") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--context-store-path requires a path." }
            $index += 1
            $contextStoreOverride = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--evidence-search-root") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--evidence-search-root requires a path." }
            $index += 1
            $evidenceSearchOverride = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add($arg)
        }
    }

    $handoffStorePath = Get-HandoffStorePath -Root $repo -OverridePath $handoffStoreOverride
    $contextStorePath = Get-ContextStorePath -Root $repo -OverridePath $contextStoreOverride
    $evidenceSearchRoot = Get-EvidenceSearchRoot -Root $repo -OverridePath $evidenceSearchOverride

    if ($cleanArgs.Count -lt 1) {
        $result = New-UsageResult
    } else {
        $command = ([string]$cleanArgs[0]).ToLowerInvariant()
        if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
            $result = New-StatusResult -StorePath $handoffStorePath
        } elseif ($command -eq "validate" -and $cleanArgs.Count -eq 1) {
            $result = New-ValidateResult -Root $repo -StorePath $handoffStorePath
        } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
            $result = New-ListResult -StorePath $handoffStorePath
        } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
            $result = New-ReadResult -Root $repo -StorePath $handoffStorePath -HandoffInput ([string]$cleanArgs[1])
        } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
            $result = New-PlanResult -Root $repo -StorePath $handoffStorePath -HandoffInput ([string]$cleanArgs[1]) -ProjectId $projectId -EvidenceSearchRoot $evidenceSearchRoot
        } elseif ($command -eq "create-context" -and $cleanArgs.Count -eq 2) {
            $result = New-CreateContextResult -Root $repo -StorePath $handoffStorePath -ContextStorePath $contextStorePath -HandoffInput ([string]$cleanArgs[1]) -ProjectId $projectId -EvidenceSearchRoot $evidenceSearchRoot -Execute $execute
        } else {
            $result = New-UsageResult
        }
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } else {
        if ($result.ok -and $result.command) { Show-Result -Result $result } else { Write-Host "[ERROR] $($result.error)" }
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
