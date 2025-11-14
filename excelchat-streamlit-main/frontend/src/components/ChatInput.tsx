import { useEffect, useRef, useState } from "react";
import { Mic, Send, Plus, X, Mail, File, FileSpreadsheet, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileChip from "./FileChip";
import GoogleSheetChip from "./GoogleSheetChip";

interface QueuedFile {
  name: string;
  file: File;
}

interface ChatInputProps {
  onSend?: (message: string, files: File[], googleSheetUrl?: string, googleSheetUrls?: string[]) => void;
  disabled?: boolean;
  onFileUpload?: () => void;
  onEmailUpload?: () => void;
  queuedFiles?: QueuedFile[];
  onRemoveFile?: (filename: string) => void;
  googleSheetUrls?: string[];
  onRemoveGoogleSheet?: (url: string) => void;
}

const ChatInput = ({ onSend, disabled, onFileUpload, onEmailUpload, queuedFiles = [], onRemoveFile, googleSheetUrls = [], onRemoveGoogleSheet }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [detectedGoogleSheetUrls, setDetectedGoogleSheetUrls] = useState<string[]>([]);
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [googleSheetsLink, setGoogleSheetsLink] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const supportsSTT = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  useEffect(() => {
    if (!supportsSTT) return;
    const SpeechRecognitionCtor: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition: any = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false; // only commit final results to avoid duplicates
    recognition.continuous = true; // keep listening until stopped

    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript + " ";
      }
      if (finalText) setMessage(prev => (prev ? prev + " " : "") + finalText.trim());
    };

    recognition.onend = () => {
      setIsStarting(false);
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [supportsSTT]);

  const isGoogleSheetsUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'docs.google.com' && 
             urlObj.pathname.includes('/spreadsheets/d/');
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    const trimmedMessage = message.trim();
    
    const allGoogleSheetUrls = [...googleSheetUrls, ...detectedGoogleSheetUrls];
    
    if ((trimmedMessage || queuedFiles.length > 0 || allGoogleSheetUrls.length > 0) && !disabled) {
      // Immediately clear the input for better UX responsiveness
      setMessage("");
      
      // Handle Google Sheets URLs
      if (detectedGoogleSheetUrls.length > 0) {
        const allGoogleSheetUrls = [...detectedGoogleSheetUrls];
        if (googleSheetsLink.trim()) {
          allGoogleSheetUrls.push(googleSheetsLink.trim());
        }
        
        // Send all URLs - use both single URL (for backward compatibility) and URLs array
        onSend?.(trimmedMessage, [], allGoogleSheetUrls[0], allGoogleSheetUrls);
        setDetectedGoogleSheetUrls([]);
      } else {
        // Regular message or files
        const filesToSend = queuedFiles.map(qf => qf.file);
        onSend?.(trimmedMessage, filesToSend);
      }
      
      // Reset textarea height to original size
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = '44px'; // Reset to minimum height
      }
      
      setIsEmailMode(false); // Exit email mode after sending
      // Stop STT when sending to prevent overlapping sessions
      if (isRecording) stopSTT(false);
    }
  };

  const handleEmailMode = () => {
    setIsEmailMode(true);
    onEmailUpload?.();
  };

  const cancelEmailMode = () => {
    setIsEmailMode(false);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // Check if the message contains Google Sheets URLs
    const lines = newMessage.split('\n');
    const urls: string[] = [];
    let remainingText = '';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (isGoogleSheetsUrl(trimmed)) {
        urls.push(trimmed);
      } else if (trimmed) {
        remainingText += (remainingText ? '\n' : '') + line;
      }
    });
    
    if (urls.length > 0) {
      setDetectedGoogleSheetUrls(prev => [...prev, ...urls]);
      setMessage(remainingText); // Keep non-URL text
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const stopSTT = (clearText: boolean) => {
    const rec = recognitionRef.current as any;
    try { rec && rec.stop && rec.stop(); } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setIsStarting(false);
    if (clearText) setMessage("");
  };

  const toggleRecording = () => {
    if (!supportsSTT) return;
    const rec = recognitionRef.current as any;
    if (!rec) return;
    if (isRecording) {
      stopSTT(false);
    } else {
      if (isStarting) return; // guard against rapid clicks
      setIsStarting(true);
      try {
        rec.start(); 
        setIsRecording(true);
        // start audio visualization
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          mediaStreamRef.current = stream;
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = ctx as AudioContext;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;
          const dataArray = new Uint8Array(analyser.fftSize);
          const animate = () => {
            if (!analyserRef.current || !canvasRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataArray);
            const canvas = canvasRef.current;
            const ctx2d = canvas.getContext('2d')!;
            ctx2d.clearRect(0,0,canvas.width,canvas.height);
            ctx2d.strokeStyle = '#ef4444';
            ctx2d.lineWidth = 2;
            ctx2d.beginPath();
            const slice = canvas.width / dataArray.length;
            for(let i=0;i<dataArray.length;i++){
              const v = dataArray[i]/128.0; //0-2
              const y = (v-1)*canvas.height/2 * -1 + canvas.height/2;
              const x = i*slice;
              if(i===0) ctx2d.moveTo(x,y); else ctx2d.lineTo(x,y);
            }
            ctx2d.stroke();
            rafRef.current = requestAnimationFrame(animate);
          };
          rafRef.current = requestAnimationFrame(animate);
        }).catch(() => {
          // ignore visualization errors
        });
      } catch { setIsStarting(false); }
    }
  };

  // ESC key stops STT gracefully
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecording) stopSTT(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRecording]);

  // Close attachment panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.attachment-panel') && !target.closest('.attachment-button')) {
        setShowAttachmentPanel(false);
        setShowLinkPanel(false);
      }
    };

    if (showAttachmentPanel || showLinkPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAttachmentPanel, showLinkPanel]);

  const allGoogleSheetUrls = [...googleSheetUrls, ...detectedGoogleSheetUrls];

  // Handle Google Sheets link submission
  const handleLinkSubmit = () => {
    if (googleSheetsLink.trim()) {
      // Add the Google Sheets URL to the detected URLs
      setDetectedGoogleSheetUrls(prev => [...prev, googleSheetsLink.trim()]);
      setGoogleSheetsLink("");
      setShowLinkPanel(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 border-t border-gray-200 bg-white rounded-b-2xl">
      {/* STT Status Indicator */}
      {isRecording && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse shadow-sm"></div>
            <span className="text-xs sm:text-sm text-red-700 font-semibold">Listening...</span>
          </div>
          {/* Add interim transcript display if needed */}
        </div>
      )}
      
      {/* Queued Files and Google Sheets Display */}
      {(queuedFiles.length > 0 || allGoogleSheetUrls.length > 0) && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Ready for Analysis ({queuedFiles.length + allGoogleSheetUrls.length})
            </span>
            <button
              onClick={() => {
                // Clear all files and URLs
                queuedFiles.forEach(file => onRemoveFile?.(file.name));
                allGoogleSheetUrls.forEach(url => onRemoveGoogleSheet?.(url));
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
                onRemove={() => onRemoveFile?.(file.name)}
              />
            ))}
            {/* Google Sheets URL chips */}
            {allGoogleSheetUrls.map((url, index) => (
              <GoogleSheetChip
                key={`${url}-${index}`}
                url={url}
                onRemove={() => {
                  setDetectedGoogleSheetUrls(prev => prev.filter(u => u !== url));
                  onRemoveGoogleSheet?.(url);
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end space-x-2 sm:space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="w-full pl-14 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none min-h-[44px] max-h-[120px] overflow-y-auto"
            disabled={disabled}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '44px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
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
            
            {/* AdminEase Attachment Panel */}
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
                    onClick={() => {
                      onFileUpload?.();
                      setShowAttachmentPanel(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Data Files</div>
                      <div className="text-xs text-gray-500">Excel, CSV for analysis</div>
                    </div>
                  </button>
                  
                  {/* Link Option - Google Sheets */}
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
                    onClick={() => {
                      handleEmailMode();
                      setShowAttachmentPanel(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Mail className="h-4 w-4 text-purple-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Email</div>
                      <div className="text-xs text-gray-500">Email attachment</div>
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
          </div>
        </div>
        
        {/* Volume Button - TTS Control */}
        <button
          type="button"
          className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl bg-gradient-to-br from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
          title="TTS Enabled"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>

        {/* Microphone Button - STT Control */}
        <button
          type="button"
          onClick={toggleRecording}
          className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
            isRecording 
              ? 'bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white' 
              : 'bg-gradient-to-br from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white'
          }`}
          title={isRecording ? "Stop Voice Input (STT)" : "Start Voice Input (STT)"}
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || (!message.trim() && queuedFiles.length === 0 && allGoogleSheetUrls.length === 0)}
          className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {disabled ? (
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
