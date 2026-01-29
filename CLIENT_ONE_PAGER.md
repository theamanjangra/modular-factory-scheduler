# Modular Factory Scheduler - Quick Start Guide
**Version 2.0 | January 2026**

---

## What Is This?

An intelligent **Labor Planning System** that automatically assigns workers to tasks across one or two shifts, optimizing for efficiency and skill matching.

---

## 3 Things You Can Do Right Now

### 1. Single-Shift Planning
```
Upload Excel → Set shift hours → Run Simulation → View Gantt → Export
```

### 2. Multi-Shift Planning (NEW)
```
Upload Excel → Configure Shift 1 & 2 times → Set % split (e.g., 75/25) → Run → Export
```

### 3. Export Detailed Reports
- **8-sheet Excel export** with separate tabs for each shift's assignments and completion %

---

## Quick Test Steps

| Step | Action |
|------|--------|
| 1 | Open the web UI |
| 2 | Upload `sample_test_file.xlsx` (included) |
| 3 | Click **"Run Multi-Shift"** |
| 4 | View the Gantt chart (toggle Worker/Task view) |
| 5 | Click **"Export Multi-Shift"** to download results |

---

## Input File Format

Your Excel file needs 2 sheets:

**Workers Sheet:**
| workerId | name |
|----------|------|
| w_1 | John Smith |
| w_2 | Jane Doe |

**Tasks Sheet:**
| taskId | name | minWorkers | maxWorkers | estimatedTotalLaborHours |
|--------|------|------------|------------|--------------------------|
| task_1 | Framing | 2 | 4 | 20 |
| task_2 | Drywall | 1 | 3 | 15 |

---

## Key Features

| Feature | What It Does |
|---------|--------------|
| **Smart Assignment** | Matches workers to tasks based on skills & continuity |
| **Anti-Swarm** | Prevents too many workers on small tasks |
| **Dynamic Dates** | Auto-calculates shift dates based on current time |
| **Shift Split** | Distributes work across shifts by your % (e.g., 75/25) |
| **IDLE Detection** | Shows when workers have no assigned work |

---

## Output: What You Get

### Gantt Chart
- Visual timeline of all assignments
- Toggle between "By Worker" and "By Task" views
- Separate sections for Shift 1 and Shift 2

### Excel Export (8 Sheets)
1. Summary
2. Shift 1 Assignments
3. Shift 2 Assignments
4. Shift 1 Completion %
5. Shift 2 Completion %
6. Overall Completion
7. Idle Workers
8. Deficit Tasks

---

## Coming Soon (Phase 2)

**Variable Throughput Engine** - Labor hours calculated from actual box dimensions instead of static estimates.

---

## Need Help?

Contact the development team for support or feature requests.

---

*One-Pager v1.0 | Generated January 11, 2026*
