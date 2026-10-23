<#
  Has Excel open a docs sample built from SpreadsheetML (table-demo.ts,
  sparkline-demo.ts) and save it, so the sample the site offers is
  Excel-written. No Excel option is changed.
  Usage: powershell -File save-demo.ps1 -Source <built.xlsx> -Out <sample.xlsx>
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Out
)
$ErrorActionPreference = 'Stop'
$xl = New-Object -ComObject Excel.Application
try {
  $xl.Visible = $false
  $xl.DisplayAlerts = $false
  $wb = $xl.Workbooks.Open((Resolve-Path $Source).Path)
  $wb.Worksheets.Item(1).Activate()
  $wb.SaveAs([System.IO.Path]::GetFullPath($Out), 51)
  $wb.Close($false)
  Write-Host "saved $Out"
} finally {
  $xl.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
