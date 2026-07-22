-- HR Management Tool Schema SQL
-- Copy and run this script in your Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Profiles Table (extends Auth Users or acts as standalone for the prototype)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Employee')),
    job_title VARCHAR(100),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    salary NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Suspended', 'Terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add manager foreign key constraint to departments pointing back to profiles
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIME,
    check_out TIME,
    status VARCHAR(50) DEFAULT 'On Time' CHECK (status IN ('On Time', 'Late', 'Absent', 'Half Day')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (profile_id, date)
);

-- Create Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Casual', 'Sick', 'Annual', 'Unpaid', 'Maternity')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Payroll Table
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL, -- Format: YYYY-MM
    basic_salary NUMERIC(12, 2) NOT NULL,
    allowances NUMERIC(12, 2) DEFAULT 0.00,
    deductions NUMERIC(12, 2) DEFAULT 0.00,
    net_salary NUMERIC(12, 2) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (profile_id, period)
);

-- Seed Initial Data
-- Seed Departments
INSERT INTO departments (id, name, description) VALUES
('d1111111-1111-1111-1111-111111111111', 'Human Resources', 'Handles recruiting, payroll, and employee benefits.'),
('d2222222-2222-2222-2222-222222222222', 'Engineering', 'Builds and maintains core tech products.'),
('d3333333-3333-3333-3333-333333333333', 'Sales & Marketing', 'Drives growth and customer acquisition.')
ON CONFLICT DO NOTHING;

-- Seed Admin/HR Profiles
INSERT INTO profiles (id, first_name, last_name, email, role, job_title, department_id, salary, status) VALUES
('a1111111-1111-1111-1111-111111111111', 'Admin', 'User', 'admin@company.com', 'Admin', 'HR Director', 'd1111111-1111-1111-1111-111111111111', 95000.00, 'Active'),
('a2222222-2222-2222-2222-222222222222', 'Sarah', 'Manager', 'manager@company.com', 'Manager', 'Engineering Lead', 'd2222222-2222-2222-2222-222222222222', 120000.00, 'Active'),
('a3333333-3333-3333-3333-333333333333', 'Alex', 'Employee', 'employee@company.com', 'Employee', 'Software Engineer', 'd2222222-2222-2222-2222-222222222222', 80000.00, 'Active')
ON CONFLICT DO NOTHING;

-- Set Managers on Departments
UPDATE departments SET manager_id = 'a1111111-1111-1111-1111-111111111111' WHERE id = 'd1111111-1111-1111-1111-111111111111';
UPDATE departments SET manager_id = 'a2222222-2222-2222-2222-222222222222' WHERE id = 'd2222222-2222-2222-2222-222222222222';

-- Seed Some Initial Leaves
INSERT INTO leaves (profile_id, type, start_date, end_date, reason, status) VALUES
('a3333333-3333-3333-3333-333333333333', 'Annual', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days', 'Family vacation trip', 'Pending'),
('a3333333-3333-3333-3333-333333333333', 'Sick', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '9 days', 'Dental checkup & root canal', 'Approved')
ON CONFLICT DO NOTHING;

-- Seed Some Attendance records
INSERT INTO attendance (profile_id, date, check_in, check_out, status) VALUES
('a3333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '2 days', '09:05:00', '18:00:00', 'On Time'),
('a3333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '1 days', '09:35:00', '17:45:00', 'Late'),
('a2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 days', '08:55:00', '18:15:00', 'On Time')
ON CONFLICT DO NOTHING;

-- Seed Some Payroll records
INSERT INTO payroll (profile_id, period, basic_salary, allowances, deductions, status) VALUES
('a1111111-1111-1111-1111-111111111111', '2026-06', 7916.67, 400.00, 200.00, 'Paid'),
('a2222222-2222-2222-2222-222222222222', '2026-06', 10000.00, 600.00, 300.00, 'Paid'),
('a3333333-3333-3333-3333-333333333333', '2026-06', 6666.67, 300.00, 150.00, 'Paid')
ON CONFLICT DO NOTHING;
