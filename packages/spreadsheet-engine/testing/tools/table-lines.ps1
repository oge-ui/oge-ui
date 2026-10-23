<#
  Reads the lines Excel draws between the cells of the corpus tables off the
  screen: opens testing/corpus/tables.xlsx read-only in a new Excel window
  moved far off-screen, scrolls each table of the `Lines` and `Builtin`
  sheets into view, renders the window with PrintWindow and records, across
  every line between two cells of a table (and around it), the five pixels
  centred on the line: from the middle of a column for a line between rows,
  from the middle of a row for one between columns. Those cells are empty,
  so only lines and fills are there. No Excel option is changed; the
  screenshots are not kept (they show Microsoft's UI), only the pixels.

  Usage: powershell -File table-lines.ps1 -Corpus <corpus folder> [-Pictures <folder>]
  Writes <corpus>/tables.lines.json.
#>
param(
  [Parameter(Mandatory = $true)][string]$Corpus,
  # where to keep the screenshots for a look (never the repository)
  [string]$Pictures = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OgeTableLinesWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
$utf8 = New-Object System.Text.UTF8Encoding($false)
$X = -20000; $Y = 200; $W = 1400; $H = 900
$excel = New-Object -ComObject Excel.Application
# SWP_NOZORDER | SWP_NOACTIVATE
function Park() { [void][OgeTableLinesWin]::SetWindowPos([IntPtr]$excel.Hwnd, [IntPtr]::Zero, $X, $Y, $W, $H, 0x0014) }
function Hex([System.Drawing.Color]$c) { return '{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B }

$result = [ordered]@{ sheets = (New-Object System.Collections.ArrayList) }
try {
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $true
  Park
  $book = $excel.Workbooks.Open((Resolve-Path (Join-Path $Corpus 'tables.xlsx')).Path, 0, $true)
  $excel.Visible = $true
  Park
  foreach ($name in 'Lines', 'Builtin') {
    $ws = $book.Worksheets.Item($name)
    $ws.Activate()
    $window = $excel.ActiveWindow
    $lines = New-Object System.Collections.ArrayList
    foreach ($lo in $ws.ListObjects) {
      $top = $lo.Range.Row; $left = $lo.Range.Column
      $bottom = $top + $lo.Range.Rows.Count - 1; $right = $left + $lo.Range.Columns.Count - 1
      $window.ScrollRow = [math]::Max(1, $top - 1)
      $window.ScrollColumn = [math]::Max(1, $left - 1)
      $hwnd = [IntPtr]$excel.Hwnd
      $rect = New-Object OgeTableLinesWin+RECT
      $pane = $window.Panes.Item(1)
      # the empty cell above and left of the table shows white once the grid
      # is drawn: until it does, render again a little later
      $blank = $ws.Cells.Item($top - 1, $left - 1)
      for ($attempt = 1; ; $attempt++) {
        Start-Sleep -Milliseconds (700 * $attempt)
        [void][OgeTableLinesWin]::GetWindowRect($hwnd, [ref]$rect)
        $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $hdc = $graphics.GetHdc()
        # PW_RENDERFULLCONTENT: renders the DirectComposition content of an off-screen window
        [void][OgeTableLinesWin]::PrintWindow($hwnd, $hdc, 2)
        $graphics.ReleaseHdc($hdc)
        $graphics.Dispose()
        $bx = $pane.PointsToScreenPixelsX([double]($blank.Left + $blank.Width / 2)) - $rect.Left
        $by = $pane.PointsToScreenPixelsY([double]($blank.Top + $blank.Height / 2)) - $rect.Top
        if ((Hex $bitmap.GetPixel($bx, $by)) -eq 'FFFFFF') { break }
        $bitmap.Dispose()
        if ($attempt -ge 6) { throw "$name $($lo.Name): the grid was not drawn" }
      }
      if ($Pictures) { $bitmap.Save((Join-Path $Pictures "$name.$($lo.Name).png"), [System.Drawing.Imaging.ImageFormat]::Png) }
      $xOf = @{}; $yOf = @{}
      for ($c = $left; $c -le $right + 1; $c++) { $xOf[$c] = $pane.PointsToScreenPixelsX([double]$ws.Columns.Item($c).Left) - $rect.Left }
      $xOf[$right + 2] = $pane.PointsToScreenPixelsX([double]$ws.Columns.Item($right + 2).Left) - $rect.Left
      for ($r = $top; $r -le $bottom + 1; $r++) { $yOf[$r] = $pane.PointsToScreenPixelsY([double]$ws.Rows.Item($r).Top) - $rect.Top }
      $yOf[$bottom + 2] = $pane.PointsToScreenPixelsY([double]$ws.Rows.Item($bottom + 2).Top) - $rect.Top
      # the line above row r (between r - 1 and r) at column c, and left of column c at row r:
      # it lies on the last pixel of the row (column) before
      for ($r = $top; $r -le $bottom + 1; $r++) {
        for ($c = $left; $c -le $right; $c++) {
          $x = [math]::Floor(($xOf[$c] + $xOf[$c + 1]) / 2); $line = $yOf[$r] - 1
          $pixels = @(); for ($d = -2; $d -le 2; $d++) { $pixels += Hex $bitmap.GetPixel($x, $line + $d) }
          [void]$lines.Add("h $r $c $($pixels -join ' ')")
        }
      }
      for ($r = $top; $r -le $bottom; $r++) {
        for ($c = $left; $c -le $right + 1; $c++) {
          $y = [math]::Floor(($yOf[$r] + $yOf[$r + 1]) / 2); $line = $xOf[$c] - 1
          $pixels = @(); for ($d = -2; $d -le 2; $d++) { $pixels += Hex $bitmap.GetPixel($line + $d, $y) }
          [void]$lines.Add("v $r $c $($pixels -join ' ')")
        }
      }
      $bitmap.Dispose()
    }
    [void]$result.sheets.Add([ordered]@{ name = $name; lines = $lines })
    Write-Host "$name lines: $($lines.Count)"
  }
  $book.Close($false)
  [System.IO.File]::WriteAllText((Join-Path $Corpus 'tables.lines.json'), ($result | ConvertTo-Json -Depth 5 -Compress), $utf8)
} finally {
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
