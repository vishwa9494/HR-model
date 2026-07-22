'use server';

import * as dbService from '@/lib/dbService';

export async function getProfilesAction() {
  return dbService.getProfiles();
}

export async function createProfileAction(profile: Omit<dbService.Profile, 'id'>) {
  return dbService.createProfile(profile);
}

export async function updateProfileAction(id: string, profile: Partial<dbService.Profile>) {
  return dbService.updateProfile(id, profile);
}

export async function deleteProfileAction(id: string) {
  return dbService.deleteProfile(id);
}

export async function getDepartmentsAction() {
  return dbService.getDepartments();
}

export async function getLeavesAction(profileId?: string, role?: string) {
  return dbService.getLeaves(profileId, role);
}

export async function createLeaveRequestAction(leave: Omit<dbService.LeaveRequest, 'id' | 'status' | 'approved_by'>) {
  return dbService.createLeaveRequest(leave);
}

export async function updateLeaveStatusAction(leaveId: string, status: 'Approved' | 'Rejected', approvedById: string) {
  return dbService.updateLeaveStatus(leaveId, status, approvedById);
}

export async function getAttendanceAction(profileId?: string, dateStr?: string) {
  return dbService.getAttendance(profileId, dateStr);
}

export async function clockInAction(profileId: string) {
  return dbService.clockIn(profileId);
}

export async function clockOutAction(profileId: string) {
  return dbService.clockOut(profileId);
}

export async function getPayrollAction(period?: string) {
  return dbService.getPayroll(period);
}

export async function generatePayrollAction(period: string) {
  return dbService.generatePayroll(period);
}

export async function processPayrollPaymentAction(payrollId: string) {
  return dbService.processPayrollPayment(payrollId);
}

export async function checkDbConnectionAction() {
  try {
    const { getPool } = require('@/lib/db');
    const pool = getPool();
    if (!pool) return 'Mock Offline';
    await pool.query('SELECT 1');
    return 'Supabase';
  } catch {
    return 'Mock Offline';
  }
}
