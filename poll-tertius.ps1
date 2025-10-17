#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Agent Primus Phase III Polling Script
  Monitors CAMPAIGN_STATUS.md for Agent Tertius magistrate completion
  
.DESCRIPTION
  Polls CAMPAIGN_STATUS.md every 5 seconds for the signal:
  "Agent Tertius ALL MAGISTRATES COMPLETE"
  
  When detected, triggers Phase III integration automatically
#>

param(
  [int]$PollingIntervalSeconds = 5,
  [int]$TimeoutSeconds = 3600  # 1 hour timeout
)

$campaignStatusPath = "c:\Users\dwigh\OneDrive\Documents\Projects\Screeps\screeps\CAMPAIGN_STATUS.md"
$startTime = Get-Date
$magistratesCompleteSignal = "ALL MAGISTRATES COMPLETE"

Write-Host "🔍 Agent Primus Polling System - Waiting for Agent Tertius" -ForegroundColor Cyan
Write-Host "📍 Monitoring: $campaignStatusPath" -ForegroundColor Gray
Write-Host "⏱️  Polling interval: ${PollingIntervalSeconds}s | Timeout: ${TimeoutSeconds}s" -ForegroundColor Gray
Write-Host ""

$pollCount = 0

while ($true) {
  $pollCount++
  $elapsedSeconds = ([datetime]::Now - $startTime).TotalSeconds
  $timeRemaining = $TimeoutSeconds - $elapsedSeconds
  
  # Check timeout
  if ($elapsedSeconds -gt $TimeoutSeconds) {
    Write-Host "❌ TIMEOUT: Agent Tertius did not complete within ${TimeoutSeconds}s" -ForegroundColor Red
    Write-Host "Polling stopped." -ForegroundColor Yellow
    exit 1
  }
  
  # Read and check status
  try {
    $content = Get-Content -Path $campaignStatusPath -Raw -ErrorAction Stop
    
    if ($content -match $magistratesCompleteSignal) {
      Write-Host ""
      Write-Host "✅ SIGNAL DETECTED!" -ForegroundColor Green
      Write-Host "🎯 Agent Tertius: ALL MAGISTRATES COMPLETE" -ForegroundColor Green
      Write-Host "📊 Polling cycles: $pollCount" -ForegroundColor Cyan
      Write-Host "⏱️  Total elapsed: $('{0:N1}' -f $elapsedSeconds)s" -ForegroundColor Cyan
      Write-Host ""
      Write-Host "🚀 PROCEEDING TO AGENT PRIMUS PHASE III INTEGRATION" -ForegroundColor Green
      Write-Host ""
      exit 0
    }
  }
  catch {
    Write-Host "⚠️  Error reading status file: $_" -ForegroundColor Yellow
  }
  
  # Status update every 10 polls
  if ($pollCount % 10 -eq 0) {
    $pollTime = Get-Date -Format "HH:mm:ss"
    Write-Host "🔄 Poll #$pollCount at $pollTime | Elapsed: $('{0:N0}' -f $elapsedSeconds)s / $TimeoutSeconds | Remaining: $('{0:N0}' -f $timeRemaining)s" -ForegroundColor DarkGray
  }
  else {
    Write-Host "." -NoNewline -ForegroundColor DarkGray
  }
  
  # Wait before next poll
  Start-Sleep -Seconds $PollingIntervalSeconds
}
