import { prisma } from '../config/db';
import { User, CreateUserRequest } from '../types/@server';

export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const { email, firstname, lastname, role } = userData;
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  const user = await prisma.user.create({
    data: {
      email,
      firstname,
      lastname,
      role,
    },
  });
  return user;
};


export const getAllUsers = async (): Promise<User[]> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return users;
  } catch (error) {
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user;
  } catch (error) {
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user;
  } catch (error) {
    throw error;
  }
};

export const getUserByRole = async (role: string): Promise<User[]> => {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return users;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (id: number, userData: Partial<CreateUserRequest>): Promise<User> => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: userData,
    });
    return user;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  try {
    await prisma.user.delete({
      where: { id },
    });
  } catch (error) {
    throw error;
  }
};
