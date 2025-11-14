"""
Integration Script: Add Google Sheets Support to ExcelChat
This script shows you exactly what to add to your existing files
"""

print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                  Google Sheets Integration - Code Snippets                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

Follow these steps to integrate Google Sheets into your ExcelChat application:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 STEP 1: Modify full_data_agent.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to imports (around line 27):
""")

print("""
from .google_sheets_service import GoogleSheetsService
""")

print("""
Add to __init__ method (around line 62, after Excel operations init):
""")

print("""
        # Initialize Google Sheets service
        try:
            self.google_sheets = GoogleSheetsService()
            logger.info("✅ Google Sheets service initialized")
        except Exception as e:
            logger.warning(f"⚠️ Google Sheets service not available: {e}")
            self.google_sheets = None
""")

print("""
Add new method (after load_excel_file method, around line 318):
""")

print('''
    def load_google_sheet(
        self, 
        spreadsheet_url: str, 
        session_id: str, 
        sheet_name: str = None,
        file_id: str = None
    ) -> Dict[str, Any]:
        """
        Load Google Sheet directly from URL
        
        Args:
            spreadsheet_url: Google Sheets URL
            session_id: Session identifier
            sheet_name: Optional worksheet name
            file_id: Optional file identifier
        
        Returns:
            Dict with success status and file information
        """
        try:
            if not self.google_sheets:
                return {
                    "success": False,
                    "error": "Google Sheets integration not configured. Run test_google_sheets.py first."
                }
            
            logger.info(f"📊 Loading Google Sheet: {spreadsheet_url}")
            
            # Read Google Sheet to DataFrame
            df = self.google_sheets.read_sheet_to_dataframe(
                spreadsheet_url, 
                sheet_name=sheet_name
            )
            
            # Generate file_id if not provided
            if file_id is None:
                file_id = f"gsheet_{len(self.get_session_files(session_id)) + 1}"
            
            # Initialize session if needed
            if session_id not in self.session_data:
                self.session_data[session_id] = {
                    "files": {},
                    "conversation_history": [],
                    "active_file": None,
                    "combined_df": None,
                    "last_generated_file": None,
                    "generated_files_history": []
                }
            
            # Optimize data types
            df_optimized = self._optimize_dtypes(df)
            
            # Create data profile
            data_profile = self._create_comprehensive_profile(df_optimized)
            
            # Store in session
            self.session_data[session_id]["files"][file_id] = {
                "df": df_optimized,
                "profile": data_profile,
                "filename": f"GoogleSheet_{sheet_name or 'Sheet1'}",
                "source_type": "google_sheets",
                "spreadsheet_url": spreadsheet_url,
                "sheet_name": sheet_name,
                "memory_usage_mb": df_optimized.memory_usage(deep=True).sum() / 1024 / 1024
            }
            
            # Set as active file if first one
            if self.session_data[session_id]["active_file"] is None:
                self.session_data[session_id]["active_file"] = file_id
            
            # Update combined DataFrame
            self._update_combined_dataframe(session_id)
            
            logger.info(f"✅ Google Sheet loaded: {file_id} ({len(df_optimized)} rows)")
            
            return {
                "success": True,
                "session_id": session_id,
                "file_id": file_id,
                "filename": f"GoogleSheet_{sheet_name or 'Sheet1'}",
                "rows": len(df_optimized),
                "columns": len(df_optimized.columns),
                "memory_usage_mb": df_optimized.memory_usage(deep=True).sum() / 1024 / 1024,
                "total_files": len(self.session_data[session_id]["files"]),
                "profile": data_profile
            }
            
        except Exception as e:
            logger.error(f"❌ Error loading Google Sheet: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
''')

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 STEP 2: Add API Endpoint to enhanced_app.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add this endpoint (after /api/upload-full, around line 363):
""")

print('''
    @app.route('/api/upload-google-sheet', methods=['POST'])
    def upload_google_sheet():
        """
        Load Google Sheet by URL
        
        Request JSON:
        {
            "spreadsheet_url": "https://docs.google.com/spreadsheets/d/.../edit",
            "session_id": "optional-session-id",
            "sheet_name": "optional-sheet-name"
        }
        """
        try:
            data = request.get_json()
            
            if not data or 'spreadsheet_url' not in data:
                return jsonify({
                    "success": False, 
                    "error": "spreadsheet_url required"
                }), 400
            
            spreadsheet_url = data['spreadsheet_url']
            session_id = data.get('session_id') or str(uuid.uuid4())
            sheet_name = data.get('sheet_name')
            
            logger.info(f"📊 Loading Google Sheet from URL: {spreadsheet_url[:50]}...")
            
            # Load Google Sheet
            result = full_data_agent.load_google_sheet(
                spreadsheet_url,
                session_id,
                sheet_name=sheet_name
            )
            
            if not result["success"]:
                return jsonify(result), 400
            
            response_data = {
                "success": True,
                "session_id": session_id,
                "file_id": result["file_id"],
                "filename": result["filename"],
                "total_files": result["total_files"],
                "data_info": {
                    "rows": result["rows"],
                    "columns": result["columns"],
                    "memory_usage_mb": round(result["memory_usage_mb"], 2)
                },
                "message": ""  # Remove predefined message to avoid duplication in chat
            }
            
            logger.info(f"✅ Google Sheet loaded successfully: {result['filename']}")
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"❌ Error loading Google Sheet: {e}", exc_info=True)
            return jsonify({"success": False, "error": str(e)}), 500
''')

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 STEP 3: Test Your Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. First, test authentication:
   python backend/test_google_sheets.py

2. Then test the API endpoint with curl or Postman:
""")

print('''
   curl -X POST http://localhost:5000/api/upload-google-sheet \\
        -H "Content-Type: application/json" \\
        -d '{
          "spreadsheet_url": "YOUR_GOOGLE_SHEET_URL",
          "session_id": "test123"
        }'
''')

print("""
3. Or test programmatically:
""")

print('''
   import requests
   
   response = requests.post(
       'http://localhost:5000/api/upload-google-sheet',
       json={
           'spreadsheet_url': 'YOUR_GOOGLE_SHEET_URL',
           'session_id': 'test123'
       }
   )
   print(response.json())
''')

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 STEP 4: Frontend Integration (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to frontend/src/pages/index.tsx:
""")

print('''
// Add state
const [googleSheetUrl, setGoogleSheetUrl] = useState('');
const [showGoogleSheetInput, setShowGoogleSheetInput] = useState(false);

// Add handler
const handleGoogleSheetUpload = async () => {
  if (!googleSheetUrl.trim()) {
    alert('Please enter a Google Sheets URL');
    return;
  }
  
  setIsLoading(true);
  
  try {
    const response = await fetch('http://localhost:5000/api/upload-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheet_url: googleSheetUrl,
        session_id: agentId || undefined,
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      setAgentId(data.session_id);
      setMessages([
        ...messages,
        {
          type: 'system',
          content: `✅ ${data.message}`,
        },
      ]);
      setGoogleSheetUrl('');
      setShowGoogleSheetInput(false);
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to load Google Sheet');
  } finally {
    setIsLoading(false);
  }
};

// Add UI (near file upload button)
<button onClick={() => setShowGoogleSheetInput(!showGoogleSheetInput)}>
  📊 Load Google Sheet
</button>

{showGoogleSheetInput && (
  <div className="google-sheet-input">
    <input
      type="text"
      placeholder="Paste Google Sheets URL..."
      value={googleSheetUrl}
      onChange={(e) => setGoogleSheetUrl(e.target.value)}
    />
    <button onClick={handleGoogleSheetUpload} disabled={isLoading}>
      Load
    </button>
  </div>
)}
''')

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Created:
✅ backend/services/google_sheets_service.py
✅ backend/test_google_sheets.py
✅ backend/requirements.txt (updated)
✅ GOOGLE_SHEETS_INTEGRATION_RND.md (full documentation)
✅ GOOGLE_SHEETS_QUICK_START.md (quick reference)

Next Steps:
1. Run: python backend/test_google_sheets.py
2. Add code snippets above to your files
3. Restart your backend server
4. Test with a Google Sheet URL

Need Help?
- Check GOOGLE_SHEETS_QUICK_START.md for examples
- Check GOOGLE_SHEETS_INTEGRATION_RND.md for detailed docs
- Run test_google_sheets.py to verify setup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
