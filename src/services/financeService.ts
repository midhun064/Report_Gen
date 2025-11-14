import { getApiUrl } from '../config/api';

const getFinanceApiUrl = (path: string) => getApiUrl(`/api/finance${path}`);

export interface FinanceQueueItem {
  request_id: string | number;
  form_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  manager: string;
  amount_requested: number;
  purpose: string;
  expected_settlement_date?: string;
  employee_signature?: string;
  employee_signature_date?: string;
  line_manager_approval?: string;
  line_manager_signature?: string;
  line_manager_date?: string;
  finance_approval?: string;
  finance_signature?: string;
  finance_date?: string;
  cash_issued_by?: string;
  cash_issued_date?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  form_type: string;
}

export interface FinanceLoginResponse {
  success: boolean;
  forms: FinanceQueueItem[];
  summary: {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    forms_by_type: Record<string, number>;
  };
}

export const financeService = {
  /**
   * Load petty cash forms that need finance approval (manager approved)
   */
  async loadFinanceQueue(): Promise<FinanceLoginResponse> {
    console.log('Loading finance queue from backend API...');
    try {
      const response = await fetch(getFinanceApiUrl('/queue'));
      
      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Backend API response:', data);
      
      // Backend already returns the correct format with forms and summary
      return data;
    } catch (error) {
      console.error('Error loading finance queue:', error);
      throw error;
    }
  },

  /**
   * Update the finance approval status of a petty cash form
   */
  async updateFormStatus(
    formId: string,
    approval: 'Approved' | 'Rejected',
    financeId: string,
    comments: string,
    sessionId?: string,
    financeName?: string,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const response = await fetch(getFinanceApiUrl('/update-status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          approval,
          finance_id: financeId,
          comments,
          session_id: sessionId,
          finance_name: financeName,
          rejection_reason: rejectionReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update form status');
      }

      const result = await response.json();
      console.log('Form status updated:', result);
    } catch (error) {
      console.error('Error updating form status:', error);
      throw error;
    }
  },

  /**
   * Get detailed information for a specific form
   */
  async getFormDetails(formId: string, formType: string = 'petty-cash'): Promise<any> {
    try {
      const response = await fetch(getFinanceApiUrl(`/form-details?form_id=${formId}&form_type=${formType}`));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch form details: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching form details:', error);
      throw error;
    }
  }
};


