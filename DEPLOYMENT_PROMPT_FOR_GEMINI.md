# Deployment Verification & Cloud Deployment Task

## Objective
Verify the entire Modular Factory application is production-ready and deploy it to Google Cloud using the existing Docker-based deployment method.

---

## CRITICAL BUG FIX REQUIRED BEFORE DEPLOYMENT

### Issue: "No plan loaded" error on cloud deployment

The Adjust Plan feature shows "No plan loaded. Run planning first." on cloud deployments because there's no database configured. The backend saves `planId` to PostgreSQL, but cloud deployment doesn't have DATABASE_URL set.

**Root Cause:** `client/src/hooks/usePlanData.ts` line 521 checks `if (!data?.planId)` and fails if the database didn't save.

**Solution:** Modify the frontend to use **ephemeral mode** when `planId` is undefined. The backend already supports this at `/api/v1/plans/ephemeral/adjust`.

### File to modify: `client/src/hooks/usePlanData.ts`

**Find this code (around line 516-548):**
```typescript
const adjustPlan = async (
    updates: { taskId: string; laborHoursRemaining: number }[],
    currentTimeOverride?: string,
    workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string; } }[]
): Promise<AdjustmentResult | null> => {
    if (!data?.planId) {
        setError('No planId. Run Multi-Shift planning first.');
        return null;
    }

    try {
        // ... existing code ...
        const payload = {
            currentTime: currentTimeOverride ? new Date(overrideMs).toISOString() : new Date(effectiveNowMs).toISOString(),
            updates,
            workerUpdates
        };

        const res = await fetch(`${API_BASE_URL}/api/v1/plans/${data.planId}/adjust`, {
```

**Replace with this code:**
```typescript
const adjustPlan = async (
    updates: { taskId: string; laborHoursRemaining: number }[],
    currentTimeOverride?: string,
    workerUpdates?: { workerId: string; availability: { startTime: string; endTime: string; } }[]
): Promise<AdjustmentResult | null> => {
    // Require plan data to exist (but not necessarily a database planId)
    if (!data) {
        setError('No plan data. Run Multi-Shift planning first.');
        return null;
    }

    try {
        const nowMs = Date.now();
        const planWindow = getPlanWindow(data);
        const effectiveNowMs = planWindow
            ? Math.min(Math.max(nowMs, planWindow.startMs), planWindow.endMs)
            : nowMs;
        const overrideMs = currentTimeOverride ? new Date(currentTimeOverride).getTime() : NaN;
        if (currentTimeOverride && isNaN(overrideMs)) {
            setError('Invalid current time. Use a valid ISO timestamp.');
            return null;
        }

        // Determine if we use ephemeral mode (no database) or persistent mode
        const useEphemeral = !data.planId;
        const effectivePlanId = useEphemeral ? 'ephemeral' : data.planId;

        // Build payload - ephemeral mode requires full plan data
        const payload: any = {
            currentTime: currentTimeOverride ? new Date(overrideMs).toISOString() : new Date(effectiveNowMs).toISOString(),
            updates,
            workerUpdates
        };

        if (useEphemeral) {
            // Ephemeral mode: Include full plan data in request
            payload.tasks = data.tasks || [];
            payload.workers = data.workers || [];
            // Extract originalAssignments from rawMultiShift
            payload.originalAssignments = (data.rawMultiShift?.assignments || []).map((a: any) => ({
                workerId: a.workerId,
                taskId: a.taskId,
                startDate: a.startDate || a.startTime,
                endDate: a.endDate || a.endTime,
                isWaitTask: a.isWaitTask
            }));
        }

        const res = await fetch(`${API_BASE_URL}/api/v1/plans/${effectivePlanId}/adjust`, {
```

**Also update the `runMultiShift` function to ensure we always have a fallback planId.** Find line 256-266 and update:
```typescript
const planResponse: PlanResponse = {
    version: json.version || 'multi-shift-file',
    planId: json.planId || 'ephemeral',  // <-- Add fallback
    // ... rest of the fields
};
```

### Also modify: `client/src/components/PlanAdjustmentPanel.tsx`

The panel checks `planId` before submitting. Update to allow ephemeral mode:

**Find (around line 357-360):**
```typescript
if (!planId) {
    setError('No plan loaded. Run planning first.');
    return;
}
```

**Replace with:**
```typescript
// planId can be undefined for ephemeral mode - the hook handles this
// We only need plan data to exist, which is checked in ResultsPage
```

(Or simply remove the check - the `usePlanData` hook now handles the fallback to ephemeral mode)

### Verification Steps:
1. After making changes, run `cd client && npm run build`
2. Start the server locally WITHOUT the database: `npm start`
3. Upload an Excel file and run multi-shift planning
4. Try to adjust a task - it should work using ephemeral mode
5. Check browser console for the API call - URL should be `/api/v1/plans/ephemeral/adjust`

---

## Part 1: Pre-Deployment Verification Checklist

### 1.1 Backend Verification
```bash
# Clean and rebuild
rm -rf dist/
npm run build

# Verify build output exists
ls -la dist/server.js
```
**Expected:** Build completes without errors, `dist/server.js` exists.

### 1.2 Frontend Verification
```bash
cd client
rm -rf dist/
npm run build
cd ..
```
**Expected:** Build completes, `client/dist/index.html` and JS/CSS bundles exist.

### 1.3 Server Startup Test
```bash
# Start server briefly to verify it initializes
npm start &
SERVER_PID=$!
sleep 5

# Test health endpoint
curl -s http://localhost:8080/health

# Test a core endpoint (planning)
curl -s -X POST http://localhost:8080/api/v1/worker-tasks/plan \
  -H "Content-Type: application/json" \
  -d '{"workers":[],"tasks":[],"interval":{"startTime":"2026-01-22T06:00:00Z","endTime":"2026-01-22T14:00:00Z"}}'

# Stop server
kill $SERVER_PID
```
**Expected:** Health returns `{"status":"ok"}`, plan endpoint returns valid response.

### 1.4 Test Suite Validation (Optional but Recommended)
```bash
# If server is running on port 8080:
npx ts-node scripts/run_replan_tests.ts
```
**Expected:** Test runner executes, check pass rate in report.

---

## Part 2: Docker Build Verification

### 2.1 Build Docker Image
```bash
docker build -t modular-factory:latest .
```
**Watch for:**
- `npm ci` succeeds for both backend and frontend
- `npx prisma generate` succeeds
- `npm run build` (backend) succeeds
- `cd client && npm run build` (frontend) succeeds

### 2.2 Test Docker Container Locally
```bash
# Run container
docker run -d -p 8080:8080 --name mf-test modular-factory:latest

# Wait for startup
sleep 10

# Verify health
curl -s http://localhost:8080/health

# Clean up
docker stop mf-test && docker rm mf-test
```
**Expected:** Container runs, health check passes.

---

## Part 3: Google Cloud Deployment

### 3.1 Prerequisites Check
```bash
# Verify gcloud CLI is authenticated
gcloud auth list

# Verify project is set
gcloud config get-value project
```

### 3.2 Deploy to Google App Engine
```bash
# Deploy using app.yaml configuration
gcloud app deploy app.yaml --quiet

# Get the deployed URL
gcloud app browse
```

### 3.3 Post-Deployment Verification
```bash
# Replace YOUR_APP_URL with actual deployed URL
curl -s https://YOUR_APP_URL/health

# Test core planning endpoint
curl -s -X POST https://YOUR_APP_URL/api/v1/worker-tasks/plan \
  -H "Content-Type: application/json" \
  -d '{"workers":[],"tasks":[],"interval":{"startTime":"2026-01-22T06:00:00Z","endTime":"2026-01-22T14:00:00Z"}}'
```

---

## Part 4: Alternative - Cloud Run Deployment (If App Engine fails)

### 4.1 Push to Container Registry
```bash
# Tag for GCR
docker tag modular-factory:latest gcr.io/$(gcloud config get-value project)/modular-factory:latest

# Push
docker push gcr.io/$(gcloud config get-value project)/modular-factory:latest
```

### 4.2 Deploy to Cloud Run
```bash
gcloud run deploy modular-factory \
  --image gcr.io/$(gcloud config get-value project)/modular-factory:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: backend + frontend |
| `app.yaml` | Google App Engine config (Node 20, F1 instance) |
| `.dockerignore` | Excludes node_modules, dist, tests, .env |
| `.gcloudignore` | Excludes similar files for GAE deployment |
| `tsconfig.json` | TypeScript config with proper excludes for legacy files |

---

## Common Issues & Fixes

### Issue: TypeScript build fails
**Check:** `tsconfig.json` has proper excludes for legacy query files
```bash
cat tsconfig.json | grep -A 30 '"exclude"'
```

### Issue: Docker build fails on npm ci
**Check:** `package-lock.json` is in sync
```bash
npm install --legacy-peer-deps
git add package-lock.json
```

### Issue: Server won't start (EADDRINUSE)
**Fix:** Kill existing process
```bash
lsof -ti:8080 | xargs kill -9
```

### Issue: Environment variables missing
**Note:** Firebase env vars are optional for core scheduling. The server will start without them (just logs warnings).

---

## Success Criteria

1. ✅ `npm run build` (backend) - No errors
2. ✅ `cd client && npm run build` (frontend) - No errors
3. ✅ `docker build -t modular-factory:latest .` - Completes successfully
4. ✅ Health endpoint returns `{"status":"ok"}`
5. ✅ Planning endpoint accepts requests and returns valid response
6. ✅ Cloud deployment URL is accessible and responding

---

## Notes

- The app uses **in-memory planning** for the scheduling algorithm - no database required for core functionality
- Prisma is included but optional - used only if persistent storage is configured
- Frontend is served statically from `client/dist/` in production
- Port 8080 is hardcoded for GCP compatibility
