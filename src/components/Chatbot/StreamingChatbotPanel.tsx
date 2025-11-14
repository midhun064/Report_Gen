import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2 } from 'lucide-react';
import { useStreamingChat, StreamingMessage } from '../../hooks/useStreamingChat';
import { AvatarState } from '../../hooks/useAvatarState';
import ThinkingAnimation from './ThinkingAnimation';

interface StreamingChatbotPanelProps {
  onAvatarStateChange: (state: AvatarState) => void;
}

const StreamingChatbotPanel: React.FC<StreamingChatbotPanelProps> = ({ 
  onAvatarStateChange
}) => {
  const { messages, sendStreamingMessage } = useStreamingChat();
  const [inputText, setInputText] = useState('');
  const [currentAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorNotice] = useState<string | null>(null);
  const [rateLimitUntil] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to play audio
  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onplay = () => {
      setIsPlaying(true);
      onAvatarStateChange('speaking');
    };
    audio.onended = () => {
      setIsPlaying(false);
      onAvatarStateChange('greeting');
    };
    audio.onerror = () => {
      setIsPlaying(false);
      onAvatarStateChange('greeting');
      console.error('Error playing audio');
    };
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      onAvatarStateChange('greeting');
    });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    onAvatarStateChange('listening');

    try {
      await sendStreamingMessage(messageText, async () => {
        // Go to greeting state after audio completes
        setTimeout(() => onAvatarStateChange('greeting'), 1000);
      });
    } catch (error) {
      console.error('Failed to send streaming message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format message text with proper list/bullet rendering
  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    const formattedElements: React.ReactNode[] = [];
    let currentListItems: string[] = [];
    
    lines.forEach((line, index) => {
      // Check if line starts with "- " (bullet point)
      if (line.trim().startsWith('- ')) {
        currentListItems.push(line.trim().substring(2)); // Remove "- "
      } else if (line.trim() === '' && currentListItems.length > 0) {
        // Empty line after list items - render the accumulated list
        formattedElements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-2" style={{listStyleType: 'disc', listStylePosition: 'inside'}}>
            {currentListItems.map((item, i) => (
              <li key={i} className="text-gray-800" style={{marginLeft: '8px'}}>{item}</li>
            ))}
          </ul>
        );
        currentListItems = [];
      } else {
        // Flush any pending list items before adding regular text
        if (currentListItems.length > 0) {
          formattedElements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-2" style={{listStyleType: 'disc', listStylePosition: 'inside'}}>
              {currentListItems.map((item, i) => (
                <li key={i} className="text-gray-800" style={{marginLeft: '8px'}}>{item}</li>
              ))}
            </ul>
          );
          currentListItems = [];
        }
        
        // Add regular text line (skip completely empty lines)
        if (line.trim()) {
          formattedElements.push(
            <p key={`text-${index}`} className="mb-2">{line}</p>
          );
        }
      }
    });
    
    // Flush any remaining list items at the end
    if (currentListItems.length > 0) {
      formattedElements.push(
        <ul key="list-final" className="list-disc list-inside space-y-1 my-2 ml-2" style={{listStyleType: 'disc', listStylePosition: 'inside'}}>
          {currentListItems.map((item, i) => (
            <li key={i} className="text-gray-800" style={{marginLeft: '8px'}}>{item}</li>
          ))}
        </ul>
      );
    }
    
    return formattedElements;
  };

  const renderMessage = (message: StreamingMessage) => {
    if (message.sender === 'user') {
      return (
        <div className="flex justify-end animate-fadeIn">
          <div className="max-w-[85%] p-4 rounded-2xl text-sm shadow-sm transition-all duration-300 hover:shadow-md relative bg-sky-600 text-white rounded-br-md">
            <p className="font-medium leading-relaxed whitespace-pre-wrap">{message.text}</p>
            <p className="text-xs mt-2 text-sky-100">{message.timestamp}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start animate-fadeIn">
        <div className="flex items-start space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
            CSO
          </div>
          <div className="max-w-[85%] p-4 rounded-2xl text-sm shadow-sm transition-all duration-300 hover:shadow-md relative bg-white text-gray-800 rounded-bl-md border border-gray-200">
            <div className="font-medium leading-relaxed">
              {formatMessageText(message.text)}
              {message.isStreaming && (
                <ThinkingAnimation isActive={true} />
              )}
            </div>
            
            
            {/* Audio controls for bot messages */}
            {message.hasAudio && (
              <div className="mt-3 flex items-center space-x-2">
                <button
                  onClick={() => currentAudio && playAudio(currentAudio)}
                  disabled={isPlaying}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  {isPlaying ? (
                    <>
                      <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Playing...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3" />
                      <span>Play Audio</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            <p className="text-xs mt-2 text-gray-500">{message.timestamp}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl shadow-xl border border-sky-100 h-[600px] flex flex-col bg-gradient-to-br from-sky-50 to-sky-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-56 h-56 bg-sky-200/20 rounded-full translate-x-16 -translate-y-16" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-200/20 rounded-full -translate-x-16 translate-y-16" />
      {/* Chat Interface Header */}
      <div className="bg-transparent px-6 py-4 rounded-t-2xl border-b border-sky-100 relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-blue-900">Streaming Chat with CA</h4>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Connected</span>
          </div>
        </div>
        <p className="text-sm text-sky-700/80 mt-1">Real-time streaming responses from Chief Smile Officer.</p>
        
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white/70 relative min-h-0 backdrop-blur-sm z-10 rounded-b-2xl">
        {messages.map((message) => (
          <div key={message.id}>
            {renderMessage(message)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-sky-100 bg-white/80 backdrop-blur-sm rounded-b-2xl relative z-10">
        {errorNotice && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm font-medium shadow-sm">
            {errorNotice}
          </div>
        )}
        
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              disabled={isProcessing}
            />
          </div>
          
          {/* Audio Controls */}
          
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isProcessing || (rateLimitUntil !== null && Date.now() < rateLimitUntil)}
            className="px-4 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StreamingChatbotPanel;
