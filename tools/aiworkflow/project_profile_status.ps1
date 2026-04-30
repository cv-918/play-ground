param(
    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [string]$ProjectId = "",

    [switch]$Json,

    [switch]$List
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

function Read-ProfileFile {
    param([string]$Path)

    try {
        $obj = Read-JsonFile -Path $Path
        return [pscustomobject]@{
            ok = $true
            path = $Path
            data = $obj
            error = ""
        }
    }
    catch {
        return [pscustomobject]@{
            ok = $false
            path = $Path
            data = $null
            error = $_.Exception.Message
        }
    }
}

function Resolve-ActiveProjectId {
    param([string]$Repo)

    $activeProjectPath = Join-Path $Repo "_Docs\AIWorkflow\ActiveProject.json"

    if (-not (Test-Path -LiteralPath $activeProjectPath)) {
        return "dustland_custom_cpp_prototype"
    }

    $selector = Read-JsonFile -Path $activeProjectPath

    if ([string]::IsNullOrWhiteSpace($selector.active_project_id)) {
        throw "ActiveProject.json exists but active_project_id is empty."
    }

    return $selector.active_project_id
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

function Get-RequiredFieldIssues {
    param($Profile)

    $required = @(
        "schema_version",
        "project_id",
        "display_name",
        "project_type",
        "engine",
        "repo_path",
        "docs_path",
        "devlog_path",
        "workflow_state_files",
        "source_roots",
        "data_roots",
        "asset_roots",
        "build_profiles",
        "validation_profiles",
        "release_targets",
        "approval_policy",
        "tool_adapters"
    )

    $missing = @()
    $names = @($Profile.PSObject.Properties.Name)

    foreach ($field in $required) {
        if (-not ($names -contains $field)) {
            $missing += $field
        }
    }

    return @($missing)
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path
    $profilesDir = Join-Path $repo "_Docs\AIWorkflow\ProjectProfiles"

    if (-not (Test-Path -LiteralPath $profilesDir)) {
        throw "ProjectProfiles directory not found: $profilesDir"
    }

    $profileFiles = @(Get-ChildItem -Path $profilesDir -Filter "*.json" -File | Sort-Object Name)

    $loaded = @()
    $loadFailures = @()

    foreach ($file in $profileFiles) {
        $r = Read-ProfileFile -Path $file.FullName
        if ($r.ok) {
            $loaded += $r
        }
        else {
            $loadFailures += $r
        }
    }

    if ($List) {
        if ($Json) {
            [pscustomobject]@{
                profiles_dir = [string]$profilesDir
                profiles = @($loaded | ForEach-Object {
                    [pscustomobject]@{
                        file = Split-Path $_.path -Leaf
                        project_id = $_.data.project_id
                        display_name = $_.data.display_name
                        engine = $_.data.engine
                        project_type = $_.data.project_type
                    }
                })
                load_failures = @($loadFailures | ForEach-Object {
                    [pscustomobject]@{
                        file = Split-Path $_.path -Leaf
                        error = $_.error
                    }
                })
            } | ConvertTo-Json -Depth 6
            exit 0
        }

        Write-Host "============================================================"
        Write-Host "AIWorkflow Project Profiles"
        Write-Host "============================================================"
        Write-Host ""
        Write-Host "Profiles Dir: $profilesDir"
        Write-Host ""

        if ($loaded.Count -eq 0) {
            Write-Host "(no valid profiles found)"
        }
        else {
            foreach ($p in $loaded) {
                Write-Host ("- {0} | {1} | {2} | {3}" -f $p.data.project_id, $p.data.display_name, $p.data.engine, (Split-Path $p.path -Leaf))
            }
        }

        if ($loadFailures.Count -gt 0) {
            Write-Host ""
            Write-Host "[Load Failures]"
            foreach ($f in $loadFailures) {
                Write-Host ("- {0}: {1}" -f (Split-Path $f.path -Leaf), $f.error)
            }
            exit 1
        }

        exit 0
    }

    if ([string]::IsNullOrWhiteSpace($ProjectId)) {
        $ProjectId = Resolve-ActiveProjectId -Repo $repo
    }

    $selected = $null

    foreach ($p in $loaded) {
        $fileBase = [System.IO.Path]::GetFileNameWithoutExtension($p.path)
        if ($p.data.project_id -eq $ProjectId -or $fileBase -eq $ProjectId) {
            $selected = $p
            break
        }
    }

    if ($null -eq $selected) {
        if ($Json) {
            [pscustomobject]@{
                ok = $false
                error = "Project profile not found: $ProjectId"
                available_profiles = @($loaded | ForEach-Object { $_.data.project_id })
            } | ConvertTo-Json -Depth 5
            exit 3
        }

        Write-Host "[ERROR] Project profile not found: $ProjectId"
        Write-Host ""
        Write-Host "Available profiles:"
        foreach ($p in $loaded) {
            Write-Host ("- {0}" -f $p.data.project_id)
        }
        exit 3
    }

    $profile = $selected.data
    $missingFields = @(Get-RequiredFieldIssues -Profile $profile)

    $buildProfiles = @(As-Array $profile.build_profiles)
    $validationProfiles = @(As-Array $profile.validation_profiles)
    $releaseTargets = @(As-Array $profile.release_targets)
    $forbidden = @(As-Array $profile.forbidden_operations)
    $readonly = @(As-Array $profile.allowed_readonly_commands)
    $writeCommands = @(As-Array $profile.allowed_write_commands)

    $result = [pscustomobject]@{
        profiles_dir = [string]$profilesDir
        profile_file = [string]$selected.path
        resolved_from_active_project = [string]::IsNullOrWhiteSpace($PSBoundParameters["ProjectId"])
        profile_valid_json = $true
        missing_required_fields = @($missingFields)
        project = [pscustomobject]@{
            project_id = $profile.project_id
            display_name = $profile.display_name
            project_type = $profile.project_type
            engine = $profile.engine
            engine_version = $profile.engine_version
            repo_path = $profile.repo_path
            docs_path = $profile.docs_path
            devlog_path = $profile.devlog_path
        }
        roots = [pscustomobject]@{
            source_roots = @(As-Array $profile.source_roots)
            data_roots = @(As-Array $profile.data_roots)
            asset_roots = @(As-Array $profile.asset_roots)
        }
        counts = [pscustomobject]@{
            build_profiles = $buildProfiles.Count
            validation_profiles = $validationProfiles.Count
            release_targets = $releaseTargets.Count
            allowed_readonly_commands = $readonly.Count
            allowed_write_commands = $writeCommands.Count
            forbidden_operations = $forbidden.Count
        }
        build_profiles = @($buildProfiles)
        validation_profiles = @($validationProfiles)
        release_targets = @($releaseTargets)
        approval_policy = $profile.approval_policy
        tool_adapters = $profile.tool_adapters
        forbidden_operations = @($forbidden)
        notes = @(As-Array $profile.notes)
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 10
        exit 0
    }

    Write-Host "============================================================"
    Write-Host "AIWorkflow Project Profile Status"
    Write-Host "============================================================"
    Write-Host ""

    Write-Host "[Profile]"
    Write-Host "File:         $($selected.path)"
    Write-Host "Project ID:   $($profile.project_id)"
    Write-Host "Display Name: $($profile.display_name)"
    Write-Host "Type:         $($profile.project_type)"
    Write-Host "Engine:       $($profile.engine)"
    Write-Host "Engine Ver:   $($profile.engine_version)"
    Write-Host "Resolved From ActiveProject: $([string]::IsNullOrWhiteSpace($PSBoundParameters["ProjectId"]))"
    Write-Host ""

    Write-Host "[Paths]"
    Write-Host "Repo:   $($profile.repo_path)"
    Write-Host "Docs:   $($profile.docs_path)"
    Write-Host "DevLog: $($profile.devlog_path)"
    Write-Host ""

    Write-Host "[Profile Validation]"
    if ($missingFields.Count -eq 0) {
        Write-Host "[OK] Required fields present."
    } else {
        Write-Host "[WARN] Missing required fields:"
        foreach ($m in $missingFields) { Write-Host "- $m" }
    }
    Write-Host ""

    Write-Host "[Validation Profiles]"
    if ($validationProfiles.Count -eq 0) {
        Write-Host "(none)"
    } else {
        foreach ($v in $validationProfiles) {
            Write-Host ("- {0} | {1} | approval={2}" -f $v.id, $v.label, $v.requires_approval)
        }
    }
    Write-Host ""

    Write-Host "[Release Targets]"
    if ($releaseTargets.Count -eq 0) {
        Write-Host "(none)"
    } else {
        foreach ($r in $releaseTargets) {
            Write-Host ("- {0} | {1} | {2}" -f $r.id, $r.label, $r.type)
        }
    }
    Write-Host ""

    Write-Host "[Forbidden Operations]"
    if ($forbidden.Count -eq 0) {
        Write-Host "(none)"
    } else {
        foreach ($op in $forbidden) { Write-Host "- $op" }
    }
    Write-Host ""

    Write-Host "============================================================"
    Write-Host "Done."
    Write-Host "============================================================"
    exit 0
}
catch {
    if ($Json) {
        [pscustomobject]@{
            ok = $false
            error = $_.Exception.Message
            script = "project_profile_status.ps1"
            line = $_.InvocationInfo.ScriptLineNumber
            command = $_.InvocationInfo.Line
        } | ConvertTo-Json -Depth 4
        exit 1
    }

    Write-Host "[ERROR] project_profile_status.ps1 failed: $($_.Exception.Message)"
    Write-Host "Line: $($_.InvocationInfo.ScriptLineNumber)"
    Write-Host "Command: $($_.InvocationInfo.Line)"
    exit 1
}
