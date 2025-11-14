// Form service for API interactions
import { getApiUrl } from '../config/api';

// Form data interfaces based on database structure
export interface LeaveRequestForm {
  request_id?: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department: string;
  line_manager: string;
  leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Study' | 'Other';
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  employee_signature?: string;
  employee_signature_date?: string;
  line_manager_approval?: 'Approved' | 'Rejected';
  line_manager_signature?: string;
  line_manager_date?: string;
  hr_approval?: 'Approved' | 'Rejected';
  hr_signature?: string;
  hr_date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ExpenseReimbursementForm {
  expense_id?: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department: string;
  manager: string;
  total_amount: number;
  employee_signature?: string;
  employee_signature_date?: string;
  line_manager_approval?: 'Approved' | 'Rejected';
  line_manager_signature?: string;
  line_manager_date?: string;
  finance_verification?: 'Approved' | 'Rejected';
  finance_signature?: string;
  finance_date?: string;
  reimbursement_processed_by?: string;
  reimbursement_date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ITAccessRequestForm {
  access_request_id?: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department: string;
  manager: string;
  request_type: 'New Employee' | 'Additional' | 'Temporary' | 'Other';
  requested_systems: string;
  business_justification: string;
  employee_signature?: string;
  employee_signature_date?: string;
  line_manager_approval?: 'Approved' | 'Rejected';
  line_manager_signature?: string;
  line_manager_date?: string;
  it_approval?: 'Approved' | 'Rejected';
  it_signature?: string;
  it_date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface TrainingRequestForm {
  training_request_id?: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department: string;
  manager: string;
  training_program: string;
  training_provider: string;
  start_date: string;
  end_date: string;
  cost: number;
  business_justification: string;
  employee_signature?: string;
  employee_signature_date?: string;
  line_manager_approval?: 'Approved' | 'Rejected';
  line_manager_signature?: string;
  line_manager_date?: string;
  hr_approval?: 'Approved' | 'Rejected';
  hr_signature?: string;
  hr_date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface EquipmentRequestForm {
  equipment_request_id?: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department: string;
  manager: string;
  equipment_type: string;
  equipment_description: string;
  business_justification: string;
  estimated_cost?: number;
  employee_signature?: string;
  employee_signature_date?: string;
  line_manager_approval?: 'Approved' | 'Rejected';
  line_manager_signature?: string;
  line_manager_date?: string;
  it_approval?: 'Approved' | 'Rejected';
  it_signature?: string;
  it_date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// API service functions
export const formService = {
  // Fetch leave requests for current user
  async getLeaveRequests(userId: string): Promise<LeaveRequestForm[]> {
    try {
      const response = await fetch(getApiUrl(`/api/forms/leave-requests?employee_id=${userId}`));
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }
  },

  // Fetch all user forms data
  async getUserForms(userId: string): Promise<any> {
    try {
      const response = await fetch(getApiUrl(`/api/forms/user-forms?employee_id=${userId}`));
      if (!response.ok) {
        throw new Error('Failed to fetch user forms');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user forms:', error);
      return {};
    }
  },

  // Fetch expense reimbursements for current user
  async getExpenseReimbursements(userId: string): Promise<ExpenseReimbursementForm[]> {
    try {
      const userForms = await this.getUserForms(userId);
      return userForms['expense-reimbursement'] || [];
    } catch (error) {
      console.error('Error fetching expense reimbursements:', error);
      return [];
    }
  },

  // Fetch IT access requests for current user
  async getITAccessRequests(userId: string): Promise<ITAccessRequestForm[]> {
    try {
      const userForms = await this.getUserForms(userId);
      return userForms['it-access'] || [];
    } catch (error) {
      console.error('Error fetching IT access requests:', error);
      return [];
    }
  },

  // Fetch training requests for current user
  async getTrainingRequests(userId: string): Promise<TrainingRequestForm[]> {
    try {
      const userForms = await this.getUserForms(userId);
      return userForms['training-request'] || [];
    } catch (error) {
      console.error('Error fetching training requests:', error);
      return [];
    }
  },

  // Fetch equipment requests for current user
  async getEquipmentRequests(userId: string): Promise<EquipmentRequestForm[]> {
    try {
      const userForms = await this.getUserForms(userId);
      return userForms['equipment-request'] || [];
    } catch (error) {
      console.error('Error fetching equipment requests:', error);
      return [];
    }
  },

  // Submit new form
  async submitForm(formType: string, formData: any): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl(`/api/forms/${formType}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      return response.ok;
    } catch (error) {
      console.error(`Error submitting ${formType}:`, error);
      return false;
    }
  },

  // Update existing form
  async updateForm(formType: string, formId: number, formData: any): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl(`/api/forms/${formType}/${formId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      return response.ok;
    } catch (error) {
      console.error(`Error updating ${formType}:`, error);
      return false;
    }
  },
};


