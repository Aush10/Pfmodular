# Installs the locally built runtime bundle for development and testing.
param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'pf1mw')
)

$ErrorActionPreference = 'Stop'
$installerDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryDirectory = Split-Path -Parent $installerDirectory
$sourceHtml = Join-Path $repositoryDirectory 'public\pathfinder1e_standalone.html'
$sourceIcon = Join-Path $repositoryDirectory 'public\chirpy.ico'
$sourceAssets = Join-Path $repositoryDirectory 'public\character-sheet-icons'
$sourceLauncher = Join-Path $installerDirectory 'Start-PF1MW.ps1'
$desktopDirectory = [Environment]::GetFolderPath('DesktopDirectory')

if (-not $env:LOCALAPPDATA) {
  throw 'LOCALAPPDATA is not available. Run this installer from a signed-in Windows user account.'
}
if (-not (Test-Path -LiteralPath $sourceHtml -PathType Leaf)) {
  throw "The standalone app is missing. Build it first with 'npm run build:standalone': $sourceHtml"
}
if (-not (Test-Path -LiteralPath $sourceIcon -PathType Leaf)) {
  throw "The app icon is missing: $sourceIcon"
}
if (-not (Test-Path -LiteralPath $sourceLauncher -PathType Leaf)) {
  throw "The app launcher is missing: $sourceLauncher"
}
if (-not (Test-Path -LiteralPath $sourceAssets -PathType Container)) {
  throw "The app image assets are missing: $sourceAssets"
}
if ((Get-Item -LiteralPath $sourceHtml).Length -lt 10000) {
  throw "The standalone app file looks incomplete: $sourceHtml"
}

$resolvedInstallDirectory = [System.IO.Path]::GetFullPath($InstallDirectory)
$appFiles = @(
  @{ Source = $sourceHtml; Name = 'index.html' },
  @{ Source = $sourceIcon; Name = 'chirpy.ico' },
  @{ Source = $sourceLauncher; Name = 'Start-PF1MW.ps1' }
)
$appFiles += @(
  Get-ChildItem -LiteralPath $sourceAssets -Recurse -File -Filter '*.png' |
    ForEach-Object {
      @{
        Source = $_.FullName
        Name = $_.FullName.Substring($sourceAssets.Length + 1)
      }
    }
)
$existingFiles = @(
  $appFiles | ForEach-Object {
    $destination = Join-Path $resolvedInstallDirectory $_.Name
    if (Test-Path -LiteralPath $destination -PathType Leaf) { $_.Name }
  }
)
$backupDirectory = $null

if ($existingFiles.Count -gt 0) {
  $backupDirectory = Join-Path $env:LOCALAPPDATA (
    'pf1mw-installer-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss')
  )
  New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
  foreach ($existingFile in $existingFiles) {
    $backupPath = Join-Path $backupDirectory $existingFile
    New-Item -ItemType Directory -Path (Split-Path -Parent $backupPath) -Force | Out-Null
    Copy-Item `
      -LiteralPath (Join-Path $resolvedInstallDirectory $existingFile) `
      -Destination $backupPath
  }
}

$stagingDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
  'pf1mw-install-' + [Guid]::NewGuid().ToString('N')
)
New-Item -ItemType Directory -Path $stagingDirectory | Out-Null
try {
  foreach ($file in $appFiles) {
    $stagedPath = Join-Path $stagingDirectory $file.Name
    New-Item -ItemType Directory -Path (Split-Path -Parent $stagedPath) -Force | Out-Null
    Copy-Item -LiteralPath $file.Source -Destination $stagedPath
  }

  New-Item -ItemType Directory -Path $resolvedInstallDirectory -Force | Out-Null
  foreach ($file in $appFiles) {
    $destinationPath = Join-Path $resolvedInstallDirectory $file.Name
    New-Item -ItemType Directory -Path (Split-Path -Parent $destinationPath) -Force | Out-Null
    Copy-Item `
      -LiteralPath (Join-Path $stagingDirectory $file.Name) `
      -Destination $destinationPath `
      -Force
  }
} finally {
  Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
}

if (-not (Test-Path -LiteralPath $desktopDirectory -PathType Container)) {
  throw "The Windows desktop folder was not found: $desktopDirectory"
}

$shortcutPath = Join-Path $desktopDirectory 'Pathfinder 1e Modular Workspace.lnk'
$launcherPath = Join-Path $resolvedInstallDirectory 'Start-PF1MW.ps1'
$powershellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shell = New-Object -ComObject WScript.Shell
try {
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $powershellPath
  $shortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcherPath`""
  $shortcut.WorkingDirectory = $resolvedInstallDirectory
  $shortcut.Description = 'Open Pathfinder 1e Modular Workspace'
  $shortcut.IconLocation = "$(Join-Path $resolvedInstallDirectory 'chirpy.ico'),0"
  $shortcut.Save()
} finally {
  [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shell)
}

Write-Output "Installed app files to: $resolvedInstallDirectory"
Write-Output "Desktop shortcut created: $shortcutPath"
if ($backupDirectory) {
  Write-Output "Previous app files backed up to: $backupDirectory"
}
