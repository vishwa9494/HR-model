import { query, getPool } from './db';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Employee';
  job_title: string;
  department_id: string | null;
  department_name?: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Suspended' | 'Terminated';
  created_at?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  manager_id: string | null;
  manager_name?: string;
}

export interface LeaveRequest {
  id: string;
  profile_id: string;
  employee_name?: string;
  type: 'Casual' | 'Sick' | 'Annual' | 'Unpaid' | 'Maternity';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by: string | null;
  manager_name?: string | null;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  profile_id: string;
  employee_name?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'On Time' | 'Late' | 'Absent' | 'Half Day';
}

export interface PayrollRecord {
  id: string;
  profile_id: string;
  employee_name?: string;
  period: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'Pending' | 'Paid';
  paid_at: string | null;
}

// In-Memory fallback store for offline prototyping
class MockDBStore {
  departments: Department[] = [
    { id: 'd1111111-1111-1111-1111-111111111111', name: 'Human Resources', description: 'Handles recruiting, payroll, and employee benefits.', manager_id: 'a1111111-1111-1111-1111-111111111111' },
    { id: 'd2222222-2222-2222-2222-222222222222', name: 'Engineering', description: 'Builds and maintains core tech products.', manager_id: 'a2222222-2222-2222-2222-222222222222' },
    { id: 'd3333333-3333-3333-3333-333333333333', name: 'Sales & Marketing', description: 'Drives growth and customer acquisition.', manager_id: null }
  ];

  profiles: Profile[] = [
    { id: 'a1111111-1111-1111-1111-111111111111', first_name: 'Admin', last_name: 'User', email: 'admin@company.com', role: 'Admin', job_title: 'HR Director', department_id: 'd1111111-1111-1111-1111-111111111111', salary: 95000.00, status: 'Active' },
    { id: 'a2222222-2222-2222-2222-222222222222', first_name: 'Sarah', last_name: 'Manager', email: 'manager@company.com', role: 'Manager', job_title: 'Engineering Lead', department_id: 'd2222222-2222-2222-2222-222222222222', salary: 120000.00, status: 'Active' },
    { id: 'a3333333-3333-3333-3333-333333333333', first_name: 'Alex', last_name: 'Employee', email: 'employee@company.com', role: 'Employee', job_title: 'Software Engineer', department_id: 'd2222222-2222-2222-2222-222222222222', salary: 80000.00, status: 'Active' }
  ];

  leaves: LeaveRequest[] = [
    { id: 'l1', profile_id: 'a3333333-3333-3333-3333-333333333333', type: 'Annual', start_date: '2026-07-28', end_date: '2026-07-31', reason: 'Family vacation trip', status: 'Pending', approved_by: null },
    { id: 'l2', profile_id: 'a3333333-3333-3333-3333-333333333333', type: 'Sick', start_date: '2026-07-12', end_date: '2026-07-13', reason: 'Dental checkup & root canal', status: 'Approved', approved_by: 'a2222222-2222-2222-2222-222222222222' }
  ];

  attendance: AttendanceRecord[] = [
    { id: 'a1', profile_id: 'a3333333-3333-3333-3333-333333333333', date: '2026-07-20', check_in: '09:05:00', check_out: '18:00:00', status: 'On Time' },
    { id: 'a2', profile_id: 'a3333333-3333-3333-3333-333333333333', date: '2026-07-21', check_in: '09:35:00', check_out: '17:45:00', status: 'Late' },
    { id: 'a3', profile_id: 'a2222222-2222-2222-2222-222222222222', date: '2026-07-21', check_in: '08:55:00', check_out: '18:15:00', status: 'On Time' }
  ];

  payroll: PayrollRecord[] = [
    { id: 'pay1', profile_id: 'a1111111-1111-1111-1111-111111111111', period: '2026-06', basic_salary: 7916.67, allowances: 400.00, deductions: 200.00, net_salary: 8116.67, status: 'Paid', paid_at: '2026-06-30' },
    { id: 'pay2', profile_id: 'a2222222-2222-2222-2222-222222222222', period: '2026-06', basic_salary: 10000.00, allowances: 600.00, deductions: 300.00, net_salary: 10300.00, status: 'Paid', paid_at: '2026-06-30' },
    { id: 'pay3', profile_id: 'a3333333-3333-3333-3333-333333333333', period: '2026-06', basic_salary: 6666.67, allowances: 300.00, deductions: 150.00, net_salary: 6816.67, status: 'Paid', paid_at: '2026-06-30' }
  ];
}

const mockStore = new MockDBStore();

// Check if database is setup. If not, auto-create tables.
let isDbChecked = false;
async function ensureDbInitialized() {
  if (isDbChecked) return true;
  const pool = getPool();
  if (!pool) return false;

  try {
    // Check if profiles table exists
    const checkRes = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'profiles'
      );
    `);
    
    if (!checkRes.rows[0].exists) {
      console.log("Database tables missing. Executing auto-setup...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS departments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(100) NOT NULL,
            description TEXT,
            manager_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role VARCHAR(50) NOT NULL,
            job_title VARCHAR(100),
            department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
            salary NUMERIC(12, 2) DEFAULT 0.00,
            status VARCHAR(50) DEFAULT 'Active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Add manager foreign key constraint to departments
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_manager') THEN
                ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;
            END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS attendance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            check_in TIME,
            check_out TIME,
            status VARCHAR(50) DEFAULT 'On Time',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (profile_id, date)
        );

        CREATE TABLE IF NOT EXISTS leaves (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payroll (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            period VARCHAR(50) NOT NULL,
            basic_salary NUMERIC(12, 2) NOT NULL,
            allowances NUMERIC(12, 2) DEFAULT 0.00,
            deductions NUMERIC(12, 2) DEFAULT 0.00,
            status VARCHAR(50) DEFAULT 'Pending',
            paid_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (profile_id, period)
        );
      `);
      
      // Seed default departments & profiles if empty
      await pool.query(`
        INSERT INTO departments (id, name, description) VALUES
        ('d1111111-1111-1111-1111-111111111111', 'Human Resources', 'Handles recruiting, payroll, and employee benefits.'),
        ('d2222222-2222-2222-2222-222222222222', 'Engineering', 'Builds and maintains core tech products.'),
        ('d3333333-3333-3333-3333-333333333333', 'Sales & Marketing', 'Drives growth and customer acquisition.')
        ON CONFLICT DO NOTHING;

        INSERT INTO profiles (id, first_name, last_name, email, role, job_title, department_id, salary, status) VALUES
        ('a1111111-1111-1111-1111-111111111111', 'Admin', 'User', 'admin@company.com', 'Admin', 'HR Director', 'd1111111-1111-1111-1111-111111111111', 95000.00, 'Active'),
        ('a2222222-2222-2222-2222-222222222222', 'Sarah', 'Manager', 'manager@company.com', 'Manager', 'Engineering Lead', 'd2222222-2222-2222-2222-222222222222', 120000.00, 'Active'),
        ('a3333333-3333-3333-3333-333333333333', 'Alex', 'Employee', 'employee@company.com', 'Employee', 'Software Engineer', 'd2222222-2222-2222-2222-222222222222', 80000.00, 'Active')
        ON CONFLICT DO NOTHING;

        UPDATE departments SET manager_id = 'a1111111-1111-1111-1111-111111111111' WHERE id = 'd1111111-1111-1111-1111-111111111111';
        UPDATE departments SET manager_id = 'a2222222-2222-2222-2222-222222222222' WHERE id = 'd2222222-2222-2222-2222-222222222222';
      `);
      console.log("Auto-setup complete.");
    }
    isDbChecked = true;
    return true;
  } catch (error) {
    console.error("Database schema check/setup failed, falling back to mock mode:", error);
    return false;
  }
}

// 1. PROFILES / EMPLOYEES CRUD
export async function getProfiles(): Promise<Profile[]> {
  const isOnline = await ensureDbInitialized();
  if (isOnline) {
    try {
      const res = await query(`
        SELECT p.*, d.name as department_name 
        FROM profiles p
        LEFT JOIN departments d ON p.department_id = d.id
        ORDER BY p.created_at DESC
      `);
      return res.rows.map(row => ({
        ...row,
        salary: Number(row.salary)
      }));
    } catch (e) {
      console.error("SQL getProfiles failed, using mock data", e);
    }
  }

  // Fallback
  return mockStore.profiles.map(p => ({
    ...p,
    department_name: mockStore.departments.find(d => d.id === p.department_id)?.name
  }));
}

export async function createProfile(profile: Omit<Profile, 'id'>): Promise<Profile> {
  const isOnline = await ensureDbInitialized();
  const id = `p-${Math.random().toString(36).substr(2, 9)}`;
  
  if (isOnline) {
    try {
      const res = await query(`
        INSERT INTO profiles (first_name, last_name, email, role, job_title, department_id, salary, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [profile.first_name, profile.last_name, profile.email, profile.role, profile.job_title, profile.department_id, profile.salary, profile.status]);
      return { ...res.rows[0], salary: Number(res.rows[0].salary) };
    } catch (e) {
      console.error("SQL createProfile failed, using mock", e);
    }
  }

  // Fallback
  const newProfile = { ...profile, id };
  mockStore.profiles.push(newProfile);
  return newProfile;
}

export async function updateProfile(id: string, profile: Partial<Profile>): Promise<Profile> {
  const isOnline = await ensureDbInitialized();
  
  if (isOnline) {
    try {
      // Build dynamic update query
      const keys = Object.keys(profile).filter(k => k !== 'id' && k !== 'department_name');
      const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
      const values = keys.map(key => (profile as any)[key]);
      
      const res = await query(`
        UPDATE profiles 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `, [id, ...values]);
      
      if (res.rows.length > 0) {
        return { ...res.rows[0], salary: Number(res.rows[0].salary) };
      }
    } catch (e) {
      console.error("SQL updateProfile failed", e);
    }
  }

  // Fallback
  const index = mockStore.profiles.findIndex(p => p.id === id);
  if (index !== -1) {
    mockStore.profiles[index] = { ...mockStore.profiles[index], ...profile };
    return mockStore.profiles[index];
  }
  throw new Error("Profile not found");
}

export async function deleteProfile(id: string): Promise<boolean> {
  const isOnline = await ensureDbInitialized();
  if (isOnline) {
    try {
      await query('DELETE FROM profiles WHERE id = $1', [id]);
      return true;
    } catch (e) {
      console.error("SQL deleteProfile failed", e);
    }
  }

  const index = mockStore.profiles.findIndex(p => p.id === id);
  if (index !== -1) {
    mockStore.profiles.splice(index, 1);
    return true;
  }
  return false;
}

// 2. DEPARTMENTS
export async function getDepartments(): Promise<Department[]> {
  const isOnline = await ensureDbInitialized();
  if (isOnline) {
    try {
      const res = await query(`
        SELECT d.*, concat(p.first_name, ' ', p.last_name) as manager_name
        FROM departments d
        LEFT JOIN profiles p ON d.manager_id = p.id
      `);
      return res.rows;
    } catch (e) {
      console.error("SQL getDepartments failed", e);
    }
  }

  return mockStore.departments.map(d => ({
    ...d,
    manager_name: mockStore.profiles.find(p => p.id === d.manager_id)
      ? `${mockStore.profiles.find(p => p.id === d.manager_id)?.first_name} ${mockStore.profiles.find(p => p.id === d.manager_id)?.last_name}`
      : 'Unassigned'
  }));
}

// 3. LEAVES
export async function getLeaves(profileId?: string, role?: string): Promise<LeaveRequest[]> {
  const isOnline = await ensureDbInitialized();
  
  if (isOnline) {
    try {
      let q = `
        SELECT l.*, 
               concat(p.first_name, ' ', p.last_name) as employee_name,
               concat(m.first_name, ' ', m.last_name) as manager_name
        FROM leaves l
        JOIN profiles p ON l.profile_id = p.id
        LEFT JOIN profiles m ON l.approved_by = m.id
      `;
      const params: any[] = [];
      
      if (profileId && role === 'Employee') {
        q += ` WHERE l.profile_id = $1`;
        params.push(profileId);
      } else if (profileId && role === 'Manager') {
        q += ` WHERE p.department_id = (SELECT department_id FROM profiles WHERE id = $1)`;
        params.push(profileId);
      }
      
      q += ` ORDER BY l.created_at DESC`;
      const res = await query(q, params);
      return res.rows.map(row => ({
        ...row,
        start_date: new Date(row.start_date).toISOString().split('T')[0],
        end_date: new Date(row.end_date).toISOString().split('T')[0]
      }));
    } catch (e) {
      console.error("SQL getLeaves failed", e);
    }
  }

  // Fallback
  let filtered = mockStore.leaves;
  if (profileId && role === 'Employee') {
    filtered = mockStore.leaves.filter(l => l.profile_id === profileId);
  } else if (profileId && role === 'Manager') {
    const managerDept = mockStore.profiles.find(p => p.id === profileId)?.department_id;
    filtered = mockStore.leaves.filter(l => {
      const emp = mockStore.profiles.find(p => p.id === l.profile_id);
      return emp?.department_id === managerDept;
    });
  }

  return filtered.map(l => {
    const emp = mockStore.profiles.find(p => p.id === l.profile_id);
    const mgr = mockStore.profiles.find(p => p.id === l.approved_by);
    return {
      ...l,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee',
      manager_name: mgr ? `${mgr.first_name} ${mgr.last_name}` : null
    };
  });
}

export async function createLeaveRequest(leave: Omit<LeaveRequest, 'id' | 'status' | 'approved_by'>): Promise<LeaveRequest> {
  const isOnline = await ensureDbInitialized();
  const id = `l-${Math.random().toString(36).substr(2, 9)}`;
  
  if (isOnline) {
    try {
      const res = await query(`
        INSERT INTO leaves (profile_id, type, start_date, end_date, reason, status)
        VALUES ($1, $2, $3, $4, $5, 'Pending')
        RETURNING *
      `, [leave.profile_id, leave.type, leave.start_date, leave.end_date, leave.reason]);
      return res.rows[0];
    } catch (e) {
      console.error("SQL createLeaveRequest failed", e);
    }
  }

  const newLeave: LeaveRequest = {
    ...leave,
    id,
    status: 'Pending',
    approved_by: null
  };
  mockStore.leaves.unshift(newLeave);
  return newLeave;
}

export async function updateLeaveStatus(leaveId: string, status: 'Approved' | 'Rejected', approvedById: string): Promise<LeaveRequest> {
  const isOnline = await ensureDbInitialized();
  if (isOnline) {
    try {
      const res = await query(`
        UPDATE leaves 
        SET status = $1, approved_by = $2
        WHERE id = $3
        RETURNING *
      `, [status, approvedById, leaveId]);
      return res.rows[0];
    } catch (e) {
      console.error("SQL updateLeaveStatus failed", e);
    }
  }

  const index = mockStore.leaves.findIndex(l => l.id === leaveId);
  if (index !== -1) {
    mockStore.leaves[index].status = status;
    mockStore.leaves[index].approved_by = approvedById;
    
    // Also update profile status if approved and currently active
    if (status === 'Approved') {
      const profId = mockStore.leaves[index].profile_id;
      const pIdx = mockStore.profiles.findIndex(p => p.id === profId);
      if (pIdx !== -1) {
        mockStore.profiles[pIdx].status = 'On Leave';
      }
    }
    
    return mockStore.leaves[index];
  }
  throw new Error("Leave request not found");
}

// 4. ATTENDANCE
export async function getAttendance(profileId?: string, dateStr?: string): Promise<AttendanceRecord[]> {
  const isOnline = await ensureDbInitialized();
  if (isOnline) {
    try {
      let q = `
        SELECT a.*, concat(p.first_name, ' ', p.last_name) as employee_name
        FROM attendance a
        JOIN profiles p ON a.profile_id = p.id
      `;
      const params: any[] = [];
      
      if (profileId && dateStr) {
        q += ` WHERE a.profile_id = $1 AND a.date = $2`;
        params.push(profileId, dateStr);
      } else if (profileId) {
        q += ` WHERE a.profile_id = $1`;
        params.push(profileId);
      } else if (dateStr) {
        q += ` WHERE a.date = $1`;
        params.push(dateStr);
      }
      
      q += ` ORDER BY a.date DESC`;
      const res = await query(q, params);
      return res.rows.map(row => ({
        ...row,
        date: new Date(row.date).toISOString().split('T')[0],
      }));
    } catch (e) {
      console.error("SQL getAttendance failed", e);
    }
  }

  // Fallback
  let filtered = mockStore.attendance;
  if (profileId && dateStr) {
    filtered = mockStore.attendance.filter(a => a.profile_id === profileId && a.date === dateStr);
  } else if (profileId) {
    filtered = mockStore.attendance.filter(a => a.profile_id === profileId);
  } else if (dateStr) {
    filtered = mockStore.attendance.filter(a => a.date === dateStr);
  }

  return filtered.map(a => {
    const emp = mockStore.profiles.find(p => p.id === a.profile_id);
    return {
      ...a,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee'
    };
  });
}

export async function clockIn(profileId: string): Promise<AttendanceRecord> {
  const isOnline = await ensureDbInitialized();
  const date = new Date().toISOString().split('T')[0];
  const checkInTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  
  // Decide status
  const hour = new Date().getHours();
  const min = new Date().getMinutes();
  const status = (hour > 9 || (hour === 9 && min > 15)) ? 'Late' : 'On Time';

  if (isOnline) {
    try {
      const res = await query(`
        INSERT INTO attendance (profile_id, date, check_in, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (profile_id, date) DO UPDATE 
        SET check_in = COALESCE(attendance.check_in, EXCLUDED.check_in), status = EXCLUDED.status
        RETURNING *
      `, [profileId, date, checkInTime, status]);
      return res.rows[0];
    } catch (e) {
      console.error("SQL clockIn failed", e);
    }
  }

  // Fallback
  const existing = mockStore.attendance.find(a => a.profile_id === profileId && a.date === date);
  if (existing) {
    if (!existing.check_in) {
      existing.check_in = checkInTime;
      existing.status = status;
    }
    return existing;
  }
  
  const record: AttendanceRecord = {
    id: `att-${Math.random().toString(36).substr(2, 9)}`,
    profile_id: profileId,
    date,
    check_in: checkInTime,
    check_out: null,
    status
  };
  mockStore.attendance.unshift(record);
  return record;
}

export async function clockOut(profileId: string): Promise<AttendanceRecord> {
  const isOnline = await ensureDbInitialized();
  const date = new Date().toISOString().split('T')[0];
  const checkOutTime = new Date().toLocaleTimeString('en-US', { hour12: false });

  if (isOnline) {
    try {
      const res = await query(`
        UPDATE attendance 
        SET check_out = $1
        WHERE profile_id = $2 AND date = $3
        RETURNING *
      `, [checkOutTime, profileId, date]);
      
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (e) {
      console.error("SQL clockOut failed", e);
    }
  }

  // Fallback
  const record = mockStore.attendance.find(a => a.profile_id === profileId && a.date === date);
  if (record) {
    record.check_out = checkOutTime;
    return record;
  }
  throw new Error("No active check-in session for today.");
}

// 5. PAYROLL
export async function getPayroll(period?: string): Promise<PayrollRecord[]> {
  const isOnline = await ensureDbInitialized();
  if (isOnline) {
    try {
      let q = `
        SELECT pr.*, concat(p.first_name, ' ', p.last_name) as employee_name
        FROM payroll pr
        JOIN profiles p ON pr.profile_id = p.id
      `;
      const params: any[] = [];
      if (period) {
        q += ` WHERE pr.period = $1`;
        params.push(period);
      }
      q += ` ORDER BY pr.period DESC`;
      const res = await query(q, params);
      return res.rows.map(row => ({
        ...row,
        basic_salary: Number(row.basic_salary),
        allowances: Number(row.allowances),
        deductions: Number(row.deductions),
        net_salary: Number(row.basic_salary) + Number(row.allowances) - Number(row.deductions)
      }));
    } catch (e) {
      console.error("SQL getPayroll failed", e);
    }
  }

  // Fallback
  let filtered = mockStore.payroll;
  if (period) {
    filtered = mockStore.payroll.filter(p => p.period === period);
  }
  return filtered.map(pr => {
    const emp = mockStore.profiles.find(p => p.id === pr.profile_id);
    return {
      ...pr,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee'
    };
  });
}

export async function generatePayroll(period: string): Promise<PayrollRecord[]> {
  const isOnline = await ensureDbInitialized();
  const employees = await getProfiles();
  const results: PayrollRecord[] = [];

  for (const emp of employees) {
    const basic = Number((emp.salary / 12).toFixed(2));
    const allowance = Number((basic * 0.08).toFixed(2)); // 8% default allowance
    const deduction = Number((basic * 0.05).toFixed(2)); // 5% tax/health contribution

    if (isOnline) {
      try {
        const res = await query(`
          INSERT INTO payroll (profile_id, period, basic_salary, allowances, deductions, status)
          VALUES ($1, $2, $3, $4, $5, 'Pending')
          ON CONFLICT (profile_id, period) DO UPDATE
          SET basic_salary = EXCLUDED.basic_salary, allowances = EXCLUDED.allowances, deductions = EXCLUDED.deductions
          RETURNING *
        `, [emp.id, period, basic, allowance, deduction]);
        
        results.push({
          ...res.rows[0],
          basic_salary: Number(res.rows[0].basic_salary),
          allowances: Number(res.rows[0].allowances),
          deductions: Number(res.rows[0].deductions),
          net_salary: Number(res.rows[0].basic_salary) + Number(res.rows[0].allowances) - Number(res.rows[0].deductions)
        });
        continue;
      } catch (e) {
        console.error("SQL generatePayroll individual failed", e);
      }
    }

    // Fallback
    const existingIdx = mockStore.payroll.findIndex(p => p.profile_id === emp.id && p.period === period);
    const newRecord: PayrollRecord = {
      id: existingIdx !== -1 ? mockStore.payroll[existingIdx].id : `pay-${Math.random().toString(36).substr(2, 9)}`,
      profile_id: emp.id,
      period,
      basic_salary: basic,
      allowances: allowance,
      deductions: deduction,
      net_salary: Number((basic + allowance - deduction).toFixed(2)),
      status: 'Pending',
      paid_at: null
    };

    if (existingIdx !== -1) {
      mockStore.payroll[existingIdx] = newRecord;
    } else {
      mockStore.payroll.push(newRecord);
    }
    results.push({ ...newRecord, employee_name: `${emp.first_name} ${emp.last_name}` });
  }

  return results;
}

export async function processPayrollPayment(payrollId: string): Promise<boolean> {
  const isOnline = await ensureDbInitialized();
  const date = new Date().toISOString().split('T')[0];

  if (isOnline) {
    try {
      await query(`
        UPDATE payroll 
        SET status = 'Paid', paid_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [payrollId]);
      return true;
    } catch (e) {
      console.error("SQL processPayrollPayment failed", e);
    }
  }

  const idx = mockStore.payroll.findIndex(p => p.id === payrollId);
  if (idx !== -1) {
    mockStore.payroll[idx].status = 'Paid';
    mockStore.payroll[idx].paid_at = date;
    return true;
  }
  return false;
}
