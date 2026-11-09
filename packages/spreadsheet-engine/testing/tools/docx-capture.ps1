# Builds the Word golden corpus: Word itself creates and saves the document,
# then reports every line's page and position. Runs a private Word instance and
# changes none of its options.
#
#   powershell -File docx-capture.ps1 -OutDir <folder>
#
# Writes <OutDir>\document.docx, <OutDir>\document.word.json and one PNG per
# page (<OutDir>\page<N>.png, for looking at, not for committing).
param([Parameter(Mandatory = $true)][string]$OutDir)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

$wdHorizontal = 5
$wdVertical = 6
$wdPage = 3

$filler = 'The quick brown fox jumps over the lazy dog while the committee reviews the quarterly figures and prepares a detailed summary for every regional office before the end of the reporting period, so that nobody has to guess what changed. '

$picture = Join-Path $OutDir 'picture.png'
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 240, 120
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 32, 96, 160))
$graphics.Dispose()
$bitmap.Save($picture, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.ScreenUpdating = $false
try {
  $doc = $word.Documents.Add()
  function S($id) { $v = [int]$id; return $doc.Styles.Item([ref]$v) }
  $normal = S -1
  $normal.Font.Name = 'Calibri'
  $normal.Font.Size = 11
  $h1 = S -2; $h1.Font.Name = 'Calibri Light'; $h1.Font.Size = 16
  $h2 = S -3; $h2.Font.Name = 'Calibri Light'; $h2.Font.Size = 13
  $sel = $word.Selection

  function Set-Style($id) {
    [void][System.__ComObject].InvokeMember('Style', [Reflection.BindingFlags]::SetProperty, $null, $sel, @([int]$id))
  }
  function Para($text, $style) {
    Set-Style $style
    $sel.TypeText($text)
    $sel.TypeParagraph()
  }
  function Reset-Para {
    Set-Style -1
    $sel.ParagraphFormat.Reset()
    $sel.Font.Reset()
  }

  Para 'Annual report' -2
  Para ($filler * 2) -1
  Para 'Character formatting' -3
  Reset-Para
  $sel.TypeText('Plain text, ')
  $sel.Font.Bold = 1; $sel.TypeText('bold text, '); $sel.Font.Bold = 0
  $sel.Font.Italic = 1; $sel.TypeText('italic text, '); $sel.Font.Italic = 0
  $sel.Font.Underline = 1; $sel.TypeText('underlined, '); $sel.Font.Underline = 0
  $sel.Font.Color = 0x2030C0; $sel.TypeText('coloured, '); $sel.Font.Color = -16777216
  $sel.Font.Size = 16; $sel.TypeText('larger '); $sel.Font.Size = 11
  $sel.TypeText('and a line that keeps going long enough to wrap around the right margin of this page.')
  $sel.TypeParagraph()

  Para 'Paragraph formatting' -3
  Reset-Para
  $sel.ParagraphFormat.Alignment = 1; $sel.TypeText('A centred paragraph.'); $sel.TypeParagraph()
  $sel.ParagraphFormat.Alignment = 2; $sel.TypeText('A right aligned paragraph.'); $sel.TypeParagraph()
  $sel.ParagraphFormat.Alignment = 3; $sel.TypeText($filler + $filler); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.LeftIndent = 36; $sel.ParagraphFormat.RightIndent = 36; $sel.ParagraphFormat.FirstLineIndent = 18
  $sel.TypeText($filler); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.LeftIndent = 36; $sel.ParagraphFormat.FirstLineIndent = -18
  $sel.TypeText($filler); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.SpaceBefore = 18; $sel.ParagraphFormat.SpaceAfter = 12
  $sel.TypeText('Spaced paragraph.'); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.LineSpacingRule = 4; $sel.ParagraphFormat.LineSpacing = 22
  $sel.TypeText($filler); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.LineSpacingRule = 1
  $sel.TypeText($filler); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.TabStops.ClearAll() | Out-Null
  [void]$sel.ParagraphFormat.TabStops.Add(144, [ref]0, [ref]0)
  [void]$sel.ParagraphFormat.TabStops.Add(288, [ref]2, [ref]0)
  $sel.TypeText("Name`tRole`tAmount"); $sel.TypeParagraph()
  Reset-Para

  Para 'Lists' -3
  Reset-Para
  $sel.Range.ListFormat.ApplyBulletDefault()
  $sel.TypeText('First bullet'); $sel.TypeParagraph()
  $sel.Range.ListFormat.ListIndent()
  $sel.TypeText('Nested bullet'); $sel.TypeParagraph()
  $sel.Range.ListFormat.ListOutdent()
  $sel.TypeText('Second bullet ' + $filler); $sel.TypeParagraph()
  $sel.Range.ListFormat.RemoveNumbers()
  $sel.Range.ListFormat.ApplyNumberDefault()
  $sel.TypeText('First item'); $sel.TypeParagraph()
  $sel.TypeText('Second item'); $sel.TypeParagraph()
  $sel.TypeText('Third item'); $sel.TypeParagraph()
  $sel.Range.ListFormat.RemoveNumbers()
  Reset-Para

  Para 'A table' -3
  Reset-Para
  $table = $doc.Tables.Add($sel.Range, 4, 3)
  $table.Borders.Enable = 1
  $table.Rows.Item(1).Shading.BackgroundPatternColor = 0x844F1F
  $table.Rows.Item(1).Range.Font.Bold = 1
  $table.Rows.Item(1).Range.Font.Color = 0xFFFFFF
  $values = @(
    @('Region', 'Sales', 'Change'),
    @('North', '120', 'A cell with enough text in it to wrap onto another line inside the column'),
    @('South', '95', '-3'),
    @('West', '77', '+1')
  )
  for ($r = 1; $r -le 4; $r++) {
    for ($c = 1; $c -le 3; $c++) { $table.Cell($r, $c).Range.Text = $values[$r - 1][$c - 1] }
  }
  $sel.EndKey([ref]6) | Out-Null
  Reset-Para
  $sel.TypeText('After the table.'); $sel.TypeParagraph()

  Para 'Pictures and links' -3
  Reset-Para
  [void]$sel.InlineShapes.AddPicture($picture, [ref]$false, [ref]$true)
  $sel.TypeParagraph()
  [void]$doc.Hyperlinks.Add($sel.Range, 'https://example.com/report', '', '', 'A hyperlink to the report')
  $sel.EndKey([ref]6) | Out-Null
  $sel.TypeParagraph()
  $sel.TypeText('A sentence with a footnote')
  [void]$doc.Footnotes.Add($sel.Range, [Type]::Missing, 'The footnote text at the bottom of this page.')
  $sel.EndKey([ref]6) | Out-Null
  $sel.TypeText(' and more text after it.')
  $sel.TypeParagraph()

  Para 'A floating picture' -3
  Reset-Para
  $sel.TypeText($filler + $filler + $filler); $sel.TypeParagraph()
  $anchor = $doc.Paragraphs.Item($doc.Paragraphs.Count - 1).Range
  $float = $doc.Shapes.AddPicture($picture, $false, $true, 300, 0, 120, 60, $anchor)
  $float.WrapFormat.Type = 0
  $float.RelativeHorizontalPosition = 2
  $float.RelativeVerticalPosition = 2
  $float.Left = 300
  $float.Top = 0

  Para 'Keeping lines together' -3
  Reset-Para
  $sel.ParagraphFormat.KeepWithNext = -1
  $sel.TypeText('This line stays with the next paragraph.'); $sel.TypeParagraph()
  $sel.ParagraphFormat.KeepWithNext = 0
  $sel.ParagraphFormat.KeepTogether = -1
  $sel.TypeText($filler * 4); $sel.TypeParagraph()
  Reset-Para
  $sel.ParagraphFormat.PageBreakBefore = -1
  $sel.TypeText('This paragraph starts a new page.'); $sel.TypeParagraph()
  Reset-Para
  for ($i = 0; $i -lt 8; $i++) { $sel.TypeText($filler * 3); $sel.TypeParagraph() }

  $section = $doc.Sections.Item(1)
  $section.Headers.Item(1).Range.Text = 'Report header'
  $footer = $section.Footers.Item(1).Range
  $footer.Text = 'Page '
  $footer.Collapse(0)
  [void]$doc.Fields.Add($footer, 33)
  $section.Footers.Item(1).Range.ParagraphFormat.Alignment = 2

  $doc.Repaginate()
  $docx = Join-Path $OutDir 'document.docx'; [void][System.__ComObject].InvokeMember('SaveAs2', [Reflection.BindingFlags]::InvokeMethod, $null, $doc, @([string]$docx, [int]16))

  $lines = New-Object System.Collections.ArrayList
  $content = $doc.Content
  $current = $null
  for ($i = $content.Start; $i -lt $content.End; $i++) {
    $r = $doc.Range($i, $i + 1)
    $ch = $r.Text
    if ($null -eq $ch) { continue }
    $code = [int][char]$ch[0]
    if ($code -lt 32 -and $code -ne 9) { $current = $null; continue }
    $page = [int]$r.Information($wdPage)
    $y = [double]$r.Information($wdVertical)
    $x = [double]$r.Information($wdHorizontal)
    if ($null -eq $current -or $current.page -ne $page -or [math]::Abs($current.y - $y) -gt 0.5 -or $x -lt $current.lastX - 1) {
      $current = [pscustomobject]@{ page = $page; y = $y; x = $x; lastX = $x; text = '' }
      [void]$lines.Add($current)
    }
    $current.text += $ch
    $current.lastX = $x
  }

  $paragraphs = New-Object System.Collections.ArrayList
  foreach ($p in $doc.Paragraphs) {
    $font = $p.Range.Font
    [void]$paragraphs.Add([ordered]@{
      text   = $p.Range.Text.TrimEnd("`r", [char]7)
      style  = [string]$p.Style.NameLocal
      font   = [string]$font.Name
      size   = [double]$font.Size
      bold   = [int]$font.Bold
      italic = [int]$font.Italic
      align  = [int]$p.Alignment
      left   = [double]$p.LeftIndent
      right  = [double]$p.RightIndent
      first  = [double]$p.FirstLineIndent
      before = [double]$p.SpaceBefore
      after  = [double]$p.SpaceAfter
      rule   = [int]$p.LineSpacingRule
      line   = [double]$p.LineSpacing
      list   = [string]$p.Range.ListFormat.ListString
      page   = [int]$p.Range.Information($wdPage)
    })
  }

  $setup = $doc.PageSetup
  $report = [ordered]@{
    version   = [string]$word.Version
    pages     = [int]$doc.ComputeStatistics(2)
    pageWidth = [double]$setup.PageWidth
    pageHeight = [double]$setup.PageHeight
    margins   = [ordered]@{ top = [double]$setup.TopMargin; bottom = [double]$setup.BottomMargin; left = [double]$setup.LeftMargin; right = [double]$setup.RightMargin; header = [double]$setup.HeaderDistance; footer = [double]$setup.FooterDistance }
    lines     = $lines
    paragraphs = $paragraphs
  }
  [IO.File]::WriteAllText((Join-Path $OutDir 'document.word.json'), ($report | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))

  # what Word measures for each word, so line breaking can be tested without
  # any browser font rasteriser
  $probeDoc = $word.Documents.Add()
  $metrics = New-Object 'System.Collections.Generic.Dictionary[string,object]' ([StringComparer]::Ordinal)
  $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)
  $runs = New-Object System.Collections.ArrayList
  # Word's own word list splits punctuation off: glue it back to get the
  # space-separated tokens a line breaker works with
  $token = ''; $style = ''
  foreach ($w in $doc.Words) {
    $raw = $w.Text
    if ($null -eq $raw) { continue }
    $t = $raw.Trim()
    if ($t -ne '' -and [int][char]$t[0] -ge 32) {
      if ($token -eq '') { $style = '{0}|{1}|{2}|{3}' -f $w.Font.Name, $w.Font.Size, [int]($w.Font.Bold -ne 0), [int]($w.Font.Italic -ne 0) }
      $token += $t
    }
    if ($raw -ne $t -or $t -eq '' -or [int][char]$raw[$raw.Length - 1] -lt 32) {
      if ($token -ne '' -and $token.Length -le 40 -and $style -notmatch '9999999') {
        $key = $style + '|' + $token
        if ($seen.Add($key)) { [void]$runs.Add($key) }
      }
      $token = ''
    }
  }
  $pr = $probeDoc.Content
  foreach ($key in $runs) {
    $parts = $key.Split('|')
    $style = ($parts[0..3] -join '|')
    $wordText = ($parts[4..($parts.Length - 1)] -join '|')
    if (-not $metrics.ContainsKey($style)) {
      $pr.Text = "nn n`rn"
      $pr.Font.Name = $parts[0]; $pr.Font.Size = [single]$parts[1]; $pr.Font.Bold = [int]$parts[2]; $pr.Font.Italic = [int]$parts[3]
      $x0 = $probeDoc.Range(0, 0).Information($wdHorizontal)
      $x1 = $probeDoc.Range(2, 2).Information($wdHorizontal)
      $x2 = $probeDoc.Range(3, 3).Information($wdHorizontal)
      $y1 = $probeDoc.Range(0, 0).Information($wdVertical)
      $y2 = $probeDoc.Range(5, 5).Information($wdVertical)
      $metrics[$style] = [ordered]@{ space = ($x2 - $x1); line = ($y2 - $y1); words = (New-Object 'System.Collections.Generic.Dictionary[string,double]' ([StringComparer]::Ordinal)) }
    }
    $pr.Text = $wordText + ' x'
    $pr.Font.Name = $parts[0]; $pr.Font.Size = [single]$parts[1]; $pr.Font.Bold = [int]$parts[2]; $pr.Font.Italic = [int]$parts[3]
    $start = $probeDoc.Range(0, 0).Information($wdHorizontal)
    $end = $probeDoc.Range($wordText.Length, $wordText.Length).Information($wdHorizontal)
    $metrics[$style].words[$wordText] = $end - $start
  }
  $probeDoc.Close([ref]0)
  [IO.File]::WriteAllText((Join-Path $OutDir 'document.metrics.json'), ($metrics | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding $false))

  # page pictures, for looking at
  $doc.ActiveWindow.View.Type = 3
  $pane = $doc.ActiveWindow.ActivePane
  for ($n = 1; $n -le $pane.Pages.Count; $n++) {
    $bytes = $pane.Pages.Item($n).EnhMetaFileBits
    $stream = New-Object IO.MemoryStream(, [byte[]]$bytes)
    $meta = [System.Drawing.Image]::FromStream($stream)
    $out = New-Object System.Drawing.Bitmap 816, 1056
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($meta, 0, 0, 816, 1056)
    $g.Dispose()
    $out.Save((Join-Path $OutDir ('page{0}.png' -f $n)), [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose(); $meta.Dispose(); $stream.Dispose()
  }
  $doc.Close([ref]0)
}
catch { Write-Output ('LINE ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.Exception.Message); throw }
finally { $word.Quit([ref]0) }
Write-Output 'captured'
