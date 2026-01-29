import { Request, Response, NextFunction } from 'express';
import { firestore as db, authAdmin } from '../utils/firebase';
import { ApiResponse } from '../types/@server';
import { CustomError } from '../types/customErrorInterface';
import { validateCreateEmployee } from '../utils/validators/employeeValidator';
import { attachAuthToUser } from '../models/timelogModel';

export const USERS_COLLECTION = 'users';

export const createEmployeeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("req.body",req.body)
    const validatedData = await validateCreateEmployee(req.body);

    const newUserRef = db.collection(USERS_COLLECTION).doc(); // custom doc ID
    await newUserRef.set({
      ...validatedData,
      create_date: new Date(),
      update_date: new Date(),
      document_id: newUserRef.id, // ✅ store document_id
      time_log: {
        log_entries: []
      },
    });

    const response: ApiResponse = {
      success: true,
      message: 'Employee created successfully',
      //data: enrichedUser,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getAllEmployeesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    const employees = snapshot.docs.map((doc) => ({
      document_id: doc.id,
      ...(doc.data() as any),
    }));

    // ✅ Enrich each with lead_types and auth_email
    const enrichedEmployees = await Promise.all(
      employees.map(async (emp) => await attachAuthToUser(emp))
    );

    const response: ApiResponse = {
      success: true,
      message: 'Employees retrieved successfully',
      data: enrichedEmployees,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const docSnap = await db.collection(USERS_COLLECTION).doc(id).get();
    if (!docSnap.exists) {
      const error: CustomError = new Error('Employee not found');
      error.status = 404;
      throw error;
    }

    const userData = { document_id: docSnap.id, ...(docSnap.data() as any) };
    const enrichedUser = await attachAuthToUser(userData);

    const response: ApiResponse = {
      success: true,
      message: 'Employee retrieved successfully',
      data: enrichedUser,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeByEmailController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.params;

    const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      const error: CustomError = new Error('Employee not found');
      error.status = 404;
      throw error;
    }

    const doc = snapshot.docs[0];
    const userData = { document_id: doc.id, ...(doc.data() as any) };
    const enrichedUser = await attachAuthToUser(userData);

    const response: ApiResponse = {
      success: true,
      message: 'Employee retrieved successfully',
      data: enrichedUser,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const docRef = db.collection(USERS_COLLECTION).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      const error: CustomError = new Error('Employee not found');
      error.status = 404;
      throw error;
    }

    await docRef.update({
      ...req.body,
      update_date: new Date(),
    });

    const updatedSnap = await docRef.get();
    const userData = { document_id: updatedSnap.id, ...(updatedSnap.data() as any) };
    const enrichedUser = await attachAuthToUser(userData);

    const response: ApiResponse = {
      success: true,
      message: 'Employee updated successfully',
      data: enrichedUser,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


export const deleteEmployeeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await db.collection(USERS_COLLECTION).doc(id).delete();

    const response: ApiResponse = {
      success: true,
      message: 'Employee deleted successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEmployeesByCrewController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crewId } = req.params;

    if (!crewId || crewId.trim() === '') {
      const error: CustomError = new Error('Invalid crew ID');
      error.status = 400;
      throw error;
    }

    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where('lead_type_ids', 'array-contains', crewId)
      .get();

    const employees = snapshot.docs.map((doc) => ({
      document_id: doc.id,
      ...(doc.data() as any),
    }));

    const enrichedEmployees = await Promise.all(
      employees.map(async (emp) => await attachAuthToUser(emp))
    );

    const response: ApiResponse = {
      success: true,
      message: 'Employees retrieved successfully',
      data: enrichedEmployees,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
