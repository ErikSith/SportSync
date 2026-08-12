# SportSync - spusti Next.js dev server + Cloudflare quick tunnel.
# Pouzitie: npm run dev:share
# Ctrl+C ukonci tunnel aj dev server.

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Port = if ($env:PORT) { [int]$env:PORT } else { 3000 }

Set-Location $Root

function Test-PortOpen([int]$p) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $p)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Wait-ForPort([int]$p, [int]$TimeoutSec = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen $p) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Stop-DevOnPort([int]$p) {
    try {
        $lines = netstat -ano | Select-String ":$p\s"
        $procIds = $lines | ForEach-Object {
            ($_ -split '\s+')[-1]
        } | Where-Object { $_ -match '^\d+$' -and $_ -ne '0' } | Select-Object -Unique
        foreach ($procId in $procIds) {
            Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # ignore
    }
}

function Get-LanIPv4 {
    try {
        $addr = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.PrefixOrigin -ne 'WellKnown'
            } |
            Select-Object -First 1 -ExpandProperty IPAddress
        return $addr
    } catch {
        return $null
    }
}

Write-Host ""
Write-Host "  SportSync dev + Cloudflare tunnel" -ForegroundColor Cyan
Write-Host "  --------------------------------" -ForegroundColor DarkGray
Write-Host ""

if (Test-PortOpen $Port) {
    Write-Host "Port $Port je obsadeny - uvolnujem..." -ForegroundColor Yellow
    Stop-DevOnPort $Port
    Start-Sleep -Seconds 2
}

Write-Host "Spustam dev server (npm run dev)..." -ForegroundColor Cyan
$devProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory $Root `
    -PassThru `
    -WindowStyle Minimized

Write-Host "Cakam na http://localhost:$Port ..." -ForegroundColor DarkGray
if (-not (Wait-ForPort $Port)) {
    Write-Host ""
    Write-Host "Dev server sa nespustil do 90 s. Skontroluj okno npm run dev." -ForegroundColor Red
    if (-not $devProc.HasExited) {
        Stop-Process -Id $devProc.Id -Force -ErrorAction SilentlyContinue
    }
    Stop-DevOnPort $Port
    exit 1
}

$lanIp = Get-LanIPv4
Write-Host "Dev server bezi." -ForegroundColor Green
Write-Host ""
if ($lanIp) {
    Write-Host "PWA na ploche (stabilne cez Wi-Fi, rovnaka siet):" -ForegroundColor Yellow
    Write-Host "  http://${lanIp}:${Port}/beta" -ForegroundColor White
    Write-Host "  Pridaj na plochu z tejto URL - ikona funguje aj bez tunelu." -ForegroundColor DarkGray
    Write-Host ""
}
Write-Host "Cloudflare tunnel (telefon aj mimo Wi-Fi):" -ForegroundColor Cyan
Write-Host "  URL uvidis nizsie (trycloudflare.com) - meni sa pri kazdom spusteni!" -ForegroundColor DarkGray
Write-Host "  Ak mas staru ikonu na ploche, zmaz ju a pridaj znova z novej URL." -ForegroundColor DarkGray
Write-Host "Ukoncenie: Ctrl+C" -ForegroundColor DarkGray
Write-Host ""

try {
    npx --yes cloudflared tunnel --url "http://localhost:$Port"
} finally {
    Write-Host ""
    Write-Host "Zastavujem dev server..." -ForegroundColor Yellow
    if (-not $devProc.HasExited) {
        Stop-Process -Id $devProc.Id -Force -ErrorAction SilentlyContinue
    }
    Stop-DevOnPort $Port
    Write-Host "Hotovo." -ForegroundColor Green
}
