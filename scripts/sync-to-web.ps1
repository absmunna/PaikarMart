# Sync local PaikarMart workspace to PaikarMart-web submodule and push
# ---------------------------------------------------------------------
# This script copies all project files (except git metadata) into the
# PaikarMart-web submodule, commits the changes, and pushes them to the
# remote repository. It avoids creating duplicate folders by using a
# mirror copy (robocopy /MIR) and excludes the submodule itself.

$RootDir = "E:\PaikarMart"
$SubmoduleDir = Join-Path $RootDir "PaikarMart-web"

# 1. Ensure submodule is initialized and up‑to‑date
Write-Host "Updating submodule..."
git -C $RootDir submodule update --init --remote

# 2. Mirror copy all files from root to submodule, excluding git folders
#    and the submodule folder itself to prevent recursion.
Write-Host "Synchronizing files..."
# Exclude the .git folder of the root and the submodule directory
$excludeDirs = @(".git", "PaikarMart-web")
$excludeParams = $excludeDirs | ForEach-Object { "/XD", $_ }
# Exclude .github if you keep CI config only in the root (optional)
$excludeParams += @("/XD", ".github")
# Use robocopy for an efficient mirror copy.
robocopy $RootDir $SubmoduleDir /MIR $excludeParams /XF deployment_guide.md

# 3. Commit and push inside the submodule
Write-Host "Committing changes in submodule..."
git -C $SubmoduleDir add -A
$commitMsg = "Sync from local PaikarMart workspace $(Get-Date -Format o)"
git -C $SubmoduleDir commit -m $commitMsg

Write-Host "Pushing to PaikarMart-web remote..."
git -C $SubmoduleDir push origin main

Write-Host "Sync complete. Your changes are now live after the CI pipeline runs."
