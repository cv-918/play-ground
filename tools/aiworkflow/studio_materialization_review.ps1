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

function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Value
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    $jsonText = $Value | ConvertTo-Json -Depth 64
    [System.IO.File]::WriteAllText($Path, $jsonText + [Environment]::NewLine, $encoding)
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

function Get-StoreRoot {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Docs\AIWorkflow\Studio")
    }
    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--store-root override is only allowed under _Temp for validation safety: $resolved"
    }
    return $resolved
}

function Get-Stores {
    param([string]$StoreRoot)

    return [pscustomobject]@{
        root = $StoreRoot
        materializations = Join-Path $StoreRoot "Materializations"
        decisions = Join-Path $StoreRoot "Decisions"
    }
}

function New-SafetyState {
    param([bool]$DecisionWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $DecisionWritten)
        decision_written = $DecisionWritten
        task_created = $false
        approval_changed = $false
        canon_changed = $false
        source_changed = $false
        git_changed = $false
        llm_called = $false
    }
}

function ConvertTo-Slug {
    param(
        [string]$Value,
        [int]$Max = 48
    )

    $slug = ([string]$Value).ToLowerInvariant()
    $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-").Trim("-")
    if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "item" }
    if ($slug.Length -gt $Max) { $slug = $slug.Substring(0, $Max).Trim("-") }
    if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "item" }
    return $slug
}

function Get-MaterializationIdParts {
    param([object]$Materialization)

    $id = [string]$Materialization.materialization_id
    if ($id -match "^MAT-([0-9]{8})-([0-9]{6})-(.+)$") {
        return [pscustomobject]@{ date = $Matches[1]; time = $Matches[2]; slug = (ConvertTo-Slug -Value $Matches[3]) }
    }
    return [pscustomobject]@{ date = (Get-Date -Format "yyyyMMdd"); time = (Get-Date -Format "HHmmss"); slug = "materialization" }
}

function New-DecisionId {
    param(
        [object]$Materialization,
        [string]$Decision,
        [string]$RecordId,
        [int]$Index
    )

    $parts = Get-MaterializationIdParts -Materialization $Materialization
    $slug = ConvertTo-Slug -Value ("$Decision-$RecordId") -Max 42
    return ("DEC-{0}-{1}-{2}-r{3:00}-{4}" -f $parts.date, $parts.time, $parts.slug, $Index, $slug)
}

function Get-IsoNow {
    return (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
}

function Resolve-MaterializationPath {
    param(
        [string]$Root,
        [object]$Stores,
        [string]$Ref
    )

    if ($Ref -match "[\\/]" -or $Ref -like "*.json") {
        return Resolve-RepoFilePath -Root $Root -Path $Ref
    }
    return (Resolve-Path -LiteralPath (Join-Path $Stores.materializations ($Ref + ".json"))).Path
}

function Test-Materialization {
    param([object]$Materialization)

    $errors = New-Object System.Collections.Generic.List[string]
    foreach ($field in @("materialization_id", "source_output_id", "source_role_run_id", "source_agent_id", "created_at", "created_records", "safety")) {
        if ($null -eq $Materialization.PSObject.Properties[$field]) {
            $errors.Add("Missing required field: $field")
        }
    }
    if ([string]$Materialization.materialization_id -notmatch "^MAT-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        $errors.Add("Invalid materialization_id: $($Materialization.materialization_id)")
    }
    if ($Materialization.safety.task_created -or $Materialization.safety.approval_changed -or $Materialization.safety.canon_changed -or $Materialization.safety.source_changed -or $Materialization.safety.git_changed -or $Materialization.safety.llm_called) {
        $errors.Add("Materialization safety claims forbidden side effects.")
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        materialization_id = [string]$Materialization.materialization_id
        errors = $errors.ToArray()
    }
}

function Get-TargetRecords {
    param(
        [object]$Materialization,
        [string]$Target
    )

    if ([string]::IsNullOrWhiteSpace($Target) -or $Target -eq "all") {
        return @($Materialization.created_records)
    }
    return @($Materialization.created_records | Where-Object { [string]$_.record_id -eq $Target })
}

function New-DecisionRecord {
    param(
        [object]$Materialization,
        [object]$CreatedRecord,
        [string]$DecisionType,
        [string]$Reason,
        [int]$Index
    )

    $recordId = [string]$CreatedRecord.record_id
    $recordType = [string]$CreatedRecord.record_type
    $summary = if ([string]::IsNullOrWhiteSpace($Reason)) {
        "$DecisionType materialized $recordType $recordId from $($Materialization.materialization_id)."
    } else {
        $Reason
    }

    $accepted = @()
    $rejected = @()
    $conditions = @(
        "This decision records Director review of a materialized Studio draft.",
        "It does not create Backlog tasks, write canon, execute implementation, commit, or push.",
        "Downstream use must still pass the relevant AIWorkflow governance gate."
    )
    if ($DecisionType -in @("approve", "accept_concerns")) {
        $accepted = @("Allow downstream workflow to use materialized $recordType $recordId as reviewed draft input.")
        if ([bool]$CreatedRecord.human_required) {
            $conditions += "Further task execution or canon use still requires the explicit gate for that record type."
        }
    } elseif ($DecisionType -eq "reject") {
        $rejected = @("Do not use materialized $recordType $recordId for downstream work.")
    } elseif ($DecisionType -eq "request_changes") {
        $rejected = @("Do not use materialized $recordType $recordId until a revised RoleRunOutput or materialization is produced.")
        $conditions += "Create a focused follow-up WorkOrder or ask the staff agent for a corrected output."
    } elseif ($DecisionType -eq "defer") {
        $conditions += "Keep this materialized record available, but do not use it until a later decision."
    }

    return [pscustomobject]@{
        decision_id = (New-DecisionId -Materialization $Materialization -Decision $DecisionType -RecordId $recordId -Index $Index)
        decision_maker = "human_director"
        decision_type = $DecisionType
        target_ref = $recordId
        decision_summary = $summary
        accepted_scope = @($accepted)
        rejected_scope = @($rejected)
        conditions = @($conditions)
        timestamp = Get-IsoNow
        evidence_refs = @(
            [string]$Materialization.materialization_id,
            [string]$Materialization.source_output_id,
            [string]$Materialization.source_role_run_id,
            $recordId
        )
    }
}

function New-PlanDecisionResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride,
        [string]$MaterializationRef,
        [string]$DecisionType,
        [string]$Target,
        [string]$Reason
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $path = Resolve-MaterializationPath -Root $Root -Stores $stores -Ref $MaterializationRef
    $materialization = Read-JsonFile -Path $path
    $validation = Test-Materialization -Materialization $materialization
    $targets = Get-TargetRecords -Materialization $materialization -Target $Target
    $errors = @($validation.errors)
    if (@($targets).Count -eq 0) {
        $errors += "No materialized records match target: $Target"
    }
    if (@("approve", "reject", "defer", "request_changes", "accept_concerns") -notcontains $DecisionType) {
        $errors += "Unsupported decision type: $DecisionType"
    }
    $decisions = @()
    $index = 0
    foreach ($targetRecord in @($targets)) {
        $index += 1
        $decisions += New-DecisionRecord -Materialization $materialization -CreatedRecord $targetRecord -DecisionType $DecisionType -Reason $Reason -Index $index
    }
    $decisionPaths = @($decisions | ForEach-Object { Join-Path $stores.decisions ($_.decision_id + ".json") })

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        command = "plan"
        materialization_path = $path
        materialization_id = [string]$materialization.materialization_id
        decision_type = $DecisionType
        target = if ([string]::IsNullOrWhiteSpace($Target)) { "all" } else { $Target }
        decisions = @($decisions)
        decision_paths = @($decisionPaths)
        validation = $validation
        errors = @($errors)
        safety = New-SafetyState
    }
}

function New-RecordDecisionResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride,
        [string]$MaterializationRef,
        [string]$DecisionType,
        [string]$Target,
        [string]$Reason,
        [bool]$Execute
    )

    $plan = New-PlanDecisionResult -Root $Root -StoreRootOverride $StoreRootOverride -MaterializationRef $MaterializationRef -DecisionType $DecisionType -Target $Target -Reason $Reason
    if (-not $plan.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "record"
            execute = $Execute
            error = "Decision plan failed. Nothing was written."
            plan = $plan
            safety = New-SafetyState
        }
    }
    $duplicates = @($plan.decision_paths | Where-Object { Test-Path -LiteralPath $_ })
    if (-not $Execute) {
        return [pscustomobject]@{
            ok = (@($duplicates).Count -eq 0)
            command = "record"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with record <materialization> --decision <type> --execute to write Decision records."
            duplicate_paths = @($duplicates)
            plan = $plan
            safety = New-SafetyState
        }
    }
    if (@($duplicates).Count -gt 0) {
        return [pscustomobject]@{
            ok = $false
            command = "record"
            execute = $true
            error = "Decision target path already exists. Nothing was written."
            duplicate_paths = @($duplicates)
            plan = $plan
            safety = New-SafetyState
        }
    }
    for ($index = 0; $index -lt @($plan.decisions).Count; $index += 1) {
        Write-JsonFile -Path ([string]$plan.decision_paths[$index]) -Value $plan.decisions[$index]
    }
    return [pscustomobject]@{
        ok = $true
        command = "record"
        execute = $true
        decision_count = @($plan.decisions).Count
        decision_paths = @($plan.decision_paths)
        plan = $plan
        safety = New-SafetyState -DecisionWritten $true
    }
}

function Get-MaterializationFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }
    return @(Get-ChildItem -LiteralPath $StorePath -Filter "MAT-*.json" -File | Sort-Object Name)
}

function New-StatusResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    return [pscustomobject]@{
        ok = $true
        command = "status"
        store_root = $stores.root
        materialization_count = @(Get-MaterializationFiles -StorePath $stores.materializations).Count
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $items = @()
    foreach ($file in (Get-MaterializationFiles -StorePath $stores.materializations)) {
        $record = Read-JsonFile -Path $file.FullName
        $items += [pscustomobject]@{
            materialization_id = [string]$record.materialization_id
            source_output_id = [string]$record.source_output_id
            source_agent_id = [string]$record.source_agent_id
            created_count = @($record.created_records).Count
            file = $file.Name
        }
    }
    return [pscustomobject]@{
        ok = $true
        command = "list"
        count = @($items).Count
        items = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [string]$Root,
        [string]$StoreRootOverride,
        [string]$MaterializationRef
    )

    $stores = Get-Stores -StoreRoot (Get-StoreRoot -Root $Root -OverridePath $StoreRootOverride)
    $path = Resolve-MaterializationPath -Root $Root -Stores $stores -Ref $MaterializationRef
    $record = Read-JsonFile -Path $path
    return [pscustomobject]@{
        ok = $true
        command = "read"
        materialization_path = $path
        materialization = $record
        validation = (Test-Materialization -Materialization $record)
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
    Write-Host "AIWorkflow Studio Materialization Review"
    Write-Host "============================================================"
    Write-Host "Command: $($Result.command)"
    if ($Result.materialization_id) { Write-Host "Materialization: $($Result.materialization_id)" }
    if ($Result.decision_type) { Write-Host "Decision: $($Result.decision_type)" }
    if ($Result.decisions) {
        Write-List -Label "Planned decisions" -Items ($Result.decisions | ForEach-Object { "$($_.decision_id): $($_.decision_type) $($_.target_ref)" })
    }
    if ($Result.decision_paths) {
        Write-List -Label "Decision paths" -Items $Result.decision_paths
    }
    if ($Result.errors) {
        Write-List -Label "Errors" -Items $Result.errors
    }
    Write-List -Label "Safety" -Items @(
        "Decision record only when --execute is explicit",
        "No task, canon, source, git, or LLM change"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_materialization_review.bat status|list|read <materialization_id_or_json>|plan <materialization_id_or_json> --decision approve|reject|defer|request_changes|accept_concerns [--target all|record_id] [--reason text]|record <materialization_id_or_json> --decision <type> [--target all|record_id] [--reason text] [--execute] [--store-root _Temp\\...] [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storeRootOverride = ""
    $decisionType = "approve"
    $target = "all"
    $reason = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--store-root") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--store-root requires a path argument." }
            $index += 1
            $storeRootOverride = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--decision") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--decision requires a value." }
            $index += 1
            $decisionType = ([string]$CommandArgs[$index]).ToLowerInvariant()
        } elseif ($arg -ieq "--target") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--target requires a value." }
            $index += 1
            $target = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--reason") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--reason requires a value." }
            $index += 1
            $reason = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add($arg)
        }
    }

    if ($cleanArgs.Count -lt 1) {
        $result = New-UsageResult
    } else {
        $command = ([string]$cleanArgs[0]).ToLowerInvariant()
        if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
            $result = New-StatusResult -Root $repo -StoreRootOverride $storeRootOverride
        } elseif ($command -eq "list" -and $cleanArgs.Count -eq 1) {
            $result = New-ListResult -Root $repo -StoreRootOverride $storeRootOverride
        } elseif ($command -eq "read" -and $cleanArgs.Count -eq 2) {
            $result = New-ReadResult -Root $repo -StoreRootOverride $storeRootOverride -MaterializationRef ([string]$cleanArgs[1])
        } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
            $result = New-PlanDecisionResult -Root $repo -StoreRootOverride $storeRootOverride -MaterializationRef ([string]$cleanArgs[1]) -DecisionType $decisionType -Target $target -Reason $reason
        } elseif ($command -eq "record" -and $cleanArgs.Count -eq 2) {
            $result = New-RecordDecisionResult -Root $repo -StoreRootOverride $storeRootOverride -MaterializationRef ([string]$cleanArgs[1]) -DecisionType $decisionType -Target $target -Reason $reason -Execute $execute
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
