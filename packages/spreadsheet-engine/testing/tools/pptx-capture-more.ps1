param([Parameter(Mandatory = $true)][string]$OutDir)
$ErrorActionPreference = 'Stop'
$msoTrue = -1; $msoFalse = 0
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$app = New-Object -ComObject PowerPoint.Application
$wasOpen = $app.Presentations.Count
$deck = $app.Presentations.Add($msoTrue)
try { $deck.Windows.Item(1).WindowState = 2 } catch {}
try {
  $deck.PageSetup.SlideWidth = 960; $deck.PageSetup.SlideHeight = 540
  $deck.SlideMaster.Theme.ThemeFontScheme.MinorFont.Item(1).Name = 'Calibri'
  $deck.SlideMaster.Theme.ThemeFontScheme.MajorFont.Item(1).Name = 'Calibri Light'
  $layouts = $deck.SlideMaster.CustomLayouts
  # msoAutoShapeType => expected drawingml name
  $gallery = [ordered]@{
    92='star4'; 93='star5'; 94='star8'; 61='flowChartProcess'; 62='flowChartAlternateProcess'; 63='flowChartDecision'; 64='flowChartInputOutput'; 65='flowChartPredefinedProcess'; 69='flowChartTerminator'; 70='flowChartPreparation'; 72='flowChartManualOperation'; 73='flowChartConnector'; 74='flowChartOffpageConnector';
    151='round1Rect'; 152='round2SameRect'; 153='round2DiagRect'; 155='snip1Rect'; 156='snip2SameRect'; 157='snip2DiagRect'; 158='frame'; 18='donut'; 162='corner'; 141='diagStripe'; 28='plaque'; 13='can'; 14='cube'; 16='foldedCorner';
    37='leftRightArrow'; 38='upDownArrow'; 50='notchedRightArrow'; 105='wedgeRectCallout'; 106='wedgeRoundRectCallout'; 29='leftBracket'; 30='rightBracket';
    10='hexagon'; 6='octagon'; 51='homePlate'; 52='chevron'; 11='plus'; 33='rightArrow'; 7='triangle'; 2='parallelogram'; 3='trapezoid'; 12='pentagon'
  }
  $s = $deck.Slides.AddSlide(1, $layouts.Item(7))
  $cells = @(); $col = 0; $row = 0
  foreach ($e in $gallery.GetEnumerator()) {
    $k = $e.Key
    $x = 16 + $col * 104; $y = 12 + $row * 88
    $sh = $s.Shapes.AddShape([int]$k, $x, $y, 90, 70)
    $sh.Fill.ForeColor.RGB = 0xB07020; $sh.Line.ForeColor.RGB = 0; $sh.Line.Weight = 1
    $sh.Name = $e.Value
    $cells += [ordered]@{ name = $e.Value; type = [int]$k; x = $x; y = $y }
    $col++; if ($col -ge 9) { $col = 0; $row++ }
  }
  # 2: custom geometry, shadow, pattern, vertical text
  $s = $deck.Slides.AddSlide(2, $layouts.Item(7))
  $fb = $s.Shapes.BuildFreeform(0, 40, 40)
  $fb.AddNodes(0, 0, 200, 60); $fb.AddNodes(1, 1, 240, 120, 180, 200, 120, 180); $fb.AddNodes(0, 0, 40, 40)
  $f = $fb.ConvertToShape(); $f.Name = 'free'; $f.Fill.ForeColor.RGB = 0x3050C0
  $a = $s.Shapes.AddShape(1, 300, 40, 180, 110); $a.Name = 'shadowed'; $a.Line.Visible = $msoFalse
  $a.Fill.ForeColor.RGB = 0x40A040
  $a.Shadow.Visible = $msoTrue; $a.Shadow.OffsetX = 6; $a.Shadow.OffsetY = 6; $a.Shadow.Blur = 8; $a.Shadow.Transparency = 0.5; $a.Shadow.ForeColor.RGB = 0
  $v = $s.Shapes.AddTextbox(1, 540, 40, 60, 200); $v.Name = 'vertical'
  $v.TextFrame.Orientation = 3; $v.TextFrame.TextRange.Text = 'Rotated text'; $v.TextFrame.TextRange.Font.Size = 20
  $v2 = $s.Shapes.AddTextbox(1, 620, 40, 60, 200); $v2.Name = 'vertical270'
  $v2.TextFrame.Orientation = 2; $v2.TextFrame.TextRange.Text = 'Upward text'; $v2.TextFrame.TextRange.Font.Size = 20
  $g = $s.Shapes.AddShape(1, 300, 200, 180, 110); $g.Name = 'gradient'; $g.Fill.TwoColorGradient(1, 1)
  $g.Fill.ForeColor.RGB = 0x2040E0; $g.Fill.BackColor.RGB = 0xE0E040; $g.Line.Visible = $msoFalse
  $p = $s.Shapes.AddShape(1, 40, 240, 200, 110); $p.Name = 'pattern'; $p.Fill.Patterned(21)
  # 3: column chart
  $s = $deck.Slides.AddSlide(3, $layouts.Item(7))
  $c = $s.Shapes.AddChart2(201, 51, 80, 40, 800, 460, $true); $c.Name = 'chart'
  Start-Sleep -Seconds 3
  try { $c.Chart.ChartData.Activate(); $c.Chart.ChartData.Workbook.Close() } catch {}
  # 4: SmartArt
  $s = $deck.Slides.AddSlide(4, $layouts.Item(7))
  $sa = $s.Shapes.AddSmartArt($app.SmartArtLayouts.Item(1), 80, 40, 800, 460); $sa.Name = 'smart'
  $sa.SmartArt.AllNodes.Item(1).TextFrame2.TextRange.Text = 'Plan'
  $sa.SmartArt.AllNodes.Item(2).TextFrame2.TextRange.Text = 'Build'
  $sa.SmartArt.AllNodes.Item(3).TextFrame2.TextRange.Text = 'Ship'

  $deck.SaveAs((Join-Path $OutDir 'more.pptx'), 24)
  foreach ($slide in $deck.Slides) { $slide.Export((Join-Path $OutDir ('more{0}.png' -f $slide.SlideIndex)), 'PNG', 1280, 720) }
  $json = @{ cells = $cells } | ConvertTo-Json -Depth 4
  [IO.File]::WriteAllText((Join-Path $OutDir 'more.json'), $json, (New-Object Text.UTF8Encoding $false))
}
catch { Write-Output ('LINE ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.Exception.Message); throw }
finally { $deck.Close(); if ($wasOpen -eq 0) { $app.Quit() } }
'done'
