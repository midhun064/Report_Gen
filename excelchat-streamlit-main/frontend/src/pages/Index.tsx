import { useState, useRef, useEffect } from "react";
import TopHeader from "@/components/TopHeader";
import ChatHeader from "@/components/ChatHeader";
import ChatInput from "@/components/ChatInput";
import EmptyState from "@/components/EmptyState";
import FileChip from "@/components/FileChip";
import ChartDisplay from "@/components/ChartDisplay";
import { Button } from "@/components/ui/button";
import "../styles/chatgpt-cursor.css";

interface Message {
  type: 'user' | 'assistant' | 'plot' | 'excel' | 'system';
  content: string;
  timestamp?: Date;
  files?: string[]; // Store file names attached to this message
  isStreaming?: boolean; // Track if message is currently streaming
  images?: string[]; // Image URLs for inline display
  excelFiles?: string[]; // Excel file URLs for download buttons
  sheetUrl?: string; // Google Sheets URL for hyperlink
  linkText?: string; // Text to display for the hyperlink
  charts?: Array<{
    type: 'pie' | 'bar' | 'line';
    title: string;
    data: Array<{
      name: string;
      value: number;
      fill?: string;
    }>;
    dataKey: string;
    nameKey: string;
  }>; // Chart data for interactive display
}

interface QueuedFile {
  name: string;
  file: File;
}

interface UploadedFile {
  name: string;
  agentId: string;
  rows: number;
}

// Helper function to determine text color based on background color
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [memorySize, setMemorySize] = useState(10);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [googleSheetUrls, setGoogleSheetUrls] = useState<string[]>([]);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Trigger auto-scroll when messages update
  useEffect(() => {
    // Small delay to ensure DOM is updated, especially for streaming messages
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const supportedExtensions = ['.csv', '.xlsx', '.xls', '.gsheet', '.ods'];
    const validFiles: QueuedFile[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (supportedExtensions.includes(extension)) {
        validFiles.push({ name: file.name, file });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: `⚠️ Unsupported file types: ${invalidFiles.join(', ')}. Please upload CSV, XLSX, XLS, ODS, or GSHEET files.` 
      }]);
    }

    // Queue valid files
    if (validFiles.length > 0) {
      setQueuedFiles(prev => [...prev, ...validFiles]);
    }

    // Reset the file input
    event.target.value = '';
  };

  const handleRemoveFile = (filename: string) => {
    setQueuedFiles(prev => prev.filter(file => file.name !== filename));
  };

  const handleRemoveGoogleSheet = (url: string) => {
    setGoogleSheetUrls(prev => prev.filter(u => u !== url));
  };

  const isGoogleSheetsUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'docs.google.com' && 
             urlObj.pathname.includes('/spreadsheets/d/');
    } catch (e) {
      return false;
    }
  };

  const getShortUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];
      if (spreadsheetId) {
        return `Google Sheet (${spreadsheetId.substring(0, 8)}...)`;
      }
      return 'Google Sheet';
    } catch {
      return 'Google Sheet';
    }
  };

  const handlePreviewExcel = async (filename: string) => {
    setPreviewLoading(true);
    try {
      console.log('Fetching preview for:', filename);
      
      // First, check what files are available for debugging
      try {
        const debugResponse = await fetch(`/api/debug/files?filename=${encodeURIComponent(filename)}`);
        const debugData = await debugResponse.json();
        console.log('Available files debug info:', debugData);
      } catch (debugError) {
        console.warn('Debug endpoint not available:', debugError);
      }
      
      const response = await fetch(`/api/preview/${encodeURIComponent(filename)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview response error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.preview);
        setShowPreview(true);
        console.log('Preview data loaded:', data.preview);
        
        // Auto-scroll to the bottom of the page to show the preview panel
        setTimeout(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      } else {
        console.error('Preview failed:', data.error);
        alert(`Failed to preview file: ${data.error}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert(`Failed to load preview: ${error.message || 'Please try again.'}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendMessage = async (message: string, files: File[], googleSheetUrlParam?: string, googleSheetUrlsParam?: string[]) => {
    setIsLoading(true);

    try {
      let currentAgentId = agentId;
      const uploadedFileNames: Array<{originalName: string, secureName: string, displayName: string}> = [];
      
      // Check if there are Google Sheets URLs (from parameter or state)
      const allSheetUrls = googleSheetUrlsParam || googleSheetUrls || [];
      const singleSheetUrl = googleSheetUrlParam;
      const userMessage = message.trim();
      
      // Process URLs from array parameter (preferred) or fallback to single URL
      const sheetsToProcess = [];
      if (allSheetUrls.length > 0) {
        // Use array parameter if available
        allSheetUrls.forEach(url => {
          if (isGoogleSheetsUrl(url) && !sheetsToProcess.includes(url)) {
            sheetsToProcess.push(url);
          }
        });
      } else if (singleSheetUrl && isGoogleSheetsUrl(singleSheetUrl)) {
        // Fallback to single URL only if no array provided
        sheetsToProcess.push(singleSheetUrl);
      }
      
      // Google Sheets will be handled in the main user message creation below to avoid duplication
      
      if (sheetsToProcess.length > 0) {
        try {
          // Process Google Sheets without showing loading messages to avoid duplication
          
          // Call the upload-google-sheet endpoint with multiple URLs support
          const requestBody = sheetsToProcess.length === 1 
            ? { 
                spreadsheet_url: sheetsToProcess[0],
                session_id: currentAgentId || undefined
              }
            : {
                spreadsheet_urls: sheetsToProcess,
                session_id: currentAgentId || undefined
              };
          
          const response = await fetch('/api/upload-google-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Update agent ID if this is a new session
            if (!currentAgentId) {
              currentAgentId = data.session_id;
              setAgentId(currentAgentId);
            }
            
            // Extract row and column info from the response
            const rows = data.data_info?.rows || data.rows || 0;
            const columns = data.data_info?.columns || data.columns || 0;
            
            // Success message removed to avoid duplication in chat interface
            
            // Add to uploaded files
            const newUploadedFile = {
              name: data.filename || 'Google Sheet',
              agentId: data.session_id,
              rows: rows
            };
            setUploadedFiles(prev => [...prev, newUploadedFile]);
            
            // Refresh sidebar to show new session
            setSidebarRefreshTrigger(prev => prev + 1);
            
            // Clear the Google Sheet URLs from state
            sheetsToProcess.forEach(url => {
              setGoogleSheetUrls(prev => prev.filter(u => u !== url));
            });
            
            // If user provided a question along with the Google Sheet URL, process it
            if (message.trim()) {
              // Continue to process the user's question below
              // Don't return here - let the code continue to the chat processing
            } else {
              // No question provided, just loaded the sheet
              setIsLoading(false);
              return;
            }
          } else {
            throw new Error(data.error || 'Failed to load Google Sheet');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setMessages(prev => [...prev, { 
            type: 'system', 
            content: `❌ Error loading Google Sheet: ${errorMessage}`,
            timestamp: new Date()
          }]);
          setIsLoading(false);
          return;
        }
      }
      
      // Handle regular file uploads if there are any
      if (files.length > 0) {
        let successfulUploads = 0;
        let primaryAgentId: string | null = null;
        let sessionId: string | null = null;
        const newUploadedFiles: UploadedFile[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('file', file);
          formData.append('memory_size', memorySize.toString());
          
          // For multi-file uploads, use the same session ID for all files
          if (sessionId) {
            formData.append('session_id', sessionId);
          }

          try {
            const response = await fetch('/api/upload-full', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();
            
            if (data.success) {
              if (i === 0) {
                primaryAgentId = data.session_id;
                currentAgentId = data.session_id;
                setAgentId(data.session_id);
                sessionId = data.session_id; // Store session ID for subsequent files
              }
              successfulUploads++;
              // Store both original and secure filenames
              uploadedFileNames.push({
                originalName: file.name,
                secureName: data.filename || file.name,
                displayName: file.name
              });
              newUploadedFiles.push({
                name: file.name,
                agentId: data.session_id,
                rows: data.data_info.rows
              });
              // Refresh sidebar sessions list after successful upload
              setSidebarRefreshTrigger(prev => prev + 1);
            }
          } catch (fileError) {
            console.error(`Error uploading ${file.name}:`, fileError);
          }
        }

        // Clear queued files after upload
        setQueuedFiles([]);

        if (successfulUploads === 0) {
          setMessages(prev => [...prev, { 
            type: 'system', 
            content: '❌ Failed to upload files. Please check your file format and try again.' 
          }]);
          setIsLoading(false);
          return;
        }
        
        // Update uploaded files state
        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      }

      // If no agent ID, create a temporary session first
      if (!currentAgentId) {
        try {
          const sessionResponse = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const sessionData = await sessionResponse.json();
          
          if (sessionData.success) {
            const tempAgentId = sessionData.session_id;
            // Persist session for subsequent messages so context/memory is preserved
            setAgentId(tempAgentId);
            currentAgentId = tempAgentId;
            // Refresh sidebar sessions list after creating new session
            setSidebarRefreshTrigger(prev => prev + 1);
          } else {
            setMessages(prev => [...prev, { 
              type: 'assistant', 
              content: 'Sorry, I could not create a session. Please try again.' 
            }]);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error creating session:', error);
          setMessages(prev => [...prev, { 
            type: 'assistant', 
            content: 'Sorry, I encountered an error creating a session. Please try again.' 
          }]);
          setIsLoading(false);
          return;
        }
      }

      // Only proceed if there's an actual message to send
      if (!userMessage) {
        setIsLoading(false);
        return;
      }
      
      // Add user message with attached files and Google Sheets
      const fileIndicators = [];
      if (uploadedFileNames.length > 0) {
        fileIndicators.push(...uploadedFileNames.map(f => f.displayName));
      }
      
      // Add Google Sheets indicators (only if they haven't been processed yet)
      if (sheetsToProcess.length > 0 && userMessage) {
        const sheetLabel = sheetsToProcess.length === 1 ? 'Google Sheet' : `${sheetsToProcess.length} Google Sheets`;
        fileIndicators.push(sheetLabel);
      }
      
      // Always add user message, including Google Sheets info
      setMessages(prev => [...prev, { 
        type: 'user' as const, 
        content: userMessage,
        files: fileIndicators.length > 0 ? fileIndicators : undefined,
        fileMapping: uploadedFileNames.length > 0 ? uploadedFileNames.reduce((acc, f) => {
          acc[f.displayName] = f.secureName;
          return acc;
        }, {} as Record<string, string>) : undefined,
        // sheetUrl removed to prevent duplicate chips - using files array instead
      } as any]);

      // Send chat message via streaming (no "Thinking..." - start streaming immediately)
      let assistantIndex: number | null = null;
      
      try {
        console.log('🚀 Starting streaming request to /api/chat-stream with agent_id:', currentAgentId);
        
        // Prepare assistant message placeholder with streaming cursor
        setMessages(prev => {
          assistantIndex = prev.length;
          return [...prev, { type: 'assistant' as const, content: '', isStreaming: true }];
        });
        
        const response = await fetch('/api/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({ agent_id: currentAgentId, message: userMessage }),
        });
        
        console.log('📡 Streaming response received:', response.status, response.statusText);

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let isDone = false;
        let chunkCount = 0;
        
        console.log('📖 Starting ChatGPT-like streaming...');
        
        while (!isDone) {
          const { value, done: doneReading } = await reader.read();
          if (doneReading) break;
          
          if (value) {
            chunkCount++;
            buffer += decoder.decode(value, { stream: true });
            console.log(`📦 Chunk ${chunkCount}:`, buffer);
            
            // Process complete SSE lines
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
              const rawLine = buffer.slice(0, newlineIndex).trimEnd();
              buffer = buffer.slice(newlineIndex + 1);
              
              if (!rawLine) continue; // Skip blank lines between events
              
              console.log('🔍 Raw line:', `"${rawLine}"`);
              
              // Skip keep-alive lines (start with ':')
              if (rawLine.startsWith(':')) {
                console.log('⏭️ Skipping keep-alive line');
                continue;
              }
              
              // Handle data lines
              if (rawLine.startsWith('data: ')) {
                const payload = rawLine.slice(6); // Extract payload after 'data: '
                console.log('📦 Payload:', `"${payload}"`);
                
                // Check for completion signal
                if (payload.trim() === '[DONE]') {
                  console.log('✅ Streaming completed with [DONE] signal');
                  isDone = true;
                  break;
                }
                
                // Handle chart data event
                if (payload.trim().startsWith('[CHARTS]')) {
                  try {
                    const chartJson = payload.trim().slice(8); // Remove '[CHARTS]' prefix
                    const chartData = JSON.parse(chartJson);
                    console.log('📊 Received chart data:', chartData.charts);
                    
                    // Add chart data to the assistant message
                    setMessages(prev => {
                      const copy = [...prev];
                      const idx = assistantIndex ?? copy.length - 1;
                      if (copy[idx] && copy[idx].type === 'assistant') {
                        copy[idx] = {
                          ...copy[idx],
                          charts: chartData.charts
                        } as any;
                      }
                      return copy;
                    });
                    continue; // Don't process this as regular text
                  } catch (e) {
                    console.error('Error parsing chart data:', e);
                  }
                }
                
                // Handle Excel file URLs event
                if (payload.trim().startsWith('[EXCEL]')) {
                  try {
                    const excelJson = payload.trim().slice(7); // Remove '[EXCEL]' prefix
                    const excelData = JSON.parse(excelJson);
                    console.log('📊 Received Excel URLs:', excelData.excel_files);
                    
                    // Add Excel URLs to the assistant message
                    setMessages(prev => {
                      const copy = [...prev];
                      const idx = assistantIndex ?? copy.length - 1;
                      if (copy[idx] && copy[idx].type === 'assistant') {
                        copy[idx] = {
                          ...copy[idx],
                          excelFiles: excelData.excel_files
                        } as any;
                      }
                      return copy;
                    });
                    continue; // Don't process this as regular text
                  } catch (e) {
                    console.error('Error parsing Excel data:', e);
                  }
                }
                
                // Handle URL data event
                if (payload.trim().startsWith('[URL]')) {
                  try {
                    const urlJson = payload.trim().slice(5); // Remove '[URL]' prefix
                    const urlData = JSON.parse(urlJson);
                    console.log('🔗 Received URL data:', urlData);
                    
                    // Add URL data to the assistant message
                    setMessages(prev => {
                      const copy = [...prev];
                      const idx = assistantIndex ?? copy.length - 1;
                      if (copy[idx] && copy[idx].type === 'assistant') {
                        copy[idx] = {
                          ...copy[idx],
                          sheetUrl: urlData.sheet_url,
                          linkText: urlData.link_text
                        } as any;
                      }
                      return copy;
                    });
                    continue; // Don't process this as regular text
                  } catch (e) {
                    console.error('Error parsing URL data:', e);
                  }
                }
                
                // Handle JSON error messages
                if (payload.trim().startsWith('{')) {
                  try {
                    const obj = JSON.parse(payload.trim());
                    if (obj.error) {
                      throw new Error(obj.error);
                    }
                  } catch {
                    // treat as plain text if not valid JSON
                  }
                }
                
                // Stream the token exactly as received (backend handles spacing)
                const token = payload;
                console.log('📝 Frontend received token:', `"${token}"`, 'Length:', token.length);
                
                setMessages(prev => {
                  const copy = [...prev];
                  const idx = assistantIndex ?? copy.length - 1;
                  if (!copy[idx] || copy[idx].type !== 'assistant') return copy;
                  
                  const currentContent = copy[idx].content || '';
                  const newContent = currentContent + token;
                  console.log('📄 Current content after adding token:', `"${newContent}"`);
                  
                  // Append token exactly as received - no extra spacing
                  copy[idx] = { 
                    ...copy[idx], 
                    content: newContent,
                    isStreaming: true
                  } as any;
                  return copy;
                });
              }
            }
          }
        }
        
        console.log(`🏁 ChatGPT-like streaming finished. Total chunks: ${chunkCount}`);
        
        // Mark streaming as complete and extract images from message
        setMessages(prev => {
          const copy = [...prev];
          const idx = assistantIndex ?? copy.length - 1;
          if (copy[idx] && copy[idx].type === 'assistant') {
            const content = copy[idx].content || '';
            
            // Check if images were already set by [PLOTS] event
            const existingImages = copy[idx].images || [];
            
            // Extract image URLs from download links in the message (fallback)
            // Pattern: /api/download/chart_*.png or chart_*.png: /api/download/...
            const imageUrlPatterns = [
              /\/api\/download\/(chart_[^\s\n)]+\.png)/gi,  // /api/download/chart_...png
              /chart_([^\s\n)]+\.png)\s*:\s*\/api\/download/gi,  // chart_...png: /api/download
              /download.*?:\s*(\/api\/download\/chart_[^\s\n)]+\.png)/gi  // download: /api/download/chart_...png
            ];
            
            const imageUrls: string[] = [...existingImages]; // Start with existing images
            
            imageUrlPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                let imageUrl: string;
                if (match[1].startsWith('/api/download/')) {
                  imageUrl = match[1];
                } else if (match[1].startsWith('chart_')) {
                  imageUrl = `/api/download/${match[1]}`;
                } else {
                  imageUrl = match[1];
                }
                if (!imageUrls.includes(imageUrl)) {
                  imageUrls.push(imageUrl);
                }
              }
            });
            
            copy[idx] = { 
              ...copy[idx], 
              isStreaming: false,
              images: imageUrls.length > 0 ? imageUrls : undefined
            } as any;
          }
          return copy;
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setMessages(prev => {
          const copy = [...prev];
          const idx = assistantIndex ?? copy.length - 1;
          if (copy[idx] && copy[idx].type === 'assistant') {
            copy[idx] = { ...copy[idx], content: `Error: ${errorMessage}`, isStreaming: false } as any;
          } else {
            copy.push({ type: 'assistant', content: `Error: ${errorMessage}`, isStreaming: false });
          }
          return copy;
        });
      }
    } catch (error) {
      setMessages(prev => [...prev, { type: 'assistant', content: `Error: ${error}`, isStreaming: false }]);
    } finally {
      // Mark all streaming as complete
      setMessages(prev => prev.map(msg => ({ ...msg, isStreaming: false })));
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (agentId) {
      try {
        await fetch('/api/new-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agent_id: agentId }),
        });
      } catch (error) {
        console.error('Error starting new chat:', error);
      }
    }
    setMessages([]);
    setQueuedFiles([]);
    setUploadedFiles([]);
    setAgentId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopHeader />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.gsheet,.ods"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Left Side - Avatar Section - Compact AdminEase Match */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
        <div className="text-center relative flex flex-col items-center justify-center h-full">
          {/* Large Centered Avatar - AdminEase styling */}
          <div className="w-44 h-44 mb-4 rounded-full overflow-hidden bg-blue-100 shadow-xl border-4 border-white flex items-center justify-center">
            <img
              src="/gif/Greeting.gif"
              alt="Chief Smile Officer"
              className="w-full h-full object-cover"
              id="captain-alpha-avatar"
            />
          </div>
          
          {/* Professional Title - Compact AdminEase styling */}
          <h3 className="text-lg font-bold text-blue-900 mb-2">Chief Smile Officer</h3>
          
          {/* Status Indicator - Exact AdminEase styling */}
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            <span className="text-sm text-gray-600 font-medium">• Standing By</span>
          </div>
        </div>
      </div>
      
      {/* Right Side - Chat Panel - Exact AdminEase Match */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-[600px] sm:h-[700px] md:h-[600px] lg:h-[600px] xl:h-[600px] flex flex-col w-full max-w-full">
          <ChatHeader />
          
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-white relative min-h-0">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.type === 'user' 
                      ? 'justify-end' 
                      : 'justify-start'
                  } animate-fadeIn`}
                >
                  {msg.type === 'user' ? (
                    <div className="max-w-[85%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl text-xs sm:text-sm shadow-sm transition-all duration-300 hover:shadow-md relative bg-sky-600 text-white rounded-br-md">
                      {/* Show attached files for user messages */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {msg.files.map((filename) => {
                            // Get the secure filename for download from the message's fileMapping
                            const secureFilename = (msg as any).fileMapping?.[filename] || filename;
                            // Determine file icon based on filename or extension
                            const getFileIcon = (filename: string) => {
                              // Handle Google Sheets specifically
                              if (filename.toLowerCase().includes('google sheet')) {
                                return '🔗'; // Link icon for Google Sheets
                              }
                              
                              // Clean filename of special characters and get extension
                              const cleanFilename = filename.replace(/[^\w\s.-]/g, ''); // Remove special chars except word chars, spaces, dots, hyphens
                              const ext = cleanFilename.toLowerCase().split('.').pop();
                              switch (ext) {
                                case 'xlsx':
                                case 'xls':
                                  return '📗'; // Green Excel icon (like in the reference image)
                                case 'csv':
                                  return '📈'; // CSV icon
                                case 'ods':
                                  return '📋'; // OpenDocument icon
                                default:
                                  return '📄'; // Generic file icon
                              }
                            };

                            return (
                              <div
                                key={filename}
                                className="px-2 py-1 bg-sky-500 text-white rounded-md text-xs flex items-center space-x-1"
                              >
                                <span>{getFileIcon(filename)}</span>
                                <span>{filename}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Google Sheets display removed - using files array instead to prevent duplicates */}
                      
                      <p className="font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-sky-100">{msg.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}</p>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[10px] sm:text-xs font-bold flex-shrink-0">
                        AI
                      </div>
                      <div className={`max-w-[85%] sm:max-w-[85%] text-xs sm:text-sm transition-all duration-300 relative bg-transparent text-gray-800 ${
                        msg.images && msg.images.length > 0 ? 'overflow-hidden' : ''
                      }`}>
                        <div className="font-medium leading-relaxed w-fit max-w-full">
                          {msg.type === 'plot' ? (
                            <img src={msg.content} alt="Generated chart" className="max-w-full" />
                          ) : msg.type === 'excel' ? (
                            <div className="flex items-center gap-2">
                              <span>📊 Excel file generated: {msg.content}</span>
                              <div className="flex gap-2">
                                <button
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                                  onClick={() => handlePreviewExcel(msg.content)}
                                >
                                  View Sheet
                                </button>
                                <button
                                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors"
                                  onClick={() => window.location.href = `/api/download/${msg.content}`}
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`whitespace-pre-wrap break-words ${msg.isStreaming ? 'streaming-text' : ''}`}>
                              {msg.content}
                            </div>
                          )}
                          {msg.isStreaming && (
                            <span className="chatgpt-cursor"></span>
                          )}
                        </div>
                        {/* Display images inline if available */}
                        {msg.images && msg.images.length > 0 && (
                          <div className="mt-4 space-y-3 w-full">
                            {msg.images.map((imageUrl, imgIdx) => {
                              // Extract filename from URL
                              const filename = imageUrl.split('/').pop() || `chart_${imgIdx + 1}.png`;
                              return (
                                <div key={imgIdx} className="relative inline-block w-full">
                                  <div className="rounded-lg overflow-hidden w-full relative">
                                    <img 
                                      src={imageUrl} 
                                      alt=""
                                      className="w-full h-auto rounded-lg"
                                      style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '400px', 
                                        objectFit: 'contain',
                                        display: 'block'
                                      }}
                                    />
                                    {/* Download icon button in top right */}
                                    <Button 
                                      size="sm" 
                                      variant="secondary"
                                      onClick={async () => {
                                        try {
                                          // Fetch the image as blob and download
                                          const response = await fetch(imageUrl);
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = filename;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          window.URL.revokeObjectURL(url);
                                        } catch (error) {
                                          console.error('Download error:', error);
                                          // Fallback: open in new tab
                                          window.open(imageUrl, '_blank');
                                        }
                                      }}
                                      className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full shadow-lg hover:shadow-xl bg-muted/90 hover:bg-muted border border-border/50"
                                      title={`Download ${filename}`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                      </svg>
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Display Excel file download buttons if available */}
                        {msg.excelFiles && msg.excelFiles.length > 0 && (
                          <div className="mt-4 space-y-2 w-full">
                            {msg.excelFiles.map((excelUrl, excelIdx) => {
                              // Extract filename from URL
                              const filename = excelUrl.split('/').pop() || `excel_file_${excelIdx + 1}.xlsx`;
                              // Clean display name (remove timestamp)
                              let displayName = filename;
                              const timestampMatch = filename.match(/^(.+)_(\d{10,})\.xlsx$/);
                              if (timestampMatch) {
                                displayName = `${timestampMatch[1]}.xlsx`;
                              }
                              
                              return (
                                <div key={excelIdx} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                      <path d="M14 2v6h6"/>
                                    </svg>
                                    📊 Excel file generated: {displayName}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors font-medium"
                                      onClick={() => handlePreviewExcel(filename)}
                                    >
                                      View Sheet
                                    </button>
                                    <button
                                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors font-medium"
                                      onClick={() => window.open(excelUrl, '_blank')}
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Display Google Sheets hyperlink if available */}
                        {msg.sheetUrl && (
                          <div className="mt-4 w-full">
                            <a
                              href={msg.sheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                              </svg>
                              <span className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                                </svg>
                                🔗 {msg.linkText || "View updated sheet"}
                              </span>
                            </a>
                          </div>
                        )}
                        {/* Display interactive charts if available */}
                        {msg.charts && msg.charts.length > 0 && (
                          <div className="mt-4 space-y-6 w-full max-w-full overflow-hidden">
                            {msg.charts.map((chart, chartIdx) => (
                              <div key={chartIdx} className="w-full max-w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <ChartDisplay chartData={chart} />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-gray-500">{msg.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {/* Invisible div for auto-scrolling to bottom */}
            <div ref={messagesEndRef} />
          </div>
          
          <ChatInput 
            onSend={handleSendMessage} 
            disabled={isLoading} 
            onFileUpload={() => fileInputRef.current?.click()}
            onEmailUpload={() => {
              // Email mode activated - user can now enter email address
            }}
            queuedFiles={queuedFiles}
            onRemoveFile={handleRemoveFile}
            googleSheetUrls={googleSheetUrls}
            onRemoveGoogleSheet={handleRemoveGoogleSheet}
          />
        </div>
        </div>
      </div>
      </div>

      {/* Excel Preview Bottom Panel */}
      {showPreview && (
        <div className="w-full bg-white border-t-2 border-gray-200 shadow-lg">
          <div className="max-w-full mx-auto">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">📊 Excel Preview: {previewData?.filename}</h3>
                {previewData?.sheets && previewData.sheets.length > 1 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {previewData.sheets.length} sheets • Total rows: {previewData.sheets.reduce((sum: number, sheet: any) => sum + sheet.rows, 0).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                title="Close preview"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 max-h-[70vh] overflow-y-auto bg-white">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading preview...</div>
                </div>
              ) : previewData ? (
                <div className="space-y-6">
                  {/* Sheet Navigation for Multiple Sheets */}
                  {previewData.sheets && previewData.sheets.length > 1 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                      <span className="text-sm font-medium text-gray-700 mr-2">Sheets:</span>
                      {previewData.sheets.map((sheet: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const element = document.getElementById(`sheet-${idx}`);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
                        >
                          📋 {sheet.name} ({sheet.rows} rows)
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {previewData.sheets.map((sheet: any, sheetIdx: number) => (
                    <div key={sheetIdx} id={`sheet-${sheetIdx}`} className="border rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-blue-50 px-4 py-3 border-b">
                        <h4 className="font-medium text-sm text-blue-900">
                          📋 Sheet: {sheet.name} ({sheet.rows} rows, {sheet.columns} columns)
                          {sheet.preview_rows < sheet.rows && (
                            <span className="text-blue-600 ml-2">
                              (showing first {sheet.preview_rows} rows)
                            </span>
                          )}
                        </h4>
                      </div>
                      
                      <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              {sheet.column_info.map((col: any, colIdx: number) => (
                                <th key={colIdx} className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-300 min-w-[100px] whitespace-nowrap">
                                  <div className="font-semibold">{col.name}</div>
                                  <div className="text-[10px] text-gray-500 font-normal">{col.type}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.data.map((row: any, rowIdx: number) => (
                              <tr key={rowIdx} className={`border-b hover:bg-gray-50 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                {sheet.column_info.map((col: any, colIdx: number) => {
                                  const cellValue = row[col.name];
                                  const cellFormatting = row[`${col.name}_formatting`];
                                  const backgroundColor = cellFormatting?.background_color;
                                  
                                  return (
                                    <td 
                                      key={colIdx} 
                                      className="px-3 py-2 border-r border-gray-200 text-gray-800 text-xs whitespace-nowrap"
                                      style={{
                                        backgroundColor: backgroundColor || undefined,
                                        color: backgroundColor ? getContrastColor(backgroundColor) : undefined
                                      }}
                                    >
                                      {cellValue !== null && cellValue !== undefined 
                                        ? String(cellValue) 
                                        : <span className="text-gray-400 italic">—</span>
                                      }
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg">📄</div>
                  <div className="mt-2">No preview data available</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
