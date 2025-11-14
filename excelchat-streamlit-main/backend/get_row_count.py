"""
Quick script to get row count from Google Sheet
"""

import sys
from pathlib import Path

backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from services.google_sheets_service import GoogleSheetsService

def get_row_count(sheet_url):
    """Get row count from Google Sheet"""
    try:
        print("🔐 Authenticating...")
        gs = GoogleSheetsService()
        
        print("📊 Reading Google Sheet...")
        df = gs.read_sheet_to_dataframe(sheet_url)
        
        print("\n" + "=" * 60)
        print("📈 GOOGLE SHEET INFORMATION")
        print("=" * 60)
        print(f"✅ Total Rows: {len(df)}")
        print(f"✅ Total Columns: {len(df.columns)}")
        print(f"✅ Column Names: {', '.join(df.columns)}")
        print(f"✅ Memory Usage: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
        print("=" * 60)
        
        return len(df)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    sheet_url = "https://docs.google.com/spreadsheets/d/11XO-qUlVG2B9OtHcZyr0FAABMsdVOIRH26CvK7DMgng/edit?usp=sharing"
    row_count = get_row_count(sheet_url)
    
    if row_count:
        print(f"\n🎯 Answer: Your Google Sheet has {row_count} rows of data")
