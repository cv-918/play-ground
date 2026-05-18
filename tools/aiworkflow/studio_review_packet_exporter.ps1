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

function Get-OutputPath {
    param(
        [string]$Root,
        [string]$OutputPath,
        [string]$OutputId
    )

    if ([string]::IsNullOrWhiteSpace($OutputPath)) {
        return (Join-Path $Root ("_Temp\AIWorkflowStudio\review_packets\{0}.html" -f $OutputId))
    }
    $resolved = Get-FullPathNoResolve -Root $Root -Path $OutputPath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--output is only allowed under _Temp for safety: $resolved"
    }
    return $resolved
}

function Html {
    param([string]$Text)

    if ($null -eq $Text) {
        return ""
    }
    return [System.Net.WebUtility]::HtmlEncode($Text)
}

function Get-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }
    return @($Value | ForEach-Object { [string]$_ })
}

function Render-List {
    param(
        [object[]]$Items,
        [string]$EmptyText = "없음"
    )

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>" + (Html $EmptyText) + "</p>"
    }
    $html = "<ul>"
    foreach ($item in @($Items)) {
        $html += "<li>" + (Html ([string]$item)) + "</li>"
    }
    $html += "</ul>"
    return $html
}

function Render-StatusMeaning {
    param([string]$Status)

    switch ($Status) {
        "output_ready" { return "직원 산출물을 검토할 수 있습니다. 제안/질문/승인 항목을 보고 다음 기록 단계로 넘길지 판단하세요." }
        "needs_director_decision" { return "사람 결정이 필요합니다. 질문이나 승인 항목에 답하기 전에는 제안을 확정하지 않습니다." }
        "needs_evidence" { return "근거가 더 필요합니다. 직원이 결론을 확정하지 않고, 필요한 자료를 분리해서 요청한 상태입니다." }
        "handoff_requested" { return "다른 직원에게 넘길 작업이 있습니다. Handoff를 context packet으로 만든 뒤 다음 직원 실행을 검토하세요." }
        "blocked" { return "진행이 막혔습니다. 차단 이유를 해결하거나 범위를 바꿔야 합니다." }
        "failed" { return "직원 실행이 실패했습니다. 로그와 오류를 먼저 확인해야 합니다." }
        default { return "상태 의미가 등록되어 있지 않습니다. 원본 RoleRunOutput을 확인하세요." }
    }
}

function Render-Proposals {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>제안 없음</p>"
    }
    $html = ""
    $index = 0
    foreach ($proposal in @($Items)) {
        $index += 1
        $html += "<article class='card'>"
        $html += "<h3>" + $index + ". " + (Html ([string]$proposal.title)) + " <span class='pill'>" + (Html ([string]$proposal.status)) + "</span></h3>"
        $html += "<p>" + (Html ([string]$proposal.summary)) + "</p>"
        $html += "<h4>위험</h4>" + (Render-List -Items (Get-StringArray -Value $proposal.risks))
        $html += "<h4>필요 근거</h4>" + (Render-List -Items (Get-StringArray -Value $proposal.evidence_required))
        $html += "</article>"
    }
    return $html
}

function Render-Objections {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>우려 없음</p>"
    }
    $html = ""
    foreach ($item in @($Items)) {
        $class = if ([bool]$item.blocks_progress) { "card danger" } else { "card warning" }
        $html += "<article class='$class'>"
        $html += "<h3>" + (Html ([string]$item.summary)) + " <span class='pill'>" + (Html ([string]$item.severity)) + "</span></h3>"
        $html += "<p>" + (Html ([string]$item.reason)) + "</p>"
        $html += "<p class='muted'>진행 차단: " + (Html ([string]$item.blocks_progress)) + "</p>"
        $html += "</article>"
    }
    return $html
}

function Render-Questions {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>질문 없음</p>"
    }
    $html = ""
    foreach ($item in @($Items)) {
        $class = if ([bool]$item.blocks_progress) { "card warning" } else { "card" }
        $html += "<article class='$class'>"
        $html += "<h3>" + (Html ([string]$item.question)) + "</h3>"
        $html += "<p>" + (Html ([string]$item.why_needed)) + "</p>"
        $html += "<p class='muted'>답변 전 진행 차단: " + (Html ([string]$item.blocks_progress)) + "</p>"
        $html += "</article>"
    }
    return $html
}

function Render-ApprovalItems {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>승인 항목 없음</p>"
    }
    $html = ""
    foreach ($item in @($Items)) {
        $html += "<article class='card approval'>"
        $html += "<h3>" + (Html ([string]$item.plain_language_summary)) + " <span class='pill'>" + (Html ([string]$item.type)) + "</span></h3>"
        $html += "<h4>승인하면 바뀌는 것</h4>" + (Render-List -Items (Get-StringArray -Value $item.what_will_change))
        $html += "<h4>승인해도 바뀌지 않는 것</h4>" + (Render-List -Items (Get-StringArray -Value $item.what_will_not_change))
        $html += "<h4>위험</h4>" + (Render-List -Items (Get-StringArray -Value $item.risks))
        $html += "<h4>필요 근거</h4>" + (Render-List -Items (Get-StringArray -Value $item.evidence_required))
        $rollback = Get-StringArray -Value $item.rollback_plan
        if (@($rollback).Count -gt 0) {
            $html += "<h4>되돌리는 방법</h4>" + (Render-List -Items $rollback)
        }
        $html += "</article>"
    }
    return $html
}

function Render-Handoffs {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>handoff 요청 없음</p>"
    }
    $html = ""
    foreach ($item in @($Items)) {
        $html += "<article class='card'>"
        $html += "<h3>" + (Html ([string]$item.target_agent_id)) + "</h3>"
        $html += "<p>" + (Html ([string]$item.objective)) + "</p>"
        $html += "<h4>필요 context</h4>" + (Render-List -Items (Get-StringArray -Value $item.required_context))
        $html += "<h4>기대 산출물</h4>" + (Render-List -Items (Get-StringArray -Value $item.expected_output))
        $html += "</article>"
    }
    return $html
}

function Render-WorkOrders {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>WorkOrder 후보 없음</p>"
    }
    $html = ""
    foreach ($item in @($Items)) {
        $html += "<article class='card'>"
        $html += "<h3>" + (Html ([string]$item.objective)) + " <span class='pill'>" + (Html ([string]$item.department_id)) + "</span></h3>"
        $html += "<h4>범위</h4>" + (Render-List -Items (Get-StringArray -Value $item.scope))
        $html += "<h4>하지 않는 것</h4>" + (Render-List -Items (Get-StringArray -Value $item.non_goals))
        $html += "<h4>기대 산출물</h4>" + (Render-List -Items (Get-StringArray -Value $item.expected_outputs))
        $html += "</article>"
    }
    return $html
}

function Render-MemoryRequests {
    param([object[]]$Items)

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>메모리 기록 후보 없음</p>"
    }
    $html = ""
    foreach ($item in @($Items)) {
        $html += "<article class='card'>"
        $html += "<h3>" + (Html ([string]$item.scope)) + " <span class='pill'>" + (Html ([string]$item.status)) + "</span></h3>"
        $html += "<p>" + (Html ([string]$item.summary)) + "</p>"
        $html += "<p class='muted'>승인 필요: " + (Html ([string]$item.requires_approval)) + "</p>"
        $html += "</article>"
    }
    return $html
}

function Render-Safety {
    param([object]$Safety)

    $items = @(
        "source_changed: " + [string]$Safety.source_changed,
        "task_created: " + [string]$Safety.task_created,
        "approval_changed: " + [string]$Safety.approval_changed,
        "canon_changed: " + [string]$Safety.canon_changed,
        "commit_or_push_performed: " + [string]$Safety.commit_or_push_performed
    )
    return Render-List -Items $items
}

function Invoke-RoleRunOutputInspection {
    param(
        [string]$Root,
        [string]$OutputPath
    )

    $script = Join-Path $Root "tools\aiworkflow\studio_staff_runtime.ps1"
    $raw = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -RepoRoot $Root inspect-output $OutputPath --json
    $exitCode = $LASTEXITCODE
    if ([string]::IsNullOrWhiteSpace(($raw -join [Environment]::NewLine))) {
        throw "RoleRunOutput inspection produced no output."
    }
    $parsed = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
    if ($exitCode -ne 0 -or -not [bool]$parsed.validation.ok) {
        $errors = @($parsed.validation.errors) -join "; "
        throw "RoleRunOutput validation failed: $errors"
    }
    return $parsed
}

function Get-RecommendedNextSteps {
    param([object]$Output)

    $steps = @()
    switch ([string]$Output.status) {
        "needs_evidence" {
            $steps += "차단 질문에 필요한 자료를 보강하세요."
            $steps += "자료가 준비되면 새 StaffContextPacket 또는 Handoff를 만들어 다시 실행하세요."
        }
        "needs_director_decision" {
            $steps += "질문과 승인 항목에 먼저 답하세요."
            $steps += "승인된 항목만 Decision 또는 Memory/WorkOrder 기록으로 넘기세요."
        }
        "output_ready" {
            $steps += "제안과 우려를 검토한 뒤 materialize/review 단계로 넘길지 결정하세요."
            $steps += "바로 canon/task/commit으로 넘기지 마세요."
        }
        "handoff_requested" {
            $steps += "handoff 요청을 검토하고, 필요하면 Handoff Router로 다음 직원 context를 만드세요."
        }
        default {
            $steps += "원본 RoleRunOutput과 로그를 확인하세요."
        }
    }
    if (@($Output.objections | Where-Object { [bool]$_.blocks_progress }).Count -gt 0) {
        $steps += "진행을 막는 우려가 있으므로, 완료나 승인보다 우려 해결이 먼저입니다."
    }
    if (@($Output.approval_items).Count -gt 0) {
        $steps += "승인 항목은 '무엇이 바뀌는지'를 확인한 뒤 결정하세요."
    }
    return @($steps)
}

function New-ReviewHtml {
    param(
        [object]$Output,
        [string]$InputPath
    )

    $title = "AIWorkflow Studio Review Packet - " + [string]$Output.output_id
    $nextSteps = Get-RecommendedNextSteps -Output $Output
    $generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss K")

    return @"
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$(Html $title)</title>
  <style>
    :root { color-scheme: dark; --bg:#15171c; --panel:#20232b; --panel2:#262b35; --text:#f2f4f8; --muted:#a9b0bd; --line:#3a414f; --accent:#7aa7ff; --warn:#f1b44c; --danger:#ff6b6b; --ok:#43c982; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "Segoe UI", Arial, sans-serif; background:var(--bg); color:var(--text); line-height:1.5; }
    main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    header { margin-bottom: 18px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 20px; margin: 26px 0 10px; border-top: 1px solid var(--line); padding-top: 20px; }
    h3 { font-size: 16px; margin: 0 0 10px; }
    h4 { font-size: 13px; margin: 14px 0 6px; color: var(--muted); }
    p { margin: 8px 0; }
    code { background:#12141a; border:1px solid var(--line); padding:2px 5px; border-radius:5px; }
    ul { margin: 6px 0 0 20px; padding:0; }
    li { margin: 4px 0; }
    .hero, .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    .hero { border-left: 4px solid var(--accent); }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
    .card { margin: 10px 0; background:var(--panel2); }
    .warning { border-left: 4px solid var(--warn); }
    .danger { border-left: 4px solid var(--danger); }
    .approval { border-left: 4px solid var(--ok); }
    .pill { display:inline-block; color:#dfe7ff; background:#30394a; border:1px solid #50607b; padding:1px 7px; border-radius:999px; font-size:12px; vertical-align:middle; }
    .muted { color:var(--muted); }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
    .meta span { background:#1a1d24; border:1px solid var(--line); border-radius:6px; padding:5px 8px; }
    @media (max-width: 640px) {
      main { padding: 14px; }
      h1 { font-size: 22px; }
      .hero, .card { padding: 13px; }
    }
  </style>
</head>
<body>
<main>
  <header class="hero">
    <h1>AI 직원 산출물 리뷰 패킷</h1>
    <p><strong>현재 의미:</strong> $(Html (Render-StatusMeaning -Status ([string]$Output.status)))</p>
    <div class="meta">
      <span>output <code>$(Html ([string]$Output.output_id))</code></span>
      <span>role run <code>$(Html ([string]$Output.role_run_id))</code></span>
      <span>agent <code>$(Html ([string]$Output.agent_id))</code></span>
      <span>status <code>$(Html ([string]$Output.status))</code></span>
    </div>
    <p class="muted">입력: $(Html $InputPath) · 생성: $(Html $generatedAt)</p>
  </header>

  <section>
    <h2>요약</h2>
    <div class="card"><p>$(Html ([string]$Output.plain_language_summary))</p></div>
  </section>

  <section>
    <h2>다음 판단</h2>
    <div class="card approval">$(Render-List -Items $nextSteps)</div>
  </section>

  <section>
    <h2>질문</h2>
    $(Render-Questions -Items @($Output.questions))
  </section>

  <section>
    <h2>승인 항목</h2>
    $(Render-ApprovalItems -Items @($Output.approval_items))
  </section>

  <section>
    <h2>우려 / 반대 의견</h2>
    $(Render-Objections -Items @($Output.objections))
  </section>

  <section>
    <h2>제안</h2>
    $(Render-Proposals -Items @($Output.proposals))
  </section>

  <section>
    <h2>Handoff 요청</h2>
    $(Render-Handoffs -Items @($Output.handoff_requests))
  </section>

  <section>
    <h2>WorkOrder 후보</h2>
    $(Render-WorkOrders -Items @($Output.workorder_recommendations))
  </section>

  <section>
    <h2>메모리 기록 후보</h2>
    $(Render-MemoryRequests -Items @($Output.memory_write_requests))
  </section>

  <section>
    <h2>증거 / 안전 상태</h2>
    <div class="grid">
      <div class="card"><h3>증거 refs</h3>$(Render-List -Items (Get-StringArray -Value $Output.evidence_refs))</div>
      <div class="card"><h3>안전 상태</h3>$(Render-Safety -Safety $Output.safety)</div>
    </div>
  </section>
</main>
</body>
</html>
"@
}

function New-ExportResult {
    param(
        [string]$Root,
        [string]$InputPath,
        [string]$OutputOverride
    )

    $resolvedInput = Resolve-RepoFilePath -Root $Root -Path $InputPath
    $inspection = Invoke-RoleRunOutputInspection -Root $Root -OutputPath $resolvedInput
    $output = $inspection.output
    if ([string]::IsNullOrWhiteSpace([string]$output.output_id)) {
        throw "Input is not a RoleRunOutput JSON: missing output_id."
    }
    $html = New-ReviewHtml -Output $output -InputPath (ConvertTo-RepoRelativePath -Root $Root -Path $resolvedInput)
    $outputPath = Get-OutputPath -Root $Root -OutputPath $OutputOverride -OutputId ([string]$output.output_id)
    Write-Utf8Text -Path $outputPath -Text $html
    return [pscustomobject]@{
        ok = $true
        command = "export"
        input_path = ConvertTo-RepoRelativePath -Root $Root -Path $resolvedInput
        output_id = [string]$output.output_id
        role_run_id = [string]$output.role_run_id
        agent_id = [string]$output.agent_id
        status = [string]$output.status
        validation = $inspection.validation
        output_path = ConvertTo-RepoRelativePath -Root $Root -Path $outputPath
        counts = [pscustomobject]@{
            proposals = @($output.proposals).Count
            objections = @($output.objections).Count
            questions = @($output.questions).Count
            approval_items = @($output.approval_items).Count
            handoffs = @($output.handoff_requests).Count
            workorders = @($output.workorder_recommendations).Count
            memory_requests = @($output.memory_write_requests).Count
        }
        safety = [pscustomobject]@{
            temp_html_written = $true
            role_run_output_changed = $false
            llm_called = $false
            tool_called = $false
            task_created = $false
            approval_changed = $false
            canon_changed = $false
            source_changed = $false
            git_changed = $false
        }
    }
}

function New-UsageResult {
    return [pscustomobject]@{
        ok = $false
        error = "Usage: tools\aiworkflow\studio_review_packet_exporter.bat export <role_run_output_json> [--output _Temp\\...] [--json]"
    }
}

function Show-Result {
    param([object]$Result)

    Write-Host "============================================================"
    Write-Host "AIWorkflow Studio Review Packet Exporter"
    Write-Host "============================================================"
    Write-Host "Output: $($Result.output_path)"
    Write-Host "RoleRunOutput: $($Result.output_id)"
    Write-Host "Agent: $($Result.agent_id)"
    Write-Host "Status: $($Result.status)"
    Write-Host "No LLM/tool/task/source/git changes."
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $outputOverride = ""
    $cleanArgs = New-Object System.Collections.Generic.List[string]
    for ($index = 0; $index -lt @($CommandArgs).Count; $index += 1) {
        $arg = [string]$CommandArgs[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--output") {
            if ($index + 1 -ge @($CommandArgs).Count) { throw "--output requires a path." }
            $index += 1
            $outputOverride = [string]$CommandArgs[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            $cleanArgs.Add($arg)
        }
    }

    if ($cleanArgs.Count -eq 2 -and ([string]$cleanArgs[0]).ToLowerInvariant() -eq "export") {
        $result = New-ExportResult -Root $repo -InputPath ([string]$cleanArgs[1]) -OutputOverride $outputOverride
    } else {
        $result = New-UsageResult
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } else {
        if ($result.ok) { Show-Result -Result $result } else { Write-Host "[ERROR] $($result.error)" }
    }
    if ($result.ok) { exit 0 }
    exit 1
} catch {
    $message = $_.Exception.Message
    if ($json) {
        [pscustomobject]@{ ok = $false; error = $message } | ConvertTo-Json -Depth 16
    } else {
        Write-Host "[ERROR] $message"
    }
    exit 1
}
