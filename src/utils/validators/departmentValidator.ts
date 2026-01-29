import * as yup from "yup";

export const createDepartmentSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Department name is required"),
  }),
});

export const getDepartmentByIdSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid Department ID format")
      .required("Department ID is required"),
  }),
});

export const updateDepartmentSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid Department ID format")
      .required("Department ID is required"),
  }),
  body: yup.object({
    name: yup.string().required("Department name is required"),
  }),
});

export const deleteDepartmentSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid Department ID format")
      .required("Department ID is required"),
  }),
});
