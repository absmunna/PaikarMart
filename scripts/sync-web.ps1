# Sync the PaikarMart-web submodule and install dependencies
# -------------------------------------------------------
# 1. Pull latest changes for the submodule
git -C "e:\PaikarMart" submodule update --remote --merge

# 2. Install frontend dependencies
npm --prefix "e:\PaikarMart\PaikarMart-web\apps\frontend" ci

# 3. Install backend dependencies
npm --prefix "e:\PaikarMart\PaikarMart-web\apps\backend" ci

# 4. (Optional) Run supabase migrations locally
# npx supabase db push   # ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in env

Write-Host "Submodule updated and dependencies installed. Ready for local dev or CI pipeline."