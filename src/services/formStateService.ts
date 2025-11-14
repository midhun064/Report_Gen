/**
 * Form State Service
 * =================
 * 
 * Service for handling form state tracking and notifications.
 * Currently focused on leave form approval stages.
 */
import { getApiUrl } from '../config/api';

export interface FormStateNotification {
  id: string;
  form_type: string;
  form_id: string;
  approval_field: string;
  old_value: string;
  new_value: string;
  title: string;
  change_type: string;
  timestamp: string;
}

class FormStateService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl('/api/form-state');
  }

  /**
   * Save form state snapshot when user logs out
   */
  async saveSnapshotOnLogout(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/save-snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to save form state snapshot:', error);
      return false;
    }
  }

  /**
   * Check for form state changes when user logs in
   */
  async checkChangesOnLogin(userId: string): Promise<FormStateNotification[]> {
    try {
      const response = await fetch(`${this.baseUrl}/check-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.notifications || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to check form state changes:', error);
      return [];
    }
  }

  /**
   * Get form state notifications for a user
   */
  async getUserNotifications(userId: string): Promise<FormStateNotification[]> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.notifications || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/mark-read/${notificationId}`, {
        method: 'POST',
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Health check for form state service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Form state service health check failed:', error);
      return false;
    }
  }
}

export const formStateService = new FormStateService();



