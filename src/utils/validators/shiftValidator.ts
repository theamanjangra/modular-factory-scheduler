import * as yup from "yup";

export const createShiftSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Name is required"),

    startTime: yup
      .string()
      .required("Start time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),

    endTime: yup
      .string()
      .required("End time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),
      
    lunchStartTime: yup
      .string()
      .required("Lunch start time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),

    lunchEndTime: yup
      .string()
      .required("Lunch end time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),
  }),
});

export const updateShiftSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Shift ID is required"),
  }),
body: yup.object({
    name: yup.string().required("Name is required"),

    startTime: yup
      .string()
      .required("Start time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),

    endTime: yup
      .string()
      .required("End time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),

    lunchStartTime: yup
      .string()
      .required("Lunch start time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),

    lunchEndTime: yup
      .string()
      .required("Lunch end time is required")
      .test("is-timestamp", "Invalid timestamp", value => {
        return !isNaN(Date.parse(value));
      }),
  }),
});

export const deleteShiftSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Shift ID is required"),
  }),
});

export const getShiftByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Shift ID is required"),
  }),
});
