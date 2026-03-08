
# Deploy Script for Modular Factory API
Write-Host "Deploying to Google Cloud Run..." -ForegroundColor Green

# Ensure gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Host "Error: Google Cloud SDK (gcloud) is not installed or not in your PATH." -ForegroundColor Red
  Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
}

# Deploy
gcloud run deploy modular-factory-api `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --env-vars-file .env.yaml

Write-Host "Deployment command finished." -ForegroundColor Green
