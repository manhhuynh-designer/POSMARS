# PowerShell script to setup WebAR.rocks Training Engine
# This script downloads the necessary files from GitHub to run the training engine locally.

$RepoUrl = "https://github.com/WebAR-rocks/WebAR.rocks.train.git"
$TargetDir = "public/libs/training-engine"
$TempDir = "temp_webar_rocks_clone"

Write-Host "🚀 Setting up WebAR.rocks Training Engine..."

# 1. Clean previous temp
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}

# 2. Clone the repo
Write-Host "📦 Cloning repository..."
git clone --depth 1 $RepoUrl $TempDir

if (-not (Test-Path $TempDir)) {
    Write-Error "❌ Failed to clone repository."
    exit 1
}

# 3. Create target directory
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Force -Path $TargetDir
}

# 4. Copy required folders
$FoldersToCopy = @("src", "libs", "css")

foreach ($Folder in $FoldersToCopy) {
    $SourcePath = Join-Path $TempDir $Folder
    $DestPath = Join-Path $TargetDir $Folder
    
    if (Test-Path $SourcePath) {
        Write-Host "📂 Copying $Folder..."
        Copy-Item -Recurse -Force $SourcePath $DestPath
    } else {
        Write-Warning "⚠️ Folder $Folder not found in repo."
    }
}

# Copy main HTML as reference (optional)
# Copy-Item (Join-Path $TempDir "index.html") (Join-Path $TargetDir "engine.html")

# 5. Cleanup
Remove-Item -Recurse -Force $TempDir

Write-Host "✅ WebAR.rocks Training Engine installed to $TargetDir"
Write-Host "👉 You can now use the internal loader to run training."
