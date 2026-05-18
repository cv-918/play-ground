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

function Get-OutputPath {
    param(
        [string]$Root,
        [string]$OverridePath
    )

    if ([string]::IsNullOrWhiteSpace($OverridePath)) {
        return (Join-Path $Root "_Temp\AIWorkflowStudio\dashboard\studio_dashboard.html")
    }

    $resolved = Get-FullPathNoResolve -Root $Root -Path $OverridePath
    $tempRoot = [System.IO.Path]::GetFullPath((Join-Path $Root "_Temp"))
    if ($resolved -ne $tempRoot -and -not $resolved.StartsWith($tempRoot + [System.IO.Path]::DirectorySeparatorChar)) {
        throw "--output is only allowed under _Temp for safety: $resolved"
    }
    return $resolved
}

function Html {
    param([string]$Text)

    if ($null -eq $Text) { return "" }
    return [System.Net.WebUtility]::HtmlEncode($Text)
}

function Get-JsonFiles {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }
    return @(Get-ChildItem -LiteralPath $Path -Filter "*.json" -File | Sort-Object Name)
}

function Get-RecordSummaries {
    param(
        [string]$Path,
        [string]$IdField,
        [string]$StatusField,
        [string]$TitleField
    )

    $items = @()
    foreach ($file in (Get-JsonFiles -Path $Path)) {
        try {
            $json = Read-JsonFile -Path $file.FullName
            $items += [pscustomobject]@{
                id = [string]$json.$IdField
                status = [string]$json.$StatusField
                title = [string]$json.$TitleField
                file = $file.Name
            }
        } catch {
            $items += [pscustomobject]@{
                id = "(parse failed)"
                status = "invalid"
                title = $_.Exception.Message
                file = $file.Name
            }
        }
    }
    return @($items)
}

function Get-StoreCount {
    param([string]$Path)

    return @(Get-JsonFiles -Path $Path).Count
}

function Render-List {
    param(
        [object[]]$Items,
        [string]$EmptyText = "No records yet."
    )

    if ($null -eq $Items -or @($Items).Count -eq 0) {
        return "<p class='muted'>" + (Html $EmptyText) + "</p>"
    }

    $html = "<ul>"
    foreach ($item in @($Items)) {
        $title = ""
        if (-not [string]::IsNullOrWhiteSpace([string]$item.title)) {
            $title = " - " + (Html ([string]$item.title))
        }
        $html += "<li><code>" + (Html ([string]$item.id)) + "</code> <span class='pill'>" + (Html ([string]$item.status)) + "</span>" + $title + "<div class='path'>" + (Html ([string]$item.file)) + "</div></li>"
    }
    $html += "</ul>"
    return $html
}

function New-DashboardHtml {
    param(
        [string]$Root,
        [object]$Data
    )

    $generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss K")
    $departmentsHtml = "<ul>"
    foreach ($department in @($Data.departments)) {
        $departmentsHtml += "<li><code>" + (Html ([string]$department.department_id)) + "</code> - " + (Html ([string]$department.display_name)) + "</li>"
    }
    $departmentsHtml += "</ul>"

    $staffHtml = "<ul>"
    foreach ($staff in @($Data.staff)) {
        $staffHtml += "<li><code>" + (Html ([string]$staff.agent_id)) + "</code> <span class='pill'>" + (Html ([string]$staff.department_id)) + "</span> " + (Html ([string]$staff.role_title)) + "</li>"
    }
    $staffHtml += "</ul>"

    return @"
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIWorkflow Studio Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #111318;
      --panel: #1d212b;
      --panel2: #252b36;
      --text: #edf1f7;
      --muted: #aeb7c6;
      --line: #3a4352;
      --accent: #6ea8fe;
      --good: #39c779;
      --warn: #f6b94c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      padding: 28px 20px 18px;
      border-bottom: 1px solid var(--line);
      background: #161a22;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 { margin: 0 0 10px; }
    h1 { font-size: 28px; }
    h2 { font-size: 19px; color: #ffffff; }
    h3 { font-size: 15px; color: var(--muted); }
    p { margin: 7px 0; }
    .muted, .path { color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 14px;
      margin: 16px 0 22px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .metric {
      font-size: 30px;
      font-weight: 700;
      margin: 6px 0;
    }
    .pill {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--panel2);
      border: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    code {
      background: var(--panel2);
      border: 1px solid var(--line);
      border-radius: 5px;
      padding: 1px 5px;
      color: #ffffff;
    }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { margin: 7px 0; }
    .flow {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }
    .step {
      border-left: 4px solid var(--accent);
      background: var(--panel2);
      padding: 10px 12px;
      border-radius: 6px;
    }
    .warning { border-left-color: var(--warn); }
    @media (max-width: 720px) {
      main { padding: 14px; }
      header { padding: 22px 14px 14px; }
      h1 { font-size: 23px; }
      .metric { font-size: 25px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>AIWorkflow Studio Dashboard</h1>
    <p class="muted">읽기 전용 Studio 상태 스냅샷 · generated: $(Html $generatedAt)</p>
    <p class="muted">기본 정책: Codex App/CLI signed-in 경로 우선, OpenAI API billing 기본 요구 없음.</p>
  </header>
  <main>
    <section class="grid">
      <div class="card"><h2>Departments</h2><div class="metric">$(Html ([string]$Data.department_count))</div><p class="muted">Studio 부서 수</p></div>
      <div class="card"><h2>Staff</h2><div class="metric">$(Html ([string]$Data.staff_count))</div><p class="muted">구체 staff agent 수</p></div>
      <div class="card"><h2>WorkOrders</h2><div class="metric">$(Html ([string]$Data.work_order_count))</div><p class="muted">durable WorkOrder 수</p></div>
      <div class="card"><h2>Memory</h2><div class="metric">$(Html ([string]$Data.memory_count))</div><p class="muted">durable MemoryRecord 수</p></div>
      <div class="card"><h2>Meetings</h2><div class="metric">$(Html ([string]$Data.meeting_count))</div><p class="muted">durable MeetingSession 수</p></div>
      <div class="card"><h2>RoleRuns</h2><div class="metric">$(Html ([string]$Data.role_run_count))</div><p class="muted">durable RoleRun 수</p></div>
      <div class="card"><h2>Tool Adapters</h2><div class="metric">$(Html ([string]$Data.tool_adapter_count))</div><p class="muted">registered ToolAdapter 수</p></div>
      <div class="card"><h2>Automation Cases</h2><div class="metric">$(Html ([string]$Data.conditional_case_count))</div><p class="muted">conditional automation policy test 수</p></div>
    </section>

    <section class="card">
      <h2>Director Flow</h2>
      <div class="flow">
        <div class="step"><strong>1. Director Goal</strong><br>Human Director가 목표와 승인 기준을 제시한다.</div>
        <div class="step"><strong>2. Staff Context</strong><br>StaffContextPacket이 역할, 기억, 도구 권한, 금지 범위를 묶는다.</div>
        <div class="step"><strong>3. RoleRun</strong><br>AI 직원은 자기 역할 안에서 제안, 질문, 반박, handoff를 만든다.</div>
        <div class="step"><strong>4. Meeting / Decision</strong><br>회의와 결정은 제안, 승인, canon을 분리해서 기록한다.</div>
        <div class="step"><strong>5. WorkOrder</strong><br>승인된 방향만 WorkOrder가 되고 기존 AIWorkflow Task로 내려간다.</div>
        <div class="step warning"><strong>6. Governance Gate</strong><br>승인, evidence, verification, completion, git gate는 Core가 통제한다.</div>
      </div>
    </section>

    <section class="grid">
      <div class="card"><h2>Departments</h2>$departmentsHtml</div>
      <div class="card"><h2>Staff Agents</h2>$staffHtml</div>
    </section>

    <section class="grid">
      <div class="card"><h2>WorkOrders</h2>$(Render-List -Items $Data.work_orders)</div>
      <div class="card"><h2>Memory Records</h2>$(Render-List -Items $Data.memories)</div>
      <div class="card"><h2>Meeting Sessions</h2>$(Render-List -Items $Data.meetings)</div>
      <div class="card"><h2>RoleRuns</h2>$(Render-List -Items $Data.role_runs)</div>
      <div class="card"><h2>Tool Adapters</h2>$(Render-List -Items $Data.tool_adapters)</div>
    </section>

    <section class="card">
      <h2>Safety</h2>
      <ul>
        <li>이 대시보드 생성은 읽기 전용 상태 수집과 `_Temp` HTML 출력만 수행한다.</li>
        <li>LLM 호출, 도구 실행, Memory/WorkOrder/Task 생성, 승인, runner 시작, source 변경, commit, push 없음.</li>
        <li>제안은 승인도 canon도 아니다. 공식 설정은 Decision과 Memory policy를 통과해야 한다.</li>
      </ul>
    </section>
  </main>
</body>
</html>
"@
}

function New-DashboardData {
    param([string]$Root)

    $deptPath = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\departments.initial.json"
    $staffPath = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\staff_agents.initial.json"
    $deptData = Read-JsonFile -Path $deptPath
    $staffData = Read-JsonFile -Path $staffPath
    $workOrderPath = Join-Path $Root "_Docs\AIWorkflow\Studio\WorkOrders"
    $memoryPath = Join-Path $Root "_Docs\AIWorkflow\Studio\MemoryRecords"
    $meetingPath = Join-Path $Root "_Docs\AIWorkflow\Studio\MeetingSessions"
    $roleRunPath = Join-Path $Root "_Docs\AIWorkflow\Studio\RoleRuns"
    $toolPath = Join-Path $Root "_Docs\AIWorkflow\Studio\Registries\tool_adapters.initial.json"
    $toolData = Read-JsonFile -Path $toolPath
    $conditionalCasesPath = Join-Path $Root "_Docs\AIWorkflow\Studio\Examples\conditional_automation_cases.example.json"
    $conditionalCaseCount = 0
    if (Test-Path -LiteralPath $conditionalCasesPath) {
        $conditionalCaseData = Read-JsonFile -Path $conditionalCasesPath
        $conditionalCaseCount = @($conditionalCaseData.cases).Count
    }
    $toolItems = @()
    foreach ($adapter in @($toolData.tool_adapters)) {
        $toolItems += [pscustomobject]@{
            id = [string]$adapter.adapter_id
            status = [string]$adapter.status
            title = [string]$adapter.display_name
            file = "tool_adapters.initial.json"
        }
    }

    return [pscustomobject]@{
        department_count = @($deptData.departments).Count
        staff_count = @($staffData.staff_agents).Count
        planned_staff_count = @($staffData.planned_staff_agents).Count
        work_order_count = (Get-StoreCount -Path $workOrderPath)
        memory_count = (Get-StoreCount -Path $memoryPath)
        meeting_count = (Get-StoreCount -Path $meetingPath)
        role_run_count = (Get-StoreCount -Path $roleRunPath)
        tool_adapter_count = @($toolData.tool_adapters).Count
        conditional_case_count = $conditionalCaseCount
        departments = @($deptData.departments)
        staff = @($staffData.staff_agents)
        work_orders = (Get-RecordSummaries -Path $workOrderPath -IdField "work_order_id" -StatusField "status" -TitleField "objective")
        memories = (Get-RecordSummaries -Path $memoryPath -IdField "memory_id" -StatusField "status" -TitleField "content")
        meetings = (Get-RecordSummaries -Path $meetingPath -IdField "meeting_id" -StatusField "status" -TitleField "topic")
        role_runs = (Get-RecordSummaries -Path $roleRunPath -IdField "role_run_id" -StatusField "status" -TitleField "agent_id")
        tool_adapters = @($toolItems)
    }
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $json = $false
    $outputOverride = ""

    $argsList = @()
    if ($null -ne $CommandArgs) {
        $argsList = @($CommandArgs)
    }

    for ($index = 0; $index -lt $argsList.Count; $index += 1) {
        $arg = [string]$argsList[$index]
        if ($arg -ieq "--json" -or $arg -ieq "-json") {
            $json = $true
        } elseif ($arg -ieq "--output") {
            if ($index + 1 -ge $argsList.Count) {
                throw "--output requires a path argument."
            }
            $index += 1
            $outputOverride = [string]$argsList[$index]
        } elseif (-not [string]::IsNullOrWhiteSpace($arg)) {
            throw "Unknown argument: $arg"
        }
    }

    $outputPath = Get-OutputPath -Root $repo -OverridePath $outputOverride
    $data = New-DashboardData -Root $repo
    $html = New-DashboardHtml -Root $repo -Data $data

    $outputDir = Split-Path -Parent $outputPath
    if (-not (Test-Path -LiteralPath $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outputPath, $html, $utf8NoBom)

    $result = [pscustomobject]@{
        ok = $true
        output_path = $outputPath
        department_count = $data.department_count
        staff_count = $data.staff_count
        planned_staff_count = $data.planned_staff_count
        work_order_count = $data.work_order_count
        memory_count = $data.memory_count
        meeting_count = $data.meeting_count
        role_run_count = $data.role_run_count
        tool_adapter_count = $data.tool_adapter_count
        conditional_case_count = $data.conditional_case_count
        safety = [pscustomobject]@{
            temp_html_written = $true
            llm_called = $false
            tool_called = $false
            memory_written = $false
            workorder_written = $false
            backlog_written = $false
            source_changed = $false
            git_changed = $false
        }
    }

    if ($json) {
        ConvertTo-StudioJson -Value $result
    } else {
        Write-Host "AIWorkflow Studio dashboard exported"
        Write-Host "output: $outputPath"
        Write-Host "departments: $($data.department_count)"
        Write-Host "staff: $($data.staff_count) concrete, $($data.planned_staff_count) planned"
        Write-Host "workOrders/memory/meetings/roleRuns/tools: $($data.work_order_count) / $($data.memory_count) / $($data.meeting_count) / $($data.role_run_count) / $($data.tool_adapter_count)"
        Write-Host "conditional automation cases: $($data.conditional_case_count)"
        Write-Host "safety: _Temp HTML only; no LLM/tool/task/source/git changes"
    }
    exit 0
} catch {
    $message = $_.Exception.Message
    if ($json) {
        [pscustomobject]@{
            ok = $false
            error = $message
        } | ConvertTo-StudioJson
    } else {
        Write-Host "[ERROR] $message"
    }
    exit 1
}
