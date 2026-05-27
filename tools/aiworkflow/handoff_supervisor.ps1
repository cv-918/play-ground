param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "scan", "write-docs")]
    [string]$Command,

    [Parameter(Mandatory=$true)]
    [string]$RepoRoot,

    [string]$Role = "",

    [switch]$Execute,

    [switch]$Json
)

$ErrorActionPreference = "Stop"

$KnownRoles = @("Planner", "Developer", "Artist", "Reviewer", "QA")
$DeliveryStatuses = @("Draft", "Ready", "Claimed", "ReviewRequested", "QARequested", "Done", "Blocked", "Archived")
$ExecutionStatuses = @("NotStarted", "Planning", "WaitingUserApproval", "InProgress", "ReviewRequested", "QARequested", "Done", "Blocked")
$RiskLevels = @("Low", "Medium", "High")
$ApprovalStates = @("NotRequired", "Required", "Requested", "Approved", "Rejected", "Superseded")

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $base = [System.IO.Path]::GetFullPath($BasePath)
    $full = [System.IO.Path]::GetFullPath($FullPath)

    if (-not $base.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $base = $base + [System.IO.Path]::DirectorySeparatorChar
    }

    $baseUri = [System.Uri]::new($base)
    $fullUri = [System.Uri]::new($full)
    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fullUri).ToString()).Replace("/", "\")
}

function Normalize-ManifestValue {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    $v = $Value.Trim()

    if ($v.StartsWith('"') -and $v.EndsWith('"') -and $v.Length -ge 2) {
        return $v.Substring(1, $v.Length - 2)
    }

    if ($v.StartsWith("'") -and $v.EndsWith("'") -and $v.Length -ge 2) {
        return $v.Substring(1, $v.Length - 2)
    }

    if ($v -eq "[]") {
        return @()
    }

    if ($v -eq "true") {
        return $true
    }

    if ($v -eq "false") {
        return $false
    }

    return $v
}

function ConvertTo-ArrayValue {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        return @($Value)
    }

    if ([string]::IsNullOrWhiteSpace([string]$Value)) {
        return @()
    }

    return @([string]$Value)
}

function Read-SimpleManifest {
    param([string]$Path)

    $lines = [System.IO.File]::ReadAllLines($Path, [System.Text.Encoding]::UTF8)
    $data = @{}
    $duplicateTopLevelKeys = [System.Collections.Generic.List[string]]::new()
    $currentTopKey = ""

    foreach ($rawLine in $lines) {
        $line = $rawLine.TrimEnd()

        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        if ($line.TrimStart().StartsWith("#")) {
            continue
        }

        if ($line -match "^([A-Za-z0-9_]+):\s*(.*)$") {
            $currentTopKey = $matches[1]
            $valueText = $matches[2]

            if ($data.ContainsKey($currentTopKey)) {
                [void]$duplicateTopLevelKeys.Add($currentTopKey)
            }

            if ([string]::IsNullOrWhiteSpace($valueText)) {
                if (-not $data.ContainsKey($currentTopKey)) {
                    $data[$currentTopKey] = @()
                }
            }
            else {
                $data[$currentTopKey] = Normalize-ManifestValue -Value $valueText
            }

            continue
        }

        if ($line -match "^\s+-\s*(.*)$" -and -not [string]::IsNullOrWhiteSpace($currentTopKey)) {
            $value = Normalize-ManifestValue -Value $matches[1]
            $existing = @(ConvertTo-ArrayValue -Value $data[$currentTopKey])
            $data[$currentTopKey] = @($existing) + @($value)
            continue
        }

        if ($line -match "^\s{2}([A-Za-z0-9_]+):\s*(.*)$" -and -not [string]::IsNullOrWhiteSpace($currentTopKey)) {
            if (-not ($data[$currentTopKey] -is [hashtable])) {
                $data[$currentTopKey] = @{}
            }

            $data[$currentTopKey][$matches[1]] = Normalize-ManifestValue -Value $matches[2]
            continue
        }
    }

    if ($duplicateTopLevelKeys.Count -gt 0) {
        $data["__duplicate_top_level_keys"] = @($duplicateTopLevelKeys | Select-Object -Unique)
    }

    return $data
}

function Get-ManifestScalar {
    param(
        [hashtable]$Manifest,
        [string]$Key,
        [string]$Default = ""
    )

    if (-not $Manifest.ContainsKey($Key) -or $null -eq $Manifest[$Key]) {
        return $Default
    }

    return [string]$Manifest[$Key]
}

function Get-ManifestBool {
    param(
        [hashtable]$Manifest,
        [string]$Key,
        [bool]$Default = $false
    )

    if (-not $Manifest.ContainsKey($Key) -or $null -eq $Manifest[$Key]) {
        return $Default
    }

    $v = $Manifest[$Key]

    if ($v -is [bool]) {
        return $v
    }

    return ([string]$v).ToLowerInvariant() -eq "true"
}

function Get-DocumentPathFromManifest {
    param(
        [hashtable]$Manifest,
        [string]$DocumentKey
    )

    if ($Manifest.ContainsKey("packet_documents") -and $Manifest["packet_documents"] -is [hashtable]) {
        if ($Manifest["packet_documents"].ContainsKey($DocumentKey)) {
            return [string]$Manifest["packet_documents"][$DocumentKey]
        }
    }

    return ""
}

function Test-PacketDocumentExists {
    param(
        [string]$PacketDir,
        [hashtable]$Manifest,
        [string]$DocumentKey,
        [string]$FallbackName
    )

    $manifestPath = Get-DocumentPathFromManifest -Manifest $Manifest -DocumentKey $DocumentKey

    if (-not [string]::IsNullOrWhiteSpace($manifestPath)) {
        $candidate = Join-Path $PacketDir $manifestPath
        return (Test-Path -LiteralPath $candidate)
    }

    if (-not [string]::IsNullOrWhiteSpace($FallbackName)) {
        return (Test-Path -LiteralPath (Join-Path $PacketDir $FallbackName))
    }

    return $false
}

function Add-Issue {
    param(
        [System.Collections.Generic.List[object]]$Issues,
        [string]$Severity,
        [string]$HandoffId,
        [string]$Issue,
        [string]$SuggestedAction
    )

    [void]$Issues.Add([pscustomobject]@{
        severity = $Severity
        handoff_id = $HandoffId
        issue = $Issue
        suggested_action = $SuggestedAction
    })
}

function Get-MarkdownSectionLines {
    param(
        [string[]]$Lines,
        [string]$Heading
    )

    $sectionLines = [System.Collections.Generic.List[string]]::new()
    $insideSection = $false

    foreach ($line in $Lines) {
        if ($line -match "^##\s+(.+?)\s*$") {
            if ($insideSection) {
                break
            }

            if ($matches[1] -eq $Heading) {
                $insideSection = $true
                continue
            }
        }

        if ($insideSection) {
            [void]$sectionLines.Add($line)
        }
    }

    return @($sectionLines)
}

function Read-HandoffIndex {
    param([string]$Repo)

    $indexPath = Join-Path $Repo "_Docs\Handoff\00_Index.md"
    $packetIds = @{}
    $waitingIds = @{}
    $manifestRefs = [System.Collections.Generic.List[object]]::new()

    if (-not (Test-Path -LiteralPath $indexPath)) {
        return [pscustomobject]@{
            exists = $false
            path = $indexPath
            packet_ids = $packetIds
            waiting_ids = $waitingIds
            manifest_refs = @()
        }
    }

    $lines = [System.IO.File]::ReadAllLines($indexPath, [System.Text.Encoding]::UTF8)
    $packetIndexLines = Get-MarkdownSectionLines -Lines $lines -Heading "Packet Index"
    $waitingLines = Get-MarkdownSectionLines -Lines $lines -Heading "Waiting User Approval"

    foreach ($line in $packetIndexLines) {
        if ($line -match "^\|\s*(HANDOFF-[^|\s]+)\s*\|") {
            $id = $matches[1].Trim()
            $packetIds[$id] = $true

            if ($line -match '^\|\s*(HANDOFF-[^|\s]+).*?`([^`]*manifest\.yaml)`') {
                [void]$manifestRefs.Add([pscustomobject]@{
                    handoff_id = $matches[1].Trim()
                    path = $matches[2].Trim()
                })
            }
        }
    }

    foreach ($line in $waitingLines) {
        if ($line -match "^\|\s*(HANDOFF-[^|\s]+)\s*\|") {
            $waitingIds[$matches[1].Trim()] = $true
        }
    }

    return [pscustomobject]@{
        exists = $true
        path = $indexPath
        packet_ids = $packetIds
        waiting_ids = $waitingIds
        manifest_refs = @($manifestRefs)
    }
}

function Resolve-HandoffIndexManifestPath {
    param(
        [string]$Repo,
        [string]$IndexManifestPath
    )

    $normalized = $IndexManifestPath.Replace("/", "\")

    if ([System.IO.Path]::IsPathRooted($normalized)) {
        return $normalized
    }

    $handoffRoot = Join-Path $Repo "_Docs\Handoff"
    $handoffRelative = Join-Path $handoffRoot $normalized
    $repoRelative = Join-Path $Repo $normalized

    if (Test-Path -LiteralPath $handoffRelative) {
        return $handoffRelative
    }

    return $repoRelative
}

function Resolve-PacketRelativePath {
    param(
        [string]$PacketDir,
        [string]$RelativePath
    )

    $normalized = $RelativePath.Replace("/", "\")

    if ([System.IO.Path]::IsPathRooted($normalized)) {
        return $normalized
    }

    return (Join-Path $PacketDir $normalized)
}

function Test-MarkdownSectionHasMeaningfulContent {
    param([string[]]$Lines)

    foreach ($line in $Lines) {
        $trimmed = $line.Trim()

        if ([string]::IsNullOrWhiteSpace($trimmed)) {
            continue
        }

        if ($trimmed -match '^```') {
            continue
        }

        if ($trimmed -eq "-") {
            continue
        }

        if ($trimmed -match '^(TBD|TODO|Replace with details)\.?$') {
            continue
        }

        if ($trimmed -match '^(Describe|Explain|List)\s+') {
            continue
        }

        return $true
    }

    return $false
}

function Test-ApprovalDecisionOption {
    param(
        [string]$Text,
        [string]$EnglishLabel,
        [string]$KoreanLabel
    )

    $englishPattern = '(?mi)^\s*(?:[-*]\s*)?' + [regex]::Escape($EnglishLabel) + '\s*:?\s*$'
    $koreanPattern = '(?m)^\s*(?:[-*]\s*)?' + [regex]::Escape($KoreanLabel) + '\s*:?\s*$'

    return (($Text -match $englishPattern) -or ($Text -match $koreanPattern))
}

function Add-ApprovalRequestContentIssues {
    param(
        [string]$PacketDir,
        [string]$HandoffId,
        [string]$ApprovalRequestPath,
        [System.Collections.Generic.List[object]]$Issues
    )

    $resolvedPath = Resolve-PacketRelativePath -PacketDir $PacketDir -RelativePath $ApprovalRequestPath

    if (-not (Test-Path -LiteralPath $resolvedPath)) {
        Add-Issue -Issues $Issues -Severity "Critical" -HandoffId $HandoffId -Issue "approval_request_path points to a missing approval request document: $ApprovalRequestPath" -SuggestedAction "Create the linked approval request document or correct approval_request_path."
        return
    }

    $lines = [System.IO.File]::ReadAllLines($resolvedPath, [System.Text.Encoding]::UTF8)
    $text = [System.IO.File]::ReadAllText($resolvedPath, [System.Text.Encoding]::UTF8)

    $requiredSections = @(
        "User-Facing Change",
        "Proposed Behavior",
        "Files Expected To Change",
        "Files Not Allowed To Touch",
        "Non-Goals",
        "Risks",
        "Validation Plan",
        "Decision Needed",
        "Suggested User Response",
        "Before Approval I Will Not"
    )

    $missingSections = [System.Collections.Generic.List[string]]::new()
    $emptySections = [System.Collections.Generic.List[string]]::new()

    foreach ($section in $requiredSections) {
        $sectionLines = @(Get-MarkdownSectionLines -Lines $lines -Heading $section)

        if ($sectionLines.Count -eq 0) {
            [void]$missingSections.Add($section)
            continue
        }

        if (-not (Test-MarkdownSectionHasMeaningfulContent -Lines $sectionLines)) {
            [void]$emptySections.Add($section)
        }
    }

    if ($missingSections.Count -gt 0) {
        Add-Issue -Issues $Issues -Severity "Major" -HandoffId $HandoffId -Issue "Approval request is missing required Phase 13A sections: $($missingSections -join ', ')." -SuggestedAction "Update the request using _Docs/Handoff/Packets/_Approval_Request_Template.md."
    }

    if ($emptySections.Count -gt 0) {
        Add-Issue -Issues $Issues -Severity "Major" -HandoffId $HandoffId -Issue "Approval request has empty or placeholder-only sections: $($emptySections -join ', ')." -SuggestedAction "Replace placeholders with concrete change, scope, risk, validation, and decision details."
    }

    $missingOptions = [System.Collections.Generic.List[string]]::new()

    if (-not (Test-ApprovalDecisionOption -Text $text -EnglishLabel "Approve" -KoreanLabel "승인")) {
        [void]$missingOptions.Add("approve")
    }

    if (-not (Test-ApprovalDecisionOption -Text $text -EnglishLabel "Reject" -KoreanLabel "거절")) {
        [void]$missingOptions.Add("reject")
    }

    if (-not (Test-ApprovalDecisionOption -Text $text -EnglishLabel "Modify Scope" -KoreanLabel "범위 수정")) {
        [void]$missingOptions.Add("modify scope")
    }

    if ($missingOptions.Count -gt 0) {
        Add-Issue -Issues $Issues -Severity "Major" -HandoffId $HandoffId -Issue "Approval request does not show all required user decision options: $($missingOptions -join ', ')." -SuggestedAction "Add approve, reject, and modify-scope options with suggested user response sentences."
    }
}

function Add-IndexConsistencyIssues {
    param(
        [string]$Repo,
        [array]$Packets,
        [System.Collections.Generic.List[object]]$Issues
    )

    $index = Read-HandoffIndex -Repo $Repo

    if (-not $index.exists) {
        Add-Issue -Issues $Issues -Severity "Major" -HandoffId "" -Issue "00_Index.md is missing." -SuggestedAction "Restore _Docs/Handoff/00_Index.md so human operators have a durable Handoff index."
        return
    }

    $packetById = @{}
    foreach ($packet in $Packets) {
        if (-not [string]::IsNullOrWhiteSpace($packet.handoff_id)) {
            $packetById[$packet.handoff_id] = $packet
        }
    }

    foreach ($packet in $Packets) {
        if (-not $index.packet_ids.ContainsKey($packet.handoff_id)) {
            $severity = if ($packet.delivery_status -eq "Done" -or $packet.delivery_status -eq "Archived") { "Minor" } else { "Major" }
            Add-Issue -Issues $Issues -Severity $severity -HandoffId $packet.handoff_id -Issue "Packet manifest exists but 00_Index.md Packet Index does not list it." -SuggestedAction "Add this Packet to the Packet Index or document why it is intentionally excluded."
        }

        $isWaitingApproval = ($packet.execution_status -eq "WaitingUserApproval" -or $packet.approval_state -eq "Requested")
        if ($isWaitingApproval -and -not $index.waiting_ids.ContainsKey($packet.handoff_id)) {
            Add-Issue -Issues $Issues -Severity "Critical" -HandoffId $packet.handoff_id -Issue "Packet is waiting for user approval but 00_Index.md Waiting User Approval does not list it." -SuggestedAction "Add the approval request to 00_Index.md so the human developer can see the decision point."
        }
    }

    foreach ($id in $index.packet_ids.Keys) {
        if (-not $packetById.ContainsKey($id)) {
            Add-Issue -Issues $Issues -Severity "Major" -HandoffId $id -Issue "00_Index.md Packet Index lists a Handoff ID with no discovered manifest." -SuggestedAction "Restore the Packet manifest or remove the stale Packet Index row."
        }
    }

    foreach ($id in $index.waiting_ids.Keys) {
        if (-not $packetById.ContainsKey($id)) {
            Add-Issue -Issues $Issues -Severity "Major" -HandoffId $id -Issue "00_Index.md Waiting User Approval lists a Handoff ID with no discovered manifest." -SuggestedAction "Restore the Packet manifest or remove the stale approval wait row."
            continue
        }

        $packet = $packetById[$id]
        $isWaitingApproval = ($packet.execution_status -eq "WaitingUserApproval" -or $packet.approval_state -eq "Requested")
        if (-not $isWaitingApproval) {
            Add-Issue -Issues $Issues -Severity "Minor" -HandoffId $id -Issue "00_Index.md Waiting User Approval lists a Packet that is not currently waiting for approval." -SuggestedAction "Remove the stale approval wait row or update the Packet manifest if approval is still required."
        }
    }

    foreach ($manifestRef in $index.manifest_refs) {
        $manifestPath = Resolve-HandoffIndexManifestPath -Repo $Repo -IndexManifestPath $manifestRef.path
        if (-not (Test-Path -LiteralPath $manifestPath)) {
            Add-Issue -Issues $Issues -Severity "Major" -HandoffId $manifestRef.handoff_id -Issue "00_Index.md Packet Index references a missing manifest: $($manifestRef.path)" -SuggestedAction "Correct the manifest path or restore the referenced manifest file."
        }
    }
}

function Load-HandoffPackets {
    param([string]$Repo)

    $packetsRoot = Join-Path $Repo "_Docs\Handoff\Packets"
    $packets = [System.Collections.Generic.List[object]]::new()
    $issues = [System.Collections.Generic.List[object]]::new()

    if (-not (Test-Path -LiteralPath $packetsRoot)) {
        Add-Issue -Issues $issues -Severity "Critical" -HandoffId "" -Issue "Packets directory is missing." -SuggestedAction "Create _Docs/Handoff/Packets before using the Handoff Supervisor."
        return [pscustomobject]@{
            packets = @()
            issues = @($issues)
        }
    }

    $manifestFiles = @(Get-ChildItem -Path $packetsRoot -Recurse -File -Filter "manifest.yaml" | Sort-Object FullName)

    foreach ($manifestFile in $manifestFiles) {
        $packetDir = Split-Path $manifestFile.FullName -Parent
        $packetFolderName = Split-Path $packetDir -Leaf
        $manifest = $null
        $parseError = ""

        try {
            $manifest = Read-SimpleManifest -Path $manifestFile.FullName
        }
        catch {
            $parseError = $_.Exception.Message
        }

        if (-not [string]::IsNullOrWhiteSpace($parseError)) {
            Add-Issue -Issues $issues -Severity "Critical" -HandoffId $packetFolderName -Issue "manifest.yaml could not be parsed by the simple Supervisor parser: $parseError" -SuggestedAction "Review manifest formatting and keep top-level routing fields simple."
            continue
        }

        $handoffId = Get-ManifestScalar -Manifest $manifest -Key "handoff_id" -Default $packetFolderName
        $title = Get-ManifestScalar -Manifest $manifest -Key "title" -Default "(missing title)"
        $createdAt = Get-ManifestScalar -Manifest $manifest -Key "created_at"
        $updatedAt = Get-ManifestScalar -Manifest $manifest -Key "updated_at"
        $fromRole = Get-ManifestScalar -Manifest $manifest -Key "from_role"
        $toRoles = @(ConvertTo-ArrayValue -Value $manifest["to_roles"])
        $currentOwner = Get-ManifestScalar -Manifest $manifest -Key "current_owner"
        $claimedBy = Get-ManifestScalar -Manifest $manifest -Key "claimed_by"
        $deliveryStatus = Get-ManifestScalar -Manifest $manifest -Key "delivery_status"
        $executionStatus = Get-ManifestScalar -Manifest $manifest -Key "execution_status"
        $riskLevel = Get-ManifestScalar -Manifest $manifest -Key "risk_level"
        $approvalRequired = Get-ManifestBool -Manifest $manifest -Key "approval_required"
        $approvalState = Get-ManifestScalar -Manifest $manifest -Key "approval_state"
        $approvalRequestPath = Get-ManifestScalar -Manifest $manifest -Key "approval_request_path"
        $approvalTypes = @(ConvertTo-ArrayValue -Value $manifest["approval_type"])

        $packetRel = Get-RelativePath -BasePath $Repo -FullPath $packetDir
        $manifestRel = Get-RelativePath -BasePath $Repo -FullPath $manifestFile.FullName

        $packet = [pscustomobject]@{
            handoff_id = $handoffId
            folder_name = $packetFolderName
            title = $title
            created_at = $createdAt
            updated_at = $updatedAt
            from_role = $fromRole
            to_roles = @($toRoles)
            current_owner = $currentOwner
            claimed_by = $claimedBy
            delivery_status = $deliveryStatus
            execution_status = $executionStatus
            risk_level = $riskLevel
            approval_required = $approvalRequired
            approval_state = $approvalState
            approval_request_path = $approvalRequestPath
            approval_type = @($approvalTypes)
            packet_path = $packetRel.Replace("\", "/")
            manifest_path = $manifestRel.Replace("\", "/")
            packet_dir = $packetDir
        }

        [void]$packets.Add($packet)

        if ($manifest.ContainsKey("__duplicate_top_level_keys")) {
            $duplicates = @(ConvertTo-ArrayValue -Value $manifest["__duplicate_top_level_keys"])
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "manifest.yaml has duplicate top-level keys: $($duplicates -join ', ')" -SuggestedAction "Remove duplicate keys so the Supervisor and role chats read one unambiguous value."
        }

        $requiredFields = @("handoff_id", "title", "created_at", "updated_at", "from_role", "to_roles", "delivery_status", "execution_status", "risk_level", "approval_required", "approval_state")
        foreach ($field in $requiredFields) {
            if (-not $manifest.ContainsKey($field)) {
                Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "Required manifest field is missing: $field" -SuggestedAction "Update manifest.yaml using _Manifest_Template.yaml."
            }
        }

        if ($handoffId -ne $packetFolderName) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "handoff_id does not match Packet folder name." -SuggestedAction "Align handoff_id and folder name or update links in the same change."
        }

        if (-not ($KnownRoles -contains $fromRole)) {
            Add-Issue -Issues $issues -Severity "Minor" -HandoffId $handoffId -Issue "from_role is not a known Handoff role: $fromRole" -SuggestedAction "Use one of: $($KnownRoles -join ', '), or document a new role before using it."
        }

        if ($toRoles.Count -eq 0) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "to_roles is empty." -SuggestedAction "Set at least one receiving role."
        }

        foreach ($toRole in $toRoles) {
            if (-not ($KnownRoles -contains $toRole)) {
                Add-Issue -Issues $issues -Severity "Minor" -HandoffId $handoffId -Issue "to_roles contains an unknown role: $toRole" -SuggestedAction "Use one of: $($KnownRoles -join ', '), or document a new role before using it."
            }
        }

        if (-not ($DeliveryStatuses -contains $deliveryStatus)) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "delivery_status is invalid: $deliveryStatus" -SuggestedAction "Use one of: $($DeliveryStatuses -join ', ')."
        }

        if (-not ($ExecutionStatuses -contains $executionStatus)) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "execution_status is invalid: $executionStatus" -SuggestedAction "Use one of: $($ExecutionStatuses -join ', ')."
        }

        if (-not ($RiskLevels -contains $riskLevel)) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "risk_level is invalid: $riskLevel" -SuggestedAction "Use one of: $($RiskLevels -join ', ')."
        }

        if (-not ($ApprovalStates -contains $approvalState)) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "approval_state is invalid: $approvalState" -SuggestedAction "Use one of: $($ApprovalStates -join ', ')."
        }

        if (($toRoles -contains "Developer") -and -not (Test-PacketDocumentExists -PacketDir $packetDir -Manifest $manifest -DocumentKey "implementation_request" -FallbackName "ImplementationRequest.md")) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "Developer is a target role but ImplementationRequest.md is missing." -SuggestedAction "Add an implementation request before Developer planning."
        }

        if (($toRoles -contains "Artist") -and -not (Test-PacketDocumentExists -PacketDir $packetDir -Manifest $manifest -DocumentKey "art_request" -FallbackName "ArtRequest.md")) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "Artist is a target role but ArtRequest.md is missing." -SuggestedAction "Add an art request or resource delivery note."
        }

        if (($toRoles -contains "Reviewer") -and -not (Test-PacketDocumentExists -PacketDir $packetDir -Manifest $manifest -DocumentKey "review_request" -FallbackName "ReviewRequest.md")) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "Reviewer is a target role but ReviewRequest.md is missing." -SuggestedAction "Add ReviewRequest.md before requesting review."
        }

        if (($toRoles -contains "QA") -and -not (Test-PacketDocumentExists -PacketDir $packetDir -Manifest $manifest -DocumentKey "qa_request" -FallbackName "QARequest.md")) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "QA is a target role but QARequest.md is missing." -SuggestedAction "Add QARequest.md before requesting QA."
        }

        if ($approvalRequired -and [string]::IsNullOrWhiteSpace($approvalRequestPath)) {
            Add-Issue -Issues $issues -Severity "Critical" -HandoffId $handoffId -Issue "approval_required is true but approval_request_path is empty." -SuggestedAction "Write a substantive approval request and set approval_request_path."
        }

        if ($executionStatus -eq "WaitingUserApproval" -and [string]::IsNullOrWhiteSpace($approvalRequestPath)) {
            Add-Issue -Issues $issues -Severity "Critical" -HandoffId $handoffId -Issue "execution_status is WaitingUserApproval but no approval request path is recorded." -SuggestedAction "Create Results/DeveloperPlan.md or another approval request document and link it."
        }

        $isWaitingApproval = ($executionStatus -eq "WaitingUserApproval" -or $approvalState -eq "Requested")
        if ($isWaitingApproval -and -not [string]::IsNullOrWhiteSpace($approvalRequestPath)) {
            Add-ApprovalRequestContentIssues -PacketDir $packetDir -HandoffId $handoffId -ApprovalRequestPath $approvalRequestPath -Issues $issues
        }

        if ($deliveryStatus -eq "Ready" -and $executionStatus -eq "InProgress") {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "delivery_status is Ready but execution_status is InProgress." -SuggestedAction "Claim the Packet or correct execution_status."
        }

        if ($deliveryStatus -eq "Done" -and -not (Test-PacketDocumentExists -PacketDir $packetDir -Manifest $manifest -DocumentKey "completion_notice" -FallbackName "CompletionNotice.md")) {
            Add-Issue -Issues $issues -Severity "Major" -HandoffId $handoffId -Issue "delivery_status is Done but CompletionNotice.md is missing." -SuggestedAction "Add a completion notice or move the Packet out of Done."
        }
    }

    return [pscustomobject]@{
        packets = @($packets)
        issues = @($issues)
    }
}

function Get-HandoffView {
    param(
        [array]$Packets,
        [array]$Issues,
        [string]$RoleFilter
    )

    $activePackets = @($Packets | Where-Object { $_.delivery_status -ne "Done" -and $_.delivery_status -ne "Archived" })
    $rolePackets = if ([string]::IsNullOrWhiteSpace($RoleFilter)) {
        @($activePackets)
    }
    else {
        @($activePackets | Where-Object { @($_.to_roles) -contains $RoleFilter -or $_.current_owner -eq $RoleFilter -or $_.claimed_by -eq $RoleFilter })
    }

    return [pscustomobject]@{
        generated_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss K")
        role_filter = $RoleFilter
        packet_count = $Packets.Count
        active_count = $activePackets.Count
        issue_count = $Issues.Count
        all_packets = @($Packets)
        waiting_user_approval = @($Packets | Where-Object { $_.execution_status -eq "WaitingUserApproval" -or $_.approval_state -eq "Requested" })
        ready_work = @($rolePackets | Where-Object { $_.delivery_status -eq "Ready" -and $_.execution_status -eq "NotStarted" })
        in_progress = @($rolePackets | Where-Object { $_.delivery_status -eq "Claimed" -or $_.execution_status -eq "Planning" -or $_.execution_status -eq "InProgress" })
        blocked = @($rolePackets | Where-Object { $_.delivery_status -eq "Blocked" -or $_.execution_status -eq "Blocked" })
        review_requested = @($rolePackets | Where-Object { $_.execution_status -eq "ReviewRequested" -or $_.delivery_status -eq "ReviewRequested" })
        qa_requested = @($rolePackets | Where-Object { $_.execution_status -eq "QARequested" -or $_.delivery_status -eq "QARequested" })
        recently_done = @($Packets | Where-Object { $_.delivery_status -eq "Done" -or $_.execution_status -eq "Done" } | Sort-Object updated_at -Descending | Select-Object -First 10)
        role_packets = @($rolePackets)
        issues = @($Issues)
    }
}

function Escape-MarkdownCell {
    param($Value)

    if ($null -eq $Value) {
        return ""
    }

    return ([string]$Value).Replace("|", "\|").Replace("`r", " ").Replace("`n", " ")
}

function New-TableRows {
    param(
        [array]$Rows,
        [scriptblock]$Projector,
        [int]$ColumnCount
    )

    if ($Rows.Count -eq 0) {
        return "| " + ((" | " * ($ColumnCount - 1))) + " |"
    }

    $output = [System.Collections.Generic.List[string]]::new()

    foreach ($row in $Rows) {
        $values = @(& $Projector $row)
        $escaped = @($values | ForEach-Object { Escape-MarkdownCell -Value $_ })
        [void]$output.Add("| " + ($escaped -join " | ") + " |")
    }

    return @($output)
}

function New-DashboardMarkdown {
    param([object]$View)

    $lines = [System.Collections.Generic.List[string]]::new()
    [void]$lines.Add("# Handoff Dashboard")
    [void]$lines.Add("")
    [void]$lines.Add('Generated by `tools/aiworkflow/handoff_supervisor.bat write-docs --execute`.')
    [void]$lines.Add("")
    [void]$lines.Add("Generated at: $($View.generated_at)")
    [void]$lines.Add("")
    [void]$lines.Add("## Summary")
    [void]$lines.Add("")
    [void]$lines.Add("| Metric | Count |")
    [void]$lines.Add("| --- | --- |")
    [void]$lines.Add("| All Packets | $($View.packet_count) |")
    [void]$lines.Add("| Active Packets | $($View.active_count) |")
    [void]$lines.Add("| Waiting User Approval | $($View.waiting_user_approval.Count) |")
    [void]$lines.Add("| Ready Work | $($View.ready_work.Count) |")
    [void]$lines.Add("| In Progress | $($View.in_progress.Count) |")
    [void]$lines.Add("| Blocked | $($View.blocked.Count) |")
    [void]$lines.Add("| Review Requested | $($View.review_requested.Count) |")
    [void]$lines.Add("| QA Requested | $($View.qa_requested.Count) |")
    [void]$lines.Add("| Consistency Issues | $($View.issue_count) |")
    [void]$lines.Add("")
    [void]$lines.Add("## Waiting User Approval")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Role | Title | Approval Request Path | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.waiting_user_approval -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, ($p.to_roles -join ", "), $p.title, $p.approval_request_path, $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Ready Work")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | From | To | Title | Manifest | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.ready_work -ColumnCount 6 -Projector {
        param($p)
        @($p.handoff_id, $p.from_role, ($p.to_roles -join ", "), $p.title, ('`' + $p.manifest_path + '`'), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Review Requested")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Role | Title | Review Request | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.review_requested -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, ($p.to_roles -join ", "), $p.title, ($p.packet_path + "/ReviewRequest.md"), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## QA Requested")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Role | Title | QA Request | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.qa_requested -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, ($p.to_roles -join ", "), $p.title, ($p.packet_path + "/QARequest.md"), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Blocked")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Role | Title | Delivery | Execution | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.blocked -ColumnCount 6 -Projector {
        param($p)
        @($p.handoff_id, ($p.to_roles -join ", "), $p.title, $p.delivery_status, $p.execution_status, $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Role Queues")
    [void]$lines.Add("")
    [void]$lines.Add("| Role | Queue |")
    [void]$lines.Add("| --- | --- |")
    foreach ($roleName in $KnownRoles) {
        [void]$lines.Add("| $roleName | ``Queues/$roleName.md`` |")
    }
    [void]$lines.Add("")
    [void]$lines.Add("## Consistency Issues")
    [void]$lines.Add("")
    [void]$lines.Add('Full issue list: `Violations/Open.md`')
    [void]$lines.Add("")
    [void]$lines.Add("| Severity | Handoff ID | Issue | Suggested Action |")
    [void]$lines.Add("| --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.issues -ColumnCount 4 -Projector {
        param($i)
        @($i.severity, $i.handoff_id, $i.issue, $i.suggested_action)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Recently Done")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Title | Completion | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.recently_done -ColumnCount 4 -Projector {
        param($p)
        @($p.handoff_id, $p.title, ($p.packet_path + "/CompletionNotice.md"), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Packet Index")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Delivery | Execution | From | To | Title | Manifest | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.all_packets -ColumnCount 8 -Projector {
        param($p)
        @($p.handoff_id, $p.delivery_status, $p.execution_status, $p.from_role, ($p.to_roles -join ", "), $p.title, ('`' + $p.manifest_path + '`'), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Safety Boundary")
    [void]$lines.Add("")
    [void]$lines.Add("The Handoff Supervisor may inspect Packet metadata and generate Handoff document surfaces. It must not edit game source, gameplay JSON, asset files, build settings, approval evidence, commits, or pushes.")

    return ($lines -join "`r`n")
}

function New-QueueMarkdown {
    param(
        [string]$RoleName,
        [object]$View
    )

    $rolePackets = @($View.role_packets | Where-Object { @($_.to_roles) -contains $RoleName -or $_.current_owner -eq $RoleName -or $_.claimed_by -eq $RoleName })
    $waiting = @($rolePackets | Where-Object { $_.execution_status -eq "WaitingUserApproval" -or $_.approval_state -eq "Requested" })
    $ready = @($rolePackets | Where-Object { $_.delivery_status -eq "Ready" -and $_.execution_status -eq "NotStarted" })
    $active = @($rolePackets | Where-Object { $_.delivery_status -eq "Claimed" -or $_.execution_status -eq "Planning" -or $_.execution_status -eq "InProgress" })
    $reviewRequested = @($rolePackets | Where-Object { $_.delivery_status -eq "ReviewRequested" -or $_.execution_status -eq "ReviewRequested" })
    $qaRequested = @($rolePackets | Where-Object { $_.delivery_status -eq "QARequested" -or $_.execution_status -eq "QARequested" })
    $blocked = @($rolePackets | Where-Object { $_.delivery_status -eq "Blocked" -or $_.execution_status -eq "Blocked" })

    $lines = [System.Collections.Generic.List[string]]::new()
    [void]$lines.Add("# Handoff Queue: $RoleName")
    [void]$lines.Add("")
    [void]$lines.Add('Generated by `tools/aiworkflow/handoff_supervisor.bat write-docs --execute`.')
    [void]$lines.Add("")
    [void]$lines.Add("Generated at: $($View.generated_at)")
    [void]$lines.Add("")
    [void]$lines.Add("## How To Use")
    [void]$lines.Add("")
    [void]$lines.Add('A role chat should use this queue as its visible work intake. `Ready` means the role may inspect and plan. It does not mean implementation, data, runtime, build, Git, or approval changes are authorized.')
    [void]$lines.Add("")
    [void]$lines.Add("## Waiting User Approval")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Title | Approval Request Path | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $waiting -ColumnCount 4 -Projector {
        param($p)
        @($p.handoff_id, $p.title, $p.approval_request_path, $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Ready Work")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | From | Title | Manifest | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $ready -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, $p.from_role, $p.title, ('`' + $p.manifest_path + '`'), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## In Progress")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Owner | Title | Execution | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $active -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, $p.current_owner, $p.title, $p.execution_status, $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Review Requested")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Title | Review Request | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $reviewRequested -ColumnCount 4 -Projector {
        param($p)
        @($p.handoff_id, $p.title, ($p.packet_path + "/ReviewRequest.md"), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## QA Requested")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Title | QA Request | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $qaRequested -ColumnCount 4 -Projector {
        param($p)
        @($p.handoff_id, $p.title, ($p.packet_path + "/QARequest.md"), $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Blocked")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Title | Delivery | Execution | Updated |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $blocked -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, $p.title, $p.delivery_status, $p.execution_status, $p.updated_at)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## All Role Packets")
    [void]$lines.Add("")
    [void]$lines.Add("| Handoff ID | Delivery | Execution | Title | Manifest |")
    [void]$lines.Add("| --- | --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $rolePackets -ColumnCount 5 -Projector {
        param($p)
        @($p.handoff_id, $p.delivery_status, $p.execution_status, $p.title, ('`' + $p.manifest_path + '`'))
    })) { [void]$lines.Add($line) }

    return ($lines -join "`r`n")
}

function New-ViolationsMarkdown {
    param([object]$View)

    $lines = [System.Collections.Generic.List[string]]::new()
    [void]$lines.Add("# Handoff Open Violations")
    [void]$lines.Add("")
    [void]$lines.Add('Generated by `tools/aiworkflow/handoff_supervisor.bat write-docs --execute`.')
    [void]$lines.Add("")
    [void]$lines.Add("Generated at: $($View.generated_at)")
    [void]$lines.Add("")
    [void]$lines.Add("## Open Issues")
    [void]$lines.Add("")
    [void]$lines.Add("| Severity | Handoff ID | Issue | Suggested Action |")
    [void]$lines.Add("| --- | --- | --- | --- |")
    foreach ($line in (New-TableRows -Rows $View.issues -ColumnCount 4 -Projector {
        param($i)
        @($i.severity, $i.handoff_id, $i.issue, $i.suggested_action)
    })) { [void]$lines.Add($line) }
    [void]$lines.Add("")
    [void]$lines.Add("## Boundary")
    [void]$lines.Add("")
    [void]$lines.Add("This report identifies Handoff metadata inconsistencies. It is not a review verdict, validation result, approval record, or completion decision.")

    return ($lines -join "`r`n")
}

function Write-TextFile {
    param(
        [string]$Path,
        [string]$Content
    )

    $dir = Split-Path $Path -Parent
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content.TrimEnd() + "`r`n", $utf8NoBom)
}

function Write-HandoffDocs {
    param(
        [string]$Repo,
        [object]$View
    )

    $handoffRoot = Join-Path $Repo "_Docs\Handoff"
    Write-TextFile -Path (Join-Path $handoffRoot "Dashboard.md") -Content (New-DashboardMarkdown -View $View)

    $queuesRoot = Join-Path $handoffRoot "Queues"
    foreach ($roleName in $KnownRoles) {
        Write-TextFile -Path (Join-Path $queuesRoot "$roleName.md") -Content (New-QueueMarkdown -RoleName $roleName -View $View)
    }

    $violationsRoot = Join-Path $handoffRoot "Violations"
    Write-TextFile -Path (Join-Path $violationsRoot "Open.md") -Content (New-ViolationsMarkdown -View $View)
}

function Write-HumanOutput {
    param([object]$View)

    Write-Host "============================================================"
    Write-Host "Handoff Supervisor"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "[Summary]"
    Write-Host "Generated At:          $($View.generated_at)"
    Write-Host "All Packets:           $($View.packet_count)"
    Write-Host "Active Packets:        $($View.active_count)"
    Write-Host "Waiting Approval:      $($View.waiting_user_approval.Count)"
    Write-Host "Ready Work:            $($View.ready_work.Count)"
    Write-Host "In Progress:           $($View.in_progress.Count)"
    Write-Host "Blocked:               $($View.blocked.Count)"
    Write-Host "Review Requested:      $($View.review_requested.Count)"
    Write-Host "QA Requested:          $($View.qa_requested.Count)"
    Write-Host "Consistency Issues:    $($View.issue_count)"
    Write-Host ""

    if ($View.waiting_user_approval.Count -gt 0) {
        Write-Host "[Waiting User Approval]"
        foreach ($p in $View.waiting_user_approval) {
            Write-Host ("- {0} | {1} | {2}" -f $p.handoff_id, ($p.to_roles -join ", "), $p.approval_request_path)
        }
        Write-Host ""
    }

    if ($View.ready_work.Count -gt 0) {
        Write-Host "[Ready Work]"
        foreach ($p in $View.ready_work) {
            Write-Host ("- {0} -> {1} | {2}" -f $p.from_role, ($p.to_roles -join ", "), $p.title)
        }
        Write-Host ""
    }

    if ($View.issues.Count -gt 0) {
        Write-Host "[Consistency Issues]"
        foreach ($issue in $View.issues) {
            Write-Host ("- [{0}] {1}: {2}" -f $issue.severity, $issue.handoff_id, $issue.issue)
        }
        Write-Host ""
    }

    Write-Host "Safety: no source, gameplay JSON, asset, build, approval evidence, commit, or push action was performed."
    Write-Host "============================================================"
}

try {
    $repo = (Resolve-Path -LiteralPath $RepoRoot).Path

    if (-not [string]::IsNullOrWhiteSpace($Role) -and -not ($KnownRoles -contains $Role)) {
        throw "Unknown role: $Role. Known roles: $($KnownRoles -join ', ')"
    }

    $loaded = Load-HandoffPackets -Repo $repo
    $issues = [System.Collections.Generic.List[object]]::new()
    foreach ($issue in $loaded.issues) {
        [void]$issues.Add($issue)
    }
    Add-IndexConsistencyIssues -Repo $repo -Packets $loaded.packets -Issues $issues
    $view = Get-HandoffView -Packets $loaded.packets -Issues @($issues) -RoleFilter $Role

    if ($Command -eq "write-docs") {
        if (-not $Execute) {
            if ($Json) {
                [pscustomobject]@{
                    ok = $false
                    command = $Command
                    error = "write-docs requires --execute."
                    planned_outputs = @(
                        "_Docs/Handoff/Dashboard.md",
                        "_Docs/Handoff/Queues/Planner.md",
                        "_Docs/Handoff/Queues/Developer.md",
                        "_Docs/Handoff/Queues/Artist.md",
                        "_Docs/Handoff/Queues/Reviewer.md",
                        "_Docs/Handoff/Queues/QA.md",
                        "_Docs/Handoff/Violations/Open.md"
                    )
                } | ConvertTo-Json -Depth 5
                exit 2
            }

            Write-Host "[PLAN] write-docs requires --execute."
            Write-Host "Planned outputs:"
            Write-Host "- _Docs/Handoff/Dashboard.md"
            Write-Host "- _Docs/Handoff/Queues/Planner.md"
            Write-Host "- _Docs/Handoff/Queues/Developer.md"
            Write-Host "- _Docs/Handoff/Queues/Artist.md"
            Write-Host "- _Docs/Handoff/Queues/Reviewer.md"
            Write-Host "- _Docs/Handoff/Queues/QA.md"
            Write-Host "- _Docs/Handoff/Violations/Open.md"
            exit 2
        }

        Write-HandoffDocs -Repo $repo -View $view
    }

    if ($Json) {
        [pscustomobject]@{
            ok = $true
            command = $Command
            wrote_docs = ($Command -eq "write-docs" -and $Execute)
            view = $view
        } | ConvertTo-Json -Depth 8
        exit 0
    }

    if ($Command -eq "write-docs" -and $Execute) {
        Write-Host "[OK] Handoff Dashboard, Queues, and Violations were written."
        Write-Host ""
    }

    Write-HumanOutput -View $view
    exit 0
}
catch {
    if ($Json) {
        [pscustomobject]@{
            ok = $false
            error = $_.Exception.Message
            script = "handoff_supervisor.ps1"
            line = $_.InvocationInfo.ScriptLineNumber
            command = $_.InvocationInfo.Line
        } | ConvertTo-Json -Depth 4
        exit 1
    }

    Write-Host "[ERROR] handoff_supervisor.ps1 failed: $($_.Exception.Message)"
    Write-Host "Line: $($_.InvocationInfo.ScriptLineNumber)"
    Write-Host "Command: $($_.InvocationInfo.Line)"
    exit 1
}
