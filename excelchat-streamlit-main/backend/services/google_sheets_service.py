"""
Google Sheets Integration Service
Handles reading/writing Google Sheets with pandas DataFrames using OAuth credentials
"""

import os
import json
import logging
import pandas as pd
import gspread
from gspread_dataframe import get_as_dataframe, set_with_dataframe
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from typing import Dict, Any, Optional, List
from pathlib import Path
import pickle

logger = logging.getLogger(__name__)

class GoogleSheetsService:
    """Service for interacting with Google Sheets using OAuth authentication"""
    
    # Required scopes for Google Sheets API
    SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
    ]
    
    def __init__(self, credentials_path: str = None, token_path: str = None):
        """
        Initialize Google Sheets service with OAuth credentials
        
        Args:
            credentials_path: Path to OAuth client credentials JSON file
            token_path: Path to store/load user token (default: temp/token.pickle)
        """
        self.credentials_path = credentials_path or os.getenv(
            'GOOGLE_SHEETS_CREDENTIALS',
            str(Path(__file__).parent.parent / 'temp' / 'Google_Sheets_credencials.json')
        )
        self.token_path = token_path or str(Path(__file__).parent.parent / 'temp' / 'token.pickle')
        self.gc = None
        self.creds = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Google Sheets API using OAuth"""
        try:
            # Check if credentials file exists
            if not Path(self.credentials_path).exists():
                raise FileNotFoundError(
                    f"Credentials file not found: {self.credentials_path}\n"
                    "Please ensure Google_Sheets_credencials.json is in the correct location."
                )
            
            # Load existing token if available
            if Path(self.token_path).exists():
                with open(self.token_path, 'rb') as token:
                    self.creds = pickle.load(token)
                    logger.info("✅ Loaded existing Google Sheets token")
            
            # If no valid credentials, authenticate
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    # Refresh expired token
                    logger.info("🔄 Refreshing expired token...")
                    self.creds.refresh(Request())
                else:
                    # Perform OAuth flow
                    logger.info("🔐 Starting OAuth authentication flow...")
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_path,
                        self.SCOPES
                    )
                    # This will open browser for user to authenticate
                    self.creds = flow.run_local_server(port=0)
                    logger.info("✅ OAuth authentication successful")
                
                # Save token for future use
                with open(self.token_path, 'wb') as token:
                    pickle.dump(self.creds, token)
                    logger.info(f"💾 Token saved to {self.token_path}")
            
            # Authorize gspread
            self.gc = gspread.authorize(self.creds)
            logger.info("✅ Google Sheets service initialized successfully")
            
        except FileNotFoundError as e:
            logger.error(f"❌ Credentials file not found: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Google Sheets authentication failed: {e}")
            raise
    
    def read_sheet_to_dataframe(
        self, 
        spreadsheet_url: str, 
        sheet_name: str = None,
        sheet_index: int = 0
    ) -> pd.DataFrame:
        """
        Read Google Sheet into pandas DataFrame
        
        Args:
            spreadsheet_url: Google Sheets URL or spreadsheet ID
            sheet_name: Name of the worksheet (optional)
            sheet_index: Index of worksheet if name not provided (default: 0)
        
        Returns:
            pandas DataFrame
        """
        try:
            # Open spreadsheet
            if 'docs.google.com' in spreadsheet_url:
                # Extract spreadsheet ID from URL
                # Format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit...
                spreadsheet_id = spreadsheet_url.split('/d/')[1].split('/')[0]
                sh = self.gc.open_by_key(spreadsheet_id)
            else:
                # Assume it's a spreadsheet ID
                sh = self.gc.open_by_key(spreadsheet_url)
            
            logger.info(f"📊 Opened spreadsheet: {sh.title}")
            
            # Get worksheet
            if sheet_name:
                worksheet = sh.worksheet(sheet_name)
                logger.info(f"📄 Reading worksheet: {sheet_name}")
            else:
                worksheet = sh.get_worksheet(sheet_index)
                logger.info(f"📄 Reading worksheet at index: {sheet_index}")
            
            # Convert to DataFrame
            df = get_as_dataframe(worksheet, evaluate_formulas=True)
            
            # Clean up - remove completely empty rows and columns
            df = df.dropna(how='all').dropna(axis=1, how='all')
            
            # Reset index after dropping rows
            df = df.reset_index(drop=True)
            
            logger.info(f"✅ Read Google Sheet: {len(df)} rows × {len(df.columns)} columns")
            return df
            
        except gspread.exceptions.SpreadsheetNotFound:
            logger.error("❌ Spreadsheet not found. Make sure the URL is correct and you have access.")
            raise ValueError("Spreadsheet not found or you don't have access to it")
        except gspread.exceptions.WorksheetNotFound:
            logger.error(f"❌ Worksheet '{sheet_name}' not found")
            raise ValueError(f"Worksheet '{sheet_name}' not found in spreadsheet")
        except Exception as e:
            logger.error(f"❌ Error reading Google Sheet: {e}")
            raise
    
    def list_all_sheets(self, spreadsheet_url: str) -> List[Dict[str, Any]]:
        """
        List all sheets/tabs in a Google Spreadsheet
        
        Args:
            spreadsheet_url: Google Sheets URL or spreadsheet ID
        
        Returns:
            List of sheet info dicts with 'name', 'index', 'rows', 'columns'
        """
        try:
            # Open spreadsheet
            if 'docs.google.com' in spreadsheet_url:
                spreadsheet_id = spreadsheet_url.split('/d/')[1].split('/')[0]
                sh = self.gc.open_by_key(spreadsheet_id)
            else:
                sh = self.gc.open_by_key(spreadsheet_url)
            
            sheets_info = []
            for idx, worksheet in enumerate(sh.worksheets()):
                sheets_info.append({
                    'name': worksheet.title,
                    'index': idx,
                    'rows': worksheet.row_count,
                    'columns': worksheet.col_count,
                    'id': worksheet.id
                })
            
            logger.info(f"📋 Found {len(sheets_info)} sheets in '{sh.title}'")
            return sheets_info
            
        except Exception as e:
            logger.error(f"❌ Error listing sheets: {e}")
            raise
    
    def read_all_sheets_to_dataframes(
        self, 
        spreadsheet_url: str
    ) -> Dict[str, pd.DataFrame]:
        """
        Read all sheets from a Google Spreadsheet into DataFrames
        
        Args:
            spreadsheet_url: Google Sheets URL or spreadsheet ID
        
        Returns:
            Dictionary mapping sheet names to DataFrames
        """
        try:
            # Open spreadsheet
            if 'docs.google.com' in spreadsheet_url:
                spreadsheet_id = spreadsheet_url.split('/d/')[1].split('/')[0]
                sh = self.gc.open_by_key(spreadsheet_id)
            else:
                sh = self.gc.open_by_key(spreadsheet_url)
            
            logger.info(f"📊 Reading all sheets from: {sh.title}")
            
            all_sheets = {}
            for worksheet in sh.worksheets():
                try:
                    # Convert to DataFrame
                    df = get_as_dataframe(worksheet, evaluate_formulas=True)
                    
                    # Clean up - remove completely empty rows and columns
                    df = df.dropna(how='all').dropna(axis=1, how='all')
                    df = df.reset_index(drop=True)
                    
                    if not df.empty:
                        all_sheets[worksheet.title] = df
                        logger.info(f"  ✅ {worksheet.title}: {len(df)} rows × {len(df.columns)} columns")
                    else:
                        logger.info(f"  ⚠️ {worksheet.title}: Empty sheet, skipped")
                        
                except Exception as e:
                    logger.warning(f"  ⚠️ Error reading sheet '{worksheet.title}': {e}")
                    continue
            
            logger.info(f"✅ Read {len(all_sheets)} sheets from '{sh.title}'")
            return all_sheets
            
        except Exception as e:
            logger.error(f"❌ Error reading all sheets: {e}")
            raise
    
    def write_dataframe_to_sheet(
        self,
        df: pd.DataFrame,
        spreadsheet_url: str,
        sheet_name: str = None,
        sheet_index: int = 0,
        include_index: bool = False,
        resize: bool = True
    ) -> Dict[str, Any]:
        """
        Write pandas DataFrame to Google Sheet
        
        Args:
            df: pandas DataFrame to write
            spreadsheet_url: Google Sheets URL or spreadsheet ID
            sheet_name: Name of worksheet (optional)
            sheet_index: Index of worksheet if name not provided
            include_index: Whether to include DataFrame index
            resize: Whether to resize sheet to fit data
        
        Returns:
            Dict with success status and info
        """
        try:
            # Open spreadsheet
            if 'docs.google.com' in spreadsheet_url:
                spreadsheet_id = spreadsheet_url.split('/d/')[1].split('/')[0]
                sh = self.gc.open_by_key(spreadsheet_id)
            else:
                sh = self.gc.open_by_key(spreadsheet_url)
            
            # Get worksheet
            if sheet_name:
                try:
                    worksheet = sh.worksheet(sheet_name)
                except gspread.exceptions.WorksheetNotFound:
                    # Create worksheet if it doesn't exist
                    worksheet = sh.add_worksheet(title=sheet_name, rows=len(df)+1, cols=len(df.columns))
                    logger.info(f"📄 Created new worksheet: {sheet_name}")
            else:
                worksheet = sh.get_worksheet(sheet_index)
            
            # Clear existing content
            worksheet.clear()
            
            # Write DataFrame
            set_with_dataframe(
                worksheet, 
                df, 
                include_index=include_index,
                resize=resize
            )
            
            logger.info(f"✅ Wrote {len(df)} rows × {len(df.columns)} columns to Google Sheet")
            
            return {
                "success": True,
                "rows_written": len(df),
                "columns_written": len(df.columns),
                "sheet_url": sh.url,
                "worksheet_name": worksheet.title
            }
            
        except Exception as e:
            logger.error(f"❌ Error writing to Google Sheet: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def rename_worksheet(
        self,
        spreadsheet_url: str,
        old_name: str,
        new_name: str
    ) -> Dict[str, Any]:
        """
        Rename a worksheet in a Google Spreadsheet
        
        Args:
            spreadsheet_url: Google Sheets URL or spreadsheet ID
            old_name: Current worksheet name
            new_name: New worksheet name
        
        Returns:
            Dict with success status and info
        """
        try:
            # Open spreadsheet
            if 'docs.google.com' in spreadsheet_url:
                spreadsheet_id = spreadsheet_url.split('/d/')[1].split('/')[0]
                sh = self.gc.open_by_key(spreadsheet_id)
            else:
                sh = self.gc.open_by_key(spreadsheet_url)
            
            # Find worksheet by name
            try:
                worksheet = sh.worksheet(old_name)
            except gspread.exceptions.WorksheetNotFound:
                return {
                    "success": False,
                    "error": f"Worksheet '{old_name}' not found"
                }
            
            # Update worksheet title
            worksheet.update_title(new_name)
            
            logger.info(f"✅ Renamed worksheet '{old_name}' to '{new_name}'")
            
            return {
                "success": True,
                "old_name": old_name,
                "new_name": new_name,
                "sheet_url": sh.url
            }
            
        except Exception as e:
            logger.error(f"❌ Error renaming worksheet: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_new_sheet(
        self,
        title: str,
        df: pd.DataFrame = None
    ) -> Dict[str, Any]:
        """
        Create a new Google Sheet
        
        Args:
            title: Title for the new spreadsheet
            df: Optional DataFrame to populate the sheet
        
        Returns:
            Dict with spreadsheet info
        """
        try:
            # Create new spreadsheet
            sh = self.gc.create(title)
            
            logger.info(f"📊 Created new spreadsheet: {title}")
            
            # Write data if provided
            if df is not None:
                worksheet = sh.get_worksheet(0)
                set_with_dataframe(worksheet, df)
                logger.info(f"✅ Populated with {len(df)} rows")
            
            return {
                "success": True,
                "spreadsheet_id": sh.id,
                "spreadsheet_url": sh.url,
                "title": title
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating Google Sheet: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_all_sheets(self) -> list:
        """List all accessible Google Sheets"""
        try:
            sheets = self.gc.openall()
            sheet_list = [
                {
                    "title": sh.title,
                    "id": sh.id,
                    "url": sh.url
                } 
                for sh in sheets
            ]
            logger.info(f"📋 Found {len(sheet_list)} accessible spreadsheets")
            return sheet_list
        except Exception as e:
            logger.error(f"❌ Error listing sheets: {e}")
            return []
    
    def get_worksheet_names(self, spreadsheet_url: str) -> list:
        """Get all worksheet names in a spreadsheet"""
        try:
            if 'docs.google.com' in spreadsheet_url:
                spreadsheet_id = spreadsheet_url.split('/d/')[1].split('/')[0]
                sh = self.gc.open_by_key(spreadsheet_id)
            else:
                sh = self.gc.open_by_key(spreadsheet_url)
            
            worksheets = sh.worksheets()
            worksheet_names = [ws.title for ws in worksheets]
            
            logger.info(f"📋 Found {len(worksheet_names)} worksheets: {worksheet_names}")
            return worksheet_names
            
        except Exception as e:
            logger.error(f"❌ Error getting worksheet names: {e}")
            return []
