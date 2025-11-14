// Service for facilities desk coordinator operations
import { getApiUrl } from '../config/api';

export interface FacilitiesDeskQueueItem {
  request_id: number;
  form_id?: number;
  employee_id: string;
  employee_name: string;
  department?: string;
  form_type?: string; // 'meeting-room' or 'facility-access'
  room_requested?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  participants_count?: number;
  // Facility access specific fields
  access_request_type?: string;
  facilities_requested?: string;
  justification?: string;
  facilities_desk_approval?: string; // 'Approved', 'Rejected', or 'Pending'
  facilities_desk_signature?: string;
  facilities_desk_date?: string;
  facilities_desk_rejected_reason?: string;
  facilities_manager_approval?: string; // 'Approved', 'Rejected', or 'Pending'
  facilities_manager_signature?: string;
  facilities_manager_date?: string;
  facilities_manager_rejected_reason?: string;
  created_at?: string;
}

export interface FacilitiesDeskLoginResponse {
  success: boolean;
  forms: FacilitiesDeskQueueItem[];
  summary: {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    forms_by_type: Record<string, number>;
  };
}

export const facilitiesDeskService = {
  // Get facilities desk dashboard data - load all meeting room bookings
  async loadFacilitiesQueue(): Promise<FacilitiesDeskLoginResponse> {
    try {
      console.log('Loading facilities desk queue from backend API...');
      
      // Use backend API to fetch meeting room bookings
      const response = await fetch(
        getApiUrl('/api/facilities-desk/queue')
      );
      
      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status} ${response.statusText}`);
      }
      
      const rawForms = await response.json();
      console.log('Backend API response:', rawForms);

      const forms: FacilitiesDeskQueueItem[] = rawForms;
      
      // Helper function to get facilities desk approval status for summary calculation
      const getFacilitiesApprovalStatus = (item: FacilitiesDeskQueueItem): string => {
        if (item.facilities_desk_approval) {
          return item.facilities_desk_approval; // 'Approved' or 'Rejected'
        }
        return 'Pending'; // No facilities approval yet
      };
      
      // Calculate summary from forms based on facilities approval status
      const summary = {
        total_pending: forms.filter((f: FacilitiesDeskQueueItem) => getFacilitiesApprovalStatus(f) === 'Pending').length,
        total_approved: forms.filter((f: FacilitiesDeskQueueItem) => getFacilitiesApprovalStatus(f) === 'Approved').length,
        total_rejected: forms.filter((f: FacilitiesDeskQueueItem) => getFacilitiesApprovalStatus(f) === 'Rejected').length,
        forms_by_type: { 'meeting-room': forms.length }
      };

      return {
        success: true,
        forms,
        summary
      };
    } catch (error) {
      console.error('Error loading facilities desk queue:', error);
      // Return empty result on error
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

  // Update meeting room booking or facility access status via backend API
  async updateFormStatus(formId: string, status: 'Approved' | 'Rejected', facilitiesId: string, formType: string = 'meeting-room', comments?: string, sessionId?: string, facilitiesName?: string, rejectionReason?: string): Promise<boolean> {
    try {
      const updatePayload = {
        form_id: formId,
        form_type: formType,
        status: status,
        facilities_id: facilitiesId,
        facilities_name: facilitiesName || `FacilitiesOfficer_${facilitiesId}`,
        comments: comments || '',
        rejection_reason: rejectionReason || ''
      };

      console.log('Updating facilities form status via backend:', updatePayload);

      const response = await fetch(getApiUrl('/api/facilities-desk/update-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Facilities form status update successful:', result);
        return true;
      } else {
        const error = await response.json();
        console.error('Facilities form status update failed:', error);
        
        // More detailed error logging for debugging
        console.error('📝 Rejection Debug Info:', {
          statusCode: response.status,
          statusText: response.statusText,
          error: error,
          payload: updatePayload,
          url: getApiUrl('/api/facilities-desk/update-status')
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error updating meeting room booking status:', error);
      return false;
    }
  }
};


