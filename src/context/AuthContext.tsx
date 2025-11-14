import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User, AuthState } from '../types/auth';
import { sessionService, createUserSession, clearUserSession, getCurrentSession } from '../services/sessionService';
import { formStateService, FormStateNotification } from '../services/formStateService';
import { getApiUrl } from '../config/api';

// Global flag to prevent double initialization even in React StrictMode
let globalSessionInitialized = false;

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  sessionId: string | null;
  refreshSession: () => void;
  formNotifications: FormStateNotification[];
  showFormNotifications: boolean;
  checkFormNotifications: () => Promise<void>;
  dismissFormNotifications: () => void;
  clearAllNotifications: () => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within an AuthProvider');
    console.error('Stack trace:', new Error().stack);
    // Return a default context to prevent crashes during development
    return {
      user: null,
      isAuthenticated: false,
      login: async () => false,
      logout: () => {},
      sessionId: null,
      refreshSession: () => {},
      formNotifications: [],
      showFormNotifications: false,
      checkFormNotifications: async () => {},
      dismissFormNotifications: () => {},
      clearAllNotifications: () => {},
      markNotificationAsRead: async () => {},
    };
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const sessionInitializedRef = useRef(false);
  
  // Form state notification state
  const [formNotifications, setFormNotifications] = useState<FormStateNotification[]>([]);
  const [showFormNotifications, setShowFormNotifications] = useState(false);

  // Initialize session on app load - prevent double initialization even in React StrictMode
  useEffect(() => {
    if (sessionInitializedRef.current || globalSessionInitialized) {
      console.log('🔍 AuthContext: Session already initialized, skipping...');
      return;
    }
    
    const initializeSession = async () => {
      try {
        console.log('🔍 AuthContext: Initializing session...');
        const existingSession = await getCurrentSession();
        if (existingSession) {
          setSessionId(existingSession.sessionId);
          console.log(`📱 Session restored: ${existingSession.sessionId}`);
        } else {
          console.log('🔍 AuthContext: No existing session found');
          // Don't logout if no session found - user might not be logged in yet
        }
        sessionInitializedRef.current = true;
        globalSessionInitialized = true;
        setIsInitialized(true);
        console.log('🔍 AuthContext: Session initialization completed');
      } catch (error) {
        console.warn('Failed to initialize session:', error);
        // Don't logout on session initialization error
        sessionInitializedRef.current = true;
        globalSessionInitialized = true;
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, []); // Empty dependency array - only run once

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login response:', data); // Debug log
        
        // Use the complete user data from backend
        const user: User = data.user;

        // Create new session for this login (now async)
        const session = await createUserSession(user.id, user.role);
        setSessionId(session.sessionId);

        // Store the access token for future API calls
        localStorage.setItem('access_token', data.access_token);

        setAuthState({
          user,
          isAuthenticated: true,
        });

        // Check for form state changes after successful login
        await checkFormNotificationsForUser(user.id);

        console.log(`✅ Login successful with session: ${session.sessionId}`);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    console.log('🚪 User logout - clearing session');
    
    try {
      // Save form state snapshot before logout
      if (authState.user?.id) {
        await formStateService.saveSnapshotOnLogout(authState.user.id);
      }
      
      // Clear session data (now async)
      await clearUserSession();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear form notifications on logout
    clearAllNotifications();
    
    // 🆕 ADD TTS AUDIO CLEANUP
    try {
      console.log('🔊 [LOGOUT] Stopping all TTS audio playback...');
      
      // Stop global audio queue
      const { globalAudioQueue } = await import('../utils/audioQueue');
      globalAudioQueue.stop();
      console.log('🔊 [LOGOUT] Global audio queue stopped');
      
      // Stop any direct audio playback
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      console.log('🔊 [LOGOUT] Direct audio elements stopped');
      
      // Clear any TTS-related localStorage
      const ttsKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('tts_') || 
        key.startsWith('audio_') ||
        key.startsWith('chatbot_audio_')
      );
      ttsKeys.forEach(key => localStorage.removeItem(key));
      console.log('🔊 [LOGOUT] TTS localStorage cleared');
      
    } catch (error) {
      console.error('🔊 [LOGOUT] Failed to cleanup TTS audio:', error);
    }
    
    setSessionId(null);
    
    // Clear the stored access token
    localStorage.removeItem('access_token');
    
    // Clear all localStorage data related to the app
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('adminease_') || key.startsWith('chatbot_') || key.startsWith('manager_') || key.startsWith('session_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear all sessionStorage data
    sessionStorage.clear();
    
    // Reset initialization flags for next login
    sessionInitializedRef.current = false;
    globalSessionInitialized = false;
    
    setAuthState({
      user: null,
      isAuthenticated: false,
    });
    
    console.log('🧹 All user data and session state cleared');
  };


  const refreshSession = () => {
    console.log('🔄 Refreshing session');
    const newSession = sessionService.refreshSession();
    if (newSession) {
      setSessionId(newSession.sessionId);
      console.log(`✅ Session refreshed: ${newSession.sessionId}`);
    }
  };

  // Form state notification functions
  const checkFormNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const notifications = await formStateService.checkChangesOnLogin(user.id);
      if (notifications.length > 0) {
        setFormNotifications(notifications);
        setShowFormNotifications(true);
      }
    } catch (error) {
      console.error('Failed to check form notifications:', error);
    }
  };

  const checkFormNotificationsForUser = async (userId: string) => {
    try {
      console.log(`🔍 Checking form notifications for user: ${userId}`);
      const notifications = await formStateService.checkChangesOnLogin(userId);
      console.log(`📋 Found ${notifications.length} notifications`);
      if (notifications.length > 0) {
        setFormNotifications(notifications);
        setShowFormNotifications(true);
        console.log(`🔔 Showing notifications:`, notifications);
      }
    } catch (error) {
      console.error('Failed to check form notifications:', error);
    }
  };

  const dismissFormNotifications = () => {
    setShowFormNotifications(false);
    // Don't clear notifications here - keep them for bell icon
  };

  const clearAllNotifications = () => {
    setFormNotifications([]);
    setShowFormNotifications(false);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await formStateService.markNotificationRead(notificationId);
      // Update local state to remove the notification
      setFormNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };


  // Don't render children until context is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading AdminEase</h2>
          <p className="text-gray-600">Initializing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      sessionId,
      refreshSession,
      formNotifications,
      showFormNotifications,
      checkFormNotifications,
      dismissFormNotifications,
      clearAllNotifications,
      markNotificationAsRead,
    }}>
      {children}
    </AuthContext.Provider>
  );
};