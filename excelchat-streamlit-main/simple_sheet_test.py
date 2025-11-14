#!/usr/bin/env python3
"""
Simple Google Sheets Test (No Authentication Required)
=====================================================

This script provides a manual verification checklist and attempts basic validation
without requiring Google Sheets API authentication.
"""

import requests
import re
import json
from typing import Dict, Any

class SimpleSheetValidator:
    def __init__(self, sheet_url: str):
        self.sheet_url = sheet_url
        self.sheet_id = self._extract_sheet_id(sheet_url)
        
    def _extract_sheet_id(self, url: str) -> str:
        """Extract sheet ID from Google Sheets URL"""
        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
        if match:
            return match.group(1)
        raise ValueError(f"Could not extract sheet ID from URL: {url}")
    
    def check_sheet_accessibility(self) -> Dict[str, Any]:
        """Check if the sheet is publicly accessible"""
        try:
            # Try to access the sheet's public export URL
            export_url = f"https://docs.google.com/spreadsheets/d/{self.sheet_id}/export?format=csv"
            
            response = requests.head(export_url, timeout=10)
            
            if response.status_code == 200:
                return {
                    "accessible": True,
                    "status_code": response.status_code,
                    "message": "Sheet is publicly accessible"
                }
            else:
                return {
                    "accessible": False,
                    "status_code": response.status_code,
                    "message": "Sheet requires authentication or is private"
                }
                
        except Exception as e:
            return {
                "accessible": False,
                "error": str(e),
                "message": "Could not check sheet accessibility"
            }
    
    def generate_manual_checklist(self) -> str:
        """Generate a manual verification checklist"""
        checklist = f"""
================================================================================
📋 MANUAL VERIFICATION CHECKLIST
================================================================================
🔗 Sheet URL: {self.sheet_url}
🆔 Sheet ID: {self.sheet_id}

Please manually verify the following operations in your Google Sheet:

✅ OPERATION 1-2: MERGE & TAB NAMES
   □ Sheet has exactly 2 tabs
   □ Tab 1 is named "Learners"
   □ Tab 2 is named "Applicants"
   □ Both tabs contain data (not empty)

✅ OPERATION 3: FILTER DESCRIPTION REMOVED
   □ Learners tab: Last row is NOT a filter description
   □ Applicants tab: Last row is NOT a filter description
   □ Both tabs end with actual data rows

✅ OPERATION 4: FILTERS APPLIED
   □ Learners tab: Filter buttons visible in header row
   □ Applicants tab: Filter buttons visible in header row
   □ Click on column headers to see filter dropdowns

✅ OPERATION 5: COLUMNS FITTED
   □ Learners tab: All columns are properly sized (no cut-off text)
   □ Applicants tab: All columns are properly sized
   □ No excessive white space in columns

✅ OPERATION 6: PANES FROZEN
   □ Learners tab: Top row (headers) stays visible when scrolling down
   □ Learners tab: First column (learner name) stays visible when scrolling right
   □ Applicants tab: Same freezing behavior
   □ Test by scrolling down and right

✅ OPERATION 7: APPLICANTS SORTED BY STATUS
   □ Go to Applicants tab
   □ Check Status column (usually column D or E)
   □ Values should be in alphabetical order (A-Z)
   □ Example order: "Active", "Completed", "In Progress", etc.

✅ OPERATION 8: STATUS ROWS DELETED
   □ Go to Applicants tab
   □ Search for these statuses (should NOT be found):
     - "Signed Up"
     - "Completed Edited"  
     - "Signed Up Edited"
   □ Use Ctrl+F to search for each status

✅ OPERATION 9: APPLICANTS SORTED BY EMPLOYER
   □ Go to Applicants tab
   □ Check Employer column
   □ Values should be in alphabetical order by employer name
   □ This should be the final sort order

✅ OPERATION 10: LEARNERS SORTED
   □ Go to Learners tab
   □ Check Start Date column (primary sort)
   □ Dates should be in chronological order (earliest first)
   □ Within same dates, check Employer column (secondary sort)
   □ Employers should be alphabetical within same start dates

✅ OPERATION 11: SUBTOTALS ADDED
   □ Go to Learners tab
   □ Look for subtotal rows between different employers
   □ Each employer group should have a count/subtotal
   □ Check Trainer column for count functions

✅ OPERATION 12: CONDITIONAL FORMATTING (COLUMN V)
   □ Go to Learners tab
   □ Find Column V (22nd column from left)
   □ Look for colored cells:
     - Red cells (values < 50 or "Red")
     - Orange/Amber cells (values 50-79 or "Amber")
     - Green cells (values ≥ 80 or "Green")

✅ OPERATION 13: ROW HIGHLIGHTING
   □ Go to Learners tab
   □ Find Status column
   □ Look for highlighted rows:
     - Yellow highlighting: Status = "On Break"
     - Red highlighting: Status = "Withdrawal Requested"
   □ Entire rows should be highlighted, not just cells

================================================================================
📊 VERIFICATION SUMMARY
================================================================================
Total Operations to Check: 13
□ Operations 1-2: Merge & Tab Names
□ Operation 3: Filter Description Removed  
□ Operation 4: Filters Applied
□ Operation 5: Columns Fitted
□ Operation 6: Panes Frozen
□ Operation 7: Applicants Sorted by Status
□ Operation 8: Status Rows Deleted
□ Operation 9: Applicants Sorted by Employer
□ Operation 10: Learners Sorted by Date & Employer
□ Operation 11: Subtotals Added
□ Operation 12: Conditional Formatting (Column V)
□ Operation 13: Row Highlighting (Status-based)

🎯 SUCCESS CRITERIA: All 13 operations should be verified as complete

================================================================================
"""
        return checklist
    
    def run_validation(self):
        """Run the validation process"""
        print("=" * 80)
        print("🧪 SIMPLE GOOGLE SHEETS VALIDATION")
        print("=" * 80)
        
        # Check accessibility
        print("🔍 Checking sheet accessibility...")
        accessibility = self.check_sheet_accessibility()
        
        if accessibility.get("accessible", False):
            print("✅ Sheet is publicly accessible")
            print("💡 You could use the full API test script with proper authentication")
        else:
            print("⚠️  Sheet requires authentication or is private")
            print("💡 Using manual verification checklist instead")
        
        print("\n" + "=" * 80)
        print("📋 MANUAL VERIFICATION REQUIRED")
        print("=" * 80)
        
        # Generate and display checklist
        checklist = self.generate_manual_checklist()
        print(checklist)
        
        # Save checklist to file
        with open("manual_verification_checklist.txt", "w", encoding="utf-8") as f:
            f.write(checklist)
        
        print("💾 Manual checklist saved to: manual_verification_checklist.txt")
        print("\n🎯 Next Steps:")
        print("1. Open your Google Sheet in a browser")
        print("2. Go through each item in the checklist above")
        print("3. Check off completed operations")
        print("4. All 13 operations should be verified as complete")
        
        return {
            "success": True,
            "method": "manual_verification",
            "checklist_file": "manual_verification_checklist.txt",
            "accessibility": accessibility
        }

def main():
    """Main function"""
    sheet_url = "https://docs.google.com/spreadsheets/d/1ibYI7YbgEyGrzBs7FSHKFvY-0-F3TshEZHzT8oOG7kw/edit?gid=155753156#gid=155753156"
    
    validator = SimpleSheetValidator(sheet_url)
    result = validator.run_validation()
    
    # Save results
    with open("simple_test_results.json", "w") as f:
        json.dump(result, f, indent=2)
    
    return 0

if __name__ == "__main__":
    main()
