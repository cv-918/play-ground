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
    param([bool]$MemoryWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $MemoryWritten)
        memory_written = $MemoryWritten
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

    return (Join-Path $Root "_Docs\AIWorkflow\Studio\MemoryRecords")
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

function New-StringList {
    return ,(New-Object "System.Collections.Generic.List[string]")
}

function Add-Message {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string]$Message
    )

    if (-not [string]::IsNullOrWhiteSpace($Message)) {
        $List.Add($Message)
    }
}

function Read-StaffIdSet {
    param([string]$Root)

    $path = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\staff_agents.initial.json"
    $data = Read-JsonFile -Path $path
    $ids = @{}

    foreach ($staff in @($data.staff_agents)) {
        $id = [string]$staff.agent_id
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $ids[$id] = $true
        }
    }

    foreach ($staff in @($data.planned_staff_agents)) {
        $id = [string]$staff.agent_id
        if (-not [string]::IsNullOrWhiteSpace($id)) {
            $ids[$id] = $true
        }
    }

    return ,$ids
}

function Get-MemoryFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $StorePath -Filter "*.json" -File | Sort-Object Name)
}

function New-MemorySummary {
    param(
        [object]$Record,
        [string]$Path
    )

    return [pscustomobject]@{
        memory_id = [string]$Record.memory_id
        project_id = [string]$Record.project_id
        scope = [string]$Record.scope
        type = [string]$Record.type
        status = [string]$Record.status
        owner_agent_id = [string]$Record.owner_agent_id
        confidence = [string]$Record.confidence
        content_preview = (Limit-Text -Text ([string]$Record.content) -Max 140)
        source_refs = (Get-StringArray -Value $Record.source_refs)
        path = $Path
    }
}

function Test-MemoryRecord {
    param(
        [object]$Record,
        [string]$Path,
        [hashtable]$StaffIds,
        [hashtable]$SeenIds
    )

    $errors = New-StringList
    $warnings = New-StringList

    $required = @(
        "memory_id",
        "project_id",
        "scope",
        "type",
        "status",
        "content",
        "source_refs",
        "confidence",
        "owner_agent_id",
        "created_at",
        "updated_at"
    )

    foreach ($name in $required) {
        if (-not (Test-HasProperty -Value $Record -Name $name)) {
            Add-Message -List $errors -Message "Missing required field: $name"
        } elseif ([string]::IsNullOrWhiteSpace([string]$Record.$name) -and $name -ne "source_refs") {
            Add-Message -List $errors -Message "Required field is empty: $name"
        }
    }

    $memoryId = [string]$Record.memory_id
    if (-not [string]::IsNullOrWhiteSpace($memoryId)) {
        if ($memoryId -notmatch "^MEM-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
            Add-Message -List $errors -Message "memory_id must match MEM-YYYYMMDD-HHMMSS-slug, with lowercase letters, numbers, and hyphens."
        }
        if ($null -ne $SeenIds) {
            if ($SeenIds.ContainsKey($memoryId)) {
                Add-Message -List $errors -Message "Duplicate memory_id also found at: $($SeenIds[$memoryId])"
            } else {
                $SeenIds[$memoryId] = $Path
            }
        }
    }

    $scopes = @("global", "project", "agent", "department", "meeting", "task", "canon")
    $types = @("fact", "preference", "proposal", "decision", "canon", "rejection", "evidence", "lesson")
    $statuses = @("draft", "proposed", "approved", "canon", "rejected", "deprecated", "superseded", "evidence", "lesson")
    $confidenceValues = @("low", "medium", "high")

    if ($scopes -notcontains ([string]$Record.scope)) {
        Add-Message -List $errors -Message "Invalid scope: $($Record.scope)"
    }
    if ($types -notcontains ([string]$Record.type)) {
        Add-Message -List $errors -Message "Invalid type: $($Record.type)"
    }
    if ($statuses -notcontains ([string]$Record.status)) {
        Add-Message -List $errors -Message "Invalid status: $($Record.status)"
    }
    if ($confidenceValues -notcontains ([string]$Record.confidence)) {
        Add-Message -List $errors -Message "Invalid confidence: $($Record.confidence)"
    }

    $sourceRefs = Get-StringArray -Value $Record.source_refs
    if (@($sourceRefs).Count -eq 0) {
        Add-Message -List $errors -Message "source_refs must contain at least one reference."
    }

    $owner = [string]$Record.owner_agent_id
    if (-not [string]::IsNullOrWhiteSpace($owner) -and $null -ne $StaffIds -and -not $StaffIds.ContainsKey($owner)) {
        Add-Message -List $warnings -Message "owner_agent_id is not in the current staff registry: $owner"
    }

    $status = [string]$Record.status
    $type = [string]$Record.type
    $scope = [string]$Record.scope

    if ($status -eq "canon") {
        if ($type -ne "canon") {
            Add-Message -List $errors -Message "status=canon requires type=canon."
        }
        if ($scope -ne "canon") {
            Add-Message -List $warnings -Message "status=canon usually requires scope=canon."
        }
        $hasDecision = $false
        foreach ($ref in $sourceRefs) {
            if ($ref -match "^DEC-") {
                $hasDecision = $true
            }
        }
        if (-not $hasDecision) {
            Add-Message -List $errors -Message "status=canon requires a DEC-* source_ref that records the approving decision."
        }
    }

    if ($status -eq "rejected") {
        if ($type -ne "rejection") {
            Add-Message -List $errors -Message "status=rejected requires type=rejection."
        }
        if (-not (Test-HasProperty -Value $Record -Name "rejection_reason") -or [string]::IsNullOrWhiteSpace([string]$Record.rejection_reason)) {
            Add-Message -List $errors -Message "status=rejected requires rejection_reason."
        }
    }

    if ($status -eq "superseded") {
        if (-not (Test-HasProperty -Value $Record -Name "replacement_ref") -or [string]::IsNullOrWhiteSpace([string]$Record.replacement_ref)) {
            Add-Message -List $errors -Message "status=superseded requires replacement_ref."
        }
    }

    if ($status -eq "deprecated") {
        $hasReplacement = (Test-HasProperty -Value $Record -Name "replacement_ref") -and -not [string]::IsNullOrWhiteSpace([string]$Record.replacement_ref)
        $hasReason = (Test-HasProperty -Value $Record -Name "rejection_reason") -and -not [string]::IsNullOrWhiteSpace([string]$Record.rejection_reason)
        if (-not $hasReplacement -and -not $hasReason) {
            Add-Message -List $warnings -Message "status=deprecated should explain replacement_ref or rejection_reason."
        }
    }

    if ($status -eq "evidence" -and $type -ne "evidence") {
        Add-Message -List $warnings -Message "status=evidence usually uses type=evidence."
    }
    if ($status -eq "lesson" -and $type -ne "lesson") {
        Add-Message -List $warnings -Message "status=lesson usually uses type=lesson."
    }
    if ($type -eq "proposal" -and $status -eq "canon") {
        Add-Message -List $errors -Message "A proposal memory cannot be canon."
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        memory_id = $memoryId
        status = [string]$Record.status
        type = [string]$Record.type
        scope = [string]$Record.scope
        path = $Path
        errors = $errors.ToArray()
        warnings = $warnings.ToArray()
    }
}

function Read-StoreRecords {
    param(
        [string]$StorePath,
        [hashtable]$StaffIds
    )

    $records = New-Object System.Collections.Generic.List[object]
    $validations = New-Object System.Collections.Generic.List[object]
    $seen = @{}

    foreach ($file in (Get-MemoryFiles -StorePath $StorePath)) {
        try {
            $record = Read-JsonFile -Path $file.FullName
            $validation = Test-MemoryRecord -Record $record -Path $file.FullName -StaffIds $StaffIds -SeenIds $seen
            $records.Add([pscustomobject]@{
                record = $record
                path = $file.FullName
                validation = $validation
            })
            $validations.Add($validation)
        } catch {
            $validations.Add([pscustomobject]@{
                ok = $false
                memory_id = ""
                status = ""
                type = ""
                scope = ""
                path = $file.FullName
                errors = @($_.Exception.Message)
                warnings = @()
            })
        }
    }

    return [pscustomobject]@{
        records = $records.ToArray()
        validations = $validations.ToArray()
    }
}

function New-StoreStats {
    param([object[]]$Records)

    $byStatus = @{}
    $byType = @{}
    foreach ($item in @($Records)) {
        $status = [string]$item.record.status
        $type = [string]$item.record.type
        if ([string]::IsNullOrWhiteSpace($status)) { $status = "(missing)" }
        if ([string]::IsNullOrWhiteSpace($type)) { $type = "(missing)" }
        if (-not $byStatus.ContainsKey($status)) { $byStatus[$status] = 0 }
        if (-not $byType.ContainsKey($type)) { $byType[$type] = 0 }
        $byStatus[$status] += 1
        $byType[$type] += 1
    }

    return [pscustomobject]@{
        by_status = $byStatus
        by_type = $byType
    }
}

function New-StatusResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreRecords -StorePath $StorePath -StaffIds $staffIds
    $stats = New-StoreStats -Records $store.records
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
        record_count = @($store.records).Count
        error_count = $errorCount
        warning_count = $warningCount
        counts = $stats
        safety = New-SafetyState
    }
}

function New-ValidateResult {
    param(
        [string]$Root,
        [string]$StorePath
    )

    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreRecords -StorePath $StorePath -StaffIds $staffIds
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
        record_count = @($store.records).Count
        error_count = $errorCount
        warning_count = $warningCount
        validations = @($store.validations)
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$StatusFilter,
        [string]$TypeFilter
    )

    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreRecords -StorePath $StorePath -StaffIds $staffIds
    $items = New-Object System.Collections.Generic.List[object]

    foreach ($item in @($store.records)) {
        $record = $item.record
        if (-not [string]::IsNullOrWhiteSpace($StatusFilter) -and ([string]$record.status) -ne $StatusFilter) {
            continue
        }
        if (-not [string]::IsNullOrWhiteSpace($TypeFilter) -and ([string]$record.type) -ne $TypeFilter) {
            continue
        }
        $items.Add((New-MemorySummary -Record $record -Path $item.path))
    }

    return [pscustomobject]@{
        ok = $true
        command = "list"
        store_path = $StorePath
        status_filter = $StatusFilter
        type_filter = $TypeFilter
        count = $items.Count
        items = $items.ToArray()
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MemoryId
    )

    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreRecords -StorePath $StorePath -StaffIds $staffIds
    foreach ($item in @($store.records)) {
        if ([string]$item.record.memory_id -eq $MemoryId) {
            return [pscustomobject]@{
                ok = $true
                command = "read"
                store_path = $StorePath
                memory_id = $MemoryId
                record = $item.record
                validation = $item.validation
                safety = New-SafetyState
            }
        }
    }

    return [pscustomobject]@{
        ok = $false
        command = "read"
        store_path = $StorePath
        memory_id = $MemoryId
        error = "Memory record not found: $MemoryId"
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MemoryPath,
        [bool]$Execute
    )

    $inputPath = Resolve-RepoFilePath -Root $Root -Path $MemoryPath
    $record = Read-JsonFile -Path $inputPath
    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreRecords -StorePath $StorePath -StaffIds $staffIds
    $existing = @{}
    foreach ($item in @($store.records)) {
        $existing[[string]$item.record.memory_id] = $item.path
    }
    $validation = Test-MemoryRecord -Record $record -Path $inputPath -StaffIds $staffIds -SeenIds $null
    $memoryId = [string]$record.memory_id
    if (-not [string]::IsNullOrWhiteSpace($memoryId) -and $existing.ContainsKey($memoryId)) {
        $list = New-StringList
        foreach ($err in @($validation.errors)) { $list.Add([string]$err) }
        $list.Add("memory_id already exists in store: $($existing[$memoryId])")
        $validation = [pscustomobject]@{
            ok = $false
            memory_id = $memoryId
            status = [string]$record.status
            type = [string]$record.type
            scope = [string]$record.scope
            path = $inputPath
            errors = $list.ToArray()
            warnings = @($validation.warnings)
        }
    }

    $targetPath = ""
    if (-not [string]::IsNullOrWhiteSpace($memoryId)) {
        $targetPath = Join-Path $StorePath ($memoryId + ".json")
    }

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $validation.ok
            command = "create"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create <memory_json_path> --execute to write a MemoryRecord."
            memory_id = $memoryId
            input_path = $inputPath
            target_path = $targetPath
            validation = $validation
            summary = (New-MemorySummary -Record $record -Path $inputPath)
            safety = New-SafetyState
        }
    }

    if (-not $validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "create"
            execute = $true
            memory_id = $memoryId
            input_path = $inputPath
            target_path = $targetPath
            error = "MemoryRecord validation failed. Nothing was written."
            validation = $validation
            safety = New-SafetyState
        }
    }

    if (-not (Test-Path -LiteralPath $StorePath)) {
        New-Item -ItemType Directory -Path $StorePath -Force | Out-Null
    }

    $jsonText = $record | ConvertTo-Json -Depth 64
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, $jsonText + [Environment]::NewLine, $utf8NoBom)

    return [pscustomobject]@{
        ok = $true
        command = "create"
        execute = $true
        memory_id = $memoryId
        input_path = $inputPath
        target_path = $targetPath
        validation = $validation
        summary = (New-MemorySummary -Record $record -Path $targetPath)
        safety = New-SafetyState -MemoryWritten $true
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
    Write-Host "AIWorkflow Studio Memory Store"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Exists: $($Result.store_exists)"
    Write-Host "Records: $($Result.record_count)"
    Write-Host "Errors: $($Result.error_count)"
    Write-Host "Warnings: $($Result.warning_count)"
    Write-Host ""
    Write-Host "[By status]"
    foreach ($key in @($Result.counts.by_status.Keys | Sort-Object)) {
        Write-Host "- $key`: $($Result.counts.by_status[$key])"
    }
    Write-Host ""
    Write-Host "[By type]"
    foreach ($key in @($Result.counts.by_type.Keys | Sort-Object)) {
        Write-Host "- $key`: $($Result.counts.by_type[$key])"
    }
    Write-List -Label "Safety" -Items @(
        "Memory not written",
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function Show-Validate {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Memory Validation"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Records: $($Result.record_count)"
    Write-Host "Errors: $($Result.error_count)"
    Write-Host "Warnings: $($Result.warning_count)"
    Write-Host ""
    foreach ($validation in @($Result.validations)) {
        $state = "PASS"
        if (-not $validation.ok) { $state = "FAIL" }
        Write-Host "[$state] $($validation.memory_id) $($validation.status)/$($validation.type)"
        foreach ($err in @($validation.errors)) {
            Write-Host "  - error: $err"
        }
        foreach ($warn in @($validation.warnings)) {
            Write-Host "  - warning: $warn"
        }
    }
    if (@($Result.validations).Count -eq 0) {
        Write-Host "No MemoryRecord JSON files found."
    }
}

function Show-List {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Memory List"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Count: $($Result.count)"
    foreach ($item in @($Result.items)) {
        Write-Host ""
        Write-Host "$($item.memory_id) [$($item.status)/$($item.type)]"
        Write-Host "- scope/project: $($item.scope) / $($item.project_id)"
        Write-Host "- owner/confidence: $($item.owner_agent_id) / $($item.confidence)"
        Write-Host "- content: $($item.content_preview)"
    }
}

function Show-Read {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        return
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Memory Read"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Memory: $($Result.memory_id)"
    Write-Host "Status/type: $($Result.record.status) / $($Result.record.type)"
    Write-Host "Scope/project: $($Result.record.scope) / $($Result.record.project_id)"
    Write-Host "Owner: $($Result.record.owner_agent_id)"
    Write-Host "Confidence: $($Result.record.confidence)"
    Write-Host ""
    Write-Host "[Content]"
    Write-Host $Result.record.content
    Write-List -Label "Source refs" -Items (Get-StringArray -Value $Result.record.source_refs)
    if (Test-HasProperty -Value $Result.record -Name "rejection_reason") {
        Write-Host ""
        Write-Host "[Rejection reason]"
        Write-Host $Result.record.rejection_reason
    }
    if (Test-HasProperty -Value $Result.record -Name "replacement_ref") {
        Write-Host ""
        Write-Host "[Replacement ref]"
        Write-Host $Result.record.replacement_ref
    }
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function Show-Create {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Memory Create"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Memory: $($Result.memory_id)"
    if (-not $Result.execute) {
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
    } else {
        Write-Host "Mode: execute"
    }
    Write-Host "Input: $($Result.input_path)"
    Write-Host "Target: $($Result.target_path)"
    Write-Host ""
    Write-Host "[Summary]"
    Write-Host "- status/type: $($Result.summary.status) / $($Result.summary.type)"
    Write-Host "- scope/project: $($Result.summary.scope) / $($Result.summary.project_id)"
    Write-Host "- owner/confidence: $($Result.summary.owner_agent_id) / $($Result.summary.confidence)"
    Write-Host "- content: $($Result.summary.content_preview)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    if (-not $Result.ok -and -not [string]::IsNullOrWhiteSpace([string]$Result.error)) {
        Write-Host ""
        Write-Host "[ERROR] $($Result.error)"
    }
    Write-List -Label "Safety" -Items @(
        "Memory written: $($Result.safety.memory_written)",
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_memory_store.bat status|validate|list|read <memory_id>|create <memory_json_path> [--execute] [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storePathOverride = ""
    $statusFilter = ""
    $typeFilter = ""
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
        } elseif ($arg -ieq "--status") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--status requires a value."
            }
            $index += 1
            $statusFilter = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--type") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--type requires a value."
            }
            $index += 1
            $typeFilter = [string]$CommandArgs[$index]
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
        $result = New-ListResult -Root $repo -StorePath $storePath -StatusFilter $statusFilter -TypeFilter $typeFilter
    } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
        $result = New-ReadResult -Root $repo -StorePath $storePath -MemoryId ([string]$cleanArgs[1])
    } elseif ($command -eq "create" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Root $repo -StorePath $storePath -MemoryPath ([string]$cleanArgs[1]) -Execute $execute
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
