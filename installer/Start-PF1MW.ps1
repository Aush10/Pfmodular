param(
  [switch]$Server
)

$ErrorActionPreference = 'Stop'
$port = 38173
$appDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlPath = Join-Path $appDirectory 'index.html'
$iconPath = Join-Path $appDirectory 'chirpy.ico'
$address = "http://127.0.0.1:$port/"

function Get-PF1MWBrowserPath {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      return $candidate
    }
  }

  foreach ($commandName in @('msedge.exe', 'chrome.exe')) {
    $command = Get-Command $commandName -ErrorAction SilentlyContinue
    if ($command) {
      return $command.Source
    }
  }

  throw 'Microsoft Edge or Google Chrome is required to open the app in its mini-browser window.'
}

function Test-PF1MWHost {
  param([long]$ExpectedLength)

  $request = [System.Net.HttpWebRequest]::Create($address)
  $request.Method = 'HEAD'
  $request.Timeout = 1000
  $request.ReadWriteTimeout = 1000
  try {
    $response = [System.Net.HttpWebResponse]$request.GetResponse()
    try {
      return $response.StatusCode -eq [System.Net.HttpStatusCode]::OK -and
        $response.ContentLength -eq $ExpectedLength
    } finally {
      $response.Dispose()
    }
  } catch [System.Net.WebException] {
    return $false
  }
}

if (-not (Test-Path -LiteralPath $htmlPath -PathType Leaf)) {
  throw "The installed app file is missing: $htmlPath"
}
if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
  throw "The installed app icon is missing: $iconPath"
}

if ($Server) {
  $htmlBytes = [System.IO.File]::ReadAllBytes($htmlPath)
  $iconBytes = [System.IO.File]::ReadAllBytes($iconPath)
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
  $listener.Start()
  try {
    while ($true) {
      $client = $listener.AcceptTcpClient()
      try {
        $client.ReceiveTimeout = 5000
        $stream = $client.GetStream()
        $stream.ReadTimeout = 5000
        $reader = [System.IO.StreamReader]::new(
          $stream,
          [System.Text.Encoding]::ASCII,
          $false,
          1024,
          $true
        )
        $requestLine = $reader.ReadLine()
        while (($header = $reader.ReadLine()) -and $header.Length -gt 0) {}

        $status = '404 Not Found'
        $body = [byte[]]@()
        $contentType = 'text/plain; charset=utf-8'
        $sendBody = $true

        if ($requestLine -match '^(GET|HEAD) /chirpy\.ico(?:\?[^ ]*)? HTTP/1\.[01]$') {
          $status = '200 OK'
          $body = $iconBytes
          $contentType = 'image/x-icon'
          $sendBody = $Matches[1] -eq 'GET'
        } elseif (
          $requestLine -match '^(GET|HEAD) /character-sheet-icons/(01-flat-enamel|02-beveled-token|03-arcane-stamp|04-generic-portraits)/([a-z0-9-]+\.png)(?:\?[^ ]*)? HTTP/1\.[01]$'
        ) {
          $requestMethod = $Matches[1]
          $assetStyle = $Matches[2]
          $assetName = $Matches[3]
          $assetPath = Join-Path `
            (Join-Path $appDirectory 'character-sheet-icons') `
            (Join-Path $assetStyle $assetName)
          if (Test-Path -LiteralPath $assetPath -PathType Leaf) {
            $status = '200 OK'
            $body = [System.IO.File]::ReadAllBytes($assetPath)
            $contentType = 'image/png'
            $sendBody = $requestMethod -eq 'GET'
          } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
          }
        } elseif ($requestLine -match '^(GET|HEAD) /(?:index\.html)?(?:\?[^ ]*)? HTTP/1\.[01]$') {
          $status = '200 OK'
          $body = $htmlBytes
          $contentType = 'text/html; charset=utf-8'
          $sendBody = $Matches[1] -eq 'GET'
        } elseif ($requestLine -match '^HEAD /[^ ]* HTTP/1\.[01]$') {
          $status = '404 Not Found'
          $sendBody = $false
        } else {
          $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
        }

        $headers = @(
          "HTTP/1.1 $status",
          "Content-Type: $contentType",
          "Content-Length: $($body.Length)",
          'Cache-Control: no-store',
          'X-Content-Type-Options: nosniff',
          'Connection: close',
          '',
          ''
        ) -join "`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($sendBody -and $body.Length -gt 0) {
          $stream.Write($body, 0, $body.Length)
        }
        $stream.Flush()
      } catch {
        Write-Warning "Could not serve a local browser request: $($_.Exception.Message)"
      } finally {
        $client.Dispose()
      }
    }
  } finally {
    $listener.Stop()
  }
}

$browserPath = Get-PF1MWBrowserPath
$expectedLength = (Get-Item -LiteralPath $htmlPath).Length

if (-not (Test-PF1MWHost -ExpectedLength $expectedLength)) {
  $powershellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (-not (Test-Path -LiteralPath $powershellPath -PathType Leaf)) {
    throw "Windows PowerShell was not found: $powershellPath"
  }

  $serverArguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Server"
  Start-Process -FilePath $powershellPath -ArgumentList $serverArguments -WindowStyle Hidden

  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (Test-PF1MWHost -ExpectedLength $expectedLength) {
      $ready = $true
      break
    }
  }
  if (-not $ready) {
    throw "The local app server did not start at $address. Port $port may already be in use."
  }
}

Start-Process -FilePath $browserPath -ArgumentList "--app=$address"
