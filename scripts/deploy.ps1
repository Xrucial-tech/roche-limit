# 1. Ask for a commit message (optional)
$commitMsg = Read-Host "Enter commit message (Press Enter for 'Auto-deploy update')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Auto-deploy update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "Starting RocheLimit Deployment..." -ForegroundColor Cyan

# 2. Stage all changes
Write-Host "--> Staging changes..." -ForegroundColor Yellow
git add .

# 3. Commit changes
Write-Host "--> Committing: "$commitMsg"..." -ForegroundColor Yellow
git commit -m $commitMsg

# 4. Push to GitHub Main branch
Write-Host "--> Pushing source code to GitHub..." -ForegroundColor Yellow
git push origin main

# 5. Build and Deploy to GitHub Pages
Write-Host "--> Building and Deploying to GitHub Pages..." -ForegroundColor Magenta
npm run deploy

Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "Your game will be live in ~2 minutes at: https://Xrucial-tech.github.io/roche-limit" -ForegroundColor Gray