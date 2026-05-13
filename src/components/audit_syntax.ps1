$content = Get-Content 'c:\Users\Lenovo Legion\.gemini\antigravity\scratch\denr-feed\src\components\Feed.jsx' -Raw
$divOpen = ([regex]::Matches($content, '<div')).Count
$divClose = ([regex]::Matches($content, '</div>')).Count
$fragOpen = ([regex]::Matches($content, '<>')).Count
$fragClose = ([regex]::Matches($content, '</>')).Count
$parenOpen = ($content.ToCharArray() | Where-Object { $_ -eq '(' }).Count
$parenClose = ($content.ToCharArray() | Where-Object { $_ -eq ')' }).Count
$braceOpen = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$braceClose = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count

Write-Host "Divs: $divOpen / $divClose"
Write-Host "Frags: $fragOpen / $fragClose"
Write-Host "Parens: $parenOpen / $parenClose"
Write-Host "Braces: $braceOpen / $braceClose"
