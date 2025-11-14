import React, { useState, useRef, useEffect } from 'react';
import { X, Send, HelpCircle, FileText, Clock, Mic, MicOff, ChevronDown, RefreshCw, Volume2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CHATBOT_CONFIG } from '../../services/chatbotConfig';
import { useSimpleChat } from '../../hooks/useSimpleChat';
import { useTTS } from '../../hooks/useTTS';


// TypeScript declaration for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

const ChatbotWidget: React.FC = () => {
  const { user, sessionId, refreshSession } = useAuth();
  const { messages, sendMessage, clearMessages, isLoading } = useSimpleChat();
  const { generateAndPlayTTS, generateTTS, playAudioWithoutBlob, stopAudio, isGenerating: isTTSGenerating } = useTTS();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const previousSessionIdRef = useRef<string | null>(null);
  
  // TTS Settings - Manual trigger only (via Replay button)
  const ttsEnabled = true;
  const selectedVoice = 'en-US-Chirp3-HD-Charon';
  const selectedAudioFormat = 'MP3';
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { icon: FileText, text: 'Help with forms', action: 'forms' },
    { icon: Clock, text: 'Track request status', action: 'status' },
    { icon: HelpCircle, text: 'HR Policies', action: 'hr' },
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear chatbot state when session changes (new login)
  useEffect(() => {
    if (sessionId && sessionId !== previousSessionIdRef.current) {
      console.log('🔄 New session detected in ChatbotWidget, clearing state');
      
      // Clear all chatbot state
      clearMessages();
      setInputText('');
      setInterimTranscript('');
      setShowQuickActions(false);
      
      // Stop any playing audio
      stopAudio();
      
      // Clear audio queue
      import('../../utils/audioQueue').then(({ globalAudioQueue }) => {
        globalAudioQueue.clear();
        console.log('🔊 [AUDIO QUEUE] Cleared audio queue for new session');
      }).catch(error => {
        console.error('🔊 [AUDIO QUEUE] Failed to clear audio queue:', error);
      });
      
      // Update previous session ID
      previousSessionIdRef.current = sessionId;
      
      console.log('✅ ChatbotWidget state cleared for new session');
    }
  }, [sessionId, clearMessages, stopAudio]);



  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsListening(true);
      };

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputText(prev => prev + finalTranscript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimTranscript);
        }
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognitionInstance;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // Refresh chat - simple version
  const handleRefresh = () => {
    clearMessages();
    setInputText('');
    setInterimTranscript('');
    setShowQuickActions(false);
    stopAudio();
    
    if (isListening) {
      stopListening();
    }
    
    refreshSession();
  };

  // Send message - NO auto TTS generation
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Stop any playing audio before sending new message
    stopAudio();
    
    const messageText = inputText.trim();
    setInputText('');
    
    try {
      // Get user info with fallbacks
      const userInfo = {
        id: user?.id || 'guest_user',
        role: user?.role || 'Employee',
        user_type: user?.user_type || 'employee',
        department_code: user?.department?.department_code || 'IT',
        employee_id: (user as any)?.profile?.employee_id || 'EMP001',
        employee_code: (user as any)?.profile?.employee_code || 'EMP001',
        first_name: (user as any)?.profile?.first_name || 'User',
        last_name: (user as any)?.profile?.last_name || '',
        firstName: (user as any)?.profile?.first_name || 'User',
        lastName: (user as any)?.profile?.last_name || '',
      };
      
      // Send message and get response
      const botResponse = await sendMessage(messageText, userInfo);
      
      // Auto TTS generation (like HTML version)
      console.log('🔊 [AUTO TTS DEBUG] Bot response:', botResponse);
      console.log('🔊 [AUTO TTS DEBUG] TTS enabled:', ttsEnabled);
      console.log('🔊 [AUTO TTS DEBUG] Response length:', botResponse?.length);
      
      if (botResponse && botResponse.trim() && ttsEnabled) {
        console.log('🔊 [AUTO TTS DEBUG] Starting TTS generation...');
        try {
          await generateAndPlayTTS(botResponse, {
            voice: selectedVoice,
            audioFormat: selectedAudioFormat,
            modelName: 'gemini-2.5-flash-tts',
            languageCode: 'en-US'
          });
          console.log('🔊 [AUTO TTS DEBUG] TTS generation completed');
        } catch (error) {
          console.error('🔊 [AUTO TTS DEBUG] TTS generation failed:', error);
        }
      } else {
        console.log('🔊 [AUTO TTS DEBUG] TTS skipped - conditions not met');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };



  // Handle TTS replay for bot messages
  const handleReplayMessage = async (messageText: string) => {
    if (!messageText.trim() || !ttsEnabled) return;
    
    try {
      const ttsResult = await generateTTS(messageText, {
        voice: selectedVoice,
        audioFormat: selectedAudioFormat,
        modelName: 'gemini-2.5-flash-tts',
        languageCode: 'en-US'
      });
      
      if (ttsResult.success && ttsResult.audio_data) {
        // Use playAudioWithoutBlob to avoid showing download/volume icons
        playAudioWithoutBlob(ttsResult.audio_data, selectedAudioFormat);
      }
    } catch (error) {
      console.error('TTS replay failed:', error);
    }
  };

  // Handle quick actions - NO auto TTS generation
  const handleQuickAction = async (action: string) => {
    if (isLoading) return;
    
    stopAudio();
    
    const actionMessage = action === 'forms' ? 'I need help with forms' : 
                         action === 'status' ? 'I want to track my request status' :
                         action === 'hr' ? 'I need help with HR policies' : 
                         'I need help';
    
    try {
      const userInfo = {
        id: user?.id,
        role: user?.role,
        user_type: user?.user_type,
        department_code: user?.department?.department_code,
        employee_id: (user as any)?.profile?.employee_id,
        employee_code: (user as any)?.profile?.employee_code,
        first_name: (user as any)?.profile?.first_name,
        last_name: (user as any)?.profile?.last_name,
        firstName: (user as any)?.profile?.first_name,
        lastName: (user as any)?.profile?.last_name,
      };
      
      // Send message and get response
      const botResponse = await sendMessage(actionMessage, userInfo);
      
      // Auto TTS generation (like HTML version)
      if (botResponse && botResponse.trim() && ttsEnabled) {
        await generateAndPlayTTS(botResponse, {
          voice: selectedVoice,
          audioFormat: selectedAudioFormat,
          modelName: 'gemini-2.5-flash-tts',
          languageCode: 'en-US'
        });
      }
    } catch (error) {
      console.error('Error with quick action:', error);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Enhanced Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl transform hover:scale-110 relative overflow-hidden ${
          isOpen 
            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rotate-180' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-2xl'
        } ${!isOpen ? 'hover:animate-pulse' : ''}`}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {isOpen ? (
          <X className="h-7 w-7 transition-transform duration-300 relative z-10" />
        ) : (
          <div className="relative z-10">
            <img 
              src={CHATBOT_CONFIG.avatarUrl} 
              alt="Robot Assistant" 
              className="h-10 w-10 transition-transform duration-300 object-contain"
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white shadow-lg"></div>
          </div>
        )}
      </button>

      {/* Enhanced Chat Window */}
      {isOpen && (
        <div className="absolute right-0 bottom-24 w-[450px] h-[600px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 flex flex-col animate-slideUp relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/30"></div>
          
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-5 rounded-t-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
            <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <img 
                  src={CHATBOT_CONFIG.avatarUrl} 
                  alt="Robot Assistant" 
                      className="h-6 w-6 object-contain"
                />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{CHATBOT_CONFIG.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                      <p className="text-sm text-blue-100 font-medium">{CHATBOT_CONFIG.statusText}</p>
                    </div>
                    {sessionId && (
                      <p className="text-xs text-blue-200 mt-1 font-mono">
                        Session: {sessionId.split('_')[1]?.substring(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Enhanced Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 group backdrop-blur-sm"
                  title="Start new conversation"
                >
                  <RefreshCw className="h-5 w-5 text-blue-100 group-hover:text-white transition-colors" />
                </button>
                
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 group backdrop-blur-sm"
                  title="Close chat"
                >
                  <X className="h-5 w-5 text-blue-100 group-hover:text-white transition-colors" />
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={chatMessagesRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50 relative"
          >
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="mb-4">
                    <img 
                      src={CHATBOT_CONFIG.avatarUrl} 
                      alt="Robot Assistant" 
                      className="h-16 w-16 mx-auto object-contain opacity-50"
                    />
                  </div>
                  <p className="text-sm">Welcome! How can I help you today?</p>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[85%] text-sm transition-all duration-300 relative ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md p-4 shadow-lg hover:shadow-xl'
                      : 'bg-white border-2 border-gray-200 text-gray-800 rounded-bl-md p-4 shadow-lg'
                  }`}
                >
                  <p className="font-medium leading-relaxed whitespace-pre-wrap">
                    {message.text}
                  </p>
                  
                  {/* TTS Replay Button for Bot Messages */}
                  {message.sender === 'bot' && message.text && ttsEnabled && (
                    <button
                      onClick={() => handleReplayMessage(message.text)}
                      className="mt-2 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                      title="Replay audio"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>Replay</span>
                    </button>
                  )}
                  
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white border-2 border-gray-200 rounded-bl-md p-4 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-blue-600 font-medium">Processing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Dropdown */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center justify-between w-full px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md border border-slate-200"
              >
                <span className="font-medium">Quick Actions</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showQuickActions ? 'rotate-180' : ''}`} />
              </button>
              
              {showQuickActions && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleQuickAction(action.action);
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-slate-100 text-slate-600 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <action.icon className="h-4 w-4" />
                      <span>{action.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>


          {/* Enhanced Input */}
          <div className="p-6 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm rounded-b-3xl">
            {/* Enhanced STT Status Indicator */}
            {isListening && (
              <div className="mb-3 p-3 bg-red-50/80 border border-red-200/50 rounded-xl shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
                  <span className="text-sm text-red-700 font-semibold">Listening...</span>
                </div>
                {interimTranscript && (
                  <p className="text-sm text-red-600 mt-2 italic font-medium">"{interimTranscript}"</p>
                )}
              </div>
            )}
            
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText + interimTranscript}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isListening ? "Listening..." : "Type your message or use voice..."}
                  className="w-full px-4 py-3 pr-12 border border-gray-300/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm focus:bg-white shadow-sm hover:shadow-md"
                  disabled={isLoading}
                />
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700'
                  }`}
                  title={isListening ? "Stop recording" : "Start voice input"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
              
              
              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputText.trim() && !interimTranscript)}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {/* TTS Status Indicator - Only shows when user clicks Replay */}
            {isTTSGenerating && (
              <div className="mt-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm text-green-700 font-medium">
                    Generating audio...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;