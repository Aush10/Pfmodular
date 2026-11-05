<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1242983d-8995-4160-b617-d71f5a92e476

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Release the Windows mini-browser app

Push a version tag to publish a public GitHub Release:

```powershell
git tag -a v1.0.0 -m "PF1MW v1.0.0"
git push origin v1.0.0
```

GitHub Actions type-checks and builds the app, then attaches a runtime-only ZIP
and SHA-256 checksum to the release. The ZIP contains the standalone app,
launcher, app icon, and the character-sheet glyph and portrait images.

Friends need only download `installer/Install-PF1MW.ps1` from the repository and
run it in PowerShell:

```powershell
curl.exe -L -o Install-PF1MW.ps1 https://raw.githubusercontent.com/Aush10/pathfinder-sheet/main/installer/Install-PF1MW.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-PF1MW.ps1
```

The downloader fetches the latest stable release from GitHub, validates the
checksum and archive contents, then installs the runtime files into
`%LOCALAPPDATA%\pf1mw` and creates a desktop shortcut. The app serves on loopback
only (`127.0.0.1`) and opens in an Edge or Chrome app window. Node.js is not
required on their computers. The execution-policy option applies only to that
PowerShell process; it does not change the user's machine-wide policy.

To package and test locally, run `npm run dist:runtime`, then test the bootstrapper with
`.\installer\Install-PF1MW.ps1 -PackagePath .\dist\pf1mw-runtime.zip`.
`Install-PF1MW-Local.ps1` remains available for installing directly from a
source checkout. Updates back up replaced app files outside the install folder
and leave unrelated files alone.
