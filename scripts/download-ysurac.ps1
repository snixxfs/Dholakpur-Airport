$targets = @(
  @{ url='https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a350/glTF2/A350.glb'; dest='public/models/a359.glb' },
  @{ url='https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b788/glTF2/B788.glb'; dest='public/models/b789.glb' },
  @{ url='https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a333/glTF2/A333.glb'; dest='public/models/a333.glb' },
  @{ url='https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b767/glTF2/B767.glb'; dest='public/models/b773.glb' }
)
foreach ($t in $targets) {
  $d = $t.dest
  Write-Host "Downloading $d..."
  curl.exe -L -k -s -o $d $t.url
  $sz = (Get-Item $d).Length
  Write-Host "  -> Finished $d ($sz bytes)"
}
Write-Host "Done!"
