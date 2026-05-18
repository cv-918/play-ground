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
    param([bool]$ContextWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $ContextWritten)
        context_packet_written = $ContextWritten
        role_run_created = $false
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

function Get-StorePath {
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
        throw "--store-path override is only allowed under _Temp for validation safety: $resolved"
    }
    return $resolved
}

function Get-ContextFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }
    return @(Get-ChildItem -LiteralPath $StorePath -Filter "SCP-*.json" -File | Sort-Object Name)
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }
    return @($Value | ForEach-Object { [string]$_ })
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
    return [pscustomobject]@{
        path = $path
        staff = $map
    }
}

function Test-QueryMatch {
    param(
        [object]$Record,
        [string]$Query
    )

    if ([string]::IsNullOrWhiteSpace($Query)) {
        return $true
    }
    $haystack = @(
        [string]$Record.memory_id
        [string]$Record.project_id
        [string]$Record.scope
        [string]$Record.type
        [string]$Record.status
        [string]$Record.owner_agent_id
        [string]$Record.content
        ((Get-StringArray -Value $Record.source_refs) -join " ")
    ) -join " "
    return ($haystack.IndexOf($Query, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)
}

function Get-MemoryContext {
    param(
        [string]$Root,
        [string]$Query
    )

    $memoryPath = Join-Path $Root "_Docs\AIWorkflow\Studio\MemoryRecords"
    $canon = New-StringList
    $decisions = New-StringList
    $proposals = New-StringList
    $rejected = New-StringList
    $lessons = New-StringList
    $evidence = New-StringList

    if (Test-Path -LiteralPath $memoryPath) {
        foreach ($file in (Get-ChildItem -LiteralPath $memoryPath -Filter "MEM-*.json" -File)) {
            try {
                $memory = Read-JsonFile -Path $file.FullName
                if (-not (Test-QueryMatch -Record $memory -Query $Query)) {
                    continue
                }
                $id = [string]$memory.memory_id
                $status = [string]$memory.status
                $type = [string]$memory.type
                if ($status -eq "canon" -or $type -eq "canon") { Add-Message -List $canon -Message $id }
                if ($status -eq "approved" -or $type -eq "decision") {
                    foreach ($ref in Get-StringArray -Value $memory.source_refs) {
                        if ($ref -match "^DEC-") { Add-Message -List $decisions -Message $ref }
                    }
                    Add-Message -List $decisions -Message $id
                }
                if ($status -eq "proposed" -or $type -eq "proposal") { Add-Message -List $proposals -Message $id }
                if ($status -eq "rejected" -or $type -eq "rejection") { Add-Message -List $rejected -Message $id }
                if ($status -eq "lesson" -or $type -eq "lesson") { Add-Message -List $lessons -Message $id }
                if ($status -eq "evidence" -or $type -eq "evidence") { Add-Message -List $evidence -Message $id }
            } catch {
            }
        }
    }

    return [pscustomobject]@{
        canon_refs = $canon.ToArray()
        approved_decision_refs = $decisions.ToArray()
        proposal_refs = $proposals.ToArray()
        rejected_refs = $rejected.ToArray()
        lesson_refs = $lessons.ToArray()
        evidence_refs = $evidence.ToArray()
    }
}

function New-ContextIds {
    param([string]$AgentId)

    $now = Get-Date
    $stamp = $now.ToString("yyyyMMdd-HHmmss")
    $slug = $AgentId.Replace("_", "-")
    return [pscustomobject]@{
        context_packet_id = "SCP-$stamp-$slug"
        role_run_id = "RR-$stamp-$slug"
    }
}

function New-ContextPacket {
    param(
        [string]$Root,
        [string]$AgentId,
        [object]$WorkOrder,
        [string]$MemoryQuery
    )

    $registry = Read-StaffRegistry -Root $Root
    if (-not $registry.staff.ContainsKey($AgentId)) {
        throw "Unknown concrete StaffAgent: $AgentId"
    }
    $staff = $registry.staff[$AgentId]
    $ids = New-ContextIds -AgentId $AgentId
    $scope = Get-StringArray -Value $WorkOrder.scope
    if (@($scope).Count -eq 0) {
        $scope = @([string]$WorkOrder.objective)
    }
    $nonGoals = Get-StringArray -Value $WorkOrder.non_goals
    $memoryContext = Get-MemoryContext -Root $Root -Query $MemoryQuery
    $evidenceRefs = New-StringList
    foreach ($ref in Get-StringArray -Value $WorkOrder.evidence_requirements) {
        Add-Message -List $evidenceRefs -Message $ref
    }
    foreach ($ref in Get-StringArray -Value $memoryContext.evidence_refs) {
        Add-Message -List $evidenceRefs -Message $ref
    }
    $stop = New-StringList
    Add-Message -List $stop -Message "Stop if the requested answer would exceed the WorkOrder approved scope."
    Add-Message -List $stop -Message "Stop if canon, source write, task creation, approval, commit, or push permission is needed."
    foreach ($item in Get-StringArray -Value $staff.meeting_behavior.must_defer_when) {
        Add-Message -List $stop -Message ("Defer when: " + $item)
    }

    return [pscustomobject]@{
        context_packet_id = $ids.context_packet_id
        role_run_id = $ids.role_run_id
        agent_id = [string]$staff.agent_id
        department_id = [string]$staff.department_id
        source_type = "work_order"
        source_ref = [string]$WorkOrder.work_order_id
        objective = [string]$WorkOrder.objective
        current_project_profile = [string]$WorkOrder.target_project_profile
        director_intent = "Complete the assigned WorkOrder contribution within approved scope. Ask or block instead of inventing missing canon, evidence, or authority."
        approved_scope = @($scope)
        non_goals = @($nonGoals)
        memory_context = $memoryContext
        relevant_decision_refs = @($memoryContext.approved_decision_refs)
        relevant_evidence_refs = $evidenceRefs.ToArray()
        allowed_tools = @(Get-StringArray -Value $staff.tool_policy.allowed_tools)
        blocked_tools = @(Get-StringArray -Value $staff.tool_policy.blocked_tools)
        approval_required_tools = @(Get-StringArray -Value $staff.tool_policy.approval_required_tools)
        required_outputs = @(Get-StringArray -Value $staff.output_contracts.required_outputs)
        quality_criteria = @(Get-StringArray -Value $staff.quality_criteria.pass_conditions)
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

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
}

function Test-ContextPacket {
    param([object]$Packet)

    $errors = New-StringList
    $required = @(
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
    foreach ($field in $required) {
        if (-not (Test-HasProperty -Value $Packet -Name $field)) {
            Add-Message -List $errors -Message "Missing required field: $field"
        }
    }
    if ([string]$Packet.context_packet_id -notmatch "^SCP-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "Invalid context_packet_id."
    }
    if ([string]$Packet.role_run_id -notmatch "^RR-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "Invalid role_run_id."
    }
    if (@(Get-StringArray -Value $Packet.approved_scope).Count -eq 0) {
        Add-Message -List $errors -Message "approved_scope must contain at least one item."
    }
    if (@(Get-StringArray -Value $Packet.required_outputs).Count -eq 0) {
        Add-Message -List $errors -Message "required_outputs must contain at least one item."
    }
    if (@(Get-StringArray -Value $Packet.quality_criteria).Count -eq 0) {
        Add-Message -List $errors -Message "quality_criteria must contain at least one item."
    }
    if (@(Get-StringArray -Value $Packet.stop_conditions).Count -eq 0) {
        Add-Message -List $errors -Message "stop_conditions must contain at least one item."
    }
    if ($null -eq $Packet.safety -or [bool]$Packet.safety.source_write_allowed -or [bool]$Packet.safety.canon_write_allowed -or [bool]$Packet.safety.task_creation_allowed -or [bool]$Packet.safety.approval_allowed -or [bool]$Packet.safety.commit_allowed) {
        Add-Message -List $errors -Message "Early context packets must keep write/approval/commit safety permissions false."
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        context_packet_id = [string]$Packet.context_packet_id
        role_run_id = [string]$Packet.role_run_id
        agent_id = [string]$Packet.agent_id
        errors = $errors.ToArray()
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$AgentId,
        [string]$WorkOrderPath,
        [string]$MemoryQuery
    )

    $resolvedPath = Resolve-RepoFilePath -Root $Root -Path $WorkOrderPath
    $workOrder = Read-JsonFile -Path $resolvedPath
    $packet = New-ContextPacket -Root $Root -AgentId $AgentId -WorkOrder $workOrder -MemoryQuery $MemoryQuery
    $validation = Test-ContextPacket -Packet $packet
    return [pscustomobject]@{
        ok = $validation.ok
        command = "plan"
        work_order_path = $resolvedPath
        agent_id = $AgentId
        memory_query = $MemoryQuery
        context_packet = $packet
        validation = $validation
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$AgentId,
        [string]$WorkOrderPath,
        [string]$MemoryQuery,
        [bool]$Execute
    )

    $plan = New-PlanResult -Root $Root -AgentId $AgentId -WorkOrderPath $WorkOrderPath -MemoryQuery $MemoryQuery
    $target = Join-Path $StorePath ([string]$plan.context_packet.context_packet_id + ".json")
    if (-not $plan.validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "create"
            execute = $Execute
            target_path = $target
            context_packet = $plan.context_packet
            validation = $plan.validation
            safety = New-SafetyState
        }
    }
    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "create"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create <agent_id> <work_order_json_path> --execute to store the context packet."
            target_path = $target
            context_packet = $plan.context_packet
            validation = $plan.validation
            safety = New-SafetyState
        }
    }
    if (Test-Path -LiteralPath $target) {
        throw "Context packet already exists in store: $target"
    }
    if (-not (Test-Path -LiteralPath $StorePath)) {
        New-Item -ItemType Directory -Path $StorePath -Force | Out-Null
    }
    $json = ($plan.context_packet | ConvertTo-Json -Depth 64) + [Environment]::NewLine
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($target, $json, $encoding)
    return [pscustomobject]@{
        ok = $true
        command = "create"
        execute = $true
        target_path = $target
        context_packet = $plan.context_packet
        validation = $plan.validation
        safety = New-SafetyState -ContextWritten $true
    }
}

function New-StatusResult {
    param([string]$StorePath)

    return [pscustomobject]@{
        ok = $true
        command = "status"
        store_path = $StorePath
        context_packet_count = @(Get-ContextFiles -StorePath $StorePath).Count
        safety = New-SafetyState
    }
}

function New-ListResult {
    param([string]$StorePath)

    $items = @()
    foreach ($file in (Get-ContextFiles -StorePath $StorePath)) {
        try {
            $packet = Read-JsonFile -Path $file.FullName
            $items += [pscustomobject]@{
                context_packet_id = [string]$packet.context_packet_id
                role_run_id = [string]$packet.role_run_id
                agent_id = [string]$packet.agent_id
                source_ref = [string]$packet.source_ref
                objective = Limit-Text -Text ([string]$packet.objective) -Max 140
                file = $file.Name
            }
        } catch {
            $items += [pscustomobject]@{ context_packet_id = "(parse failed)"; role_run_id = ""; agent_id = ""; source_ref = ""; objective = $_.Exception.Message; file = $file.Name }
        }
    }
    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_path = $StorePath
        packets = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$StorePath,
        [string]$ContextPacketId
    )

    $target = Join-Path $StorePath ($ContextPacketId + ".json")
    if (-not (Test-Path -LiteralPath $target)) {
        return [pscustomobject]@{
            ok = $false
            command = "read"
            error = "Context packet not found: $ContextPacketId"
            safety = New-SafetyState
        }
    }
    $packet = Read-JsonFile -Path $target
    $validation = Test-ContextPacket -Packet $packet
    return [pscustomobject]@{
        ok = $validation.ok
        command = "read"
        path = $target
        context_packet = $packet
        validation = $validation
        safety = New-SafetyState
    }
}

function New-ValidateResult {
    param([string]$StorePath)

    $validations = @()
    $errorCount = 0
    foreach ($file in (Get-ContextFiles -StorePath $StorePath)) {
        try {
            $validation = Test-ContextPacket -Packet (Read-JsonFile -Path $file.FullName)
            $validations += [pscustomobject]@{ file = $file.Name; validation = $validation }
            $errorCount += @($validation.errors).Count
        } catch {
            $errorCount += 1
            $validations += [pscustomobject]@{ file = $file.Name; validation = [pscustomobject]@{ ok = $false; errors = @($_.Exception.Message) } }
        }
    }
    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        store_path = $StorePath
        context_packet_count = @($validations).Count
        error_count = $errorCount
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

function Show-Plan {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Context Builder"
    Write-Host "============================================================"
    Write-Host "Context: $($Result.context_packet.context_packet_id)"
    Write-Host "RoleRun: $($Result.context_packet.role_run_id)"
    Write-Host "Agent: $($Result.context_packet.agent_id)"
    Write-Host "Source: $($Result.context_packet.source_type) $($Result.context_packet.source_ref)"
    Write-Host "Objective: $(Limit-Text -Text ([string]$Result.context_packet.objective) -Max 220)"
    Write-List -Label "Approved scope" -Items $Result.context_packet.approved_scope
    Write-List -Label "Non-goals" -Items $Result.context_packet.non_goals
    Write-List -Label "Allowed tools" -Items $Result.context_packet.allowed_tools
    Write-List -Label "Blocked tools" -Items $Result.context_packet.blocked_tools
    Write-List -Label "Required outputs" -Items $Result.context_packet.required_outputs
    Write-List -Label "Validation errors" -Items $Result.validation.errors
}

function Show-Status {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Context Packet Store"
    Write-Host "============================================================"
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Context packets: $($Result.context_packet_count)"
}

function Show-ListResult {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Context Packets"
    Write-Host "============================================================"
    foreach ($item in @($Result.packets)) {
        Write-Host ""
        Write-Host "$($item.context_packet_id)"
        Write-Host "- role_run: $($item.role_run_id)"
        Write-Host "- agent/source: $($item.agent_id) / $($item.source_ref)"
        Write-Host "- objective: $($item.objective)"
    }
    if (@($Result.packets).Count -eq 0) {
        Write-Host "No context packets found."
    }
}

function Show-Validate {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Context Packet Validation"
    Write-Host "============================================================"
    Write-Host "Errors: $($Result.error_count)"
    foreach ($item in @($Result.validations)) {
        $state = if ($item.validation.ok) { "PASS" } else { "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($item.file)"
        foreach ($err in @($item.validation.errors)) { Write-Host "- error: $err" }
    }
}

function Show-Create {
    param([object]$Result)

    Show-Plan -Result $Result
    if ($Result.execute) {
        Write-Host ""
        Write-Host "Stored: $($Result.target_path)"
    } else {
        Write-Host ""
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
        Write-Host "Target: $($Result.target_path)"
    }
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_context_builder.bat status|validate|list|read <context_packet_id>|plan <agent_id> <work_order_json_path>|create <agent_id> <work_order_json_path> [--execute] [--memory-query text] [--store-path _Temp\\...] [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storePathOverride = ""
    $memoryQuery = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]

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
        } elseif ($arg -ieq "--memory-query") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--memory-query requires text."
            }
            $index += 1
            $memoryQuery = [string]$CommandArgs[$index]
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
        $result = New-StatusResult -StorePath $storePath
    } elseif ($command -eq "validate" -and $cleanArgs.Count -eq 1) {
        $result = New-ValidateResult -StorePath $storePath
    } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
        $result = New-ListResult -StorePath $storePath
    } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
        $result = New-ReadResult -StorePath $storePath -ContextPacketId ([string]$cleanArgs[1])
    } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 3) {
        $result = New-PlanResult -Root $repo -AgentId ([string]$cleanArgs[1]) -WorkOrderPath ([string]$cleanArgs[2]) -MemoryQuery $memoryQuery
    } elseif ($command -eq "create" -and $cleanArgs.Count -eq 3) {
        $result = New-CreateResult -Root $repo -StorePath $storePath -AgentId ([string]$cleanArgs[1]) -WorkOrderPath ([string]$cleanArgs[2]) -MemoryQuery $memoryQuery -Execute $execute
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
        Show-ListResult -Result $result
    } elseif ($command -eq "read" -or $command -eq "plan") {
        Show-Plan -Result $result
    } elseif ($command -eq "create") {
        Show-Create -Result $result
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
