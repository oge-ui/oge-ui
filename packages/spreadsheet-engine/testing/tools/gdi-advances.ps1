<#
  Character advance widths as Windows GDI lays them out — what Excel's
  cell text uses — for the corpus's Normal font (Calibri 11 at 96 dpi).
  The fitting specs measure text with these, so they test Excel's fitting
  rules rather than a browser's font rasteriser. Run by run.mjs.
#>
param([Parameter(Mandatory = $true)][string]$Captures)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$utf8 = New-Object System.Text.UTF8Encoding($false)
$flags = [System.Windows.Forms.TextFormatFlags]::NoPadding -bor [System.Windows.Forms.TextFormatFlags]::SingleLine -bor [System.Windows.Forms.TextFormatFlags]::NoPrefix
$size = New-Object System.Drawing.Size(100000, 100)
$chars = New-Object System.Collections.ArrayList
for ($c = 32; $c -lt 127; $c++) { [void]$chars.Add([char]$c) }
foreach ($c in @(0x00C7, 0x00D6, 0x00DC, 0x00E7, 0x00F6, 0x00FC, 0x011E, 0x011F, 0x0130, 0x0131, 0x015E, 0x015F, 0x20BA, 0x20AC, 0x00A3, 0x00A0, 0x00E9, 0x00E8, 0x00E0)) { [void]$chars.Add([char]$c) }
$fonts = [ordered]@{}
foreach ($style in @('Regular', 'Bold')) {
  $font = New-Object System.Drawing.Font('Calibri', [single]11, [System.Drawing.FontStyle]::$style, [System.Drawing.GraphicsUnit]::Point)
  # PowerShell hashtables fold case (and Turkish i/I): keep code points instead
  $table = New-Object System.Collections.ArrayList
  foreach ($ch in $chars) {
    $s = [string]$ch
    $w20 = [System.Windows.Forms.TextRenderer]::MeasureText(($s * 20), $font, $size, $flags).Width
    $w40 = [System.Windows.Forms.TextRenderer]::MeasureText(($s * 40), $font, $size, $flags).Width
    [void]$table.Add([string]::Format([System.Globalization.CultureInfo]::InvariantCulture, '{0}:{1}', [int]$ch, (($w40 - $w20) / 20)))
  }
  $fonts["Calibri 11 $style"] = $table
}
[System.IO.File]::WriteAllText((Join-Path $Captures 'gdi-advances.json'), ($fonts | ConvertTo-Json -Depth 4 -Compress), $utf8)
'gdi advances'
