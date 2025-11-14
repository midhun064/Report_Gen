// Service for facilities manager operations
import { getApiUrl } from '../config/api';

export interface FacilitiesManagerQueueItem {
  request_id: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department?: string;
  form_type?: string; // 'meeting-room' or 'facility-access'
  // Meeting room specific fields
  room_requested?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  participants_count?: number;
  // Facility access specific fields
  access_request_type?: string;
  facilities_requested?: string;
  justification?: string;
  // Common approval fields
  facilities_desk_approval?: string;
  facilities_desk_signature?: string;
  facilities_desk_date?: string;
  facilities_desk_rejected_reason?: string;
  facilities_manager_approval?: string;
  facilities_manager_signature?: string;
  facilities_manager_date?: string;
  facilities_manager_rejected_reason?: string;
  status?: string;
  created_at?: string;
}

export interface FacilitiesManagerLoginResponse {
  success: boolean;
  forms: FacilitiesManagerQueueItem[];
  summary: {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    forms_by_type: Record<string, number>;
  };
}

export const facilitiesManagerService = {
  // Get facilities manager dashboard data - load meeting room bookings approved by Facilities Desk
  async loadFacilitiesManagerQueue(): Promise<FacilitiesManagerLoginResponse> {
    try {
      console.log('Loading facilities manager queue from backend API...');
      
      const response = await fetch(
        getApiUrl('/api/facilities-manager/queue')
      );
      
      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Backend API response:', data);

      // Backend already returns the correct format with forms and summary
      return data;
    } catch (error) {
      console.error('Error loading facilities manager queue:', error);
      return {
        success: false,
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

  // Update meeting room booking or facility access request status via backend API
  async updateFormStatus(formId: string, status: 'Approved' | 'Rejected', managerId: string, formType: string = 'meeting-room', comments?: string, sessionId?: string, managerName?: string, rejectionReason?: string): Promise<boolean> {
    try {
      const updatePayload = {
        form_id: formId,
        form_type: formType,
        status: status,
        manager_id: managerId,
        manager_name: managerName || `FacilitiesManager_${managerId}`,
        comments: comments || '',
        rejection_reason: rejectionReason || ''
      };

      console.log('Updating facilities manager approval via backend:', updatePayload);

      const response = await fetch(getApiUrl('/api/facilities-manager/update-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Meeting room booking status update successful:', result);
        return true;
      } else {
        const error = await response.json();
        console.error('Meeting room booking status update failed:', error);
        
        console.error('📝 Update Debug Info:', {
          statusCode: response.status,
          statusText: response.statusText,
          error: error,
          payload: updatePayload,
          url: getApiUrl('/api/facilities-manager/update-status')
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error updating meeting room booking status:', error);
      return false;
    }
  },

  // Get form details by request ID
  async getFormDetails(requestId: string, formType: string = 'meeting-room'): Promise<any> {
    try {
      console.log(`🔍 Fetching form details for ${requestId} (${formType})...`);
      const response = await fetch(
        getApiUrl(`/api/facilities-manager/form-details?request_id=${requestId}&form_type=${formType}`)
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch form details: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Form details loaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error loading form details:', error);
      throw error;
    }
  },

  // Helper to calculate summary stats
  getFacilitiesApprovalStatus(item: FacilitiesManagerQueueItem): string {
    if (item.facilities_manager_approval && item.facilities_manager_approval !== 'Pending') {
      return item.facilities_manager_approval;
    }
    return 'Pending';
  },
};

export default facilitiesManagerService;

