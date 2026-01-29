import * as yup from "yup";

export const createProjectSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Project name is required"),
  }),
});

export const getProjectByIdSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid project ID format")
      .required("Project ID is required"),
  }),
});

export const updateProjectSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid project ID format")
      .required("Project ID is required"),
  }),
  body: yup.object({
    name: yup.string().required("Project name is required"),
  }),
});

export const deleteProjectSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .uuid("Invalid project ID format")
      .required("Project ID is required"),
  }),
});
