// Session Management Service
// Handles session IDs that change on logout and chatbot refresh

import { getApiUrl } from '../config/api';

export interface SessionData {
  sessionId: string;
  userId: string;
  userRole: string;
  createdAt: string;
  lastActivity: string;
  isManager: boolean;
}

class SessionService {
  private currentSession: SessionData | null = null;
  private sessionKey = 'adminease_session';

  /**
   * Generate a new session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const userAgent = navigator.userAgent.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '');
    return `session_${timestamp}_${random}_${userAgent}`;
  }

  /**
   * Get the appropriate chatbot endpoint based on user role
   */
  private getChatbotEndpointForRole(userRole: string): string {
    const role = userRole.toLowerCase();
    
    // Manager roles
    if (role.includes('manager') || role.includes('team lead') || role.includes('line manager')) {
      return '/ai/manager';
    }
    
    // HR roles
    if (role.includes('hr')) {
      return '/ai/hr';
    }
    
    // Finance roles
    if (role.includes('finance')) {
      return '/ai/finance';
    }
    
    // IT roles
    if (role.includes('it') || role.includes('support')) {
      return '/ai/it';
    }
    
    // Facilities roles
    if (role.includes('facilities') || role.includes('desk')) {
      return '/ai/facilities';
    }
    
    // Default to employee chatbot for unknown roles
    return '/ai/simple';
  }

  /**
   * Create a new session for user login (now uses backend with JSON file storage)
   */
  async createSession(userId: string, userRole: string): Promise<SessionData> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(getApiUrl(`${chatbotEndpoint}/session/login`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, user_role: userRole })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const data = await response.json();
      
      const sessionData: SessionData = {
        sessionId: data.session_id,
        userId: data.user_id,
        userRole: data.user_role,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isManager: this.isManagerRole(data.user_role)
      };

      this.currentSession = sessionData;
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      
      console.log(`🆔 New session created: ${data.session_id} for user ${userId}`);
      console.log(`📁 Session stored in: session_${userId}.json`);
      return sessionData;
      
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  }

  /**
   * Get current session or create if none exists
   */
  async getCurrentSession(userId?: string, userRole?: string): Promise<SessionData | null> {
    // Check if we have a current session
    if (this.currentSession && this.isSessionValid(this.currentSession)) {
      this.updateLastActivity();
      return this.currentSession;
    }

    // Try to restore from localStorage
    try {
      const stored = localStorage.getItem(this.sessionKey);
      if (stored) {
        const sessionData = JSON.parse(stored) as SessionData;
        if (this.isSessionValid(sessionData)) {
          this.currentSession = sessionData;
          this.updateLastActivity();
          return sessionData;
        }
      }
    } catch (error) {
      console.warn('Failed to restore session from localStorage:', error);
    }

    // Create new session if user data provided
    if (userId && userRole) {
      return await this.createSession(userId, userRole);
    }

    return null;
  }

  /**
   * Refresh session (generate new session ID)
   */
  refreshSession(): SessionData | null {
    if (!this.currentSession) {
      console.warn('No current session to refresh');
      return null;
    }

    const newSessionId = this.generateSessionId();
    const refreshedSession: SessionData = {
      ...this.currentSession,
      sessionId: newSessionId,
      lastActivity: new Date().toISOString()
    };

    this.currentSession = refreshedSession;
    localStorage.setItem(this.sessionKey, JSON.stringify(refreshedSession));
    
    console.log(`🔄 Session refreshed: ${newSessionId}`);
    return refreshedSession;
  }

  /**
   * Clear session on logout (now uses backend)
   */
  async clearSession(): Promise<void> {
    if (this.currentSession) {
      try {
        // Determine the appropriate chatbot endpoint based on user role
        const chatbotEndpoint = this.getChatbotEndpointForRole(this.currentSession.userRole);
        
        // Logout from backend
        await fetch(getApiUrl(`${chatbotEndpoint}/session/logout`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: this.currentSession.userId })
        });
        console.log(`🚪 User ${this.currentSession.userId} logged out from backend`);
      } catch (error) {
        console.error('Backend logout error:', error);
      }
    }
    
    console.log(`🚪 Session cleared: ${this.currentSession?.sessionId || 'unknown'}`);
    this.currentSession = null;
    localStorage.removeItem(this.sessionKey);
    
    // 🆕 ADD TTS AUDIO CLEANUP
    try {
      console.log('🔊 [SESSION CLEAR] Stopping all TTS audio...');
      
      // Stop global audio queue
      const { globalAudioQueue } = await import('../utils/audioQueue');
      globalAudioQueue.stop();
      
      // Stop any direct audio playback
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
    } catch (error) {
      console.error('🔊 [SESSION CLEAR] Failed to cleanup TTS audio:', error);
    }
    
    // Clear all app-related localStorage data
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('adminease_') || 
      key.startsWith('chatbot_') || 
      key.startsWith('manager_') || 
      key.startsWith('session_') ||
      key.startsWith('tts_') ||
      key.startsWith('audio_')
    );
    localStorageKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear all sessionStorage data
    sessionStorage.clear();
    
    console.log('🧹 All session and app data cleared from storage');
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date().toISOString();
      localStorage.setItem(this.sessionKey, JSON.stringify(this.currentSession));
    }
  }

  /**
   * Check if session is valid (not expired)
   */
  private isSessionValid(session: SessionData): boolean {
    const now = new Date().getTime();
    const lastActivity = new Date(session.lastActivity).getTime();
    const maxInactivity = 24 * 60 * 60 * 1000; // 24 hours
    
    return (now - lastActivity) < maxInactivity;
  }

  /**
   * Check if user role is manager
   */
  private isManagerRole(role: string): boolean {
    return ['Department Manager', 'Team Lead', 'Line Manager'].includes(role);
  }

  /**
   * Get session ID for API calls
   */
  getSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  /**
   * Check if current user is manager
   */
  isCurrentUserManager(): boolean {
    return this.currentSession?.isManager || false;
  }

  /**
   * Get session data for manager dashboard
   */
  getManagerSessionData(): {
    sessionId: string;
    managerId: string;
    managerRole: string;
  } | null {
    if (!this.currentSession || !this.currentSession.isManager) {
      return null;
    }

    return {
      sessionId: this.currentSession.sessionId,
      managerId: this.currentSession.userId,
      managerRole: this.currentSession.userRole
    };
  }

  /**
   * Get session status from backend
   */
  async getSessionStatus(userId: string, userRole: string = 'Manager'): Promise<any> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(`http://localhost:5001${chatbotEndpoint}/session/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get session status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Session status error:', error);
      throw error;
    }
  }

  /**
   * Get conversation history from backend
   */
  async getSessionHistory(userId: string, maxItems: number = 10, userRole: string = 'Manager'): Promise<any> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(getApiUrl(`${chatbotEndpoint}/session/conversation-history`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, max_items: maxItems })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get session history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Session history error:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions (admin function)
   */
  async cleanupSessions(hours: number = 24, userRole: string = 'Manager'): Promise<any> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(getApiUrl(`${chatbotEndpoint}/session/cleanup`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cleanup sessions');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Session cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get session statistics (admin function)
   */
  async getSessionStats(userRole: string = 'Manager'): Promise<any> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(getApiUrl(`${chatbotEndpoint}/session/stats`));
      
      if (!response.ok) {
        throw new Error('Failed to get session stats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Session stats error:', error);
      throw error;
    }
  }

  /**
   * Save chat message to session file
   */
  async saveChatMessage(userId: string, messageType: 'user' | 'bot', content: string, metadata?: any, userRole: string = 'Manager'): Promise<boolean> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(getApiUrl(`${chatbotEndpoint}/session/save-chat`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message_type: messageType,
          content: content,
          metadata: metadata || {}
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save chat message');
      }
      
      console.log(`💬 Chat message saved for user ${userId}: ${messageType}`);
      return true;
    } catch (error) {
      console.error('Save chat message error:', error);
      return false;
    }
  }

  /**
   * Get chat history from session file
   */
  async getChatHistory(userId: string, maxMessages: number = 20, userRole: string = 'Manager'): Promise<any[]> {
    try {
      // Determine the appropriate chatbot endpoint based on user role
      const chatbotEndpoint = this.getChatbotEndpointForRole(userRole);
      
      const response = await fetch(getApiUrl(`${chatbotEndpoint}/session/chat-history`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          max_messages: maxMessages
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get chat history');
      }
      
      const data = await response.json();
      console.log(`📜 Retrieved ${data.length} chat messages for user ${userId}`);
      return data;
    } catch (error) {
      console.error('Get chat history error:', error);
      return [];
    }
  }
}

// Global session service instance
export const sessionService = new SessionService();

// Helper functions for easy access
export const createUserSession = (userId: string, userRole: string) => 
  sessionService.createSession(userId, userRole);

export const getCurrentSession = (userId?: string, userRole?: string) => 
  sessionService.getCurrentSession(userId, userRole);

export const refreshCurrentSession = () => 
  sessionService.refreshSession();

export const clearUserSession = () => 
  sessionService.clearSession();

export const getSessionId = () => 
  sessionService.getSessionId();

export const isManagerUser = () => 
  sessionService.isCurrentUserManager();

export const getManagerSessionData = () => 
  sessionService.getManagerSessionData();

// New helper functions for file-based sessions
export const getSessionStatus = (userId: string) => 
  sessionService.getSessionStatus(userId);

export const getSessionHistory = (userId: string, maxItems?: number) => 
  sessionService.getSessionHistory(userId, maxItems);

export const cleanupSessions = (hours?: number) => 
  sessionService.cleanupSessions(hours);

export const getSessionStats = () => 
  sessionService.getSessionStats();

export const saveChatMessage = (userId: string, messageType: 'user' | 'bot', content: string, metadata?: any, userRole?: string) => 
  sessionService.saveChatMessage(userId, messageType, content, metadata, userRole);

export const getChatHistory = (userId: string, maxMessages?: number) => 
  sessionService.getChatHistory(userId, maxMessages);
