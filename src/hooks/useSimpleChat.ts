import { useState, useCallback } from 'react';
import { getApiUrl } from '../config/api';

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export interface SimpleChatHook {
  messages: ChatMessage[];
  sendMessage: (message: string, userInfo: any) => Promise<string>;
  clearMessages: () => void;
  isLoading: boolean;
}

export const useSimpleChat = (): SimpleChatHook => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string, userInfo: any): Promise<string> => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call chatbot API - exactly like HTML version
      const response = await fetch(getApiUrl('/chatbot/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          user_id: userInfo?.id || 'user_' + Date.now(),
          user_info: {
            role: userInfo?.role || 'Employee',
            user_type: userInfo?.user_type || 'employee',
            department_code: userInfo?.department_code || 'IT',
            employee_id: userInfo?.employee_id || userInfo?.employee_code || 'EMP001',
            employee_code: userInfo?.employee_code || 'EMP001',
            first_name: userInfo?.first_name || userInfo?.firstName || 'User',
            last_name: userInfo?.last_name || userInfo?.lastName || '',
            firstName: userInfo?.firstName || userInfo?.first_name || 'User',
            lastName: userInfo?.lastName || userInfo?.last_name || ''
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = data.response || data.message || "I'm here to help! How can I assist you today?";
        
        // Add bot message
        const botMessage: ChatMessage = {
          id: Date.now() + 1,
          text: botResponse,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        
        setMessages(prev => [...prev, botMessage]);
        return botResponse;
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = "I'm having trouble connecting to the AI service. Please try again.";
      
      // Add error message as bot message
      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessages(prev => [...prev, botMessage]);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
  };
};

