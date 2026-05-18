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
    param([bool]$RequestWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $RequestWritten)
        tool_run_request_written = $RequestWritten
        adapter_executed = $false
        llm_called = $false
        workorder_changed = $false
        memory_changed = $false
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

function Get-DefaultStorePath {
    param([string]$Root)

    return (Join-Path $Root "_Docs\AIWorkflow\Studio\ToolRuns")
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

function Get-RequestFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $StorePath -Filter "TRQ-*.json" -File | Sort-Object Name)
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

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
}

function Read-ToolAdapterRegistry {
    param([string]$Root)

    $path = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\tool_adapters.initial.json"
    $registry = Read-JsonFile -Path $path
    $map = @{}
    foreach ($adapter in @($registry.tool_adapters)) {
        $id = [string]$adapter.adapter_id
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $map[$id] = $adapter
        }
    }
    return [pscustomobject]@{
        path = $path
        registry = $registry
        adapters = $map
    }
}

function Test-ToolRunRequestShape {
    param([object]$Request)

    $errors = New-StringList
    $required = @(
        "tool_run_request_id",
        "requester_type",
        "requester_ref",
        "tool_adapter_id",
        "requested_action",
        "permission_class",
        "purpose",
        "input_refs",
        "expected_outputs",
        "evidence_requirements",
        "approval_ref",
        "status",
        "created_at"
    )

    foreach ($field in $required) {
        if (-not (Test-HasProperty -Value $Request -Name $field)) {
            Add-Message -List $errors -Message "Missing required field: $field"
        }
    }

    $id = [string]$Request.tool_run_request_id
    if ($id -notmatch "^TRQ-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "tool_run_request_id must match TRQ-YYYYMMDD-HHMMSS-slug."
    }

    if (@("human_director", "staff_agent", "role_run", "work_order", "system") -notcontains ([string]$Request.requester_type)) {
        Add-Message -List $errors -Message "Invalid requester_type: $($Request.requester_type)"
    }
    if (@("read", "write", "execute", "external", "destructive") -notcontains ([string]$Request.permission_class)) {
        Add-Message -List $errors -Message "Invalid permission_class: $($Request.permission_class)"
    }
    if (@("draft", "proposed", "director_review", "approved_for_execution", "blocked", "superseded", "cancelled") -notcontains ([string]$Request.status)) {
        Add-Message -List $errors -Message "Invalid status: $($Request.status)"
    }
    if ([string]::IsNullOrWhiteSpace([string]$Request.requester_ref)) {
        Add-Message -List $errors -Message "requester_ref is required."
    }
    if ([string]::IsNullOrWhiteSpace([string]$Request.tool_adapter_id)) {
        Add-Message -List $errors -Message "tool_adapter_id is required."
    }
    if ([string]::IsNullOrWhiteSpace([string]$Request.requested_action)) {
        Add-Message -List $errors -Message "requested_action is required."
    }
    if ([string]::IsNullOrWhiteSpace([string]$Request.purpose)) {
        Add-Message -List $errors -Message "purpose is required."
    }
    if (@(Get-StringArray -Value $Request.expected_outputs).Count -eq 0) {
        Add-Message -List $errors -Message "expected_outputs must contain at least one item."
    }
    if (@(Get-StringArray -Value $Request.evidence_requirements).Count -eq 0) {
        Add-Message -List $errors -Message "evidence_requirements must contain at least one item."
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        tool_run_request_id = $id
        tool_adapter_id = [string]$Request.tool_adapter_id
        status = [string]$Request.status
        errors = $errors.ToArray()
    }
}

function Normalize-ActionText {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    return ([regex]::Replace($Text.ToLowerInvariant().Trim(), "\s+", " "))
}

function Test-ActionMatch {
    param(
        [object[]]$Items,
        [string]$Action
    )

    $normalizedAction = Normalize-ActionText -Text $Action
    foreach ($item in @($Items)) {
        $normalizedItem = Normalize-ActionText -Text ([string]$item)
        if ([string]::IsNullOrWhiteSpace($normalizedItem)) {
            continue
        }
        if ($normalizedAction -eq $normalizedItem -or $normalizedAction.Contains($normalizedItem) -or $normalizedItem.Contains($normalizedAction)) {
            return $true
        }
    }
    return $false
}

function Merge-EvidenceRequirements {
    param(
        [object]$Request,
        [object]$Adapter
    )

    $items = New-StringList
    foreach ($item in Get-StringArray -Value $Request.evidence_requirements) {
        Add-Message -List $items -Message $item
    }
    if ($null -ne $Adapter) {
        foreach ($item in Get-StringArray -Value $Adapter.output_evidence) {
            Add-Message -List $items -Message $item
        }
    }
    Add-Message -List $items -Message "ToolRunRequest evaluation result"
    return $items.ToArray()
}

function New-ToolRunRequestEvaluation {
    param(
        [object]$Request,
        [object]$Registry
    )

    $blockers = New-StringList
    $humanRequired = New-StringList
    $warnings = New-StringList
    $adapter = $null
    $adapterId = [string]$Request.tool_adapter_id
    $action = [string]$Request.requested_action
    $permission = [string]$Request.permission_class
    $approvalRef = [string]$Request.approval_ref

    if (-not $Registry.adapters.ContainsKey($adapterId)) {
        Add-Message -List $blockers -Message "Unknown tool_adapter_id: $adapterId"
    } else {
        $adapter = $Registry.adapters[$adapterId]
    }

    if ($null -ne $adapter) {
        if ([string]$adapter.status -ne "available") {
            Add-Message -List $blockers -Message "Adapter is not available: $adapterId status=$($adapter.status)"
        }
        if (Test-ActionMatch -Items $adapter.blocked_actions -Action $action) {
            Add-Message -List $blockers -Message "Requested action matches adapter blocked_actions."
        }
        if (Test-ActionMatch -Items $adapter.approval_required_actions -Action $action) {
            Add-Message -List $humanRequired -Message "Requested action matches adapter approval_required_actions."
        }
        if (-not (Test-ActionMatch -Items $adapter.allowed_actions -Action $action) -and -not (Test-ActionMatch -Items $adapter.approval_required_actions -Action $action)) {
            Add-Message -List $humanRequired -Message "Requested action is not explicitly allowlisted for this adapter."
        }
        if ([bool]$adapter.requires_human_approval) {
            Add-Message -List $humanRequired -Message "Adapter policy requires Human Director approval."
        }
        if ([bool]$adapter.can_incur_cost) {
            Add-Message -List $humanRequired -Message "Adapter can incur cost; explicit approval is required before execution."
        }
        if ($permission -eq "external" -and -not [bool]$adapter.can_call_external) {
            Add-Message -List $blockers -Message "Request asks for external permission but adapter cannot call external systems."
        }
        if ($permission -eq "write" -and -not [bool]$adapter.can_modify_files) {
            Add-Message -List $blockers -Message "Request asks for write permission but adapter is not file-modifying."
        }
        if ($permission -eq "destructive") {
            Add-Message -List $humanRequired -Message "Destructive permission class always requires explicit Human Director approval."
        }
    }

    if (@("blocked", "cancelled", "superseded") -contains ([string]$Request.status)) {
        Add-Message -List $blockers -Message "Request status is $($Request.status)."
    }
    if ([string]::IsNullOrWhiteSpace($approvalRef) -and $humanRequired.Count -gt 0) {
        Add-Message -List $warnings -Message "No approval_ref is attached yet."
    }

    $decision = "allowed_without_execution"
    if ($blockers.Count -gt 0) {
        $decision = "blocked"
    } elseif ($humanRequired.Count -gt 0 -and [string]::IsNullOrWhiteSpace($approvalRef)) {
        $decision = "human_required"
    } elseif ($humanRequired.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($approvalRef)) {
        $decision = "ready_for_execution_gate"
    }

    $nextAction = "Record ToolRun only after the real adapter executes and evidence exists."
    if ($decision -eq "blocked") {
        $nextAction = "Repair the request or choose a different adapter before execution."
    } elseif ($decision -eq "human_required") {
        $nextAction = "Ask the Human Director to approve the concrete action, affected files/tools/cost, and evidence requirements."
    } elseif ($decision -eq "ready_for_execution_gate") {
        $nextAction = "Approval is attached; a separate execution adapter may run later under the approved scope."
    }

    return [pscustomobject]@{
        ok = ($decision -ne "blocked")
        decision = $decision
        adapter_found = ($null -ne $adapter)
        adapter_status = if ($null -ne $adapter) { [string]$adapter.status } else { "" }
        adapter_category = if ($null -ne $adapter) { [string]$adapter.category } else { "" }
        provider_policy = if ($null -ne $adapter) { [string]$adapter.provider_policy } else { "" }
        permission_class = $permission
        approval_ref = if ([string]::IsNullOrWhiteSpace($approvalRef)) { $null } else { $approvalRef }
        blockers = $blockers.ToArray()
        human_required_reasons = $humanRequired.ToArray()
        warnings = $warnings.ToArray()
        required_evidence = (Merge-EvidenceRequirements -Request $Request -Adapter $adapter)
        next_action = $nextAction
        safety = New-SafetyState
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$RequestPath
    )

    $resolvedPath = Resolve-RepoFilePath -Root $Root -Path $RequestPath
    $request = Read-JsonFile -Path $resolvedPath
    $shape = Test-ToolRunRequestShape -Request $request
    $registry = Read-ToolAdapterRegistry -Root $Root
    $evaluation = $null
    if ($shape.ok) {
        $evaluation = New-ToolRunRequestEvaluation -Request $request -Registry $registry
    }

    return [pscustomobject]@{
        ok = ($shape.ok -and $null -ne $evaluation)
        command = "plan"
        request_path = $resolvedPath
        registry_path = $registry.path
        tool_run_request = $request
        validation = $shape
        evaluation = $evaluation
        safety = New-SafetyState
    }
}

function New-StatusResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $files = Get-RequestFiles -StorePath $StorePath
    return [pscustomobject]@{
        ok = $true
        command = "status"
        store_path = $StorePath
        request_count = @($files).Count
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $items = @()
    foreach ($file in (Get-RequestFiles -StorePath $StorePath)) {
        try {
            $request = Read-JsonFile -Path $file.FullName
            $items += [pscustomobject]@{
                tool_run_request_id = [string]$request.tool_run_request_id
                status = [string]$request.status
                adapter_id = [string]$request.tool_adapter_id
                permission_class = [string]$request.permission_class
                action = [string]$request.requested_action
                purpose = Limit-Text -Text ([string]$request.purpose) -Max 140
                file = $file.Name
            }
        } catch {
            $items += [pscustomobject]@{
                tool_run_request_id = "(parse failed)"
                status = "invalid"
                adapter_id = ""
                permission_class = ""
                action = ""
                purpose = $_.Exception.Message
                file = $file.Name
            }
        }
    }

    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_path = $StorePath
        requests = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$RequestId
    )

    $target = Join-Path $StorePath ($RequestId + ".json")
    if (-not (Test-Path -LiteralPath $target)) {
        return [pscustomobject]@{
            ok = $false
            command = "read"
            error = "ToolRunRequest not found: $RequestId"
            store_path = $StorePath
            safety = New-SafetyState
        }
    }

    $request = Read-JsonFile -Path $target
    $shape = Test-ToolRunRequestShape -Request $request
    $registry = Read-ToolAdapterRegistry -Root $Root
    $evaluation = $null
    if ($shape.ok) {
        $evaluation = New-ToolRunRequestEvaluation -Request $request -Registry $registry
    }

    return [pscustomobject]@{
        ok = $shape.ok
        command = "read"
        store_path = $StorePath
        tool_run_request = $request
        validation = $shape
        evaluation = $evaluation
        safety = New-SafetyState
    }
}

function New-ValidateResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $registry = Read-ToolAdapterRegistry -Root $Root
    $validations = @()
    $errorCount = 0
    foreach ($file in (Get-RequestFiles -StorePath $StorePath)) {
        try {
            $request = Read-JsonFile -Path $file.FullName
            $shape = Test-ToolRunRequestShape -Request $request
            $evaluation = $null
            if ($shape.ok) {
                $evaluation = New-ToolRunRequestEvaluation -Request $request -Registry $registry
            }
            $validations += [pscustomobject]@{
                ok = $shape.ok
                file = $file.Name
                tool_run_request_id = [string]$request.tool_run_request_id
                shape = $shape
                evaluation = $evaluation
            }
            if (-not $shape.ok) {
                $errorCount += @($shape.errors).Count
            }
        } catch {
            $errorCount += 1
            $validations += [pscustomobject]@{
                ok = $false
                file = $file.Name
                tool_run_request_id = ""
                shape = [pscustomobject]@{ ok = $false; errors = @($_.Exception.Message) }
                evaluation = $null
            }
        }
    }

    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        store_path = $StorePath
        request_count = @($validations).Count
        error_count = $errorCount
        validations = @($validations)
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$RequestPath,
        [bool]$Execute
    )

    $plan = New-PlanResult -Root $Root -RequestPath $RequestPath
    $requestId = [string]$plan.tool_run_request.tool_run_request_id
    $targetPath = Join-Path $StorePath ($requestId + ".json")

    if (-not $plan.validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "create"
            execute = $Execute
            request_path = $plan.request_path
            target_path = $targetPath
            validation = $plan.validation
            evaluation = $plan.evaluation
            safety = New-SafetyState
        }
    }

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "create"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create <tool_run_request_json_path> --execute to store the request."
            request_path = $plan.request_path
            target_path = $targetPath
            tool_run_request = $plan.tool_run_request
            validation = $plan.validation
            evaluation = $plan.evaluation
            safety = New-SafetyState
        }
    }

    if (Test-Path -LiteralPath $targetPath) {
        throw "ToolRunRequest already exists in store: $targetPath"
    }
    if (-not (Test-Path -LiteralPath $StorePath)) {
        New-Item -ItemType Directory -Path $StorePath -Force | Out-Null
    }

    $json = ($plan.tool_run_request | ConvertTo-Json -Depth 64) + [Environment]::NewLine
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, $json, $encoding)

    return [pscustomobject]@{
        ok = $true
        command = "create"
        execute = $true
        target_path = $targetPath
        tool_run_request = $plan.tool_run_request
        validation = $plan.validation
        evaluation = $plan.evaluation
        safety = New-SafetyState -RequestWritten $true
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
    Write-Host "AIWorkflow Studio ToolRun Request Store"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Requests: $($Result.request_count)"
    Write-List -Label "Safety" -Items @(
        "read-only",
        "adapter not executed",
        "LLM not called",
        "task state not changed",
        "source not changed",
        "git not changed"
    )
}

function Show-Evaluation {
    param([object]$Evaluation)

    if ($null -eq $Evaluation) {
        Write-Host "- evaluation: unavailable because validation failed"
        return
    }

    Write-Host "- decision: $($Evaluation.decision)"
    Write-Host "- adapter: $($Evaluation.adapter_status) / $($Evaluation.adapter_category)"
    Write-Host "- permission: $($Evaluation.permission_class)"
    Write-Host "- next: $($Evaluation.next_action)"
    if (-not [string]::IsNullOrWhiteSpace([string]$Evaluation.provider_policy)) {
        Write-Host "- provider policy: $($Evaluation.provider_policy)"
    }
    Write-List -Label "Blockers" -Items $Evaluation.blockers
    Write-List -Label "Human approval reasons" -Items $Evaluation.human_required_reasons
    Write-List -Label "Warnings" -Items $Evaluation.warnings
    Write-List -Label "Required evidence" -Items $Evaluation.required_evidence
}

function Show-Plan {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio ToolRun Request Plan"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Request: $($Result.tool_run_request.tool_run_request_id)"
    Write-Host "Adapter: $($Result.tool_run_request.tool_adapter_id)"
    Write-Host "Action: $($Result.tool_run_request.requested_action)"
    Write-Host "Purpose: $(Limit-Text -Text ([string]$Result.tool_run_request.purpose) -Max 220)"
    Write-Host ""
    Write-Host "[Validation]"
    Write-Host "- ok: $($Result.validation.ok)"
    foreach ($err in @($Result.validation.errors)) { Write-Host "- error: $err" }
    Write-Host ""
    Write-Host "[Evaluation]"
    Show-Evaluation -Evaluation $Result.evaluation
    Write-List -Label "Safety" -Items @(
        "request planned only",
        "adapter not executed",
        "LLM not called",
        "task state not changed",
        "source not changed",
        "git not changed"
    )
}

function Show-ListResult {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio ToolRun Requests"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    if (@($Result.requests).Count -eq 0) {
        Write-Host "No ToolRunRequest files found."
        return
    }
    foreach ($item in @($Result.requests)) {
        Write-Host ""
        Write-Host "$($item.tool_run_request_id) [$($item.status)]"
        Write-Host "- adapter/action: $($item.adapter_id) / $($item.action)"
        Write-Host "- permission: $($item.permission_class)"
        Write-Host "- purpose: $($item.purpose)"
        Write-Host "- file: $($item.file)"
    }
}

function Show-Validate {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio ToolRun Request Validation"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Requests: $($Result.request_count)"
    Write-Host "Errors: $($Result.error_count)"
    foreach ($validation in @($Result.validations)) {
        $state = if ($validation.ok) { "PASS" } else { "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($validation.tool_run_request_id)"
        foreach ($err in @($validation.shape.errors)) { Write-Host "- error: $err" }
        if ($null -ne $validation.evaluation) {
            Write-Host "- decision: $($validation.evaluation.decision)"
        }
    }
}

function Show-Create {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio ToolRun Request Create"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Request: $($Result.tool_run_request.tool_run_request_id)"
    if (-not $Result.execute) {
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
    } else {
        Write-Host "Mode: execute"
        Write-Host "Stored: $($Result.target_path)"
    }
    Write-Host ""
    Write-Host "[Evaluation]"
    Show-Evaluation -Evaluation $Result.evaluation
    Write-List -Label "Safety" -Items @(
        "ToolRunRequest written: $($Result.safety.tool_run_request_written)",
        "adapter not executed",
        "LLM not called",
        "task state not changed",
        "source not changed",
        "git not changed"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_tool_run_planner.bat status|validate|list|read <tool_run_request_id>|plan <tool_run_request_json_path>|create <tool_run_request_json_path> [--execute] [--store-path _Temp\\...] [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storePathOverride = ""
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
        $result = New-ReadResult -Root $repo -StorePath $storePath -RequestId ([string]$cleanArgs[1])
    } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
        $result = New-PlanResult -Root $repo -RequestPath ([string]$cleanArgs[1])
    } elseif ($command -eq "create" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Root $repo -StorePath $storePath -RequestPath ([string]$cleanArgs[1]) -Execute $execute
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
