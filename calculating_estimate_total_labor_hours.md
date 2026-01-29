
# Calculating the `Task.estimatedTotalLaborHours` Property

## 1. Overview
A **Task** is performed on a **Module** (a production unit). A module has measurable attributes such as:

- Linear feet of interior walls  
- Number of toilets  
- Square footage of roofing  
- Etc.

To estimate the time required to complete a task, we use:

- The module’s attribute values  
- The task’s attribute definitions from the task template  
- A reference **TimeStudy**  
- Scaling math to adjust the time study result to the specific module

---

## 2. Step 1 — Retrieve Module Attributes

1. Retrieve all `MODULE_PROFILE_MODULE_ATTRIBUTE` records associated with the module.
2. Each record includes:
   - An attribute ID  
   - A numeric value representing the module’s amount of that attribute

These provide the **raw attribute values** for the module.

---

## 3. Step 2 — Identify Which Attributes Apply to This Task

1. Retrieve all `TASK_TEMPLATE_MODULE_ATTRIBUTE` records for the task template.
2. These records define **which module attributes** are relevant for the task (but contain no values).
3. Compute the **intersection** between:
   - Module attributes  
   - Task template attributes  

This intersection represents the module attributes that contribute to the work required for the task.

### Example
For a drywall task, relevant attributes may include:

- Linear feet of interior walls  
- Count of interior walls  

---

## 4. Step 3 — Compare the Required Work to a Time Study

1. Retrieve all `TIME_STUDY_MODULE_ATTRIBUTE` records for the task’s time study.
2. Ensure the time study attributes **match exactly** the attributes identified from the template.  
   - Missing attributes → **Error**
3. The time study includes:
   - Baseline values for each attribute  
   - Total labor hours for performing the task on a module with those baseline values  

### Example Computation

Time Study attributes:

| Attribute | Time Study Value |
|----------|------------------|
| Linear feet of interior walls | 92 |
| Count of interior walls | 6 |
| Total labor hours | 18 |

Module attributes:

| Attribute | Module Value |
|----------|--------------|
| Linear feet of interior walls | 72 |
| Count of interior walls | 8 |

Percentage changes:

- Linear feet: 72 vs. 92 → **−22%**
- Wall count: 8 vs. 6 → **+33%**

Apply equal weighting:

Net adjustment: **+11%**

Final estimate:

```
18 hours * 1.11 = 19.8 hours
```

---

## 5. Step 4 — Manual adjustment

1. Add the value of `Task.manualLaborHoursAdjustment`.

This becomes **Task.estimatedTotalLaborHours**.

---

## 6. Developer Checklist

1. Retrieve module attributes  
2. Retrieve task template attributes  
3. Intersect attributes  
4. Retrieve time study  
5. Validate attributes  
6. Perform proportional scaling  
7. Output `Task.estimatedDuration`

