param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ""
    }

    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Get-Scalar {
    param(
        [string]$Text,
        [string]$Key,
        [string]$Default = ""
    )

    if ([string]::IsNullOrEmpty($Text)) {
        return $Default
    }

    $pattern = "(?m)^\s*" + [regex]::Escape($Key) + "\s*:\s*(.*?)\s*$"
    $m = [regex]::Match($Text, $pattern)

    if (-not $m.Success -or $m.Groups.Count -lt 2) {
        return $Default
    }

    $value = ([string]$m.Groups[1].Value).Trim()
    if ($value.Length -ge 2) {
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
    }

    return $value
}

function Get-SectionText {
    param(
        [string]$Text,
        [string]$Heading
    )

    if ([string]::IsNullOrEmpty($Text)) {
        return ""
    }

    $pattern = "(?ms)^##\s+" + [regex]::Escape($Heading) + "\s*\r?\n(.*?)(?=^##\s+|\z)"
    $m = [regex]::Match($Text, $pattern)

    if (-not $m.Success -or $m.Groups.Count -lt 2) {
        return ""
    }

    $value = ([string]$m.Groups[1].Value).Trim()
    $value = [regex]::Replace($value, "(?ms)\r?\n---\s*$", "")
    return $value.Trim()
}

function Parse-BacklogRows {
    param([string]$Text)

    $rows = @()
    if ([string]::IsNullOrEmpty($Text)) {
        return @()
    }

    foreach ($lineObj in ($Text -split "`r?`n")) {
        if ($null -eq $lineObj) {
            continue
        }

        $line = ([string]$lineObj).Trim()
        if (-not $line.StartsWith("|")) {
            continue
        }

        $cells = @($line.Trim("|".ToCharArray()).Split("|".ToCharArray()) | ForEach-Object {
            if ($null -eq $_) { "" } else { ([string]$_).Trim() }
        })

        if ($cells.Count -lt 8) {
            continue
        }

        $id = $cells[0]
        if ($id -notmatch "^(WF|GAME|VAL|DOC|UNITY|DATA)-") {
            continue
        }

        $rows += [pscustomobject]@{
            id = $cells[0]
            priority = $cells[1]
            status = $cells[2]
            kind = $cells[3]
            item = $cells[4]
            reason = $cells[5]
            tool_route = $cells[6]
            validation = $cells[7]
        }
    }

    return @($rows)
}

function Add-Unique {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    if (-not $List.Contains($Value)) {
        $List.Add($Value)
    }
}

function Add-ManyUnique {
    param(
        [System.Collections.Generic.List[string]]$List,
        [string[]]$Values
    )

    foreach ($value in $Values) {
        Add-Unique -List $List -Value $value
    }
}

function Test-Term {
    param(
        [string]$Text,
        [string[]]$Patterns
    )

    foreach ($pattern in $Patterns) {
        if ($Text -match $pattern) {
            return $true
        }
    }

    return $false
}

function Get-Category {
    param([string]$TaskId)

    if ($TaskId -match "^([A-Za-z]+)-") {
        return $Matches[1].ToUpperInvariant()
    }

    return "UNKNOWN"
}

function Format-List {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return @("- None.")
    }

    return @($Items | ForEach-Object { "- $_" })
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $docs = Join-Path $repo "_Docs\AIWorkflow"

    $policyRelative = @(
        "_Docs\AIWorkflow\Agent_Role_Registry_v1.md",
        "_Docs\AIWorkflow\Role_Router_Rules_v1.md",
        "_Docs\AIWorkflow\Review_Validation_Verdict_Format_v1.md",
        "_Docs\AIWorkflow\Path_Scoped_Rule_Mapping_DustLand_v1.md",
        "_Docs\AIWorkflow\ActiveTask.md",
        "_Docs\AIWorkflow\Backlog.md"
    )

    $missingPolicy = @()
    foreach ($relative in $policyRelative) {
        $path = Join-Path $repo $relative
        if (-not (Test-Path -LiteralPath $path)) {
            $missingPolicy += $relative
        }
    }

    if ($missingPolicy.Count -gt 0) {
        $message = "Required AIWorkflow policy/state files are missing: " + ($missingPolicy -join ", ")
        if ($Json) {
            [pscustomobject]@{
                ok = $false
                error = $message
                missing = @($missingPolicy)
            } | ConvertTo-Json -Depth 6
            exit 2
        }

        Write-Host "[ERROR] $message"
        exit 2
    }

    $activeTaskText = Read-Utf8Text -Path (Join-Path $docs "ActiveTask.md")
    $backlogText = Read-Utf8Text -Path (Join-Path $docs "Backlog.md")

    $taskId = Get-Scalar -Text $activeTaskText -Key "task_id" -Default "unknown"
    $title = Get-Scalar -Text $activeTaskText -Key "title" -Default "unknown"
    $status = Get-Scalar -Text $activeTaskText -Key "status" -Default "unknown"
    $workflowPath = Get-Scalar -Text $activeTaskText -Key "workflow_path" -Default "unknown"
    $priority = Get-Scalar -Text $activeTaskText -Key "priority" -Default "unknown"
    $risk = Get-Scalar -Text $activeTaskText -Key "risk_level" -Default "unknown"
    $requestedAt = Get-Scalar -Text $activeTaskText -Key "requested_at" -Default "unknown"
    $lastUpdated = Get-Scalar -Text $activeTaskText -Key "last_updated" -Default "unknown"
    $humanAction = Get-SectionText -Text $activeTaskText -Heading "Human Action Required"
    $filesInScope = Get-SectionText -Text $activeTaskText -Heading "Files In Scope"
    $validationPlan = Get-SectionText -Text $activeTaskText -Heading "Validation Plan"
    $latestStatus = Get-SectionText -Text $activeTaskText -Heading "Latest Status Note"

    $backlogRows = @(Parse-BacklogRows -Text $backlogText)
    $backlogItem = $backlogRows | Where-Object { $_.id -eq $taskId } | Select-Object -First 1

    $kind = "unknown"
    $item = ""
    $reason = ""
    $backlogValidation = ""
    if ($null -ne $backlogItem) {
        $kind = $backlogItem.kind
        $item = $backlogItem.item
        $reason = $backlogItem.reason
        $backlogValidation = $backlogItem.validation
        if ($title -eq "unknown" -or [string]::IsNullOrWhiteSpace($title)) {
            $title = $item
        }
    }

    $category = Get-Category -TaskId $taskId
    $contextText = @(
        $taskId,
        $title,
        $status,
        $workflowPath,
        $priority,
        $risk,
        $kind,
        $item,
        $reason,
        $backlogValidation,
        $filesInScope,
        $validationPlan,
        $latestStatus
    ) -join "`n"

    $recommendedRoles = New-Object System.Collections.Generic.List[string]
    $humanGates = New-Object System.Collections.Generic.List[string]
    $requiredValidation = New-Object System.Collections.Generic.List[string]
    $executionRoute = New-Object System.Collections.Generic.List[string]
    $rationale = New-Object System.Collections.Generic.List[string]

    Add-Unique -List $recommendedRoles -Value "Orchestrator"
    Add-Unique -List $rationale -Value "Every AIWorkflow task activates Orchestrator for scope, routing, gates, and next-step control."

    $isDocumentation = ($kind -match "documentation|doc") -or ($category -eq "DOC") -or (Test-Term -Text $contextText -Patterns @("_Docs/AIWorkflow", "_DevLog", "documentation", "document"))
    $isAutomation = ($kind -match "automation|tool|workflow") -or ($category -eq "WF") -or (Test-Term -Text $contextText -Patterns @("tools[/\\]aiworkflow", "role router", "script", "automation", "workflow tool"))
    $isGameplay = ($category -eq "GAME") -or (Test-Term -Text $contextText -Patterns @("PlayGround[/\\]Project[/\\]Gameplay", "gameplay implementation", "runtime behavior", "manual runtime validation"))
    $isData = ($category -eq "DATA") -or (Test-Term -Text $contextText -Patterns @("PlayGround[/\\]Data", "json", "schema", "save/load", "data validation"))
    $isDiscord = Test-Term -Text $contextText -Patterns @("tools[/\\]discord-orchestrator", "discord command behavior", "bot register", "bot restart", "bot status")

    $negativeDiscord = Test-Term -Text $contextText -Patterns @("do not (modify|change) discord command behavior", "no discord command behavior")
    $positiveDiscordChange = $isDiscord -and (-not $negativeDiscord) -and (Test-Term -Text $contextText -Patterns @("modif(y|ies|ication).*discord command", "change.*discord command", "discord command behavior change", "bot runtime behavior"))

    $negativeGameSource = Test-Term -Text $contextText -Patterns @("do not modify game source", "no game source files", "do not change game source")
    $positiveGameplayRuntime = $isGameplay -and (-not $negativeGameSource)

    $positiveDataChange = $isData -and (Test-Term -Text $contextText -Patterns @("PlayGround[/\\]Data", "json", "schema", "data")) -and (-not (Test-Term -Text $contextText -Patterns @("do not modify.*data", "no data files")))

    if ($isDocumentation) {
        Add-ManyUnique -List $recommendedRoles -Values @("Documentation Keeper", "Reviewer")
        Add-Unique -List $rationale -Value "Documentation scope activates Documentation Keeper and Reviewer for durable records, policy consistency, and document-map review."
    }

    if ($isAutomation) {
        Add-ManyUnique -List $recommendedRoles -Values @("Tool/Workflow Engineer", "Reviewer", "Validator")
        Add-Unique -List $rationale -Value "Automation/workflow scope activates Tool/Workflow Engineer, Reviewer, and Validator for read-only script behavior, safety boundaries, and command validation."
    }

    if ($isGameplay) {
        Add-ManyUnique -List $recommendedRoles -Values @("Explorer", "Technical Architect", "Gameplay Implementer", "Reviewer", "Validator")
        Add-Unique -List $rationale -Value "Gameplay implementation scope activates Explorer, Technical Architect, Gameplay Implementer, Reviewer, and Validator."
    }

    if ($isData) {
        Add-ManyUnique -List $recommendedRoles -Values @("Explorer", "Technical Architect", "Validator", "Reviewer")
        Add-Unique -List $rationale -Value "Data or JSON scope activates Explorer, Technical Architect, Validator, and Reviewer for schema, loader, and semantic validation risk."
    }

    if ($priority -match "^P[01]$" -or $risk -match "high") {
        Add-Unique -List $humanGates -Value "Human Director Gate: P0/P1 or high-risk task requires explicit approval before implementation and before accepting validation deferral."
    }

    if (Test-Term -Text $contextText -Patterns @("schema", "save/load", "runtime behavior", "external tool", "computer-use", "destructive command")) {
        Add-Unique -List $humanGates -Value "Human Decision Gate: schema/save/runtime/external-tool/computer-use/destructive-command scope must be explicitly approved if actually modified or executed."
    }

    if ($positiveDiscordChange) {
        Add-Unique -List $humanGates -Value "Human Decision Gate: Discord command behavior change requires explicit approval."
    }

    if ($positiveDataChange) {
        Add-Unique -List $humanGates -Value "Human Decision Gate: PlayGround/Data or JSON/schema behavior change requires explicit approval."
    }

    if ($positiveGameplayRuntime) {
        Add-Unique -List $humanGates -Value "Human Decision Gate: gameplay runtime behavior change requires explicit approval."
    }

    if ($humanGates.Count -eq 0) {
        Add-Unique -List $humanGates -Value "No additional high-risk gate inferred beyond normal Human Director review and commit decision."
    }

    Add-ManyUnique -List $requiredValidation -Values @(
        'Run git status --short.',
        'Run git diff --check.',
        'Run git diff --stat.',
        "Verify no forbidden paths were modified."
    )

    if ($isAutomation) {
        Add-ManyUnique -List $requiredValidation -Values @(
            "Run the changed local AIWorkflow command in text mode.",
            'Run the changed local AIWorkflow command in --json mode.',
            "Verify JSON output is valid JSON.",
            "Verify README documents the new command.",
            "Verify no agents are executed and no automatic approval occurs."
        )
    }

    if ($isDocumentation) {
        Add-Unique -List $requiredValidation -Value "Verify README/document map links new durable workflow documents when updated."
    }

    if ($positiveDiscordChange) {
        Add-ManyUnique -List $requiredValidation -Values @(
            "Run npm register validation for Discord command changes.",
            "Restart the bot.",
            "Check bot status.",
            "Run private file tracking check."
        )
    }

    if ($positiveDataChange) {
        Add-ManyUnique -List $requiredValidation -Values @(
            'Run tools\aiworkflow\json_smoke_check.bat.',
            "Record semantic validation notes for data/schema behavior."
        )
    }

    if ($positiveGameplayRuntime) {
        Add-ManyUnique -List $requiredValidation -Values @(
            "Run Debug x64 build.",
            "Run manual runtime validation and record observed result."
        )
    }

    Add-ManyUnique -List $executionRoute -Values @("Orchestrator")

    if ($isAutomation) {
        Add-Unique -List $executionRoute -Value "Tool/Workflow Engineer"
    }

    if ($isGameplay -or $isData) {
        Add-Unique -List $executionRoute -Value "Explorer"
    }

    if ($isGameplay -or $isData) {
        Add-Unique -List $executionRoute -Value "Technical Architect"
    }

    if ($isGameplay) {
        Add-Unique -List $executionRoute -Value "Gameplay Implementer after approval"
    }

    if ($isDocumentation) {
        Add-Unique -List $executionRoute -Value "Documentation Keeper"
    }

    Add-ManyUnique -List $executionRoute -Values @("Reviewer", "Validator", "Human Director commit decision")

    $nextManualAction = "Review the recommended roles, gates, and validation list; then approve the bounded next action or revise ActiveTask scope before execution."
    if ($status -match "ready_for_implementation" -and $isAutomation) {
        $nextManualAction = "Run the approved read-only local command, review text and JSON output, then validate the diff before deciding whether to commit."
    }

    $verdictFormat = "Use Review_Validation_Verdict_Format_v1.md with PASS, PASS_WITH_NOTES, CONCERNS, BLOCKED, or FAIL. Do not use PASS when required validation was skipped."

    $task = [pscustomobject]@{
        task_id = $taskId
        title = $title
        status = $status
        category = $category
        kind = $kind
        workflow_path = $workflowPath
        priority = $priority
        risk_level = $risk
        requested_at = $requestedAt
        last_updated = $lastUpdated
        backlog_reason = $reason
        files_in_scope = $filesInScope
    }

    $result = [pscustomobject]@{
        ok = $true
        task = $task
        recommended_roles = @($recommendedRoles)
        role_rationale = @($rationale)
        human_gates = @($humanGates)
        required_validation = @($requiredValidation)
        execution_route = @($executionRoute)
        verdict_format = $verdictFormat
        next_manual_action = $nextManualAction
        policy_documents = @($policyRelative)
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 8
        exit 0
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Role Router Status"
    Write-Host "============================================================"
    Write-Host ""

    Write-Host "1. Active Task"
    Write-Host "ID:            $($task.task_id)"
    Write-Host "Title:         $($task.title)"
    Write-Host "Status:        $($task.status)"
    Write-Host "Category:      $($task.category)"
    Write-Host "Kind:          $($task.kind)"
    Write-Host "Workflow Path: $($task.workflow_path)"
    Write-Host "Priority:      $($task.priority)"
    Write-Host "Risk:          $($task.risk_level)"
    Write-Host ""

    Write-Host "2. Recommended Roles"
    Format-List -Items @($recommendedRoles) | ForEach-Object { Write-Host $_ }
    Write-Host ""

    Write-Host "3. Role Rationale"
    Format-List -Items @($rationale) | ForEach-Object { Write-Host $_ }
    Write-Host ""

    Write-Host "4. Human Decision Gates"
    Format-List -Items @($humanGates) | ForEach-Object { Write-Host $_ }
    Write-Host ""

    Write-Host "5. Required Validation"
    Format-List -Items @($requiredValidation) | ForEach-Object { Write-Host $_ }
    Write-Host ""

    Write-Host "6. Suggested Execution Route"
    Format-List -Items @($executionRoute) | ForEach-Object { Write-Host $_ }
    Write-Host ""

    Write-Host "7. Verdict Format"
    Write-Host $verdictFormat
    Write-Host ""

    Write-Host "8. Next Manual Action"
    Write-Host $nextManualAction
    Write-Host ""

    Write-Host "[Policy Documents Read]"
    Format-List -Items @($policyRelative) | ForEach-Object { Write-Host $_ }
    Write-Host ""

    Write-Host "============================================================"
    Write-Host "Read-only recommendation complete. No agents were executed."
    Write-Host "============================================================"
    exit 0
}
catch {
    if ($Json) {
        [pscustomobject]@{
            ok = $false
            error = $_.Exception.Message
            script = "role_router_status.ps1"
            line = $_.InvocationInfo.ScriptLineNumber
            command = $_.InvocationInfo.Line
        } | ConvertTo-Json -Depth 4
        exit 1
    }

    Write-Host "[ERROR] role_router_status.ps1 failed: $($_.Exception.Message)"
    Write-Host "Line: $($_.InvocationInfo.ScriptLineNumber)"
    Write-Host "Command: $($_.InvocationInfo.Line)"
    exit 1
}
