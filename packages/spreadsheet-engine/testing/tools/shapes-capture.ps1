<#
  Builds the shapes corpus workbook in Excel itself: a small order-handling
  flowchart (process, decision, terminator, document, data and preparation
  shapes with text, elbow and straight connectors glued to them with
  arrowheads, a dashed return path, a group and a text box), plus a gallery
  sheet with every flowchart preset and the three connector kinds. Saves it to
  <Corpus>/shapes.xlsx and records what Excel's object model reports for every
  shape — preset, position and size in points, rotation, flips, text, fill,
  line dash and arrowheads — in <Corpus>/shapes.excel.json, with a picture of
  each sheet (shapes.<sheet>.png) for looking at.

  Usage: powershell -File shapes-capture.ps1 -Corpus <corpus folder>
  ASCII only: Windows PowerShell 5.1 reads a BOM-less script as ANSI.
#>
param([Parameter(Mandatory = $true)][string]$Corpus)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Rgb([int]$r, [int]$gr, [int]$b) { return $r + 256 * $gr + 65536 * $b }

$xl = New-Object -ComObject Excel.Application
try {
  $xl.DisplayAlerts = $false
  $xl.ScreenUpdating = $true
  $wb = $xl.Workbooks.Add()
  while ($wb.Worksheets.Count -gt 1) { $wb.Worksheets.Item($wb.Worksheets.Count).Delete() }
  $ws = $wb.Worksheets.Item(1)
  $ws.Name = 'Flow'
  $ws.Activate()
  $ws.Range('A1').Value2 = 'Order handling'
  $ws.Range('A1').Font.Bold = $true

  $sh = $ws.Shapes
  $made = @{}
  function Add-Box($name, [int]$type, [double]$l, [double]$t, [double]$w, [double]$h, $text, [int]$fill) {
    $shape = $sh.AddShape($type, $l, $t, $w, $h)
    $shape.Name = $name
    if ($fill -ge 0) { $shape.Fill.ForeColor.RGB = $fill } else { $shape.Fill.ForeColor.RGB = (Rgb 255 255 255) }
    $shape.Line.ForeColor.RGB = (Rgb 0 0 0)
    $shape.Line.Weight = 0.75
    if ($text) {
      $range = $shape.TextFrame2.TextRange
      $range.Text = $text
      $range.Font.Size = 7
      $range.Font.Fill.ForeColor.RGB = (Rgb 0 0 0)
      $range.ParagraphFormat.Alignment = 2   # centre
      $shape.TextFrame2.VerticalAnchor = 3    # middle
    }
    $script:made[$name] = $shape
    return $shape
  }
  $start = Add-Box 'Start' 69 30 40 140 24 'Order received' -1
  $login = Add-Box 'Login' 64 30 84 140 22 'Enter customer details' -1
  $plan = Add-Box 'Plan' 63 40 128 120 46 'In stock?' -1
  $doc = Add-Box 'Warn' 67 200 136 110 30 'Print a back-order notice for the customer' -1
  $proc = Add-Box 'Record' 61 30 200 140 26 'Reserve the items and book the delivery' -1
  $end = Add-Box 'End' 69 330 210 90 30 'Order closed' (Rgb 255 242 204)
  $pre = Add-Box 'Prepare' 70 200 40 110 30 'Restock' -1

  function Connect($name, [int]$type, $from, [int]$fromSite, $to, [int]$toSite, [bool]$arrow, [int]$dash) {
    $line = $sh.AddConnector($type, 0, 0, 10, 10)
    $line.Name = $name
    $line.ConnectorFormat.BeginConnect($from, $fromSite)
    $line.ConnectorFormat.EndConnect($to, $toSite)
    $line.RerouteConnections()
    $line.Line.ForeColor.RGB = (Rgb 0 0 0)
    $line.Line.Weight = 1
    if ($arrow) { $line.Line.EndArrowheadStyle = 2 }   # msoArrowheadTriangle
    if ($dash -gt 0) { $line.Line.DashStyle = $dash; $line.Line.ForeColor.RGB = (Rgb 0 112 192) }
    $script:made[$name] = $line
  }
  Connect 'StartToLogin' 1 $start 3 $login 1 $true 0
  Connect 'LoginToPlan' 1 $login 3 $plan 1 $true 0
  Connect 'PlanYes' 2 $plan 4 $doc 2 $true 0
  Connect 'PlanNo' 2 $plan 3 $proc 1 $true 0
  Connect 'Back' 2 $doc 1 $pre 3 $true 4            # dashed return path
  Connect 'ToEnd' 2 $proc 4 $end 2 $true 0

  # a labelled pair kept together as a group
  $a = $sh.AddShape(1, 200, 260, 50, 18); $a.Name = 'TagA'; $a.TextFrame2.TextRange.Text = 'YES'; $a.TextFrame2.TextRange.Font.Size = 6
  $b = $sh.AddShape(1, 260, 260, 50, 18); $b.Name = 'TagB'; $b.TextFrame2.TextRange.Text = 'NO'; $b.TextFrame2.TextRange.Font.Size = 6
  $group = $sh.Range([object[]]@('TagA', 'TagB')).Group()
  $group.Name = 'Tags'
  $box = $sh.AddTextbox(1, 30, 250, 150, 20)
  $box.Name = 'Note'
  $box.TextFrame2.TextRange.Text = 'Note: check the delivery date'
  $box.TextFrame2.TextRange.Font.Size = 8

  # every flowchart preset, labelled
  $gal = $wb.Worksheets.Add([Type]::Missing, $ws)
  $gal.Name = 'Gallery'
  $col = 0; $row = 0
  for ($type = 61; $type -le 88; $type++) {
    $shape = $gal.Shapes.AddShape($type, 20 + $col * 90, 20 + $row * 60, 70, 40)
    $shape.Name = "Preset$type"
    $shape.Fill.ForeColor.RGB = (Rgb 189 215 238)
    $shape.Line.ForeColor.RGB = (Rgb 47 85 151)
    $col++
    if ($col -eq 7) { $col = 0; $row++ }
  }
  foreach ($connector in 1..3) {
    $line = $gal.Shapes.AddConnector($connector, 20 + ($connector - 1) * 120, 300, 100 + ($connector - 1) * 120, 350)
    $line.Name = "Connector$connector"
    $line.Line.BeginArrowheadStyle = 5   # oval
    $line.Line.EndArrowheadStyle = 3     # open
  }
  $ws.Activate()
  $wb.SaveAs((Join-Path $Corpus 'shapes.xlsx'), 51)

  # what the object model reports, read back from the saved workbook
  $result = [ordered]@{ sheets = (New-Object System.Collections.ArrayList) }
  foreach ($sheet in $wb.Worksheets) {
    $list = New-Object System.Collections.ArrayList
    foreach ($shape in $sheet.Shapes) {
      $entry = [ordered]@{
        name = $shape.Name
        type = [int]$shape.Type
        autoShapeType = [int]$shape.AutoShapeType
        connector = [bool]$shape.Connector
        left = [math]::Round($shape.Left, 2)
        top = [math]::Round($shape.Top, 2)
        width = [math]::Round($shape.Width, 2)
        height = [math]::Round($shape.Height, 2)
        rotation = [double]$shape.Rotation
        flipH = [bool]$shape.HorizontalFlip
        flipV = [bool]$shape.VerticalFlip
        topLeft = $shape.TopLeftCell.Address($false, $false)
      }
      if ($shape.Type -eq 6) {
        $entry.items = @($shape.GroupItems | ForEach-Object { $_.Name })
      } else {
        try { if ($shape.TextFrame2.HasText) { $entry.text = $shape.TextFrame2.TextRange.Text } } catch {}
        try {
          $entry.lineDash = [int]$shape.Line.DashStyle
          $entry.lineWeight = [double]$shape.Line.Weight
          $entry.beginArrow = [int]$shape.Line.BeginArrowheadStyle
          $entry.endArrow = [int]$shape.Line.EndArrowheadStyle
        } catch {}
        try { if ($shape.Fill.Visible) { $entry.fill = '{0:X6}' -f [int]$shape.Fill.ForeColor.RGB } } catch {}
      }
      [void]$list.Add($entry)
    }
    [void]$result.sheets.Add([ordered]@{ name = $sheet.Name; shapes = $list })
    try {
      $sheet.Activate()
      $range = $sheet.Range('A1:L24')
      if ($sheet.Name -eq 'Gallery') { $range = $sheet.Range('A1:N30') }
      [void]$range.CopyPicture(1, 2)
      $chart = $sheet.ChartObjects().Add(0, 0, $range.Width, $range.Height)
      [void]$chart.Chart.Paste()
      [void]$chart.Chart.Export((Join-Path $Corpus "shapes.$($sheet.Name).png"))
      $chart.Delete()
    } catch { Write-Host "picture: $($_.Exception.Message)" }
  }
  $wb.Close($false)
  $json = $result | ConvertTo-Json -Depth 6
  [System.IO.File]::WriteAllText((Join-Path $Corpus 'shapes.excel.json'), $json + "`n", $utf8)
  Write-Host 'shapes: done'
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
