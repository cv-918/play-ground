param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

function ConvertTo-StudioJson {
    param([object]$Value)

    $Value | ConvertTo-Json -Depth 32
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing JSON file: $Path"
    }
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    return $text | ConvertFrom-Json
}

function Get-RegistryPath {
    param([string]$Root)

    return (Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\tool_adapters.initial.json")
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) { return @() }
    return @($Value | ForEach-Object { [string]$_ })
}

function Test-HasProperty {
    param(
        [object]$Value,
        [string]$Name
    )

    return ($null -ne $Value -and $null -ne $Value.PSObject.Properties[$Name])
}

function Test-ToolAdapter {
    param([object]$Adapter)

    $errors = @()
    $warnings = @()
    $required = @(
        "adapter_id",
        "display_name",
        "category",
        "status",
        "execution_owner",
        "provider_policy",
        "allowed_actions",
        "blocked_actions",
        "approval_required_actions",
        "input_contract",
        "output_evidence",
        "can_modify_files",
        "can_call_external",
        "can_incur_cost",
        "requires_human_approval",
        "default_enabled",
        "notes"
    )
    foreach ($field in $required) {
        if (-not (Test-HasProperty -Value $Adapter -Name $field)) {
            $errors += "Missing required field: $field"
        }
    }

    $id = [string]$Adapter.adapter_id
    if ($id -notmatch "^[a-z][a-z0-9_]{2,63}$") {
        $errors += "Invalid adapter_id: $id"
    }
    if (@("llm", "local_cli", "browser", "asset_generation", "game_runner", "build_test", "git", "workflow_core", "memory", "ui_export") -notcontains ([string]$Adapter.category)) {
        $errors += "Invalid category for $id`: $($Adapter.category)"
    }
    if (@("available", "planned", "disabled") -notcontains ([string]$Adapter.status)) {
        $errors += "Invalid status for $id`: $($Adapter.status)"
    }
    if (@("aiworkflow_core", "human_director", "codex_app_cli", "external_app") -notcontains ([string]$Adapter.execution_owner)) {
        $errors += "Invalid execution_owner for $id`: $($Adapter.execution_owner)"
    }

    if ([bool]$Adapter.can_incur_cost -and -not [bool]$Adapter.requires_human_approval) {
        $errors += "Cost-incurring adapter must require human approval: $id"
    }
    if ([bool]$Adapter.can_call_external -and -not [bool]$Adapter.requires_human_approval -and [string]$Adapter.category -ne "build_test") {
        $warnings += "External-capable adapter should usually require human approval: $id"
    }
    if ([bool]$Adapter.can_modify_files -and [string]$Adapter.status -eq "available" -and [string]$Adapter.category -notin @("build_test", "ui_export") -and -not [bool]$Adapter.requires_human_approval) {
        $warnings += "File-modifying available adapter should usually require human approval: $id"
    }

    foreach ($action in (Get-StringArray -Value $Adapter.allowed_actions)) {
        if ((Get-StringArray -Value $Adapter.blocked_actions) -contains $action) {
            $errors += "Action cannot be both allowed and blocked for $id`: $action"
        }
    }

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        adapter_id = $id
        category = [string]$Adapter.category
        status = [string]$Adapter.status
        errors = @($errors)
        warnings = @($warnings)
    }
}

function Read-Registry {
    param([string]$Root)

    return (Read-JsonFile -Path (Get-RegistryPath -Root $Root))
}

function New-Validation {
    param([object]$Registry)

    $validations = @()
    $seen = @{}
    foreach ($adapter in @($Registry.tool_adapters)) {
        $validation = Test-ToolAdapter -Adapter $adapter
        if ($seen.ContainsKey($validation.adapter_id)) {
            $validation.errors += "Duplicate adapter_id: $($validation.adapter_id)"
            $validation.ok = $false
        } else {
            $seen[$validation.adapter_id] = $true
        }
        $validations += $validation
    }
    $errorCount = 0
    $warningCount = 0
    foreach ($validation in @($validations)) {
        $errorCount += @($validation.errors).Count
        $warningCount += @($validation.warnings).Count
    }

    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        adapter_count = @($Registry.tool_adapters).Count
        error_count = $errorCount
        warning_count = $warningCount
        validations = @($validations)
    }
}

function New-StatusResult {
    param([string]$Root)

    $registry = Read-Registry -Root $Root
    $validation = New-Validation -Registry $registry
    $available = @($registry.tool_adapters | Where-Object { [string]$_.status -eq "available" }).Count
    $planned = @($registry.tool_adapters | Where-Object { [string]$_.status -eq "planned" }).Count

    return [pscustomobject]@{
        ok = $validation.ok
        command = "status"
        registry_path = (Get-RegistryPath -Root $Root)
        schema_version = [string]$registry.schema_version
        adapter_count = @($registry.tool_adapters).Count
        available_count = $available
        planned_count = $planned
        error_count = $validation.error_count
        warning_count = $validation.warning_count
        safety = [pscustomobject]@{
            read_only = $true
            adapters_executed = $false
            files_modified = $false
            git_changed = $false
        }
    }
}

function New-ListResult {
    param([string]$Root)

    $registry = Read-Registry -Root $Root
    $items = @()
    foreach ($adapter in @($registry.tool_adapters)) {
        $items += [pscustomobject]@{
            adapter_id = [string]$adapter.adapter_id
            display_name = [string]$adapter.display_name
            category = [string]$adapter.category
            status = [string]$adapter.status
            requires_human_approval = [bool]$adapter.requires_human_approval
            default_enabled = [bool]$adapter.default_enabled
        }
    }
    return [pscustomobject]@{
        ok = $true
        command = "list"
        items = @($items)
        safety = [pscustomobject]@{ read_only = $true }
    }
}

function New-AdapterResult {
    param(
        [string]$Root,
        [string]$AdapterId
    )

    $registry = Read-Registry -Root $Root
    foreach ($adapter in @($registry.tool_adapters)) {
        if ([string]$adapter.adapter_id -eq $AdapterId) {
            return [pscustomobject]@{
                ok = $true
                command = "adapter"
                adapter = $adapter
                validation = (Test-ToolAdapter -Adapter $adapter)
                safety = [pscustomobject]@{ read_only = $true }
            }
        }
    }
    return [pscustomobject]@{
        ok = $false
        command = "adapter"
        error = "Tool adapter not found: $AdapterId"
        safety = [pscustomobject]@{ read_only = $true }
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
    Write-Host "AIWorkflow Studio Tool Registry"
    Write-Host "============================================================"
    Write-Host "Adapters: $($Result.adapter_count)"
    Write-Host "Available/planned: $($Result.available_count) / $($Result.planned_count)"
    Write-Host "Errors/warnings: $($Result.error_count) / $($Result.warning_count)"
    Write-Host "Registry: $($Result.registry_path)"
}

function Show-Validation {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Tool Registry Validation"
    Write-Host "============================================================"
    Write-Host "Adapters: $($Result.adapter_count)"
    Write-Host "Errors/warnings: $($Result.error_count) / $($Result.warning_count)"
    foreach ($validation in @($Result.validations)) {
        $state = "PASS"
        if (-not $validation.ok) { $state = "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($validation.adapter_id) $($validation.category)/$($validation.status)"
        foreach ($err in @($validation.errors)) { Write-Host "  - error: $err" }
        foreach ($warn in @($validation.warnings)) { Write-Host "  - warning: $warn" }
    }
}

function Show-List {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Tool Adapters"
    Write-Host "============================================================"
    foreach ($item in @($Result.items)) {
        Write-Host ""
        Write-Host "$($item.adapter_id) [$($item.category)/$($item.status)]"
        Write-Host "- name: $($item.display_name)"
        Write-Host "- approval/default: $($item.requires_human_approval) / $($item.default_enabled)"
    }
}

function Show-Adapter {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        return
    }
    $adapter = $Result.adapter
    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Tool Adapter"
    Write-Host "============================================================"
    Write-Host "$($adapter.adapter_id) - $($adapter.display_name)"
    Write-Host "category/status: $($adapter.category) / $($adapter.status)"
    Write-Host "owner: $($adapter.execution_owner)"
    Write-Host "provider policy: $($adapter.provider_policy)"
    Write-Host "file/external/cost: $($adapter.can_modify_files) / $($adapter.can_call_external) / $($adapter.can_incur_cost)"
    Write-Host "approval/default: $($adapter.requires_human_approval) / $($adapter.default_enabled)"
    Write-List -Label "Allowed actions" -Items $adapter.allowed_actions
    Write-List -Label "Blocked actions" -Items $adapter.blocked_actions
    Write-List -Label "Approval required" -Items $adapter.approval_required_actions
    Write-List -Label "Evidence" -Items $adapter.output_evidence
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_tool_registry_status.bat status|validate|list|adapter <adapter_id> [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $cleanArgs = New-Object "System.Collections.Generic.List[string]"
    $argsList = @()
    if ($null -ne $CommandArgs) { $argsList = @($CommandArgs) }

    for ($index = 0; $index -lt $argsList.Count; $index += 1) {
        $arg = [string]$argsList[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -eq 0) { $cleanArgs.Add("status") }
    $command = ([string]$cleanArgs[0]).ToLowerInvariant()

    if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
        $result = New-StatusResult -Root $repo
    } elseif ($command -eq "validate" -and $cleanArgs.Count -eq 1) {
        $registry = Read-Registry -Root $repo
        $result = New-Validation -Registry $registry
    } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
        $result = New-ListResult -Root $repo
    } elseif ($command -eq "adapter" -and $cleanArgs.Count -eq 2) {
        $result = New-AdapterResult -Root $repo -AdapterId ([string]$cleanArgs[1])
    } else {
        $result = New-UsageResult
        if ($json) { ConvertTo-StudioJson -Value $result } else { Write-Host "[ERROR] $($result.error)" }
        exit 1
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } elseif ($command -eq "status") {
        Show-Status -Result $result
    } elseif ($command -eq "validate") {
        Show-Validation -Result $result
    } elseif ($command -eq "list") {
        Show-List -Result $result
    } elseif ($command -eq "adapter") {
        Show-Adapter -Result $result
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
