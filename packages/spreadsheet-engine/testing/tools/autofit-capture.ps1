<#
  Measures Excel's AutoFit: opens the AutoFit corpus workbook (built by
  autofit-sources.ts) read-only, AutoFits every case column of the `Cols…`
  sheets and every case row of the `Rows…` sheets, and records the width or
  height Excel gave each, in pixels at 96 dpi. Copies the workbook it
  measured to the corpus beside the results. No Excel option is changed, and
  the copy Excel worked on is closed unsaved.

  Usage: powershell -File autofit-capture.ps1 -Sources <sources folder> -Corpus <corpus folder>
  Reads <Sources>/autofit.xlsx and <Sources>/autofit.cases.json; writes
  <Corpus>/autofit.xlsx and <Corpus>/autofit.fit.json.
#>
param(
  [Parameter(Mandatory = $true)][string]$Sources,
  [Parameter(Mandatory = $true)][string]$Corpus
)
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$book = Join-Path $Sources 'autofit.xlsx'
$cases = [System.IO.File]::ReadAllText((Join-Path $Sources 'autofit.cases.json')) | ConvertFrom-Json
$xl = New-Object -ComObject Excel.Application
try {
  $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Open($book, 0, $true)
  $result = [ordered]@{ sheets = (New-Object System.Collections.ArrayList) }
  foreach ($ws in $wb.Worksheets) {
    $names = @($cases.($ws.Name))
    $columns = $ws.Name.StartsWith('Cols')
    $list = New-Object System.Collections.ArrayList
    for ($i = 1; $i -le $names.Count; $i++) {
      if ($columns) {
        $column = $ws.Columns.Item($i)
        [void]$column.AutoFit()
        $px = [math]::Round($column.Width * 4 / 3)
      } else {
        $row = $ws.Rows.Item($i)
        [void]$row.AutoFit()
        $px = [math]::Round($row.Height * 4 / 3)
      }
      [void]$list.Add([ordered]@{ name = $names[$i - 1]; px = [int]$px })
    }
    [void]$result.sheets.Add([ordered]@{ name = $ws.Name; cases = $list })
    Write-Host "autofit: $($ws.Name), $($names.Count) cases"
  }
  $wb.Close($false)
  Copy-Item -LiteralPath $book -Destination (Join-Path $Corpus 'autofit.xlsx') -Force
  # one case per line keeps the diff of a re-capture readable
  $lines = foreach ($sheet in $result.sheets) {
    $items = ($sheet.cases | ForEach-Object { '  ' + ($_ | ConvertTo-Json -Compress) }) -join ",`n"
    "{`"name`":`"$($sheet.name)`",`"cases`":[`n$items`n]}"
  }
  [System.IO.File]::WriteAllText((Join-Path $Corpus 'autofit.fit.json'), "{`"sheets`":[`n" + ($lines -join ",`n") + "`n]}`n", $utf8)
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
