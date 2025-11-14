# Form State Tracking Example - Leave Request

## 📋 **Complete Workflow Example**

### **Initial State (Employee Logs Out)**
```json
{
  "userId": "EMP001",
  "sessionId": "session_123_abc",
  "formStates": [
    {
      "formType": "leave-request",
      "formId": "LVR-2024-001",
      "status": "Pending",
      "lastUpdated": "2024-10-22T10:00:00Z",
      "title": "Leave Request (Annual)",
      "details": {
        "line_manager_approval": "Pending",
        "hr_approval": "Pending",
        "status": "Pending"
      }
    }
  ],
  "timestamp": "2024-10-22T10:00:00Z"
}
```

### **While Employee Logged Out (Manager & HR Approve)**
```
10:30 AM - Manager approves: line_manager_approval = "Approved"
11:00 AM - HR approves: hr_approval = "Approved", status = "Approved"
```

### **Employee Logs Back In (System Compares)**
```json
// Previous state (stored on logout)
{
  "formType": "leave-request",
  "formId": "LVR-2024-001", 
  "status": "Pending"
}

// Current state (fetched from database)
{
  "formType": "leave-request",
  "formId": "LVR-2024-001",
  "status": "Approved"
}

// Change detected!
{
  "formType": "leave-request",
  "formId": "LVR-2024-001",
  "oldStatus": "Pending",
  "newStatus": "Approved", 
  "title": "Leave Request (Annual)",
  "changeType": "approved",
  "timestamp": "2024-10-22T11:00:00Z"
}
```

### **Auto-Popup Notification Appears**
```
🔔 Form Status Updates
┌─────────────────────────────────────┐
│ ✅ Leave Request (Annual)          │
│ Status changed from Pending to      │
│ Approved                            │
│ Updated: 10/22/2024 11:00 AM       │
└─────────────────────────────────────┘
```

## 🔄 **System Flow**

### **On Logout:**
1. **Capture State**: System stores all form states
2. **Store Data**: Saves to localStorage with user ID
3. **Timestamp**: Records exact logout time

### **On Login:**
1. **Fetch Current**: Gets latest form states from database
2. **Compare States**: Compares with stored states
3. **Detect Changes**: Identifies any status changes
4. **Show Notification**: Auto-popup if changes found

### **No Changes Scenario:**
- If no forms changed → No notification appears
- User proceeds normally to dashboard

### **Changes Detected Scenario:**
- Auto-popup shows immediately
- Lists all changed forms with details
- User can dismiss and proceed

## 📊 **Supported Form Types**

The system tracks ALL form types:

- **Leave Requests**: Annual, Sick, Emergency, Maternity, Paternity
- **Travel Requests**: Business trips, conferences, client visits
- **Petty Cash**: Small expenses, office supplies
- **Meeting Room Bookings**: Conference rooms, event spaces
- **IT Incidents**: System issues, helpdesk tickets
- **Employee Info Updates**: Contact details, address changes
- **Facility Access**: Building access, security passes
- **Password Resets**: System access, account unlocks

## 🎯 **Change Types Detected**

- **Approved**: Form approved by manager/HR
- **Rejected**: Form rejected with reason
- **Updated**: Status changed (e.g., "Pending" → "Under Review")
- **New**: New form submitted while logged out

## 💾 **Data Persistence**

- **localStorage**: Stores form states between sessions
- **User-Specific**: Each user's data is isolated
- **Automatic Cleanup**: Old data is cleaned up automatically
- **Secure**: Data is tied to user ID and session

This system ensures employees never miss important updates to their requests, providing immediate feedback when they log back in.






