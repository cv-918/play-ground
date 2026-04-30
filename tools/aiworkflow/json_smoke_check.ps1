param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [Parameter(Mandatory=$true)]
    [string]$DataDir
)

$ErrorActionPreference = "Stop"

$repo = Resolve-Path $RepoRoot
$target = Join-Path $repo $DataDir

if (-not (Test-Path $target)) {
    Write-Host "[ERROR] Data directory not found: $target"
    exit 2
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir = Join-Path $repo "_Temp\AIWorkflowReports"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$report = Join-Path $outDir "json_smoke_$timestamp.txt"

$files = Get-ChildItem -Path $target -Filter "*.json" -Recurse -File | Sort-Object FullName
$total = 0
$failed = 0

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("AIWorkflow JSON Smoke Check")
$lines.Add("Timestamp: $timestamp")
$lines.Add("Repository: $repo")
$lines.Add("DataDir: $DataDir")
$lines.Add("")

foreach ($file in $files) {
    $total++
    $relative = Resolve-Path -Relative $file.FullName
    try {
        $raw = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $null = $raw | ConvertFrom-Json
        $line = "[OK]   $relative"
        Write-Host $line
        $lines.Add($line)
    }
    catch {
        $failed++
        $msg = $_.Exception.Message -replace "`r|`n", " "
        $line = "[FAIL] $relative :: $msg"
        Write-Host $line
        $lines.Add($line)
    }
}

$lines.Add("")
$lines.Add("Summary:")
$lines.Add("Total: $total")
$lines.Add("Failed: $failed")
$lines | Set-Content -Path $report -Encoding UTF8

Write-Host ""
Write-Host "Report: $report"
Write-Host "Total: $total"
Write-Host "Failed: $failed"

if ($failed -gt 0) {
    exit 1
}

exit 0
