'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
import {
  Users,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  User,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  Building,
  UserCheck,
  Download,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import * as actions from './actions';
import { Profile, Department, LeaveRequest, AttendanceRecord, PayrollRecord } from '@/lib/dbService';

type Tab = 'dashboard' | 'employees' | 'attendance' | 'leaves' | 'payroll';

export default function DashboardPage() {
  const { user, signOut, switchRole, status: authStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dbMode, setDbMode] = useState<'Supabase' | 'Mock Offline'>('Mock Offline');

  // Data States
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Time for Digital Clock
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Modals & Forms
  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; editId?: string }>({ open: false });
  const [employeeForm, setEmployeeForm] = useState<Omit<Profile, 'id'>>({
    first_name: '',
    last_name: '',
    email: '',
    role: 'Employee',
    job_title: '',
    department_id: '',
    salary: 50000,
    status: 'Active'
  });

  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState<Omit<LeaveRequest, 'id' | 'status' | 'approved_by'>>({
    profile_id: '',
    type: 'Annual',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [payrollPeriod, setPayrollPeriod] = useState('2026-07');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // 1. Clock Updates
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Determine if we are online or mock
      const isOnline = !!process.env.NEXT_PUBLIC_APP_NAME; // Quick check or dynamic env check
      // For this prototype, if pg fails to query it auto-switches, so we fetch profiles
      const profs = await actions.getProfilesAction();
      setEmployees(profs);

      const depts = await actions.getDepartmentsAction();
      setDepartments(depts);

      // Leaves (pass filter if employee)
      const lvs = await actions.getLeavesAction(
        user?.role === 'Employee' ? user.id : undefined,
        user?.role
      );
      setLeaves(lvs);

      // Attendance
      const atts = await actions.getAttendanceAction(
        user?.role === 'Employee' ? user.id : undefined
      );
      setAttendance(atts);

      // Payroll
      const pay = await actions.getPayrollAction();
      setPayroll(pay);

      const activeMode = await actions.checkDbConnectionAction();
      setDbMode(activeMode);
    } catch (e) {
      console.warn("Error loading data from server actions, using offline simulation:", e);
      setDbMode('Mock Offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const triggerAlert = (message: string) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(null), 4000);
  };

  // 3. Employee Actions
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.first_name || !employeeForm.last_name || !employeeForm.email) {
      triggerAlert("Please fill in all required fields.");
      return;
    }

    try {
      if (employeeModal.editId) {
        await actions.updateProfileAction(employeeModal.editId, employeeForm);
        triggerAlert("Employee profile updated successfully!");
      } else {
        await actions.createProfileAction(employeeForm);
        triggerAlert("New employee registered successfully!");
      }
      setEmployeeModal({ open: false });
      fetchData();
    } catch (err) {
      triggerAlert("Failed to save employee profile.");
    }
  };

  const handleEditEmployeeClick = (emp: Profile) => {
    setEmployeeForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      role: emp.role,
      job_title: emp.job_title || '',
      department_id: emp.department_id || '',
      salary: emp.salary,
      status: emp.status
    });
    setEmployeeModal({ open: true, editId: emp.id });
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        await actions.deleteProfileAction(id);
        triggerAlert("Employee record deleted.");
        fetchData();
      } catch (err) {
        triggerAlert("Failed to delete record.");
      }
    }
  };

  // 4. Attendance Actions
  const isClockedInToday = () => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find(a => a.profile_id === user?.id && a.date === today);
    return record && record.check_in && !record.check_out;
  };

  const isClockedOutToday = () => {
    const today = new Date().toISOString().split('T')[0];
    const record = attendance.find(a => a.profile_id === user?.id && a.date === today);
    return record && record.check_in && record.check_out;
  };

  const handleClockAction = async () => {
    if (!user) return;
    try {
      if (isClockedInToday()) {
        await actions.clockOutAction(user.id);
        triggerAlert("Clocked out successfully! Have a good evening.");
      } else {
        await actions.clockInAction(user.id);
        triggerAlert("Clocked in successfully! Have a great day.");
      }
      fetchData();
    } catch (err: any) {
      triggerAlert(err.message || "Attendance action failed.");
    }
  };

  // 5. Leave Actions
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      triggerAlert("Please complete all leave form inputs.");
      return;
    }

    try {
      await actions.createLeaveRequestAction({
        ...leaveForm,
        profile_id: user.id
      });
      triggerAlert("Leave request submitted for review.");
      setLeaveModal(false);
      setLeaveForm({ profile_id: '', type: 'Annual', start_date: '', end_date: '', reason: '' });
      fetchData();
    } catch (err) {
      triggerAlert("Failed to submit request.");
    }
  };

  const handleLeaveApproval = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    if (!user) return;
    try {
      await actions.updateLeaveStatusAction(leaveId, status, user.id);
      triggerAlert(`Leave request ${status.toLowerCase()} successfully.`);
      fetchData();
    } catch (err) {
      triggerAlert("Failed to update status.");
    }
  };

  // 6. Payroll Actions
  const handleGeneratePayroll = async () => {
    try {
      await actions.generatePayrollAction(payrollPeriod);
      triggerAlert(`Payroll generated for period ${payrollPeriod}.`);
      fetchData();
    } catch (err) {
      triggerAlert("Failed to generate payroll.");
    }
  };

  const handlePaySalary = async (payId: string) => {
    try {
      await actions.processPayrollPaymentAction(payId);
      triggerAlert("Salary paid successfully!");
      fetchData();
    } catch (err) {
      triggerAlert("Failed to process payment.");
    }
  };

  // 7. Report Export
  const handleExportCSV = (type: string, data: any[]) => {
    if (data.length === 0) {
      triggerAlert("No data available to export.");
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("CSV Report downloaded successfully!");
  };

  // Dashboard Stats Calculations
  const activeLeavesCount = leaves.filter(l => l.status === 'Approved').length;
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const todayAttendanceRate = () => {
    if (employees.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    const checkedInToday = attendance.filter(a => a.date === today && a.check_in).length;
    return Math.round((checkedInToday / employees.length) * 100);
  };
  const totalMonthlyPayroll = payroll
    .filter(p => p.period === '2026-06') // Filter to last closed month for aggregate stat
    .reduce((sum, p) => sum + Number(p.net_salary), 0);

  if (authStatus === 'loading') {
    return (
      <div className="flex-between" style={{ height: '100vh', justifyContent: 'center', background: '#0b0f19' }}>
        <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <RefreshCw className="animate-spin" size={40} style={{ color: '#6366f1' }} />
          <p style={{ fontSize: '16px', color: '#9ca3af' }}>Loading HR Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid #6366f1',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }}></div>
          {showNotification}
        </div>
      )}

      {/* Sidebar Layout */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Building size={22} />
          </div>
          <span>HR Portal</span>
        </div>

        {user && (
          <div className={styles.userCard}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userRole}>
              <UserCheck size={12} />
              {user.role}
            </div>
            <div className={styles.userDept}>
              {user.job_title}
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`${styles.navLink} ${activeTab === 'dashboard' ? styles.navActive : ''}`}
          >
            <Clock size={18} />
            <span>Dashboard</span>
          </button>

          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <button
              onClick={() => setActiveTab('employees')}
              className={`${styles.navLink} ${activeTab === 'employees' ? styles.navActive : ''}`}
            >
              <Users size={18} />
              <span>Employees</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('attendance')}
            className={`${styles.navLink} ${activeTab === 'attendance' ? styles.navActive : ''}`}
          >
            <User size={18} />
            <span>Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`${styles.navLink} ${activeTab === 'leaves' ? styles.navActive : ''}`}
          >
            <Calendar size={18} />
            <span>Leaves</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`${styles.navLink} ${activeTab === 'payroll' ? styles.navActive : ''}`}
          >
            <CreditCard size={18} />
            <span>Payroll</span>
          </button>
        </nav>

        {/* Demo Persona Switcher */}
        <div className={styles.roleSwitcher}>
          <div className={styles.switcherTitle}>Switch Sandbox Persona</div>
          <select
            className={styles.switcherSelect}
            value={user?.role}
            onChange={(e) => switchRole(e.target.value as any)}
          >
            <option value="Admin">Admin/HR (admin@company.com)</option>
            <option value="Manager">Manager (manager@company.com)</option>
            <option value="Employee">Employee (employee@company.com)</option>
          </select>
        </div>

        <button
          onClick={signOut}
          className={styles.navLink}
          style={{ marginTop: '20px', color: '#ef4444' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Workspace */}
      <main className={styles.workspace}>
        {/* Header bar */}
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel
          </h1>
          <div className={styles.headerActions}>
            <div className={styles.statusIndicator}>
              <div className={styles.statusDot}></div>
              <span>System: Connected ({dbMode} DB)</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content Frame */}
        <div className={styles.content}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
              <RefreshCw className="animate-spin" size={30} style={{ color: '#6366f1' }} />
            </div>
          ) : (
            <div className="animate-fade-in">
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <>
                  <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} glass-panel`}>
                      <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Total Staff</span>
                        <div className={styles.statIcon}><Users size={16} color="#6366f1" /></div>
                      </div>
                      <span className={styles.statValue}>{employees.length}</span>
                      <span className={styles.statSubtext}>Active employees</span>
                    </div>

                    <div className={`${styles.statCard} glass-panel`}>
                      <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Today's Attendance</span>
                        <div className={styles.statIcon}><UserCheck size={16} color="#10b981" /></div>
                      </div>
                      <span className={styles.statValue}>{todayAttendanceRate()}%</span>
                      <span className={styles.statSubtext}>Punch-in rate</span>
                    </div>

                    <div className={`${styles.statCard} glass-panel`}>
                      <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Active Leaves</span>
                        <div className={styles.statIcon}><Calendar size={16} color="#f59e0b" /></div>
                      </div>
                      <span className={styles.statValue}>{activeLeavesCount}</span>
                      <span className={styles.statSubtext}>{pendingLeavesCount} requests pending</span>
                    </div>

                    <div className={`${styles.statCard} glass-panel`}>
                      <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Monthly Payroll</span>
                        <div className={styles.statIcon}><CreditCard size={16} color="#ef4444" /></div>
                      </div>
                      <span className={styles.statValue}>${totalMonthlyPayroll.toLocaleString()}</span>
                      <span className={styles.statSubtext}>Period: 2026-06</span>
                    </div>
                  </div>

                  <div className={styles.chartGrid}>
                    {/* Visual Mock Chart */}
                    <div className={`${styles.chartCard} glass-panel`}>
                      <div className={styles.cardTitle}>Staff Attendance Analytics (Weekly)</div>
                      <div className={styles.chartPlaceholder}>
                        <div className={styles.barChart}>
                          <div className={styles.barCol}>
                            <span className={styles.barValue}>96%</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ height: '96%' }}></div></div>
                            <span className={styles.barLabel}>Mon</span>
                          </div>
                          <div className={styles.barCol}>
                            <span className={styles.barValue}>90%</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ height: '90%' }}></div></div>
                            <span className={styles.barLabel}>Tue</span>
                          </div>
                          <div className={styles.barCol}>
                            <span className={styles.barValue}>94%</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ height: '94%' }}></div></div>
                            <span className={styles.barLabel}>Wed</span>
                          </div>
                          <div className={styles.barCol}>
                            <span className={styles.barValue}>88%</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ height: '88%' }}></div></div>
                            <span className={styles.barLabel}>Thu</span>
                          </div>
                          <div className={styles.barCol}>
                            <span className={styles.barValue}>75%</span>
                            <div className={styles.barTrack}><div className={styles.barFill} style={{ height: '75%' }}></div></div>
                            <span className={styles.barLabel}>Fri</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`${styles.chartCard} glass-panel`}>
                      <div className={styles.cardTitle}>Recent Leave Requests</div>
                      <div className={styles.listGroup}>
                        {leaves.slice(0, 3).map((l, idx) => (
                          <div key={idx} className={styles.listItem}>
                            <div className={styles.listInfo}>
                              <span className={styles.listTitle}>{l.employee_name}</span>
                              <span className={styles.listSub}>{l.type} • {l.start_date}</span>
                            </div>
                            <span className={`${styles.listStatus} badge badge-${l.status.toLowerCase()}`}>
                              {l.status}
                            </span>
                          </div>
                        ))}
                        {leaves.length === 0 && (
                          <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
                            No pending requests
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: EMPLOYEES */}
              {activeTab === 'employees' && (user?.role === 'Admin' || user?.role === 'Manager') && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>Company Directory</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleExportCSV('employees', employees)}
                        className="btn btn-secondary"
                      >
                        <Download size={16} />
                        Export Directory
                      </button>
                      {user?.role === 'Admin' && (
                        <button
                          onClick={() => {
                            setEmployeeForm({
                              first_name: '',
                              last_name: '',
                              email: '',
                              role: 'Employee',
                              job_title: '',
                              department_id: departments[0]?.id || '',
                              salary: 60000,
                              status: 'Active'
                            });
                            setEmployeeModal({ open: true });
                          }}
                          className="btn btn-primary"
                        >
                          <Plus size={16} />
                          Add Employee
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Job Title</th>
                          <th>Department</th>
                          <th>Salary (Annual)</th>
                          <th>Status</th>
                          {user?.role === 'Admin' && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 500, color: 'black' }}>{emp.first_name} {emp.last_name}</td>
                            <td>{emp.email}</td>
                            <td>{emp.role}</td>
                            <td>{emp.job_title}</td>
                            <td>{emp.department_name || 'General'}</td>
                            <td>${emp.salary.toLocaleString()}</td>
                            <td>
                              <span className={`badge badge-${emp.status === 'Active' ? 'success' : emp.status === 'On Leave' ? 'pending' : 'danger'}`}>
                                {emp.status}
                              </span>
                            </td>
                            {user?.role === 'Admin' && (
                              <td className={styles.actionsCell}>
                                <button
                                  onClick={() => handleEditEmployeeClick(emp)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 10px' }}
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="btn btn-danger"
                                  style={{ padding: '6px 10px' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Digital Clock Check-In Card for Employee */}
                  {user && (
                    <div className="glass-panel" style={{ padding: '32px' }}>
                      <div className={styles.attendanceClockPanel}>
                        <div className={styles.digitalClock}>{time}</div>
                        <div className={styles.digitalDate}>{dateStr}</div>

                        {isClockedOutToday() ? (
                          <div style={{ marginBottom: '20px' }}>
                            <span className="badge badge-success" style={{ fontSize: '14px', padding: '8px 16px' }}>
                              Clocked Out for Today
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={handleClockAction}
                            className={`${styles.clockButton} ${isClockedInToday() ? styles.clockButtonActive : ''}`}
                          >
                            <Clock size={40} />
                            <span>{isClockedInToday() ? 'Clock Out' : 'Clock In'}</span>
                          </button>
                        )}

                        <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                          {isClockedInToday()
                            ? "Active session started. Remember to clock out when concluding your shift."
                            : isClockedOutToday()
                              ? "Shift completed successfully. See you tomorrow!"
                              : "Standard shift start: 09:00 AM. Attendance is marked automatic on clock."
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Attendance Log Table */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>
                        {user?.role === 'Employee' ? 'Your Attendance Log' : 'Company Shift Logs'}
                      </div>
                      <button
                        onClick={() => handleExportCSV('attendance_log', attendance)}
                        className="btn btn-secondary"
                      >
                        <Download size={16} />
                        Export Log
                      </button>
                    </div>

                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Employee</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Shift Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map(record => (
                            <tr key={record.id}>
                              <td style={{ fontWeight: 500, color: 'black' }}>{record.date}</td>
                              <td>{record.employee_name}</td>
                              <td style={{ fontFamily: 'monospace' }}>{record.check_in || '--:--'}</td>
                              <td style={{ fontFamily: 'monospace' }}>{record.check_out || '--:--'}</td>
                              <td>
                                <span className={`badge badge-${record.status === 'On Time' ? 'success' : record.status === 'Late' ? 'pending' : 'danger'}`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {attendance.length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>
                                No attendance records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: LEAVES */}
              {activeTab === 'leaves' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>
                        {user?.role === 'Employee' ? 'My Leave Applications' : 'Leave Approval Board'}
                      </div>

                      {user?.role === 'Employee' && (
                        <button
                          onClick={() => {
                            setLeaveForm({
                              profile_id: user.id,
                              type: 'Annual',
                              start_date: '',
                              end_date: '',
                              reason: ''
                            });
                            setLeaveModal(true);
                          }}
                          className="btn btn-primary"
                        >
                          <Plus size={16} />
                          Apply for Leave
                        </button>
                      )}
                    </div>

                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Staff Member</th>
                            <th>Type</th>
                            <th>Duration</th>
                            <th>Reason</th>
                            <th>Approval Status</th>
                            {(user?.role === 'Admin' || user?.role === 'Manager') && <th>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {leaves.map(req => (
                            <tr key={req.id}>
                              <td style={{ fontWeight: 500, color: 'black' }}>{req.employee_name}</td>
                              <td>{req.type}</td>
                              <td>{req.start_date} to {req.end_date}</td>
                              <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {req.reason}
                              </td>
                              <td>
                                <span className={`badge badge-${req.status.toLowerCase()}`}>
                                  {req.status}
                                </span>
                              </td>
                              {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                <td className={styles.actionsCell}>
                                  {req.status === 'Pending' ? (
                                    <>
                                      <button
                                        onClick={() => handleLeaveApproval(req.id, 'Approved')}
                                        className="btn btn-success"
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                      >
                                        <Check size={14} />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleLeaveApproval(req.id, 'Rejected')}
                                        className="btn btn-danger"
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                      >
                                        <X size={14} />
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                      Processed by {req.manager_name || 'Admin'}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {leaves.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>
                                No leave requests recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PAYROLL */}
              {activeTab === 'payroll' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>Payroll Processing</div>
                        <input
                          type="month"
                          value={payrollPeriod}
                          onChange={(e) => setPayrollPeriod(e.target.value)}
                          style={{ padding: '6px 12px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleExportCSV(`payroll_${payrollPeriod}`, payroll.filter(p => p.period === payrollPeriod))}
                          className="btn btn-secondary"
                        >
                          <Download size={16} />
                          Export CSV
                        </button>
                        {user?.role === 'Admin' && (
                          <button
                            onClick={handleGeneratePayroll}
                            className="btn btn-primary"
                          >
                            <RefreshCw size={16} />
                            Generate Roll
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Employee</th>
                            <th>Basic Salary</th>
                            <th>Allowances</th>
                            <th>Deductions</th>
                            <th>Net Paid</th>
                            <th>Status</th>
                            {user?.role === 'Admin' && <th>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {payroll.filter(p => p.period === payrollPeriod || activeTab === 'payroll').map(pay => (
                            <tr key={pay.id}>
                              <td style={{ fontWeight: 500, color: 'black' }}>{pay.period}</td>
                              <td>{pay.employee_name}</td>
                              <td>${pay.basic_salary.toLocaleString()}</td>
                              <td>+${pay.allowances.toLocaleString()}</td>
                              <td>-${pay.deductions.toLocaleString()}</td>
                              <td style={{ fontWeight: 600, color: 'black' }}>${pay.net_salary.toLocaleString()}</td>
                              <td>
                                <span className={`badge badge-${pay.status.toLowerCase()}`}>
                                  {pay.status}
                                </span>
                              </td>
                              {user?.role === 'Admin' && (
                                <td>
                                  {pay.status === 'Pending' ? (
                                    <button
                                      onClick={() => handlePaySalary(pay.id)}
                                      className="btn btn-success"
                                      style={{ padding: '6px 12px', fontSize: '12px' }}
                                    >
                                      Disburse
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Check size={14} /> Paid
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {payroll.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>
                                No payroll worksheets found. Use the generate tool above to establish calculations.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD/EDIT EMPLOYEE */}
      {employeeModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {employeeModal.editId ? 'Edit Employee Details' : 'Onboard New Employee'}
              </h3>
              <button onClick={() => setEmployeeModal({ open: false })} className={styles.modalClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEmployeeSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.first_name}
                      onChange={e => setEmployeeForm({ ...employeeForm, first_name: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Last Name *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.last_name}
                      onChange={e => setEmployeeForm({ ...employeeForm, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Access Level Role *</label>
                    <select
                      value={employeeForm.role}
                      onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value as any })}
                    >
                      <option value="Employee">Employee (Read-Only Portal)</option>
                      <option value="Manager">Manager (Department Approval)</option>
                      <option value="Admin">Admin/HR (Full Access)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Job Title</label>
                    <input
                      type="text"
                      value={employeeForm.job_title}
                      onChange={e => setEmployeeForm({ ...employeeForm, job_title: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Department</label>
                    <select
                      value={employeeForm.department_id || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, department_id: e.target.value || null })}
                    >
                      <option value="">No Department Assigned</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Annual Salary ($) *</label>
                    <input
                      type="number"
                      required
                      value={employeeForm.salary}
                      onChange={e => setEmployeeForm({ ...employeeForm, salary: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Employment Status</label>
                  <select
                    value={employeeForm.status}
                    onChange={e => setEmployeeForm({ ...employeeForm, status: e.target.value as any })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setEmployeeModal({ open: false })}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {employeeModal.editId ? 'Save Changes' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPLY FOR LEAVE */}
      {leaveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Request Time Off</h3>
              <button onClick={() => setLeaveModal(false)} className={styles.modalClose}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLeaveSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Leave Type</label>
                  <select
                    value={leaveForm.type}
                    onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as any })}
                  >
                    <option value="Annual">Annual Paid Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Maternity">Maternity/Paternity Leave</option>
                    <option value="Unpaid">Unpaid Sabbatical</option>
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.start_date}
                      onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.end_date}
                      onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Reason for Request</label>
                  <textarea
                    rows={4}
                    required
                    value={leaveForm.reason}
                    placeholder="Provide context regarding coverage details or reason..."
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setLeaveModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
