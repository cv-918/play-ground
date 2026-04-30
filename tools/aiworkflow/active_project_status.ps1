param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "JSON file not found: $Path"
    }

    $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    return $raw | ConvertFrom-Json
}

function As-Array {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    return @($Value)
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $activeProjectPath = Join-Path $repo "_Docs\AIWorkflow\ActiveProject.json"

    $selector = Read-JsonFile -Path $activeProjectPath

    $issues = @()

    if ([string]::IsNullOrWhiteSpace($selector.schema_version)) {
        $issues += "schema_version is missing."
    }

    if ([string]::IsNullOrWhiteSpace($selector.active_project_id)) {
        $issues += "active_project_id is missing."
    }

    if ([string]::IsNullOrWhiteSpace($selector.profile_path)) {
        $issues += "profile_path is missing."
    }

    $profileFullPath = ""
    $profile = $null

    if (-not [string]::IsNullOrWhiteSpace($selector.profile_path)) {
        $profileFullPath = Join-Path $repo $selector.profile_path

        if (-not (Test-Path -LiteralPath $profileFullPath)) {
            $issues += "profile_path does not exist: $($selector.profile_path)"
        }
        else {
            $profile = Read-JsonFile -Path $profileFullPath

            if ($null -eq $profile) {
                $issues += "profile JSON could not be parsed."
            }
            elseif ($profile.project_id -ne $selector.active_project_id) {
                $issues += "profile project_id does not match active_project_id. profile=$($profile.project_id), active=$($selector.active_project_id)"
            }
        }
    }

    $validationPassed = ($issues.Count -eq 0)

    $result = [pscustomobject]@{
        ok = $validationPassed
        repository = [string]$repo
        active_project_file = "_Docs/AIWorkflow/ActiveProject.json"
        active_project = [pscustomobject]@{
            schema_version = $selector.schema_version
            active_project_id = $selector.active_project_id
            profile_path = $selector.profile_path
            updated_at = $selector.updated_at
            updated_by = $selector.updated_by
            reason = $selector.reason
        }
        profile = if ($null -ne $profile) {
            [pscustomobject]@{
                project_id = $profile.project_id
                display_name = $profile.display_name
                project_type = $profile.project_type
                engine = $profile.engine
                engine_version = $profile.engine_version
                repo_path = $profile.repo_path
                docs_path = $profile.docs_path
                devlog_path = $profile.devlog_path
                source_roots = @(As-Array $profile.source_roots)
                data_roots = @(As-Array $profile.data_roots)
                asset_roots = @(As-Array $profile.asset_roots)
                release_targets = @(As-Array $profile.release_targets)
                validation_profiles_count = @(As-Array $profile.validation_profiles).Count
                build_profiles_count = @(As-Array $profile.build_profiles).Count
            }
        } else {
            $null
        }
        validation = [pscustomobject]@{
            passed = $validationPassed
            issues = @($issues)
        }
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 8
        if ($validationPassed) {
            exit 0
        }
        exit 1
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Active Project Status"
    Write-Host "============================================================"
    Write-Host ""

    Write-Host "[Active Project]"
    Write-Host "Project ID:   $($selector.active_project_id)"
    Write-Host "Profile Path: $($selector.profile_path)"
    Write-Host "Updated At:   $($selector.updated_at)"
    Write-Host "Updated By:   $($selector.updated_by)"
    Write-Host "Reason:       $($selector.reason)"
    Write-Host ""

    if ($null -ne $profile) {
        Write-Host "[Resolved Profile]"
        Write-Host "Display Name: $($profile.display_name)"
        Write-Host "Engine:       $($profile.engine)"
        Write-Host "Type:         $($profile.project_type)"
        Write-Host "Repo Path:    $($profile.repo_path)"
        Write-Host "Docs Path:    $($profile.docs_path)"
        Write-Host "DevLog Path:  $($profile.devlog_path)"
        Write-Host ""
    }

    Write-Host "[Validation]"
    if ($validationPassed) {
        Write-Host "[OK] Active project selector is valid."
    }
    else {
        Write-Host "[FAIL] Active project selector is invalid."
        foreach ($issue in $issues) {
            Write-Host "- $issue"
        }
    }

    Write-Host ""
    Write-Host "============================================================"
    Write-Host "Done."
    Write-Host "============================================================"

    if ($validationPassed) {
        exit 0
    }

    exit 1
}
catch {
    if ($Json) {
        [pscustomobject]@{
            ok = $false
            error = $_.Exception.Message
            script = "active_project_status.ps1"
            line = $_.InvocationInfo.ScriptLineNumber
            command = $_.InvocationInfo.Line
        } | ConvertTo-Json -Depth 4
        exit 1
    }

    Write-Host "[ERROR] active_project_status.ps1 failed: $($_.Exception.Message)"
    Write-Host "Line: $($_.InvocationInfo.ScriptLineNumber)"
    Write-Host "Command: $($_.InvocationInfo.Line)"
    exit 1
}
