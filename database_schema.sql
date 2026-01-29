-- PostgreSQL Database Schema for Vederra Server
-- Created according to client specifications

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    crews TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create timelogs table
CREATE TABLE timelogs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_timelogs_employee_id ON timelogs(employee_id);
CREATE INDEX idx_timelogs_start_time ON timelogs(start_time);
CREATE INDEX idx_timelogs_end_time ON timelogs(end_time);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with basic profile information';
COMMENT ON TABLE employees IS 'Employee records with crew assignments from Firestore';
COMMENT ON TABLE timelogs IS 'Time tracking logs for employees';

COMMENT ON COLUMN users.email IS 'Unique email address for user';
COMMENT ON COLUMN users.role IS 'User role (admin, user, etc.)';
COMMENT ON COLUMN employees.crews IS 'Array of crew IDs from Firestore';
COMMENT ON COLUMN timelogs.employee_id IS 'Reference to employees table with cascade delete';