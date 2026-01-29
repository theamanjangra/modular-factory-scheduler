import * as yup from "yup";

export const createInspectionAreaSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Name is required"),
    order: yup.number().integer("Order must be an integer"),
  }),
});

export const updateInspectionAreaSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Name is required"),
    order: yup.number().integer("Order must be an integer"),
  }),
});

export const updateOrderInspectionAreaSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Station ID is required"),
  }),
  body: yup.object({
    neworder: yup.number().integer("old Order must be an integer"),
    oldOrder: yup.number().integer("old Order must be an integer"),
  }),
});

export const deleteInspectionAreaSchema = yup.object({
  params: yup.object({
  id: yup.string().uuid("Invalid ID format").required("ID is required"),
  }),
});
