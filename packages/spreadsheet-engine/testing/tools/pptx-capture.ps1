# Builds the PowerPoint golden corpus: PowerPoint itself creates and saves the
# deck, then reports what it shows. Nothing is changed in the application's
# options. If presentations were already open, PowerPoint is left running.
#
#   powershell -File pptx-capture.ps1 -OutDir <folder>
#
# Writes <OutDir>\slides.pptx, <OutDir>\slides.powerpoint.json and one PNG per
# slide (<OutDir>\slide<N>.png, for looking at, not for committing).
param([Parameter(Mandatory = $true)][string]$OutDir)

$ErrorActionPreference = 'Stop'
$msoTrue = -1
$msoFalse = 0

function Rgb([int]$bgr) {
  $r = $bgr -band 255
  $g = ($bgr -shr 8) -band 255
  $b = ($bgr -shr 16) -band 255
  return ('{0:X2}{1:X2}{2:X2}' -f $r, $g, $b)
}

function Bgr([string]$hex) {
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return $r + ($g * 256) + ($b * 65536)
}

function Measure-Text($shape) {
  if (-not $shape.HasTextFrame) { return $null }
  if (-not $shape.TextFrame.HasText) { return $null }
  $range = $shape.TextFrame.TextRange
  $paragraphs = @()
  for ($i = 1; $i -le $range.Paragraphs().Count; $i++) {
    $p = $range.Paragraphs($i)
    $lines = @()
    for ($l = 1; $l -le $p.Lines().Count; $l++) {
      $line = $p.Lines($l)
      $lines += [ordered]@{
        text   = $line.Text.TrimEnd("`r", "`n", [char]11)
        left   = $line.BoundLeft
        top    = $line.BoundTop
        width  = $line.BoundWidth
        height = $line.BoundHeight
      }
    }
    $paragraphs += [ordered]@{
      text    = $p.Text.TrimEnd("`r", "`n")
      level   = $p.IndentLevel
      font    = $p.Font.Name
      size    = $p.Font.Size
      bold    = ($p.Font.Bold -eq $msoTrue)
      italic  = ($p.Font.Italic -eq $msoTrue)
      color   = (Rgb $p.Font.Color.RGB)
      align   = $p.ParagraphFormat.Alignment
      bullet  = ($p.ParagraphFormat.Bullet.Visible -eq $msoTrue)
      lines   = $lines
    }
  }
  return [ordered]@{
    anchor       = $shape.TextFrame.VerticalAnchor
    marginLeft   = $shape.TextFrame.MarginLeft
    marginTop    = $shape.TextFrame.MarginTop
    marginRight  = $shape.TextFrame.MarginRight
    marginBottom = $shape.TextFrame.MarginBottom
    wordWrap     = ($shape.TextFrame.WordWrap -eq $msoTrue)
    paragraphs   = $paragraphs
  }
}

function Measure-Shape($shape) {
  $o = [ordered]@{
    name     = $shape.Name
    type     = [int]$shape.Type
    autoType = [int]$shape.AutoShapeType
    left     = $shape.Left
    top      = $shape.Top
    width    = $shape.Width
    height   = $shape.Height
    rotation = $shape.Rotation
    flipH    = ($shape.HorizontalFlip -eq $msoTrue)
    flipV    = ($shape.VerticalFlip -eq $msoTrue)
  }
  # pictures, groups and tables have no meaningful fill or line to report
  if ($shape.Type -eq 1 -or $shape.Type -eq 17 -or $shape.Type -eq 14) {
    $o.fillVisible = ($shape.Fill.Visible -eq $msoTrue)
    if ($o.fillVisible) {
      $o.fill = (Rgb $shape.Fill.ForeColor.RGB)
      $o.fillTransparency = [math]::Round($shape.Fill.Transparency, 4)
    }
    $o.lineVisible = ($shape.Line.Visible -eq $msoTrue)
    if ($o.lineVisible) {
      $o.line = (Rgb $shape.Line.ForeColor.RGB)
      $o.lineWeight = $shape.Line.Weight
      $o.lineDash = [int]$shape.Line.DashStyle
    }
  }
  $o.text = Measure-Text $shape
  if ($shape.HasTable) {
    $table = $shape.Table
    $columns = @()
    for ($c = 1; $c -le $table.Columns.Count; $c++) { $columns += $table.Columns($c).Width }
    $rows = @()
    for ($r = 1; $r -le $table.Rows.Count; $r++) {
      $cells = @()
      for ($c = 1; $c -le $table.Columns.Count; $c++) {
        $cell = $table.Cell($r, $c)
        $cells += [ordered]@{
          text = $cell.Shape.TextFrame.TextRange.Text
          fill = (Rgb $cell.Shape.Fill.ForeColor.RGB)
          font = (Rgb $cell.Shape.TextFrame.TextRange.Font.Color.RGB)
          bold = ($cell.Shape.TextFrame.TextRange.Font.Bold -eq $msoTrue)
        }
      }
      $rows += [ordered]@{ height = $table.Rows($r).Height; cells = $cells }
    }
    $o.table = [ordered]@{ columns = $columns; rows = $rows }
  }
  if ($shape.Type -eq 6) {
    $items = @()
    for ($i = 1; $i -le $shape.GroupItems.Count; $i++) {
      $items += Measure-Shape $shape.GroupItems.Item($i)
    }
    $o.items = $items
  }
  return $o
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

$picture = Join-Path $OutDir 'picture.png'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 160, 90
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 32, 96, 160))
$graphics.Dispose()
$bitmap.Save($picture, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

$app = New-Object -ComObject PowerPoint.Application
$wasOpen = $app.Presentations.Count
$deck = $app.Presentations.Add($msoFalse)
try {
  $deck.PageSetup.SlideWidth = 960
  $deck.PageSetup.SlideHeight = 540
  # installed on the machine, unlike the cloud-only Aptos: a browser can then
  # draw the deck with the same faces PowerPoint measured
  $deck.SlideMaster.Theme.ThemeFontScheme.MinorFont.Item(1).Name = 'Calibri'
  $deck.SlideMaster.Theme.ThemeFontScheme.MajorFont.Item(1).Name = 'Calibri Light'
  $layouts = $deck.SlideMaster.CustomLayouts

  # 1: title layout, everything inherited
  $s = $deck.Slides.AddSlide(1, $layouts.Item(1))
  $s.Shapes.Item(1).TextFrame.TextRange.Text = 'Quarterly results'
  $s.Shapes.Item(2).TextFrame.TextRange.Text = 'Prepared by finance'

  # 2: content layout, nested bullets, a line that wraps
  $s = $deck.Slides.AddSlide(2, $layouts.Item(2))
  $s.Shapes.Item(1).TextFrame.TextRange.Text = 'Agenda'
  $body = $s.Shapes.Item(2).TextFrame.TextRange
  $body.Text = "First level`rSecond level`rThird level`rA first level paragraph long enough to wrap across more than one line of the placeholder so the line breaks can be compared with what PowerPoint chose for this text"
  $body.Paragraphs(2).IndentLevel = 2
  $body.Paragraphs(3).IndentLevel = 3

  # 3: drawn shapes
  $s = $deck.Slides.AddSlide(3, $layouts.Item(7))
  $a = $s.Shapes.AddShape(1, 40, 40, 200, 100); $a.Name = 'solid'
  $a.Fill.ForeColor.RGB = (Bgr 'C0392B'); $a.Line.Visible = $msoFalse
  $b = $s.Shapes.AddShape(9, 280, 40, 180, 120); $b.Name = 'themed'
  $b.Fill.ForeColor.ObjectThemeColor = 6; $b.Fill.ForeColor.Brightness = 0.4
  $b.Line.ForeColor.RGB = (Bgr '1F2937'); $b.Line.Weight = 3
  $c = $s.Shapes.AddShape(5, 500, 40, 200, 100); $c.Name = 'outline'
  $c.Fill.Visible = $msoFalse; $c.Line.ForeColor.RGB = (Bgr '0E7490')
  $c.Line.Weight = 2; $c.Line.DashStyle = 4
  $d = $s.Shapes.AddShape(1, 60, 220, 160, 80); $d.Name = 'rotated'
  $d.Rotation = 30; $d.Fill.ForeColor.RGB = (Bgr '7C3AED'); $d.Flip(0)
  $e = $s.Shapes.AddShape(1, 280, 220, 160, 80); $e.Name = 'transparent'
  $e.Fill.ForeColor.RGB = (Bgr '16A34A'); $e.Fill.Transparency = 0.5
  $f = $s.Shapes.AddTextbox(1, 500, 220, 300, 60); $f.Name = 'textbox'
  $range = $f.TextFrame.TextRange
  $range.Text = 'Styled text box'; $range.Font.Size = 24; $range.Font.Bold = $msoTrue
  $range.Font.Italic = $msoTrue; $range.Font.Color.RGB = (Bgr 'B45309')
  $range.ParagraphFormat.Alignment = 2
  $g = $s.Shapes.AddShape(1, 40, 360, 300, 120); $g.Name = 'labelled'
  $g.TextFrame.TextRange.Text = 'Centred label'
  $g.Fill.ForeColor.ObjectThemeColor = 5

  # 4: group, table, picture
  $s = $deck.Slides.AddSlide(4, $layouts.Item(7))
  $x = $s.Shapes.AddShape(1, 40, 40, 100, 60); $x.Name = 'g1'
  $y = $s.Shapes.AddShape(9, 160, 80, 100, 60); $y.Name = 'g2'
  $group = $s.Shapes.Range(@('g1', 'g2')).Group(); $group.Name = 'group'
  $t = $s.Shapes.AddTable(3, 2, 320, 40, 400, 120); $t.Name = 'table'
  $t.Table.Cell(1, 1).Shape.TextFrame.TextRange.Text = 'Region'
  $t.Table.Cell(1, 2).Shape.TextFrame.TextRange.Text = 'Sales'
  $t.Table.Cell(2, 1).Shape.TextFrame.TextRange.Text = 'North'
  $t.Table.Cell(2, 2).Shape.TextFrame.TextRange.Text = '120'
  $t.Table.Cell(3, 1).Shape.TextFrame.TextRange.Text = 'South'
  $t.Table.Cell(3, 2).Shape.TextFrame.TextRange.Text = '95'
  $p = $s.Shapes.AddPicture($picture, $msoFalse, $msoTrue, 40, 240, 320, 180); $p.Name = 'picture'

  # 5: own background, hidden
  $s = $deck.Slides.AddSlide(5, $layouts.Item(7))
  $s.FollowMasterBackground = $msoFalse
  $s.Background.Fill.Solid()
  $s.Background.Fill.ForeColor.RGB = (Bgr 'FEF3C7')
  $s.SlideShowTransition.Hidden = $msoTrue

  $deck.SaveAs((Join-Path $OutDir 'slides.pptx'), 24)

  $slides = @()
  foreach ($slide in $deck.Slides) {
    $shapes = @()
    foreach ($shape in $slide.Shapes) { $shapes += Measure-Shape $shape }
    $slides += [ordered]@{
      index      = $slide.SlideIndex
      layout     = $slide.CustomLayout.Name
      hidden     = ($slide.SlideShowTransition.Hidden -eq $msoTrue)
      background = (Rgb $slide.Background.Fill.ForeColor.RGB)
      shapes     = $shapes
    }
    $slide.Export((Join-Path $OutDir ('slide{0}.png' -f $slide.SlideIndex)), 'PNG', 1280, 720)
  }
  # what PowerPoint itself measures for each word, so line breaking can be
  # tested without any browser font rasteriser (never saved into the deck)
  $probeSlide = $deck.Slides.AddSlide($deck.Slides.Count + 1, $layouts.Item(7))
  $probe = $probeSlide.Shapes.AddTextbox(1, 0, 0, 2000, 200)
  $probe.TextFrame.WordWrap = $msoFalse
  $probe.TextFrame.AutoSize = 0
  $probe.TextFrame.MarginLeft = 0
  $probe.TextFrame.MarginRight = 0
  $metrics = New-Object 'System.Collections.Generic.Dictionary[string,object]' ([StringComparer]::Ordinal)
  function Measure-Probe($text, $p) {
    $range = $probe.TextFrame.TextRange
    $range.Text = $text
    $range.Font.Name = $p.font
    $range.Font.Size = $p.size
    $range.Font.Bold = $(if ($p.bold) { $msoTrue } else { $msoFalse })
    $range.Font.Italic = $(if ($p.italic) { $msoTrue } else { $msoFalse })
    return $range
  }
  function Add-Words($text) {
    if (-not $text) { return }
    foreach ($p in $text.paragraphs) {
      $style = '{0}|{1}|{2}|{3}' -f $p.font, $p.size, [int]$p.bold, [int]$p.italic
      if (-not $metrics.ContainsKey($style)) {
        $aa = (Measure-Probe 'nn' $p).BoundWidth
        $spaced = (Measure-Probe 'n n' $p).BoundWidth
        $one = Measure-Probe 'n' $p
        $height = $one.BoundHeight
        # BoundWidth carries a fixed allowance per measured range
        $metrics[$style] = [ordered]@{ overhead = (2 * $one.BoundWidth - $aa); space = ($spaced - $aa); height = $height; words = (New-Object 'System.Collections.Generic.Dictionary[string,double]' ([StringComparer]::Ordinal)) }
      }
      foreach ($word in ($p.text -split ' ')) {
        if ($word -and -not $metrics[$style].words.ContainsKey($word)) {
          $metrics[$style].words[$word] = (Measure-Probe $word $p).BoundWidth
        }
      }
    }
  }
  foreach ($slide in $slides) {
    foreach ($shape in $slide.shapes) {
      Add-Words $shape.text
      foreach ($item in $shape.items) { Add-Words $item.text }
    }
  }
  $report = [ordered]@{
    version     = $app.Version
    build       = $app.Build
    slideWidth  = $deck.PageSetup.SlideWidth
    slideHeight = $deck.PageSetup.SlideHeight
    slides      = $slides
    metrics     = $metrics
  }
  $json = $report | ConvertTo-Json -Depth 12
  [IO.File]::WriteAllText((Join-Path $OutDir 'slides.powerpoint.json'), $json, (New-Object Text.UTF8Encoding $false))
}
finally {
  $deck.Close()
  if ($wasOpen -eq 0) { $app.Quit() }
}
Write-Output 'captured'
