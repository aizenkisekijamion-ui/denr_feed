$content = Get-Content 'c:\Users\Lenovo Legion\.gemini\antigravity\scratch\denr-feed\src\components\IecHologramModal.jsx' -Raw
$lines = $content -split "`n"
$depth = 0
for ($i=0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $opens = ([regex]::Matches($line, '<div')).Count
    $closes = ([regex]::Matches($line, '</div>')).Count
    $depth += ($opens - $closes)
    # Write-Host "Line $($i+1): Depth $depth"
}
Write-Host "Final Depth: $depth"
