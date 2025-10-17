$pollCount = 0
while ($true) {
    $pollCount++
    $time = Get-Date -Format "HH:mm:ss"
    Clear-Host
    
    Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  STRATEGIC COORDINATOR - PHASE IV MONITORING" -ForegroundColor Yellow
    Write-Host "  Poll #$pollCount | Time: $time" -ForegroundColor White
    Write-Host "════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    Write-Host "📊 AGENT PRIMUS (Framework):" -ForegroundColor Magenta
    if (Test-Path "src\execution") {
        $files = Get-ChildItem "src\execution" -File
        Write-Host "  Status: ✅ PHASE IV-A COMPLETE ($($files.Count)/4 files)" -ForegroundColor Green
        $files | ForEach-Object { Write-Host "    ✓ $($_.Name)" -ForegroundColor White }
    } else {
        Write-Host "  Status: ⏳ NOT STARTED" -ForegroundColor Yellow
    }
    
    Write-Host "`n📊 AGENT SECUNDUS (Executors):" -ForegroundColor Magenta
    if (Test-Path "src\execution\executors") {
        $execs = Get-ChildItem "src\execution\executors" -File
        $pct = [math]::Round(($execs.Count / 8) * 100)
        if ($execs.Count -ge 8) {
            Write-Host "  Status: ✅ PHASE IV-B COMPLETE - $($execs.Count)/8 executors (100%)" -ForegroundColor Green
        } else {
            Write-Host "  Status: 🔄 IN PROGRESS - $($execs.Count)/8 executors ($pct%)" -ForegroundColor Yellow
        }
        $execs | ForEach-Object { Write-Host "    ✓ $($_.Name)" -ForegroundColor White }
    } else {
        Write-Host "  Status: ⏳ BLOCKED - Waiting for Primus" -ForegroundColor Yellow
    }
    
    Write-Host "`n📊 AGENT TERTIUS (Integration):" -ForegroundColor Magenta
    if (Test-Path "src\magistrates\LegatusLegionum.ts") {
        Write-Host "  Status: ✅ PHASE IV-C COMPLETE" -ForegroundColor Green
        Write-Host "    ✓ LegatusLegionum.ts" -ForegroundColor White
    } else {
        Write-Host "  Status: ⏳ BLOCKED - Waiting for Secundus" -ForegroundColor Yellow
        Write-Host "    → Ready to create LegatusLegionum.ts once Phase IV-B complete" -ForegroundColor Gray
    }
    
    Write-Host "`n$('─' * 52)"
    Write-Host "`n🔨 BUILD STATUS:" -ForegroundColor Magenta
    $buildResult = npm run build 2>&1 | Select-String "created|error"
    if ($buildResult -match "created") {
        Write-Host "  ✅ Build: SUCCESS" -ForegroundColor Green
        $buildResult | ForEach-Object { Write-Host "    $($_.Line)" -ForegroundColor White }
    } else {
        Write-Host "  ⚠️  Build: PENDING or ERRORS" -ForegroundColor Yellow
    }
    
    Write-Host "`n$('─' * 52)"
    
    # Check if Phase IV-B is complete and Tertius should act
    if ((Test-Path "src\execution\executors") -and 
        ((Get-ChildItem "src\execution\executors" -File).Count -ge 8) -and
        -not (Test-Path "src\magistrates\LegatusLegionum.ts")) {
        Write-Host "`n🚨 ALERT: Agent Secundus Phase IV-B COMPLETE!" -ForegroundColor Green
        Write-Host "🎖️  AGENT TERTIUS: YOU ARE UNBLOCKED!" -ForegroundColor Yellow
        Write-Host "    Ready to begin Phase IV-C implementation" -ForegroundColor White
    }
    
    Write-Host "`n⏱️  Next poll in 45 seconds (Ctrl+C to stop)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 45
}
