"""
Google Sheets Formatter Service
Handles applying formatting and operations to Google Sheets
"""

import logging
import pandas as pd
from typing import Dict, Any, List, Optional
from .google_sheets_service import GoogleSheetsService

logger = logging.getLogger(__name__)


class GoogleSheetsFormatter:
    """Service for applying formatting operations to Google Sheets"""
    
    # Color mapping for Google Sheets API (RGB values 0-1)
    COLOR_MAP = {
        'red': {'red': 1.0, 'green': 0.0, 'blue': 0.0},
        'green': {'red': 0.0, 'green': 1.0, 'blue': 0.0},
        'yellow': {'red': 1.0, 'green': 1.0, 'blue': 0.0},
        'blue': {'red': 0.0, 'green': 0.0, 'blue': 1.0},
        'orange': {'red': 1.0, 'green': 0.65, 'blue': 0.0},
        'purple': {'red': 0.5, 'green': 0.0, 'blue': 0.5},
        'pink': {'red': 1.0, 'green': 0.75, 'blue': 0.8},
        'cyan': {'red': 0.0, 'green': 1.0, 'blue': 1.0},
        'light_green': {'red': 0.56, 'green': 0.93, 'blue': 0.56},
        'light_blue': {'red': 0.68, 'green': 0.85, 'blue': 0.9},
        'light_yellow': {'red': 1.0, 'green': 1.0, 'blue': 0.88},
        'light_red': {'red': 1.0, 'green': 0.8, 'blue': 0.8},
        'gray': {'red': 0.5, 'green': 0.5, 'blue': 0.5},
    }
    
    def __init__(self):
        """Initialize Google Sheets Formatter"""
        self.sheets_service = GoogleSheetsService()
    
    def apply_operations_to_google_sheet(
        self,
        df: pd.DataFrame,
        original_url: str,
        operations: Dict[str, Any],
        sheet_name_suffix: str = "_modified",
        session_data: Optional[Dict] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Apply operations to a Google Sheet and return the new sheet URL
        
        Args:
            df: DataFrame with operations already applied to data
            original_url: Original Google Sheets URL
            operations: Dictionary of operations that were applied
            sheet_name_suffix: Suffix to add to new sheet name
            session_data: Session data for multi-sheet handling
            session_id: Session ID for multi-sheet handling
        
        Returns:
            Dict with success status, new sheet URL, and operation details
        """
        try:
            logger.info(f"📊 Applying operations to Google Sheet...")
            
            # Check if this is a multi-sheet operation with target_sheet specified
            target_sheet = operations.get('target_sheet')
            apply_to_all_sheets = operations.get('apply_to_all_sheets', False)
            
            if target_sheet and session_data and session_id:
                logger.info(f"🎯 Target sheet specified: '{target_sheet}' - using multi-sheet approach like Excel")
                return self._apply_operations_to_target_sheet(
                    original_url, operations, target_sheet, session_data, session_id
                )
            elif apply_to_all_sheets and session_data and session_id:
                logger.info(f"📊 Apply to all sheets specified - using multi-sheet approach like Excel")
                return self._apply_operations_to_all_sheets(
                    original_url, operations, session_data, session_id
                )
            
            # Default behavior: single sheet operation
            logger.info(f"📄 Single sheet operation - using default behavior")
            
            # Create a new Google Sheet with the modified data
            result = self._create_modified_sheet(df, original_url, sheet_name_suffix)
            
            if not result['success']:
                return result
            
            new_sheet_url = result['sheet_url']
            worksheet = result['worksheet']
            
            # Apply formatting based on operations
            formatting_applied = []
            
            if 'highlight_rows' in operations:
                self._apply_row_highlighting(
                    worksheet, 
                    operations['highlight_rows'],
                    df
                )
                formatting_applied.append("row highlighting")
            
            if 'highlight_cells' in operations:
                self._apply_cell_highlighting(
                    worksheet,
                    operations['highlight_cells'],
                    df
                )
                formatting_applied.append("cell highlighting")
            
            if 'conditional_format' in operations:
                self._apply_conditional_formatting(
                    worksheet,
                    operations['conditional_format'],
                    df
                )
                formatting_applied.append("conditional formatting")
            
            if 'highlight_duplicates' in operations:
                self._apply_duplicate_highlighting(
                    worksheet,
                    operations['highlight_duplicates'],
                    df
                )
                formatting_applied.append("duplicate highlighting")
            
            if 'highlight_nulls' in operations:
                self._apply_null_highlighting(
                    worksheet,
                    operations['highlight_nulls'],
                    df
                )
                formatting_applied.append("null highlighting")
            
            if 'rename_tabs' in operations:
                rename_results = self._apply_tab_renaming(
                    original_url,
                    operations['rename_tabs']
                )
                if rename_results.get('success'):
                    formatting_applied.append("tab renaming")
                else:
                    logger.warning(f"⚠️ Tab renaming failed: {rename_results.get('error')}")
            
            # Handle merge files operation - create multi-sheet structure
            if 'merge_files' in operations:
                merge_results = self._apply_merge_operation(
                    worksheet,
                    operations,
                    df
                )
                if merge_results.get('success'):
                    formatting_applied.append("file merging")
                    # Update the sheet URL to the new merged sheet
                    new_sheet_url = merge_results.get('sheet_url', new_sheet_url)
                else:
                    logger.warning(f"⚠️ File merging failed: {merge_results.get('error')}")
            
            logger.info(f"✅ Successfully applied operations to Google Sheet")
            
            return {
                'success': True,
                'type': 'google_sheet_operation',
                'sheet_url': new_sheet_url,
                'original_url': original_url,
                'operations_applied': formatting_applied,
                'rows': len(df),
                'columns': len(df.columns)
            }
            
        except Exception as e:
            logger.error(f"❌ Error applying operations to Google Sheet: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _create_modified_sheet(
        self,
        df: pd.DataFrame,
        original_url: str,
        suffix: str
    ) -> Dict[str, Any]:
        """Create a new Google Sheet with modified data"""
        try:
            # Extract spreadsheet ID from URL
            spreadsheet_id = original_url.split('/d/')[1].split('/')[0]
            
            # Open original spreadsheet
            sh = self.sheets_service.gc.open_by_key(spreadsheet_id)
            original_title = sh.title
            
            # Create new sheet title
            new_title = f"{original_title}{suffix}"
            
            # Create new spreadsheet
            new_sh = self.sheets_service.gc.create(new_title)
            worksheet = new_sh.sheet1
            
            # Write data to new sheet
            from gspread_dataframe import set_with_dataframe
            set_with_dataframe(worksheet, df, include_index=False, resize=True)
            
            # Format header row
            header_format = {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            }
            worksheet.format('1:1', header_format)
            
            logger.info(f"✅ Created new Google Sheet: {new_title}")
            
            return {
                'success': True,
                'sheet_url': new_sh.url,
                'worksheet': worksheet,
                'spreadsheet': new_sh
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating modified sheet: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _apply_row_highlighting(
        self,
        worksheet,
        highlight_config: Dict[str, Any],
        df: pd.DataFrame
    ):
        """Apply row highlighting to Google Sheet using batch API"""
        try:
            color = highlight_config.get('color', 'yellow')
            row_indices = highlight_config.get('row_indices', [])
            
            if not row_indices:
                return
            
            bg_color = self.COLOR_MAP.get(color, self.COLOR_MAP['yellow'])
            
            # Build batch format requests
            requests = []
            for row_idx in row_indices:
                # +2 because: +1 for header, +1 for 1-indexed
                sheet_row = row_idx + 2
                
                # Create format request for this row
                requests.append({
                    'repeatCell': {
                        'range': {
                            'sheetId': worksheet.id,
                            'startRowIndex': sheet_row - 1,  # 0-indexed for API
                            'endRowIndex': sheet_row,
                            'startColumnIndex': 0,
                            'endColumnIndex': len(df.columns)
                        },
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': bg_color
                            }
                        },
                        'fields': 'userEnteredFormat.backgroundColor'
                    }
                })
            
            # Execute all format requests in a single batch
            if requests:
                worksheet.spreadsheet.batch_update({'requests': requests})
            
            logger.info(f"✅ Applied row highlighting: {len(row_indices)} rows in {color} (batched)")
            
        except Exception as e:
            logger.error(f"❌ Error applying row highlighting: {e}")
    
    def _apply_cell_highlighting(
        self,
        worksheet,
        highlight_config: Dict[str, Any],
        df: pd.DataFrame
    ):
        """Apply cell highlighting to Google Sheet using batch API"""
        try:
            color = highlight_config.get('color', 'yellow')
            column = highlight_config.get('column')
            cell_indices = highlight_config.get('cell_indices', [])
            
            if not column or not cell_indices:
                return
            
            bg_color = self.COLOR_MAP.get(color, self.COLOR_MAP['yellow'])
            
            # Get column index
            col_idx = df.columns.get_loc(column)
            
            # Build batch format requests
            requests = []
            for row_idx in cell_indices:
                sheet_row = row_idx + 2  # +2 for header and 1-indexed
                
                # Create format request for this cell
                requests.append({
                    'repeatCell': {
                        'range': {
                            'sheetId': worksheet.id,
                            'startRowIndex': sheet_row - 1,  # 0-indexed for API
                            'endRowIndex': sheet_row,
                            'startColumnIndex': col_idx,
                            'endColumnIndex': col_idx + 1
                        },
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': bg_color
                            }
                        },
                        'fields': 'userEnteredFormat.backgroundColor'
                    }
                })
            
            # Execute all format requests in a single batch
            if requests:
                worksheet.spreadsheet.batch_update({'requests': requests})
            
            logger.info(f"✅ Applied cell highlighting: {len(cell_indices)} cells in {color} (batched)")
            
        except Exception as e:
            logger.error(f"❌ Error applying cell highlighting: {e}")
    
    def _apply_conditional_formatting(
        self,
        worksheet,
        format_config: List[Dict[str, Any]],
        df: pd.DataFrame
    ):
        """Apply conditional formatting to Google Sheet"""
        try:
            # Note: Conditional formatting in Google Sheets API is complex
            # For now, we'll apply it as static formatting based on current values
            
            for rule in format_config:
                column = rule.get('column')
                operator = rule.get('operator')
                value = rule.get('value')
                color = rule.get('color', 'yellow')
                
                if not column or not operator:
                    continue
                
                # Find rows that match the condition
                matching_rows = self._find_matching_rows(df, column, operator, value)
                
                # Apply formatting to matching rows
                if matching_rows:
                    self._apply_row_highlighting(
                        worksheet,
                        {'color': color, 'row_indices': matching_rows},
                        df
                    )
            
            logger.info(f"✅ Applied conditional formatting: {len(format_config)} rules")
            
        except Exception as e:
            logger.error(f"❌ Error applying conditional formatting: {e}")
    
    def _find_matching_rows(
        self,
        df: pd.DataFrame,
        column: str,
        operator: str,
        value: Any
    ) -> List[int]:
        """Find rows that match a condition"""
        try:
            if column not in df.columns:
                return []
            
            if operator == '==':
                mask = df[column] == value
            elif operator == '!=':
                mask = df[column] != value
            elif operator == '>':
                mask = df[column] > value
            elif operator == '<':
                mask = df[column] < value
            elif operator == '>=':
                mask = df[column] >= value
            elif operator == '<=':
                mask = df[column] <= value
            elif operator == 'contains':
                mask = df[column].astype(str).str.contains(str(value), case=False, na=False)
            else:
                return []
            
            return df[mask].index.tolist()
            
        except Exception as e:
            logger.error(f"❌ Error finding matching rows: {e}")
            return []
    
    def _get_column_letter(self, col_num: int) -> str:
        """Convert column number to letter (1 -> A, 27 -> AA, etc.)"""
        result = ""
        while col_num > 0:
            col_num -= 1
            result = chr(col_num % 26 + 65) + result
            col_num //= 26
        return result
    
    def _apply_duplicate_highlighting(
        self,
        worksheet,
        duplicate_config: Dict[str, Any],
        df: pd.DataFrame
    ):
        """Apply duplicate highlighting to Google Sheet"""
        try:
            columns = duplicate_config.get('columns', [])
            color = duplicate_config.get('color', 'light_red')
            
            if not columns:
                columns = df.columns.tolist()
            
            bg_color = self.COLOR_MAP.get(color, self.COLOR_MAP['light_red'])
            
            # Build batch format requests for all duplicate cells
            requests = []
            
            for column in columns:
                if column not in df.columns:
                    continue
                
                col_idx = df.columns.get_loc(column)
                duplicates = df[column].duplicated(keep=False)
                
                for row_idx, is_dup in enumerate(duplicates):
                    if is_dup:
                        sheet_row = row_idx + 2  # +2 for header and 1-indexed
                        
                        requests.append({
                            'repeatCell': {
                                'range': {
                                    'sheetId': worksheet.id,
                                    'startRowIndex': sheet_row - 1,  # 0-indexed for API
                                    'endRowIndex': sheet_row,
                                    'startColumnIndex': col_idx,
                                    'endColumnIndex': col_idx + 1
                                },
                                'cell': {
                                    'userEnteredFormat': {
                                        'backgroundColor': bg_color
                                    }
                                },
                                'fields': 'userEnteredFormat.backgroundColor'
                            }
                        })
            
            # Execute all format requests in a single batch
            if requests:
                worksheet.spreadsheet.batch_update({'requests': requests})
            
            logger.info(f"✅ Applied duplicate highlighting: {len(requests)} cells in {color} (batched)")
            
        except Exception as e:
            logger.error(f"❌ Error applying duplicate highlighting: {e}")
    
    def _apply_null_highlighting(
        self,
        worksheet,
        null_config: Dict[str, Any],
        df: pd.DataFrame
    ):
        """Apply null/missing value highlighting to Google Sheet"""
        try:
            import pandas as pd
            
            columns = null_config.get('columns', [])
            color = null_config.get('color', 'gray')
            
            if not columns:
                columns = df.columns.tolist()
            
            bg_color = self.COLOR_MAP.get(color, self.COLOR_MAP['gray'])
            
            # Build batch format requests for all null cells
            requests = []
            
            for column in columns:
                if column not in df.columns:
                    continue
                
                col_idx = df.columns.get_loc(column)
                
                for row_idx, value in enumerate(df[column]):
                    if pd.isna(value):
                        sheet_row = row_idx + 2  # +2 for header and 1-indexed
                        
                        requests.append({
                            'repeatCell': {
                                'range': {
                                    'sheetId': worksheet.id,
                                    'startRowIndex': sheet_row - 1,  # 0-indexed for API
                                    'endRowIndex': sheet_row,
                                    'startColumnIndex': col_idx,
                                    'endColumnIndex': col_idx + 1
                                },
                                'cell': {
                                    'userEnteredFormat': {
                                        'backgroundColor': bg_color
                                    }
                                },
                                'fields': 'userEnteredFormat.backgroundColor'
                            }
                        })
            
            # Execute all format requests in a single batch
            if requests:
                worksheet.spreadsheet.batch_update({'requests': requests})
            
            logger.info(f"✅ Applied null highlighting: {len(requests)} cells in {color} (batched)")
            
        except Exception as e:
            logger.error(f"❌ Error applying null highlighting: {e}")
    
    def _apply_tab_renaming(
        self,
        spreadsheet_url: str,
        rename_config: Dict[str, str]
    ) -> Dict[str, Any]:
        """Apply tab renaming to Google Sheet"""
        try:
            renamed_tabs = []
            errors = []
            
            # rename_config format: {'sheet_0': 'app', 'sheet_1': 'learn'}
            # We need to map sheet_0, sheet_1 to actual sheet names
            
            # Get all sheets from the spreadsheet using existing service
            sheets_info = self.sheets_service.list_all_sheets(spreadsheet_url)
            
            for sheet_key, new_name in rename_config.items():
                # Extract sheet index from sheet_key (e.g., 'sheet_0' -> 0)
                if sheet_key.startswith('sheet_'):
                    try:
                        sheet_index = int(sheet_key.split('_')[1])
                        
                        if sheet_index < len(sheets_info):
                            old_name = sheets_info[sheet_index]['name']
                            
                            # Rename the worksheet
                            result = self.sheets_service.rename_worksheet(
                                spreadsheet_url,
                                old_name,
                                new_name
                            )
                            
                            if result.get('success'):
                                renamed_tabs.append(f"'{old_name}' → '{new_name}'")
                                logger.info(f"✅ Renamed tab '{old_name}' to '{new_name}'")
                            else:
                                error_msg = f"Failed to rename '{old_name}' to '{new_name}': {result.get('error')}"
                                errors.append(error_msg)
                                logger.error(f"❌ {error_msg}")
                        else:
                            error_msg = f"Sheet index {sheet_index} out of range (only {len(sheets_info)} sheets available)"
                            errors.append(error_msg)
                            logger.error(f"❌ {error_msg}")
                            
                    except (ValueError, IndexError) as e:
                        error_msg = f"Invalid sheet key format '{sheet_key}': {e}"
                        errors.append(error_msg)
                        logger.error(f"❌ {error_msg}")
                else:
                    # Direct sheet name mapping
                    result = self.sheets_service.rename_worksheet(
                        spreadsheet_url,
                        sheet_key,
                        new_name
                    )
                    
                    if result.get('success'):
                        renamed_tabs.append(f"'{sheet_key}' → '{new_name}'")
                        logger.info(f"✅ Renamed tab '{sheet_key}' to '{new_name}'")
                    else:
                        error_msg = f"Failed to rename '{sheet_key}' to '{new_name}': {result.get('error')}"
                        errors.append(error_msg)
                        logger.error(f"❌ {error_msg}")
            
            if renamed_tabs:
                return {
                    "success": True,
                    "renamed_tabs": renamed_tabs,
                    "errors": errors,
                    "message": f"Successfully renamed {len(renamed_tabs)} tabs: {', '.join(renamed_tabs)}"
                }
            else:
                return {
                    "success": False,
                    "error": f"No tabs were renamed. Errors: {'; '.join(errors)}"
                }
                
        except Exception as e:
            logger.error(f"❌ Error applying tab renaming: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _apply_merge_operation(
        self,
        worksheet,
        operations: Dict[str, Any],
        df: pd.DataFrame
    ) -> Dict[str, Any]:
        """Apply merge files operation to create multi-sheet Google Sheet supporting multiple files"""
        try:
            sheet_names = operations.get('sheet_names', [])
            
            # Fix categorical data types at the start to prevent merge issues
            # Convert all categorical columns to object type to avoid category conflicts
            df_fixed = df.copy()
            for col in df_fixed.columns:
                if df_fixed[col].dtype.name == 'category':
                    df_fixed[col] = df_fixed[col].astype('object')
                    logger.info(f"🔧 Converted categorical column '{col}' to object type")
            df = df_fixed  # Use the fixed DataFrame
            
            # Create a new Google Sheet for the merged data
            import time
            timestamp = int(time.time())
            new_sheet_title = f"merged_files_{timestamp}"
            
            # Create new spreadsheet
            new_sheet = self.sheets_service.gc.create(new_sheet_title)
            new_sheet_url = new_sheet.url
            
            logger.info(f"📊 Created new merged Google Sheet: {new_sheet_title}")
            
            # Check if DataFrame has source file information
            if '_source_file' in df.columns:
                # Get original DataFrames from session to preserve column structure (like Excel)
                # This prevents column alignment issues that occur with combined DataFrames
                original_dataframes = []
                unique_sources = df['_source_file'].unique()
                logger.info(f"📊 Detected {len(unique_sources)} source files: {list(unique_sources)}")
                
                # Get session data to access original DataFrames
                if hasattr(self, 'session_data') and hasattr(self, 'session_id') and self.session_data and self.session_id:
                    session_files = self.session_data[self.session_id]["files"]
                    
                    # Map each source to its original DataFrame (preserving original columns)
                    for source in unique_sources:
                        # Find the original file data for this source
                        original_df = None
                        for file_id, file_data in session_files.items():
                            if file_data["filename"] == source or f"GoogleSheet_{file_data.get('sheet_name', '')}" == source:
                                original_df = file_data["df"].copy()  # Use original DataFrame
                                break
                        
                        if original_df is not None:
                            original_dataframes.append({
                                "df": original_df,
                                "source": source
                            })
                            logger.info(f"📋 Found original DataFrame for '{source}': {len(original_df)} rows, {len(original_df.columns)} columns")
                        else:
                            # Fallback to filtered combined DataFrame if original not found
                            source_df = df[df['_source_file'] == source].copy()
                            source_df = source_df.drop(columns=['_source_file', '_file_id'], errors='ignore')
                            original_dataframes.append({
                                "df": source_df,
                                "source": source
                            })
                            logger.warning(f"⚠️ Using filtered DataFrame for '{source}' (original not found)")
                else:
                    # Fallback to old method if session data not available
                    for source in unique_sources:
                        source_df = df[df['_source_file'] == source].copy()
                        source_df = source_df.drop(columns=['_source_file', '_file_id'], errors='ignore')
                        original_dataframes.append({
                            "df": source_df,
                            "source": source
                        })
                
                # Remove the default sheet and create new ones
                default_sheet = new_sheet.sheet1
                sheets_created = []
                used_sheet_names = []  # Track which names have been used
                
                for idx, df_data in enumerate(original_dataframes):
                    source_df = df_data["df"]
                    source = df_data["source"]
                    
                    # Fix categorical data types that cause merge issues
                    # Convert categorical columns to object type to avoid category conflicts
                    for col in source_df.columns:
                        if source_df[col].dtype.name == 'category':
                            source_df[col] = source_df[col].astype('object')
                            logger.info(f"🔧 Converted categorical column '{col}' to object type")
                    
                    # Determine sheet name with intelligent matching
                    sheet_name = None
                    
                    # Try to match source name with provided sheet names intelligently
                    if sheet_names:
                        source_clean = str(source).replace('GoogleSheet_', '').replace('.xlsx', '').replace('.csv', '').lower()
                        
                        # Look for best match between source name and provided sheet names
                        for provided_name in sheet_names:
                            if provided_name not in used_sheet_names:  # Only use unused names
                                provided_clean = provided_name.lower()
                                # Check if source contains the provided name or vice versa
                                if provided_clean in source_clean or source_clean.replace('output ', '').replace('_', ' ') in provided_clean:
                                    sheet_name = provided_name
                                    used_sheet_names.append(provided_name)  # Mark as used
                                    logger.info(f"🎯 Matched source '{source}' with sheet name '{sheet_name}'")
                                    break
                    
                    # Fallback to index-based assignment if no match found
                    if not sheet_name:
                        available_names = [name for name in sheet_names if name not in used_sheet_names]
                        if available_names:
                            sheet_name = available_names[0]
                            used_sheet_names.append(sheet_name)
                        else:
                            # Generate sheet name from source file name
                            clean_source = str(source).replace('GoogleSheet_', '').replace('.xlsx', '').replace('.csv', '')
                            sheet_name = ''.join(c for c in clean_source if c.isalnum() or c in (' ', '_', '-'))[:30]
                            if not sheet_name:
                                sheet_name = f"File_{idx+1}"
                    
                    # Ensure sheet name is unique and valid
                    original_name = sheet_name
                    counter = 1
                    while sheet_name in sheets_created:
                        sheet_name = f"{original_name}_{counter}"
                        counter += 1
                    
                    if idx == 0:
                        # Use the default sheet for the first source
                        default_sheet.update_title(sheet_name)
                        worksheet_to_use = default_sheet
                    else:
                        # Create new sheet for additional sources
                        worksheet_to_use = new_sheet.add_worksheet(
                            title=sheet_name, 
                            rows=max(len(source_df)+1, 1000), 
                            cols=max(len(source_df.columns), 26)
                        )
                    
                    # Write data to the sheet
                    worksheet_to_use.clear()
                    if not source_df.empty:
                        # Clean data for JSON serialization - replace NaN, inf, -inf with None/empty strings
                        cleaned_df = source_df.copy()
                        
                        # Replace NaN, inf, -inf with appropriate values for Google Sheets
                        import numpy as np
                        import pandas as pd
                        
                        # For numeric columns, replace NaN/inf with empty string (Google Sheets handles this better)
                        for col in cleaned_df.columns:
                            if cleaned_df[col].dtype in ['float64', 'float32', 'int64', 'int32']:
                                # Replace inf and -inf with None, NaN with empty string
                                cleaned_df[col] = cleaned_df[col].replace([np.inf, -np.inf], None)
                                cleaned_df[col] = cleaned_df[col].fillna('')
                            else:
                                # For non-numeric columns, just replace NaN with empty string
                                cleaned_df[col] = cleaned_df[col].fillna('')
                        
                        # Convert to list format for Google Sheets API
                        data_to_write = [cleaned_df.columns.tolist()] + cleaned_df.values.tolist()
                        worksheet_to_use.update(data_to_write)
                    else:
                        # Write just headers if no data
                        worksheet_to_use.update([source_df.columns.tolist()])
                    
                    sheets_created.append(sheet_name)
                    logger.info(f"✅ Added sheet '{sheet_name}' with {len(source_df)} rows from source '{source}'")
                
                success_message = f"Successfully merged {len(unique_sources)} files into new Google Sheet with {len(sheets_created)} sheets"
            
            else:
                # No source information, create a single merged sheet
                sheet_name = sheet_names[0] if sheet_names else "Merged_Data"
                default_sheet = new_sheet.sheet1
                default_sheet.update_title(sheet_name)
                
                # Write merged data
                default_sheet.clear()
                if not df.empty:
                    # Clean data for JSON serialization
                    cleaned_df = df.copy()
                    
                    # Fix categorical data types that cause merge issues
                    # Convert categorical columns to object type to avoid category conflicts
                    for col in cleaned_df.columns:
                        if cleaned_df[col].dtype.name == 'category':
                            cleaned_df[col] = cleaned_df[col].astype('object')
                            logger.info(f"🔧 Converted categorical column '{col}' to object type")
                    
                    # Replace NaN, inf, -inf with appropriate values for Google Sheets
                    import numpy as np
                    import pandas as pd
                    
                    for col in cleaned_df.columns:
                        if cleaned_df[col].dtype in ['float64', 'float32', 'int64', 'int32']:
                            cleaned_df[col] = cleaned_df[col].replace([np.inf, -np.inf], None)
                            cleaned_df[col] = cleaned_df[col].fillna('')
                        else:
                            cleaned_df[col] = cleaned_df[col].fillna('')
                    
                    data_to_write = [cleaned_df.columns.tolist()] + cleaned_df.values.tolist()
                    default_sheet.update(data_to_write)
                else:
                    default_sheet.update([df.columns.tolist()])
                
                logger.info(f"✅ Created merged sheet '{sheet_name}' with {len(df)} rows")
                success_message = f"Successfully created merged sheet with {len(df)} rows"
            
            # Store sheet data in session for subsequent operations (like Excel does)
            # This is critical for maintaining the same flow as Excel
            if hasattr(self, 'session_data') and hasattr(self, 'session_id'):
                sheet_files = {}
                
                if '_source_file' in df.columns:
                    # Multi-source case - store each source as separate sheet using original DataFrames
                    for idx, df_data in enumerate(original_dataframes):
                        source_df = df_data["df"]
                        source = df_data["source"]
                        
                        # Use same intelligent sheet naming logic as above
                        sheet_name = None
                        session_used_names = []  # Track used names for session storage
                        
                        # Try to match source name with provided sheet names intelligently
                        if sheet_names:
                            source_clean = str(source).replace('GoogleSheet_', '').replace('.xlsx', '').replace('.csv', '').lower()
                            
                            # Look for best match between source name and provided sheet names
                            for provided_name in sheet_names:
                                if provided_name not in session_used_names:  # Only use unused names
                                    provided_clean = provided_name.lower()
                                    # Check if source contains the provided name or vice versa
                                    if provided_clean in source_clean or source_clean.replace('output ', '').replace('_', ' ') in provided_clean:
                                        sheet_name = provided_name
                                        session_used_names.append(provided_name)  # Mark as used
                                        break
                        
                        # Fallback to index-based assignment if no match found
                        if not sheet_name:
                            available_names = [name for name in sheet_names if name not in session_used_names]
                            if available_names:
                                sheet_name = available_names[0]
                                session_used_names.append(sheet_name)
                            else:
                                # Generate sheet name from source file name
                                clean_source = str(source).replace('GoogleSheet_', '').replace('.xlsx', '').replace('.csv', '')
                                sheet_name = ''.join(c for c in clean_source if c.isalnum() or c in (' ', '_', '-'))[:30]
                                if not sheet_name:
                                    sheet_name = f"File_{idx+1}"
                        
                        # Ensure uniqueness
                        original_name = sheet_name
                        counter = 1
                        existing_names = [info.get('sheet_name', '') for info in sheet_files.values()]
                        while sheet_name in existing_names:
                            sheet_name = f"{original_name}_{counter}"
                            counter += 1
                        
                        # Store as sheet (matching Excel's exact structure)
                        sheet_file_id = f"sheet_{sheet_name}_{idx}"
                        sheet_files[sheet_file_id] = {
                            "df": source_df.copy(),
                            "filename": f"{sheet_name}.xlsx",
                            "sheet_name": sheet_name,
                            "is_sheet": True,
                            "sheet_index": idx,
                            "source_type": "google_sheets",  # Mark as Google Sheets source
                            "spreadsheet_url": new_sheet_url,  # Store new sheet URL
                            "source": "google_sheets_merge"
                        }
                else:
                    # Single merged sheet case
                    sheet_name = sheet_names[0] if sheet_names else "Merged_Data"
                    sheet_file_id = f"sheet_{sheet_name}_0"
                    sheet_files[sheet_file_id] = {
                        "df": df.copy(),
                        "filename": f"{sheet_name}.xlsx", 
                        "sheet_name": sheet_name,
                        "is_sheet": True,
                        "sheet_index": 0,
                        "source_type": "google_sheets",
                        "spreadsheet_url": new_sheet_url,
                        "source": "google_sheets_merge"
                    }
                
                # Update session with sheet data (like Excel does)
                if hasattr(self, 'session_data') and self.session_id:
                    self.session_data[self.session_id]["files"] = sheet_files
                    logger.info(f"📊 Stored {len(sheet_files)} sheets in session for subsequent operations (matching Excel flow)")
            
            return {
                "success": True,
                "sheet_url": new_sheet_url,
                "message": success_message
            }
            
        except Exception as e:
            logger.error(f"❌ Error applying merge operation: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _apply_operations_to_target_sheet(
        self,
        original_url: str,
        operations: Dict[str, Any],
        target_sheet: str,
        session_data: Dict,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Apply operations to a specific target sheet in a multi-sheet Google Sheet
        Similar to Excel's target_sheet handling
        """
        try:
            logger.info(f"🎯 Applying operations to target sheet: '{target_sheet}'")
            
            # Get all sheets from session data
            files = session_data[session_id]["files"]
            
            # Find the target sheet
            target_sheet_data = None
            all_sheets = []
            
            for file_id, file_data in files.items():
                if file_data.get("source_type") == "google_sheets":
                    sheet_name = file_data.get("sheet_name", "")
                    all_sheets.append({
                        "sheet_name": sheet_name,
                        "df": file_data["df"].copy(),
                        "file_id": file_id
                    })
                    
                    # Check if this is our target sheet (case-insensitive)
                    if sheet_name.lower() == target_sheet.lower():
                        target_sheet_data = {
                            "sheet_name": sheet_name,
                            "df": file_data["df"].copy(),
                            "file_id": file_id
                        }
            
            if not target_sheet_data:
                available_sheets = [s["sheet_name"] for s in all_sheets]
                return {
                    'success': False,
                    'error': f"Target sheet '{target_sheet}' not found. Available sheets: {available_sheets}"
                }
            
            logger.info(f"✅ Found target sheet '{target_sheet_data['sheet_name']}' with {len(target_sheet_data['df'])} rows")
            
            # Apply operations to target sheet DataFrame
            target_df = target_sheet_data["df"]
            
            # Apply data operations (highlighting, etc.)
            if 'highlight_rows' in operations:
                target_df = self._apply_highlighting_to_dataframe(target_df, operations['highlight_rows'])
            
            # Create/update the Google Sheet with all sheets, but only target sheet modified
            return self._create_multi_sheet_google_sheet(
                original_url, all_sheets, target_sheet_data, operations
            )
            
        except Exception as e:
            logger.error(f"❌ Error applying operations to target sheet: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _apply_operations_to_all_sheets(
        self,
        original_url: str,
        operations: Dict[str, Any],
        session_data: Dict,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Apply operations to all sheets in a multi-sheet Google Sheet
        Similar to Excel's apply_to_all_sheets handling
        """
        try:
            logger.info(f"📊 Applying operations to all sheets")
            
            # Get all sheets from session data
            files = session_data[session_id]["files"]
            all_sheets = []
            
            for file_id, file_data in files.items():
                if file_data.get("source_type") == "google_sheets":
                    sheet_name = file_data.get("sheet_name", "")
                    df = file_data["df"].copy()
                    
                    # Apply operations to this sheet
                    if 'highlight_rows' in operations:
                        df = self._apply_highlighting_to_dataframe(df, operations['highlight_rows'])
                    
                    all_sheets.append({
                        "sheet_name": sheet_name,
                        "df": df,
                        "file_id": file_id
                    })
            
            if not all_sheets:
                return {
                    'success': False,
                    'error': "No Google Sheets found in session"
                }
            
            logger.info(f"✅ Applying operations to {len(all_sheets)} sheets")
            
            # Create/update the Google Sheet with all modified sheets
            return self._create_multi_sheet_google_sheet(
                original_url, all_sheets, None, operations
            )
            
        except Exception as e:
            logger.error(f"❌ Error applying operations to all sheets: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _apply_highlighting_to_dataframe(
        self,
        df: pd.DataFrame,
        highlight_config: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Apply highlighting logic to DataFrame (identify rows to highlight)
        Returns DataFrame with highlighting metadata
        """
        try:
            # Extract highlighting parameters
            column = highlight_config.get('column')
            condition = highlight_config.get('condition', {})
            
            if not column or column not in df.columns:
                logger.warning(f"⚠️ Highlight column '{column}' not found in DataFrame")
                return df
            
            # Find rows that match the condition
            operator = condition.get('operator', '==')
            value = condition.get('value')
            
            if operator == '==':
                mask = df[column] == value
            elif operator == 'in':
                values = value if isinstance(value, list) else [value]
                mask = df[column].isin(values)
            else:
                logger.warning(f"⚠️ Unsupported highlight operator: {operator}")
                return df
            
            # Add highlighting metadata to DataFrame
            df_copy = df.copy()
            df_copy['_highlight_rows'] = mask
            
            matching_rows = mask.sum()
            logger.info(f"  🎨 Identified {matching_rows} rows for highlighting in column '{column}'")
            
            return df_copy
            
        except Exception as e:
            logger.error(f"❌ Error applying highlighting to DataFrame: {e}")
            return df
    
    def _create_multi_sheet_google_sheet(
        self,
        original_url: str,
        all_sheets: List[Dict],
        modified_sheet: Optional[Dict],
        operations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new multi-sheet Google Sheet with operations applied
        """
        try:
            # Extract spreadsheet ID from original URL
            spreadsheet_id = original_url.split('/d/')[1].split('/')[0]
            
            # Open original spreadsheet to get title
            sh = self.sheets_service.gc.open_by_key(spreadsheet_id)
            original_title = sh.title
            
            # Create new spreadsheet title
            new_title = f"{original_title}_updated"
            
            # Create new multi-sheet spreadsheet
            new_sh = self.sheets_service.gc.create(new_title)
            
            # Remove default sheet
            default_sheet = new_sh.sheet1
            
            # Add all sheets to new spreadsheet
            for i, sheet_info in enumerate(all_sheets):
                sheet_name = sheet_info["sheet_name"]
                df = sheet_info["df"]
                
                if i == 0:
                    # Use the default sheet for first sheet
                    worksheet = default_sheet
                    worksheet.update_title(sheet_name)
                else:
                    # Add new worksheet
                    worksheet = new_sh.add_worksheet(title=sheet_name, rows=len(df)+10, cols=len(df.columns)+5)
                
                # Write data to sheet
                from gspread_dataframe import set_with_dataframe
                
                # Remove highlighting metadata before writing
                df_clean = df.copy()
                if '_highlight_rows' in df_clean.columns:
                    highlight_mask = df_clean['_highlight_rows']
                    df_clean = df_clean.drop('_highlight_rows', axis=1)
                else:
                    highlight_mask = None
                
                set_with_dataframe(worksheet, df_clean, include_index=False, resize=True)
                
                # Apply formatting
                self._format_sheet_header(worksheet)
                
                # Apply highlighting if this sheet was modified
                if modified_sheet and sheet_info["sheet_name"] == modified_sheet["sheet_name"] and highlight_mask is not None:
                    self._apply_highlighting_to_worksheet(worksheet, highlight_mask, operations.get('highlight_rows', {}))
                
                logger.info(f"  ✅ Added sheet '{sheet_name}' with {len(df_clean)} rows")
            
            logger.info(f"✅ Created multi-sheet Google Sheet: {new_title}")
            
            return {
                'success': True,
                'type': 'google_sheet_operation',
                'sheet_url': new_sh.url,
                'original_url': original_url,
                'operations_applied': ['multi-sheet operation'],
                'rows': sum(len(s["df"]) for s in all_sheets),
                'columns': max(len(s["df"].columns) for s in all_sheets) if all_sheets else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating multi-sheet Google Sheet: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _format_sheet_header(self, worksheet):
        """Apply header formatting to worksheet"""
        try:
            header_format = {
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9},
                'textFormat': {'bold': True}
            }
            worksheet.format('1:1', header_format)
        except Exception as e:
            logger.warning(f"⚠️ Error formatting header: {e}")
    
    def _apply_highlighting_to_worksheet(
        self,
        worksheet,
        highlight_mask: pd.Series,
        highlight_config: Dict[str, Any]
    ):
        """Apply highlighting to specific rows in worksheet"""
        try:
            color = highlight_config.get('color', 'yellow')
            bg_color = self.COLOR_MAP.get(color, self.COLOR_MAP['yellow'])
            
            # Get row indices to highlight (1-indexed, +1 for header)
            rows_to_highlight = [i + 2 for i, should_highlight in enumerate(highlight_mask) if should_highlight]
            
            if not rows_to_highlight:
                return
            
            # Build batch format requests
            requests = []
            for row_idx in rows_to_highlight:
                requests.append({
                    'repeatCell': {
                        'range': {
                            'sheetId': worksheet.id,
                            'startRowIndex': row_idx - 1,  # 0-indexed for API
                            'endRowIndex': row_idx,
                            'startColumnIndex': 0,
                            'endColumnIndex': worksheet.col_count
                        },
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': bg_color
                            }
                        },
                        'fields': 'userEnteredFormat.backgroundColor'
                    }
                })
            
            # Execute batch update
            if requests:
                worksheet.spreadsheet.batch_update({'requests': requests})
                logger.info(f"  🎨 Applied {color} highlighting to {len(rows_to_highlight)} rows")
            
        except Exception as e:
            logger.error(f"❌ Error applying highlighting to worksheet: {e}")
