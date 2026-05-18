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
    param(
        [bool]$ProposalWritten = $false,
        [bool]$DecisionWritten = $false
    )

    return [pscustomobject]@{
        read_only = (-not $ProposalWritten -and -not $DecisionWritten)
        proposal_written = $ProposalWritten
        decision_written = $DecisionWritten
        memory_written = $false
        canon_written = $false
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

function Get-StorePaths {
    param(
        [string]$Root,
        [string]$StoreRootOverride
    )

    if ([string]::IsNullOrWhiteSpace($StoreRootOverride)) {
        $base = Join-Path $Root "_Docs\AIWorkflow\Studio"
        return [pscustomobject]@{
            root = $base
            proposals = Join-Path $base "Proposals"
            decisions = Join-Path $base "Decisions"
        }
    }

    $resolved = Get-FullPathNoResolve -Root $Root -Path $StoreRootOverride
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--store-root override is only allowed under _Temp for validation safety: $resolved"
    }

    return [pscustomobject]@{
        root = $resolved
        proposals = Join-Path $resolved "Proposals"
        decisions = Join-Path $resolved "Decisions"
    }
}

function Get-JsonFiles {
    param(
        [string]$Path,
        [string]$Pattern
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }
    return @(Get-ChildItem -LiteralPath $Path -Filter $Pattern -File | Sort-Object Name)
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

function Test-Proposal {
    param([object]$Proposal)

    $errors = New-StringList
    $warnings = New-StringList
    $required = @("proposal_id", "source_agent_id", "source_type", "source_ref", "title", "summary", "rationale", "options", "risks", "dependencies", "approval_items", "evidence_refs", "status")
    foreach ($field in $required) {
        if (-not (Test-HasProperty -Value $Proposal -Name $field)) {
            Add-Message -List $errors -Message "Missing required field: $field"
        }
    }
    $id = [string]$Proposal.proposal_id
    if ($id -notmatch "^PROP-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "proposal_id must match PROP-YYYYMMDD-HHMMSS-slug."
    }
    if (@("draft", "submitted", "accepted", "rejected", "superseded") -notcontains ([string]$Proposal.status)) {
        Add-Message -List $errors -Message "Invalid proposal status: $($Proposal.status)"
    }
    if (@("meeting", "role_run_output", "director_goal", "manual", "follow_up") -notcontains ([string]$Proposal.source_type)) {
        Add-Message -List $errors -Message "Invalid source_type: $($Proposal.source_type)"
    }
    if (@($Proposal.options).Count -eq 0) {
        Add-Message -List $warnings -Message "Proposal has no options; Director comparison may be weak."
    }
    if (@(Get-StringArray -Value $Proposal.approval_items).Count -eq 0) {
        Add-Message -List $warnings -Message "Proposal has no approval_items."
    }
    if (@(Get-StringArray -Value $Proposal.evidence_refs).Count -eq 0) {
        Add-Message -List $warnings -Message "Proposal has no evidence_refs."
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        proposal_id = $id
        status = [string]$Proposal.status
        errors = $errors.ToArray()
        warnings = $warnings.ToArray()
    }
}

function Get-ProposalIds {
    param([string]$ProposalStore)

    $ids = @{}
    foreach ($file in (Get-JsonFiles -Path $ProposalStore -Pattern "PROP-*.json")) {
        try {
            $proposal = Read-JsonFile -Path $file.FullName
            $id = [string]$proposal.proposal_id
            if (-not [string]::IsNullOrWhiteSpace($id)) {
                $ids[$id] = $file.FullName
            }
        } catch {
        }
    }
    return $ids
}

function Test-Decision {
    param(
        [object]$Decision,
        [hashtable]$ProposalIds
    )

    $errors = New-StringList
    $warnings = New-StringList
    $required = @("decision_id", "decision_maker", "decision_type", "target_ref", "decision_summary", "accepted_scope", "rejected_scope", "conditions", "timestamp", "evidence_refs")
    foreach ($field in $required) {
        if (-not (Test-HasProperty -Value $Decision -Name $field)) {
            Add-Message -List $errors -Message "Missing required field: $field"
        }
    }
    $id = [string]$Decision.decision_id
    $type = [string]$Decision.decision_type
    $target = [string]$Decision.target_ref
    if ($id -notmatch "^DEC-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
        Add-Message -List $errors -Message "decision_id must match DEC-YYYYMMDD-HHMMSS-slug."
    }
    if (@("human_director", "delegated_policy") -notcontains ([string]$Decision.decision_maker)) {
        Add-Message -List $errors -Message "Invalid decision_maker: $($Decision.decision_maker)"
    }
    if (@("approve", "reject", "defer", "request_changes", "accept_concerns", "canonize") -notcontains $type) {
        Add-Message -List $errors -Message "Invalid decision_type: $type"
    }
    if ($type -eq "canonize" -and ([string]$Decision.decision_maker) -ne "human_director") {
        Add-Message -List $errors -Message "decision_type=canonize requires decision_maker=human_director."
    }
    if (($type -eq "approve" -or $type -eq "canonize" -or $type -eq "accept_concerns") -and @(Get-StringArray -Value $Decision.accepted_scope).Count -eq 0) {
        Add-Message -List $errors -Message "$type decision requires accepted_scope."
    }
    if ($type -eq "reject" -and @(Get-StringArray -Value $Decision.rejected_scope).Count -eq 0) {
        Add-Message -List $errors -Message "reject decision requires rejected_scope."
    }
    if ($type -eq "request_changes" -and @(Get-StringArray -Value $Decision.conditions).Count -eq 0) {
        Add-Message -List $warnings -Message "request_changes should include concrete conditions."
    }
    if ($target -match "^PROP-" -and $null -ne $ProposalIds -and -not $ProposalIds.ContainsKey($target)) {
        Add-Message -List $warnings -Message "target_ref proposal is not stored in the proposal store: $target"
    }
    if ((Get-StringArray -Value $Decision.evidence_refs) -notcontains $target) {
        Add-Message -List $warnings -Message "evidence_refs should include target_ref."
    }
    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        decision_id = $id
        decision_type = $type
        target_ref = $target
        errors = $errors.ToArray()
        warnings = $warnings.ToArray()
    }
}

function New-StatusResult {
    param([object]$Stores)

    return [pscustomobject]@{
        ok = $true
        command = "status"
        proposal_store = $Stores.proposals
        decision_store = $Stores.decisions
        proposal_count = @(Get-JsonFiles -Path $Stores.proposals -Pattern "PROP-*.json").Count
        decision_count = @(Get-JsonFiles -Path $Stores.decisions -Pattern "DEC-*.json").Count
        safety = New-SafetyState
    }
}

function New-ListResult {
    param(
        [object]$Stores,
        [string]$Kind
    )

    $items = @()
    if ($Kind -eq "proposal") {
        foreach ($file in (Get-JsonFiles -Path $Stores.proposals -Pattern "PROP-*.json")) {
            try {
                $proposal = Read-JsonFile -Path $file.FullName
                $items += [pscustomobject]@{
                    id = [string]$proposal.proposal_id
                    status = [string]$proposal.status
                    title = [string]$proposal.title
                    summary = Limit-Text -Text ([string]$proposal.summary) -Max 140
                    file = $file.Name
                }
            } catch {
                $items += [pscustomobject]@{ id = "(parse failed)"; status = "invalid"; title = ""; summary = $_.Exception.Message; file = $file.Name }
            }
        }
    } else {
        foreach ($file in (Get-JsonFiles -Path $Stores.decisions -Pattern "DEC-*.json")) {
            try {
                $decision = Read-JsonFile -Path $file.FullName
                $items += [pscustomobject]@{
                    id = [string]$decision.decision_id
                    status = [string]$decision.decision_type
                    title = [string]$decision.target_ref
                    summary = Limit-Text -Text ([string]$decision.decision_summary) -Max 140
                    file = $file.Name
                }
            } catch {
                $items += [pscustomobject]@{ id = "(parse failed)"; status = "invalid"; title = ""; summary = $_.Exception.Message; file = $file.Name }
            }
        }
    }
    return [pscustomobject]@{
        ok = $true
        command = "list-$Kind"
        items = @($items)
        safety = New-SafetyState
    }
}

function New-ReadResult {
    param(
        [object]$Stores,
        [string]$Kind,
        [string]$Id
    )

    $path = if ($Kind -eq "proposal") { Join-Path $Stores.proposals ($Id + ".json") } else { Join-Path $Stores.decisions ($Id + ".json") }
    if (-not (Test-Path -LiteralPath $path)) {
        return [pscustomobject]@{
            ok = $false
            command = "read-$Kind"
            error = "$Kind not found: $Id"
            safety = New-SafetyState
        }
    }
    $record = Read-JsonFile -Path $path
    $proposalIds = Get-ProposalIds -ProposalStore $Stores.proposals
    $validation = if ($Kind -eq "proposal") { Test-Proposal -Proposal $record } else { Test-Decision -Decision $record -ProposalIds $proposalIds }
    return [pscustomobject]@{
        ok = $validation.ok
        command = "read-$Kind"
        path = $path
        record = $record
        validation = $validation
        safety = New-SafetyState
    }
}

function New-ValidateResult {
    param([object]$Stores)

    $validations = @()
    $errorCount = 0
    $warningCount = 0
    $proposalIds = Get-ProposalIds -ProposalStore $Stores.proposals
    foreach ($file in (Get-JsonFiles -Path $Stores.proposals -Pattern "PROP-*.json")) {
        try {
            $validation = Test-Proposal -Proposal (Read-JsonFile -Path $file.FullName)
            $validations += [pscustomobject]@{ kind = "proposal"; file = $file.Name; validation = $validation }
            $errorCount += @($validation.errors).Count
            $warningCount += @($validation.warnings).Count
        } catch {
            $errorCount += 1
            $validations += [pscustomobject]@{ kind = "proposal"; file = $file.Name; validation = [pscustomobject]@{ ok = $false; errors = @($_.Exception.Message); warnings = @() } }
        }
    }
    foreach ($file in (Get-JsonFiles -Path $Stores.decisions -Pattern "DEC-*.json")) {
        try {
            $validation = Test-Decision -Decision (Read-JsonFile -Path $file.FullName) -ProposalIds $proposalIds
            $validations += [pscustomobject]@{ kind = "decision"; file = $file.Name; validation = $validation }
            $errorCount += @($validation.errors).Count
            $warningCount += @($validation.warnings).Count
        } catch {
            $errorCount += 1
            $validations += [pscustomobject]@{ kind = "decision"; file = $file.Name; validation = [pscustomobject]@{ ok = $false; errors = @($_.Exception.Message); warnings = @() } }
        }
    }
    return [pscustomobject]@{
        ok = ($errorCount -eq 0)
        command = "validate"
        proposal_store = $Stores.proposals
        decision_store = $Stores.decisions
        error_count = $errorCount
        warning_count = $warningCount
        validations = @($validations)
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [object]$Stores,
        [string]$Root,
        [string]$Kind,
        [string]$InputPath,
        [bool]$Execute
    )

    $path = Resolve-RepoFilePath -Root $Root -Path $InputPath
    $record = Read-JsonFile -Path $path
    $proposalIds = Get-ProposalIds -ProposalStore $Stores.proposals
    $validation = if ($Kind -eq "proposal") { Test-Proposal -Proposal $record } else { Test-Decision -Decision $record -ProposalIds $proposalIds }
    $id = if ($Kind -eq "proposal") { [string]$record.proposal_id } else { [string]$record.decision_id }
    $store = if ($Kind -eq "proposal") { $Stores.proposals } else { $Stores.decisions }
    $target = Join-Path $store ($id + ".json")

    if (-not $validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "create-$Kind"
            execute = $Execute
            input_path = $path
            target_path = $target
            validation = $validation
            safety = New-SafetyState
        }
    }
    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "create-$Kind"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create-$Kind <json_path> --execute to store the record."
            input_path = $path
            target_path = $target
            record = $record
            validation = $validation
            safety = New-SafetyState
        }
    }
    if (Test-Path -LiteralPath $target) {
        throw "$Kind already exists in store: $target"
    }
    if (-not (Test-Path -LiteralPath $store)) {
        New-Item -ItemType Directory -Path $store -Force | Out-Null
    }
    $json = ($record | ConvertTo-Json -Depth 64) + [Environment]::NewLine
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($target, $json, $encoding)
    return [pscustomobject]@{
        ok = $true
        command = "create-$Kind"
        execute = $true
        target_path = $target
        record = $record
        validation = $validation
        safety = if ($Kind -eq "proposal") { New-SafetyState -ProposalWritten $true } else { New-SafetyState -DecisionWritten $true }
    }
}

function New-CanonPlanResult {
    param(
        [object]$Stores,
        [string]$Root,
        [string]$DecisionRef
    )

    $decision = $null
    $path = $DecisionRef
    if ($DecisionRef -match "^DEC-") {
        $path = Join-Path $Stores.decisions ($DecisionRef + ".json")
    } else {
        $path = Resolve-RepoFilePath -Root $Root -Path $DecisionRef
    }
    $decision = Read-JsonFile -Path $path
    $proposalIds = Get-ProposalIds -ProposalStore $Stores.proposals
    $validation = Test-Decision -Decision $decision -ProposalIds $proposalIds
    $recommendedMemoryStatus = "approved"
    $notes = @("Decision is not memory. Use the memory store to create MemoryRecord separately.")
    if ([string]$decision.decision_type -eq "canonize") {
        $recommendedMemoryStatus = "canon"
        $notes += "Canon MemoryRecord must cite $($decision.decision_id) in source_refs."
    } elseif ([string]$decision.decision_type -eq "reject") {
        $recommendedMemoryStatus = "rejected"
        $notes += "Rejected MemoryRecord should preserve the rejected idea and reason."
    }
    return [pscustomobject]@{
        ok = $validation.ok
        command = "canon-plan"
        decision_path = $path
        decision_id = [string]$decision.decision_id
        decision_type = [string]$decision.decision_type
        target_ref = [string]$decision.target_ref
        recommended_memory_status = $recommendedMemoryStatus
        accepted_scope = Get-StringArray -Value $decision.accepted_scope
        rejected_scope = Get-StringArray -Value $decision.rejected_scope
        conditions = Get-StringArray -Value $decision.conditions
        validation = $validation
        notes = @($notes)
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
    Write-Host "AIWorkflow Studio Proposal/Decision Store"
    Write-Host "============================================================"
    Write-Host "Proposals: $($Result.proposal_count)"
    Write-Host "Decisions: $($Result.decision_count)"
    Write-Host "Proposal store: $($Result.proposal_store)"
    Write-Host "Decision store: $($Result.decision_store)"
}

function Show-ListResult {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio $($Result.command)"
    Write-Host "============================================================"
    foreach ($item in @($Result.items)) {
        Write-Host ""
        Write-Host "$($item.id) [$($item.status)]"
        Write-Host "- title/target: $($item.title)"
        Write-Host "- summary: $($item.summary)"
        Write-Host "- file: $($item.file)"
    }
    if (@($Result.items).Count -eq 0) {
        Write-Host "No records found."
    }
}

function Show-Record {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        return
    }
    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio $($Result.command)"
    Write-Host "============================================================"
    Write-Host "Path: $($Result.path)"
    Write-Host "- ok: $($Result.validation.ok)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function Show-Create {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio $($Result.command)"
    Write-Host "============================================================"
    if (-not $Result.ok) {
        Write-Host "[ERROR] Validation failed."
    } elseif ($Result.execute) {
        Write-Host "Stored: $($Result.target_path)"
    } else {
        Write-Host "Mode: dry-run"
        Write-Host $Result.message
        Write-Host "Target: $($Result.target_path)"
    }
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    Write-List -Label "Safety" -Items @(
        "proposal written: $($Result.safety.proposal_written)",
        "decision written: $($Result.safety.decision_written)",
        "memory/canon not written",
        "task state not changed",
        "source not changed",
        "git not changed"
    )
}

function Show-Validate {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Proposal/Decision Validation"
    Write-Host "============================================================"
    Write-Host "Errors/warnings: $($Result.error_count) / $($Result.warning_count)"
    foreach ($item in @($Result.validations)) {
        $state = if ($item.validation.ok) { "PASS" } else { "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($item.kind) $($item.file)"
        foreach ($err in @($item.validation.errors)) { Write-Host "- error: $err" }
        foreach ($warn in @($item.validation.warnings)) { Write-Host "- warning: $warn" }
    }
}

function Show-CanonPlan {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Canon/Memory Plan"
    Write-Host "============================================================"
    Write-Host "Decision: $($Result.decision_id) [$($Result.decision_type)]"
    Write-Host "Target: $($Result.target_ref)"
    Write-Host "Recommended memory status: $($Result.recommended_memory_status)"
    Write-List -Label "Accepted scope" -Items $Result.accepted_scope
    Write-List -Label "Rejected scope" -Items $Result.rejected_scope
    Write-List -Label "Conditions" -Items $Result.conditions
    Write-List -Label "Notes" -Items $Result.notes
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_decision_store.bat status|validate|list-proposals|list-decisions|read-proposal <id>|read-decision <id>|create-proposal <json> [--execute]|create-decision <json> [--execute]|canon-plan <decision_id_or_json> [--store-root _Temp\\...] [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $storeRootOverride = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--store-root") {
            if ($index + 1 -ge @($CommandArgs).Count) {
                throw "--store-root requires a path argument."
            }
            $index += 1
            $storeRootOverride = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add([string]$arg)
        }
    }

    if ($cleanArgs.Count -eq 0) {
        $cleanArgs.Add("status")
    }
    $command = ([string]$cleanArgs[0]).ToLowerInvariant()
    $stores = Get-StorePaths -Root $repo -StoreRootOverride $storeRootOverride

    if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
        $result = New-StatusResult -Stores $stores
    } elseif ($command -eq "validate" -and $cleanArgs.Count -eq 1) {
        $result = New-ValidateResult -Stores $stores
    } elseif ($command -eq "list-proposals" -and $cleanArgs.Count -eq 1) {
        $result = New-ListResult -Stores $stores -Kind "proposal"
    } elseif ($command -eq "list-decisions" -and $cleanArgs.Count -eq 1) {
        $result = New-ListResult -Stores $stores -Kind "decision"
    } elseif ($command -eq "read-proposal" -and $cleanArgs.Count -eq 2) {
        $result = New-ReadResult -Stores $stores -Kind "proposal" -Id ([string]$cleanArgs[1])
    } elseif ($command -eq "read-decision" -and $cleanArgs.Count -eq 2) {
        $result = New-ReadResult -Stores $stores -Kind "decision" -Id ([string]$cleanArgs[1])
    } elseif ($command -eq "create-proposal" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Stores $stores -Root $repo -Kind "proposal" -InputPath ([string]$cleanArgs[1]) -Execute $execute
    } elseif ($command -eq "create-decision" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Stores $stores -Root $repo -Kind "decision" -InputPath ([string]$cleanArgs[1]) -Execute $execute
    } elseif ($command -eq "canon-plan" -and $cleanArgs.Count -eq 2) {
        $result = New-CanonPlanResult -Stores $stores -Root $repo -DecisionRef ([string]$cleanArgs[1])
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
    } elseif ($command -eq "list-proposals" -or $command -eq "list-decisions") {
        Show-ListResult -Result $result
    } elseif ($command -eq "read-proposal" -or $command -eq "read-decision") {
        Show-Record -Result $result
    } elseif ($command -eq "create-proposal" -or $command -eq "create-decision") {
        Show-Create -Result $result
    } elseif ($command -eq "canon-plan") {
        Show-CanonPlan -Result $result
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
