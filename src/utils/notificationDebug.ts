// Notification System Debug Utilities
// Use this to debug notification system issues

export const debugNotificationSystem = () => {
  console.log('🔍 NOTIFICATION SYSTEM DEBUG');
  console.log('================================');
  
  // Check localStorage
  const formStates = localStorage.getItem('adminease_form_states');
  const notifications = localStorage.getItem('adminease_notifications');
  
  console.log('📊 Form States in localStorage:', formStates ? JSON.parse(formStates) : 'None');
  console.log('🔔 Notifications in localStorage:', notifications ? JSON.parse(notifications) : 'None');
  
  // Check if user is logged in
  const accessToken = localStorage.getItem('access_token');
  console.log('🔑 Access Token:', accessToken ? 'Present' : 'Missing');
  
  // Check session data
  const sessionData = localStorage.getItem('adminease_session');
  console.log('📱 Session Data:', sessionData ? JSON.parse(sessionData) : 'None');
  
  // List all localStorage keys
  const allKeys = Object.keys(localStorage);
  console.log('🗂️ All localStorage keys:', allKeys);
  
  return {
    formStates: formStates ? JSON.parse(formStates) : null,
    notifications: notifications ? JSON.parse(notifications) : null,
    accessToken: !!accessToken,
    sessionData: sessionData ? JSON.parse(sessionData) : null,
    allKeys
  };
};

export const clearNotificationDebug = () => {
  console.log('🧹 Clearing notification debug data...');
  localStorage.removeItem('adminease_form_states');
  localStorage.removeItem('adminease_notifications');
  console.log('✅ Notification debug data cleared');
};

export const simulateFormStateChange = () => {
  console.log('🧪 Simulating form state change...');
  
  // Create a mock notification with approval changes
  const mockNotification = {
    changes: [
      {
        formType: 'leave-request',
        formId: 'LVR-2024-001',
        oldStatus: 'Pending',
        newStatus: 'Approved',
        title: 'Leave Request (Annual)',
        changeType: 'approved',
        timestamp: new Date().toISOString(),
        approvalChanges: [
          {
            field: 'lineManagerApproval',
            oldValue: 'Pending',
            newValue: 'Approved',
            approver: 'Line Manager'
          },
          {
            field: 'hrApproval',
            oldValue: 'Pending',
            newValue: 'Approved',
            approver: 'HR'
          }
        ]
      }
    ],
    timestamp: new Date().toISOString(),
    read: false
  };
  
  localStorage.setItem('adminease_notifications', JSON.stringify(mockNotification));
  console.log('✅ Mock notification with approval changes created');
  
  return mockNotification;
};

export const testDatabaseFieldExtraction = async () => {
  console.log('🧪 Testing database field extraction...');
  
  try {
    // Test API call to see what data is actually returned
    const response = await fetch(getApiUrl('/api/forms/user-forms?employee_id=EMP001'));
    if (!response.ok) {
      throw new Error('Failed to fetch user forms');
    }
    
    const userForms = await response.json();
    console.log('📊 Raw API response:', userForms);
    
    // Check each form type
    Object.entries(userForms).forEach(([formType, forms]: [string, any]) => {
      console.log(`📊 Form type: ${formType}`);
      if (Array.isArray(forms)) {
        forms.forEach((form: any, index: number) => {
          console.log(`📊 Form ${index + 1}:`, {
            request_id: form.request_id,
            status: form.status,
            line_manager_approval: form.line_manager_approval,
            hr_approval: form.hr_approval,
            finance_approval: form.finance_approval,
            facilities_desk_approval: form.facilities_desk_approval,
            facilities_manager_approval: form.facilities_manager_approval,
            line_manager_acknowledgement: form.line_manager_acknowledgement
          });
        });
      }
    });
    
    return userForms;
  } catch (error) {
    console.error('❌ Error testing database field extraction:', error);
    return null;
  }
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugNotificationSystem;
  (window as any).clearNotificationDebug = clearNotificationDebug;
  (window as any).simulateNotification = simulateFormStateChange;
  (window as any).testDatabaseFields = testDatabaseFieldExtraction;
}
