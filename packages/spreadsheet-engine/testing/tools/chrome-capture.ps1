# Captures Excel's own window chrome — headers, gridlines, the selection,
# the freeze line, the sheet tab strip — so the render layers can match its
# colours and sizes. Read-only: opens a corpus workbook read-only in a new,
# hidden Excel instance moved far off-screen, renders the window with
# PrintWindow, closes without saving. No Excel option is changed.
#
# The screenshots stay outside the repository (they show Microsoft's UI);
# only the numbers measured from them are recorded, in the render layers'
# tokens. Usage: pwsh -File chrome-capture.ps1 -Out <folder>
param([Parameter(Mandatory = $true)][string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OgeWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@

New-Item -ItemType Directory -Force $Out | Out-Null
$corpus = Join-Path $PSScriptRoot '../corpus'
$X = -20000; $Y = 200; $W = 1400; $H = 900
$excel = New-Object -ComObject Excel.Application
$book = $null
$geometry = [ordered]@{}
function Park() {
  # SWP_NOZORDER | SWP_NOACTIVATE
  [void][OgeWin]::SetWindowPos([IntPtr]$excel.Hwnd, [IntPtr]::Zero, $X, $Y, $W, $H, 0x0014)
}
function Snap([string]$name, [string[]]$cells) {
  Start-Sleep -Milliseconds 900
  $hwnd = [IntPtr]$excel.Hwnd
  $rect = New-Object OgeWin+RECT
  [void][OgeWin]::GetWindowRect($hwnd, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = $graphics.GetHdc()
  # PW_RENDERFULLCONTENT: renders DirectComposition content of an off-screen window
  [void][OgeWin]::PrintWindow($hwnd, $hdc, 2)
  $graphics.ReleaseHdc($hdc)
  $graphics.Dispose()
  $bitmap.Save((Join-Path $Out "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  $window = $excel.ActiveWindow
  $boxes = [ordered]@{}
  foreach ($address in $cells) {
    $range = $excel.ActiveSheet.Range($address)
    # frozen panes: 1 top-left, 2 top-right, 3 bottom-left, 4 bottom-right
    # (2 panes when only rows or only columns are frozen)
    $below = $window.SplitRow -gt 0 -and $range.Row -gt $window.SplitRow
    $beside = $window.SplitColumn -gt 0 -and $range.Column -gt $window.SplitColumn
    $index = 1
    if ($window.SplitRow -gt 0 -and $window.SplitColumn -gt 0) { $index = 1 + [int]$beside + 2 * [int]$below }
    elseif ($window.SplitRow -gt 0) { $index = 1 + [int]$below }
    elseif ($window.SplitColumn -gt 0) { $index = 1 + [int]$beside }
    $pane = $window.Panes.Item($index)
    $left = $pane.PointsToScreenPixelsX([double]$range.Left) - $rect.Left
    $top = $pane.PointsToScreenPixelsY([double]$range.Top) - $rect.Top
    $right = $pane.PointsToScreenPixelsX([double]($range.Left + $range.Width)) - $rect.Left
    $bottom = $pane.PointsToScreenPixelsY([double]($range.Top + $range.Height)) - $rect.Top
    $boxes[$address] = @($left, $top, $right, $bottom)
  }
  $geometry[$name] = [ordered]@{
    window = @($rect.Left, $rect.Top, $rect.Right, $rect.Bottom)
    zoom = $window.Zoom
    cells = $boxes
  }
}
try {
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $true
  Park
  $book = $excel.Workbooks.Open((Resolve-Path (Join-Path $corpus 'structure.xlsx')).Path, 0, $true)
  $excel.Visible = $true
  Park
  $sheet = $book.Worksheets.Item('Main'); $sheet.Activate()
  # as saved: frozen panes at B3, zoom 90, C4:D5 selected
  Snap 'main-saved' @('A1', 'B1', 'A3', 'C4', 'D5', 'C4:D5')
  $excel.ActiveWindow.Zoom = 100
  $sheet.Range('C4').Select()
  Snap 'main-cell' @('A1', 'B1', 'A3', 'B3', 'C4', 'D5')
  $sheet.Range('C:C').Select()
  Snap 'main-column' @('C4', 'C1')
  $sheet.Range('5:5').Select()
  Snap 'main-row' @('C5', 'A5')
  $data = $book.Worksheets.Item('Data'); $data.Activate()
  $data.Range('B2:C3').Select()
  Snap 'data-colored-tab' @('A1', 'B2', 'C3', 'B2:C3')
  $rtl = $book.Worksheets.Item('RTL'); $rtl.Activate()
  $rtl.Range('B2').Select()
  Snap 'rtl' @('A1', 'B2')
  $geometry | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $Out 'geometry.json')
} finally {
  if ($book) { $book.Close($false) }
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
