# Schedule Adjustment Testing Plan

This document outlines the manual verification steps for the new "Stable Replan Logic" feature (KAN-405).

## Prerequisites

1. Ensure the backend is running (`npm run dev`).
2. Ensure the frontend is running (`npm run dev` in `client/`).
3. Have a sample Excel file ready (e.g., `Input_Data.xlsx` or `Test_Data.xlsx`).

## Test Scenario 1: Basic Plan Adjustment (Extension)

**Goal:** Verify that increasing a task's duration shifts subsequent tasks without reassigning workers unnecessarily.

1. **Load Plan:** Upload an Excel file and click "Run Planning".
2. **Select Task:** In the "Adjust Plan" panel (yellow box below options), select a task ID from the dropdown (e.g., `Task-101`).
3. **Modify Hours:** Note the current hours (e.g., 2.0). Change "New Hours" to `4.0` (Extension).
4. **Apply:** Click "Apply Adjustment".
5. **Verify UI:**
    * Verify an alert appears listing the "Impacted Task" as `EXTENDED`.
    * Verify the Gantt chart updates:
        * The target task bar should be longer.
        * Subsequent tasks for the *same worker* should shift right.
        * Dependent tasks (if any) should shift right.
    * Verify "Stable Replan": The worker assigned to `Task-101` should ideally remain the same (unless capacity forced a switch, which the penalty logic discourages).

## Test Scenario 2: task Early Completion (Reduction)

**Goal:** Verify that reducing a task's duration pulls subsequent tasks forward.

1. **Refsh/Reset:** Reload the page or re-run the plan to reset state.
2. **Select Task:** Select the same task (`Task-101`).
3. **Modify Hours:** Change "New Hours" to `1.0` (Reduction from 2.0).
4. **Apply:** Click "Apply Adjustment".
5. **Verify UI:**
    * Verify alert says `SHORTENED`.
    * Verify Gantt chart: Task bar shrinks. Subsequent tasks shift left (start earlier).

## Test Scenario 3: Verify Persistence / Backend Call

**Goal:** Ensure the adjustment is calculated by the server, not just locally.

1. **Check Network:** Open Browser Developer Tools (F12) -> Network Tab.
2. **Apply Adjustment:** Perform an adjustment (e.g., extend a task).
3. **Inspect Request:**
    * Look for a POST request to `/api/v1/plans/ephemeral/adjust`.
    * Verify Payload contains `currentTime`, `updates`, `tasks`, `workers`, and `originalAssignments`.
4. **Inspect Response:**
    * Verify response contains `updatedWorkerTasks`, `impactedTasks`.
    * Verify `impactedTasks` has the correct `status`.

## Test Scenario 4: Stability (Penalty Test)

**Goal:** Verify that the "Reassignment Penalty" prevents unnecessary worker swaps.

1. **Scenario:** Find a sequence where Worker A does Task X then Task Y.
2. **Adjust:** Extend Task X slightly (e.g., +0.5h).
3. **Expectation:** Worker A should still be assigned to Task X and Task Y (shifted), rather than Task Y being snatched by Worker B immediately, unless Worker B is vastly more optimal/available.
4. **Verification:** Check that `workerId` remains consistent for the adjusted task in the Gantt chart tooltip or raw data inspector.

## Troubleshooting

* **500 Internal Server Error:** Check server console logs. Ensure `tasks` and `workers` are being sent in the payload.
* **No Visual Change:** Check if the shift amount was too small to be visible (less than 15 mins might be hard to see). Check if the task was already completed before `currentTime` (adjustments only affect future/remaining work).
