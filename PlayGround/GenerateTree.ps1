$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptPath

$outputPath = Join-Path $ScriptPath "PROJECT_STRUCTURE.md"
$includeExtensions = @("*.cpp", "*.h", "*.rc", "*.ico", "*.sln", "*.vcxproj")

function Get-Tree {
    param ([string]$Path, [string]$Indent = "")
    $lines = @() 
    
    $items = Get-ChildItem -Path $Path | Where-Object {
        $_.PSIsContainer -or ($includeExtensions -contains "*$($_.Extension)")
    } | Where-Object { 
        $_.Name -notmatch "(\.vs|obj|bin|Debug|Release|ipch|x86|x64)" 
    }

    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            $lines += "$Indent+--- $($item.Name)"
            $lines += Get-Tree -Path $item.FullName -Indent ("$Indent|   ")
        } else {
            $lines += "$Indent|   $($item.Name)"
        }
    }
    return $lines
}

# 1. 트리 생성 및 문자열 변환
$treeText = (Get-Tree -Path $ScriptPath) -join "`r`n"

# 2. 마크다운 조립 (따옴표 꼬임 방지를 위해 특수문자 방식 사용)
$dateText = Get-Date -Format 'yyyy-MM-dd HH:mm'

# 백틱 3개를 안전하게 생성 (따옴표 에러 방지)
$bt = [char]96 + [char]96 + [char]96 

# 문자열 조립
$content = "# Project Structure (Updated: $dateText)`r`n`r`n"
$content += $bt + "text`r`n"
$content += "Root`r`n"
$content += $treeText + "`r`n"
$content += $bt

# 3. 저장
$content | Out-File -FilePath $outputPath -Encoding utf8