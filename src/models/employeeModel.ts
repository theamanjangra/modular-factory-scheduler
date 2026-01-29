import { prisma } from '../config/db';
import { Employee, CreateEmployeeRequest } from '../types/@server';

export const createEmployee = async (employeeData: CreateEmployeeRequest): Promise<Employee> => {
  const { name, email, crews } = employeeData;
  
  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        crews: crews || [],
      },
    });
    return employee;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error('Employee with this email already exists');
    }
    throw error;
  }
};

export const getAllEmployees = async (): Promise<Employee[]> => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return employees;
  } catch (error) {
    throw error;
  }
};

export const getEmployeeById = async (id: number): Promise<Employee | null> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
    });
    return employee;
  } catch (error) {
    throw error;
  }
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { email },
    });
    return employee;
  } catch (error) {
    throw error;
  }
};

export const updateEmployee = async (id: number, employeeData: Partial<CreateEmployeeRequest>): Promise<Employee> => {
  try {
    const employee = await prisma.employee.update({
      where: { id:id },
      data: employeeData,
    });
    return employee;
  } catch (error) {
    throw error;
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  try {
    await prisma.employee.delete({
      where: { id },
    });
  } catch (error) {
    throw error;
  }
};

export const getEmployeesByCrew = async (crewId: string): Promise<Employee[]> => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        crews: {
          has: crewId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return employees;
  } catch (error) {
    throw error;
  }
};
