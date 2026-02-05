# ☁️ Vederra Scheduler Deployment Guide

This guide explains how to update your live application (`vederra-scheduler.web.app`) from your local VS Code.

**Live URL:** [https://vederra-scheduler.web.app](https://vederra-scheduler.web.app)

---

## 🚀 How to Update

Changes made on your laptop **do not** go live automatically. You must deploy them.

### 1. Update the Frontend (Visuals / React)
If you changed `.tsx` files, CSS, or client logic:

1.  **Build** (Local):
    ```powershell
    cmd /c "set VITE_API_URL=https://vederra-backend-299018577273.us-central1.run.app && npm run build --prefix client"
    ```
2.  **Deploy** (Push to Google):
    ```powershell
    cmd /c "firebase deploy --only hosting"
    ```

### 2. Update the Backend (API / Logic)
If you changed `src/routes`, `src/services`, `prisma/schema.prisma` or other `ts` files in the root:

1.  **Deploy** (Build & Push):
    ```powershell
    cmd /c "gcloud run deploy vederra-backend --image gcr.io/vederra-scheduler/vederra-backend --source ."
    ```
    *(Note: You just need `--source .` usually, `gcloud` handles the build unless it fails, then use the longer build command)*

    **Better Command (Re-build + Deploy):**
    ```powershell
    cmd /c "gcloud builds submit --tag gcr.io/vederra-scheduler/vederra-backend . && gcloud run deploy vederra-backend --image gcr.io/vederra-scheduler/vederra-backend"
    ```

### 3. Update the Database (Data Connect)
If you changed `schema.gql`:

1.  **Deploy Schema:**
    ```powershell
    cmd /c "firebase deploy --only dataconnect"
    ```
    *(Remember to clean `dataconnect-generated` if you hit the permission error again)*

---

## 🛠️ Configuration Reference

### Backend (Cloud Run)
- **Service Name:** `vederra-backend`
- **Region:** `us-central1`
- **Database:** Connects via Unix Socket to `vederra-scheduler-2-instance`
- **Env Vars:** `DATABASE_URL` (Set via `gcloud run services update`)

### Frontend (Firebase Hosting)
- **Hosting Target:** `vederra-scheduler`
- **API URL:** `https://vederra-backend-299018577273.us-central1.run.app` (Injected into `.env` at build time)
