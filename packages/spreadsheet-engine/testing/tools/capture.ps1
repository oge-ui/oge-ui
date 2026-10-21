<#
  Opens the corpus sources in Microsoft Excel, records what Excel displays
  and saves the corpus workbooks again with Excel. Windows + Excel only; run
  it through `node testing/tools/run.mjs`, which builds the sources first.

  Excel is only *read* through COM (Text, Width, RowHeight, Borders ...), plus
  numeric setters. Format codes and formulas are never written through COM:
  PowerShell passes the user's locale to Excel, which would then parse them as
  local syntax. They live in the source files instead.
#>
param(
  [Parameter(Mandatory = $true)][string]$Sources,
  [Parameter(Mandatory = $true)][string]$Corpus,
  [Parameter(Mandatory = $true)][string]$Captures,
  # comma-separated: environment, numfmt, fit, borders, metrics, corpus; empty = all
  [string]$Only = ''
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Save-Json($object, [string]$path) {
  [System.IO.File]::WriteAllText($path, ($object | ConvertTo-Json -Depth 12 -Compress), $utf8)
}
function Px([double]$points) { return [math]::Round($points * 4 / 3, 2) }
function Hex([object]$bgr) {
  $n = [int]$bgr
  return '{0:X2}{1:X2}{2:X2}' -f ($n -band 0xFF), (($n -shr 8) -band 0xFF), (($n -shr 16) -band 0xFF)
}
$parts = @($Only.Split(',') | Where-Object { $_ })
function Wants([string]$part) { return $parts.Count -eq 0 -or $parts -contains $part }
function Read-Json([string]$path) { return Get-Content -Raw -Encoding UTF8 $path | ConvertFrom-Json }

$xl = New-Object -ComObject Excel.Application
try {
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $xl.ScreenUpdating = $false

  # ── environment ──
  if (Wants 'environment') {
    $intl = Get-ItemProperty 'HKCU:\Control Panel\International'
    $dpi = (Get-ItemProperty 'HKCU:\Control Panel\Desktop\WindowMetrics' -ErrorAction SilentlyContinue).AppliedDPI
    Save-Json ([ordered]@{
        excelVersion = $xl.Version; excelBuild = $xl.Build
        decimal = $xl.International(3); group = $xl.International(4); list = $xl.International(5)
        locale = $intl.LocaleName; shortDate = $intl.sShortDate; longDate = $intl.sLongDate
        longTime = $intl.sTimeFormat; am = $intl.s1159; pm = $intl.s2359; dpi = $dpi
        standardFont = $xl.StandardFont; standardFontSize = $xl.StandardFontSize
      }) (Join-Path $Captures 'environment.json')
    Write-Host 'environment'
  }

  # ── number formats: one workbook per case ──
  if (Wants 'numfmt') {
    $cases = Read-Json (Join-Path $Sources 'numfmt\cases.json')
    $results = New-Object System.Collections.ArrayList
    for ($i = 0; $i -lt $cases.Count; $i++) {
      $entry = [ordered]@{ format = $cases[$i][0]; value = $cases[$i][1] }
      try {
        $wb = $xl.Workbooks.Open((Join-Path $Sources "numfmt\$i.xlsx"), 0, $true)
        $entry.text = $wb.Worksheets.Item(1).Range('A1').Text
        $wb.Close($false)
      } catch { $entry.error = $_.Exception.Message }
      [void]$results.Add($entry)
    }
    Save-Json $results (Join-Path $Captures 'number-formats.json')
    Write-Host "number formats: $($cases.Count)"
  }

  # ── text in narrow columns ──
  if (Wants 'fit') {
    $fit = Read-Json (Join-Path $Sources 'fit.json')
    $wb = $xl.Workbooks.Open((Join-Path $Sources 'fit.xlsx'), 0, $true)
    $sheets = New-Object System.Collections.ArrayList
    foreach ($ws in $wb.Worksheets) {
      $rows = New-Object System.Collections.ArrayList
      for ($r = 1; $r -le $fit.values.Count; $r++) {
        $line = New-Object System.Collections.ArrayList
        for ($c = 1; $c -le $fit.widths.Count; $c++) { [void]$line.Add($ws.Cells.Item($r, $c).Text) }
        [void]$rows.Add(($line -join "`t"))
      }
      $widths = @(); for ($c = 1; $c -le $fit.widths.Count; $c++) { $widths += (Px $ws.Columns.Item($c).Width) }
      [void]$sheets.Add([ordered]@{ format = $fit.formats[$sheets.Count]; widthsPx = $widths; rows = $rows })
    }
    $wb.Close($false)
    Save-Json ([ordered]@{ values = $fit.values; sheets = $sheets }) (Join-Path $Captures 'fit.json')
    Write-Host 'fit'
  }

  # ── border precedence ──
  if (Wants 'borders') {
    $borders = Read-Json (Join-Path $Sources 'borders.json')
    $wb = $xl.Workbooks.Open((Join-Path $Sources 'borders.xlsx'), 0, $true)
    $h = $wb.Worksheets.Item('H'); $v = $wb.Worksheets.Item('V')
    $winners = New-Object System.Collections.ArrayList
    for ($i = 0; $i -lt $borders.pairs.Count; $i++) {
      $hb = $h.Range('B' + (2 * $i + 1)).Borders.Item(10)
      $vb = $v.Range('B' + (3 * $i + 1)).Borders.Item(9)
      [void]$winners.Add([ordered]@{
          first = $borders.pairs[$i][0]; second = $borders.pairs[$i][1]
          horizontal = $(if ((Hex $hb.Color) -eq '0000FF') { 'second' } elseif ((Hex $hb.Color) -eq 'FF0000') { 'first' } else { 'none' })
          vertical = $(if ((Hex $vb.Color) -eq '0000FF') { 'second' } elseif ((Hex $vb.Color) -eq 'FF0000') { 'first' } else { 'none' })
        })
    }
    $wb.Close($false)
    Save-Json $winners (Join-Path $Captures 'border-precedence.json')
    Write-Host 'borders'
  }

  # ── font metrics: digit width, padding, default column and row per Normal font ──
  if (Wants 'metrics') {
    $metricsMeta = Read-Json (Join-Path $Sources 'metrics.json')
    $metrics = New-Object System.Collections.ArrayList
    foreach ($font in $metricsMeta.fonts) {
      # a fresh copy per font: a workbook holds a limited number of fonts, and
      # once it is full Excel silently keeps the old Normal font (the first
      # capture recorded Arial Narrow for every font after it)
      $wb = $xl.Workbooks.Open((Join-Path $Sources 'metrics.xlsx'), 0, $true)
      $ws = $wb.Worksheets.Item(1)
      $normal = $wb.Styles.Item('Normal')
      $c1 = $ws.Columns.Item(1); $c2 = $ws.Columns.Item(2); $c3 = $ws.Columns.Item(3)
      $normal.Font.Name = $font
      if ($normal.Font.Name -ne $font) { throw "Excel kept $($normal.Font.Name) as the Normal font instead of $font" }
      $sizes = New-Object System.Collections.ArrayList
      for ($k = 2; $k -le 144; $k++) {
        $normal.Font.Size = [double]($k / 2)
        if ([double]$normal.Font.Size -ne [double]($k / 2)) { throw "Excel refused size $($k / 2) for $font" }
        $c2.ColumnWidth = [double]10
        $c3.ColumnWidth = [double]20
        $w10 = Px $c2.Width; $w20 = Px $c3.Width
        [void]$sizes.Add(('{0}|{1}|{2}|{3}|{4}' -f ($k / 2), $w10, $w20, (Px $c1.Width), (Px $ws.StandardHeight)))
      }
      [void]$metrics.Add([ordered]@{ font = $font; resolved = $normal.Font.Name; sizes = $sizes })
      $wb.Close($false)
    }
    $wrapMeta = Read-Json (Join-Path $Sources 'wrap.json')
    $wb = $xl.Workbooks.Open((Join-Path $Sources 'wrap.xlsx'), 0, $true)
    $ws = $wb.Worksheets.Item(1)
    $wrap = @(); for ($r = 1; $r -le 6 * $wrapMeta.fonts.Count; $r++) { $wrap += (Px $ws.Rows.Item($r).RowHeight) }
    $wb.Close($false)
    Save-Json ([ordered]@{ fonts = $metrics; wrap = [ordered]@{ fonts = $wrapMeta.fonts; heightsPx = $wrap } }) (Join-Path $Captures 'font-metrics.json')
    Write-Host 'metrics'
  }

  # ── the corpus workbooks ──
  if (Wants 'corpus') {
    foreach ($name in @('styles', 'structure', 'formulas', 'dates1904', 'pictures')) {
      $wb = $xl.Workbooks.Open((Join-Path $Sources "$name.xlsx"))
      $book = [ordered]@{ name = $name; date1904 = $wb.Date1904; sheets = (New-Object System.Collections.ArrayList); names = (New-Object System.Collections.ArrayList) }
      foreach ($n in $wb.Names) { [void]$book.names.Add([ordered]@{ name = $n.Name; refersTo = $n.RefersTo; visible = $n.Visible }) }
      foreach ($ws in $wb.Worksheets) {
        $sheet = [ordered]@{ name = $ws.Name; visible = [int]$ws.Visible }
        if ($ws.Tab.ColorIndex -ne -4142) { $sheet.tabColor = Hex $ws.Tab.Color }
        $sheet.standardWidth = $ws.StandardWidth; $sheet.standardHeightPx = Px $ws.StandardHeight
        if ($ws.Visible -eq -1) {
          $ws.Activate()
          $win = $wb.Windows.Item(1)
          $sheet.window = [ordered]@{
            freeze = $win.FreezePanes; splitRow = $win.SplitRow; splitColumn = $win.SplitColumn
            scrollRow = $win.ScrollRow; scrollColumn = $win.ScrollColumn; zoom = $win.Zoom
            gridlines = $win.DisplayGridlines; headings = $win.DisplayHeadings; rightToLeft = $win.DisplayRightToLeft
            outline = $win.DisplayOutline; activeCell = $xl.ActiveCell.Address($false, $false)
          }
        }
        $used = $ws.UsedRange
        $lastRow = $used.Row + $used.Rows.Count - 1
        $lastCol = $used.Column + $used.Columns.Count - 1
        $sheet.used = $used.Address($false, $false)
        $hasCf = $ws.Cells.FormatConditions.Count -gt 0
        $cells = New-Object System.Collections.ArrayList
        $merges = New-Object System.Collections.ArrayList
        for ($r = 1; $r -le $lastRow; $r++) {
          for ($c = 1; $c -le $lastCol; $c++) {
            $cell = $ws.Cells.Item($r, $c)
            if ($cell.MergeCells -and $cell.MergeArea.Row -eq $r -and $cell.MergeArea.Column -eq $c) {
              [void]$merges.Add($cell.MergeArea.Address($false, $false))
            }
            if ([string]$cell.Formula -eq '') { continue }
            $item = [ordered]@{ a = $cell.Address($false, $false); t = $cell.Text }
            $value = $cell.Value2
            if ($value -is [double]) { $item.n = $value }
            elseif ($value -is [bool]) { $item.b = $value }
            elseif ($value -is [int]) { $item.e = $cell.Text }
            elseif ($null -ne $value) { $item.s = [string]$value }
            if ($cell.HasFormula) {
              $item.f = $cell.Formula
              try { $item.f2 = $cell.Formula2 } catch { }
              if ($cell.HasArray) { $item.array = $cell.CurrentArray.Address($false, $false) }
              try { if ($cell.HasSpill -and $cell.SpillParent.Address() -eq $cell.Address()) { $item.spill = $cell.SpillingToRange.Address($false, $false) } } catch { }
            }
            if ($hasCf) {
              $display = $cell.DisplayFormat
              $item.cfFill = Hex $display.Interior.Color
              $item.cfFont = Hex $display.Font.Color
              $item.cfBold = $display.Font.Bold
            }
            [void]$cells.Add($item)
          }
        }
        $sheet.cells = $cells
        $sheet.merges = $merges
        $columns = @(); for ($c = 1; $c -le $lastCol + 3; $c++) { $col = $ws.Columns.Item($c); $columns += ('{0}|{1}|{2}' -f (Px $col.Width), $col.Hidden, $col.OutlineLevel) }
        $sheet.columns = $columns
        $rowsInfo = @(); for ($r = 1; $r -le $lastRow + 3; $r++) { $row = $ws.Rows.Item($r); $rowsInfo += ('{0}|{1}|{2}' -f (Px $row.RowHeight), $row.Hidden, $row.OutlineLevel) }
        $sheet.rows = $rowsInfo
        $links = New-Object System.Collections.ArrayList
        foreach ($link in $ws.Hyperlinks) {
          [void]$links.Add([ordered]@{ range = $link.Range.Address($false, $false); address = $link.Address; subAddress = $link.SubAddress; tip = $link.ScreenTip; text = $link.TextToDisplay })
        }
        $sheet.hyperlinks = $links
        $notes = New-Object System.Collections.ArrayList
        foreach ($comment in $ws.Comments) {
          [void]$notes.Add([ordered]@{ cell = $comment.Parent.Address($false, $false); text = $comment.Text(); visible = $comment.Visible; author = $comment.Author })
        }
        $sheet.notes = $notes
        $shapes = New-Object System.Collections.ArrayList
        foreach ($shape in $ws.Shapes) {
          [void]$shapes.Add([ordered]@{
              name = $shape.Name; type = $shape.Type; left = Px $shape.Left; top = Px $shape.Top
              width = Px $shape.Width; height = Px $shape.Height; rotation = $shape.Rotation
              alt = $shape.AlternativeText; placement = $shape.Placement
            })
        }
        $sheet.shapes = $shapes
        [void]$book.sheets.Add($sheet)
      }
      $wb.Worksheets.Item(1).Activate()
      $wb.SaveAs((Join-Path $Corpus "$name.xlsx"), 51)
      $wb.Close($false)

      # pictures from the saved file, which is then closed unsaved: a chart
      # pasted for the export must not end up in the corpus. CopyPicture copies
      # the screen image, so screen updating must be on (off, it is blank).
      $xl.ScreenUpdating = $true
      $wb = $xl.Workbooks.Open((Join-Path $Corpus "$name.xlsx"), 0, $true)
      foreach ($sheet in $book.sheets) {
        $ws = $wb.Worksheets.Item($sheet.name)
        if ($ws.Visible -ne -1) { continue }
        try {
          # CopyPicture takes the screen image: only the active sheet has one
          $ws.Activate()
          $used = $ws.UsedRange
          $range = $ws.Range($ws.Cells.Item(1, 1), $ws.Cells.Item([math]::Min($used.Row + $used.Rows.Count, 60), [math]::Min($used.Column + $used.Columns.Count, 20)))
          [void]$range.CopyPicture(1, 2)
          $chart = $ws.ChartObjects().Add(0, 0, $range.Width, $range.Height)
          [void]$chart.Chart.Paste()
          [void]$chart.Chart.Export((Join-Path $Corpus "$name.$($ws.Name).png"))
          $chart.Delete()
          $sheet.picture = "$name.$($ws.Name).png"
          $sheet.pictureRange = $range.Address($false, $false)
        } catch { $sheet.pictureError = $_.Exception.Message }
      }
      $wb.Close($false)
      $xl.ScreenUpdating = $false
      Save-Json $book (Join-Path $Corpus "$name.excel.json")
      Write-Host "corpus: $name"
    }
  }
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
