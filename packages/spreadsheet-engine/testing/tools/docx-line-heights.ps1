# What single line spacing is in Word, per font and size: the distance between
# two lines of one paragraph. Prints font|size|height.
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Add()
  $r = $doc.Content
  $r.Text = "n$([char]11)n"
  $r.ParagraphFormat.LineSpacingRule = 0
  $r.ParagraphFormat.SpaceAfter = 0
  $r.ParagraphFormat.SpaceBefore = 0
  $fonts = 'Calibri', 'Calibri Light', 'Cambria', 'Arial', 'Times New Roman', 'Segoe UI', 'Verdana', 'Tahoma', 'Georgia', 'Courier New', 'Trebuchet MS', 'Consolas', 'Garamond', 'Book Antiqua', 'Palatino Linotype', 'Century Gothic', 'Candara', 'Constantia', 'Corbel', 'Impact'
  [single[]]$sizes = 8, 9, 10, 10.5, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72
  foreach ($font in $fonts) {
    foreach ($size in $sizes) {
      $r.Font.Name = $font
      $r.Font.Size = [single]$size
      $a = [double]$doc.Range(0, 0).Information(6)
      $b = [double]$doc.Range(2, 2).Information(6)
      '{0}|{1}|{2}' -f $font, $size, [math]::Round($b - $a, 3)
    }
  }
  $doc.Close([ref]0)
}
catch { 'LINE ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.Exception.Message }
finally { $word.Quit([ref]0) }
