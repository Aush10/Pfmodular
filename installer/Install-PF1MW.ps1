param(
  [string]$PackagePath,
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'pf1mw')
)

$ErrorActionPreference = 'Stop'
$repository = 'Aush10/pathfinder-sheet'
$assetName = 'pf1mw-runtime.zip'
$checksumAssetName = "$assetName.sha256"
$desktopDirectory = [Environment]::GetFolderPath('DesktopDirectory')

if (-not $env:LOCALAPPDATA) {
  throw 'LOCALAPPDATA is not available. Run this installer from a signed-in Windows user account.'
}

$resolvedInstallDirectory = [System.IO.Path]::GetFullPath($InstallDirectory)
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
  'pf1mw-download-' + [Guid]::NewGuid().ToString('N')
)
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  if ([string]::IsNullOrWhiteSpace($PackagePath)) {
    $headers = @{
      Accept = 'application/vnd.github+json'
      'User-Agent' = 'PF1MW-Installer'
    }
    $releaseUrl = "https://api.github.com/repos/$repository/releases/latest"
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers $headers
    if ($release.draft -or $release.prerelease) {
      throw 'GitHub did not return a stable published release.'
    }

    $runtimeAsset = @($release.assets | Where-Object { $_.name -eq $assetName })
    $checksumAsset = @($release.assets | Where-Object { $_.name -eq $checksumAssetName })
    if ($runtimeAsset.Count -ne 1 -or $checksumAsset.Count -ne 1) {
      throw "The latest release does not contain exactly one $assetName and $checksumAssetName."
    }
    foreach ($asset in @($runtimeAsset[0], $checksumAsset[0])) {
      $assetUri = [System.Uri]$asset.browser_download_url
      $expectedPathPrefix = "/$repository/releases/download/"
      if (
        $assetUri.Scheme -ne 'https' -or
        $assetUri.Host -ne 'github.com' -or
        -not $assetUri.AbsolutePath.StartsWith($expectedPathPrefix, [StringComparison]::Ordinal)
      ) {
        throw "The release asset URL is not an expected HTTPS GitHub release URL: $($asset.name)"
      }
    }

    $archivePath = Join-Path $temporaryDirectory $assetName
    $checksumPath = Join-Path $temporaryDirectory $checksumAssetName
    Invoke-WebRequest `
      -Uri $runtimeAsset[0].browser_download_url `
      -Headers @{ 'User-Agent' = 'PF1MW-Installer'; Accept = 'application/octet-stream' } `
      -OutFile $archivePath
    Invoke-WebRequest `
      -Uri $checksumAsset[0].browser_download_url `
      -Headers @{ 'User-Agent' = 'PF1MW-Installer'; Accept = 'application/octet-stream' } `
      -OutFile $checksumPath
  } else {
    $archivePath = (Resolve-Path -LiteralPath $PackagePath).Path
    $checksumPath = "$archivePath.sha256"
    if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
      throw "The package checksum file is missing: $checksumPath"
    }
  }

  if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf) -or
      (Get-Item -LiteralPath $archivePath).Length -lt 10000) {
    throw 'The downloaded runtime package is missing or unexpectedly small.'
  }

  $checksumText = (Get-Content -LiteralPath $checksumPath -Raw).Trim()
  if ($checksumText -notmatch '^(?<hash>[A-Fa-f0-9]{64})\s+\*?pf1mw-runtime\.zip$') {
    throw 'The runtime package checksum file has an invalid format.'
  }
  $expectedHash = $Matches.hash.ToUpperInvariant()
  $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
  if ($actualHash -ne $expectedHash) {
    throw 'The runtime package SHA-256 does not match the published checksum.'
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $requiredFiles = @('index.html', 'chirpy.ico', 'Start-PF1MW.ps1')
  $stageDirectory = Join-Path $temporaryDirectory 'runtime'
  New-Item -ItemType Directory -Path $stageDirectory | Out-Null
  $archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    $entries = @($archive.Entries)
    $entryNames = @($entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($entryName in $entryNames) {
      if (
        $entryName -notin $requiredFiles -and
        $entryName -notmatch '^character-sheet-icons/(01-flat-enamel|02-beveled-token|03-arcane-stamp|04-generic-portraits)/[a-z0-9-]+\.png$'
      ) {
        throw "The runtime archive contains an unexpected path: $entryName"
      }
    }
    if (@($entryNames | Sort-Object -Unique).Count -ne $entryNames.Count) {
      throw 'The runtime archive contains duplicate paths.'
    }
    foreach ($fileName in $requiredFiles) {
      $entry = @($entries | Where-Object { $_.FullName -ceq $fileName })
      if ($entry.Count -ne 1 -or $entry[0].Length -le 0) {
        throw "The runtime archive is missing a valid $fileName."
      }
    }
    $assetEntries = @(
      $entries | Where-Object {
        $_.FullName.Replace('\', '/') -match '^character-sheet-icons/(01-flat-enamel|02-beveled-token|03-arcane-stamp|04-generic-portraits)/[a-z0-9-]+\.png$'
      }
    )
    if ($assetEntries.Count -eq 0) {
      throw 'The runtime archive is missing the character sheet image assets.'
    }
    foreach ($entry in $entries) {
      $fileName = $entry.FullName.Replace('\', '/')
      if ($entry.Length -le 0) {
        throw "The runtime archive contains an empty file: $fileName"
      }
      if ($entry.Length -gt 10000000) {
        throw "The runtime file is unexpectedly large: $fileName"
      }
      $destinationPath = Join-Path $stageDirectory ($fileName.Replace('/', '\'))
      $destinationParent = Split-Path -Parent $destinationPath
      New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile(
        $entry,
        $destinationPath,
        $false
      )
    }
  } finally {
    $archive.Dispose()
  }

  if ((Get-Item -LiteralPath (Join-Path $stageDirectory 'index.html')).Length -lt 10000) {
    throw 'The standalone app in the runtime package looks incomplete.'
  }
  if (-not (Test-Path -LiteralPath $desktopDirectory -PathType Container)) {
    throw "The Windows desktop folder was not found: $desktopDirectory"
  }

  $runtimeFiles = @($requiredFiles) + @(
    $assetEntries | ForEach-Object { $_.FullName.Replace('\', '/') }
  )
  $existingFiles = @(
    $runtimeFiles | ForEach-Object {
      $destination = Join-Path $resolvedInstallDirectory ($_.Replace('/', '\'))
      if (Test-Path -LiteralPath $destination -PathType Leaf) { $_ }
    }
  )
  $backupDirectory = $null
  if ($existingFiles.Count -gt 0) {
    $backupDirectory = Join-Path $env:LOCALAPPDATA (
      'pf1mw-installer-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    )
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    foreach ($existingFile in $existingFiles) {
      $backupPath = Join-Path $backupDirectory ($existingFile.Replace('/', '\'))
      New-Item -ItemType Directory -Path (Split-Path -Parent $backupPath) -Force | Out-Null
      Copy-Item `
        -LiteralPath (Join-Path $resolvedInstallDirectory ($existingFile.Replace('/', '\'))) `
        -Destination $backupPath
    }
  }

  New-Item -ItemType Directory -Path $resolvedInstallDirectory -Force | Out-Null
  foreach ($fileName in $runtimeFiles) {
    $relativePath = $fileName.Replace('/', '\')
    $destinationPath = Join-Path $resolvedInstallDirectory $relativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $destinationPath) -Force | Out-Null
    Copy-Item `
      -LiteralPath (Join-Path $stageDirectory $relativePath) `
      -Destination $destinationPath `
      -Force
  }

  $shortcutPath = Join-Path $desktopDirectory 'Pathfinder 1e Modular Workspace.lnk'
  $launcherPath = Join-Path $resolvedInstallDirectory 'Start-PF1MW.ps1'
  $powershellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (-not (Test-Path -LiteralPath $powershellPath -PathType Leaf)) {
    throw "Windows PowerShell was not found: $powershellPath"
  }

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

  if ($release) {
    Write-Output "Installed PF1MW release $($release.tag_name) to: $resolvedInstallDirectory"
  } else {
    Write-Output "Installed local PF1MW package to: $resolvedInstallDirectory"
  }
  Write-Output "Desktop shortcut created: $shortcutPath"
  Write-Output "Verified package SHA-256: $actualHash"
  if ($backupDirectory) {
    Write-Output "Previous app files backed up to: $backupDirectory"
  }
} finally {
  Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
}
