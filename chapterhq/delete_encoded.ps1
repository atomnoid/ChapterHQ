$target = "C:\Users\atomn\Documents\ChapterHQ\ChapterHQ\chapterhq\src\app\api\members\%5Bid%5D"
if (Test-Path $target) {
    [System.IO.Directory]::Delete($target, $true)
    Write-Host "Deleted: $target"
} else {
    Write-Host "Not found: $target"
}
