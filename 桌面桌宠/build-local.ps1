$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeRoot = Join-Path $projectRoot '.desktop-runtime'
$outputRoot = Join-Path $projectRoot '本地桌宠'
$archivePath = Join-Path $runtimeRoot 'electron-win32-x64.zip'
$version = '45.0.0'
$archiveName = "electron-v$version-win32-x64.zip"
New-Item -ItemType Directory -Path $runtimeRoot,$outputRoot -Force | Out-Null
if (!(Test-Path -LiteralPath $archivePath)) {
    Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/$archiveName" -OutFile $archivePath
}
$checksumFile = Join-Path $runtimeRoot 'SHASUMS256.txt'
if (!(Test-Path -LiteralPath $checksumFile)) { Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/SHASUMS256.txt" -OutFile $checksumFile }
$checksumLine = Get-Content -LiteralPath $checksumFile | Where-Object { $_ -match [regex]::Escape($archiveName) } | Select-Object -First 1
$expected = (($checksumLine -split '\s+')[0]).TrimStart('*').ToUpperInvariant()
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $expected) { throw 'Electron download checksum mismatch.' }
if (!(Test-Path -LiteralPath (Join-Path $outputRoot 'PayBeat.exe'))) {
    Expand-Archive -LiteralPath $archivePath -DestinationPath $outputRoot -Force
    Move-Item -LiteralPath (Join-Path $outputRoot 'electron.exe') -Destination (Join-Path $outputRoot 'PayBeat.exe') -Force
}
$appRoot = Join-Path $outputRoot 'resources/app'
$desktopRoot = Join-Path $appRoot 'desktop'
New-Item -ItemType Directory -Path $desktopRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'index.html') -Destination (Join-Path $appRoot 'index.html')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'package.json') -Destination (Join-Path $appRoot 'package.json')
foreach ($file in @('main.cjs','preload.cjs','pet.html','pet.css','pet.js','journey.js','version.cjs','updates.cjs')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $desktopRoot $file) }
$assetRoot = Join-Path $desktopRoot 'assets'
New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'assets') -File | Copy-Item -Destination $assetRoot -Force
# These two previous review atlases are never loaded by the application.
foreach ($obsolete in @('motion-c-previous.png','motion-c-v2.png')) {
    $obsoletePath = Join-Path $assetRoot $obsolete
    if (Test-Path -LiteralPath $obsoletePath) { Remove-Item -LiteralPath $obsoletePath }
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'README.md') -Destination (Join-Path $outputRoot '使用说明.md')
$launcher = Join-Path $projectRoot '打开 PayBeat.exe'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $compiler /nologo /target:winexe /reference:System.Windows.Forms.dll "/out:$launcher" (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'Unable to compile desktop launcher.' }
$shortcutShell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in @((Join-Path $projectRoot 'PayBeat 桌宠.lnk'), (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'PayBeat.lnk'))) {
    $shortcut = $shortcutShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $launcher
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = '打开 PayBeat 工资工具和桌面伙伴'
    $shortcut.IconLocation = (Join-Path $outputRoot 'PayBeat.exe') + ',0'
    $shortcut.Save()
}
Write-Output "Built local Windows desktop app: $outputRoot\PayBeat.exe"
