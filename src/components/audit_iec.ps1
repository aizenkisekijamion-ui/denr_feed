$content = Get-Content 'c:\Users\Lenovo Legion\.gemini\antigravity\scratch\denr-feed\src\components\IecHologramModal.jsx' -Raw
$divOpen = ([regex]::Matches($content, '<div')).Count
$divClose = ([regex]::Matches($content, '</div>')).Count
$fragOpen = ([regex]::Matches($content, '<>')).Count
$fragClose = ([regex]::Matches($content, '</>')).Count
Write-Host "Divs: $divOpen / $divClose"
Write-Host "Frags: $fragOpen / $fragClose"
