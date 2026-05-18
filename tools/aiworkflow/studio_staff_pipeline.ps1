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

function Invoke-StudioToolJson {
    param(
        [string]$Root,
        [string]$ScriptName,
        [string[]]$Arguments
    )

    $script = Join-Path $Root ("tools\aiworkflow\" + $ScriptName)
    $toolArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $script, "-RepoRoot", $Root) + @($Arguments) + @("--json")
    $raw = & powershell.exe @toolArgs
    $exitCode = $LASTEXITCODE
    $text = ($raw -join [Environment]::NewLine)
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw "$ScriptName produced no JSON output."
    }
    $parsed = $text | ConvertFrom-Json
    if ($exitCode -ne 0 -or ($null -ne $parsed.ok -and -not [bool]$parsed.ok)) {
        $errorText = if ($parsed.error) { [string]$parsed.error } else { $text }
        throw "$ScriptName failed: $errorText"
    }
    return $parsed
}

function New-SafetyState {
    param(
        [bool]$ContextPacketWritten = $false,
        [bool]$StaffRunAttempted = $false,
        [bool]$ReviewPacketWritten = $false,
        [bool]$LlmCalled = $false
    )

    return [pscustomobject]@{
        read_only = (-not $ContextPacketWritten -and -not $StaffRunAttempted -and -not $ReviewPacketWritten -and -not $LlmCalled)
        context_packet_written = $ContextPacketWritten
        staff_run_attempted = $StaffRunAttempted
        review_packet_written = $ReviewPacketWritten
        llm_called = $LlmCalled
        task_created = $false
        approval_changed = $false
        canon_changed = $false
        source_changed = $false
        git_changed = $false
        commit_or_push_performed = $false
    }
}

function New-StatusResult {
    param([string]$Root)

    $handoffStatus = Invoke-StudioToolJson -Root $Root -ScriptName "studio_handoff_router.ps1" -Arguments @("status")
    $executorStatus = Invoke-StudioToolJson -Root $Root -ScriptName "studio_staff_executor.ps1" -Arguments @("status")
    return [pscustomobject]@{
        ok = $true
        command = "status"
        handoff_router = $handoffStatus
        staff_executor = $executorStatus
        safety = New-SafetyState
    }
}

function Get-CommonHandoffArgs {
    param(
        [string]$HandoffStorePath,
        [string]$ContextStorePath,
        [string]$EvidenceSearchRoot
    )

    $args = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($HandoffStorePath)) {
        $args.Add("--handoff-store-path")
        $args.Add($HandoffStorePath)
    }
    if (-not [string]::IsNullOrWhiteSpace($ContextStorePath)) {
        $args.Add("--context-store-path")
        $args.Add($ContextStorePath)
    }
    if (-not [string]::IsNullOrWhiteSpace($EvidenceSearchRoot)) {
        $args.Add("--evidence-search-root")
        $args.Add($EvidenceSearchRoot)
    }
    return @($args)
}

function New-HandoffPipelineResult {
    param(
        [string]$Root,
        [string]$HandoffInput,
        [bool]$Execute,
        [string]$Model,
        [string]$Reasoning,
        [int]$TimeoutSeconds,
        [bool]$Ephemeral,
        [string]$CodexCommand,
        [string]$HandoffStorePath,
        [string]$ContextStorePath,
        [string]$EvidenceSearchRoot
    )

    $common = Get-CommonHandoffArgs -HandoffStorePath $HandoffStorePath -ContextStorePath $ContextStorePath -EvidenceSearchRoot $EvidenceSearchRoot
    if (-not $Execute) {
        $planArgs = @("plan", $HandoffInput) + $common
        $plan = Invoke-StudioToolJson -Root $Root -ScriptName "studio_handoff_router.ps1" -Arguments $planArgs
        return [pscustomobject]@{
            ok = $true
            command = "handoff"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with handoff <handoff_json_or_id> --execute to create context and run the target staff agent."
            handoff_plan = $plan
            target_agent_id = if ($plan.context_packet) { [string]$plan.context_packet.agent_id } else { "" }
            planned_role_run_id = if ($plan.context_packet) { [string]$plan.context_packet.role_run_id } else { "" }
            safety = New-SafetyState
        }
    }

    $createArgs = @("create-context", $HandoffInput, "--execute") + $common
    $contextResult = Invoke-StudioToolJson -Root $Root -ScriptName "studio_handoff_router.ps1" -Arguments $createArgs
    if ([string]::IsNullOrWhiteSpace([string]$contextResult.context_path)) {
        throw "Handoff router did not return a context_path."
    }

    $runArgs = New-Object System.Collections.Generic.List[string]
    $runArgs.Add("run")
    $runArgs.Add([string]$contextResult.context_path)
    $runArgs.Add("--execute")
    $runArgs.Add("--model")
    $runArgs.Add($Model)
    $runArgs.Add("--reasoning")
    $runArgs.Add($Reasoning)
    $runArgs.Add("--timeout-seconds")
    $runArgs.Add([string]$TimeoutSeconds)
    $runArgs.Add("--codex-command")
    $runArgs.Add($CodexCommand)
    if ($Ephemeral) {
        $runArgs.Add("--ephemeral")
    }
    $staffRun = Invoke-StudioToolJson -Root $Root -ScriptName "studio_staff_executor.ps1" -Arguments @($runArgs.ToArray())

    $reviewPacket = $null
    if (-not [string]::IsNullOrWhiteSpace([string]$staffRun.role_run_output_path)) {
        $reviewPacket = Invoke-StudioToolJson -Root $Root -ScriptName "studio_review_packet_exporter.ps1" -Arguments @("export", [string]$staffRun.role_run_output_path)
    }

    return [pscustomobject]@{
        ok = $true
        command = "handoff"
        execute = $true
        handoff_id = [string]$contextResult.handoff_id
        context_packet_id = [string]$contextResult.context_packet_id
        context_path = [string]$contextResult.context_path
        role_run_id = [string]$staffRun.role_run_id
        agent_id = [string]$staffRun.agent_id
        staff_run = $staffRun
        review_packet = $reviewPacket
        safety = New-SafetyState -ContextPacketWritten $true -StaffRunAttempted $true -ReviewPacketWritten ($null -ne $reviewPacket) -LlmCalled $true
    }
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_staff_pipeline.bat status|handoff <handoff_json_or_id> [--execute] [--model gpt-5.5] [--reasoning high] [--timeout-seconds 900] [--ephemeral] [--codex-command codex] [--json]"
        safety = New-SafetyState
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $execute = $false
    $model = "gpt-5.5"
    $reasoning = "high"
    $timeoutSeconds = 900
    $ephemeral = $true
    $codexCommand = "codex"
    $handoffStorePath = ""
    $contextStorePath = ""
    $evidenceSearchRoot = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--ephemeral") {
            $ephemeral = $true
        } elseif ($arg -ieq "--no-ephemeral") {
            $ephemeral = $false
        } elseif ($arg -ieq "--model") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--model requires a value." }
            $index += 1
            $model = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--reasoning") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--reasoning requires a value." }
            $index += 1
            $reasoning = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--timeout-seconds") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--timeout-seconds requires a value." }
            $index += 1
            $timeoutSeconds = [int]$CommandArgs[$index]
        } elseif ($arg -ieq "--command" -or $arg -ieq "--codex-command") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--codex-command requires a value." }
            $index += 1
            $codexCommand = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--handoff-store-path") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--handoff-store-path requires a value." }
            $index += 1
            $handoffStorePath = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--context-store-path") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--context-store-path requires a value." }
            $index += 1
            $contextStorePath = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--evidence-search-root") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--evidence-search-root requires a value." }
            $index += 1
            $evidenceSearchRoot = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add($arg)
        }
    }

    if ($cleanArgs.Count -lt 1) {
        $result = New-UsageResult
    } else {
        $command = ([string]$cleanArgs[0]).ToLowerInvariant()
        if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
            $result = New-StatusResult -Root $repo
        } elseif ($command -eq "handoff" -and $cleanArgs.Count -eq 2) {
            $result = New-HandoffPipelineResult -Root $repo -HandoffInput ([string]$cleanArgs[1]) -Execute $execute -Model $model -Reasoning $reasoning -TimeoutSeconds $timeoutSeconds -Ephemeral $ephemeral -CodexCommand $codexCommand -HandoffStorePath $handoffStorePath -ContextStorePath $contextStorePath -EvidenceSearchRoot $evidenceSearchRoot
        } else {
            $result = New-UsageResult
        }
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } elseif ($result.ok) {
        Write-Host "AIWorkflow Studio staff pipeline"
        Write-Host "command: $($result.command)"
        if ($result.execute_required) { Write-Host $result.message }
        if ($result.target_agent_id) { Write-Host "target agent: $($result.target_agent_id)" }
        if ($result.context_path) { Write-Host "context: $($result.context_path)" }
        if ($result.role_run_id) { Write-Host "role run: $($result.role_run_id)" }
        if ($result.review_packet -and $result.review_packet.output_path) { Write-Host "review packet: $($result.review_packet.output_path)" }
        Write-Host "safety: no task/canon/source/git/commit/push changes"
    } else {
        Write-Host "[ERROR] $($result.error)"
    }
    exit $(if ($result.ok) { 0 } else { 1 })
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
