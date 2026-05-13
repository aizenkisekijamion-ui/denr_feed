param([string]$file)
$content = Get-Content $file -Raw
$lines = $content -split "`n"
$depth = 0
for ($i=0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $opens = ([regex]::Matches($line, '<div(?!ider)')).Count
    $closes = ([regex]::Matches($line, '</div>')).Count
    if ($opens -gt 0 -or $closes -gt 0) {
        $depth += ($opens - $closes)
        Write-Host "Line $($i+1): +$opens -$closes | New Depth: $depth | $($line.Trim())"
    }
}
Write-Host "Final Depth: $depth"
