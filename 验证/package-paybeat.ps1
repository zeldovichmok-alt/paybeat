$ErrorActionPreference = 'Stop'
$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packageName = 'PayBeat-按秒计费工具与原文档.zip'
$manifestName = 'SHA256SUMS.txt'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$packageFiles = @(
    Get-ChildItem -LiteralPath $packageRoot -File | Where-Object { $_.Extension -in '.html', '.js', '.md', '.cmd' }
    Get-Item -LiteralPath (Join-Path $packageRoot '.nojekyll')
    foreach ($folder in @('按秒计费工具', '原文档', 'docs', '预览图', '验证', '桌面桌宠')) {
        Get-ChildItem -LiteralPath (Join-Path $packageRoot $folder) -Recurse -File
    }
) | Sort-Object FullName
$manifestLines = foreach ($file in $packageFiles) {
    $relative = [System.IO.Path]::GetRelativePath($packageRoot, $file.FullName).Replace('\', '/')
    '{0}  {1}' -f (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash, $relative
}
[System.IO.File]::WriteAllLines((Join-Path $packageRoot $manifestName), [string[]]$manifestLines, $utf8)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$temporaryPackage = Join-Path $packageRoot ($packageName + '.tmp')
$stream = [System.IO.File]::Open($temporaryPackage, [System.IO.FileMode]::Create)
$zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false, $utf8)
try {
    foreach ($file in @($packageFiles) + @(Get-Item -LiteralPath (Join-Path $packageRoot $manifestName))) {
        $relative = [System.IO.Path]::GetRelativePath($packageRoot, $file.FullName).Replace('\', '/')
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Move-Item -LiteralPath $temporaryPackage -Destination (Join-Path $packageRoot $packageName) -Force
$archive = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $packageRoot $packageName))
try {
    foreach ($entry in $archive.Entries) {
        $entryStream = $entry.Open()
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try { $actual = [System.BitConverter]::ToString($sha.ComputeHash($entryStream)).Replace('-', '') }
        finally { $entryStream.Dispose(); $sha.Dispose() }
        $expected = (Get-FileHash -LiteralPath (Join-Path $packageRoot $entry.FullName) -Algorithm SHA256).Hash
        if ($actual -ne $expected) { throw "Package mismatch: $($entry.FullName)" }
    }
    Write-Output "Verified $($archive.Entries.Count) archive entries."
} finally { $archive.Dispose() }
Get-FileHash -LiteralPath (Join-Path $packageRoot $packageName) -Algorithm SHA256
