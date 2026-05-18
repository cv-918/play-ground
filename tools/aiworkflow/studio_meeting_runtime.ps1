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
    param([bool]$MeetingWritten = $false)

    return [pscustomobject]@{
        read_only = (-not $MeetingWritten)
        meeting_written = $MeetingWritten
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

function Write-JsonFile {
    param(
        [string]$Path,
        [object]$Value
    )

    $json = ($Value | ConvertTo-Json -Depth 64) + [Environment]::NewLine
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
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

function Get-DefaultStorePath {
    param([string]$Root)

    return (Join-Path $Root "_Docs\AIWorkflow\Studio\MeetingSessions")
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

function Get-MeetingFiles {
    param([string]$StorePath)

    if (-not (Test-Path -LiteralPath $StorePath)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $StorePath -Filter "*.json" -File | Sort-Object Name)
}

function Resolve-MeetingInput {
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

    throw "MeetingSession not found as file path or stored meeting id: $InputValue"
}

function Resolve-StoredMeetingPath {
    param(
        [string]$StorePath,
        [string]$MeetingId
    )

    $stored = Join-Path $StorePath ($MeetingId + ".json")
    if (-not (Test-Path -LiteralPath $stored)) {
        throw "Stored MeetingSession not found: $MeetingId"
    }
    return (Resolve-Path -LiteralPath $stored).Path
}

function Assert-ValidMeetingStatus {
    param([string]$Status)

    $statuses = @("draft", "scheduled", "context_loaded", "in_progress", "director_decision_needed", "follow_up_tasking", "closed", "blocked", "cancelled")
    if ($statuses -notcontains $Status) {
        throw "Invalid meeting status: $Status"
    }
}

function Assert-ValidTurnType {
    param([string]$TurnType)

    $types = @("brief", "proposal", "objection", "question", "answer", "synthesis", "decision_note")
    if ($types -notcontains $TurnType) {
        throw "Invalid turn_type: $TurnType"
    }
}

function Get-NextTurnId {
    param([object]$Meeting)

    $max = 0
    foreach ($turn in @($Meeting.discussion_turns)) {
        $turnId = [string]$turn.turn_id
        if ($turnId -match "^turn-([0-9]+)$") {
            $value = [int]$Matches[1]
            if ($value -gt $max) { $max = $value }
        }
    }
    return ("turn-{0:000}" -f ($max + 1))
}

function Add-ArrayItem {
    param(
        [object]$Target,
        [string]$PropertyName,
        [object]$Item
    )

    $items = @()
    if ($null -ne $Target.PSObject.Properties[$PropertyName]) {
        $items = @($Target.$PropertyName)
    }
    $items += $Item
    if ($null -ne $Target.PSObject.Properties[$PropertyName]) {
        $Target.PSObject.Properties[$PropertyName].Value = @($items)
    } else {
        $Target | Add-Member -MemberType NoteProperty -Name $PropertyName -Value @($items)
    }
}

function New-MeetingSummary {
    param(
        [object]$Meeting,
        [string]$Path
    )

    [string[]]$participants = @(Get-StringArray -Value $Meeting.participants)
    [string[]]$followUps = @(Get-StringArray -Value $Meeting.follow_up_workorders)

    return [pscustomobject]@{
        meeting_id = [string]$Meeting.meeting_id
        topic = [string]$Meeting.topic
        meeting_type = [string]$Meeting.meeting_type
        status = [string]$Meeting.status
        chair_agent_id = [string]$Meeting.chair_agent_id
        participants = $participants
        proposal_count = @(Get-StringArray -Value $Meeting.proposals).Count
        objection_count = @(Get-StringArray -Value $Meeting.objections).Count
        unresolved_question_count = @(Get-StringArray -Value $Meeting.unresolved_questions).Count
        director_decision_count = @(Get-StringArray -Value $Meeting.director_decisions).Count
        follow_up_workorders = $followUps
        topic_preview = (Limit-Text -Text ([string]$Meeting.topic) -Max 120)
        path = $Path
    }
}

function Test-MeetingSession {
    param(
        [object]$Meeting,
        [string]$Path,
        [hashtable]$StaffIds,
        [hashtable]$SeenIds
    )

    $errors = @()
    $warnings = @()

    $required = @(
        "meeting_id",
        "topic",
        "meeting_type",
        "participants",
        "chair_agent_id",
        "director_user_id",
        "agenda",
        "known_constraints",
        "loaded_context_refs",
        "discussion_turns",
        "proposals",
        "objections",
        "unresolved_questions",
        "director_decisions",
        "accepted_directions",
        "rejected_directions",
        "follow_up_workorders",
        "minutes_artifact",
        "status"
    )

    foreach ($name in $required) {
        if (-not (Test-HasProperty -Value $Meeting -Name $name)) {
            $errors += "Missing required field: $name"
        } elseif ([string]::IsNullOrWhiteSpace([string]$Meeting.$name) -and $name -notin @("participants", "agenda", "known_constraints", "loaded_context_refs", "discussion_turns", "proposals", "objections", "unresolved_questions", "director_decisions", "accepted_directions", "rejected_directions", "follow_up_workorders")) {
            $errors += "Required field is empty: $name"
        }
    }

    $meetingId = [string]$Meeting.meeting_id
    if (-not [string]::IsNullOrWhiteSpace($meetingId)) {
        if ($meetingId -notmatch "^MEET-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
            $errors += "meeting_id must match MEET-YYYYMMDD-HHMMSS-slug, with lowercase letters, numbers, and hyphens."
        }
        if ($null -ne $SeenIds) {
            if ($SeenIds.ContainsKey($meetingId)) {
                $errors += "Duplicate meeting_id also found at: $($SeenIds[$meetingId])"
            } else {
                $SeenIds[$meetingId] = $Path
            }
        }
    }

    $types = @("creative", "technical", "production", "review", "qa_triage", "postmortem", "release_readiness")
    $statuses = @("draft", "scheduled", "context_loaded", "in_progress", "director_decision_needed", "follow_up_tasking", "closed", "blocked", "cancelled")

    if ($types -notcontains ([string]$Meeting.meeting_type)) {
        $errors += "Invalid meeting_type: $($Meeting.meeting_type)"
    }
    if ($statuses -notcontains ([string]$Meeting.status)) {
        $errors += "Invalid status: $($Meeting.status)"
    }

    $participants = Get-StringArray -Value $Meeting.participants
    if (@($participants).Count -eq 0) {
        $errors += "participants must contain at least one staff agent."
    }
    foreach ($participant in $participants) {
        if (-not $StaffIds.ContainsKey($participant)) {
            $warnings += "participant is not in staff registry: $participant"
        }
    }

    $chair = [string]$Meeting.chair_agent_id
    if (-not [string]::IsNullOrWhiteSpace($chair)) {
        if (-not $StaffIds.ContainsKey($chair)) {
            $warnings += "chair_agent_id is not in staff registry: $chair"
        }
        if ($participants -notcontains $chair) {
            $errors += "chair_agent_id must be included in participants."
        }
    }

    foreach ($turn in @($Meeting.discussion_turns)) {
        $turnId = [string]$turn.turn_id
        $speaker = [string]$turn.speaker_id
        $turnType = [string]$turn.turn_type
        $content = [string]$turn.content

        if ([string]::IsNullOrWhiteSpace($turnId)) {
            $errors += "discussion_turns contains a turn without turn_id."
        }
        if ([string]::IsNullOrWhiteSpace($speaker)) {
            $errors += "discussion_turn $turnId has no speaker_id."
        } elseif ($participants -notcontains $speaker -and $speaker -ne [string]$Meeting.director_user_id) {
            $warnings += "discussion_turn $turnId speaker is not a participant: $speaker"
        }
        if (@("brief", "proposal", "objection", "question", "answer", "synthesis", "decision_note") -notcontains $turnType) {
            $errors += "discussion_turn $turnId has invalid turn_type: $turnType"
        }
        if ([string]::IsNullOrWhiteSpace($content)) {
            $errors += "discussion_turn $turnId has empty content."
        }
    }

    $followUps = Get-StringArray -Value $Meeting.follow_up_workorders
    foreach ($workOrderId in $followUps) {
        if ($workOrderId -notmatch "^WO-[0-9]{8}-[0-9]{6}-[a-z0-9][a-z0-9-]*$") {
            $warnings += "follow_up_workorders contains a non-standard WorkOrder id: $workOrderId"
        }
    }

    $status = [string]$Meeting.status
    if ($status -eq "follow_up_tasking" -and @($followUps).Count -eq 0) {
        $errors += "status=follow_up_tasking requires at least one follow_up_workorders entry."
    }
    if ($status -eq "director_decision_needed" -and @(Get-StringArray -Value $Meeting.unresolved_questions).Count -eq 0) {
        $warnings += "status=director_decision_needed should explain unresolved_questions."
    }
    if ($status -eq "closed" -and @(Get-StringArray -Value $Meeting.unresolved_questions).Count -gt 0) {
        $warnings += "closed meeting still has unresolved_questions."
    }
    if (@(Get-StringArray -Value $Meeting.proposals).Count -gt 0 -and @(Get-StringArray -Value $Meeting.director_decisions).Count -eq 0) {
        $warnings += "Meeting has proposals but no director_decisions. Treat proposals as unapproved."
    }

    return [pscustomobject]@{
        ok = (@($errors).Count -eq 0)
        meeting_id = $meetingId
        status = [string]$Meeting.status
        meeting_type = [string]$Meeting.meeting_type
        path = $Path
        errors = @($errors)
        warnings = @($warnings)
    }
}

function Read-StoreMeetings {
    param(
        [string]$StorePath,
        [hashtable]$StaffIds
    )

    $records = @()
    $validations = @()
    $seen = @{}

    foreach ($file in (Get-MeetingFiles -StorePath $StorePath)) {
        try {
            $meeting = Read-JsonFile -Path $file.FullName
            $validation = Test-MeetingSession -Meeting $meeting -Path $file.FullName -StaffIds $StaffIds -SeenIds $seen
            $records += [pscustomobject]@{
                meeting = $meeting
                path = $file.FullName
                validation = $validation
            }
            $validations += $validation
        } catch {
            $validations += [pscustomobject]@{
                ok = $false
                meeting_id = ""
                status = ""
                meeting_type = ""
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

function New-StoreStats {
    param([object[]]$Records)

    $byStatus = @{}
    $byType = @{}
    foreach ($item in @($Records)) {
        $status = [string]$item.meeting.status
        $type = [string]$item.meeting.meeting_type
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
    $store = Read-StoreMeetings -StorePath $StorePath -StaffIds $staffIds
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
        meeting_count = @($store.records).Count
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
    $store = Read-StoreMeetings -StorePath $StorePath -StaffIds $staffIds
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
        meeting_count = @($store.records).Count
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

    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreMeetings -StorePath $StorePath -StaffIds $staffIds
    $items = @()
    foreach ($item in @($store.records)) {
        $items += (New-MeetingSummary -Meeting $item.meeting -Path $item.path)
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
        [string]$MeetingId
    )

    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreMeetings -StorePath $StorePath -StaffIds $staffIds
    foreach ($item in @($store.records)) {
        if ([string]$item.meeting.meeting_id -eq $MeetingId) {
            return [pscustomobject]@{
                ok = $true
                command = "read"
                store_path = $StorePath
                meeting_id = $MeetingId
                meeting = $item.meeting
                summary = (New-MeetingSummary -Meeting $item.meeting -Path $item.path)
                validation = $item.validation
                safety = New-SafetyState
            }
        }
    }

    return [pscustomobject]@{
        ok = $false
        command = "read"
        store_path = $StorePath
        meeting_id = $MeetingId
        error = "MeetingSession not found: $MeetingId"
        safety = New-SafetyState
    }
}

function New-InspectResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MeetingInput
    )

    $path = Resolve-MeetingInput -Root $Root -StorePath $StorePath -InputValue $MeetingInput
    $meeting = Read-JsonFile -Path $path
    $staffIds = Read-StaffIdSet -Root $Root
    $validation = Test-MeetingSession -Meeting $meeting -Path $path -StaffIds $staffIds -SeenIds $null

    return [pscustomobject]@{
        ok = $validation.ok
        command = "inspect"
        input = $MeetingInput
        path = $path
        summary = (New-MeetingSummary -Meeting $meeting -Path $path)
        validation = $validation
        safety = New-SafetyState
    }
}

function New-HandoffResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MeetingInput
    )

    $inspect = New-InspectResult -Root $Root -StorePath $StorePath -MeetingInput $MeetingInput
    $meeting = Read-JsonFile -Path $inspect.path
    [string[]]$followUps = @(Get-StringArray -Value $meeting.follow_up_workorders)
    $blockedBy = @()
    if (@(Get-StringArray -Value $meeting.unresolved_questions).Count -gt 0 -and @(Get-StringArray -Value $meeting.director_decisions).Count -eq 0) {
        $blockedBy += "Human Director decision is still needed before treating meeting proposals as approved."
    }
    if (-not $inspect.validation.ok) {
        $blockedBy += "MeetingSession validation has errors."
    }

    return [pscustomobject]@{
        ok = $inspect.validation.ok
        command = "handoff"
        handoff_ready = (@($blockedBy).Count -eq 0)
        input = $MeetingInput
        meeting_id = $inspect.summary.meeting_id
        topic = $inspect.summary.topic
        follow_up_workorders = $followUps
        accepted_directions = (Get-StringArray -Value $meeting.accepted_directions)
        rejected_directions = (Get-StringArray -Value $meeting.rejected_directions)
        unresolved_questions = (Get-StringArray -Value $meeting.unresolved_questions)
        director_decisions = (Get-StringArray -Value $meeting.director_decisions)
        blocked_by = $blockedBy
        next_actions = @(
            "Review unresolved questions before using proposals as approved direction.",
            "Create or inspect the listed WorkOrder JSON files.",
            "Use studio_workorder_planner.bat plan/create for approved WorkOrders only."
        )
        validation = $inspect.validation
        safety = New-SafetyState
    }
}

function New-CreateResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MeetingPath,
        [bool]$Execute
    )

    $inputPath = Resolve-RepoFilePath -Root $Root -Path $MeetingPath
    $meeting = Read-JsonFile -Path $inputPath
    $staffIds = Read-StaffIdSet -Root $Root
    $store = Read-StoreMeetings -StorePath $StorePath -StaffIds $staffIds
    $existing = @{}
    foreach ($item in @($store.records)) {
        $existing[[string]$item.meeting.meeting_id] = $item.path
    }
    $validation = Test-MeetingSession -Meeting $meeting -Path $inputPath -StaffIds $staffIds -SeenIds $null
    $meetingId = [string]$meeting.meeting_id
    if (-not [string]::IsNullOrWhiteSpace($meetingId) -and $existing.ContainsKey($meetingId)) {
        $errors = @($validation.errors)
        $errors += "meeting_id already exists in store: $($existing[$meetingId])"
        $validation = [pscustomobject]@{
            ok = $false
            meeting_id = $meetingId
            status = [string]$meeting.status
            meeting_type = [string]$meeting.meeting_type
            path = $inputPath
            errors = @($errors)
            warnings = @($validation.warnings)
        }
    }

    $targetPath = ""
    if (-not [string]::IsNullOrWhiteSpace($meetingId)) {
        $targetPath = Join-Path $StorePath ($meetingId + ".json")
    }

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $validation.ok
            command = "create"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with create <meeting_json_path> --execute to write a MeetingSession."
            meeting_id = $meetingId
            input_path = $inputPath
            target_path = $targetPath
            summary = (New-MeetingSummary -Meeting $meeting -Path $inputPath)
            validation = $validation
            safety = New-SafetyState
        }
    }

    if (-not $validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "create"
            execute = $true
            meeting_id = $meetingId
            input_path = $inputPath
            target_path = $targetPath
            error = "MeetingSession validation failed. Nothing was written."
            summary = (New-MeetingSummary -Meeting $meeting -Path $inputPath)
            validation = $validation
            safety = New-SafetyState
        }
    }

    if (-not (Test-Path -LiteralPath $StorePath)) {
        New-Item -ItemType Directory -Path $StorePath -Force | Out-Null
    }

    $jsonText = $meeting | ConvertTo-Json -Depth 64
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($targetPath, $jsonText + [Environment]::NewLine, $utf8NoBom)

    return [pscustomobject]@{
        ok = $true
        command = "create"
        execute = $true
        meeting_id = $meetingId
        input_path = $inputPath
        target_path = $targetPath
        summary = (New-MeetingSummary -Meeting $meeting -Path $targetPath)
        validation = $validation
        safety = New-SafetyState -MeetingWritten $true
    }
}

function New-TransitionResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MeetingId,
        [string]$NextStatus,
        [bool]$Execute,
        [string]$CommandName = "transition"
    )

    Assert-ValidMeetingStatus -Status $NextStatus
    $path = Resolve-StoredMeetingPath -StorePath $StorePath -MeetingId $MeetingId
    $meeting = Read-JsonFile -Path $path
    $previousStatus = [string]$meeting.status
    if ($CommandName -eq "start" -and @("draft", "scheduled", "context_loaded") -notcontains $previousStatus) {
        return [pscustomobject]@{
            ok = $false
            command = $CommandName
            execute = $Execute
            meeting_id = $MeetingId
            previous_status = $previousStatus
            next_status = $NextStatus
            path = $path
            error = "start is allowed only from draft, scheduled, or context_loaded. Use transition for an explicit lifecycle override."
            validation = [pscustomobject]@{ errors = @(); warnings = @("No change was written.") }
            safety = New-SafetyState
        }
    }
    $meeting.status = $NextStatus

    $staffIds = Read-StaffIdSet -Root $Root
    $validation = Test-MeetingSession -Meeting $meeting -Path $path -StaffIds $staffIds -SeenIds $null

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $validation.ok
            command = $CommandName
            execute = $false
            execute_required = $true
            meeting_id = $MeetingId
            previous_status = $previousStatus
            next_status = $NextStatus
            path = $path
            validation = $validation
            safety = New-SafetyState
        }
    }

    if (-not $validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = $CommandName
            execute = $true
            meeting_id = $MeetingId
            previous_status = $previousStatus
            next_status = $NextStatus
            path = $path
            error = "Meeting transition validation failed. Nothing was written."
            validation = $validation
            safety = New-SafetyState
        }
    }

    Write-JsonFile -Path $path -Value $meeting
    return [pscustomobject]@{
        ok = $true
        command = $CommandName
        execute = $true
        meeting_id = $MeetingId
        previous_status = $previousStatus
        next_status = $NextStatus
        path = $path
        validation = $validation
        safety = New-SafetyState -MeetingWritten $true
    }
}

function New-AddTurnResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MeetingId,
        [string]$SpeakerId,
        [string]$TurnType,
        [string]$Content,
        [bool]$Execute
    )

    Assert-ValidTurnType -TurnType $TurnType
    if ([string]::IsNullOrWhiteSpace($Content)) {
        throw "add-turn requires non-empty content."
    }

    $path = Resolve-StoredMeetingPath -StorePath $StorePath -MeetingId $MeetingId
    $meeting = Read-JsonFile -Path $path
    $currentStatus = [string]$meeting.status
    if (@("closed", "blocked", "cancelled") -contains $currentStatus) {
        return [pscustomobject]@{
            ok = $false
            command = "add-turn"
            execute = $Execute
            meeting_id = $MeetingId
            turn = $null
            next_status = $currentStatus
            path = $path
            error = "Cannot add a discussion turn to a closed, blocked, or cancelled meeting."
            validation = [pscustomobject]@{ errors = @(); warnings = @("No change was written.") }
            safety = New-SafetyState
        }
    }
    $turn = [pscustomobject]@{
        turn_id = (Get-NextTurnId -Meeting $meeting)
        speaker_id = $SpeakerId
        turn_type = $TurnType
        content = $Content
        source_refs = @()
    }
    Add-ArrayItem -Target $meeting -PropertyName "discussion_turns" -Item $turn
    if ([string]$meeting.status -in @("draft", "scheduled", "context_loaded")) {
        $meeting.status = "in_progress"
    }

    $staffIds = Read-StaffIdSet -Root $Root
    $validation = Test-MeetingSession -Meeting $meeting -Path $path -StaffIds $staffIds -SeenIds $null

    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $validation.ok
            command = "add-turn"
            execute = $false
            execute_required = $true
            meeting_id = $MeetingId
            turn = $turn
            next_status = [string]$meeting.status
            path = $path
            validation = $validation
            safety = New-SafetyState
        }
    }

    if (-not $validation.ok) {
        return [pscustomobject]@{
            ok = $false
            command = "add-turn"
            execute = $true
            meeting_id = $MeetingId
            turn = $turn
            next_status = [string]$meeting.status
            path = $path
            error = "Meeting add-turn validation failed. Nothing was written."
            validation = $validation
            safety = New-SafetyState
        }
    }

    Write-JsonFile -Path $path -Value $meeting
    return [pscustomobject]@{
        ok = $true
        command = "add-turn"
        execute = $true
        meeting_id = $MeetingId
        turn = $turn
        next_status = [string]$meeting.status
        path = $path
        validation = $validation
        safety = New-SafetyState -MeetingWritten $true
    }
}

function New-FinalizeResult {
    param(
        [string]$Root,
        [string]$StorePath,
        [string]$MeetingId,
        [bool]$Execute
    )

    $path = Resolve-StoredMeetingPath -StorePath $StorePath -MeetingId $MeetingId
    $meeting = Read-JsonFile -Path $path
    $nextStatus = "closed"
    if (@(Get-StringArray -Value $meeting.unresolved_questions).Count -gt 0 -and @(Get-StringArray -Value $meeting.director_decisions).Count -eq 0) {
        $nextStatus = "director_decision_needed"
    } elseif (@(Get-StringArray -Value $meeting.follow_up_workorders).Count -gt 0) {
        $nextStatus = "follow_up_tasking"
    }

    return (New-TransitionResult -Root $Root -StorePath $StorePath -MeetingId $MeetingId -NextStatus $nextStatus -Execute $Execute -CommandName "finalize")
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
    Write-Host "AIWorkflow Studio Meeting Runtime"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Exists: $($Result.store_exists)"
    Write-Host "Meetings: $($Result.meeting_count)"
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
        "Meeting not written",
        "WorkOrder not written",
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
    Write-Host "AIWorkflow Studio Meeting Validation"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Meetings: $($Result.meeting_count)"
    Write-Host "Errors: $($Result.error_count)"
    Write-Host "Warnings: $($Result.warning_count)"
    if (@($Result.validations).Count -eq 0) {
        Write-Host ""
        Write-Host "No MeetingSession JSON files found."
        return
    }
    foreach ($validation in @($Result.validations)) {
        $state = "PASS"
        if (-not $validation.ok) { $state = "FAIL" }
        Write-Host ""
        Write-Host "[$state] $($validation.meeting_id) $($validation.meeting_type)/$($validation.status)"
        foreach ($err in @($validation.errors)) {
            Write-Host "  - error: $err"
        }
        foreach ($warn in @($validation.warnings)) {
            Write-Host "  - warning: $warn"
        }
    }
}

function Show-List {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Meeting List"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Store: $($Result.store_path)"
    Write-Host "Count: $($Result.count)"
    foreach ($item in @($Result.items)) {
        Write-Host ""
        Write-Host "$($item.meeting_id) [$($item.meeting_type)/$($item.status)]"
        Write-Host "- topic: $($item.topic_preview)"
        Write-Host "- chair: $($item.chair_agent_id)"
        Write-Host "- participants: $((Get-StringArray -Value $item.participants) -join ', ')"
        Write-Host "- follow-up WorkOrders: $((Get-StringArray -Value $item.follow_up_workorders) -join ', ')"
    }
}

function Show-Inspect {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[WARN] Meeting has validation issues."
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Meeting Inspect"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Meeting: $($Result.summary.meeting_id)"
    Write-Host "Type/status: $($Result.summary.meeting_type) / $($Result.summary.status)"
    Write-Host "Topic: $($Result.summary.topic)"
    Write-Host "Chair: $($Result.summary.chair_agent_id)"
    Write-List -Label "Participants" -Items $Result.summary.participants
    Write-List -Label "Follow-up WorkOrders" -Items $Result.summary.follow_up_workorders
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
}

function Show-Read {
    param([object]$Result)

    if (-not $Result.ok) {
        Write-Host "[ERROR] $($Result.error)"
        return
    }
    Show-Inspect -Result $Result
    Write-List -Label "Agenda" -Items $Result.meeting.agenda
    Write-List -Label "Known constraints" -Items $Result.meeting.known_constraints
    Write-List -Label "Proposals" -Items $Result.meeting.proposals
    Write-List -Label "Objections" -Items $Result.meeting.objections
    Write-List -Label "Unresolved questions" -Items $Result.meeting.unresolved_questions
    Write-List -Label "Director decisions" -Items $Result.meeting.director_decisions
    Write-List -Label "Accepted directions" -Items $Result.meeting.accepted_directions
    Write-List -Label "Rejected directions" -Items $Result.meeting.rejected_directions
}

function Show-Handoff {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Meeting Handoff"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Meeting: $($Result.meeting_id)"
    Write-Host "Topic: $($Result.topic)"
    Write-List -Label "Accepted directions" -Items $Result.accepted_directions
    Write-List -Label "Rejected directions" -Items $Result.rejected_directions
    Write-List -Label "Unresolved questions" -Items $Result.unresolved_questions
    Write-List -Label "Director decisions" -Items $Result.director_decisions
    Write-List -Label "Follow-up WorkOrders" -Items $Result.follow_up_workorders
    Write-List -Label "Blocked by" -Items $Result.blocked_by
    Write-List -Label "Next actions" -Items $Result.next_actions
}

function Show-Create {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Meeting Create"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Meeting: $($Result.meeting_id)"
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
    Write-Host "- type/status: $($Result.summary.meeting_type) / $($Result.summary.status)"
    Write-Host "- topic: $($Result.summary.topic_preview)"
    Write-Host "- chair: $($Result.summary.chair_agent_id)"
    Write-Host "- follow-up WorkOrders: $((Get-StringArray -Value $Result.summary.follow_up_workorders) -join ', ')"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    if (-not $Result.ok -and -not [string]::IsNullOrWhiteSpace([string]$Result.error)) {
        Write-Host ""
        Write-Host "[ERROR] $($Result.error)"
    }
    Write-List -Label "Safety" -Items @(
        "Meeting written: $($Result.safety.meeting_written)",
        "WorkOrder not written",
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function Show-Transition {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Meeting Transition"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Meeting: $($Result.meeting_id)"
    Write-Host "Mode: $(if ($Result.execute) { 'execute' } else { 'dry-run' })"
    Write-Host "Status: $($Result.previous_status) -> $($Result.next_status)"
    Write-Host "Path: $($Result.path)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    if (-not $Result.ok -and -not [string]::IsNullOrWhiteSpace([string]$Result.error)) {
        Write-Host ""
        Write-Host "[ERROR] $($Result.error)"
    }
    Write-List -Label "Safety" -Items @(
        "Meeting written: $($Result.safety.meeting_written)",
        "WorkOrder not written",
        "Backlog not written",
        "ActiveTask not changed",
        "Approval not changed",
        "Runner not started",
        "Source not changed",
        "Git not changed"
    )
}

function Show-AddTurn {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Meeting Add Turn"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "Meeting: $($Result.meeting_id)"
    Write-Host "Mode: $(if ($Result.execute) { 'execute' } else { 'dry-run' })"
    Write-Host "Next status: $($Result.next_status)"
    Write-Host "Turn: $($Result.turn.turn_id) / $($Result.turn.speaker_id) / $($Result.turn.turn_type)"
    Write-Host "Content: $($Result.turn.content)"
    Write-List -Label "Validation errors" -Items $Result.validation.errors
    Write-List -Label "Validation warnings" -Items $Result.validation.warnings
    if (-not $Result.ok -and -not [string]::IsNullOrWhiteSpace([string]$Result.error)) {
        Write-Host ""
        Write-Host "[ERROR] $($Result.error)"
    }
    Write-List -Label "Safety" -Items @(
        "Meeting written: $($Result.safety.meeting_written)",
        "WorkOrder not written",
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
        error = "Usage: tools\aiworkflow\studio_meeting_runtime.bat status|validate|list|read <meeting_id>|inspect <meeting_json_path|meeting_id>|handoff <meeting_json_path|meeting_id>|create <meeting_json_path>|start <meeting_id>|transition <meeting_id> <status>|add-turn <meeting_id> <speaker_id> <turn_type> <content>|finalize <meeting_id> [--execute] [--json]"
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
        $result = New-ReadResult -Root $repo -StorePath $storePath -MeetingId ([string]$cleanArgs[1])
    } elseif ($command -eq "inspect" -and $cleanArgs.Count -eq 2) {
        $result = New-InspectResult -Root $repo -StorePath $storePath -MeetingInput ([string]$cleanArgs[1])
    } elseif ($command -eq "handoff" -and $cleanArgs.Count -eq 2) {
        $result = New-HandoffResult -Root $repo -StorePath $storePath -MeetingInput ([string]$cleanArgs[1])
    } elseif ($command -eq "create" -and $cleanArgs.Count -eq 2) {
        $result = New-CreateResult -Root $repo -StorePath $storePath -MeetingPath ([string]$cleanArgs[1]) -Execute $execute
    } elseif ($command -eq "start" -and $cleanArgs.Count -eq 2) {
        $result = New-TransitionResult -Root $repo -StorePath $storePath -MeetingId ([string]$cleanArgs[1]) -NextStatus "in_progress" -Execute $execute -CommandName "start"
    } elseif ($command -eq "transition" -and $cleanArgs.Count -eq 3) {
        $result = New-TransitionResult -Root $repo -StorePath $storePath -MeetingId ([string]$cleanArgs[1]) -NextStatus ([string]$cleanArgs[2]) -Execute $execute
    } elseif ($command -eq "add-turn" -and $cleanArgs.Count -eq 5) {
        $result = New-AddTurnResult -Root $repo -StorePath $storePath -MeetingId ([string]$cleanArgs[1]) -SpeakerId ([string]$cleanArgs[2]) -TurnType ([string]$cleanArgs[3]) -Content ([string]$cleanArgs[4]) -Execute $execute
    } elseif ($command -eq "finalize" -and $cleanArgs.Count -eq 2) {
        $result = New-FinalizeResult -Root $repo -StorePath $storePath -MeetingId ([string]$cleanArgs[1]) -Execute $execute
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
    } elseif ($command -eq "inspect") {
        Show-Inspect -Result $result
    } elseif ($command -eq "handoff") {
        Show-Handoff -Result $result
    } elseif ($command -eq "create") {
        Show-Create -Result $result
    } elseif ($command -eq "start" -or $command -eq "transition" -or $command -eq "finalize") {
        Show-Transition -Result $result
    } elseif ($command -eq "add-turn") {
        Show-AddTurn -Result $result
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
