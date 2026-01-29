import * as yup from "yup";

export const createTravelerTemplateInspectionItemTemplateSchema = yup.object({
  body: yup.object({
    inspectionItemTemplateId: yup
      .string()
      .uuid("Invalid Inspection Item template ID")
      .required("Inspection Item template ID is required"),
    travelerTemplateId: yup
      .string()
      .uuid("Invalid traveler template ID")
      .required("Traveler template ID is required"),
  }),
});

export const getTravelerTemplateInspectionTemplatesByTravelerIdSchema = yup.object({
  params: yup.object({
    travelerTemplateId: yup
      .string()
      .uuid("Invalid traveler template ID")
      .required("Traveler template ID is required"),
  }),
})

export const updateTravelerTemplateInspectionItemTemplateSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .required("Traveler template inspection Item template ID is required"),
  }),
  body: yup.object({
    inspectionItemTemplateId: yup
      .string()
      .uuid("Invalid inspection item template ID")
      .required("Task template ID is required"),
    travelerTemplateId: yup
      .string()
      .uuid("Invalid traveler template ID")
      .required("Traveler template ID is required"),
  }),
});

export const getTravelerTemplateInspectionItemTemplateByIdSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .required("Traveler template inspection item template ID is required"),
  }),
});

export const deleteTravelerTemplateInspectionItemTemplateSchema = yup.object({
  params: yup.object({
    id: yup
      .string()
      .required("Traveler template inspection item template ID is required"),
  }),
});
