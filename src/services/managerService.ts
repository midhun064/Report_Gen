// Service for manager-specific operations
import { getApiUrl } from '../config/api';

export interface ManagerQueueItem {
  request_id: number;
  form_type: string;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department?: string;
  status: string;
  line_manager_approval?: string; // 'Approved', 'Rejected', or null
  line_manager_acknowledgement?: boolean; // For IT incident forms - view-only acknowledgement
  line_manager_signature?: string;
  line_manager_date?: string;
  created_at?: string;
  form_data?: any; // Additional form details from n8n webhook
}

export interface ManagerLoginResponse {
  success: boolean;
  manager_id: string;
  forms: ManagerQueueItem[];
  summary: {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    forms_by_type: Record<string, number>;
  };
}

export const managerService = {
  // Get manager dashboard data - uses backend API to avoid CORS issues
  async triggerManagerLogin(managerId: string, managerData: any, sessionId?: string): Promise<ManagerLoginResponse> {
    try {
      console.log('Loading manager queue from backend API...');
      
      // Use backend API directly to avoid CORS issues with n8n webhook
      const response = await fetch(
        getApiUrl(`/api/manager/queue?manager_id=${encodeURIComponent(managerId)}`)
      );
      
      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status} ${response.statusText}`);
      }
      
      const rawForms = await response.json();
      console.log('Backend API response:', rawForms);

      // Normalize form type values from backend so filters work consistently
      const normalizeFormType = (t: string): string => {
        const v = String(t || '').toLowerCase();
        if (v.includes('leave')) return 'leave-request';
        if (v.includes('meeting') && (v.includes('room') || v.includes('booking'))) return 'meeting-room';
        if (v.includes('travel')) return 'travel-request';
        if (v.includes('petty') || v.includes('cash')) return 'petty-cash';
        if (v.includes('exit') || v.includes('clearance')) return 'exit-clearance';
        if (v.includes('it') && (v.includes('incident') || v.includes('ticket'))) return 'it-incident';
        return v;
      };

      const forms: ManagerQueueItem[] = rawForms.map((f: ManagerQueueItem) => ({
        ...f,
        form_type: normalizeFormType((f as any).form_type || (f as any).formType || '')
      }));
      
       // Helper function to get manager approval status for summary calculation
       const getManagerApprovalStatus = (item: ManagerQueueItem): string => {
         // Use line_manager_approval field if available, otherwise show 'Pending'
         if (item.line_manager_approval) {
           return item.line_manager_approval; // 'Approved' or 'Rejected'
         }
         return 'Pending'; // No manager approval yet
       };
       
       // Calculate summary from forms based on manager approval status
       const summary = {
         total_pending: forms.filter((f: ManagerQueueItem) => getManagerApprovalStatus(f) === 'Pending').length,
         total_approved: forms.filter((f: ManagerQueueItem) => getManagerApprovalStatus(f) === 'Approved').length,
         total_rejected: forms.filter((f: ManagerQueueItem) => getManagerApprovalStatus(f) === 'Rejected').length,
        forms_by_type: forms.reduce((acc: Record<string, number>, form: ManagerQueueItem) => {
          acc[form.form_type] = (acc[form.form_type] || 0) + 1;
          return acc;
        }, {})
      };

      return {
        success: true,
        manager_id: managerId,
        forms,
        summary
      };
    } catch (error) {
      console.error('Error loading manager queue:', error);
      // Return empty result on error
      return {
        success: false,
        manager_id: managerId,
        forms: [],
        summary: {
          total_pending: 0,
          total_approved: 0,
          total_rejected: 0,
          forms_by_type: {}
        }
      };
    }
  },

  // Fallback to original API endpoint
  async fallbackToOriginalAPI(managerId: string): Promise<ManagerLoginResponse> {
    try {
      const response = await fetch(
        getApiUrl(`/api/manager/queue?manager_id=${encodeURIComponent(managerId)}`)
      );
      if (!response.ok) {
        throw new Error('Failed to fetch manager queue from fallback API');
      }
      
      const rawForms = await response.json();
      const normalizeFormType = (t: string): string => {
        const v = String(t || '').toLowerCase();
        if (v.includes('leave')) return 'leave-request';
        if (v.includes('meeting') && (v.includes('room') || v.includes('booking'))) return 'meeting-room';
        if (v.includes('travel')) return 'travel-request';
        if (v.includes('petty') || v.includes('cash')) return 'petty-cash';
        if (v.includes('exit') || v.includes('clearance')) return 'exit-clearance';
        if (v.includes('it') && (v.includes('incident') || v.includes('ticket'))) return 'it-incident';
        return v;
      };
      const forms: ManagerQueueItem[] = rawForms.map((f: ManagerQueueItem) => ({
        ...f,
        form_type: normalizeFormType((f as any).form_type || (f as any).formType || '')
      }));
      
      // Calculate summary from forms
      const summary = {
        total_pending: forms.filter((f: ManagerQueueItem) => f.status === 'Pending').length,
        total_approved: forms.filter((f: ManagerQueueItem) => f.status === 'Approved').length,
        total_rejected: forms.filter((f: ManagerQueueItem) => f.status === 'Rejected').length,
        forms_by_type: forms.reduce((acc: Record<string, number>, form: ManagerQueueItem) => {
          acc[form.form_type] = (acc[form.form_type] || 0) + 1;
          return acc;
        }, {})
      };

      return {
        success: true,
        manager_id: managerId,
        forms,
        summary
      };
    } catch (error) {
      console.error('Error with fallback API:', error);
      return {
        success: false,
        manager_id: managerId,
        forms: [],
        summary: {
          total_pending: 0,
          total_approved: 0,
          total_rejected: 0,
          forms_by_type: {}
        }
      };
    }
  },

  // Original method kept for backward compatibility
  async getManagerQueue(managerId: string): Promise<ManagerQueueItem[]> {
    const result = await this.triggerManagerLogin(managerId, {});
    return result.forms;
  },

  // Update form status via backend API (avoids CORS issues)
  async updateFormStatus(formId: string, formType: string, status: 'Approved' | 'Rejected', managerId: string, comments?: string, sessionId?: string, managerName?: string, rejectionReason?: string): Promise<boolean> {
    try {
      const updatePayload = {
        form_id: formId,
        form_type: formType,
        status: status,
        manager_id: managerId,
        manager_name: managerName || `Manager_${managerId}`,
        comments: comments || '',
        rejection_reason: rejectionReason || ''
      };

      console.log('Updating line manager approval via backend:', updatePayload);

      const response = await fetch(getApiUrl('/api/manager/update-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Form status update successful:', result);
        return true;
      } else {
        const error = await response.json();
        console.error('Form status update failed:', error);
        
        // More detailed error logging for debugging
        console.error('📝 Rejection Debug Info:', {
          statusCode: response.status,
          statusText: response.statusText,
          error: error,
          payload: updatePayload,
          url: getApiUrl('/api/manager/update-status')
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error updating form status:', error);
      return false;
    }
  }
};


