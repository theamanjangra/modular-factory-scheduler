# Vederra Database Schema - Complete Analysis

## Overview

This document provides a comprehensive map of the Vederra Manufacturing Execution System (MES) database schema based on the `Vederra data model.xlsx` file.

The system is designed for **modular home manufacturing** with features for:
- Production tracking (travelers, tasks, inspections)
- Worker management (scheduling, skills, time tracking)
- Quality assurance (lead/QAM inspections)
- Project management
- Warranty claims

---

## Entity Relationship Diagram (Text)

```
                                    ┌─────────────────┐
                                    │     PROJECT     │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
    ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
    │  MODULE PROFILE │           │ PROJECT_CONTACT │           │ WARRANTY_CLAIM  │
    └────────┬────────┘           └─────────────────┘           └─────────────────┘
             │
             ▼
    ┌─────────────────┐
    │     MODULE      │◄─────────────────┐
    └────────┬────────┘                  │
             │                           │
             ▼                           │
    ┌─────────────────┐         ┌────────┴────────┐
    │    TRAVELER     │◄────────│TRAVELER TEMPLATE│
    └────────┬────────┘         └────────┬────────┘
             │                           │
    ┌────────┼────────┐                  │
    │        │        │                  │
    ▼        ▼        ▼                  ▼
┌──────┐ ┌──────┐ ┌──────────┐   ┌─────────────┐
│ TASK │ │ NOTE │ │INSPECTION│   │TASK TEMPLATE│
└──┬───┘ └──────┘ │   ITEM   │   └──────┬──────┘
   │              └──────────┘          │
   │                                    │
   ▼                                    ▼
┌─────────────┐                  ┌─────────────┐
│ WORKER_TASK │◄─────────────────│   STATION   │
└─────────────┘                  └─────────────┘
       │
       ▼
┌─────────────┐
│   WORKER    │
└─────────────┘
```

---

## Tables by Domain

### 1. PRODUCTION TRACKING (Core Manufacturing Flow)

#### TRAVELER TEMPLATE
*Blueprint for creating travelers (work orders)*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| name | string | 32 | Template name |

#### TRAVELER
*A work order that follows a module through production*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| traveler_template_id | foreign key | | Links to template |
| module_id | foreign key | | The module being built |
| is_shipped | bool | | Completion status |
| sibling | foreign key (optional) | | For linked travelers |
| serial_number | string | | Unique identifier |

#### MODULE
*A modular home unit being manufactured*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| traveler_id | foreign key (optional) | | Current traveler |
| traveler_template_id | foreign key | | Template used |
| module_profile_id | foreign key | | Configuration profile |
| serial_number | string | 16 | Unique ID |
| order | int | | Production sequence |

#### MODULE PROFILE
*Configuration template for modules*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| project_id | foreign key | 16 | Parent project |
| name | string | 64 | Profile name |

#### MODULE CHARACTERISTIC
*Physical attributes of a module profile*

| Column | Type | Notes |
|--------|------|-------|
| module_profile_id | foreign key | Parent profile |
| characteristic_type | string(enum) | ModuleCharacteristicType enum |
| value | double | Measurement value |

#### TRAVELER_STATION
*Tracks a traveler's progress through stations*

| Column | Type | Notes |
|--------|------|-------|
| traveler_id | foreign key | |
| station_id | foreign key | |
| lead_inspection_progress | double | 0-1 progress |
| qam_inspection_progress | double | 0-1 progress |
| task_progress | double | 0-1 progress |
| is_current | bool | Currently at this station |

---

### 2. TASK MANAGEMENT

#### TASK TEMPLATE
*Blueprint for tasks at each station*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| station_id | foreign key | | Where task occurs |
| department_id | foreign key | | Responsible department |
| lead_type | string(enum) | | LeadType enum |
| name | string | 128 | Task name |
| description | string | 256 | Details |
| order | int | | Sequence |
| is_photo_required | bool | | Photo documentation |
| is_video_required | bool | | Video documentation |
| min_workers | int | | Minimum crew size |
| max_workers | int | | Maximum crew size |
| ranked_skills | [string(enum)] | | Skill enum array |
| module_characteristic_type | string(enum) (optional) | | For labor scaling |
| prerequisite_task_template | foreign key | | Dependency |
| **task_type** | **string(enum)** | | **TaskType: default, subassembly, nonWorker** |
| **non_worker_task_duration** | **double** | | **Hours for non-worker tasks** |
| **subassembly_task_schedule_type** | **string(enum)** | | **SubassemblyTaskScheduleType** |

> **NEW FIELDS** (from KAN-403): `task_type`, `non_worker_task_duration`, `subassembly_task_schedule_type`

#### TASK
*An instance of a task for a specific traveler*

| Column | Type | Notes |
|--------|------|-------|
| task_template_id | foreign key | Template reference |
| is_move_requested | bool | Relocation pending |
| is_moved | bool | Has been relocated |
| new_station_id | foreign key (optional) | Target station if moved |
| lead_status | string(TaskStatus) | Lead approval status |
| qam_status | string(TaskStatus) | QAM approval status |
| manual_labor_hours_adjustment | double | Override estimate |

#### ADHOC_TASK
*Non-templated tasks created on-the-fly*

| Column | Type | Notes |
|--------|------|-------|
| station_id | foreign key | |
| traveler_id | foreign key | |
| department_id | foreign key | |
| new_station_id | foreign key (optional) | |
| is_move_requested | bool | |
| is_moved | bool | |
| lead_type | string(enum) | LeadType enum |
| lead_status | string(enum) | TaskStatus enum |
| qam_status | string(enum) | TaskStatus enum |
| order | int | |
| is_photo_required | bool | |
| is_video_required | bool | |

---

### 3. WORKER MANAGEMENT

#### WORKER
*Factory floor workers*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| user_id | foreign key | | Link to user account |
| station_id | foreign key | | Primary station |
| new_station_id | foreign key (optional) | | Temporary reassignment |
| shift_id | foreign key (optional) | | Assigned shift |
| employee_id | string (unique) | 12 | Badge number |
| first_name | string | 16 | |
| last_name | string | 16 | |
| lead_types | [string(enum)] | | LeadType areas of expertise |
| passcode | string (unique) | 8 | Clock-in code |
| role | string(enum) | 12 | WorkerRole enum |
| ranked_skills | [string(enum)] | | Skill proficiency order |
| custom_clock_in_date | datetime | | Override clock-in |
| custom_clock_out_date | datetime | | Override clock-out |
| can_clock_extra_time | boolean | | Overtime eligible |
| offer_letter_file_id | foreign key (optional) | | HR document |

#### WORKER_TASK
*Assignment of workers to tasks*

| Column | Type | Notes |
|--------|------|-------|
| worker_id | foreign key | |
| task_id | foreign key | |
| production_plan_id | foreign key | Parent plan |
| start_date | datetime | Actual start |
| end_date | datetime | Actual end |
| scheduled_start_date | datetime | Planned start |
| scheduled_end_date | datetime | Planned end |
| assignment_type | string(enum) | WorkerAssignmentType enum |

#### WORKER_TASK_TEMPLATE
*Worker preferences for task types*

| Column | Type | Notes |
|--------|------|-------|
| task_template_id | foreign key | |
| worker_id | foreign key | |
| preference | string(enum) | WorkerTaskPreference enum |

#### WORKER_DEPARTMENT
*Many-to-many: workers to departments*

| Column | Type | Notes |
|--------|------|-------|
| worker_id | foreign key | |
| department_id | foreign key | |
| is_lead | bool | Lead in this department |

---

### 4. TIME & ATTENDANCE

#### TIME LOG
*Clock in/out records*

| Column | Type | Notes |
|--------|------|-------|
| worker_id | foreign key | |
| official_clock_in_date | datetime | Paid start (factory hours) |
| official_clock_out_date | datetime | Paid end |
| actual_clock_in_date | datetime | Button press time |
| actual_clock_out_date | datetime | Button press time |

#### SHIFT
*Work shift definitions*

| Column | Type | Notes |
|--------|------|-------|
| name | string | Shift name |
| start_time | double | Hours (e.g., 7.0 = 7 AM) |
| end_time | double | Hours |
| lunch_start_time | double | Break start |
| lunch_end_time | double | Break end |
| weekday_ordinals | [Int] | Days active (0=Sun, 6=Sat) |

#### PTO REQUEST
*Paid time off requests*

| Column | Type | Notes |
|--------|------|-------|
| worker_id | foreign key | |
| start_date | | |
| end_date | | |
| type | string(enum) | PtoType enum |
| hours_requested | double | |
| notes | string | |
| status | string(enum) | PtoRequestStatus |
| googleCalendarId | string | Calendar integration |

#### EXTRA_CLOCK_TIME
*Additional clock time outside normal hours*

| Column | Type | Notes |
|--------|------|-------|
| worker_id | foreign key (optional) | |
| department_id | foreign key (optional) | |
| date | date | |
| duration | double | Hours |
| type | string(enum) | ExtraClockTimeType enum |

---

### 5. INSPECTION & QUALITY

#### INSPECTION ITEM TEMPLATE
*Blueprint for inspection checkpoints*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| inspection_area_id | foreign key | | |
| department_id | foreign key | | |
| lead_type | string(enum) | 16 | LeadType enum |
| name | string | 32 | |
| description | string | 256 | |
| order | int | | |
| is_photo_required | bool | | |
| is_video_required | bool | | |

#### INSPECTION ITEM
*An inspection instance for a traveler*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| inspection_item_template_id | foreign key | | |
| traveler_id | foreign key | | |
| is_move_requested | bool | | |
| is_moved | bool | | |
| new_inspection_area_id | foreign key (optional) | | |
| lead_status | string(enum) | 12 | TaskStatus enum |
| qam_status | string(enum) | 12 | TaskStatus enum |

#### INSPECTION AREA
*Physical areas for inspections*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| name | string | 8 | |
| order | int | | |

#### ISSUE
*Quality issues found during inspection*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| inspection_item_id | foreign key (optional) | | |
| task_id | foreign key (optional) | | |
| name | string | 32 | |
| description | string | 256 | |
| type | string(enum) | | IssueType enum |
| is_resolved | bool | | |

---

### 6. ORGANIZATIONAL STRUCTURE

#### PROJECT
*Customer projects*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| name | string | 64 | |

#### DEPARTMENT
*Factory departments*

| Column | Type | Notes |
|--------|------|-------|
| name | string | |

#### STATION
*Work stations within the factory*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| inspection_area_id | foreign key | | |
| name | string | 12 | |
| order | int | | Production sequence |
| does_receive_travelers | bool | | Can travelers enter |
| can_receive_multiple_travelers | bool | | Parallel capacity |

---

### 7. TIME STUDY & LABOR ESTIMATION

#### TIME_STUDY
*Historical labor data for estimation*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| task_template_id | foreign key | | |
| module_id | foreign key (optional) | | |
| date | datetime | | |
| worker_count | int | | Crew size |
| clock_time | double | | Hours taken |
| notes | string | 256 | |

#### MODULE_ATTRIBUTE
*Configurable attributes for labor calculation*

| Column | Type | Notes |
|--------|------|-------|
| name | string | |
| module_attribute_type | string(enum) | ModuleAttributeType enum |

#### TIME_STUDY_MODULE_ATTRIBUTE
*Attribute values for a specific time study*

| Column | Type | Notes |
|--------|------|-------|
| time_study_id | foreign key | |
| module_attribute_id | foreign key | |
| value | any | Could be boolean or integer |

#### TASK_TEMPLATE_MODULE_ATTRIBUTE
*Which attributes affect which task templates*

| Column | Type | Notes |
|--------|------|-------|
| task_template_id | foreign key | |
| module_attribute_id | foreign key | |

#### MODULE_PROFILE_MODULE_ATTRIBUTE
*Attribute values for a module profile*

| Column | Type | Notes |
|--------|------|-------|
| module_profile_id | foreign key | |
| module_attribute_id | foreign key | |
| value | double | |

---

### 8. PRODUCTION PLANNING

#### PRODUCTION_PLAN
*A scheduled production run*

| Column | Type | Notes |
|--------|------|-------|
| start_date | timestamp | |
| due_date | timestamp | |

#### PRODUCTION_PLAN_SHIFT
*Which shifts are part of a plan*

| Column | Type | Notes |
|--------|------|-------|
| production_plan_id | foreign key | |
| shift_id | foreign key | |
| is_starting_shift | bool | First shift of plan |
| is_ending_shift | bool | Last shift of plan |

---

### 9. USER & AUTHENTICATION

#### USER
*System users (workers, office staff, customers)*

| Column | Type | Notes |
|--------|------|-------|
| firebase_user_id | string | Firebase Auth ID |
| first_name | | |
| last_name | | |
| email | | |
| phone | | |
| type | string(enum) | UserType enum |
| last_activity | timestamp | |
| create_date | timestamp | |
| update_date | timestamp | |

#### PROJECT_CONTACT
*External contacts for projects*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| user_id | string | 32 | Firebase user ID |
| name | string | 24 | |
| phone | string | 9 | Clean format |
| role | string(enum) | | ProjectContactRole enum |

---

### 10. DOCUMENTATION & FILES

#### NOTE
*Comments/notes attached to various entities*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| traveler_id | foreign key (optional) | | |
| task_id | foreign key (optional) | | |
| inspection_item_id | foreign key (optional) | | |
| warranty_claim_id | foreign key (optional) | | |
| text | string | 512 | |
| type | string(enum) | | NoteType enum |

#### MANAGED_FILE
*File storage metadata*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| note_id | foreign key (optional) | | |
| warranty_claim_id | foreign key (optional) | | |
| content_type | string | 24 | MIME type |
| filename | string | 64 | |
| is_uploaded | bool | | Upload complete |
| is_auth_required | bool | | Private file |
| should_be_public | bool | | Public access |
| should_cache | bool | | CDN caching |
| should_defer_upload | bool | | Background upload |
| storage_dir | string(enum) | 16 | StorageDirectory enum |
| upload_attempts | int | | Retry count |

---

### 11. WARRANTY & SUPPORT

#### WARRANTY_CLAIM
*Customer warranty requests*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| project_id | foreign key | | |
| user_id | foreign key | | |
| status | string(enum) | | WarrantyClaimStatus enum |
| priority | string(enum) | | WarrantyClaimPriority enum |
| request_number | string | | Ticket number |
| serial_number | string | | Module serial |
| category | string(enum) | | WarrantyClaimCategory enum |
| description | string | 256 | |
| create_date | timestamp | | |
| update_date | timestamp | | |

---

### 12. NOTIFICATIONS

#### NOTIFICATIONS
*System notifications*

| Column | Type | Length | Notes |
|--------|------|--------|-------|
| title | string | 64 | |
| text | string | 256 | |
| is_sent | bool | | |
| is_read | bool | | |
| type | string(enum) | | NotificationType enum |
| sent_date | timestamp | | |
| read_date | timestamp | | |

---

## Enums Reference

### TaskStatus
```
pending | approved | rejected
```

### LeadType (Department/Area Types)
```
closeup | drywall | electrical | exterior | floors | hvac | insulation
interior | office | paint | plumbing | roof-ceiling | roofing | shipping | walls
```

### TaskType ⭐ NEW
```
default | subassembly | nonWorker
```
- `default`: Normal worker-assigned task
- `subassembly`: Tasks that can be done ahead at nearby stations
- `nonWorker`: Automated/wait tasks (curing, drying, etc.)

### SubassemblyTaskScheduleType ⭐ NEW
```
oneStationAhead | twoStationsAhead | oneStationBehind
```

### Skill
```
framing | finishCarpentry | electricalTrim | electricalRough | plumbing
drywallHanging | drywallMud | texture | painting | roofing | flooring
boxMoving | cutting | hvac
```

### WorkerRole
```
worker | lead | qam | supervisor | admin
```

### WorkerAssignmentType
```
inStation | floating | workAhead
```

### WorkerTaskPreference
```
primaryJob | secondaryJob | canHelp | canNotHelp
```

### PtoType
```
sick | vacation | juryDuty | bereavement | court
```

### PtoRequestStatus
```
pending | approved | rejected
```

### NoteType
```
approval | rejection | photoOnly | move | moveRequest | normal
```

### IssueType
```
materialShortage | mistake
```

### StorageDirectory
```
settings | travelers | temp
```

### ModuleCharacteristicType
```
squareFeetModule | linearFeetExteriorWalls | linearFeetInteriorWalls
countInteriorWalls | countToilets | linearFeetCabinets | countTubsShowers
countSinks | countInteriorDoors | countWindows | countExteriorDoors
squareFeetExteriorCloseUp | squareFeetRoofing | hasHvacDucting
countElectricalTerminals | linearFeetFirewall | countStairs | linearFeetModule
countBathrooms | squareFeefFlooring | countSinksToiletsTubsShowers
countDoorsWindows | squareFeetSiding
```

### ModuleAttributeType
```
number | boolean
```

### UserType
```
worker | office | customer
```

### ProjectContactRole
```
superintendant | projectManager | purchaser | owner
```

### WarrantyClaimStatus
```
pending | inReview | closedGcIssue | closedResolved
```

### WarrantyClaimCategory
```
framing | electrical | plumbing | hvac | drywall | paint | flooring
cabinets | windowsDoors | exterior | roofing | appliances
```

### WarrantyClaimPriority
```
high | medium | low
```

### NotificationType
```
departmentShift | alert | ptoRequest
```

### ExtraClockTimeType
```
beforeOpen | afterClose
```

---

## Key Insights & Patterns

### 1. Two-Level Approval System
Almost all quality-related entities have TWO status fields:
- `lead_status`: First-level approval by department lead
- `qam_status`: Second-level approval by QA Manager

Both use `TaskStatus` enum: `pending → approved/rejected`

### 2. Template → Instance Pattern
The system heavily uses a template pattern:
- `TRAVELER_TEMPLATE` → `TRAVELER`
- `TASK_TEMPLATE` → `TASK`
- `INSPECTION_ITEM_TEMPLATE` → `INSPECTION_ITEM`

This allows standardization while supporting customization.

### 3. Move Request Pattern
Multiple entities support relocation:
- `is_move_requested`: Request pending
- `is_moved`: Completed
- `new_*_id`: Target location

Found in: TASK, INSPECTION_ITEM, ADHOC_TASK, etc.

### 4. Labor Estimation Chain
```
MODULE_CHARACTERISTIC (physical measurements)
       ↓
TIME_STUDY (historical data)
       ↓
MODULE_ATTRIBUTE (configurable factors)
       ↓
TASK_TEMPLATE (min/max workers, skills)
       ↓
WORKER_TASK (actual assignments)
```

### 5. NEW: Non-Worker Task Support
The `TASK_TEMPLATE` now supports three task types:
- **default**: Standard worker-assigned tasks
- **subassembly**: Work-ahead tasks at nearby stations
- **nonWorker**: Automated processes (curing, drying) with `non_worker_task_duration`

This is the feature being implemented in KAN-242!

---

## Junction Tables (Many-to-Many)

| Junction Table | Connects |
|----------------|----------|
| TRAVELER_TEMPLATE_INSPECTION_ITEM_TEMPLATE | Traveler templates ↔ Inspection item templates |
| TRAVELER_TEMPLATE_TASK_TEMPLATE | Traveler templates ↔ Task templates |
| MODULE_PROFILE_MODULE_ATTRIBUTE | Module profiles ↔ Module attributes |
| TIME_STUDY_MODULE_ATTRIBUTE | Time studies ↔ Module attributes |
| TASK_TEMPLATE_MODULE_ATTRIBUTE | Task templates ↔ Module attributes |
| WORKER_TASK_TEMPLATE | Workers ↔ Task templates (preferences) |
| WORKER_DEPARTMENT | Workers ↔ Departments |
| PROJECT_PROJECT_CONTACT | Projects ↔ Project contacts |
| PRODUCTION_PLAN_SHIFT | Production plans ↔ Shifts |

---

## Table Count Summary

| Domain | Table Count |
|--------|-------------|
| Production Tracking | 6 |
| Task Management | 3 |
| Worker Management | 4 |
| Time & Attendance | 4 |
| Inspection & Quality | 4 |
| Organization | 3 |
| Time Study & Labor | 5 |
| Production Planning | 2 |
| User & Auth | 3 |
| Documentation | 2 |
| Warranty | 1 |
| Notifications | 1 |
| **TOTAL** | **38 Tables** |

---

## Relevance to Current Task (KAN-242)

The new `TASK_TEMPLATE` fields are directly relevant:

```typescript
// These map to your TypeScript types:
interface Task {
    taskType?: 'default' | 'subassembly' | 'nonWorker';
    nonWorkerTaskDuration?: number;  // Hours
    subassemblyTaskScheduleType?: 'oneStationAhead' | 'twoStationsAhead' | 'oneStationBehind';
}
```

When `taskType === 'nonWorker'`:
- No workers should be assigned
- Task runs for `nonWorkerTaskDuration` hours
- Prerequisites still apply
- Can be a prerequisite for other tasks
