/**
 * Role-Based Chatbot Service
 * =========================
 * 
 * Determines the correct chatbot endpoint based on user role.
 * Each dashboard now uses its own specialized chatbot endpoint.
 */

import { User } from '../types/auth';
import { getApiUrl } from '../config/api';

export interface ChatbotEndpoint {
  endpoint: string;
  streamEndpoint: string;
  healthEndpoint: string;
  role: string;
  description: string;
}

export const ROLE_CHATBOT_ENDPOINTS: Record<string, ChatbotEndpoint> = {
  'Manager': {
    endpoint: '/ai/manager/chat',
    streamEndpoint: '/ai/manager/chat-stream',
    healthEndpoint: '/ai/manager/health',
    role: 'Manager',
    description: 'Manager-specific chatbot for approval workflows'
  },
  'Department Manager': {
    endpoint: '/ai/manager/chat',
    streamEndpoint: '/ai/manager/chat-stream',
    healthEndpoint: '/ai/manager/health',
    role: 'Manager',
    description: 'Manager-specific chatbot for approval workflows'
  },
  'Line Manager': {
    endpoint: '/ai/manager/chat',
    streamEndpoint: '/ai/manager/chat-stream',
    healthEndpoint: '/ai/manager/health',
    role: 'Manager',
    description: 'Manager-specific chatbot for approval workflows'
  },
  'Team Lead': {
    endpoint: '/ai/manager/chat',
    streamEndpoint: '/ai/manager/chat-stream',
    healthEndpoint: '/ai/manager/health',
    role: 'Manager',
    description: 'Manager-specific chatbot for approval workflows'
  },
  'HR Officer': {
    endpoint: '/ai/hr/chat',
    streamEndpoint: '/ai/hr/chat-stream',
    healthEndpoint: '/ai/hr/health',
    role: 'HR',
    description: 'HR-specific chatbot for HR workflows'
  },
  'HR Staff': {
    endpoint: '/ai/hr/chat',
    streamEndpoint: '/ai/hr/chat-stream',
    healthEndpoint: '/ai/hr/health',
    role: 'HR',
    description: 'HR-specific chatbot for HR workflows'
  },
  'HR Manager': {
    endpoint: '/ai/hr/chat',
    streamEndpoint: '/ai/hr/chat-stream',
    healthEndpoint: '/ai/hr/health',
    role: 'HR',
    description: 'HR-specific chatbot for HR workflows'
  },
  'Finance Officer': {
    endpoint: '/ai/finance/chat',
    streamEndpoint: '/ai/finance/chat-stream',
    healthEndpoint: '/ai/finance/health',
    role: 'Finance',
    description: 'Finance-specific chatbot for financial approvals'
  },
  'Finance Staff': {
    endpoint: '/ai/finance/chat',
    streamEndpoint: '/ai/finance/chat-stream',
    healthEndpoint: '/ai/finance/health',
    role: 'Finance',
    description: 'Finance-specific chatbot for financial approvals'
  },
  'IT Officer': {
    endpoint: '/ai/it/chat',
    streamEndpoint: '/ai/it/chat-stream',
    healthEndpoint: '/ai/it/health',
    role: 'IT Support',
    description: 'IT Support-specific chatbot for IT workflows'
  },
  'IT Staff': {
    endpoint: '/ai/it/chat',
    streamEndpoint: '/ai/it/chat-stream',
    healthEndpoint: '/ai/it/health',
    role: 'IT Support',
    description: 'IT Support-specific chatbot for IT workflows'
  },
  'IT Support': {
    endpoint: '/ai/it/chat',
    streamEndpoint: '/ai/it/chat-stream',
    healthEndpoint: '/ai/it/health',
    role: 'IT Support',
    description: 'IT Support-specific chatbot for IT workflows'
  },
  'IT Support Officer': {
    endpoint: '/ai/it/chat',
    streamEndpoint: '/ai/it/chat-stream',
    healthEndpoint: '/ai/it/health',
    role: 'IT Support',
    description: 'IT Support-specific chatbot for IT workflows'
  },
  'Operations Officer': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  },
  'Operations Staff': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  },
  'Facilities Desk Coordinator': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  },
  'Facilities Officer': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  },
  'Facilities Staff': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  },
  'Facilities Manager': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  },
  'Facilities Director': {
    endpoint: '/ai/facilities/chat',
    streamEndpoint: '/ai/facilities/chat-stream',
    healthEndpoint: '/ai/facilities/health',
    role: 'Facilities',
    description: 'Facilities-specific chatbot for facilities management'
  }
};

/**
 * Get the appropriate chatbot endpoint for a user's role
 */
export function getChatbotEndpoint(user: User | null): ChatbotEndpoint {
  console.log('🔍 [CHATBOT ENDPOINT DEBUG] getChatbotEndpoint called with user:', user);
  console.log('🔍 [CHATBOT ENDPOINT DEBUG] user.role:', user?.role);
  
  if (!user || !user.role) {
    console.log('🔍 [CHATBOT ENDPOINT DEBUG] No user or role, using employee chatbot');
    // Default to employee chatbot for users without specific roles
    return {
      endpoint: '/ai/simple-chat',
      streamEndpoint: '/ai/simple-chat', // Employee chatbot doesn't have streaming
      healthEndpoint: '/ai/status',
      role: 'Employee',
      description: 'General AI assistant for employee form help'
    };
  }

  const userRole = user.role;
  console.log('🔍 [CHATBOT ENDPOINT DEBUG] userRole:', userRole);
  
  // Check if userRole is defined
  if (!userRole) {
    // Fallback to employee chatbot if no role is defined
    return {
      endpoint: '/ai/simple-chat',
      streamEndpoint: '/ai/simple-chat',
      healthEndpoint: '/ai/status',
      role: 'Employee',
      description: 'General AI assistant for employee form help'
    };
  }
  
  // Check for exact match first
  console.log('🔍 [ROLE MATCH DEBUG] Checking exact match for role:', userRole);
  console.log('🔍 [ROLE MATCH DEBUG] Available roles:', Object.keys(ROLE_CHATBOT_ENDPOINTS));
  if (ROLE_CHATBOT_ENDPOINTS[userRole]) {
    console.log('🔍 [ROLE MATCH DEBUG] Exact match found!', ROLE_CHATBOT_ENDPOINTS[userRole]);
    return ROLE_CHATBOT_ENDPOINTS[userRole];
  }
  
  // Check for partial matches (case-insensitive)
  console.log('🔍 [ROLE MATCH DEBUG] No exact match, checking partial matches...');
  const normalizedRole = userRole.toLowerCase();
  console.log('🔍 [ROLE MATCH DEBUG] Normalized role:', normalizedRole);
  for (const [roleKey, endpoint] of Object.entries(ROLE_CHATBOT_ENDPOINTS)) {
    console.log('🔍 [ROLE MATCH DEBUG] Checking against roleKey:', roleKey);
    if (roleKey.toLowerCase().includes(normalizedRole) || normalizedRole.includes(roleKey.toLowerCase())) {
      console.log('🔍 [ROLE MATCH DEBUG] Partial match found!', endpoint);
      return endpoint;
    }
  }
  
  // Fallback to employee chatbot for unknown roles
  console.log('🔍 [ROLE MATCH DEBUG] No matches found, using employee chatbot fallback');
  return {
    endpoint: '/ai/simple-chat',
    streamEndpoint: '/ai/simple-chat',
    healthEndpoint: '/ai/status',
    role: 'Employee',
    description: 'General AI assistant for employee form help'
  };
}

/**
 * Get chatbot configuration for a specific role
 */
export function getChatbotConfig(user: User | null) {
  console.log('🔍 [CHATBOT CONFIG DEBUG] getChatbotConfig called with user:', user);
  console.log('🔍 [CHATBOT CONFIG DEBUG] user.profile:', user?.profile);
  console.log('🔍 [CHATBOT CONFIG DEBUG] user.role:', user?.role);
  console.log('🔍 [CHATBOT CONFIG DEBUG] user.role type:', typeof user?.role);
  console.log('🔍 [CHATBOT CONFIG DEBUG] user.role value:', JSON.stringify(user?.role));
  
  try {
    const endpoint = getChatbotEndpoint(user);
    console.log('🔍 [CHATBOT CONFIG DEBUG] Selected endpoint:', endpoint);
  
  return {
    name: import.meta.env.VITE_CHATBOT_NAME || 'Chief Smile Officer',
    welcomeText: import.meta.env.VITE_CHATBOT_WELCOME || '',
    webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || getApiUrl(endpoint.endpoint),
    streamUrl: getApiUrl(endpoint.streamEndpoint),
    healthUrl: getApiUrl(endpoint.healthEndpoint),
    avatarUrl: import.meta.env.VITE_CHATBOT_AVATAR_URL || '/src/gif/Greeting.gif',
    statusText: import.meta.env.VITE_CHATBOT_STATUS || 'Online',
    gifs: {
      greeting: '/src/gif/Greeting.gif',
      listening: '/src/gif/Alpha_listen.gif',
      speaking: '/src/gif/alpha_speak.gif'
    },
    isDisabled: false,
    role: endpoint.role,
    description: endpoint.description
  };
  } catch (error) {
    console.error('🔍 [CHATBOT CONFIG DEBUG] Error getting chatbot config:', error);
    // Fallback to employee chatbot
    return {
      name: import.meta.env.VITE_CHATBOT_NAME || 'Chief Smile Officer',
      welcomeText: import.meta.env.VITE_CHATBOT_WELCOME || '',
      webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || getApiUrl('/ai/simple-chat'),
      streamUrl: getApiUrl('/ai/simple-chat'),
      healthUrl: getApiUrl('/ai/status'),
      avatarUrl: import.meta.env.VITE_CHATBOT_AVATAR_URL || '/src/gif/Greeting.gif',
      statusText: import.meta.env.VITE_CHATBOT_STATUS || 'Online',
      gifs: {
        greeting: '/src/gif/Greeting.gif',
        listening: '/src/gif/Alpha_listen.gif',
        speaking: '/src/gif/alpha_speak.gif'
      },
      isDisabled: false,
      role: 'Employee',
      description: 'General AI assistant for employee form help'
    };
  }
}

/**
 * Check if a role has a specialized chatbot
 */
export function hasSpecializedChatbot(userRole: string): boolean {
  return userRole in ROLE_CHATBOT_ENDPOINTS || 
         Object.keys(ROLE_CHATBOT_ENDPOINTS).some(role => 
           role.toLowerCase().includes(userRole.toLowerCase()) || 
           userRole.toLowerCase().includes(role.toLowerCase())
         );
}

/**
 * Get all available chatbot endpoints
 */
export function getAllChatbotEndpoints(): ChatbotEndpoint[] {
  return Object.values(ROLE_CHATBOT_ENDPOINTS);
}
