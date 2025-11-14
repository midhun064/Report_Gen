import React, { useState, useRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { Send, Volume2, Download, Plus, Paperclip, Link, Mail, X, Upload, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getChatbotConfig } from '../../services/roleBasedChatbotService';
import { AvatarState } from '../../hooks/useAvatarState';
import { useStreamingChat } from '../../hooks/useStreamingChat';
import { useTTS } from '../../hooks/useTTS';
import { getSessionId, saveChatMessage } from '../../services/sessionService';
import { globalAudioQueue } from '../../utils/audioQueue';
import ThinkingAnimation from './ThinkingAnimation';
import ChartDisplay from './ChartDisplay';
import FileChip from './FileChip';
import GoogleSheetChip from './GoogleSheetChip';
import { excelChatService, ChartData, UploadedFile } from '../../services/excelChatService';


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

interface ChatbotPanelProps {
  onAvatarStateChange: (state: AvatarState) => void;
  // Optional: when rendered on Manager Dashboard, pass recent forms and trigger flag
  managerRecentForms?: Array<{ request_id: number|string; form_type: string; employee_name: string; created_at?: string }>;
  announceManagerRecent?: boolean;
  // New: auto ask pending count on mount for manager
  autoAskPendingOnMount?: boolean;
}

export interface ChatbotHandle {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
}

// Memoized Message Component to prevent re-renders
const MessageItem = React.memo(({ message, parseMessageWithHyperlink, onReplayMessage, ttsEnabled }: { 
  message: any; 
  parseMessageWithHyperlink: (text: string) => React.ReactNode;
  onReplayMessage: (text: string) => void;
  ttsEnabled: boolean;
}) => {
  // Check if approval button should be shown
  const shouldShowButton = message.sender === 'bot' && 
                          message.text && 
                          (message.showApprovalButton || message.text.includes('👇'));
  
  console.log('🔍 MessageItem render:', {
    id: message.id,
    sender: message.sender,
    hasText: !!message.text,
    showApprovalButton: message.showApprovalButton,
    hasEmoji: message.text?.includes('👇'),
    shouldShowButton,
    messageText: message.text?.substring(0, 50) + '...'
  });
  
  return (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
    >
      {message.sender === 'bot' ? (
        <div className="flex items-start space-x-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[10px] sm:text-xs font-bold flex-shrink-0">
            CSO
          </div>
          <div className="max-w-[85%] sm:max-w-[85%] text-xs sm:text-sm transition-all duration-300 relative bg-transparent text-gray-800">
            <div className="font-medium leading-relaxed">
              {parseMessageWithHyperlink(message.text)}
              {message.isStreaming && (!message.text || message.text.trim() === '') && (
                <ThinkingAnimation isActive={true} />
              )}
            </div>
            
            {/* Approval Button */}
            {shouldShowButton && (
              <button
                onClick={() => {
                  console.log('🔘 Approval button clicked!');
                  
                  // Try multiple selectors to find the approval panel
                  const selectors = [
                    '#approval-panel',
                    '[data-approval-panel]',
                    '.approval-section',
                    '#approval-table-section',
                    '.approval-table',
                    'table[class*="approval"]'
                  ];
                  
                  let approvalPanel = null;
                  for (const selector of selectors) {
                    approvalPanel = document.querySelector(selector);
                    if (approvalPanel) {
                      console.log(`✅ Found approval panel with selector: ${selector}`);
                      break;
                    }
                  }
                  
                  if (approvalPanel) {
                    console.log('✅ Scrolling to approval panel');
                    // Add a small delay to ensure the element is rendered
                    setTimeout(() => {
                      approvalPanel.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start',
                        inline: 'nearest'
                      });
                      
                      // Add a highlight effect
                      const panelElement = approvalPanel as HTMLElement;
                      panelElement.style.transition = 'box-shadow 0.3s ease';
                      panelElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                      setTimeout(() => {
                        panelElement.style.boxShadow = '';
                      }, 2000);
                    }, 100);
                  } else {
                    console.warn('⚠️ No approval panel found with any selector');
                    console.log('Available elements with "approval" in class or id:', 
                      Array.from(document.querySelectorAll('*')).filter(el => 
                        el.id?.includes('approval') || 
                        el.className?.includes('approval')
                      ).map(el => ({ id: el.id, className: el.className, tagName: el.tagName }))
                    );
                  }
                }}
                className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium"
              >
                <span>Go to Approval Panel</span>
                <span className="text-lg">👇</span>
              </button>
            )}
            
            {/* TTS Replay Button for Bot Messages */}
            {message.sender === 'bot' && message.text && ttsEnabled && (
              <button
                onClick={() => onReplayMessage(message.text)}
                className="mt-1 sm:mt-2 px-2 sm:px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-[10px] sm:text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                title="Replay audio"
              >
                <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Replay</span>
              </button>
            )}
            
            <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-gray-500">{message.timestamp}</p>
          </div>
        </div>
      ) : (
        <div className="max-w-[85%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl text-xs sm:text-sm shadow-sm transition-all duration-300 hover:shadow-md relative bg-sky-600 text-white rounded-br-md">
          <p className="font-medium leading-relaxed whitespace-pre-wrap">{message.text}</p>
          <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-sky-100">{message.timestamp}</p>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if message content actually changed
  // Return true if props are the same (prevent re-render), false if different (allow re-render)
  const isSameMessage = (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.message.showApprovalButton === nextProps.message.showApprovalButton &&
    prevProps.message.timestamp === nextProps.message.timestamp &&
    prevProps.ttsEnabled === nextProps.ttsEnabled
  );
  
  // Also check if callback functions are the same (shallow comparison)
  const isSameCallbacks = (
    prevProps.parseMessageWithHyperlink === nextProps.parseMessageWithHyperlink &&
    prevProps.onReplayMessage === nextProps.onReplayMessage
  );
  
  // Only re-render if something actually changed
  return isSameMessage && isSameCallbacks;
});

MessageItem.displayName = 'MessageItem';

const ChatbotPanel = React.forwardRef<ChatbotHandle, ChatbotPanelProps>(({ onAvatarStateChange, announceManagerRecent, autoAskPendingOnMount }, ref) => {
  console.log('🔍 ChatbotPanel: Component rendering');
  
  // Safety check for AuthProvider context
  let user, sessionId;
  try {
    const authContext = useAuth();
    user = authContext.user;
    sessionId = authContext.sessionId;
    console.log('🔍 ChatbotPanel: useAuth result:', { user: !!user, sessionId: !!sessionId });
  } catch (error) {
    console.error('🔍 ChatbotPanel: AuthProvider not available:', error);
    // Instead of showing error, show a loading state and retry
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p>Initializing chatbot...</p>
      </div>
    );
  }
  const { messages, sendStreamingMessage, addMessage, updateStreamingMessage, finishStreaming, clearMessages } = useStreamingChat();
  const { generateTTS, playAudio, playAudioWithoutBlob, playCurrentAudio, downloadAudio, stopAudio, isGenerating: isTTSGenerating, currentAudioBlob } = useTTS();
  
  // Initialize audio queue with text synchronization and finish callback
  useEffect(() => {
    globalAudioQueue.setTextUpdateCallback((textLength: number) => {
      console.log('🔊 [AUDIO SYNC] Text length updated:', textLength);
    });
    
    // Set callback for when audio queue finishes (returns avatar to greeting state)
    globalAudioQueue.setOptions({
      onQueueEmpty: () => {
        console.log('🎭 [AVATAR STATE] Audio queue empty - returning to greeting state');
        onAvatarStateChange('greeting');
      }
    });
    
    // Warm up audio context for autoplay (browser autoplay policy workaround)
    // Play a silent audio to unlock autoplay for TTS
    console.log('🔊 [AUDIO INIT] Warming up audio context for autoplay');
    const warmupAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T8AAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
    warmupAudio.volume = 0.01; // Nearly silent
    warmupAudio.play().then(() => {
      console.log('🔊 [AUDIO INIT] Audio context warmed up successfully');
    }).catch(error => {
      console.warn('🔊 [AUDIO INIT] Could not warm up audio context:', error);
    });
  }, [onAvatarStateChange]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(['Request leave', 'Book meeting room', 'Report IT issue', 'Update info']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('en-US-Chirp3-HD-Charon');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('MP3');
  const [isStoppingAudio, setIsStoppingAudio] = useState(false);
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [googleSheetsLink, setGoogleSheetsLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [excelSessionId, setExcelSessionId] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [excelFiles, setExcelFiles] = useState<string[]>([]);
  const [isExcelMode, setIsExcelMode] = useState(false);
  const [googleSheetUrls, setGoogleSheetUrls] = useState<string[]>([]);
  const [detectedGoogleSheetUrls, setDetectedGoogleSheetUrls] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isManagerRole = (roleVal: unknown) => {
    const r = String(roleVal || '').toLowerCase();
    return r.includes('manager') || r.includes('lead') || r.includes('supervisor') || 
           r.includes('hr') || r.includes('it support') || r.includes('it') || 
           r.includes('finance') || r.includes('operations');
  };

  // Auto-scroll the messages container (not the whole page) to the bottom
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // Use smooth scroll to bottom
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Clear chatbot state when session changes (new login)
  useEffect(() => {
    if (sessionId && sessionId !== previousSessionIdRef.current) {
      console.log('🔄 New session detected, clearing chatbot state');
      
      // Clear all chatbot state
      clearMessages();
      setInputText('');
      setInterimTranscript('');
      setSuggestions(['Request leave', 'Book meeting room', 'Report IT issue', 'Update info']);
      setIsProcessing(false);
      setIsListening(false);
      setIsStoppingAudio(false);
      setShowAttachmentPanel(false);
      setShowLinkPanel(false);
      setGoogleSheetsLink('');
      setSelectedFile(null);
      
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
      
      console.log('✅ Chatbot state cleared for new session');
    }
  }, [sessionId, clearMessages, stopAudio]);

  // Function to parse message text and make "[View Approvals]" clickable
  const parseMessageWithHyperlink = useCallback((text: string) => {
    // Parse the text into structured elements (bullet lists and paragraphs)
    const lines = text.split('\n');
    const formattedElements: React.ReactNode[] = [];
    let currentListItems: string[] = [];
    let elementKey = 0;

    lines.forEach((line) => {
      // Check if line starts with "- " (bullet point)
      if (line.trim().startsWith('- ')) {
        currentListItems.push(line.trim().substring(2)); // Remove "- "
      } else if (line.trim() === '' && currentListItems.length > 0) {
        // Empty line after list items - render the accumulated list
        formattedElements.push(
          <ul key={`list-${elementKey++}`} className="list-disc list-inside space-y-1 my-2 ml-2" style={{listStyleType: 'disc', listStylePosition: 'inside'}}>
            {currentListItems.map((item, i) => (
              <li key={i} className="text-gray-800" style={{marginLeft: '8px'}}>
                {item.includes('[View Approvals]') ? parseHyperlink(item) : item}
              </li>
            ))}
          </ul>
        );
        currentListItems = [];
      } else {
        // Flush any pending list items before adding regular text
        if (currentListItems.length > 0) {
          formattedElements.push(
            <ul key={`list-${elementKey++}`} className="list-disc list-inside space-y-1 my-2 ml-2" style={{listStyleType: 'disc', listStylePosition: 'inside'}}>
              {currentListItems.map((item, i) => (
                <li key={i} className="text-gray-800" style={{marginLeft: '8px'}}>
                  {item.includes('[View Approvals]') ? parseHyperlink(item) : item}
                </li>
              ))}
            </ul>
          );
          currentListItems = [];
        }
        
        // Add regular text line (skip completely empty lines)
        if (line.trim()) {
          formattedElements.push(
            <p key={`text-${elementKey++}`} className="mb-2">
              {line.includes('[View Approvals]') ? parseHyperlink(line) : line}
            </p>
          );
        }
      }
    });
    
    // Flush any remaining list items at the end
    if (currentListItems.length > 0) {
      formattedElements.push(
        <ul key={`list-final-${elementKey++}`} className="list-disc list-inside space-y-1 my-2 ml-2" style={{listStyleType: 'disc', listStylePosition: 'inside'}}>
          {currentListItems.map((item, i) => (
            <li key={i} className="text-gray-800" style={{marginLeft: '8px'}}>
              {item.includes('[View Approvals]') ? parseHyperlink(item) : item}
            </li>
          ))}
        </ul>
      );
    }
    
    return <>{formattedElements}</>;
  }, []); // Empty dependency array - function doesn't depend on any props/state

  const parseHyperlink = (text: string) => {
    if (!text.includes('[View Approvals]')) {
      return text;
    }

    const parts = text.split('[View Approvals]');
    
    return (
      <>
        {parts[0]}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const approvalTable = document.getElementById('approval-table-section');
            if (approvalTable) {
              approvalTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
              console.log('✅ Scrolled to approval table');
            } else {
              console.warn('⚠️ Approval table section not found');
            }
          }}
          className="text-blue-600 hover:text-blue-800 font-medium underline hover:no-underline transition-all duration-200 ease-in-out cursor-pointer"
        >
          View Approvals
        </a>
        {parts[1] || ''}
      </>
    );
  };

  // Handle file selection - Enhanced for multiple files and data analysis
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types - support Excel, CSV, and other data files
    const supportedExtensions = ['.csv', '.xlsx', '.xls', '.ods'];
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = supportedExtensions.includes(extension) ||
                         file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         file.type === 'application/vnd.ms-excel' ||
                         file.type === 'text/csv';
      
      if (isValidType) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`⚠️ Unsupported file types: ${invalidFiles.join(', ')}. Please upload CSV, XLSX, XLS, or ODS files.`);
    }

    // Queue valid files for processing
    if (validFiles.length > 0) {
      setQueuedFiles(prev => [...prev, ...validFiles]);
      setIsExcelMode(true);
      setShowAttachmentPanel(false);
      console.log('📎 Files queued for analysis:', validFiles.map(f => f.name));
    }

    // Reset the file input
    event.target.value = '';
  };

  // Handle Google Sheets link submission - Queue URLs for processing
  const handleLinkSubmit = () => {
    if (googleSheetsLink.trim()) {
      // Use ExcelChat service validation
      if (excelChatService.isGoogleSheetsUrl(googleSheetsLink)) {
        // Add to Google Sheets URLs queue
        setGoogleSheetUrls(prev => {
          if (!prev.includes(googleSheetsLink)) {
            return [...prev, googleSheetsLink];
          }
          return prev;
        });
        
        setGoogleSheetsLink('');
        setShowLinkPanel(false);
        setShowAttachmentPanel(false);
        setIsExcelMode(true);
        console.log('🔗 Google Sheets URL queued:', googleSheetsLink);
      } else {
        alert('Please enter a valid Google Sheets link');
      }
    }
  };

  // Handle email attachment (dummy)
  const handleEmailAttachment = () => {
    setInputText(prev => prev + '[Email Attachment: dummy@example.com] ');
    setShowAttachmentPanel(false);
    console.log('📧 Dummy email attachment added');
  };

  // Remove file from queue
  const handleRemoveFile = (filename: string) => {
    setQueuedFiles(prev => prev.filter(file => file.name !== filename));
    console.log('🗑️ File removed from queue:', filename);
  };

  // Remove Google Sheet URL from queue
  const handleRemoveGoogleSheet = (url: string) => {
    setGoogleSheetUrls(prev => prev.filter(u => u !== url));
    setDetectedGoogleSheetUrls(prev => prev.filter(u => u !== url));
    console.log('🗑️ Google Sheet URL removed:', url);
  };

  // Handle input text change and detect Google Sheets URLs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    
    // Check if the input contains Google Sheets URLs
    const lines = newText.split('\n');
    const urls: string[] = [];
    let remainingText = '';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (excelChatService.isGoogleSheetsUrl(trimmed)) {
        urls.push(trimmed);
      } else if (trimmed) {
        remainingText += (remainingText ? '\n' : '') + line;
      }
    });
    
    if (urls.length > 0) {
      setDetectedGoogleSheetUrls(prev => {
        const newUrls = urls.filter(url => !prev.includes(url) && !googleSheetUrls.includes(url));
        return [...prev, ...newUrls];
      });
      setInputText(remainingText); // Keep non-URL text
      console.log('🔗 Google Sheets URLs detected:', urls);
    }
  };

  // Close attachment panel when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.attachment-panel') && !target.closest('.attachment-button')) {
      setShowAttachmentPanel(false);
      setShowLinkPanel(false);
    }
  }, []);

  useEffect(() => {
    if (showAttachmentPanel || showLinkPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAttachmentPanel, showLinkPanel, handleClickOutside]);

  // Debug: Monitor suggestion state changes
  useEffect(() => {
    console.log('🔍 [STATE DEBUG] Suggestions state changed:', {
      count: suggestions.length,
      suggestions: suggestions,
      willRenderUI: suggestions.length > 0
    });
  }, [suggestions]);


  // Quick actions removed


  // Removed handleFormUpdate - form is now self-contained

  // Track if welcome message has been sent in this component instance
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const hasAskedPendingRef = useRef(false);

  // Initialize session when user is available
  useEffect(() => {
    if (user && !hasWelcomed) {
      // For managers with recent announcement enabled, avoid duplicate welcome
      const shouldSkipWelcome = Boolean(announceManagerRecent && isManagerRole(user.role));
      if (!shouldSkipWelcome) {
        sendWelcomeMessage();
      }
      onAvatarStateChange('greeting');
      setHasWelcomed(true);
    } else if (user && hasWelcomed) {
      onAvatarStateChange('idle');
    } else if (!user) {
      onAvatarStateChange('greeting');
      setHasWelcomed(false);
    }
  }, [user, onAvatarStateChange, hasWelcomed, announceManagerRecent]);


  // Approver-specific: announce recent, non-duplicate submissions once per login
  useEffect(() => {
    // ENABLED: automatic greetings on approver login (Manager, IT Support, HR, Finance, Operations)
    if (!announceManagerRecent) return;
    if (!user || !isManagerRole(user.role)) return;
    if (hasWelcomed) return;
    
    // Trigger automatic greeting
    const triggerGreeting = async () => {
      try {
        const sessionId = getSessionId();
        const userInfo = {
          user_id: user?.id,
          firstName: (user as any)?.profile?.first_name || '',
          lastName: (user as any)?.profile?.last_name || '',
          role: user?.role || 'Manager',
          department: user?.department || 'Unknown'
        };
        
        // Get the appropriate chatbot endpoint based on user role
        const chatbotConfig = getChatbotConfig(user);
        const greetingEndpoint = chatbotConfig.webhookUrl.replace('/chat', '/login-greeting');
        
        // Call the login greeting endpoint
        const response = await fetch(greetingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify({
            user_id: user?.id,
            user_info: userInfo
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.greeting) {
            // Add greeting to chat
            addMessage({
              text: data.greeting,
              sender: 'bot',
              isStreaming: false,
            });
            setHasWelcomed(true);
            onAvatarStateChange('speaking');
        }
      }
    } catch (error) {
        console.error('Failed to get login greeting:', error);
      }
    };
    
    triggerGreeting();
  }, [announceManagerRecent, user, onAvatarStateChange, hasWelcomed]);

  // Auto-trigger: ask for pending forms count on mount for approvers (Manager, IT Support, HR, Finance, Operations)
  useEffect(() => {
    const run = async () => {
      console.log('🔍 Auto-trigger check:', {
        autoAskPendingOnMount,
        user: !!user,
        hasAsked: hasAskedPendingRef.current,
        isApproverRole: isManagerRole(user?.role),
        userRole: user?.role
      });
      
      if (!autoAskPendingOnMount) {
        console.log('❌ Auto-trigger disabled');
        return;
      }
      if (!user || hasAskedPendingRef.current) {
        console.log('❌ User not ready or already asked');
        return;
      }
      if (!isManagerRole(user.role)) {
        console.log('❌ Not an approver role (Manager, IT Support, HR, Finance, Operations)');
        return;
      }
      
      console.log('✅ Triggering automatic greeting for approver role:', user.role);
      hasAskedPendingRef.current = true;

      // Trigger automatic greeting
      onAvatarStateChange('listening');

      try {
        // Send automatic greeting request
        const sessionId = getSessionId();
        const userInfo = {
          user_id: user?.id,
          role: user?.role,
          user_type: user?.user_type,
          department_code: user?.department?.department_code,
          employee_id: (user as any)?.profile?.employee_id,
          employee_code: (user as any)?.profile?.employee_code,
          first_name: (user as any)?.profile?.first_name,
          last_name: (user as any)?.profile?.last_name,
          firstName: (user as any)?.profile?.first_name, // For manager chatbot compatibility
          lastName: (user as any)?.profile?.last_name,   // For manager chatbot compatibility
        };

        // Use hr_id for HR users, otherwise use user_id
        const userRole = String(user?.role || '').toUpperCase();
        const managerId = userRole === 'HR' ? (user as any)?.profile?.hr_id || user?.id : user?.id;
        
        // Call with auto_greeting flag
        const chatbotConfig = getChatbotConfig(user);
        console.log(`🚀 Making API call to ${chatbotConfig.streamUrl} with auto_greeting:`, {
          user_id: managerId,
          user_info: userInfo,
          auto_greeting: true
        });
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('⏰ Request timeout - aborting after 30 seconds');
          controller.abort();
        }, 30000); // 30 second timeout (increased for Gemini API calls)
        
        try {
          // Use streaming endpoint for greeting
          console.log('🌊 Using streaming endpoint for greeting');
          
          // Add "thinking" message with context-aware animation (greeting)
          const thinkingMessageId = addMessage({
            text: '',
            sender: 'bot',
            isStreaming: true,
          });
          
          console.log('💭 Added thinking animation message:', thinkingMessageId);
          
          // Get the appropriate chatbot endpoint based on user role
          const chatbotConfig = getChatbotConfig(user);
          
          const mgrResp = await fetch(chatbotConfig.streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify({
              user_id: managerId,
              message: '', // Empty message for auto greeting
            user_info: userInfo,
              auto_greeting: true, // This triggers the greeting
          }),
            signal: controller.signal
        });
          
          clearTimeout(timeoutId);
          console.log('✅ Streaming API call completed with status:', mgrResp.status);

        if (!mgrResp.ok) {
            console.error('❌ HTTP error response:', mgrResp.status, mgrResp.statusText);
            const errorText = await mgrResp.text();
            console.error('❌ Error response body:', errorText);
          throw new Error(`HTTP error! status: ${mgrResp.status}`);
        }

          // Handle streaming response
          console.log('📨 Processing streaming response...');
        const reader = mgrResp.body?.getReader();
          const decoder = new TextDecoder();
          
        if (!reader) {
            console.error('❌ No reader available');
            return;
        }

          // Use the thinking message for streaming (already created above)
        const botMessageId = thinkingMessageId;
          console.log('✅ Using thinking message for streaming with ID:', botMessageId);
          
        let fullText = '';
        let buffer = ''; // Buffer for incomplete SSE messages

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk; // Add to buffer
            
            // Split by SSE message delimiter (\n\n)
            const messages = buffer.split('\n\n');
            
            // Keep the last incomplete message in buffer
            buffer = messages.pop() || '';
            
            // Process complete messages
            for (const message of messages) {
              const lines = message.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.substring(6);
                  if (dataStr === '[DONE]') {
                    console.log('✅ Streaming complete');
                    break;
                  }
                  
                  try {
                    const data = JSON.parse(dataStr);
                    
                    if (data.content) {
                      fullText += data.content;
                      // Update the streaming message
                      updateStreamingMessage(botMessageId, fullText);
                    } else if (data.type === 'suggestions' && data.suggestions) {
                      // Update suggestions dynamically
                      console.log('💡 Received dynamic suggestions:', data.suggestions);
                      setSuggestions(data.suggestions);
                    } else if (data.type === 'complete') {
                      // Finish streaming
                    finishStreaming(botMessageId);
                    
                    } else if (data.type === 'tts_chunk') {
                      // Handle streaming TTS chunks from parallel TTS system
                      console.log('🔊 [APPROVER STREAMING TTS] Received TTS chunk from backend');
                      console.log('🔊 [APPROVER STREAMING TTS] Chunk index:', data.chunk_index);
                      console.log('🔊 [APPROVER STREAMING TTS] Audio data present:', !!data.audio_data);
                      console.log('🔊 [APPROVER STREAMING TTS] Audio format:', data.audio_format);
                      console.log('🔊 [APPROVER STREAMING TTS] Text:', data.text);
                      console.log('🔊 [APPROVER STREAMING TTS] TTS Enabled:', ttsEnabled);
                      
                      // Only play TTS if enabled
                      if (!ttsEnabled) {
                        console.log('🔊 [APPROVER STREAMING TTS] TTS is disabled - skipping audio playback');
                      } else if (data.audio_data && data.audio_format) {
                        console.log('🔊 [SEQUENTIAL TTS] Adding TTS chunk to audio queue');
                        // Import and use the global audio queue for sequential playback
                        import('../../utils/audioQueue').then(({ globalAudioQueue }) => {
                          const chunkId = globalAudioQueue.enqueue(
                            data.audio_data,
                            data.audio_format,
                            data.text || '',
                            data.chunk_index || 0
                          );
                          console.log('🔊 [SEQUENTIAL TTS] Audio chunk queued with ID:', chunkId);
                          
                          // Update avatar state to speaking when first chunk is queued
                          if (data.chunk_index === 0) {
                            onAvatarStateChange('speaking');
                            // Set up a listener for when all audio finishes
                            // This is a simple approach - in a production app you might want more sophisticated state management
                            setTimeout(() => {
                              onAvatarStateChange('greeting');
                            }, 5000); // Fallback timeout
                          }
                        }).catch(error => {
                          console.error('🔊 [SEQUENTIAL TTS] Failed to import audio queue:', error);
                        });
                      } else {
                        console.log('🔊 [APPROVER STREAMING TTS] Missing audio data or format in TTS chunk');
                      }
                    } else if (data.type === 'tts') {
                      // Handle complete TTS data (fallback) from backend for approver auto-greeting
                      console.log('🔊 [APPROVER AUTO-GREETING TTS] Received complete TTS data from backend');
                      console.log('🔊 [APPROVER AUTO-GREETING TTS] TTS data keys:', Object.keys(data));
                      console.log('🔊 [APPROVER AUTO-GREETING TTS] Audio data present:', !!data.audio_data);
                      console.log('🔊 [APPROVER AUTO-GREETING TTS] Audio format:', data.audio_format);
                      console.log('🔊 [APPROVER AUTO-GREETING TTS] Audio data length:', data.audio_data ? data.audio_data.length : 0);
                      console.log('🔊 [APPROVER AUTO-GREETING TTS] TTS Enabled:', ttsEnabled);
                      
                      // Only play TTS if enabled
                      if (!ttsEnabled) {
                        console.log('🔊 [APPROVER AUTO-GREETING TTS] TTS is disabled - skipping audio playback');
                      } else if (data.audio_data && data.audio_format) {
                        console.log('🔊 [SEQUENTIAL TTS] Adding complete TTS to audio queue');
                        // Import and use the global audio queue for sequential playback
                        import('../../utils/audioQueue').then(({ globalAudioQueue }) => {
                          const chunkId = globalAudioQueue.enqueue(
                            data.audio_data,
                            data.audio_format,
                            'Complete TTS (fallback)',
                            0
                          );
                          console.log('🔊 [SEQUENTIAL TTS] Complete TTS queued with ID:', chunkId);
                          
                          // Update avatar state
                          onAvatarStateChange('speaking');
                          setTimeout(() => {
                            onAvatarStateChange('greeting');
                          }, 5000); // Fallback timeout
                        }).catch(error => {
                          console.error('🔊 [SEQUENTIAL TTS] Failed to import audio queue:', error);
                          // Fallback to direct audio playback
                          console.log('🔊 [APPROVER AUTO-GREETING TTS] Using direct audio playback as fallback');
                          const audio = new Audio(`data:audio/${data.audio_format.toLowerCase()};base64,${data.audio_data}`);
                          
                          audio.onplay = () => {
                            console.log('🔊 [APPROVER AUTO-GREETING TTS] Audio started playing');
                            onAvatarStateChange('speaking');
                          };
                          audio.onended = () => {
                            console.log('🔊 [APPROVER AUTO-GREETING TTS] Audio finished playing');
                            onAvatarStateChange('greeting');
                          };
                          audio.onerror = (error) => {
                            console.error('🔊 [APPROVER AUTO-GREETING TTS] Audio play failed:', error);
                            onAvatarStateChange('greeting');
                          };
                          
                          audio.play().catch(error => {
                            console.error('🔊 [APPROVER AUTO-GREETING TTS] Audio play failed:', error);
                            onAvatarStateChange('greeting');
                          });
                        });
                      } else {
                        console.log('🔊 [APPROVER AUTO-GREETING TTS] Missing audio data or format');
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                    console.error('Raw data string (first 200 chars):', dataStr?.substring(0, 200));
                    console.error('Raw data string (last 200 chars):', dataStr?.substring(dataStr.length - 200));
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

          return;
        
        } catch (error) {
          console.error('❌ API call failed:', error);
          if (error instanceof Error && error.name === 'AbortError') {
            console.error('⏰ API call timed out after 30 seconds');
          }
          // Don't set hasAskedPendingRef.current = true on error so it can retry
          hasAskedPendingRef.current = false;
        } finally {
          clearTimeout(timeoutId);
          onAvatarStateChange('greeting');
        }
      } catch (error) {
        console.error('❌ Outer catch - API call failed:', error);
        hasAskedPendingRef.current = false;
      } finally {
        onAvatarStateChange('greeting');
      }
    };
    run();
  }, [autoAskPendingOnMount, user, onAvatarStateChange, addMessage]);

  // Function to send personalized welcome message
  const sendWelcomeMessage = async () => {
    const chatbotConfig = getChatbotConfig(user);
    const welcomeMessage = chatbotConfig.welcomeText;
    // Skip adding an empty welcome message to avoid a blank bubble
    if (!welcomeMessage || !welcomeMessage.trim()) {
      return;
    }

    // Welcome message will be handled by the streaming hook
    console.log('Welcome message:', welcomeMessage);
  };

  // Expose STT controls to parent via ref
  useImperativeHandle(ref, () => ({
    startListening: () => {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
      }
    },
    stopListening: () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    },
    isListening
  }), [isListening]);




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
        onAvatarStateChange('listening');
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
        onAvatarStateChange('idle');
      };

      recognitionRef.current = recognitionInstance;
    }
  }, []);

  // Voice input controls removed from UI

  const handleSendMessage = async () => {
    const allGoogleSheetUrls = [...googleSheetUrls, ...detectedGoogleSheetUrls];
    if ((!inputText.trim() && queuedFiles.length === 0 && allGoogleSheetUrls.length === 0) || isProcessing) return;
    
    setIsProcessing(true);

    const messageText = inputText.trim();
    
    // Clear previous suggestions when a new question is asked
    setSuggestions([]);

    // Clear audio queue when starting new conversation
    import('../../utils/audioQueue').then(({ globalAudioQueue }) => {
      globalAudioQueue.clear();
      console.log('🔊 [AUDIO QUEUE] Cleared audio queue for new conversation');
    }).catch(error => {
      console.error('🔊 [AUDIO QUEUE] Failed to clear audio queue:', error);
    });

    setInputText('');
    onAvatarStateChange('listening');

    // Handle Excel file uploads if there are queued files
    if (queuedFiles.length > 0) {
      try {
        // Create Excel session if needed
        let sessionId = excelSessionId;
        if (!sessionId) {
          const sessionResult = await excelChatService.createSession();
          if (sessionResult.success && sessionResult.session_id) {
            sessionId = sessionResult.session_id;
            setExcelSessionId(sessionId);
          } else {
            throw new Error('Failed to create Excel session');
          }
        }

        // Upload files
        const uploadResult = await excelChatService.uploadFiles(queuedFiles, sessionId);
        
        if (uploadResult.success) {
          // Add uploaded files to state
          if (uploadResult.data_info) {
            const newUploadedFile: UploadedFile = {
              name: queuedFiles.map(f => f.name).join(', '),
              sessionId: sessionId!,
              rows: uploadResult.data_info.rows,
              columns: uploadResult.data_info.columns
            };
            setUploadedFiles(prev => [...prev, newUploadedFile]);
          }

          // Clear queued files
          setQueuedFiles([]);
          setIsExcelMode(true);

          // Add success message to chat
          addMessage({
            text: `✅ Successfully uploaded ${queuedFiles.length} file(s) with ${uploadResult.data_info?.rows || 0} rows. Ready for analysis!`,
            sender: 'bot'
          });

          console.log('📊 Excel files uploaded successfully');
        } else {
          throw new Error(uploadResult.error || 'Failed to upload files');
        }
      } catch (error) {
        console.error('Error uploading Excel files:', error);
        addMessage({
          text: `❌ Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sender: 'bot'
        });
        setIsProcessing(false);
        onAvatarStateChange('greeting');
        return;
      }
    }

    // Handle Google Sheets URLs if there are any
    if (allGoogleSheetUrls.length > 0) {
      try {
        // Create Excel session if needed
        let sessionId = excelSessionId;
        if (!sessionId) {
          const sessionResult = await excelChatService.createSession();
          if (sessionResult.success && sessionResult.session_id) {
            sessionId = sessionResult.session_id;
            setExcelSessionId(sessionId);
          } else {
            throw new Error('Failed to create Excel session');
          }
        }

        // Load Google Sheets
        const uploadResult = await excelChatService.loadGoogleSheets(allGoogleSheetUrls, sessionId);
        
        if (uploadResult.success) {
          // Add uploaded sheets to state
          if (uploadResult.data_info) {
            const newUploadedFile: UploadedFile = {
              name: allGoogleSheetUrls.length === 1 
                ? excelChatService.getShortUrl(allGoogleSheetUrls[0])
                : `${allGoogleSheetUrls.length} Google Sheets`,
              sessionId: sessionId!,
              rows: uploadResult.data_info.rows,
              columns: uploadResult.data_info.columns
            };
            setUploadedFiles(prev => [...prev, newUploadedFile]);
          }

          // Clear Google Sheets URLs
          setGoogleSheetUrls([]);
          setDetectedGoogleSheetUrls([]);
          setIsExcelMode(true);

          // Add success message to chat
          addMessage({
            text: `✅ Successfully loaded ${allGoogleSheetUrls.length} Google Sheet(s) with ${uploadResult.data_info?.rows || 0} rows. Ready for analysis!`,
            sender: 'bot'
          });

          console.log('📊 Google Sheets loaded successfully');
        } else {
          throw new Error(uploadResult.error || 'Failed to load Google Sheets');
        }
      } catch (error) {
        console.error('Error loading Google Sheets:', error);
        addMessage({
          text: `❌ Failed to load Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sender: 'bot'
        });
        setIsProcessing(false);
        onAvatarStateChange('greeting');
        return;
      }
    }

    // Check if chatbot is disabled before attempting to send
    const chatbotConfig = getChatbotConfig(user);
    if (chatbotConfig.isDisabled || !chatbotConfig.webhookUrl) {
      console.info('Chatbot is disabled - showing maintenance message');
      
      onAvatarStateChange('greeting');
      return;
    }

    // Fallback: If user is null, use default employee chatbot
    if (!user) {
      console.warn('No user context available, using fallback employee chatbot');
    }

    try {
      // Save user message to session file
      if (user?.id) {
        try {
          await saveChatMessage(user.id, 'user', messageText, {}, user?.role || 'Employee');
          console.log('💬 User message saved to session file');
        } catch (error) {
          console.error('Failed to save user message:', error);
        }
      }

      // User message will be added by sendStreamingMessage

      // Debug Excel mode state
      console.log('🔍 Excel Mode Debug:', {
        isExcelMode,
        excelSessionId,
        hasMessage: !!messageText,
        queuedFilesCount: queuedFiles.length,
        googleSheetsCount: allGoogleSheetUrls.length
      });

      // Check if we should use Excel chat mode (more flexible detection)
      const shouldUseExcelMode = isExcelMode || (excelSessionId && messageText);
      
      if (shouldUseExcelMode && messageText) {
        try {
          console.log('📊 Using Excel chat mode for streaming data analysis');
          
          // Ensure we have a session ID
          let sessionId = excelSessionId;
          if (!sessionId) {
            console.log('🔄 Creating Excel session for analysis...');
            const sessionResult = await excelChatService.createSession();
            if (sessionResult.success && sessionResult.session_id) {
              sessionId = sessionResult.session_id;
              setExcelSessionId(sessionId);
            } else {
              throw new Error('Failed to create Excel session');
            }
          }

          // Use the regular streaming chat but with Excel context
          await sendStreamingMessage(
            messageText,
            async (fullText) => {
              console.log('✅ Excel streaming completed:', fullText);
              
              // Save bot response to session file
              if (user?.id && fullText) {
                try {
                  await saveChatMessage(user.id, 'bot', fullText, {}, user?.role || 'Employee');
                  console.log('💬 Excel bot response saved to session file');
                } catch (error) {
                  console.error('Failed to save Excel bot response:', error);
                }
              }
              
              // Set avatar to greeting state after completion
              setTimeout(() => {
                onAvatarStateChange('greeting');
              }, 1000);
            },
            {
              user_id: user?.id,
              role: user?.role,
              user_type: user?.user_type,
              department_code: user?.department?.department_code,
              employee_id: (user as any)?.profile?.employee_id,
              employee_code: (user as any)?.profile?.employee_code,
              first_name: (user as any)?.profile?.first_name,
              last_name: (user as any)?.profile?.last_name,
              firstName: (user as any)?.profile?.first_name,
              lastName: (user as any)?.profile?.last_name,
              hr_id: (user as any)?.profile?.hr_id,
              // Add Excel context
              excel_mode: true,
              excel_session_id: sessionId,
              agent_id: sessionId
            },
            (suggestions) => {
              console.log('📊 Excel suggestions received:', suggestions);
              setSuggestions(suggestions);
            },
            (showApprovalButton) => {
              console.log('🔘 Excel action button callback:', showApprovalButton);
              // Note: setShowApprovalButton not available in this context
              // Excel mode doesn't need approval buttons for data analysis
            }
          );

          console.log('✅ Excel streaming analysis completed');
          setIsProcessing(false);
          return;
          
        } catch (error) {
          console.error('❌ Excel streaming error:', error);
          addMessage({
            text: `❌ Sorry, I encountered an error analyzing your Excel data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sender: 'bot'
          });
          setIsProcessing(false);
          onAvatarStateChange('greeting');
          return;
        }
      }

      // Use the streaming chat hook for proper streaming
      await sendStreamingMessage(
        messageText, 
        async (fullText) => {
        console.log('✅ Streaming completed:', fullText);
        
        // Save bot response to session file
        if (user?.id && fullText) {
          try {
            await saveChatMessage(user.id, 'bot', fullText, {}, user?.role || 'Employee');
            console.log('💬 Bot response saved to session file');
          } catch (error) {
            console.error('Failed to save bot response:', error);
          }
        }
        
          // Skip automatic TTS generation since streaming TTS handles it in parallel
          // The new streaming implementation plays audio chunks as they're generated
          console.log('🔊 [TTS SKIP] Skipping automatic TTS - using parallel streaming TTS instead');
          
          
          // Set avatar to greeting state after completion
          setTimeout(() => {
            onAvatarStateChange('greeting');
          }, 1000);
        }, 
        {
        user_id: user?.id,
        role: user?.role,
        user_type: user?.user_type,
        department_code: user?.department?.department_code,
        employee_id: (user as any)?.profile?.employee_id,
        employee_code: (user as any)?.profile?.employee_code,
        first_name: (user as any)?.profile?.first_name,
        last_name: (user as any)?.profile?.last_name,
        firstName: (user as any)?.profile?.first_name, // For manager chatbot compatibility
        lastName: (user as any)?.profile?.last_name,   // For manager chatbot compatibility
        hr_id: (user as any)?.profile?.hr_id, // For HR users
        },
        (suggestions) => {
          console.log('='.repeat(80));
          console.log('🔍 [CHATBOT PANEL DEBUG] SUGGESTIONS CALLBACK:');
          console.log('   Suggestions received:', suggestions);
          console.log('   Suggestions count:', suggestions.length);
          console.log('   Setting state now...');
          setSuggestions(suggestions);
          console.log('   State updated! Suggestions should appear in UI.');
          console.log('='.repeat(80));
        },
        (showApprovalButton) => {
          console.log('🔘 Action button callback received:', showApprovalButton);
          if (showApprovalButton) {
            // Find the last bot message and update it with the approval button flag
            // We need to use the streaming chat hook's updateStreamingMessage method
            // For now, we'll add a message with the approval button flag
            addMessage({
              text: '👇 Click below to go to the approval panel',
              sender: 'bot',
              showApprovalButton: true,
            });
            console.log('🔘 Added approval button message');
          }
        },
        // Audio callback - not used
        undefined,
        // TTS chunk callback - DISABLED to prevent duplicate TTS calls
        // Only use completion callback for TTS to avoid duplicates
        undefined,
        onAvatarStateChange,
        user || undefined // Add user parameter for role-based endpoint selection
      );
    } catch (error) {
      console.error('Failed to send message to chat agent:', error);
      const messageStr = error instanceof Error ? error.message : String(error);
      console.error('Chat error:', messageStr);
    } finally {
      setIsProcessing(false);
    }
  };





  // Quick actions removed

  // Handle TTS replay for bot messages - memoized to prevent re-renders
  const handleReplayMessage = useCallback(async (messageText: string) => {
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
        onAvatarStateChange('speaking');
        
        // Set avatar back to greeting after audio finishes
        setTimeout(() => {
          onAvatarStateChange('greeting');
        }, 3000);
      }
    } catch (error) {
      console.error('TTS replay failed:', error);
    }
  }, [ttsEnabled, generateTTS, playAudioWithoutBlob, selectedVoice, selectedAudioFormat, onAvatarStateChange]);

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion: string) => {
    console.log('🎯 Suggestion clicked:', suggestion);
    
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Clear previous suggestions when a new question is asked
    setSuggestions([]);
    
    onAvatarStateChange('listening');

    // Check if chatbot is disabled
    const chatbotConfig = getChatbotConfig(user);
    if (chatbotConfig.isDisabled || !chatbotConfig.webhookUrl) {
      console.info('Chatbot is disabled - showing maintenance message');
      onAvatarStateChange('greeting');
      return;
    }

    try {

      // Use the streaming chat hook
      await sendStreamingMessage(
        suggestion, 
        async (fullText) => {
          console.log('✅ Suggestion response completed:', fullText);
          
          // Skip automatic TTS generation since streaming TTS handles it in parallel
          // The new streaming implementation plays audio chunks as they're generated
          console.log('🔊 [TTS SKIP] Skipping automatic TTS - using parallel streaming TTS instead');
          
          // Set avatar to greeting state after completion
          setTimeout(() => {
            onAvatarStateChange('greeting');
          }, 1000);
        }, 
        {
          user_id: user?.id,
          role: user?.role,
          user_type: user?.user_type,
          department_code: user?.department?.department_code,
          employee_id: (user as any)?.profile?.employee_id,
          employee_code: (user as any)?.profile?.employee_code,
          first_name: (user as any)?.profile?.first_name,
          last_name: (user as any)?.profile?.last_name,
          firstName: (user as any)?.profile?.first_name, // For manager chatbot compatibility
          lastName: (user as any)?.profile?.last_name,   // For manager chatbot compatibility
          hr_id: (user as any)?.profile?.hr_id, // For HR users
        },
        (newSuggestions) => {
          console.log('💡 Received new suggestions:', newSuggestions);
          setSuggestions(newSuggestions);
        },
        (showApprovalButton) => {
          console.log('🔘 Action button callback received (suggestion):', showApprovalButton);
          if (showApprovalButton) {
            // Find the last bot message and update it with the approval button flag
            // We need to use the streaming chat hook's updateStreamingMessage method
            // For now, we'll add a message with the approval button flag
            addMessage({
              text: '👇 Click below to go to the approval panel',
              sender: 'bot',
              showApprovalButton: true,
            });
          }
        },
        // Audio callback - not used
        undefined,
        // TTS chunk callback - DISABLED to prevent duplicate TTS calls
        // Only use completion callback for TTS to avoid duplicates
        undefined,
        onAvatarStateChange,
        user || undefined // Add user parameter for role-based endpoint selection
      );
    } catch (error) {
      console.error('Failed to send suggestion:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[600px] sm:h-[700px] md:h-[600px] lg:h-[600px] xl:h-[600px] flex flex-col w-full max-w-full">
      {/* Chat Interface Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-50 to-sky-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 rounded-t-2xl border-b border-sky-100">
        {/* soft background shapes */}
        <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-sky-200/20 rounded-full translate-x-6 sm:translate-x-8 md:translate-x-12 -translate-y-6 sm:-translate-y-8 md:-translate-y-12"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-sky-200/20 rounded-full -translate-x-6 sm:-translate-x-8 md:-translate-x-12 translate-y-6 sm:translate-y-8 md:translate-y-12"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg sm:text-xl font-bold text-sky-900 truncate">Chat with {getChatbotConfig(user).name}</h4>
            <p className="text-xs sm:text-sm text-sky-700/80 mt-1 hidden sm:block">Text messages and voice transcripts appear here.</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <span className="px-2 sm:px-4 py-1 sm:py-2 bg-sky-100 text-sky-800 text-xs sm:text-sm font-medium rounded-full flex items-center space-x-1 sm:space-x-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sky-500 rounded-full"></span>
              <span className="hidden sm:inline">Online</span>
              <span className="sm:hidden">●</span>
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-white relative min-h-0">
        {messages.map((message) => (
          <MessageItem 
            key={message.id}
            message={message} 
            parseMessageWithHyperlink={parseMessageWithHyperlink}
            onReplayMessage={handleReplayMessage}
            ttsEnabled={ttsEnabled}
          />
        ))}
      </div>

      {/* Quick Actions removed */}

      {/* Suggestions Section - Redesigned for Professional Look */}
      {suggestions.length > 0 && (
        <div className="px-2 sm:px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] sm:text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Suggested Actions</p>
            <button 
              onClick={() => setSuggestions([])}
              className="text-[9px] sm:text-[10px] text-gray-400 hover:text-gray-600 transition-colors font-medium"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isProcessing}
                className="px-2 sm:px-2.5 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-100 hover:border-gray-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TTS Controls Section - Only show when there's content */}
      {(currentAudioBlob || isTTSGenerating) && (
        <div className="px-2 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <label className="flex items-center space-x-2 hidden">
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">TTS Audio</span>
              </label>
              
              {currentAudioBlob && (
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={playCurrentAudio}
                    className="p-1 sm:p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200"
                    title="Play current audio"
                  >
                    <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={downloadAudio}
                    className="p-1 sm:p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors duration-200"
                    title="Download audio"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </div>
              )}
            </div>
            
            {isTTSGenerating && (
              <div className="flex items-center space-x-1 sm:space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                <span className="text-[10px] sm:text-xs font-medium">Generating audio...</span>
              </div>
            )}
          </div>
          
          {/* TTS Customization Options - Hidden */}
          {false && ttsEnabled && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-600">Voice:</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="en-US-Chirp3-HD-Charon">Chirp3-HD Charon (Male) - Gemini</option>
                  <option value="en-US-Chirp3-HD-Kore">Chirp3-HD Kore (Female) - Gemini</option>
                  <option value="en-US-Wavenet-D">Wavenet D (Male) - High Quality</option>
                  <option value="en-US-Wavenet-C">Wavenet C (Female) - High Quality</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-600">Format:</label>
                <select
                  value={selectedAudioFormat}
                  onChange={(e) => setSelectedAudioFormat(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="MP3">MP3</option>
                  <option value="OGG_OPUS">OGG OPUS</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-3 sm:p-4 md:p-6 border-t border-gray-200 bg-white rounded-b-2xl">
        
        {/* STT Status Indicator */}
        {isListening && (
          <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
              <span className="text-xs sm:text-sm text-red-700 font-semibold">Listening...</span>
            </div>
            {interimTranscript && (
              <p className="text-xs sm:text-sm text-red-600 mt-1 sm:mt-2 italic font-medium">"{interimTranscript}"</p>
            )}
          </div>
        )}
        
        {/* Queued Files and Google Sheets Display */}
        {(queuedFiles.length > 0 || googleSheetUrls.length > 0 || detectedGoogleSheetUrls.length > 0) && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Ready for Analysis ({queuedFiles.length + googleSheetUrls.length + detectedGoogleSheetUrls.length})
              </span>
              <button
                onClick={() => {
                  setQueuedFiles([]);
                  setGoogleSheetUrls([]);
                  setDetectedGoogleSheetUrls([]);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* File chips */}
              {queuedFiles.map((file, index) => (
                <FileChip
                  key={`${file.name}-${index}`}
                  filename={file.name}
                  onRemove={() => handleRemoveFile(file.name)}
                />
              ))}
              {/* Google Sheets URL chips from manual input */}
              {googleSheetUrls.map((url, index) => (
                <GoogleSheetChip
                  key={`manual-${url}-${index}`}
                  url={url}
                  onRemove={() => handleRemoveGoogleSheet(url)}
                />
              ))}
              {/* Google Sheets URL chips from auto-detection */}
              {detectedGoogleSheetUrls.map((url, index) => (
                <GoogleSheetChip
                  key={`detected-${url}-${index}`}
                  url={url}
                  onRemove={() => handleRemoveGoogleSheet(url)}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="flex space-x-2 sm:space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText + interimTranscript}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message or click the mic to use voice input..."
              className="w-full pl-14 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              disabled={isProcessing}
            />
            
            {/* Plus Icon for Attachments */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
              <button
                onClick={() => setShowAttachmentPanel(!showAttachmentPanel)}
                className="attachment-button p-1 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-all duration-200 flex items-center justify-center"
                title="Add attachment"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {/* Attachment Panel */}
            {showAttachmentPanel && (
              <div className="attachment-panel absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[200px] z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Add Attachment</h4>
                  <button
                    onClick={() => setShowAttachmentPanel(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {/* Excel/CSV Files Option */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center space-x-3 p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Data Files</div>
                      <div className="text-xs text-gray-500">Excel, CSV for analysis</div>
                    </div>
                  </button>
                  
                  {/* Link Option */}
                  <button
                    onClick={() => {
                      setShowLinkPanel(true);
                      setShowAttachmentPanel(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Link className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Link</div>
                      <div className="text-xs text-gray-500">Google Sheets</div>
                    </div>
                  </button>
                  
                  {/* Email Option */}
                  <button
                    onClick={handleEmailAttachment}
                    className="w-full flex items-center space-x-3 p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Mail className="h-4 w-4 text-purple-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Email</div>
                      <div className="text-xs text-gray-500">Dummy attachment</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            {/* Google Sheets Link Panel */}
            {showLinkPanel && (
              <div className="attachment-panel absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[300px] z-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Add Google Sheets Link</h4>
                  <button
                    onClick={() => setShowLinkPanel(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <input
                    type="url"
                    value={googleSheetsLink}
                    onChange={(e) => setGoogleSheetsLink(e.target.value)}
                    placeholder="Paste Google Sheets link here..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleLinkSubmit()}
                  />
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleLinkSubmit}
                      disabled={!googleSheetsLink.trim()}
                      className="flex-1 px-3 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Link
                    </button>
                    <button
                      onClick={() => setShowLinkPanel(false)}
                      className="px-3 py-2 text-gray-600 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          {/* Volume Button - TTS Control */}
          <button
            onClick={async () => {
              const newTtsEnabled = !ttsEnabled;
              setTtsEnabled(newTtsEnabled);
              
              // If disabling TTS, stop all current audio playback
              if (!newTtsEnabled) {
                console.log('🔊 [TTS STOP] User disabled TTS - stopping all audio');
                setIsStoppingAudio(true);
                
                try {
                  // Stop the global audio queue
                  const { globalAudioQueue } = await import('../../utils/audioQueue');
                  globalAudioQueue.stop();
                  console.log('🔊 [TTS STOP] Global audio queue stopped');
                  
                  // Also stop any direct audio playback from useTTS hook
                  if (typeof stopAudio === 'function') {
                    stopAudio();
                    console.log('🔊 [TTS STOP] Direct audio stopped');
                  }
                  
                  // Brief visual feedback
                  setTimeout(() => {
                    setIsStoppingAudio(false);
                  }, 500);
                  
                } catch (error) {
                  console.error('🔊 [TTS STOP] Failed to stop audio queue:', error);
                  setIsStoppingAudio(false);
                }
              }
            }}
            disabled={isStoppingAudio}
            className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none ${
              isStoppingAudio
                ? 'bg-gradient-to-br from-red-600 to-red-500 text-white'
                : ttsEnabled 
                  ? 'bg-gradient-to-br from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white' 
                  : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white'
            }`}
            title={
              isStoppingAudio 
                ? "Stopping audio..." 
                : ttsEnabled 
                  ? "TTS Enabled - Click to disable" 
                  : "TTS Disabled - Click to enable"
            }
          >
            {isStoppingAudio ? (
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
            ) : (
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>

          {/* Microphone Button - STT Control */}
          <button
            onClick={() => {
              if (isListening) {
                recognitionRef.current?.stop();
                setIsListening(false);
              } else {
                recognitionRef.current?.start();
                setIsListening(true);
              }
            }}
            className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
              isListening 
                ? 'bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white' 
                : 'bg-gradient-to-br from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white'
            }`}
            title={isListening ? "Stop Voice Input (STT)" : "Start Voice Input (STT)"}
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || (!inputText.trim() && !interimTranscript && queuedFiles.length === 0 && googleSheetUrls.length === 0 && detectedGoogleSheetUrls.length === 0)}
            className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatbotPanel;

