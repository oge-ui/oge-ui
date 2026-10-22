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
  [string]$Only = '',
  # comma-separated corpus workbooks to capture (styles, structure, formulas, dates1904,
  # pictures, charts); empty = all — the others keep their committed copies
  [string]$Workbooks = ''
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
    $books = @('styles', 'structure', 'formulas', 'dates1904', 'pictures', 'charts')
    $chosen = @($Workbooks.Split(',') | Where-Object { $_ })
    if ($chosen.Count -gt 0) { $books = @($books | Where-Object { $chosen -contains $_ }) }
    foreach ($name in $books) {
      $wb = $xl.Workbooks.Open((Join-Path $Sources "$name.xlsx"))
      if ($name -eq 'charts') {
        # the Styled sheet's charts are Excel's own, inserted the way the
        # ribbon does (AddChart2, the default style) — the Data sheet's come
        # from bare parts, as libraries write them. Ranges are A1 addresses
        # and titles plain text: nothing Excel would parse in a locale.
        $ws = $wb.Worksheets.Item('Styled')
        $made = @(
          @{ type = 51; range = 'A1:E5'; title = 'Sales by quarter' },
          @{ type = 58; range = 'A1:E5'; title = 'Stacked sales' },
          @{ type = 65; range = 'A1:D5'; title = 'Trend' },
          @{ type = 5; range = 'A1:E2'; rows = $true; title = 'Q1 by region' },
          @{ type = -4120; range = 'A1:E2'; rows = $true; title = 'Q1 doughnut' },
          @{ type = 76; range = 'A1:E5'; title = 'Stacked areas' },
          @{ type = -4169; range = 'H1:I7'; title = 'Output by hours' },
          @{ type = 51; range = 'A1:C5'; combo = $true; title = 'North and South' }
        )
        for ($i = 0; $i -lt $made.Count; $i++) {
          $spec = $made[$i]
          $left = ($i % 2) * 7 + 1; $top = 10 + [math]::Floor($i / 2) * 16
          $from = $ws.Cells.Item($top, $left); $to = $ws.Cells.Item($top + 15, $left + 6)
          $shape = $ws.Shapes.AddChart2(-1, $spec.type, $from.Left, $from.Top, $to.Left - $from.Left, $to.Top - $from.Top)
          $source = $ws.Range($spec.range)
          if ($spec.rows) { $shape.Chart.SetSourceData($source, 1) } else { $shape.Chart.SetSourceData($source, 2) }
          if ($spec.combo) {
            $line = $shape.Chart.SeriesCollection(2)
            $line.ChartType = 65
            $line.AxisGroup = 2
          }
          $shape.Chart.HasTitle = $true
          $shape.Chart.ChartTitle.Text = $spec.title
          $shape.Name = "Styled $($i + 1)"
        }
      }
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
        # charts: where Excel put them, what it shows and the scales it chose
        $charts = New-Object System.Collections.ArrayList
        foreach ($co in $ws.ChartObjects()) {
          $ch = $co.Chart
          $entry = [ordered]@{
            name = $co.Name; left = Px $co.Left; top = Px $co.Top; width = Px $co.Width; height = Px $co.Height
            type = $ch.ChartType; hasTitle = $ch.HasTitle; hasLegend = $ch.HasLegend
            plot = [ordered]@{ left = Px $ch.PlotArea.InsideLeft; top = Px $ch.PlotArea.InsideTop; width = Px $ch.PlotArea.InsideWidth; height = Px $ch.PlotArea.InsideHeight }
          }
          if ($ch.HasTitle) {
            $entry.title = $ch.ChartTitle.Text
            $entry.titleSize = $ch.ChartTitle.Font.Size
            $entry.titleColor = Hex $ch.ChartTitle.Font.Color
            $entry.titleBox = [ordered]@{ left = Px $ch.ChartTitle.Left; top = Px $ch.ChartTitle.Top }
          }
          if ($ch.HasLegend) {
            $lg = $ch.Legend
            $entry.legend = [ordered]@{ position = $lg.Position; left = Px $lg.Left; top = Px $lg.Top; width = Px $lg.Width; height = Px $lg.Height; size = $lg.Font.Size; color = Hex $lg.Font.Color }
          }
          $axes = New-Object System.Collections.ArrayList
          foreach ($group in 1, 2) {
            foreach ($kind in 1, 2) {
              $has = $false
              try { $has = $ch.HasAxis($kind, $group) } catch { }
              if (-not $has) { continue }
              $ax = $ch.Axes($kind, $group)
              $axis = [ordered]@{ group = $group; kind = $kind; left = Px $ax.Left; top = Px $ax.Top; width = Px $ax.Width; height = Px $ax.Height }
              try { $axis.min = $ax.MinimumScale; $axis.max = $ax.MaximumScale; $axis.major = $ax.MajorUnit; $axis.minAuto = $ax.MinimumScaleIsAuto; $axis.maxAuto = $ax.MaximumScaleIsAuto; $axis.majorAuto = $ax.MajorUnitIsAuto } catch { }
              try { $axis.format = $ax.TickLabels.NumberFormat } catch { }
              try { $axis.labelSize = $ax.TickLabels.Font.Size; $axis.labelColor = Hex $ax.TickLabels.Font.Color } catch { }
              try { $axis.grid = $ax.HasMajorGridlines; if ($ax.HasMajorGridlines) { $axis.gridColor = Hex $ax.MajorGridlines.Format.Line.ForeColor.RGB; $axis.gridWeight = $ax.MajorGridlines.Format.Line.Weight } } catch { }
              try { $axis.line = $ax.Format.Line.Visible; if ($ax.Format.Line.Visible) { $axis.lineColor = Hex $ax.Format.Line.ForeColor.RGB } } catch { }
              try { $axis.reversed = $ax.ReversePlotOrder } catch { }
              try { if ($ax.HasTitle) { $axis.title = $ax.AxisTitle.Text } } catch { }
              [void]$axes.Add($axis)
            }
          }
          $entry.axes = $axes
          try { $entry.areaFill = Hex $ch.ChartArea.Format.Fill.ForeColor.RGB; $entry.areaLine = $ch.ChartArea.Format.Line.Visible; if ($ch.ChartArea.Format.Line.Visible) { $entry.areaLineColor = Hex $ch.ChartArea.Format.Line.ForeColor.RGB } } catch { }
          try { $entry.font = $ch.ChartArea.Font.Name; $entry.fontSize = $ch.ChartArea.Font.Size } catch { }
          $list = New-Object System.Collections.ArrayList
          foreach ($series in $ch.SeriesCollection()) {
            $item = [ordered]@{ name = $series.Name; type = $series.ChartType; group = $series.AxisGroup; formula = $series.Formula }
            try { $item.values = @($series.Values) } catch { }
            try { $item.categories = @($series.XValues | ForEach-Object { [string]$_ }) } catch { }
            try { $item.fill = Hex $series.Format.Fill.ForeColor.RGB } catch { }
            try { $item.line = Hex $series.Format.Line.ForeColor.RGB; $item.lineWeight = $series.Format.Line.Weight } catch { }
            try { $item.marker = $series.MarkerStyle; $item.markerSize = $series.MarkerSize } catch { }
            try { $item.labels = $series.HasDataLabels } catch { }
            [void]$list.Add($item)
          }
          $entry.series = $list
          [void]$charts.Add($entry)
        }
        $sheet.charts = $charts
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
        $i = 0
        foreach ($co in $ws.ChartObjects()) {
          $i++
          $file = "$name.$($ws.Name).chart$i.png"
          try {
            $win = $wb.Windows.Item(1)
            $win.ScrollRow = [math]::Max(1, $co.TopLeftCell.Row)
            $win.ScrollColumn = [math]::Max(1, $co.TopLeftCell.Column)
            [void]$co.Chart.Export((Join-Path $Corpus $file))
            $sheet.charts[$i - 1].picture = $file
          } catch { $sheet.charts[$i - 1].pictureError = $_.Exception.Message }
        }
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
