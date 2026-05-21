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

function Read-Utf8Text {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing file: $Path"
    }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Text
    )

    $dir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Read-JsonFile {
    param([string]$Path)

    $text = Read-Utf8Text -Path $Path
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

function ConvertTo-RepoRelativePath {
    param(
        [string]$Root,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ""
    }
    $full = [System.IO.Path]::GetFullPath($Path)
    $repo = [System.IO.Path]::GetFullPath($Root).TrimEnd("\", "/")
    if ($full.StartsWith($repo, [System.StringComparison]::OrdinalIgnoreCase)) {
        return ($full.Substring($repo.Length).TrimStart("\", "/") -replace "\\", "/")
    }
    return ($full -replace "\\", "/")
}

function ConvertTo-ProcessArguments {
    param([string[]]$ArgumentsList)

    $parts = @()
    foreach ($arg in @($ArgumentsList)) {
        $value = [string]$arg
        if ($value -eq "") {
            $parts += '""'
        } elseif ($value -match '[\s"]') {
            $parts += ('"' + $value.Replace('"', '\"') + '"')
        } else {
            $parts += $value
        }
    }
    return ($parts -join " ")
}

function Invoke-CapturedProcess {
    param(
        [string]$FileName,
        [string[]]$ArgumentsList,
        [string]$WorkingDirectory,
        [string]$StandardInputText = "",
        [int]$TimeoutSeconds = 0
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FileName
    $psi.Arguments = ConvertTo-ProcessArguments -ArgumentsList $ArgumentsList
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardInput = (-not [string]::IsNullOrEmpty($StandardInputText))
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    try { $psi.StandardOutputEncoding = $utf8NoBom } catch {}
    try { $psi.StandardErrorEncoding = $utf8NoBom } catch {}
    try {
        if ($psi.RedirectStandardInput) {
            $psi.StandardInputEncoding = $utf8NoBom
        }
    } catch {}

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    if (-not [string]::IsNullOrEmpty($StandardInputText)) {
        $process.StandardInput.Write($StandardInputText)
        $process.StandardInput.Close()
    }

    $timedOut = $false
    if ($TimeoutSeconds -gt 0) {
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $timedOut = $true
            try { $process.Kill() } catch {}
        }
    } else {
        $process.WaitForExit()
    }
    $process.WaitForExit()

    $stderr = $stderrTask.Result
    if ($timedOut) {
        $stderr = ($stderr.TrimEnd() + [Environment]::NewLine + "Process timed out after $TimeoutSeconds seconds." + [Environment]::NewLine)
    }

    return [pscustomobject]@{
        stdout = $stdoutTask.Result
        stderr = $stderr
        exit_code = if ($timedOut) { -1 } else { $process.ExitCode }
        timed_out = $timedOut
        command_line = (($FileName + " " + (ConvertTo-ProcessArguments -ArgumentsList $ArgumentsList)).Trim())
    }
}

function Resolve-CommandPath {
    param([string]$Command)

    $where = Invoke-CapturedProcess -FileName "where.exe" -ArgumentsList @($Command) -WorkingDirectory $RepoRoot -TimeoutSeconds 15
    if ($where.exit_code -ne 0) {
        return $Command
    }
    $paths = @()
    foreach ($line in ($where.stdout -split "`r?`n")) {
        $value = ([string]$line).Trim()
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $paths += $value
        }
    }
    $exe = @($paths | Where-Object { $_ -match "\.exe$" } | Select-Object -First 1)
    if (@($exe).Count -gt 0) { return [string]$exe[0] }
    $cmd = @($paths | Where-Object { $_ -match "\.cmd$" } | Select-Object -First 1)
    if (@($cmd).Count -gt 0) { return [string]$cmd[0] }
    if (@($paths).Count -gt 0) { return [string]$paths[0] }
    return $Command
}

function Invoke-ResolvedProcess {
    param(
        [string]$FileName,
        [string[]]$ArgumentsList,
        [string]$WorkingDirectory,
        [string]$StandardInputText = "",
        [int]$TimeoutSeconds = 0
    )

    if ($FileName -match "\.(cmd|bat)$") {
        $commandLine = ('"' + $FileName + '" ' + (ConvertTo-ProcessArguments -ArgumentsList $ArgumentsList)).Trim()
        return Invoke-CapturedProcess -FileName "cmd.exe" -ArgumentsList @("/d", "/s", "/c", $commandLine) -WorkingDirectory $WorkingDirectory -StandardInputText $StandardInputText -TimeoutSeconds $TimeoutSeconds
    }
    return Invoke-CapturedProcess -FileName $FileName -ArgumentsList $ArgumentsList -WorkingDirectory $WorkingDirectory -StandardInputText $StandardInputText -TimeoutSeconds $TimeoutSeconds
}

function ConvertTo-PowerShellSingleQuoted {
    param([string]$Value)

    return "'" + ([string]$Value).Replace("'", "''") + "'"
}

function ConvertTo-PowerShellArrayLiteral {
    param([string[]]$Values)

    $items = @($Values | ForEach-Object { ConvertTo-PowerShellSingleQuoted -Value ([string]$_) })
    return "@(" + ($items -join ", ") + ")"
}

function Invoke-CodexCli {
    param(
        [string]$Command,
        [string[]]$ArgumentsList,
        [string]$WorkingDirectory,
        [string]$PromptPath = "",
        [int]$TimeoutSeconds = 0
    )

    $commandLiteral = ConvertTo-PowerShellSingleQuoted -Value $Command
    $argsLiteral = ConvertTo-PowerShellArrayLiteral -Values $ArgumentsList
    $encodingSetup = "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; `$OutputEncoding = [System.Text.Encoding]::UTF8;"
    if ([string]::IsNullOrWhiteSpace($PromptPath)) {
        $script = "$encodingSetup `$codexArgs = $argsLiteral; & $commandLiteral @codexArgs"
    } else {
        $promptLiteral = ConvertTo-PowerShellSingleQuoted -Value $PromptPath
        $script = "$encodingSetup `$codexArgs = $argsLiteral; `$prompt = [System.IO.File]::ReadAllText($promptLiteral, [System.Text.Encoding]::UTF8); `$prompt | & $commandLiteral @codexArgs"
    }
    $result = Invoke-CapturedProcess -FileName "powershell.exe" -ArgumentsList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $script) -WorkingDirectory $WorkingDirectory -TimeoutSeconds $TimeoutSeconds
    $result.command_line = ("powershell.exe -NoProfile -ExecutionPolicy Bypass -Command " + $script)
    return $result
}

function Get-GitChangedFiles {
    param([string]$Root)

    $result = Invoke-CapturedProcess -FileName "git" -ArgumentsList @("diff", "--name-only") -WorkingDirectory $Root
    if ($result.exit_code -ne 0) {
        throw "git diff --name-only failed: $($result.stderr)$($result.stdout)"
    }
    $files = @()
    foreach ($line in ($result.stdout -split "`r?`n")) {
        $value = ([string]$line).Trim()
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $files += ($value -replace "\\", "/")
        }
    }
    return @($files)
}

function Get-CodexVersion {
    param([string]$Command)

    try {
        $result = Invoke-CodexCli -Command $Command -ArgumentsList @("--version") -WorkingDirectory $RepoRoot -TimeoutSeconds 15
        if ($result.exit_code -eq 0) {
            return ($result.stdout.Trim())
        }
        return ("version check failed: " + ($result.stderr + $result.stdout).Trim())
    } catch {
        return ("not available: " + $_.Exception.Message)
    }
}

function Get-ResolvedCodexArgs {
    param(
        [string]$Model,
        [string]$Reasoning,
        [bool]$Ephemeral
    )

    $args = @(
        "--sandbox", "read-only",
        "--ask-for-approval", "never"
    )
    if (-not [string]::IsNullOrWhiteSpace($Model)) {
        $args += @("--model", $Model)
    }
    if (-not [string]::IsNullOrWhiteSpace($Reasoning)) {
        $args += @("-c", "model_reasoning_effort=`"$Reasoning`"")
    }
    $args += @("exec", "-")
    if ($Ephemeral) {
        $args += "--ephemeral"
    }
    return @($args)
}

function Get-RunDir {
    param(
        [string]$Root,
        [string]$RoleRunId
    )

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    return (Join-Path $Root "_Temp\AIWorkflowStudio\staff_runs\$RoleRunId\$stamp")
}

function Invoke-PromptExporter {
    param(
        [string]$Root,
        [string]$ContextPath,
        [bool]$Export
    )

    $script = Join-Path $Root "tools\aiworkflow\studio_staff_prompt_exporter.ps1"
    $command = if ($Export) { "export" } else { "plan" }
    $args = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $script,
        "-RepoRoot",
        $Root,
        $command,
        $ContextPath,
        "--json"
    )
    $result = Invoke-CapturedProcess -FileName "powershell.exe" -ArgumentsList $args -WorkingDirectory $Root -TimeoutSeconds 60
    if ($result.exit_code -ne 0) {
        throw "Prompt exporter failed: $($result.stderr)$($result.stdout)"
    }
    return ($result.stdout | ConvertFrom-Json)
}

function Invoke-RoleRunOutputValidation {
    param(
        [string]$Root,
        [string]$OutputPath
    )

    $script = Join-Path $Root "tools\aiworkflow\studio_staff_runtime.ps1"
    $result = Invoke-CapturedProcess -FileName "powershell.exe" -ArgumentsList @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $script,
        "-RepoRoot",
        $Root,
        "inspect-output",
        $OutputPath,
        "--json"
    ) -WorkingDirectory $Root -TimeoutSeconds 60
    if ([string]::IsNullOrWhiteSpace($result.stdout)) {
        return [pscustomobject]@{
            ok = $false
            error = ($result.stderr.Trim())
            validation = $null
        }
    }
    try {
        $parsed = $result.stdout | ConvertFrom-Json
        return [pscustomobject]@{
            ok = ($result.exit_code -eq 0 -and $parsed.validation.ok)
            error = ""
            validation = $parsed.validation
        }
    } catch {
        return [pscustomobject]@{
            ok = $false
            error = $_.Exception.Message
            validation = $null
        }
    }
}

function Extract-JsonObjectText {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }
    $trimmed = $Text.Trim()
    if ($trimmed.StartsWith("{") -and $trimmed.EndsWith("}")) {
        return $trimmed
    }
    $start = $trimmed.IndexOf("{")
    $end = $trimmed.LastIndexOf("}")
    if ($start -ge 0 -and $end -gt $start) {
        return $trimmed.Substring($start, $end - $start + 1)
    }
    return ""
}

function New-SafetyState {
    param(
        [bool]$PromptWritten = $false,
        [bool]$CodexCalled = $false,
        [bool]$OutputWritten = $false,
        [bool]$UnexpectedSourceChange = $false
    )

    return [pscustomobject]@{
        read_only = (-not ($PromptWritten -or $CodexCalled -or $OutputWritten))
        prompt_written = $PromptWritten
        codex_cli_called = $CodexCalled
        role_run_output_written = $OutputWritten
        task_created = $false
        approval_changed = $false
        canon_changed = $false
        source_changed = $UnexpectedSourceChange
        git_changed = $UnexpectedSourceChange
        openai_api_called = $false
    }
}

function New-StatusResult {
    param([string]$CommandPath)

    $resolved = Resolve-CommandPath -Command $CommandPath
    return [pscustomobject]@{
        ok = $true
        command = "status"
        provider_policy = "Codex App/CLI signed-in route first. No OpenAI API billing by default."
        codex_command = $CommandPath
        resolved_codex_command = $resolved
        codex_version = Get-CodexVersion -Command $CommandPath
        default_model = "gpt-5.5"
        default_reasoning = "high"
        safety = New-SafetyState
    }
}

function New-PlanResult {
    param(
        [string]$Root,
        [string]$ContextPath,
        [string]$CodexCommand,
        [string]$Model,
        [string]$Reasoning,
        [bool]$Ephemeral,
        [int]$TimeoutSeconds
    )

    $contextFullPath = Resolve-RepoFilePath -Root $Root -Path $ContextPath
    $context = Read-JsonFile -Path $contextFullPath
    $exportPlan = Invoke-PromptExporter -Root $Root -ContextPath $contextFullPath -Export $false
    $args = Get-ResolvedCodexArgs -Model $Model -Reasoning $Reasoning -Ephemeral $Ephemeral
    $resolvedCodex = Resolve-CommandPath -Command $CodexCommand

    return [pscustomobject]@{
        ok = $exportPlan.ok
        command = "plan"
        context_path = ConvertTo-RepoRelativePath -Root $Root -Path $contextFullPath
        context_packet_id = [string]$context.context_packet_id
        role_run_id = [string]$context.role_run_id
        agent_id = [string]$context.agent_id
        provider_policy = "Codex App/CLI signed-in route first. No OpenAI API billing by default."
        codex_command = $CodexCommand
        resolved_codex_command = $resolvedCodex
        codex_version = Get-CodexVersion -Command $CodexCommand
        planned_args = @($args)
        model = $Model
        reasoning = $Reasoning
        ephemeral = $Ephemeral
        timeout_seconds = $TimeoutSeconds
        prompt_line_count = $exportPlan.prompt_line_count
        safety = New-SafetyState
    }
}

function New-RunResult {
    param(
        [string]$Root,
        [string]$ContextPath,
        [string]$CodexCommand,
        [string]$Model,
        [string]$Reasoning,
        [bool]$Ephemeral,
        [int]$TimeoutSeconds,
        [bool]$Execute
    )

    $plan = New-PlanResult -Root $Root -ContextPath $ContextPath -CodexCommand $CodexCommand -Model $Model -Reasoning $Reasoning -Ephemeral $Ephemeral -TimeoutSeconds $TimeoutSeconds
    if (-not $Execute) {
        return [pscustomobject]@{
            ok = $true
            command = "run"
            execute = $false
            execute_required = $true
            message = "Dry-run only. Re-run with run <context_packet_json> --execute to call Codex CLI."
            plan = $plan
            safety = New-SafetyState
        }
    }

    $contextFullPath = Resolve-RepoFilePath -Root $Root -Path $ContextPath
    $context = Read-JsonFile -Path $contextFullPath
    $runDir = Get-RunDir -Root $Root -RoleRunId ([string]$context.role_run_id)
    if (-not (Test-Path -LiteralPath $runDir)) {
        New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    }

    $exportResult = Invoke-PromptExporter -Root $Root -ContextPath $contextFullPath -Export $true
    $promptPath = [string]$exportResult.output_path
    $promptText = Read-Utf8Text -Path $promptPath
    $stdoutPath = Join-Path $runDir "codex.stdout.log"
    $stderrPath = Join-Path $runDir "codex.stderr.log"
    $outputPath = Join-Path $runDir "role_run_output.json"
    $metadataPath = Join-Path $runDir "staff_run.json"
    $beforeChanged = @(Get-GitChangedFiles -Root $Root)
    $args = Get-ResolvedCodexArgs -Model $Model -Reasoning $Reasoning -Ephemeral $Ephemeral
    $resolvedCodex = Resolve-CommandPath -Command $CodexCommand

    $startedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    $process = Invoke-CodexCli -Command $CodexCommand -ArgumentsList $args -WorkingDirectory $Root -PromptPath $promptPath -TimeoutSeconds $TimeoutSeconds
    $endedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    Write-Utf8Text -Path $stdoutPath -Text $process.stdout
    Write-Utf8Text -Path $stderrPath -Text $process.stderr
    $afterChanged = @(Get-GitChangedFiles -Root $Root)

    $unexpectedChanges = @($afterChanged | Where-Object { $beforeChanged -notcontains $_ })
    $jsonText = Extract-JsonObjectText -Text $process.stdout
    $outputParsed = $false
    $outputValidation = [pscustomobject]@{ ok = $false; error = "Output was not parsed."; validation = $null }
    $parseError = ""
    if (-not [string]::IsNullOrWhiteSpace($jsonText)) {
        try {
            $parsed = $jsonText | ConvertFrom-Json
            $null = $parsed
            Write-Utf8Text -Path $outputPath -Text ($jsonText.Trim() + [Environment]::NewLine)
            $outputParsed = $true
            $outputValidation = Invoke-RoleRunOutputValidation -Root $Root -OutputPath $outputPath
        } catch {
            $parseError = $_.Exception.Message
        }
    } else {
        $parseError = "No JSON object found in Codex stdout."
    }

    $metadata = [pscustomobject]@{
        role_run_id = [string]$context.role_run_id
        context_packet_id = [string]$context.context_packet_id
        agent_id = [string]$context.agent_id
        provider_policy = "Codex App/CLI signed-in route first. No OpenAI API billing by default."
        codex_command = $CodexCommand
        resolved_codex_command = $resolvedCodex
        command_line = ($process.command_line + " < prompt")
        model = $Model
        reasoning = $Reasoning
        ephemeral = $Ephemeral
        started_at = $startedAt
        ended_at = $endedAt
        exit_code = $process.exit_code
        prompt_path = ConvertTo-RepoRelativePath -Root $Root -Path $promptPath
        stdout_log = ConvertTo-RepoRelativePath -Root $Root -Path $stdoutPath
        stderr_log = ConvertTo-RepoRelativePath -Root $Root -Path $stderrPath
        role_run_output_path = if ($outputParsed) { ConvertTo-RepoRelativePath -Root $Root -Path $outputPath } else { "" }
        output_parsed = $outputParsed
        output_validation_ok = $outputValidation.ok
        output_validation = $outputValidation.validation
        parse_error = $parseError
        unexpected_changed_files = @($unexpectedChanges)
        safety = New-SafetyState -PromptWritten $true -CodexCalled $true -OutputWritten $outputParsed -UnexpectedSourceChange (@($unexpectedChanges).Count -gt 0)
    }
    Write-Utf8Text -Path $metadataPath -Text (($metadata | ConvertTo-Json -Depth 32) + [Environment]::NewLine)

    return [pscustomobject]@{
        ok = ($process.exit_code -eq 0 -and $outputParsed -and $outputValidation.ok -and @($unexpectedChanges).Count -eq 0)
        command = "run"
        execute = $true
        role_run_id = [string]$context.role_run_id
        context_packet_id = [string]$context.context_packet_id
        agent_id = [string]$context.agent_id
        run_dir = ConvertTo-RepoRelativePath -Root $Root -Path $runDir
        exit_code = $process.exit_code
        output_parsed = $outputParsed
        output_validation_ok = $outputValidation.ok
        output_validation = $outputValidation.validation
        parse_error = $parseError
        role_run_output_path = if ($outputParsed) { ConvertTo-RepoRelativePath -Root $Root -Path $outputPath } else { "" }
        stdout_log = ConvertTo-RepoRelativePath -Root $Root -Path $stdoutPath
        stderr_log = ConvertTo-RepoRelativePath -Root $Root -Path $stderrPath
        metadata_path = ConvertTo-RepoRelativePath -Root $Root -Path $metadataPath
        unexpected_changed_files = @($unexpectedChanges)
        safety = $metadata.safety
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
    Write-Host "AIWorkflow Studio Staff Executor"
    Write-Host "============================================================"
    Write-Host "Command: $($Result.command)"
    if ($Result.role_run_id) { Write-Host "RoleRun: $($Result.role_run_id)" }
    if ($Result.agent_id) { Write-Host "Agent: $($Result.agent_id)" }
    if ($Result.codex_version) { Write-Host "Codex: $($Result.codex_version)" }
    if ($Result.exit_code -ne $null) { Write-Host "Exit code: $($Result.exit_code)" }
    if ($Result.role_run_output_path) { Write-Host "Output: $($Result.role_run_output_path)" }
    if ($Result.parse_error) { Write-Host "Parse error: $($Result.parse_error)" }
    Write-List -Label "Safety" -Items @(
        "Codex App/CLI signed-in route; no OpenAI API billing",
        "read-only sandbox",
        "no task, approval, canon, commit, or push"
    )
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_staff_executor.bat status|plan <context_packet_json>|run <context_packet_json> [--execute] [--model gpt-5.5] [--reasoning high] [--timeout-seconds 900] [--ephemeral] [--codex-command codex] [--json]"
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $RepoRoot = $repo
    $json = $false
    $execute = $false
    $model = "gpt-5.5"
    $reasoning = "high"
    $timeoutSeconds = 900
    $ephemeral = $false
    $codexCommand = "codex"
    $cleanArgs = New-Object System.Collections.Generic.List[string]

    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--execute") {
            $execute = $true
        } elseif ($arg -ieq "--ephemeral") {
            $ephemeral = $true
        } elseif ($arg -ieq "--model") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--model requires a value." }
            $index += 1
            $model = [string]$CommandArgs[$index]
        } elseif ($arg -ieq "--reasoning") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--reasoning requires a value." }
            $index += 1
            $reasoning = ([string]$CommandArgs[$index]).ToLowerInvariant()
        } elseif ($arg -ieq "--timeout-seconds") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--timeout-seconds requires a value." }
            $index += 1
            $timeoutSeconds = [int]$CommandArgs[$index]
        } elseif ($arg -ieq "--command" -or $arg -ieq "--codex-command") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--command requires a value." }
            $index += 1
            $codexCommand = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add($arg)
        }
    }

    if ($cleanArgs.Count -lt 1) {
        $result = New-UsageResult
    } else {
        $command = ([string]$cleanArgs[0]).ToLowerInvariant()
        if ($command -eq "status" -and $cleanArgs.Count -eq 1) {
            $result = New-StatusResult -CommandPath $codexCommand
        } elseif ($command -eq "plan" -and $cleanArgs.Count -eq 2) {
            $result = New-PlanResult -Root $repo -ContextPath ([string]$cleanArgs[1]) -CodexCommand $codexCommand -Model $model -Reasoning $reasoning -Ephemeral $ephemeral -TimeoutSeconds $timeoutSeconds
        } elseif ($command -eq "run" -and $cleanArgs.Count -eq 2) {
            $result = New-RunResult -Root $repo -ContextPath ([string]$cleanArgs[1]) -CodexCommand $codexCommand -Model $model -Reasoning $reasoning -Ephemeral $ephemeral -TimeoutSeconds $timeoutSeconds -Execute $execute
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
