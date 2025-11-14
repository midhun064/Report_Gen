/**
 * Excel Chat Service - Integration with ExcelChat backend
 * Provides file upload, Google Sheets integration, and data analysis capabilities
 */

export interface ExcelChatResponse {
  success: boolean;
  session_id?: string;
  data_info?: {
    rows: number;
    columns: number;
  };
  filename?: string;
  error?: string;
  charts?: ChartData[];
  excel_files?: string[];
  sheet_url?: string;
  link_text?: string;
}

export interface ChartData {
  type: 'pie' | 'bar' | 'line';
  title: string;
  data: Array<{
    name: string;
    value: number;
    fill?: string;
  }>;
  dataKey: string;
  nameKey: string;
}

export interface UploadedFile {
  name: string;
  sessionId: string;
  rows: number;
  columns: number;
}

class ExcelChatService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Upload Excel/CSV files for analysis
   */
  async uploadFiles(files: File[], sessionId?: string): Promise<ExcelChatResponse> {
    try {
      const formData = new FormData();
      
      // Add files to form data
      files.forEach(file => {
        formData.append('file', file);
      });
      
      // Add session ID if provided
      if (sessionId) {
        formData.append('session_id', sessionId);
      }
      
      const response = await fetch(`${this.baseUrl}/api/excel-chat/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Load Google Sheets by URL
   */
  async loadGoogleSheets(urls: string[], sessionId?: string): Promise<ExcelChatResponse> {
    try {
      const requestBody = urls.length === 1 
        ? { 
            spreadsheet_url: urls[0],
            session_id: sessionId
          }
        : {
            spreadsheet_urls: urls,
            session_id: sessionId
          };

      const response = await fetch(`${this.baseUrl}/api/excel-chat/google-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading Google Sheets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load Google Sheets'
      };
    }
  }

  /**
   * Send chat message with streaming support
   */
  async sendMessage(
    message: string, 
    sessionId: string,
    onChunk?: (chunk: string) => void,
    onChart?: (charts: ChartData[]) => void,
    onExcelFiles?: (files: string[]) => void,
    onComplete?: (fullResponse: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/excel-chat/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          agent_id: sessionId, 
          message: message 
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const rawLine = buffer.slice(0, newlineIndex).trimEnd();
            buffer = buffer.slice(newlineIndex + 1);

            if (!rawLine || rawLine.startsWith(':')) continue;

            if (rawLine.startsWith('data: ')) {
              const payload = rawLine.slice(6);

              // Check for completion
              if (payload.trim() === '[DONE]') {
                onComplete?.(fullResponse);
                return;
              }

              // Handle chart data
              if (payload.trim().startsWith('[CHARTS]')) {
                try {
                  const chartJson = payload.trim().slice(8);
                  const chartData = JSON.parse(chartJson);
                  onChart?.(chartData.charts);
                  continue;
                } catch (e) {
                  console.error('Error parsing chart data:', e);
                }
              }

              // Handle Excel files
              if (payload.trim().startsWith('[EXCEL]')) {
                try {
                  const excelJson = payload.trim().slice(7);
                  const excelData = JSON.parse(excelJson);
                  onExcelFiles?.(excelData.excel_files);
                  continue;
                } catch (e) {
                  console.error('Error parsing Excel data:', e);
                }
              }

              // Regular text chunk
              fullResponse += payload;
              onChunk?.(payload);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming chat:', error);
      throw error;
    }
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<{ success: boolean; session_id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/excel-chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
      };
    }
  }

  /**
   * Validate if URL is a Google Sheets URL
   */
  isGoogleSheetsUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'docs.google.com' && 
             urlObj.pathname.includes('/spreadsheets/d/');
    } catch (e) {
      return false;
    }
  }

  /**
   * Extract short URL for display
   */
  getShortUrl(url: string): string {
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
  }
}

export const excelChatService = new ExcelChatService();
export default ExcelChatService;
