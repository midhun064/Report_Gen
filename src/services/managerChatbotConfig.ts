// Manager-specific chatbot configuration
export const MANAGER_CHATBOT_CONFIG = {
  name: 'Manager Assistant',
  welcomeText: "Hello Manager! I'm your management assistant. I can help you with approvals, team management, and analytics.",
  
  // Manager-specific n8n webhook URL
  webhookUrl: 'http://localhost:5678/webhook-test/manager_agent',
  
  // Manager avatar and status
  avatarUrl: '/src/gif/Robot assistant  Online manager.gif',
  statusText: 'Online • Ready to help with management tasks',
  
  // Manager-specific quick actions
  quickActions: [
    { 
      icon: 'CheckCircle2', 
      text: 'Review pending requests', 
      action: 'review_queue',
      prompt: 'Show me all pending requests that need my approval'
    },
    { 
      icon: 'BarChart3', 
      text: 'Team analytics', 
      action: 'analytics',
      prompt: 'Give me analytics and insights about my team\'s form submissions'
    },
    { 
      icon: 'Users', 
      text: 'Team overview', 
      action: 'team_overview',
      prompt: 'Show me an overview of my team\'s current activities'
    },
    { 
      icon: 'Clock', 
      text: 'Recent approvals', 
      action: 'recent_actions',
      prompt: 'Show me my recent approval actions and decisions'
    }
  ],

  // Manager-specific commands
  commands: {
    'approve': {
      description: 'Approve a specific request',
      usage: 'approve [request_id] [optional_reason]',
      example: 'approve LVR001 "Approved for annual leave"'
    },
    'reject': {
      description: 'Reject a specific request', 
      usage: 'reject [request_id] [reason]',
      example: 'reject EXP002 "Insufficient documentation provided"'
    },
    'status': {
      description: 'Get status of a specific request',
      usage: 'status [request_id]',
      example: 'status ITR005'
    },
    'pending': {
      description: 'Show all pending requests',
      usage: 'pending [optional_form_type]',
      example: 'pending leave-request'
    },
    'team': {
      description: 'Get team information and statistics',
      usage: 'team [stats|members|activity]',
      example: 'team stats'
    }
  },

  // Context for AI responses
  systemContext: `You are a management assistant for a company manager. Your role is to help with:

1. **Approval Management:**
   - Review pending requests from team members
   - Provide approval recommendations
   - Update approval status
   - Track approval workflows

2. **Team Analytics:**
   - Show team performance metrics
   - Form submission trends
   - Approval completion rates
   - Team member activity

3. **Administrative Support:**
   - Answer policy questions
   - Provide guidance on approval processes
   - Help with escalations
   - Assist with team management tasks

You have access to manager-specific database tools to:
- Get pending requests for approval
- Update approval status (approve/reject)
- View team analytics and insights
- Access manager-specific data

Always be professional, helpful, and focused on management responsibilities. When handling approvals, ensure proper authentication and provide clear confirmation of actions taken.`
};

// Manager notification preferences
export const MANAGER_NOTIFICATION_CONFIG = {
  priorities: {
    high: ['pending_approvals', 'escalations', 'urgent_requests'],
    medium: ['team_updates', 'form_submissions', 'status_changes'],
    low: ['analytics_updates', 'general_notifications']
  },
  
  autoTriggers: {
    login: true,
    newPendingRequest: true,
    escalation: true,
    dailySummary: true
  }
};
