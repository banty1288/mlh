$ErrorActionPreference = 'Stop'
$repoUrl = 'https://github.com/banty1288/mlh.git'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed. Install Git for Windows, reopen PowerShell, and run this script again.'
}

if (-not (Test-Path '.git')) {
    git init -b main
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the Git repository.' }
}

git branch -M main
if ($LASTEXITCODE -ne 0) { throw 'Could not set the branch to main.' }

$remotes = @(git remote)
if ($remotes -contains 'origin') {
    git remote set-url origin $repoUrl
} else {
    git remote add origin $repoUrl
}
if ($LASTEXITCODE -ne 0) { throw 'Could not configure the GitHub remote.' }

$userName = git config user.name
if (-not $userName) {
    $userName = Read-Host 'Enter your Git commit name'
    if (-not $userName) { throw 'A Git commit name is required.' }
    git config user.name $userName
}
$userEmail = git config user.email
if (-not $userEmail) {
    $userEmail = Read-Host 'Enter your Git commit email'
    if (-not $userEmail) { throw 'A Git commit email is required.' }
    git config user.email $userEmail
}

git add .
if ($LASTEXITCODE -ne 0) { throw 'Could not stage the project files.' }

# Avoid creating an empty commit if the project was already committed.
git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    git commit -m 'Build Solana Sentinel AI wallet intelligence MVP'
    if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
} elseif ($LASTEXITCODE -gt 1) {
    throw 'Could not inspect staged changes.'
} else {
    Write-Host 'No new changes to commit; continuing with push.' -ForegroundColor Yellow
}

Write-Host 'Pushing to https://github.com/banty1288/mlh ...' -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    throw 'Push failed. Authenticate when Git prompts you. If authentication is rejected, run: gh auth login (GitHub CLI) or sign in through Git Credential Manager, then rerun this script.'
}

Write-Host 'Success: Solana Sentinel is pushed to https://github.com/banty1288/mlh' -ForegroundColor Green
