<#
  Measures the heights Excel gives rows: opens the row corpus workbook (built
  by rows-sources.ts) read-only, reads every case row's height as Excel shows
  it on open, and whether it is hidden, then AutoFits each shown case row and
  reads it again, in pixels at 96 dpi; and each sheet's standard height.
  Copies the workbook it measured to the corpus beside the results. No Excel
  option is changed, and the copy Excel worked on is closed unsaved.

  Usage: powershell -File rows-capture.ps1 -Sources <sources folder> -Corpus <corpus folder>
  Reads <Sources>/rows.xlsx and <Sources>/rows.cases.json; writes
  <Corpus>/rows.xlsx and <Corpus>/rows.heights.json.
#>
param(
  [Parameter(Mandatory = $true)][string]$Sources,
  [Parameter(Mandatory = $true)][string]$Corpus
)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$book = Join-Path $Sources 'rows.xlsx'
$cases = [System.IO.File]::ReadAllText((Join-Path $Sources 'rows.cases.json')) | ConvertFrom-Json
$xl = New-Object -ComObject Excel.Application
try {
  $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Open($book, 0, $true)
  $result = New-Object System.Collections.ArrayList
  foreach ($ws in $wb.Worksheets) {
    $names = @($cases.($ws.Name))
    $list = New-Object System.Collections.ArrayList
    # every row as it opens first: an AutoFit must not have moved the others
    for ($i = 1; $i -le $names.Count; $i++) {
      $row = $ws.Rows.Item($i)
      [void]$list.Add([ordered]@{
          name    = $names[$i - 1]
          open    = [int][math]::Round($row.Height * 4 / 3)
          hidden  = [bool]$row.Hidden
          autofit = $null
        })
    }
    for ($i = 1; $i -le $names.Count; $i++) {
      if ($list[$i - 1].hidden) { continue }
      $row = $ws.Rows.Item($i)
      [void]$row.AutoFit()
      $list[$i - 1].autofit = [int][math]::Round($row.Height * 4 / 3)
    }
    [void]$result.Add([ordered]@{
        name     = $ws.Name
        standard = [int][math]::Round($ws.StandardHeight * 4 / 3)
        cases    = $list
      })
    Write-Host "rows: $($ws.Name), $($names.Count) cases"
  }
  $wb.Close($false)
  Copy-Item -LiteralPath $book -Destination (Join-Path $Corpus 'rows.xlsx') -Force
  # one case per line keeps the diff of a re-capture readable
  $lines = foreach ($sheet in $result) {
    $items = ($sheet.cases | ForEach-Object { '  ' + ($_ | ConvertTo-Json -Compress) }) -join ",`n"
    "{`"name`":`"$($sheet.name)`",`"standard`":$($sheet.standard),`"cases`":[`n$items`n]}"
  }
  [System.IO.File]::WriteAllText((Join-Path $Corpus 'rows.heights.json'), "{`"sheets`":[`n" + ($lines -join ",`n") + "`n]}`n", $utf8)
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
