$ErrorActionPreference = 'Stop'
$repositoryDirectory = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$runtimeFiles = @(
  @{ Source = Join-Path $repositoryDirectory 'public\pathfinder1e_standalone.html'; Name = 'index.html' },
  @{ Source = Join-Path $repositoryDirectory 'public\chirpy.ico'; Name = 'chirpy.ico' },
  @{ Source = Join-Path $repositoryDirectory 'installer\Start-PF1MW.ps1'; Name = 'Start-PF1MW.ps1' }
)
$assetDirectory = Join-Path $repositoryDirectory 'public\character-sheet-icons'
$outputDirectory = Join-Path $repositoryDirectory 'dist'
$archivePath = Join-Path $outputDirectory 'pf1mw-runtime.zip'
$checksumPath = "$archivePath.sha256"
$stageDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
  'pf1mw-package-' + [Guid]::NewGuid().ToString('N')
)

foreach ($file in $runtimeFiles) {
  if (-not (Test-Path -LiteralPath $file.Source -PathType Leaf)) {
    throw "Required runtime file is missing: $($file.Source)"
  }
}
if (-not (Test-Path -LiteralPath $assetDirectory -PathType Container) -or
    -not (Get-ChildItem -LiteralPath $assetDirectory -Recurse -File -Filter '*.png')) {
  throw "Required character sheet image assets are missing: $assetDirectory"
}
$expectedNames = @(
  'Start-PF1MW.ps1',
  'chirpy.ico',
  'index.html'
) + @(
  Get-ChildItem -LiteralPath $assetDirectory -Recurse -File -Filter '*.png' |
    ForEach-Object {
      'character-sheet-icons/' + $_.FullName.Substring($assetDirectory.Length + 1).Replace('\', '/')
    }
)
$expectedNames = @($expectedNames | Sort-Object)

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $stageDirectory | Out-Null
try {
  foreach ($file in $runtimeFiles) {
    Copy-Item -LiteralPath $file.Source -Destination (Join-Path $stageDirectory $file.Name)
  }
  Copy-Item -LiteralPath $assetDirectory -Destination $stageDirectory -Recurse

  Compress-Archive `
    -Path (Join-Path $stageDirectory '*') `
    -DestinationPath $archivePath `
    -CompressionLevel Optimal `
    -Force

  $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  [System.IO.File]::WriteAllText(
    $checksumPath,
    "$hash  pf1mw-runtime.zip`n",
    [System.Text.Encoding]::ASCII
  )
} finally {
  Remove-Item -LiteralPath $stageDirectory -Recurse -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $names = @(
    $archive.Entries |
      ForEach-Object { $_.FullName.Replace('\', '/') } |
      Sort-Object
  )
  if (($names -join "`n") -ne ($expectedNames -join "`n")) {
    throw "Runtime ZIP contains unexpected files: $($names -join ', ')"
  }
} finally {
  $archive.Dispose()
}

Get-Item -LiteralPath $archivePath, $checksumPath | Select-Object Name, Length
Write-Output "SHA-256: $hash"
