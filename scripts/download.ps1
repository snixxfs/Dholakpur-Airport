$models = @('a380.glb', 'a359.glb', 'a333.glb', 'a320.glb', 'a321.glb', 'b773.glb', 'b789.glb', 'b738.glb')
if (!(Test-Path "public/models")) {
    New-Item -ItemType Directory -Force -Path "public/models"
}
foreach ($m in $models) {
    $dest = "public/models/$m"
    if (Test-Path $dest) {
        $existing = Get-Item $dest
        if ($existing.Length -gt 50000) {
            Write-Host "[EXISTS] $m ($([math]::Round($existing.Length / 1MB, 2)) MB)"
            continue
        }
    }
    Write-Host "Downloading $m..."
    curl.exe -L -k -s -o $dest "https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/$m"
    if (Test-Path $dest) {
        $sz = (Get-Item $dest).Length
        Write-Host "  -> Finished $m ($([math]::Round($sz / 1MB, 2)) MB)"
    } else {
        Write-Host "  -> FAILED: $m"
    }
}
Write-Host "Done!"
