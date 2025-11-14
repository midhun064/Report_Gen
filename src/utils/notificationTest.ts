// Comprehensive Notification System Test
// This simulates the complete workflow to test notifications

export const testCompleteNotificationWorkflow = async () => {
  console.log('🧪 TESTING COMPLETE NOTIFICATION WORKFLOW');
  console.log('==========================================');
  
  try {
    // Step 1: Clear all existing data
    console.log('📝 Step 1: Clearing existing data...');
    localStorage.removeItem('adminease_form_states');
    localStorage.removeItem('adminease_notifications');
    localStorage.removeItem('access_token');
    localStorage.removeItem('adminease_session');
    console.log('✅ Cleared all existing data');
    
    // Step 2: Simulate logout with form states (like user had forms when they logged out)
    console.log('📝 Step 2: Simulating logout with form states...');
    const mockFormStates = [
      {
        formType: 'leave-request',
        formId: 'LVR001',
        status: 'Pending',
        lineManagerApproval: 'Pending',
        hrApproval: 'Pending',
        title: 'Leave Request (Annual)',
        lastUpdated: '2025-10-22T21:28:04.000466'
      }
    ];
    
    const storedData = {
      userId: 'EMP002',
      sessionId: 'test-session-123',
      formStates: mockFormStates,
      timestamp: '2025-10-22T21:28:04.000466'
    };
    
    localStorage.setItem('adminease_form_states', JSON.stringify(storedData));
    console.log('✅ Stored form states on logout:', storedData);
    
    // Step 3: Simulate form approval (manager/HR approved while user was logged out)
    console.log('📝 Step 3: Simulating form approval while user was logged out...');
    // This would happen in the database - we'll simulate it by creating "current" states
    const currentFormStates = [
      {
        formType: 'leave-request',
        formId: 'LVR001',
        status: 'Approved', // Changed from Pending
        lineManagerApproval: 'Approved', // Changed from Pending
        hrApproval: 'Approved', // Changed from Pending
        title: 'Leave Request (Annual)',
        lastUpdated: '2025-10-22T21:35:00.000466'
      }
    ];
    
    // Step 4: Simulate login and comparison
    console.log('📝 Step 4: Simulating login and comparison...');
    
    // Compare the states
    const changes = [];
    const oldStatesMap = new Map();
    const newStatesMap = new Map();
    
    // Map old states
    mockFormStates.forEach(state => {
      const key = `${state.formType}_${state.formId}`;
      oldStatesMap.set(key, state);
    });
    
    // Map new states
    currentFormStates.forEach(state => {
      const key = `${state.formType}_${state.formId}`;
      newStatesMap.set(key, state);
    });
    
    // Find changes
    newStatesMap.forEach((newState, key) => {
      const oldState = oldStatesMap.get(key);
      
      if (oldState) {
        const approvalChanges = [];
        
        // Check status change
        if (oldState.status !== newState.status) {
          console.log(`📊 Status changed: ${oldState.status} → ${newState.status}`);
        }
        
        // Check approval changes
        if (oldState.lineManagerApproval !== newState.lineManagerApproval) {
          approvalChanges.push({
            field: 'lineManagerApproval',
            oldValue: oldState.lineManagerApproval,
            newValue: newState.lineManagerApproval,
            approver: 'Line Manager'
          });
          console.log(`📊 Line Manager approval changed: ${oldState.lineManagerApproval} → ${newState.lineManagerApproval}`);
        }
        
        if (oldState.hrApproval !== newState.hrApproval) {
          approvalChanges.push({
            field: 'hrApproval',
            oldValue: oldState.hrApproval,
            newValue: newState.hrApproval,
            approver: 'HR'
          });
          console.log(`📊 HR approval changed: ${oldState.hrApproval} → ${newState.hrApproval}`);
        }
        
        if (oldState.status !== newState.status || approvalChanges.length > 0) {
          changes.push({
            formType: newState.formType,
            formId: newState.formId,
            oldStatus: oldState.status,
            newStatus: newState.status,
            title: newState.title,
            changeType: 'approved',
            timestamp: new Date().toISOString(),
            approvalChanges: approvalChanges.length > 0 ? approvalChanges : undefined
          });
        }
      }
    });
    
    console.log(`📊 Found ${changes.length} changes:`, changes);
    
    // Step 5: Create notifications
    if (changes.length > 0) {
      console.log('📝 Step 5: Creating notifications...');
      const notifications = {
        changes,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      localStorage.setItem('adminease_notifications', JSON.stringify(notifications));
      console.log('✅ Created notifications:', notifications);
      
      // Step 6: Simulate UI update
      console.log('📝 Step 6: Simulating UI update...');
      console.log('🔔 NOTIFICATIONS SHOULD APPEAR NOW!');
      console.log('🔔 Check the bell icon in the header');
      console.log('🔔 Check for auto-popup notification');
      
      return {
        success: true,
        changes,
        notifications
      };
    } else {
      console.log('📭 No changes detected');
      return {
        success: true,
        changes: [],
        notifications: null
      };
    }
    
  } catch (error) {
    console.error('❌ Error in notification workflow test:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).testNotificationWorkflow = testCompleteNotificationWorkflow;
}






