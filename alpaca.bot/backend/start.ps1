# start.ps1
$ErrorActionPreference = "Stop"

# Always run from the script's directory (project root)
Set-Location -Path $PSScriptRoot

# Start FastAPI (Uvicorn)
python -m uvicorn app.main:app --port 8001 --reload
