import { useState, useCallback } from 'react';
import { getApiUrl } from '../config/api';
import { unstable_batchedUpdates } from 'react-dom';
import { getSessionId } from '../services/sessionService';
import { getChatbotConfig } from '../services/roleBasedChatbotService';
import { globalAudioQueue } from '../utils/audioQueue';

export interface StreamingMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  isStreaming?: boolean;
  hasAudio?: boolean;
  showApprovalButton?: boolean;
  approvalAction?: any;
}

export interface StreamingChatHook {
  messages: StreamingMessage[];
  addMessage: (message: Omit<StreamingMessage, 'id' | 'timestamp'>) => number;
  updateStreamingMessage: (messageId: number, text: string, metadata?: any) => void;
  finishStreaming: (messageId: number) => void;
  clearMessages: () => void;
  sendStreamingMessage: (
    message: string, 
    onComplete?: (fullText: string) => void, 
    userInfoArg?: any,
    onSuggestions?: (suggestions: string[]) => void,
    onAudio?: (audioUrl: string) => void,
    onActionButton?: (show: boolean) => void,
    onTTSChunk?: (text: string) => void,
    onAvatarStateChange?: (state: 'greeting' | 'listening' | 'speaking' | 'idle') => void,
    user?: any
  ) => Promise<void>;
}

export const useStreamingChat = (): StreamingChatHook => {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);

  const addMessage = useCallback((message: Omit<StreamingMessage, 'id' | 'timestamp'>) => {
    console.log('📝 addMessage called with:', message);
    const newMessage: StreamingMessage = {
      ...message,
      id: Date.now() + Math.random() * 1000, // Add random component to ensure uniqueness
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    console.log('📝 Creating new message:', newMessage);
    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Reduced logging - only log when adding to non-empty array
      if (prev.length > 0) {
        console.log('📝 Updated messages array:', updated);
      }
      return updated;
    });
    return newMessage.id;
  }, []);

  const updateStreamingMessage = useCallback((messageId: number, text: string, metadata?: any) => {
    console.log('🔄 updateStreamingMessage called:', { messageId, textLength: text.length, metadata });
    
    // Use batched updates to prevent multiple re-renders
    unstable_batchedUpdates(() => {
      setMessages(prev => {
        // Find the message index first
        const messageIndex = prev.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) {
          console.log('⚠️ Message not found:', messageId);
          return prev; // Message not found
        }
        
        // Check if the text actually changed to avoid unnecessary updates
        const currentMessage = prev[messageIndex];
        if (currentMessage.text === text && !metadata) return prev; // No change
        
        // Only log significant updates to reduce noise
        if (text.length % 50 === 0 || text.length < 10) {
          console.log('🔄 Updating streaming message:', messageId, 'Text length:', text.length);
        }
        
        // Create new array with updated message
        const newMessages = [...prev];
        newMessages[messageIndex] = { 
          ...currentMessage, 
          text, 
          isStreaming: true,
          ...(metadata && { ...metadata })
        };
        
        console.log('🔄 Updated message:', newMessages[messageIndex]);
        return newMessages;
      });
    });
  }, []);

  const finishStreaming = useCallback((messageId: number) => {
    console.log('✅ Finishing streaming for message:', messageId);
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false }
          : msg
      )
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    // Clear audio queue when clearing messages
    globalAudioQueue.clear();
    console.log('🔊 [AUDIO QUEUE] Cleared audio queue with messages');
  }, []);

  const sendStreamingMessage = useCallback(async (
    message: string, 
    onComplete?: (fullText: string) => void,
    userInfoArg?: any,
    onSuggestions?: (suggestions: string[]) => void,
    onAudio?: (audioUrl: string) => void,
    onActionButton?: (show: boolean) => void,
    onTTSChunk?: (text: string) => void, // New callback for TTS during streaming
    onAvatarStateChange?: (state: 'greeting' | 'listening' | 'speaking' | 'idle') => void,
    user?: any // Add user parameter for role-based endpoint selection
  ) => {
    console.log('🔊 [STREAMING DEBUG] sendStreamingMessage called with parameters:');
    console.log('🔊 [STREAMING DEBUG] - message:', message);
    console.log('🔊 [STREAMING DEBUG] - onComplete:', !!onComplete);
    console.log('🔊 [STREAMING DEBUG] - userInfoArg:', !!userInfoArg);
    console.log('🔊 [STREAMING DEBUG] - onSuggestions:', !!onSuggestions);
    console.log('🔊 [STREAMING DEBUG] - onAudio:', !!onAudio);
    console.log('🔊 [STREAMING DEBUG] - onActionButton:', !!onActionButton);
    console.log('🔊 [STREAMING DEBUG] - onTTSChunk:', !!onTTSChunk);
    console.log('🔊 [STREAMING DEBUG] - onTTSChunk type:', typeof onTTSChunk);
    console.log('🔊 [STREAMING DEBUG] - onTTSChunk value:', onTTSChunk);
    console.log('🔊 [STREAMING DEBUG] - onAvatarStateChange:', !!onAvatarStateChange);
    
    // Set avatar to listening state when user sends message
    if (onAvatarStateChange) {
      console.log('🎭 [AVATAR STATE] Setting to listening state');
      onAvatarStateChange('listening');
    }
    
    // Batch add both user and bot messages to reduce state updates
    const userMessageId = Date.now() + Math.random() * 1000;
    const botMessageId = userMessageId + 1; // Ensure bot message comes after user message
    
    const userMessage: StreamingMessage = {
      id: userMessageId,
      text: message,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    const botMessage: StreamingMessage = {
      id: botMessageId,
      text: '',
      sender: 'bot',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    console.log('📝 Batch adding user and bot messages:', { userMessage, botMessage });
    setMessages(prev => {
      const updated = [...prev, userMessage, botMessage];
      console.log('📝 Updated messages array (batched):', updated);
      return updated;
    });
    
    console.log('🚀 Starting streaming for message:', botMessageId);

    try {
      // Role-based endpoint selection
      const sessionId = getSessionId();
      const userInfo: any = userInfoArg || {};
      const chatbotConfig = getChatbotConfig(user);
      
      console.log('🔍 [ENDPOINT DEBUG] Role-based endpoint selection:');
      console.log('   user:', user);
      console.log('   user.profile:', user?.profile);
      console.log('   user.profile.role:', user?.profile?.role);
      console.log('   chatbotConfig:', chatbotConfig);
      console.log('   endpoint:', chatbotConfig.streamUrl);

      // Check if user has a specialized chatbot (not employee)
      const isEmployee = chatbotConfig.role === 'Employee';
      
      if (!isEmployee) {
        // Use role-based streaming endpoint for specialized roles
        const mgrResp = await fetch(chatbotConfig.streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify({
            user_id: userInfo && (userInfo.user_id || userInfo.id),
            message,
            user_info: userInfo,
            auto_greeting: false,
          }),
        });

        if (!mgrResp.ok) {
          throw new Error(`HTTP error! status: ${mgrResp.status}`);
        }

        const reader = mgrResp.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              console.log('🔍 Processing manager streaming line:', line);
              
              try {
                // Parse Server-Sent Events format
                if (line.startsWith('data: ')) {
                  const data = line.slice(6); // Remove 'data: ' prefix
                  
                  if (data === '[DONE]') {
                    console.log('✅ Manager streaming completed');
                    
                    // Set avatar to greeting state when streaming completes
                    if (onAvatarStateChange) {
                      console.log('🎭 [AVATAR STATE] Setting to greeting state - manager streaming completed');
                      onAvatarStateChange('greeting');
                    }
                    
                    finishStreaming(botMessageId);
                    if (onComplete) {
                      onComplete(fullText);
                    }
                    return;
                  }

                  // Skip empty data
                  if (data.trim() === '') {
                    continue;
                  }

                  try {
                    // Validate that data looks like JSON before parsing
                    if (!data.trim().startsWith('{') && !data.trim().startsWith('[')) {
                      console.log('⚠️ Skipping non-JSON data:', data.substring(0, 50));
                      continue;
                    }

                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      // Set avatar to speaking state when first content is received
                      if (onAvatarStateChange && fullText === '') {
                        console.log('🎭 [AVATAR STATE] Setting to speaking state - first content received');
                        onAvatarStateChange('speaking');
                      }
                      
                      // Smart space handling: preserve newlines but add spaces between words
                      const content = parsed.content;
                      const lastChar = fullText.slice(-1);
                      const firstChar = content.charAt(0);
                      
                      // Add space only if both are non-whitespace characters
                      if (fullText && lastChar !== '\n' && lastChar !== ' ' && 
                          firstChar !== '\n' && firstChar !== ' ' && firstChar !== '-') {
                        fullText += ' ';
                      }
                      
                      fullText += content;
                      console.log('📝 Manager streaming chunk:', parsed.content, 'Full text so far:', fullText);
                      
                      // Add delay to slow down streaming (comfortable reading speed)
                      await new Promise(resolve => setTimeout(resolve, 80)); // 80ms delay between chunks
                      
                      updateStreamingMessage(botMessageId, fullText);
                    }
                    // Handle suggestions from the stream
                    if (parsed.type === 'suggestions' && parsed.suggestions && onSuggestions) {
                      console.log('📨 Received suggestions from manager stream:', parsed.suggestions);
                      onSuggestions(parsed.suggestions);
                    }
                    // Handle approval actions from the stream
                    if (parsed.type === 'approval_actions' && parsed.approval_action) {
                      console.log('🔘 Received approval actions from manager stream:', parsed.approval_action);
                      console.log('🔘 Approval action buttons:', parsed.approval_action.buttons);
                      console.log('🔘 Current bot message ID:', botMessageId);
                      console.log('🔘 Full text so far:', fullText);
                      
                      // Add approval action buttons to the current message
                      updateStreamingMessage(botMessageId, fullText, {
                        approvalAction: parsed.approval_action,
                        showApprovalButton: true
                      });
                      console.log('🔘 Updated message with approval action');
                    }
                    // Handle completion with action button flag
                    if (parsed.type === 'complete') {
                      console.log('✅ Manager streaming complete event received');
                      if (onActionButton && parsed.show_approval_action !== undefined) {
                        console.log('🔘 Action button flag received:', parsed.show_approval_action);
                        onActionButton(parsed.show_approval_action);
                      }
                    }
                    
                    // Handle TTS chunk data from backend (sequential streaming) - APPROVER CHATBOT
                    if (parsed.type === 'tts_chunk') {
                      console.log('🔊 [APPROVER SEQUENTIAL TTS] Received TTS chunk from backend');
                      console.log('🔊 [APPROVER SEQUENTIAL TTS] Chunk text:', parsed.text?.substring(0, 50) + '...');
                      console.log('🔊 [APPROVER SEQUENTIAL TTS] Audio data present:', !!parsed.audio_data);
                      console.log('🔊 [APPROVER SEQUENTIAL TTS] Audio format:', parsed.audio_format);
                      console.log('🔊 [APPROVER SEQUENTIAL TTS] Chunk index:', parsed.chunk_index);
                      
                      // Set avatar to speaking when TTS starts
                      if (onAvatarStateChange && parsed.chunk_index === 0) {
                        console.log('🎭 [AVATAR STATE] Setting to speaking state - TTS starting');
                        onAvatarStateChange('speaking');
                      }
                      
                      if (parsed.audio_data && parsed.audio_format) {
                        console.log('🔊 [APPROVER SEQUENTIAL TTS] Adding TTS chunk to audio queue');
                        // Add to audio queue for sequential playback
                        const chunkId = globalAudioQueue.enqueue(
                          parsed.audio_data,
                          parsed.audio_format,
                          parsed.text,
                          parsed.chunk_index
                        );
                        console.log('🔊 [APPROVER SEQUENTIAL TTS] Audio chunk queued with ID:', chunkId);
                      } else {
                        console.log('🔊 [APPROVER SEQUENTIAL TTS] Missing audio data or format in chunk');
                      }
                    }
                    
                    // Handle complete TTS data from backend (fallback) - APPROVER CHATBOT
                    if (parsed.type === 'tts') {
                      console.log('🔊 [APPROVER STREAMING TTS] Received complete TTS data from backend');
                      console.log('🔊 [APPROVER STREAMING TTS] Audio data present:', !!parsed.audio_data);
                      console.log('🔊 [APPROVER STREAMING TTS] Audio format:', parsed.audio_format);
                      
                      // Set avatar to speaking when TTS starts
                      if (onAvatarStateChange) {
                        console.log('🎭 [AVATAR STATE] Setting to speaking state - complete TTS starting');
                        onAvatarStateChange('speaking');
                      }
                      
                      if (parsed.audio_data && parsed.audio_format) {
                        console.log('🔊 [APPROVER STREAMING TTS] Adding complete TTS to audio queue');
                        // Add to audio queue for sequential playback
                        const chunkId = globalAudioQueue.enqueue(
                          parsed.audio_data,
                          parsed.audio_format,
                          'Complete TTS (fallback)',
                          0
                        );
                        console.log('🔊 [APPROVER STREAMING TTS] Complete TTS queued with ID:', chunkId);
                      } else {
                        console.log('🔊 [APPROVER STREAMING TTS] Missing audio data or format');
                      }
                    }
                  } catch (parseError) {
                    console.error('⚠️ Manager JSON parse error:', parseError);
                    console.log('⚠️ Raw data that failed to parse:', data.substring(0, 100));
                    console.log('⚠️ Data type:', typeof data);
                    console.log('⚠️ Data length:', data.length);
                    
                    // Check if this is an unterminated string error - likely means incomplete JSON
                    if (parseError instanceof SyntaxError && parseError.message.includes('Unterminated string')) {
                      console.log('⚠️ Unterminated string detected - JSON was split across chunks. This is normal for SSE streams.');
                      // Don't throw, just skip this chunk
                      continue;
                    }
                    
                    // For other JSON errors, log but don't break
                    console.log('⚠️ Continuing despite JSON parse error');
                    // SKIP appending raw JSON - this is the bug!
                    // Don't append unparseable data to avoid showing raw JSON
                    continue; // Skip this chunk and move to the next one
                    
                    /* OLD CODE - REMOVED TO FIX BUG
                    // If not JSON, treat as plain text - smart space handling
                    const lastChar = fullText.slice(-1);
                    const firstChar = data.charAt(0);
                    
                    if (fullText && lastChar !== '\n' && lastChar !== ' ' && 
                        firstChar !== '\n' && firstChar !== ' ' && firstChar !== '-') {
                      fullText += ' ';
                    }
                    
                    fullText += data;
                    console.log('📝 Manager streaming text chunk:', data);
                    updateStreamingMessage(botMessageId, fullText);
                    
                    // Trigger TTS for this chunk if callback provided
                    if (onTTSChunk && data.trim()) {
                      console.log('🔊 [TTS CHUNK DEBUG] Manager - Calling onTTSChunk with:', data);
                      onTTSChunk(data);
                    } else {
                      console.log('🔊 [TTS CHUNK DEBUG] Manager - onTTSChunk not called:', {
                        hasCallback: !!onTTSChunk,
                        dataTrimmed: data.trim(),
                        dataLength: data.length
                      });
                    }
                    */
                  }
                } else {
                  console.log('⚠️ Manager line does not start with "data: ":', line);
                }
              } catch (error) {
                console.warn('Error parsing manager streaming chunk:', error);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Streaming is already complete, no need for additional character animation
        finishStreaming(botMessageId);
        if (onComplete) {
          onComplete(fullText);
        }
        return; // Do not proceed to employee streaming path
      } else {
        // Use employee chatbot for regular employees
        console.log('🌊 Sending streaming request to /ai/streaming-chat ...');
        const response = await fetch(getApiUrl('/ai/streaming-chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
        },
        body: JSON.stringify({
          message,
          stream: true,
          sessionId: sessionId || undefined,
          user_id: (userInfo && (userInfo.user_id || userInfo.id)) || undefined,
          userInfo,
        }),
      });
      
      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      try {
        console.log('🔊 [TTS DEBUG] Starting streaming loop...');
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('🔊 [TTS DEBUG] Stream ended without [DONE] signal');
            console.log('🔊 [TTS DEBUG] Final full text:', fullText);
            console.log('🔊 [TTS DEBUG] onComplete callback exists:', !!onComplete);
            if (onComplete && fullText.trim()) {
              console.log('🔊 [TTS DEBUG] Calling onComplete callback due to stream end');
              onComplete(fullText);
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            console.log('🔍 Processing line:', line);
            
            try {
              // Parse Server-Sent Events format
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // Remove 'data: ' prefix
                
                if (data === '[DONE]') {
                  console.log('✅ Received [DONE] signal');
                  console.log('🔊 [TTS DEBUG] Full text at completion:', fullText);
                  console.log('🔊 [TTS DEBUG] onComplete callback exists:', !!onComplete);
                  
                  // Set avatar to greeting state when streaming completes
                  if (onAvatarStateChange) {
                    console.log('🎭 [AVATAR STATE] Setting to greeting state - streaming completed');
                    onAvatarStateChange('greeting');
                  }
                  
                  finishStreaming(botMessageId);
                  if (onComplete) {
                    console.log('🔊 [TTS DEBUG] Calling onComplete callback with text length:', fullText.length);
                    onComplete(fullText);
                  } else {
                    console.log('🔊 [TTS DEBUG] ❌ No onComplete callback provided');
                  }
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  console.log('🔍 [CHUNK DEBUG] Raw data:', data);
                  console.log('🔍 [CHUNK DEBUG] Parsed:', parsed);
                  
                  // Only process if we have content field and it's not empty
                  if (parsed.content && typeof parsed.content === 'string') {
                    // Set avatar to speaking state when first content is received
                    if (onAvatarStateChange && fullText === '') {
                      console.log('🎭 [AVATAR STATE] Setting to speaking state - first content received (employee)');
                      onAvatarStateChange('speaking');
                    }
                    
                    // Smart space handling: preserve newlines and bullet points
                    const content = parsed.content;
                    
                    // DEBUG: Log what we're receiving
                    console.log('📝 Received chunk:', JSON.stringify(content));
                    
                    // If content is just newline(s), append directly without any space
                    if (content.trim() === '') {
                      console.log('  → Appending whitespace/newline directly');
                      fullText += content;
                    } else {
                      const lastChar = fullText.slice(-1);
                      const firstChar = content.charAt(0);
                      
                      // Special handling for bullet points - they should start on a new line
                      if (content.startsWith('- ')) {
                        // If the last character is not a newline, add one before bullet point
                        if (lastChar !== '\n') {
                          console.log('  → Adding newline before bullet point');
                          fullText += '\n';
                        }
                        fullText += content;
                      } else {
                        // For regular text, add space if needed between words
                        if (fullText && lastChar !== '\n' && lastChar !== ' ' && 
                            firstChar !== '\n' && firstChar !== ' ' && firstChar !== '-' && firstChar !== '📋') {
                          console.log('  → Adding space before content');
                          fullText += ' ';
                        }
                        fullText += content;
                      }
                    }
                    
                    console.log('  → Full text length now:', fullText.length);
                    
                    // Add delay to slow down streaming (comfortable reading speed)
                    await new Promise(resolve => setTimeout(resolve, 80)); // 80ms delay between chunks
                    
                    updateStreamingMessage(botMessageId, fullText);
                    
                    // Trigger TTS for this chunk if callback provided - with early whitespace filtering
                    if (onTTSChunk && content) {
                      // Early filter: skip pure whitespace chunks to reduce overhead
                      const trimmedContent = content.trim();
                      if (trimmedContent.length > 0) {
                        console.log('🔊 [TTS CHUNK] ✅ Processing meaningful chunk:', JSON.stringify(content));
                        onTTSChunk(content);
                      } else {
                        console.log('🔊 [TTS CHUNK] ⏭️ Skipping whitespace chunk:', JSON.stringify(content));
                      }
                    }
                  } else {
                    console.log('⚠️ [CHUNK DEBUG] Skipping non-content chunk:', parsed);
                  }
                  
                  // Handle suggestions from employee chatbot
                  if (parsed.type === 'suggestions' && parsed.suggestions && onSuggestions) {
                    console.log('='.repeat(80));
                    console.log('🔍 [FRONTEND HOOK DEBUG] SUGGESTIONS RECEIVED:');
                    console.log('   Parsed Type:', parsed.type);
                    console.log('   Suggestions Array:', parsed.suggestions);
                    console.log('   Suggestions Count:', parsed.suggestions.length);
                    console.log('   onSuggestions callback exists:', !!onSuggestions);
                    console.log('   Calling onSuggestions now...');
                    console.log('='.repeat(80));
                    onSuggestions(parsed.suggestions);
                  } else if (parsed.type === 'suggestions') {
                    console.log('⚠️ [FRONTEND HOOK DEBUG] Suggestions event received but not handled:');
                    console.log('   parsed.suggestions exists:', !!parsed.suggestions);
                    console.log('   onSuggestions callback exists:', !!onSuggestions);
                  }
                  
                  
                  // Handle completion status
                  if (parsed.type === 'complete') {
                    console.log('✅ Employee chatbot streaming complete');
                    // Handle action button for approval intent
                    if (onActionButton && parsed.show_approval_action !== undefined) {
                      console.log('🔘 Action button flag received:', parsed.show_approval_action);
                      onActionButton(parsed.show_approval_action);
                    }
                  }
                  
                  // Handle TTS chunk data from backend (sequential streaming)
                  if (parsed.type === 'tts_chunk') {
                    console.log('🔊 [SEQUENTIAL TTS] Received TTS chunk from backend');
                    console.log('🔊 [SEQUENTIAL TTS] Chunk text:', parsed.text?.substring(0, 50) + '...');
                    console.log('🔊 [SEQUENTIAL TTS] Audio data present:', !!parsed.audio_data);
                    console.log('🔊 [SEQUENTIAL TTS] Audio format:', parsed.audio_format);
                    console.log('🔊 [SEQUENTIAL TTS] Chunk index:', parsed.chunk_index);
                    
                    if (parsed.audio_data && parsed.audio_format) {
                      console.log('🔊 [SEQUENTIAL TTS] Adding TTS chunk to audio queue');
                      // Add to audio queue for sequential playback
                      const chunkId = globalAudioQueue.enqueue(
                        parsed.audio_data,
                        parsed.audio_format,
                        parsed.text,
                        parsed.chunk_index
                      );
                      console.log('🔊 [SEQUENTIAL TTS] Audio chunk queued with ID:', chunkId);
                    } else {
                      console.log('🔊 [SEQUENTIAL TTS] Missing audio data or format in chunk');
                    }
                  }
                  
                  // Handle complete TTS data from backend (fallback)
                  if (parsed.type === 'tts') {
                    console.log('🔊 [STREAMING TTS] Received complete TTS data from backend (fallback)');
                    console.log('🔊 [STREAMING TTS] TTS data keys:', Object.keys(parsed));
                    console.log('🔊 [STREAMING TTS] Audio data present:', !!parsed.audio_data);
                    console.log('🔊 [STREAMING TTS] Audio format:', parsed.audio_format);
                    console.log('🔊 [STREAMING TTS] Audio data length:', parsed.audio_data ? parsed.audio_data.length : 0);
                    console.log('🔊 [STREAMING TTS] Fallback used:', parsed.fallback_used);
                    
                    if (parsed.audio_data && parsed.audio_format) {
                      console.log('🔊 [STREAMING TTS] Adding complete TTS to audio queue');
                      // Add to audio queue for sequential playback (fallback)
                      const chunkId = globalAudioQueue.enqueue(
                        parsed.audio_data,
                        parsed.audio_format,
                        'Complete TTS (fallback)',
                        0
                      );
                      console.log('🔊 [STREAMING TTS] Complete TTS queued with ID:', chunkId);
                    } else {
                      console.log('🔊 [STREAMING TTS] Missing audio data or format');
                    }
                  }
                } catch (parseError) {
                  console.error('⚠️ Employee chatbot JSON parse error:', parseError);
                  console.log('⚠️ Raw data that failed to parse:', data);
                  console.log('⚠️ Data type:', typeof data);
                  console.log('⚠️ Data length:', data.length);
                  // SKIP appending raw JSON - this is the bug!
                  // Don't append unparseable data to avoid showing raw JSON
                  continue; // Skip this chunk and move to the next one
                }
              } else {
                console.log('⚠️ Line does not start with "data: ":', line);
              }
            } catch (error) {
              console.warn('Error parsing streaming chunk:', error);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Text already streamed in real-time from API, just finish streaming
      finishStreaming(botMessageId);
      if (onComplete) {
        onComplete(fullText);
      }
      } // End of else block for employee chatbot

    } catch (error) {
      console.error('Streaming error:', error);
      
      // Fallback: simulate streaming with a slower, more readable speed
      console.log('🔄 Falling back to simulated streaming...');
      const fallbackText = 'Hello! I\'m Chief Smile Officer, your AI assistant. How can I help you today?';
      
      // Slower character-by-character streaming for better readability
      let currentText = '';
      let lastUpdateTime = 0;
      const updateInterval = 200; // Update every 200ms
      
      for (let i = 0; i < fallbackText.length; i++) {
        currentText += fallbackText[i];
        
        // Update UI at intervals
        const now = Date.now();
        if (now - lastUpdateTime >= updateInterval || i === fallbackText.length - 1) {
          updateStreamingMessage(botMessageId, currentText);
          lastUpdateTime = now;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay per character (slower, more readable)
      }
      
      finishStreaming(botMessageId);
      if (onComplete) {
        onComplete(fallbackText);
      }
    }
  }, [addMessage, updateStreamingMessage, finishStreaming]);

  return {
    messages,
    addMessage,
    updateStreamingMessage,
    finishStreaming,
    clearMessages,
    sendStreamingMessage,
  };
};
