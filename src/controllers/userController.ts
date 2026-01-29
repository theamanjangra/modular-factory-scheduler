import { Request, Response, NextFunction } from 'express';
import { ApiResponse, User } from '../types/@server';
import { CustomError } from '../types/customErrorInterface';
import { authAdmin, firestore } from '../utils/firebase';
import { USERS_COLLECTION } from './employeeController';

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('createUserController body', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      const error: CustomError = new Error('Email and password are required');
      error.status = 400;
      throw error;
    }

    const user = await authAdmin.createUser({
      email,
      password,
    });

    const response: ApiResponse<any> = {
      success: true,
      message: 'User created successfully',
      data: user,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};


export const getAllUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const maxResults = 100;
    const listUsersResult = await authAdmin.listUsers(maxResults);
    const authUsers = listUsersResult.users;

    // Fetch all Firestore user docs from auth_users collection
    const snapshot = await firestore.collection('auth_users').get();
    const firestoreUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      email: (doc.data().email || '').toLowerCase().trim(),
      uid: doc.data().uid || doc.id,
    }));

    const firestoreMap = new Map(
      firestoreUsers.map(u => [u.email, u])
    );

    // Merge Auth and Firestore data based on **email**
    const mergedUsers = authUsers.map(authUser => {
      const authEmail = (authUser.email || '').toLowerCase().trim();
      const firestoreUser = firestoreMap.get(authEmail);

      return {
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        metadata: authUser.metadata,
        providerData: authUser.providerData,
        firestore: firestoreUser || {
          // Default values if Firestore doc not found
          id: authUser.uid,
          uid: authUser.uid,
          firstname: '',
          lastname: '',
          role: '',
          lastActivity: '',
          email: authUser.email,
        },
      };
    });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'Users retrieved successfully',
      data: mergedUsers,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


export const getUserByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; 

    if (!id) {
      const error: CustomError = new Error('User ID is required');
      error.status = 400;
      throw error;
    }

    // Get user from Firebase Auth
    const user = await authAdmin.getUser(id);

    // Find Firestore user document
    const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .where('user_id', '==', id)
      .limit(1)
      .get();

    let firestoreUser = null;
    if (!snapshot.empty) {
      firestoreUser = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    const response: ApiResponse<any> = {
      success: true,
      message: 'User retrieved successfully',
      data: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        metadata: user.metadata,
        providerData: user.providerData,
        firestore: firestoreUser,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


// by role// need to be discussed
export const getUsersByRoleController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.params;

    const listUsersResult = await authAdmin.listUsers(1000);
    const filteredUsers = listUsersResult.users.filter(
      (user) => user.customClaims?.role === role
    );

    const response: ApiResponse<any[]> = {
      success: true,
      message: `Users with role '${role}' retrieved successfully`,
      data: filteredUsers,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updatedUser = await authAdmin.updateUser(id, req.body);

    const response: ApiResponse<any> = {
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await authAdmin.deleteUser(id);

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
    };
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
