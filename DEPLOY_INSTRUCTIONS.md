
# ☁️ How to Run Vederra Scheduler on Google Cloud

This application is configured to run as a **single service** (Node.js + React). The Node.js backend serves the React frontend static files.

## 1. Get the Code
In your Google Cloud Shell (or VM):
```bash
git pull origin main
```

## 2. Install & Build
Run this single command to install dependencies and build both the Backend and Frontend:
```bash
npm install && npm run gcp-build
```
*(This command installs root deps, generates Prisma client, installs client deps, and builds the React app)*

## 3. Configure Environment
You need to set up the environment variables.
1. Copy the example file:
   ```bash
   cp client/.env.example client/.env
   ```
2. Edit `client/.env` and add your **Firebase Config** (from Firebase Console > Project Settings):
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=vederra-scheduler
   ...
   ```
3. (Optional) Create a root `.env` for backend secrets if needed (e.g. Database URL, though Data Connect handles the main data now).

## 4. Run the App
Start the server in production mode:
```bash
npm start
```
* The server will start on port `3000` (or `$PORT`).
* Access the app by clicking **"Web Preview"** in Cloud Shell, or going to your VM's IP on port 3000.

## 5. Verify
* The React App should load.
* The "Shift", "Department" dropdowns should be fetching data directly from Firebase Data Connect!
