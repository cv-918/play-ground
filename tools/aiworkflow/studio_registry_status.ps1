param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing JSON file: $Path"
    }

    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    return $text | ConvertFrom-Json
}

function ConvertTo-StudioJson {
    param([object]$Value)

    $Value | ConvertTo-Json -Depth 64
}

function New-SafetyState {
    return [pscustomobject]@{
        read_only = $true
        agents_executed = $false
        llm_called = $false
        task_state_changed = $false
        approval_changed = $false
        source_changed = $false
        git_changed = $false
    }
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }

    return @($Value | ForEach-Object { [string]$_ })
}

function Write-Header {
    param([string]$Title)

    Write-Host "============================================================"
    Write-Host $Title
    Write-Host "============================================================"
}

function Write-Items {
    param(
        [string]$Label,
        [object[]]$Items,
        [int]$Limit = 0
    )

    Write-Host ""
    Write-Host "[$Label]"

    $list = @($Items)
    if ($list.Count -eq 0) {
        Write-Host "- None."
        return
    }

    $shown = $list
    if ($Limit -gt 0 -and $list.Count -gt $Limit) {
        $shown = @($list | Select-Object -First $Limit)
    }

    foreach ($item in $shown) {
        Write-Host "- $item"
    }

    if ($Limit -gt 0 -and $list.Count -gt $Limit) {
        Write-Host "- +$($list.Count - $Limit) more"
    }
}

function Get-StudioPaths {
    param([string]$Root)

    $studioRoot = Join-Path $Root "_Docs\AIWorkflow\Studio"
    return [pscustomobject]@{
        studio_root = $studioRoot
        schema_root = Join-Path $studioRoot "Schemas"
        example_root = Join-Path $studioRoot "Examples"
        departments = Join-Path $studioRoot "Registries\departments.initial.json"
        staff = Join-Path $studioRoot "Registries\staff_agents.initial.json"
    }
}

function Get-StudioRegistry {
    param([string]$Root)

    $paths = Get-StudioPaths -Root $Root
    $departmentsData = Read-JsonFile -Path $paths.departments
    $staffData = Read-JsonFile -Path $paths.staff

    $schemas = @()
    if (Test-Path -LiteralPath $paths.schema_root) {
        $schemas = @(Get-ChildItem -LiteralPath $paths.schema_root -Filter "*.schema.json" | Sort-Object Name)
    }

    $examples = @()
    if (Test-Path -LiteralPath $paths.example_root) {
        $examples = @(Get-ChildItem -LiteralPath $paths.example_root -Filter "*.example.json" | Sort-Object Name)
    }

    return [pscustomobject]@{
        paths = $paths
        departments_data = $departmentsData
        staff_data = $staffData
        departments = @($departmentsData.departments)
        staff_agents = @($staffData.staff_agents)
        planned_staff_agents = Get-StringArray -Value $staffData.planned_staff_agents
        schemas = @($schemas)
        examples = @($examples)
    }
}

function Get-MapById {
    param(
        [object[]]$Items,
        [string]$IdProperty
    )

    $map = @{}
    foreach ($item in @($Items)) {
        $id = [string]$item.$IdProperty
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $map[$id] = $item
        }
    }
    return $map
}

function Test-StudioRegistry {
    param([object]$Registry)

    $errors = New-Object System.Collections.Generic.List[string]
    $warnings = New-Object System.Collections.Generic.List[string]

    $expectedSchemas = @(
        "StaffAgent.schema.json",
        "Department.schema.json",
        "WorkOrder.schema.json",
        "WorkOrderTaskBinding.schema.json",
        "StaffContextPacket.schema.json",
        "RoleRunOutput.schema.json",
        "MeetingSession.schema.json",
        "MemoryRecord.schema.json",
        "Proposal.schema.json",
        "Decision.schema.json",
        "Handoff.schema.json",
        "RoleRun.schema.json",
        "ToolRun.schema.json"
    )

    if ([string]::IsNullOrWhiteSpace([string]$Registry.departments_data.schema_version)) {
        $errors.Add("departments.initial.json is missing schema_version.")
    }

    if ([string]::IsNullOrWhiteSpace([string]$Registry.staff_data.schema_version)) {
        $errors.Add("staff_agents.initial.json is missing schema_version.")
    }

    $schemaNames = @($Registry.schemas | ForEach-Object { $_.Name })
    foreach ($schemaName in $expectedSchemas) {
        if ($schemaNames -notcontains $schemaName) {
            $errors.Add("Missing schema file: $schemaName")
        }
    }

    $expectedExamples = @(
        "scenario_director_context_packet.example.json",
        "scenario_director_role_run_output.example.json",
        "creative_meeting_session.example.json",
        "scenario_pitch_work_order.example.json",
        "scenario_pitch_task_binding.example.json",
        "protagonist_motivation_proposal.example.json",
        "protagonist_motivation_decision.example.json",
        "protagonist_motivation_canon_memory.example.json",
        "protagonist_motivation_rejected_memory.example.json"
    )

    $exampleNames = @($Registry.examples | ForEach-Object { $_.Name })
    foreach ($exampleName in $expectedExamples) {
        if ($exampleNames -notcontains $exampleName) {
            $warnings.Add("Missing recommended example file: $exampleName")
        }
    }

    foreach ($example in @($Registry.examples)) {
        try {
            [void](Read-JsonFile -Path $example.FullName)
        } catch {
            $errors.Add("Example JSON failed to parse: $($example.Name) - $($_.Exception.Message)")
        }
    }

    $departmentIds = New-Object System.Collections.Generic.HashSet[string]
    foreach ($department in @($Registry.departments)) {
        $id = [string]$department.department_id
        if ([string]::IsNullOrWhiteSpace($id)) {
            $errors.Add("A department entry is missing department_id.")
        } elseif (-not $departmentIds.Add($id)) {
            $errors.Add("Duplicate department_id: $id")
        }
    }

    $staffIds = New-Object System.Collections.Generic.HashSet[string]
    foreach ($staff in @($Registry.staff_agents)) {
        $id = [string]$staff.agent_id
        if ([string]::IsNullOrWhiteSpace($id)) {
            $errors.Add("A staff entry is missing agent_id.")
        } elseif (-not $staffIds.Add($id)) {
            $errors.Add("Duplicate agent_id: $id")
        }

        $departmentId = [string]$staff.department_id
        if (-not $departmentIds.Contains($departmentId)) {
            $errors.Add("Staff '$id' references missing department_id '$departmentId'.")
        }
    }

    $allStaffIds = New-Object System.Collections.Generic.HashSet[string]
    foreach ($id in $staffIds) {
        [void]$allStaffIds.Add($id)
    }
    foreach ($id in @($Registry.planned_staff_agents)) {
        if ([string]::IsNullOrWhiteSpace($id)) {
            $warnings.Add("planned_staff_agents contains an empty id.")
        } elseif (-not $allStaffIds.Add($id)) {
            $warnings.Add("planned_staff_agents duplicates an existing concrete staff id: $id")
        }
    }

    foreach ($department in @($Registry.departments)) {
        $departmentId = [string]$department.department_id
        $lead = [string]$department.department_lead
        if (-not $allStaffIds.Contains($lead)) {
            $errors.Add("Department '$departmentId' references missing department_lead '$lead'.")
        }

        foreach ($staffId in Get-StringArray -Value $department.staff_agents) {
            if (-not $allStaffIds.Contains($staffId)) {
                $errors.Add("Department '$departmentId' references missing staff agent '$staffId'.")
            }
        }
    }

    foreach ($staff in @($Registry.staff_agents)) {
        $staffId = [string]$staff.agent_id
        $departmentId = [string]$staff.department_id
        $department = @($Registry.departments | Where-Object { [string]$_.department_id -eq $departmentId } | Select-Object -First 1)
        if ($department.Count -gt 0) {
            $departmentStaff = Get-StringArray -Value $department[0].staff_agents
            if ($departmentStaff -notcontains $staffId) {
                $warnings.Add("Concrete staff '$staffId' is not listed in department '$departmentId'.")
            }
        }

        foreach ($handoffId in Get-StringArray -Value $staff.handoff_behavior.can_handoff_to) {
            if (-not $allStaffIds.Contains($handoffId)) {
                $warnings.Add("Staff '$staffId' can_handoff_to unknown staff id '$handoffId'.")
            }
        }
    }

    $ok = $errors.Count -eq 0
    return [pscustomobject]@{
        ok = $ok
        errors = @($errors)
        warnings = @($warnings)
        counts = [pscustomobject]@{
            departments = @($Registry.departments).Count
            concrete_staff_agents = @($Registry.staff_agents).Count
            planned_staff_agents = @($Registry.planned_staff_agents).Count
            schemas = @($Registry.schemas).Count
            examples = @($Registry.examples).Count
        }
        safety = New-SafetyState
    }
}

function New-StatusResult {
    param(
        [object]$Registry,
        [object]$Validation
    )

    return [pscustomobject]@{
        ok = $Validation.ok
        command = "status"
        model_status = "read_only_foundation"
        departments_schema_version = $Registry.departments_data.schema_version
        staff_schema_version = $Registry.staff_data.schema_version
        counts = $Validation.counts
        validation_errors = @($Validation.errors)
        validation_warnings = @($Validation.warnings)
        registry_paths = $Registry.paths
        safety = New-SafetyState
    }
}

function Show-Status {
    param(
        [object]$Result,
        [object]$Registry
    )

    Write-Header -Title "AIWorkflow Studio Registry Status"
    Write-Host ""
    Write-Host "Status: $($Result.model_status)"
    Write-Host "Validation: $(if ($Result.ok) { "OK" } else { "ERROR" })"
    Write-Host "Departments: $($Result.counts.departments)"
    Write-Host "Staff agents: $($Result.counts.concrete_staff_agents) concrete, $($Result.counts.planned_staff_agents) planned"
    Write-Host "Schemas: $($Result.counts.schemas)"
    Write-Host "Examples: $($Result.counts.examples)"

    if (@($Result.validation_errors).Count -gt 0) {
        Write-Items -Label "Errors" -Items $Result.validation_errors
    }

    if (@($Result.validation_warnings).Count -gt 0) {
        Write-Items -Label "Warnings" -Items $Result.validation_warnings -Limit 8
    }

    Write-Items -Label "Available commands" -Items @(
        "tools\aiworkflow\studio_registry_status.bat validate",
        "tools\aiworkflow\studio_registry_status.bat departments",
        "tools\aiworkflow\studio_registry_status.bat department <department_id>",
        "tools\aiworkflow\studio_registry_status.bat staff",
        "tools\aiworkflow\studio_registry_status.bat staff <agent_id>",
        "Add --json to any command for machine-readable output."
    )

    Write-Items -Label "Safety" -Items @(
        "read-only registry inspection",
        "no agents executed",
        "no LLM calls",
        "no task approval or lifecycle changes",
        "no source, git, commit, or push changes"
    )
}

function New-DepartmentsResult {
    param([object]$Registry)

    $items = @($Registry.departments | ForEach-Object {
        [pscustomobject]@{
            department_id = $_.department_id
            name = $_.name
            mission = $_.mission
            department_lead = $_.department_lead
            staff_agents = Get-StringArray -Value $_.staff_agents
            default_review_gates = Get-StringArray -Value $_.default_review_gates
        }
    })

    return [pscustomobject]@{
        ok = $true
        command = "departments"
        departments = @($items)
        safety = New-SafetyState
    }
}

function Show-Departments {
    param([object]$Result)

    Write-Header -Title "AIWorkflow Studio Departments"
    foreach ($department in @($Result.departments)) {
        Write-Host ""
        Write-Host "[$($department.department_id)] $($department.name)"
        Write-Host "- mission: $($department.mission)"
        Write-Host "- lead: $($department.department_lead)"
        Write-Host "- staff: $((@($department.staff_agents)) -join ", ")"
        Write-Host "- review gates: $((@($department.default_review_gates)) -join ", ")"
    }
}

function New-DepartmentResult {
    param(
        [object]$Registry,
        [string]$DepartmentId
    )

    $department = @($Registry.departments | Where-Object { [string]$_.department_id -eq $DepartmentId } | Select-Object -First 1)
    if ($department.Count -eq 0) {
        return [pscustomobject]@{
            ok = $false
            command = "department"
            error = "Unknown department_id: $DepartmentId"
            available_department_ids = @($Registry.departments | ForEach-Object { [string]$_.department_id })
            safety = New-SafetyState
        }
    }

    return [pscustomobject]@{
        ok = $true
        command = "department"
        department = $department[0]
        safety = New-SafetyState
    }
}

function Show-Department {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        Write-Items -Label "Available departments" -Items $Result.available_department_ids
        return
    }

    $department = $Result.department
    Write-Header -Title "AIWorkflow Studio Department"
    Write-Host ""
    Write-Host "ID: $($department.department_id)"
    Write-Host "Name: $($department.name)"
    Write-Host "Mission: $($department.mission)"
    Write-Host "Lead: $($department.department_lead)"
    Write-Items -Label "Staff agents" -Items (Get-StringArray -Value $department.staff_agents)
    Write-Items -Label "Default meeting roles" -Items (Get-StringArray -Value $department.default_meeting_roles)
    Write-Items -Label "Default review gates" -Items (Get-StringArray -Value $department.default_review_gates)
    Write-Items -Label "Owned artifacts" -Items (Get-StringArray -Value $department.owned_artifacts)
    Write-Items -Label "Escalation rules" -Items (Get-StringArray -Value $department.escalation_rules)
}

function New-StaffListResult {
    param([object]$Registry)

    $departmentMap = Get-MapById -Items $Registry.departments -IdProperty "department_id"
    $items = @($Registry.staff_agents | ForEach-Object {
        $departmentName = ""
        if ($departmentMap.ContainsKey([string]$_.department_id)) {
            $departmentName = [string]$departmentMap[[string]$_.department_id].name
        }

        [pscustomobject]@{
            agent_id = $_.agent_id
            display_name = $_.display_name
            department_id = $_.department_id
            department_name = $departmentName
            role_title = $_.role_title
            seniority = $_.seniority
            mission = $_.role_charter.mission
        }
    })

    return [pscustomobject]@{
        ok = $true
        command = "staff"
        concrete_staff_agents = @($items)
        planned_staff_agents = @($Registry.planned_staff_agents)
        safety = New-SafetyState
    }
}

function Show-StaffList {
    param([object]$Result)

    Write-Header -Title "AIWorkflow Studio Staff Agents"
    foreach ($staff in @($Result.concrete_staff_agents)) {
        Write-Host ""
        Write-Host "[$($staff.agent_id)] $($staff.display_name)"
        Write-Host "- department: $($staff.department_name) ($($staff.department_id))"
        Write-Host "- role: $($staff.role_title), $($staff.seniority)"
        Write-Host "- mission: $($staff.mission)"
    }
    Write-Items -Label "Planned staff agents" -Items $Result.planned_staff_agents -Limit 20
}

function New-StaffDetailResult {
    param(
        [object]$Registry,
        [string]$AgentId
    )

    $staff = @($Registry.staff_agents | Where-Object { [string]$_.agent_id -eq $AgentId } | Select-Object -First 1)
    if ($staff.Count -eq 0) {
        $planned = @($Registry.planned_staff_agents | Where-Object { [string]$_ -eq $AgentId } | Select-Object -First 1)
        return [pscustomobject]@{
            ok = $false
            command = "staff_detail"
            error = "Unknown concrete staff agent: $AgentId"
            planned_match = ($planned.Count -gt 0)
            available_agent_ids = @($Registry.staff_agents | ForEach-Object { [string]$_.agent_id })
            planned_staff_agents = @($Registry.planned_staff_agents)
            safety = New-SafetyState
        }
    }

    $department = @($Registry.departments | Where-Object { [string]$_.department_id -eq [string]$staff[0].department_id } | Select-Object -First 1)

    return [pscustomobject]@{
        ok = $true
        command = "staff_detail"
        staff = $staff[0]
        department = if ($department.Count -gt 0) { $department[0] } else { $null }
        safety = New-SafetyState
    }
}

function Show-StaffDetail {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        if ($Result.planned_match) {
            Write-Host "The id exists in planned_staff_agents but has no concrete StaffAgent definition yet."
        }
        Write-Items -Label "Available concrete staff agents" -Items $Result.available_agent_ids
        return
    }

    $staff = $Result.staff
    $departmentName = if ($null -ne $Result.department) { [string]$Result.department.name } else { "unknown" }

    Write-Header -Title "AIWorkflow Studio Staff Agent"
    Write-Host ""
    Write-Host "ID: $($staff.agent_id)"
    Write-Host "Name: $($staff.display_name)"
    Write-Host "Department: $departmentName ($($staff.department_id))"
    Write-Host "Role: $($staff.role_title), $($staff.seniority)"
    Write-Host "Mission: $($staff.role_charter.mission)"

    Write-Items -Label "Responsibilities" -Items (Get-StringArray -Value $staff.role_charter.responsibilities)
    Write-Items -Label "Authority" -Items (Get-StringArray -Value $staff.role_charter.authority)
    Write-Items -Label "Approval required" -Items (Get-StringArray -Value $staff.role_charter.approval_required_actions)
    Write-Items -Label "Forbidden actions" -Items (Get-StringArray -Value $staff.role_charter.forbidden_actions)
    Write-Items -Label "Allowed tools" -Items (Get-StringArray -Value $staff.tool_policy.allowed_tools)
    Write-Items -Label "Approval-required tools" -Items (Get-StringArray -Value $staff.tool_policy.approval_required_tools)
    Write-Items -Label "Blocked tools" -Items (Get-StringArray -Value $staff.tool_policy.blocked_tools)
    Write-Items -Label "Required outputs" -Items (Get-StringArray -Value $staff.output_contracts.required_outputs)
    Write-Items -Label "Handoff targets" -Items (Get-StringArray -Value $staff.handoff_behavior.can_handoff_to)
    Write-Items -Label "Quality pass conditions" -Items (Get-StringArray -Value $staff.quality_criteria.pass_conditions)
    Write-Items -Label "Failure patterns" -Items (Get-StringArray -Value $staff.quality_criteria.failure_patterns)
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Unknown command or invalid arguments."
        usage = @(
            "tools\aiworkflow\studio_registry_status.bat",
            "tools\aiworkflow\studio_registry_status.bat status [--json]",
            "tools\aiworkflow\studio_registry_status.bat validate [--json]",
            "tools\aiworkflow\studio_registry_status.bat departments [--json]",
            "tools\aiworkflow\studio_registry_status.bat department <department_id> [--json]",
            "tools\aiworkflow\studio_registry_status.bat staff [--json]",
            "tools\aiworkflow\studio_registry_status.bat staff <agent_id> [--json]"
        )
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    foreach ($arg in @($CommandArgs)) {
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    $command = "status"
    if ($cleanArgs.Count -gt 0) {
        $command = ([string]$cleanArgs[0]).ToLowerInvariant()
    }

    $registry = Get-StudioRegistry -Root $repo
    $validation = Test-StudioRegistry -Registry $registry
    $exitCode = 0

    switch ($command) {
        "status" {
            if ($cleanArgs.Count -gt 1) {
                $result = New-UsageResult
                $exitCode = 1
            } else {
                $result = New-StatusResult -Registry $registry -Validation $validation
                if (-not $validation.ok) { $exitCode = 2 }
            }
        }
        "validate" {
            if ($cleanArgs.Count -gt 1) {
                $result = New-UsageResult
                $exitCode = 1
            } else {
                $result = [pscustomobject]@{
                    ok = $validation.ok
                    command = "validate"
                    errors = @($validation.errors)
                    warnings = @($validation.warnings)
                    counts = $validation.counts
                    safety = New-SafetyState
                }
                if (-not $validation.ok) { $exitCode = 2 }
            }
        }
        "departments" {
            if ($cleanArgs.Count -gt 1) {
                $result = New-UsageResult
                $exitCode = 1
            } else {
                $result = New-DepartmentsResult -Registry $registry
            }
        }
        "department" {
            if ($cleanArgs.Count -ne 2) {
                $result = New-UsageResult
                $exitCode = 1
            } else {
                $result = New-DepartmentResult -Registry $registry -DepartmentId ([string]$cleanArgs[1])
                if (-not $result.ok) { $exitCode = 2 }
            }
        }
        "staff" {
            if ($cleanArgs.Count -eq 1) {
                $result = New-StaffListResult -Registry $registry
            } elseif ($cleanArgs.Count -eq 2) {
                $result = New-StaffDetailResult -Registry $registry -AgentId ([string]$cleanArgs[1])
                if (-not $result.ok) { $exitCode = 2 }
            } else {
                $result = New-UsageResult
                $exitCode = 1
            }
        }
        default {
            $result = New-UsageResult
            $exitCode = 1
        }
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
        exit $exitCode
    }

    switch ($command) {
        "status" { if ($result.ok -or $result.command -eq "status") { Show-Status -Result $result -Registry $registry } else { Write-Items -Label "Usage" -Items $result.usage } }
        "validate" {
            Write-Header -Title "AIWorkflow Studio Registry Validation"
            Write-Host ""
            Write-Host "Validation: $(if ($result.ok) { "OK" } else { "ERROR" })"
            Write-Host "Departments: $($result.counts.departments)"
            Write-Host "Staff agents: $($result.counts.concrete_staff_agents) concrete, $($result.counts.planned_staff_agents) planned"
            Write-Host "Schemas: $($result.counts.schemas)"
            Write-Host "Examples: $($result.counts.examples)"
            Write-Items -Label "Errors" -Items $result.errors
            Write-Items -Label "Warnings" -Items $result.warnings
        }
        "departments" { if ($result.ok) { Show-Departments -Result $result } else { Write-Items -Label "Usage" -Items $result.usage } }
        "department" { Show-Department -Result $result }
        "staff" {
            if ($result.command -eq "staff") {
                Show-StaffList -Result $result
            } elseif ($result.command -eq "staff_detail") {
                Show-StaffDetail -Result $result
            } else {
                Write-Items -Label "Usage" -Items $result.usage
            }
        }
        default { Write-Items -Label "Usage" -Items $result.usage }
    }

    exit $exitCode
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
