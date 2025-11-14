// Base user interface
export interface BaseUser {
  id: string;
  email: string;
  role: Role;
  department_code: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Role-specific profile interfaces
export interface EmployeeProfile {
  employee_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  position?: string;
  contact_number?: string;
  employee_email?: string;
  join_date?: string;
  employee_status?: string;
  created_at: string;
  manager_id?: string;
  manager_name?: string; // Retrieved via JOIN from line_managers table
  hr_id?: string;
  hr_name?: string; // Retrieved via JOIN from hr_staff table
}

export interface HRStaffProfile {
  hr_id: string;
  staff_code: string;
  first_name: string;
  last_name: string;
  role_code?: string;
  specialization?: string;
  contact_number?: string;
  staff_email?: string;
  created_at: string;
  role_name?: string;
  approval_level?: number;
}

export interface FinanceStaffProfile {
  finance_id: string;
  staff_code: string;
  first_name: string;
  last_name: string;
  role_code?: string;
  specialization?: string;
  approval_authority_level?: number;
  contact_number?: string;
  staff_email?: string;
  created_at: string;
  role_name?: string;
  approval_level?: number;
}

export interface ITStaffProfile {
  it_id: string;
  staff_code: string;
  first_name: string;
  last_name: string;
  role_code?: string;
  specialization?: string;
  systems_managed?: string;
  clearance_level?: string;
  contact_number?: string;
  staff_email?: string;
  created_at: string;
  role_name?: string;
  approval_level?: number;
}

export interface OperationsStaffProfile {
  operations_id: string;
  staff_code: string;
  first_name: string;
  last_name: string;
  role_code?: string;
  facility_area?: string;
  certification_details?: string;
  clearance_level?: string;
  contact_number?: string;
  staff_email?: string;
  created_at: string;
  role_name?: string;
  approval_level?: number;
}

export interface MarketingStaffProfile {
  marketing_id: string;
  staff_code: string;
  first_name: string;
  last_name: string;
  role_code?: string;
  territory?: string;
  specialization?: string;
  contact_number?: string;
  staff_email?: string;
  created_at: string;
  role_name?: string;
  approval_level?: number;
}

export interface LegalStaffProfile {
  legal_id: string;
  staff_code: string;
  first_name: string;
  last_name: string;
  role_code?: string;
  specialization?: string;
  is_external?: boolean;
  firm_name?: string;
  contract_details?: string;
  contact_number?: string;
  staff_email?: string;
  created_at: string;
  role_name?: string;
  approval_level?: number;
}

export interface LineManagerProfile {
  manager_id: string;
  manager_code: string;
  first_name: string;
  last_name: string;
  contact_number?: string;
  manager_email?: string;
  created_at: string;
}

export interface Department {
  department_code: string;
  department_name: string;
  department_head_code?: string;
  created_at: string;
}

// Complete user interface
export interface User extends BaseUser {
  profile?: EmployeeProfile | HRStaffProfile | FinanceStaffProfile | 
           ITStaffProfile | OperationsStaffProfile | MarketingStaffProfile | 
           LegalStaffProfile | LineManagerProfile;
  user_type?: 'employee' | 'hr_staff' | 'finance_staff' | 'it_staff' | 
              'operations_staff' | 'marketing_staff' | 'legal_staff' | 'line_manager' | 'facilities_staff' | 'facilities_manager';
  department: Department;
}

// Role types - matching actual database values
export type Role = 'Regular Employee' | 'HR Officer' | 'Finance Officer' | 'IT Officer' | 
                  'Operations Officer' | 'Marketing Officer' | 'Legal Officer' | 
                  'Department Manager' | 'Team Lead' | 'Employee' | 'HR Staff' | 
                  'Finance Staff' | 'IT Staff' | 'Operations Staff' | 'Marketing Staff' | 
                  'Legal Staff' | 'Line Manager' | 'Facilities Desk Coordinator' | 
                  'Facilities Officer' | 'Facilities Staff' | 'Facilities Manager' | 
                  'Facilities Director' | 'HR Manager' | 'HR' | 
                  'IT Support' | 'IT Support Officer';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Helper function to get display name
export const getUserDisplayName = (user: User): string => {
  if (user.profile && 'first_name' in user.profile && 'last_name' in user.profile) {
    return `${user.profile.first_name} ${user.profile.last_name}`;
  }
  return user.email;
};

// Helper function to get user's full name
export const getUserFullName = (user: User): string => {
  if (user.profile && 'first_name' in user.profile && 'last_name' in user.profile) {
    return `${user.profile.first_name} ${user.profile.last_name}`;
  }
  return user.email.split('@')[0]; // Fallback to email username
};