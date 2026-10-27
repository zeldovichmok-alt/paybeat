$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeRoot = Join-Path $projectRoot '本地桌宠'
$launcher = Join-Path $projectRoot '打开 PayBeat.exe'
$destination = Join-Path $projectRoot 'PayBeat-桌面桌宠-Windows.zip'
if (!(Test-Path -LiteralPath $launcher) -or !(Test-Path -LiteralPath (Join-Path $runtimeRoot 'PayBeat.exe'))) { throw 'Run build-local.ps1 first.' }
# Only built runtime/application files are included. User data lives outside this tree.
$files = @(Get-Item -LiteralPath $launcher) + @(Get-ChildItem -LiteralPath $runtimeRoot -Recurse -File)
if ($files.FullName -match '[\\/](Local Storage|Session Storage|Cache|Cookies|pet-window\.json)([\\/]|$)') { throw 'Unexpected personal data in application directory.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$temporary = $destination + '.tmp'
$stream = [System.IO.File]::Open($temporary, [System.IO.FileMode]::Create)
$zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false, [System.Text.UTF8Encoding]::new($false))
try {
    foreach ($file in $files) {
        $relative = [System.IO.Path]::GetRelativePath($projectRoot, $file.FullName).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Move-Item -LiteralPath $temporary -Destination $destination -Force
$archive = [System.IO.Compression.ZipFile]::OpenRead($destination)
try {
    foreach ($entry in $archive.Entries) {
        $source = Join-Path $projectRoot $entry.FullName
        $inputStream = $entry.Open()
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try { $actual = [System.BitConverter]::ToString($sha.ComputeHash($inputStream)).Replace('-', '') }
        finally { $inputStream.Dispose(); $sha.Dispose() }
        if ($actual -ne (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash) { throw "Archive mismatch: $($entry.FullName)" }
    }
    Write-Output "Verified $($archive.Entries.Count) portable application files."
} finally { $archive.Dispose() }
Get-Item -LiteralPath $destination | Select-Object FullName, Length
