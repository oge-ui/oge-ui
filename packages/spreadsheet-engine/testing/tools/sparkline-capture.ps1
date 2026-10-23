<#
  Reads Excel's sparklines off the screen: opens testing/corpus/sparklines.xlsx
  read-only in a new Excel window moved far off-screen, renders every sheet
  with PrintWindow and records, for every sparkline, its cell's box on the
  screen (the merge's, for a merged cell). The screenshots go to -Pictures —
  never the repository, they show Microsoft's UI; sparkline-boxes.mjs reads
  them into testing/corpus/sparklines.boxes.json. No Excel option is changed.

  Usage: powershell -File sparkline-capture.ps1 -Corpus <corpus folder> -Pictures <folder>
  Writes <Pictures>/sparklines.screens.json and <Pictures>/<sheet>.png.
#>
param(
  [Parameter(Mandatory = $true)][string]$Corpus,
  [Parameter(Mandatory = $true)][string]$Pictures
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OgeSparklineWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
$utf8 = New-Object System.Text.UTF8Encoding($false)
# tall enough for six 90 pt rows; Windows caps it at the screen's height
$X = -20000; $Y = 100; $W = 1600; $H = 1300
New-Item -ItemType Directory -Force -Path $Pictures | Out-Null
$excel = New-Object -ComObject Excel.Application
# SWP_NOZORDER | SWP_NOACTIVATE
function Park() { [void][OgeSparklineWin]::SetWindowPos([IntPtr]$excel.Hwnd, [IntPtr]::Zero, $X, $Y, $W, $H, 0x0014) }

function Shot([string]$path) {
  $hwnd = [IntPtr]$excel.Hwnd
  $rect = New-Object OgeSparklineWin+RECT
  [void][OgeSparklineWin]::GetWindowRect($hwnd, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = $graphics.GetHdc()
  [void][OgeSparklineWin]::PrintWindow($hwnd, $hdc, 2)
  $graphics.ReleaseHdc($hdc)
  $graphics.Dispose()
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  return $rect
}

$result = [ordered]@{ sheets = (New-Object System.Collections.ArrayList) }
try {
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $true
  Park
  $wb = $excel.Workbooks.Open((Join-Path $Corpus 'sparklines.xlsx'), 0, $true)
  $excel.Visible = $true
  Park
  foreach ($ws in $wb.Worksheets) {
    $groups = $ws.Cells.SparklineGroups
    if ($groups.Count -eq 0) { continue }
    $ws.Activate()
    $win = $excel.ActiveWindow
    $ws.Range('Z60').Select() | Out-Null
    $win.ScrollRow = 1; $win.ScrollColumn = 1
    $png = Join-Path $Pictures "$($ws.Name).png"
    # the first render can be blank: wait until the sheet is drawn
    $rect = $null
    for ($try = 0; $try -lt 10; $try++) {
      Start-Sleep -Milliseconds 900
      $rect = Shot $png
      $probe = [System.Drawing.Bitmap]::FromFile($png)
      $pane = $win.Panes.Item(1)
      $a1 = $ws.Range('A1')
      $px = $pane.PointsToScreenPixelsX([double]($a1.Left + $a1.Width / 2)) - $rect.Left
      $py = $pane.PointsToScreenPixelsY([double]($a1.Top + $a1.Height / 2)) - $rect.Top
      $c = $probe.GetPixel([int]$px, [int]$py)
      $probe.Dispose()
      if ($c.R -eq 255 -and $c.G -eq 255 -and $c.B -eq 255) { break }
    }
    $pane = $win.Panes.Item(1)
    $cells = New-Object System.Collections.ArrayList
    for ($g = 1; $g -le $groups.Count; $g++) {
      $group = $groups.Item($g)
      for ($i = 1; $i -le $group.Count; $i++) {
        $at = $group.Item($i).Location
        $box = $at.MergeArea
        [void]$cells.Add([ordered]@{
          r = $at.Row; c = $at.Column
          x0 = $pane.PointsToScreenPixelsX([double]$box.Left) - $rect.Left
          x1 = $pane.PointsToScreenPixelsX([double]($box.Left + $box.Width)) - $rect.Left
          y0 = $pane.PointsToScreenPixelsY([double]$box.Top) - $rect.Top
          y1 = $pane.PointsToScreenPixelsY([double]($box.Top + $box.Height)) - $rect.Top
        })
      }
    }
    # a right-to-left sheet's boxes come out left to right: sparkline-boxes.mjs mirrors them
    [void]$result.sheets.Add([ordered]@{ name = $ws.Name; zoom = $win.Zoom; rtl = [bool]$ws.DisplayRightToLeft; png = "$($ws.Name).png"; cells = $cells })
    Write-Host "sparklines: $($ws.Name), $($cells.Count) cells"
  }
  $wb.Close($false)
  [System.IO.File]::WriteAllText((Join-Path $Pictures 'sparklines.screens.json'), ($result | ConvertTo-Json -Depth 6 -Compress), $utf8)
} finally {
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
