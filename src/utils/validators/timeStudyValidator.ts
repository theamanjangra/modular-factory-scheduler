import * as yup from "yup";

export const createTimeStudySchema = yup.object({
  body: yup.object({
    moduleId: yup.string().nullable(),
    taskTemplateId: yup.string().required("Task Template ID is required"),
    notes: yup.string().required("notes is required"),
    date: yup
      .string()
      .required("date is required")
      .test("is-timestamp", "Invalid timestamp", (value) => {
        return !isNaN(Date.parse(value));
      }),
    clockTime: yup.number().required("Clock Time is required"),
    workerCount: yup.number().required("Worker Count is required"),
  }),
});

export const updateTimeStudySchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Shift ID is required"),
  }),
  body: yup.object({
    moduleId: yup.string().nullable(),
    taskTemplateId: yup.string().required("Task Template ID is required"),
    notes: yup.string().required("notes is required"),
    date: yup
      .string()
      .required("date is required")
      .test("is-timestamp", "Invalid timestamp", (value) => {
        return !isNaN(Date.parse(value));
      }),
    clockTime: yup.number().required("Clock Time is required"),
    workerCount: yup.number().required("Worker Count is required"),
  }),
});

export const deleteTimeStudySchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Time Study ID is required"),
  }),
});

export const getTimeStudyByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Time Study ID is required"),
  }),
});
