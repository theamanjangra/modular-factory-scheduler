import { Request, Response, NextFunction } from "express";
import {
  createTimelog,
  getTimelogs,
  getTimelogsForExport,
  getTimelogById,
  updateTimelog,
  deleteTimelog,
  getTimelogsByEmployee,
  getFilteredTimelogs,
  getEmployeeFilteredTimeLogs,
  getAbsents,
  getTardies,
} from "../models/timelogModel";
import {
  validateCreateTimelog,
  validateTimelogFilters,
} from "../utils/validators/timelogValidator";
import {
  ApiResponse,
  PaginatedResponse,
  Timelog,
  TimelogFilters,
} from "../types/@server";
import { CustomError } from "../types/customErrorInterface";
import { AbsenceItem, TardyItem, TardyRecord } from "../types/firestoreTimelog";

export const createTimelogController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = await validateCreateTimelog(req.body);
    const timelog = await createTimelog(validatedData);

    const response: ApiResponse<Timelog> = {
      success: true,
      message: "Timelog created successfully",
      data: timelog,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const filteredEmployeeTimelogController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { start, end, employee_id } = req.body;
    if (!start || !end || !employee_id) {
      res.status(401).json({
        success: false,
        message: "All fields are required",
      });
    }
    const filteredTimeLogs = await getEmployeeFilteredTimeLogs({
      start,
      end,
      employee_id,
    });

    return res.status(200).json({
      success: true,
      data: filteredTimeLogs,
    });
  } catch (error) {
    next(error);
  }
};

export const getTimelogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters: TimelogFilters = {
      start: req.query.start as string,
      end: req.query.end as string,
      employee_id: req.query.employee_id as string,
    };

    // Validate filters
    const validatedFilters = await validateTimelogFilters(filters);
    const timelogs = await getTimelogs(validatedFilters);

    const response: ApiResponse<Timelog[]> = {
      success: true,
      message: "Timelogs retrieved successfully",
      data: timelogs,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getTimelogsAbsencesTardiesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const DEFAULT_PAGE = 1;
    const DEFAULT_LIMIT = 20;
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const queryValue = req.query.isAbsence as string;
    const isAbsenceQuery = queryValue === "true";

    const filters = {
      start: req.query.start as string,
      end: req.query.end as string,
    };

    const validatedFilters = await validateTimelogFilters(filters);

    let finalData: (AbsenceItem | TardyItem)[] = [];
    let totalRecords = 0;
    let message = "Timelogs retrieved successfully";

    if (isAbsenceQuery) {
      const result = await getAbsents(validatedFilters, page, limit);
      totalRecords = result.totalRecords;

      result.data.forEach((employee) => {
        employee.absent_dates.forEach((dateString: string) => {
          finalData.push({
            ID: employee.employee_id,
            dateOfAbsence: dateString,
            lastName: employee.last_name,
            firstName: employee.first_name,
            isApprovedPTO: "No",
          });
        });
      });

      finalData.sort(
        (a, b) =>
          new Date((a as AbsenceItem).dateOfAbsence).getTime() -
          new Date((b as AbsenceItem).dateOfAbsence).getTime()
      );
    } else {
      const result = await getTardies(validatedFilters, page, limit);
      totalRecords = result.totalRecords;
      message = "Timelogs for tardies retrieved successfully";

      result.data.forEach((tardyEvent: TardyRecord) => {
        finalData.push({
          ID: tardyEvent.employee_id,
          dateOfTardiness: tardyEvent.tardy_date,
          lastName: tardyEvent.last_name,
          firstName: tardyEvent.first_name,
          clockInTime: tardyEvent.clock_in_time,
        });
      });

      finalData.sort(
        (a, b) =>
          new Date((a as TardyItem).dateOfTardiness).getTime() -
          new Date((b as TardyItem).dateOfTardiness).getTime()
      );
    }

    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      message,
      data: finalData,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimelogByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const timelogId = parseInt(id);

    if (isNaN(timelogId)) {
      const error: CustomError = new Error("Invalid timelog ID");
      error.status = 400;
      throw error;
    }

    const timelog = await getTimelogById(timelogId);

    if (!timelog) {
      const error: CustomError = new Error("Timelog not found");
      error.status = 404;
      throw error;
    }

    const response: ApiResponse<Timelog> = {
      success: true,
      message: "Timelog retrieved successfully",
      data: timelog,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateTimelogController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const timelogId = parseInt(id);

    if (isNaN(timelogId)) {
      const error: CustomError = new Error("Invalid timelog ID");
      error.status = 400;
      throw error;
    }

    const timelog = await updateTimelog(timelogId, req.body);

    const response: ApiResponse<Timelog> = {
      success: true,
      message: "Timelog updated successfully",
      data: timelog,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteTimelogController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const timelogId = parseInt(id);

    if (isNaN(timelogId)) {
      const error: CustomError = new Error("Invalid timelog ID");
      error.status = 400;
      throw error;
    }

    await deleteTimelog(timelogId);

    const response: ApiResponse = {
      success: true,
      message: "Timelog deleted successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getTimelogsByEmployeeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!employeeId) {
      const error: CustomError = new Error("Employee ID is required");
      error.status = 400;
      throw error;
    }

    // Set default date range if not provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date();

    // If no start date provided, default to 30 days ago
    if (!startDate) {
      start.setDate(start.getDate() - 30);
    }

    // Use your existing function
    const timelogs = await getEmployeeFilteredTimeLogs({
      start: start,
      end: end,
      employee_id: employeeId,
    });

    const response: ApiResponse<any[]> = {
      success: true,
      message: "Timelogs retrieved successfully",
      data: timelogs,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getTimelogsFilterController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { start, end } = req.params;
    if (!start || !end) {
      return res
        .status(400)
        .json({ message: "Start and end query parameters are required" });
    }
    const timelogs = await getFilteredTimelogs(start as string, end as string);
    return res.status(200).json({ data: timelogs });
  } catch (error) {
    next(error);
  }
};
