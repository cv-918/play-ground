param(
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 47831,
  [switch]$KeepServer
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$serverJs = Join-Path $PSScriptRoot "studio_director_console_server.js"
$tempDir = Join-Path $repoRoot "_Temp\AIWorkflowStudio\smoke"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$stdoutPath = Join-Path $tempDir "studio-smoke-$stamp.stdout.txt"
$stderrPath = Join-Path $tempDir "studio-smoke-$stamp.stderr.txt"

function Read-StartupJson {
  param([string]$Path)
  for ($i = 0; $i -lt 60; $i += 1) {
    Start-Sleep -Milliseconds 250
    if (-not (Test-Path $Path)) {
      continue
    }
    $content = Get-Content -Raw -Encoding UTF8 -Path $Path
    if (-not $content.Trim()) {
      continue
    }
    try {
      return $content | ConvertFrom-Json
    } catch {
      continue
    }
  }
  throw "Studio server did not report startup JSON. stdout=$Path stderr=$stderrPath"
}

function Invoke-StudioPost {
  param([string]$BaseUrl, [string]$Path, [object]$Body = @{})
  $uri = "$BaseUrl$Path"
  return Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8) -TimeoutSec 20
}

function Get-PropertyValue {
  param([object]$Object, [string]$Name)
  if ($null -eq $Object -or -not $Name) {
    return $null
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $null
  }
  return $property.Value
}

$process = Start-Process -FilePath "node" `
  -ArgumentList @($serverJs, "--repo-root", $repoRoot, "--host", $BindHost, "--port", [string]$Port, "--json") `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath

$checks = @()
$failures = @()

try {
  $startup = Read-StartupJson -Path $stdoutPath
  $baseUrl = ([string]$startup.url).TrimEnd("/")

  $html = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 20
  $htmlText = [string]$html.Content
  $htmlTokens = @(
    "AIWorkflow Studio Director Console",
    "data-nav=""toolbox""",
    "data-nav=""inbox""",
    "data-nav=""evidence""",
    "meetingParticipantPicker",
    "meetingPresetButtons",
    "meetingTypeHelp",
    "meetingCreateImpact",
    "meetingResultPanel",
    "meetingButtonGuide",
    "meeting-board",
    "meeting-agent-run",
    "studio-smoke-status",
    "completion-decision-plan"
  )
  foreach ($token in $htmlTokens) {
    $ok = $htmlText.Contains($token)
    $checks += [ordered]@{ name = "html token: $token"; ok = $ok }
    if (-not $ok) { $failures += "Missing HTML token: $token" }
  }

  $removedToken = 'id="meetingCreateParticipants"'
  $removedOk = -not $htmlText.Contains($removedToken)
  $checks += [ordered]@{ name = "html removed token: $removedToken"; ok = $removedOk }
  if (-not $removedOk) { $failures += "Removed meeting participant text input is still present." }

  $scriptMatches = [regex]::Matches($htmlText, '(?s)<script>(.*?)</script>')
  if ($scriptMatches.Count -eq 0) {
    $checks += [ordered]@{ name = "client script parse"; ok = $false; error = "No inline script found." }
    $failures += "No inline client script found."
  } else {
    $scriptOk = $true
    for ($scriptIndex = 0; $scriptIndex -lt $scriptMatches.Count; $scriptIndex += 1) {
      $scriptPath = Join-Path $tempDir "studio-smoke-$stamp-client-$scriptIndex.js"
      Set-Content -Encoding UTF8 -Path $scriptPath -Value $scriptMatches[$scriptIndex].Groups[1].Value
      $nodeCheck = Start-Process -FilePath "node" `
        -ArgumentList @("--check", $scriptPath) `
        -WorkingDirectory $repoRoot `
        -WindowStyle Hidden `
        -PassThru `
        -Wait
      if ($nodeCheck.ExitCode -ne 0) {
        $scriptOk = $false
        $failures += "Client script failed node --check: $scriptPath"
      }
    }
    $checks += [ordered]@{ name = "client script parse"; ok = $scriptOk; script_count = $scriptMatches.Count }
  }

  $endpoints = @(
    @{ name = "completion evidence"; path = "/api/studio/completion/evidence-checklist"; key = "completion_evidence_checklist" },
    @{ name = "completion decision"; path = "/api/studio/completion/decision-plan"; key = "completion_decision_plan" },
    @{ name = "approval impact"; path = "/api/studio/approval/impact-plan"; key = "approval_impact_plan" },
    @{ name = "automation readiness"; path = "/api/studio/automation/readiness-plan"; key = "automation_readiness_plan" },
    @{ name = "surface map"; path = "/api/studio/ui/surface-map"; key = "director_surface_map" },
    @{ name = "traceability map"; path = "/api/studio/traceability/map"; key = "traceability_map" },
    @{ name = "recovery plan"; path = "/api/studio/recovery/plan"; key = "studio_recovery_plan" },
    @{ name = "smoke eval plan"; path = "/api/studio/smoke/eval-plan"; key = "studio_eval_plan" },
    @{ name = "smoke status"; path = "/api/studio/smoke/status"; key = "studio_smoke_report" },
    @{ name = "company runtime readiness"; path = "/api/studio/company/runtime-readiness"; key = "company_runtime_readiness_report" },
    @{ name = "project execution plan"; path = "/api/studio/project/execution-plan"; key = "project_execution_plan" },
    @{ name = "model routing plan"; path = "/api/studio/model/routing-plan"; key = "model_routing_plan" }
  )

  foreach ($endpoint in $endpoints) {
    try {
      $result = Invoke-StudioPost -BaseUrl $baseUrl -Path $endpoint.path
      $payload = Get-PropertyValue -Object $result -Name $endpoint.key
      $ok = [bool]$result.ok -and ($null -ne $payload)
      $readOnly = $true
      if ($result.safety -and ($result.safety.PSObject.Properties.Name -contains "read_only")) {
        $readOnly = [bool]$result.safety.read_only
      } elseif ($payload -and $payload.safety -and ($payload.safety.PSObject.Properties.Name -contains "read_only")) {
        $readOnly = [bool]$payload.safety.read_only
      }
      $checks += [ordered]@{ name = $endpoint.name; ok = $ok; read_only = $readOnly; path = $endpoint.path }
      if (-not $ok) { $failures += "Endpoint missing expected payload: $($endpoint.name)" }
      if (-not $readOnly) { $failures += "Endpoint is not read-only: $($endpoint.name)" }
    } catch {
      $checks += [ordered]@{ name = $endpoint.name; ok = $false; error = $_.Exception.Message; path = $endpoint.path }
      $failures += "Endpoint failed: $($endpoint.name) - $($_.Exception.Message)"
    }
  }

  try {
    $meetingSummary = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/summary" -TimeoutSec 20
    $firstMeeting = @($meetingSummary.meetings | Where-Object { $_.path } | Select-Object -First 1)[0]
    if ($firstMeeting) {
      $meetingBody = @{ path = $firstMeeting.path; model = "gpt-5.5"; reasoning = "high" }
      $meetingChecks = @(
        @{ name = "meeting board"; path = "/api/studio/meeting/board"; key = "meeting_board" },
        @{ name = "meeting facilitation"; path = "/api/studio/meeting/facilitation-plan"; key = "meeting_facilitation_plan" },
        @{ name = "meeting runbook"; path = "/api/studio/meeting/runbook"; key = "meeting_runbook" },
        @{ name = "meeting agent turn plan"; path = "/api/studio/meeting/agent-turn-plan"; key = "staff_plan" },
        @{ name = "meeting inspect"; path = "/api/meeting/inspect"; key = "summary" },
        @{ name = "meeting handoff"; path = "/api/meeting/handoff"; key = "handoff_ready" }
      )
      foreach ($meetingCheck in $meetingChecks) {
        $meetingResult = Invoke-StudioPost -BaseUrl $baseUrl -Path $meetingCheck.path -Body $meetingBody
        $payload = Get-PropertyValue -Object $meetingResult -Name $meetingCheck.key
        $ok = [bool]$meetingResult.ok -and ($null -ne $payload)
        if ($meetingCheck.key -eq "meeting_board" -and $ok) {
          $hasTurnCount = $payload.PSObject.Properties.Name -contains "turn_count"
          $hasLastTurn = $payload.PSObject.Properties.Name -contains "last_turn"
          $hasDirectorActions = @($payload.director_next_actions).Count -gt 0
          $ok = $ok -and $hasTurnCount -and $hasLastTurn -and $hasDirectorActions
          $checks += [ordered]@{
            name = $meetingCheck.name
            ok = $ok
            meeting = $firstMeeting.meeting_id
            has_turn_count = $hasTurnCount
            has_last_turn = $hasLastTurn
            has_director_actions = $hasDirectorActions
          }
        } else {
          $checks += [ordered]@{ name = $meetingCheck.name; ok = $ok; meeting = $firstMeeting.meeting_id }
        }
        if (-not $ok) {
          $failures += "Meeting action did not return expected payload: $($meetingCheck.name)"
        }
      }
    } else {
      $checks += [ordered]@{ name = "meeting action smoke"; ok = $true; skipped = "no meeting records" }
    }
  } catch {
    $checks += [ordered]@{ name = "meeting action smoke"; ok = $false; error = $_.Exception.Message }
    $failures += "Meeting action smoke failed: $($_.Exception.Message)"
  }

  try {
    $toolbox = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/toolbox/catalog" -TimeoutSec 20
    $toolCount = [int]$toolbox.toolbox.tool_count
    $hasRestart = [bool](@($toolbox.toolbox.primary_tools + $toolbox.toolbox.categories.tools | Where-Object { $_.id -eq "studio_restart" } | Select-Object -First 1))
    $hasUpload = [bool](@($toolbox.toolbox.primary_tools + $toolbox.toolbox.categories.tools | Where-Object { $_.id -eq "google_drive_data_upload" } | Select-Object -First 1))
    $checks += [ordered]@{ name = "toolbox catalog"; ok = ([bool]$toolbox.ok -and $toolCount -gt 0 -and $hasRestart -and $hasUpload); tool_count = $toolCount; has_restart = $hasRestart; has_upload = $hasUpload }
    if (-not ([bool]$toolbox.ok -and $toolCount -gt 0 -and $hasRestart -and $hasUpload)) {
      $failures += "Toolbox catalog did not expose expected user tools."
    }

    $toolRun = Invoke-StudioPost -BaseUrl $baseUrl -Path "/api/toolbox/run" -Body @{ tool_id = "workflow_status" }
    $toolRunOk = [bool]$toolRun.ok -and $toolRun.toolbox_result -and $toolRun.toolbox_result.tool_id -eq "workflow_status"
    $checks += [ordered]@{ name = "toolbox workflow status"; ok = $toolRunOk; status = $toolRun.toolbox_result.status }
    if (-not $toolRunOk) {
      $failures += "Toolbox workflow status did not run successfully."
    }
  } catch {
    $checks += [ordered]@{ name = "toolbox"; ok = $false; error = $_.Exception.Message }
    $failures += "Toolbox smoke failed: $($_.Exception.Message)"
  }

  try {
    $summary = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/summary" -TimeoutSec 20
    $firstRun = @($summary.recent_staff_runs | Where-Object { $_.output_path } | Select-Object -First 1)[0]
    if ($firstRun -and $firstRun.output_path) {
      $reviewPacket = Invoke-StudioPost -BaseUrl $baseUrl -Path "/api/review-packet/export" -Body @{ path = $firstRun.output_path }
      $reviewOk = [bool]$reviewPacket.ok -and [bool]$reviewPacket.output_path
      $checks += [ordered]@{ name = "staff report export"; ok = $reviewOk; output_path = $reviewPacket.output_path }
      if (-not $reviewOk) { $failures += "Staff report export did not return an output path." }

      $materializePlan = Invoke-StudioPost -BaseUrl $baseUrl -Path "/api/output/materialize-plan" -Body @{ path = $firstRun.output_path }
      $planOk = [bool]$materializePlan.ok -and ($null -ne $materializePlan.materialization)
      $planReadOnly = [bool]$materializePlan.safety.read_only
      $checks += [ordered]@{ name = "staff materialization plan"; ok = $planOk; read_only = $planReadOnly }
      if (-not $planOk) { $failures += "Staff materialization plan did not return a materialization preview." }
      if (-not $planReadOnly) { $failures += "Staff materialization plan was not read-only." }
    } else {
      $checks += [ordered]@{ name = "staff report buttons"; ok = $true; skipped = "No staff output available." }
    }
  } catch {
    $checks += [ordered]@{ name = "staff report buttons"; ok = $false; error = $_.Exception.Message }
    $failures += "Staff report button endpoint smoke failed: $($_.Exception.Message)"
  }

  $result = [ordered]@{
    ok = ($failures.Count -eq 0)
    url = $baseUrl
    requested_port = $Port
    actual_port = $startup.port
    port_fallback_used = $startup.port_fallback_used
    checks = $checks
    failures = $failures
    artifacts = [ordered]@{
      stdout = $stdoutPath
      stderr = $stderrPath
    }
  }

  $result | ConvertTo-Json -Depth 8
  if ($failures.Count -gt 0) {
    exit 1
  }
} finally {
  if (-not $KeepServer -and $process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}
