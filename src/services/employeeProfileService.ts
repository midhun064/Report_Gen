/**
 * Service for fetching employee profile information from the backend
 */
import { getApiUrl } from '../config/api';

export interface EmployeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  join_date: string;
  position: string;
  department_name: string;
  manager_name: string;
  hr_contact_name: string;
}

class EmployeeProfileService {
  /**
   * Fetch employee profile information including manager and HR contact
   */
  async getEmployeeProfile(employeeId: string): Promise<EmployeeProfile | null> {
    try {
      const apiUrl = getApiUrl(`/api/forms/employee-profile/${employeeId}`);
      console.log(`🔍 [EmployeeProfileService] Fetching profile for employee: ${employeeId}`);
      console.log(`🔍 [EmployeeProfileService] API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`🔍 [EmployeeProfileService] Response status: ${response.status}`);
      console.log(`🔍 [EmployeeProfileService] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error(`❌ [EmployeeProfileService] Failed to fetch profile: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`❌ [EmployeeProfileService] Error response body:`, errorText);
        return null;
      }

      const profileData = await response.json();
      console.log(`✅ [EmployeeProfileService] Profile data received:`, profileData);
      
      return profileData;
    } catch (error) {
      console.error(`❌ [EmployeeProfileService] Error fetching employee profile:`, error);
      console.error(`❌ [EmployeeProfileService] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return null;
    }
  }
}

// Export singleton instance
export const employeeProfileService = new EmployeeProfileService();
export default employeeProfileService;
