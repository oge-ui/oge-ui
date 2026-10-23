<#
  Records Excel's built-in table styles (TableStyleLight1-21, Medium1-28,
  Dark1-11): every element's fill, font and borders, as theme colours with
  tints where Excel defines them so. Read through COM from a new, unsaved
  workbook; no Excel option is changed. `table-styles.mjs` turns the capture
  into the table the engine embeds. Run through `node testing/tools/run.mjs`.
#>
param([Parameter(Mandatory = $true)][string]$Captures)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Hex([object]$bgr) {
  $n = [int]$bgr
  return '{0:X2}{1:X2}{2:X2}' -f ($n -band 0xFF), (($n -shr 8) -band 0xFF), (($n -shr 16) -band 0xFF)
}
# a property Excel leaves unset reads as DBNull (or throws): $null
function Get-Set($read) {
  try { $value = & $read } catch { return $null }
  if ($value -is [System.DBNull]) { return $null }
  return $value
}
# a colour: the theme colour and tint Excel stores, else its RGB
function Get-Color($target, [string]$themeProperty, [string]$tintProperty, [string]$colorProperty) {
  $theme = Get-Set { $target.$themeProperty }
  if ($null -ne $theme -and [int]$theme -gt 0) {
    $color = [ordered]@{ theme = [int]$theme - 1 }
    $tint = Get-Set { $target.$tintProperty }
    if ($null -ne $tint -and [double]$tint -ne 0) { $color.tint = [double]$tint }
    return $color
  }
  $rgb = Get-Set { $target.$colorProperty }
  if ($null -eq $rgb) { return $null }
  return [ordered]@{ rgb = Hex $rgb }
}

# XlTableStyleElementType 0-12, in the order of tableStyleElement/@type
$types = @('wholeTable', 'headerRow', 'totalRow', 'firstColumn', 'lastColumn', 'firstRowStripe', 'secondRowStripe',
  'firstColumnStripe', 'secondColumnStripe', 'firstHeaderCell', 'lastHeaderCell', 'firstTotalCell', 'lastTotalCell')
# XlBordersIndex: left, top, bottom, right, inside vertical, inside horizontal
$edges = [ordered]@{ left = 7; top = 8; bottom = 9; right = 10; vertical = 11; horizontal = 12 }

$xl = New-Object -ComObject Excel.Application
try {
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Add()
  $styles = New-Object System.Collections.ArrayList
  foreach ($ts in $wb.TableStyles) {
    if ($ts.Name -notmatch '^TableStyle(Light|Medium|Dark)\d+$') { continue }
    $elements = [ordered]@{}
    for ($type = 0; $type -lt $types.Count; $type++) {
      $el = $ts.TableStyleElements.Item($type)
      if (-not $el.HasFormat) { continue }
      $entry = [ordered]@{}
      $pattern = Get-Set { $el.Interior.Pattern }
      if ($null -ne $pattern -and [int]$pattern -ne -4142) {
        $entry.fill = [ordered]@{ pattern = [int]$pattern; color = (Get-Color $el.Interior 'ThemeColor' 'TintAndShade' 'Color') }
      }
      $font = [ordered]@{}
      foreach ($flag in 'Bold', 'Italic', 'Strikethrough') {
        $value = Get-Set { $el.Font.$flag }
        if ($null -ne $value) { $font[$flag.ToLower()] = [bool]$value }
      }
      $underline = Get-Set { $el.Font.Underline }
      if ($null -ne $underline) { $font.underline = [int]$underline }
      if ($null -ne (Get-Set { $el.Font.ColorIndex })) { $font.color = Get-Color $el.Font 'ThemeColor' 'TintAndShade' 'Color' }
      if ($font.Count) { $entry.font = $font }
      $borders = [ordered]@{}
      foreach ($name in $edges.Keys) {
        $border = $el.Borders.Item($edges[$name])
        $line = Get-Set { $border.LineStyle }
        if ($null -eq $line -or [int]$line -eq -4142) { continue }
        $borders[$name] = [ordered]@{ lineStyle = [int]$line; weight = [int]$border.Weight; color = (Get-Color $border 'ThemeColor' 'TintAndShade' 'Color') }
      }
      if ($borders.Count) { $entry.borders = $borders }
      if ($type -ge 5 -and $type -le 8 -and $el.StripeSize -ne 1) { $entry.size = [int]$el.StripeSize }
      $elements[$types[$type]] = $entry
    }
    [void]$styles.Add([ordered]@{ name = $ts.Name; elements = $elements })
  }
  $wb.Close($false)
  $capture = [ordered]@{ excelVersion = $xl.Version; excelBuild = $xl.Build; styles = $styles }
  [System.IO.File]::WriteAllText((Join-Path $Captures 'table-styles.json'), ($capture | ConvertTo-Json -Depth 8 -Compress), $utf8)
  Write-Host "table styles: $($styles.Count)"
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
