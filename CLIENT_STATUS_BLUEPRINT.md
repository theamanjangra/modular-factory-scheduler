# Modular Factory Scheduler - Project Status Blueprint
**Date:** January 11, 2026
**Version:** 2.0 (Multi-Shift Planning)

---

## Executive Summary

The Modular Factory Scheduler is now a fully functional **Manufacturing Execution System (MES)** backend with an interactive web-based UI. The system can intelligently allocate labor across single or multiple shifts, respecting worker preferences, skill constraints, and shift boundaries.

---

## What's Ready to Test Right Now

### 1. Web UI - "Minimalist Planner"

**Access:** Run the application and navigate to the frontend URL

#### Control Panel Features:
| Feature | Description | Status |
|---------|-------------|--------|
| **File Upload** | Upload `.xlsx` files with Workers and Tasks sheets | ✅ Ready |
| **Shift Length Slider** | Adjust single-shift duration (8-16 hours) | ✅ Ready |
| **Multi-Shift Configuration** | Configure Shift 1 and Shift 2 with separate times | ✅ Ready |
| **Production Rate** | Set % efficiency per shift (e.g., 75%, 25%) | ✅ Ready |
| **Dynamic Dates** | Auto-calculates dates based on current time | ✅ Ready |
| **Run Simulation** | Execute single-shift planning | ✅ Ready |
| **Run Multi-Shift** | Execute two-shift planning | ✅ Ready |
| **Export** | Download results as Excel file | ✅ Ready |
| **Export Multi-Shift** | Download multi-shift results with detailed sheets | ✅ Ready |

#### Dynamic Date Logic:
- **Before 7:00 AM:** Shift 1 = Today, Shift 2 = Tomorrow
- **After 7:00 AM:** Shift 1 = Tomorrow, Shift 2 = Day After Tomorrow

This ensures planners always see forward-looking schedules.

---

### 2. Gantt Chart Visualization

The **Strategic Operation View** displays:

| Feature | Description |
|---------|-------------|
| **By Worker View** | See each worker's timeline with task assignments |
| **By Task View** | See each task with all workers assigned to it |
| **Multi-Day Support** | Separate sections for Shift 1 and Shift 2 |
| **IDLE Periods** | Visual indication when workers have no assignment |
| **Time Axis** | Hourly ticks with automatic scaling |
| **Hover Tooltips** | View task details and time range on hover |

---

## Screenshots

### Screenshot 1: Gantt Chart - Task View
![Gantt Chart](Screenshot%202026-01-07%20at%2011.59.53%E2%80%AFAM.png)

**What you're seeing:**
- **Header:** "Strategic Operation View" with v2-god-mode version indicator
- **Timeline:** Horizontal axis showing hours (06:00 to 14:00+)
- **Task Rows:** "Interior Tape / Mud 1st Coat" task displayed
- **Worker Labels:** Shows which workers (w_1, w_3, w_4, w_12, w_14, w_16) are assigned
- **Blue Bars:** Each bar represents a worker's time block on this task

### Screenshot 2: Control Panel (UI Elements)
The control panel at the top includes:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [M] Minimalist Planner v2.0                                            │
│                                                                          │
│  📁 [Choose File]  │  Shift: 10h ═══●═══  │  Multi-Shift Config         │
│                    │                       │  ┌─────────────────────┐    │
│                    │                       │  │ Shift 1: 07:00-13:00│    │
│                    │                       │  │ Rate: 0.75          │    │
│                    │                       │  │ ☑ Use Shift 2       │    │
│                    │                       │  │ Shift 2: 13:00-17:00│    │
│                    │                       │  │ Rate: 0.25          │    │
│                    │                       │  └─────────────────────┘    │
│                                                                          │
│  [▶ Run Simulation] [⬇ Export] [▶ Run Multi-Shift] [⬇ Export Multi]    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Screenshot 3: Multi-Shift Gantt (Two Days)
When running multi-shift, the Gantt displays:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ▌ Shift 1 - Jan 12, 2026                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  07:00    08:00    09:00    10:00    11:00    12:00    13:00            │
│  Worker 1  [████████ Task A ████████][███ Task B ███]                   │
│  Worker 2  [████████ Task A ████████████████████████]                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ▌ Shift 2 - Jan 13, 2026                                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  13:00    14:00    15:00    16:00    17:00                              │
│  Worker 1  [███ Task C ███][░░ IDLE ░░]                                 │
│  Worker 2  [████████ Task B (continued) ████████]                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Visual Design Elements:
- **Blue bars:** Standard task assignments
- **Purple bars:** Critical/QA review tasks
- **Gray dashed bars:** IDLE periods (no work assigned)
- **Indigo headers:** Shift/day separators with gradient background

---

### 3. Excel Export - Multi-Shift Format

The new **Export Multi-Shift** feature generates an Excel file with **8 separate sheets**:

| Sheet Name | Contents |
|------------|----------|
| **Summary** | Overall statistics, shift dates, production rates |
| **Shift 1 Assignments** | All worker-task assignments for Day 1 |
| **Shift 2 Assignments** | All worker-task assignments for Day 2 |
| **Shift 1 Completion** | Task completion % achieved in Shift 1 |
| **Shift 2 Completion** | Task completion % achieved in Shift 2 |
| **Overall Completion** | Combined completion across both shifts |
| **Idle Workers** | Time periods when workers had no tasks |
| **Deficit Tasks** | Tasks that couldn't be completed due to labor shortage |

This allows the client to **verify the shift split worked according to the percentages given** (e.g., 75/25 split).

---

### 4. API Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/worker-tasks/plan` | POST | Plan from JSON payload |
| `/api/v1/worker-tasks/plan-file` | POST | Plan from Excel upload |
| `/api/v1/worker-tasks/plan-file-export` | POST | Plan + export single-shift Excel |
| `/api/v1/worker-tasks/plan-file-multishift` | POST | Multi-shift planning |
| `/api/v1/worker-tasks/plan-file-multishift-shiftids` | POST | Multi-shift with custom shift IDs |
| `/api/v1/worker-tasks/plan-file-multishift-export` | POST | Multi-shift + export Excel |
| `/health` | GET | Health check |

---

## Algorithm Highlights

### Core Planning Features:
1. **Phase-Based Scheduling**
   - Phase 1 (Morning Push): First 4 hours focus on critical path tasks
   - Phase 2 (Afternoon): Balanced flow for remaining tasks

2. **Worker-Task Matching Scores**
   - **Continuity Bonus:** +1000 (keep worker on same task)
   - **Primary Skill:** +100
   - **Secondary Skill:** +50
   - **Switching Penalty:** -500

3. **Anti-Swarm Protection**
   - Prevents too many workers on small tasks
   - Formula: `optimalCrew = ceil(totalHours / 4)` with soft cap of 4 workers

4. **Constraint Respect**
   - Min/Max workers per task
   - Prerequisite task dependencies
   - Shift completion preferences

---

## Test Scenarios for Client

### Scenario 1: Single-Shift Planning
1. Upload an Excel file with Workers and Tasks sheets
2. Set shift length to 10 hours
3. Click "Run Simulation"
4. View Gantt chart in Worker or Task view
5. Click "Export" to download results

### Scenario 2: Multi-Shift Planning (75/25 Split)
1. Upload Excel file
2. Configure:
   - Shift 1: 07:00 - 13:00, Rate: 0.75
   - Shift 2: 13:00 - 17:00, Rate: 0.25
3. Click "Run Multi-Shift"
4. View Gantt chart showing both shifts
5. Click "Export Multi-Shift" and verify:
   - ~75% of work completed in Shift 1
   - ~25% of work completed in Shift 2

### Scenario 3: Different Shift IDs
1. Set Starting Shift ID to your actual shift identifier (e.g., "shift-1")
2. Set Ending Shift ID to second shift identifier (e.g., "shift-2")
3. Run multi-shift planning
4. Verify assignments are tagged with correct shift IDs

---

## What's Coming Next (Phase 2 Roadmap)

### Phase 2: Variable Throughput Engine (Target: Jan 7)
| Component | Status | Description |
|-----------|--------|-------------|
| LaborCalculator Service | ✅ Built | Calculates labor hours from box characteristics |
| Type System | ✅ Built | BoxCharacteristics, LaborRatio, SkillCode types |
| Design Document | ✅ Complete | State machine architecture for box tracking |
| Excel Parser Update | 🔄 Pending | Parse Vederra Labor Optimization format |
| Integration | 🔄 Pending | Wire calculator into planning service |

**Key Phase 2 Feature:**
Instead of static labor hours, the system will calculate hours based on actual box dimensions:
```
laborHours = characteristicValue / ratioPerHour
```
Example: A 70.5 ft box with ratio 7.12 ft/hour = 9.9 labor hours

### Phase 3: Strategic Forecaster (Target: Jan 15)
- Multi-week planning horizon
- Production bottleneck identification
- What-if scenario analysis

---

## Technical Details

### Technology Stack
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Vite + TailwindCSS
- **Database:** PostgreSQL with Prisma ORM (optional)
- **Excel Processing:** xlsx library
- **Visualization:** D3.js for Gantt charts

### How to Run
```bash
# Backend (Port 8080)
npm run dev

# Frontend (Port 5173)
cd client && npm run dev
```

### Input File Format
Excel file should have:
- **Workers Sheet:** workerId, name, availability
- **Tasks Sheet:** taskId, name, minWorkers, maxWorkers, estimatedTotalLaborHours, prerequisiteTaskIds

---

## Known Limitations

1. **No Authentication:** API endpoints are currently open (security review complete, fixes pending)
2. **Single Factory:** System designed for one factory/production line at a time
3. **Browser-Based:** No native mobile app (but responsive design works on tablets)

---

## Contact & Support

For questions about testing or feature requests, please reach out to the development team.

---

*Document generated: January 11, 2026*
