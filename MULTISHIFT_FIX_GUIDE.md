# Multi-Shift Fix Guide

## Problem Summary

Your `Multi-shift-resulta.xlsx` file **only contains Shift 1 data**. Shift 2 was never created because the API request was missing required parameters.

---

## Root Cause

### Missing Parameters in API Request

The multi-shift endpoint requires **both** `shift2StartTime` and `shift2EndTime`. Without them:

1. The controller sets `shift2Interval = undefined` (workerTaskController.ts:271)
2. The service skips Shift 2 planning (multiShiftFilePlanningService.ts:50-52)
3. Only Shift 1 gets planned and exported

### Code Location
```typescript
// src/controllers/workerTaskController.ts:255-271
const shift2StartTime = req.body.shift2StartTime;  // ← Was this provided?
const shift2EndTime = req.body.shift2EndTime;      // ← Was this provided?

const requestBody = {
    // ...
    shift2Interval: shift2StartTime && shift2EndTime
        ? { startTime: shift2StartTime, endTime: shift2EndTime }
        : undefined,  // ← If missing, Shift 2 won't be planned
    // ...
};
```

---

## How to Fix

### Option 1: Use the Test Script (Recommended)

I've created two test scripts that properly invoke the multi-shift endpoint:

#### TypeScript Test Script
```bash
cd /Users/deepanshusingh/Desktop/Getting\ the\ One\ Piece/Builds/modular_factory

# Start the server in one terminal
npm run dev

# In another terminal, run the test
npx ts-node scripts/test_multishift.ts
```

**What it does:**
- Sends a properly formatted multi-shift request with all required parameters
- Validates the 75/25 split in the results
- Shows detailed breakdown of Shift 1 vs Shift 2 hours
- Saves results to `multi_shift_test_results.json`

#### Bash Test Script (Alternative)
```bash
cd /Users/deepanshusingh/Desktop/Getting\ the\ One\ Piece/Builds/modular_factory

# Start the server
npm run dev

# Run the test (requires curl and jq)
./scripts/test_multishift_api.sh
```

**Requirements:** `jq` for JSON parsing (install with `brew install jq` on macOS)

---

### Option 2: Manual cURL Request

```bash
curl -X POST http://localhost:8080/api/v1/worker-tasks/plan-file-multishift-shiftids \
  -F 'file=@Worker-Task algo data.xlsx' \
  -F 'startingShiftPct=0.75' \
  -F 'endingShiftPct=0.25' \
  -F 'shift1StartTime=2024-01-01T07:00:00Z' \
  -F 'shift1EndTime=2024-01-01T16:30:00Z' \
  -F 'shift2StartTime=2024-01-02T07:00:00Z' \    # ← CRITICAL: Must be different day
  -F 'shift2EndTime=2024-01-02T16:30:00Z' \      # ← CRITICAL: Must be provided
  -o correct_multishift_results.json
```

**Key Points:**
- `shift2StartTime` must be on a **different calendar day** (Day 2)
- Both shift 2 times are **required**
- The 75/25 split is enforced by `startingShiftPct` and `endingShiftPct`

---

### Option 3: Fix Frontend (If Using UI)

If you're using the web UI, check that the form is sending shift 2 parameters:

**File:** `client/src/hooks/usePlanData.ts:108-128`

Ensure this code is executed:
```typescript
if (options.useShift2 && options.shift2StartTime && options.shift2EndTime) {
    formData.append('shift2StartTime', options.shift2StartTime);
    formData.append('shift2EndTime', options.shift2EndTime);
    if (options.endingShiftPct !== undefined) {
        formData.append('endingShiftPct', String(options.endingShiftPct));
    }
}
```

**Verify:**
- `useShift2: true` is set
- `shift2StartTime` and `shift2EndTime` are populated (not empty strings)
- Shift 2 date is **different** from Shift 1 date

---

## Expected Results After Fix

### 1. Assignments Span Two Days

The Excel file should have assignments on **two different dates**:

| Worker | Task | Start                    | End                      |
|--------|------|--------------------------|--------------------------|
| w_1    | t_5  | 2024-01-01T07:00:00.000Z | 2024-01-01T09:00:00.000Z |
| w_2    | t_7  | 2024-01-01T09:00:00.000Z | 2024-01-01T11:30:00.000Z |
| ...    | ...  | ...                      | ...                      |
| w_1    | t_12 | **2024-01-02**T07:00:00.000Z | **2024-01-02**T08:30:00.000Z |
| w_3    | t_15 | **2024-01-02**T08:30:00.000Z | **2024-01-02**T10:00:00.000Z |

### 2. Hours Split ~75/25

```
Shift 1 Hours: ~169h (75%)
Shift 2 Hours: ~56h  (25%)
Total: ~225h
```

(Exact values depend on task completion and worker availability)

### 3. Incomplete Tasks Continue in Shift 2

Tasks that couldn't finish in Shift 1 should have assignments in Shift 2:

- If "Flooring Install" is only 22% done in Shift 1
- It should have more assignments in Shift 2 to finish the remaining 78%

---

## Troubleshooting

### Issue: "shift2Interval is required" Error

**Cause:** `shift2StartTime` or `shift2EndTime` not provided

**Fix:** Ensure both parameters are in the request

### Issue: Still Only One Shift After Fix

**Possible causes:**

1. **Server not restarted** - Restart with `npm run dev`
2. **Using cached results** - Delete old result files
3. **Wrong endpoint** - Verify using `/plan-file-multishift-shiftids`, not `/plan-file`
4. **Shift 2 dates on same day** - Shift 2 must be on Day 2 (different calendar date)

**Debug steps:**
1. Check server logs for the request parameters
2. Add console.log in `workerTaskController.ts:255-259` to see what's received
3. Run the test script with verbose logging

### Issue: Percentages Don't Match 75/25

**Causes:**

1. **Task completion patterns** - Some tasks complete exactly, leaving uneven splits
2. **Worker availability** - Not all workers can work both shifts
3. **Task dependencies** - Prerequisites force certain ordering

**Acceptable range:**
- Shift 1: 65-85% (±10%)
- Shift 2: 15-35% (±10%)

If outside this range, check:
- Task estimates are reasonable
- No tasks are blocking Shift 2 work
- Workers are available for both shifts

---

## Verification Checklist

Before running, verify:

- [ ] Server is running (`npm run dev`)
- [ ] Input file exists: `Worker-Task algo data.xlsx`
- [ ] `startingShiftPct = 0.75` (75%)
- [ ] `endingShiftPct = 0.25` (25%)
- [ ] `shift1StartTime` provided (e.g., "2024-01-01T07:00:00Z")
- [ ] `shift1EndTime` provided (e.g., "2024-01-01T16:30:00Z")
- [ ] `shift2StartTime` provided (e.g., **"2024-01-02"**T07:00:00Z) ← Different day!
- [ ] `shift2EndTime` provided (e.g., **"2024-01-02"**T16:30:00Z) ← Different day!
- [ ] Using correct endpoint: `/api/v1/worker-tasks/plan-file-multishift-shiftids`

---

## Quick Start

```bash
# 1. Navigate to project
cd /Users/deepanshusingh/Desktop/Getting\ the\ One\ Piece/Builds/modular_factory

# 2. Start server (Terminal 1)
npm run dev

# 3. Run test (Terminal 2)
npx ts-node scripts/test_multishift.ts

# 4. Check results
# Should see "✓ TEST PASSED" with both Shift 1 and Shift 2 data
```

---

## Files Created

1. **DEBUG_MULTISHIFT_ISSUE.md** - Detailed root cause analysis
2. **scripts/test_multishift.ts** - TypeScript test script
3. **scripts/test_multishift_api.sh** - Bash test script
4. **MULTISHIFT_FIX_GUIDE.md** - This file

## Next Steps

1. Run one of the test scripts
2. If test passes, use the same parameters in your actual workflow
3. If test fails, check `DEBUG_MULTISHIFT_ISSUE.md` for debugging steps
4. Once working, update your UI/frontend to send all required parameters
