# Run the project inside WSL — do NOT use Windows Node on \\wsl.localhost paths.
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Starting project in WSL (Ubuntu)..." -ForegroundColor Cyan
Write-Host "Do not run npm from PowerShell on \\wsl.localhost paths." -ForegroundColor Yellow
Write-Host ""

wsl -d Ubuntu-22.04 -- bash -lc "cd /home/rayhan/order-inventory-solution && chmod +x scripts/*.sh && npm run setup"

Write-Host ""
Write-Host "If the window closed, read logs in the project folder:" -ForegroundColor Yellow
Write-Host "  setup.log" -ForegroundColor White
Write-Host "  dev-server.log" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to close"
