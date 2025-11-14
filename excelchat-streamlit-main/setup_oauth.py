#!/usr/bin/env python3
"""
Quick OAuth Setup for Google Sheets API
=======================================

This script helps set up OAuth authentication for the Google Sheets test.
"""

import gspread
import os
import json

def setup_oauth():
    """Set up OAuth authentication for Google Sheets"""
    print("🔐 Setting up Google Sheets OAuth Authentication")
    print("=" * 60)
    
    try:
        # Clear existing credentials
        config_dir = os.path.expanduser("~/.config/gspread")
        credentials_file = os.path.join(config_dir, "credentials.json")
        authorized_user_file = os.path.join(config_dir, "authorized_user.json")
        
        if os.path.exists(credentials_file):
            os.remove(credentials_file)
            print("🗑️  Cleared old credentials")
        
        if os.path.exists(authorized_user_file):
            os.remove(authorized_user_file)
            print("🗑️  Cleared old authorized user")
        
        print("\n📋 OAuth Setup Steps:")
        print("1. Go to: https://console.cloud.google.com/")
        print("2. Create a new project or select existing")
        print("3. Enable Google Sheets API")
        print("4. Go to 'Credentials' → 'Create Credentials' → 'OAuth 2.0 Client IDs'")
        print("5. Choose 'Desktop Application'")
        print("6. Download the credentials.json file")
        print("7. Place it in your current directory")
        print("\n🚀 Starting OAuth flow...")
        
        # Try OAuth
        gc = gspread.oauth()
        print("✅ OAuth setup successful!")
        
        # Test connection
        print("🧪 Testing connection...")
        sheets = gc.openall()
        print(f"✅ Found {len(sheets)} accessible sheets")
        
        return True
        
    except FileNotFoundError as e:
        print(f"❌ Credentials file not found: {e}")
        print("\n📝 Instructions:")
        print("1. Download credentials.json from Google Cloud Console")
        print("2. Place it in the same directory as this script")
        print("3. Run this script again")
        return False
        
    except Exception as e:
        print(f"❌ OAuth setup failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Ensure you have internet connection")
        print("2. Check that Google Sheets API is enabled")
        print("3. Verify credentials.json is valid")
        return False

def test_sheet_access(sheet_url):
    """Test access to specific sheet"""
    try:
        print(f"\n🔍 Testing access to sheet...")
        gc = gspread.oauth()
        
        # Extract sheet ID
        import re
        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url)
        if not match:
            print("❌ Invalid sheet URL")
            return False
        
        sheet_id = match.group(1)
        spreadsheet = gc.open_by_key(sheet_id)
        
        print(f"✅ Successfully accessed: {spreadsheet.title}")
        
        worksheets = spreadsheet.worksheets()
        print(f"📊 Found {len(worksheets)} worksheets:")
        for ws in worksheets:
            print(f"   - {ws.title}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to access sheet: {e}")
        print("\n💡 Solutions:")
        print("1. Make sure the sheet is shared with your Google account")
        print("2. Or make the sheet publicly accessible")
        return False

def main():
    """Main function"""
    print("🧪 Google Sheets OAuth Setup & Test")
    print("=" * 50)
    
    # Setup OAuth
    if setup_oauth():
        print("\n" + "=" * 50)
        
        # Test specific sheet
        sheet_url = "https://docs.google.com/spreadsheets/d/1ibYI7YbgEyGrzBs7FSHKFvY-0-F3TshEZHzT8oOG7kw/edit?gid=155753156#gid=155753156"
        
        if test_sheet_access(sheet_url):
            print("\n🎉 Setup complete! You can now run the full test script:")
            print("python test_google_sheet_operations.py")
        else:
            print("\n⚠️  Sheet access failed. You can still use the manual checklist:")
            print("python simple_sheet_test.py")
    else:
        print("\n⚠️  OAuth setup failed. Using manual verification:")
        print("python simple_sheet_test.py")

if __name__ == "__main__":
    main()
