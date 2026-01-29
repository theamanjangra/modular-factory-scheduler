import * as yup from 'yup';
import { CreateTimelogRequest, TimelogFilters } from '../../types/@server';

export const createTimelogSchema = yup.object().shape({
  employeeId: yup
    .string()
    .required('Employee ID is required'),
  startTime: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Start time must be in ISO format')
    .required('Start time is required'),  endTime: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'End time must be in ISO format')
    .required('End time is required'),
  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

export const timelogFiltersSchema = yup.object().shape({
  start: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional(),
  end: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
  employee_id: yup
    .string()
    .optional(),
});


export const validateCreateTimelog = async (data: CreateTimelogRequest) => {
  try {
    return await createTimelogSchema.validate(data, { abortEarly: false });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(error.errors.join(', '));
    }
    throw error;
  }
};

export const validateTimelogFilters = async (data: TimelogFilters) => {
  try {
    return await timelogFiltersSchema.validate(data, { abortEarly: false });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(error.errors.join(', '));
    }
    throw error;
  }
};
