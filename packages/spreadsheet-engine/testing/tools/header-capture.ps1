# Measures Excel's row-header width and column-header height: per Normal
# style font, zoom and the largest visible row number. Same off-screen,
# read-only set-up as chrome-capture.ps1; the Normal style is changed in
# memory only (the read-only copy is closed without saving).
# A probe that lands on cell content (a filled first row, a header label)
# measures nothing and is dropped.
# Usage: powershell -File header-capture.ps1 [-Out <json file>]
param([string]$Out = (Join-Path $PSScriptRoot '../captures/headers.json'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OgeWin2 {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
$corpus = Join-Path $PSScriptRoot '../corpus'
$excel = New-Object -ComObject Excel.Application
$book = $null
function Park() { [void][OgeWin2]::SetWindowPos([IntPtr]$excel.Hwnd, [IntPtr]::Zero, -20000, 200, 1400, 900, 0x0014) }
function Grab() {
  Start-Sleep -Milliseconds 450
  $hwnd = [IntPtr]$excel.Hwnd
  $rect = New-Object OgeWin2+RECT
  [void][OgeWin2]::GetWindowRect($hwnd, [ref]$rect)
  $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left), ($rect.Bottom - $rect.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = $graphics.GetHdc()
  [void][OgeWin2]::PrintWindow($hwnd, $hdc, 2)
  $graphics.ReleaseHdc($hdc); $graphics.Dispose()
  return $bitmap
}
function Same($c, [int]$rgb) { return ((([int]$c.R) -shl 16) -bor (([int]$c.G) -shl 8) -bor [int]$c.B) -eq $rgb }
function Measure-Headers($bitmap, [int]$probeX) {
  # down the column-header strip at probeX: header background, then the first white cell pixel
  $top = -1; $cell = -1
  for ($y = 215; $y -lt $bitmap.Height - 60; $y++) {
    $c = $bitmap.GetPixel($probeX, $y)
    if ($top -lt 0 -and (Same $c 0x0A0A0A)) { $top = $y }
    elseif ($top -ge 0 -and (Same $c 0xFFFFFF)) { $cell = $y; break }
  }
  # along the first row, one pixel below its top: row-header background, then white
  $left = -1; $first = -1
  $y = $cell + 1
  for ($x = 0; $x -lt 600; $x++) {
    $c = $bitmap.GetPixel($x, $y)
    if ($left -lt 0 -and (Same $c 0x0A0A0A)) { $left = $x }
    elseif ($left -ge 0 -and (Same $c 0xFFFFFF)) { $first = $x; break }
  }
  return @{ height = $cell - $top; width = $first - $left; gridTop = $top; gridLeft = $left }
}
$results = New-Object System.Collections.ArrayList
try {
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $true
  Park
  $book = $excel.Workbooks.Open((Resolve-Path (Join-Path $corpus 'structure.xlsx')).Path, 0, $true)
  $excel.Visible = $true
  Park
  $sheet = $book.Worksheets.Item('CF'); $sheet.Activate()
  $sheet.Range('A1').Select()
  $fonts = @(@('Calibri', 11), @('Aptos Narrow', 11), @('Arial', 10), @('Calibri', 20), @('Times New Roman', 12), @('Calibri', 8))
  foreach ($font in $fonts) {
    $normal = $book.Styles.Item('Normal')
    $normal.Font.Name = $font[0]
    $normal.Font.Size = [double]$font[1]
    foreach ($zoom in @(50, 75, 90, 100, 125, 150, 200, 400)) {
      $excel.ActiveWindow.Zoom = $zoom
      foreach ($row in @(1, 95, 995, 9995, 99995, 999995)) {
        $excel.ActiveWindow.ScrollRow = $row
        $bitmap = Grab
        $m = Measure-Headers $bitmap 300
        $bitmap.Dispose()
        $last = $excel.ActiveWindow.VisibleRange.Row + $excel.ActiveWindow.VisibleRange.Rows.Count - 1
        if ($m.width -gt 0 -and $m.height -gt 0) {
          [void]$results.Add([ordered]@{ font = $font[0]; size = $font[1]; zoom = $zoom; scrollRow = $row; lastVisibleRow = $last; width = $m.width; height = $m.height })
        }
      }
    }
  }
  # UTF-8 without a BOM, one line — the other captures' format
  [System.IO.File]::WriteAllText($Out, ($results | ConvertTo-Json -Depth 4 -Compress), (New-Object System.Text.UTF8Encoding($false)))
} finally {
  if ($book) { $book.Close($false) }
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
