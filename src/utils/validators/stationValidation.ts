import * as yup from "yup";

export const createStationSchema = yup.object({
  body: yup.object({
    name: yup.string().required("Name is required"),
    order: yup.number().integer("Order must be an integer"),
    doesReceiveTravelers: yup
      .boolean()
      .required("doesReceiveTravelers is required"),
    inspectionAreaId: yup
      .string()
      .uuid("Invalid inspectionAreaId")
      .required("inspectionAreaId is required"),
  }),
});

export const updateStationSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Station ID is required"),
  }),
  body: yup.object({
    name: yup.string().required("Name is required"),
    order: yup.number().integer("Order must be an integer"),
    doesReceiveTravelers: yup
      .boolean()
      .required("doesReceiveTravelers is required"),
    inspectionAreaId: yup
      .string()
      .uuid("Invalid inspectionAreaId")
      .required("inspectionAreaId is required"),
  }),
});

export const updateOrderStationSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Station ID is required"),
  }),
  body: yup.object({
    neworder: yup.number().integer("old Order must be an integer"),
    oldOrder: yup.number().integer("old Order must be an integer"),
  }),
});

export const deleteStationSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Station ID is required"),
  }),
});

export const getStationByIdSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid("Invalid ID").required("Station ID is required"),
  }),
});
