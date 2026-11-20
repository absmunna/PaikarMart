# ------------------------------------------------------------
# run_phase1_migrations.ps1 – Apply Phase 1 Supabase migrations
# ------------------------------------------------------------

# Stop on any error
$ErrorActionPreference = "Stop"

# Ensure we are in the project root where the supabase folder lives
Set-Location "e:\PaikarMart"

Write-Host "Applying Supabase migrations..." -ForegroundColor Green

# Push all pending migrations to Supabase
supabase db push

Write-Host "Migrations applied successfully!" -ForegroundColor Green
