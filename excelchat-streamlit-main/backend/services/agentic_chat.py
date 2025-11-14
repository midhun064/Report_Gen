"""
Agentic Chat System with Function Calling
Supports Excel operations through tool use
"""

import json
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
import google.generativeai as genai
from google.generativeai.types import content_types

from services.excel_tools import ExcelTools

logger = logging.getLogger(__name__)


class AgenticChatSystem:
    """
    Enhanced chat system with function calling capabilities for Excel operations
    """
    
    def __init__(self, api_key: str, uploads_dir: str = "backend/uploads", 
                 outputs_dir: str = "backend/outputs"):
        self.api_key = api_key
        genai.configure(api_key=api_key)
        
        # Initialize Excel tools
        self.excel_tools = ExcelTools(uploads_dir, outputs_dir)
        
        # Initialize model with function calling
        self.model = None
        self.model_name = None
        
        model_candidates = [
            "models/gemini-2.0-flash",
        ]
        
        # Define tools for function calling
        self.tools = self._create_gemini_tools()
        
        for candidate in model_candidates:
            try:
                # Create model first without tools (we'll pass tools at generation time)
                self.model = genai.GenerativeModel(candidate)
                self.model_name = candidate
                logger.info(f"✅ Agentic model initialized: {candidate}")
                
                # Test the model
                test_response = self.model.generate_content("Hello")
                logger.info(f"✅ Model test successful with function calling support")
                break
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize '{candidate}': {e}")
                self.model = None
        
        if self.model is None:
            raise Exception("❌ Could not initialize any Gemini model")
    
    def _create_gemini_tools(self):
        """Create Gemini-compatible tool definitions using dictionary format"""
        # Define tools using dictionary format (compatible with older SDK versions)
        tools = [
            {
                'function_declarations': [
                    {
                        'name': 'generate_chart',
                        'description': 'Generate a chart/visualization from Excel data. Use this when user asks for charts, graphs, plots, or visualizations.',
                        'parameters': {
                            'type': 'object',
                            'properties': {
                                'filename': {
                                    'type': 'string',
                                    'description': 'Name of the Excel file'
                                },
                                'chart_type': {
                                    'type': 'string',
                                    'description': 'Type of chart: bar, line, pie, scatter, histogram, or box',
                                    'enum': ['bar', 'line', 'pie', 'scatter', 'histogram', 'box']
                                },
                                'x_column': {
                                    'type': 'string',
                                    'description': 'Column name for X-axis or categories'
                                },
                                'y_column': {
                                    'type': 'string',
                                    'description': 'Column name for Y-axis (optional)'
                                },
                                'title': {
                                    'type': 'string',
                                    'description': 'Chart title'
                                }
                            },
                            'required': ['filename', 'chart_type', 'x_column']
                        }
                    },
                    {
                        'name': 'modify_excel',
                        'description': 'Modify an Excel file by highlighting rows/cells or filtering data. Use when user wants to highlight, color, mark, or filter Excel data.',
                        'parameters': {
                            'type': 'object',
                            'properties': {
                                'filename': {
                                    'type': 'string',
                                    'description': 'Name of the Excel file'
                                },
                                'operation': {
                                    'type': 'string',
                                    'description': 'Operation type',
                                    'enum': ['highlight_rows', 'highlight_cells', 'filter_data']
                                },
                                'column': {
                                    'type': 'string',
                                    'description': 'Column name to check'
                                },
                                'condition_value': {
                                    'type': 'string',
                                    'description': 'Value to match'
                                },
                                'color': {
                                    'type': 'string',
                                    'description': 'Color for highlighting',
                                    'enum': ['green', 'red', 'yellow', 'blue', 'orange']
                                },
                                'output_filename': {
                                    'type': 'string',
                                    'description': 'Output filename'
                                }
                            },
                            'required': ['filename', 'operation', 'column', 'condition_value']
                        }
                    },
                    {
                        'name': 'analyze_data',
                        'description': 'Perform data analysis operations like statistics, unique values, filtering, grouping, or sorting. Use when user asks for data insights or analysis.',
                        'parameters': {
                            'type': 'object',
                            'properties': {
                                'filename': {
                                    'type': 'string',
                                    'description': 'Name of the Excel file'
                                },
                                'operation': {
                                    'type': 'string',
                                    'description': 'Analysis operation',
                                    'enum': ['statistics', 'unique_values', 'filter', 'group_by', 'sort']
                                },
                                'column': {
                                    'type': 'string',
                                    'description': 'Column name for operation'
                                },
                                'filter_value': {
                                    'type': 'string',
                                    'description': 'Value to filter by'
                                }
                            },
                            'required': ['filename', 'operation']
                        }
                    }
                ]
            }
        ]
        
        return tools
    
    def process_message_with_tools(self, session_id: str, message: str, 
                                   session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a message using LLM-based function calling (true agentic approach)
        The LLM decides which tools to call based on understanding user intent
        Returns: {success, message, tool_results, download_urls}
        """
        try:
            # Build context from session
            conversation_history = session_data.get("conversation_history", [])
            memory_summary = session_data.get("memory_summary", "")
            uploaded_files = session_data.get("uploaded_files", [])
            
            # Build history context
            history_context = ""
            if conversation_history:
                recent = conversation_history[-3:]
                for exchange in recent:
                    history_context += f"User: {exchange.get('user_message', '')}\n"
                    history_context += f"Assistant: {exchange.get('ai_response', '')}\n"
            
            # Build data context
            data_context = ""
            if uploaded_files:
                data_context = "Available Excel files:\n"
                for file_info in uploaded_files[-2:]:  # Last 2 files
                    data_context += f"- {file_info.get('filename')}\n"
                    summary = file_info.get('summary', '')
                    if summary:
                        data_context += f"  Summary: {summary[:500]}\n"
            
            # Create the prompt
            system_prompt = f"""You are an intelligent Excel data analyst assistant with access to powerful tools.

Available Data:
{data_context if data_context else '(No files uploaded yet)'}

Conversation Memory:
{memory_summary if memory_summary else '(No previous context)'}

Recent Conversation:
{history_context if history_context else '(No recent messages)'}

Your capabilities:
1. Generate charts and visualizations (bar, line, pie, scatter, histogram, box plots)
2. Modify Excel files (highlight rows/cells with colors, filter data)
3. Analyze data (statistics, unique values, filtering, grouping, sorting)

When the user asks for:
- Charts/graphs/visualizations → Use generate_chart tool
- Highlighting rows/cells or modifying Excel → Use modify_excel tool
- Data analysis, statistics, filtering → Use analyze_data tool

Guidelines:
- Always use tools when appropriate rather than just describing what to do
- Use plain text formatting only - NO markdown symbols like **, *, _, etc.
- Be conversational, warm, and helpful
- When you use a tool, explain what you did and provide download links
- If multiple files exist, use the most recently uploaded one unless specified

User Request: {message}"""

            # Try to use generate_content with tools
            # Some SDK versions don't support tools parameter, so we'll catch that
            try:
                response = self.model.generate_content(
                    system_prompt,
                    tools=self.tools,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        top_p=0.95,
                        top_k=40,
                    )
                )
            except TypeError as e:
                # If tools parameter not supported, use LLM to generate structured JSON
                logger.warning(f"⚠️ Function calling not supported in this SDK version: {e}")
                logger.info("📝 Falling back to LLM-based JSON structured output")
                
                # Ask LLM to analyze the request and provide structured JSON
                analysis_prompt = f"""You are an intelligent Excel data analyst. Analyze the user's request and determine what actions to take.

Available Data:
{data_context if data_context else '(No files uploaded yet)'}

User Request: "{message}"

Analyze this request and respond with a JSON object indicating what tools to use. Format:
{{
  "needs_tool": true/false,
  "tool_name": "generate_chart" or "modify_excel" or "analyze_data" or null,
  "parameters": {{
    "filename": "filename from available data",
    "chart_type": "bar/line/pie/scatter/histogram/box",
    "x_column": "column name from the data",
    "y_column": "column name or null",
    "operation": "highlight_rows/highlight_cells/filter_data/statistics/unique_values/group_by/sort",
    "column": "column name",
    "condition_value": "value to match",
    "color": "green/red/yellow/blue/orange"
  }},
  "explanation": "Brief explanation of what you understood"
}}

Only include parameters relevant to the tool. If no tool is needed, set needs_tool to false.

Respond ONLY with valid JSON, no other text."""

                # Get LLM analysis
                analysis_response = self.model.generate_content(
                    analysis_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,  # Lower temperature for structured output
                        top_p=0.95,
                        top_k=40,
                    )
                )
                
                tool_results = []
                download_urls = []
                final_text = ""
                
                # Parse LLM's JSON response
                try:
                    import json
                    import re
                    
                    # Extract JSON from response (handle markdown code blocks)
                    response_text = analysis_response.text
                    json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(1)
                    else:
                        # Try to find JSON object directly
                        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                        json_str = json_match.group(0) if json_match else response_text
                    
                    analysis = json.loads(json_str)
                    logger.info(f"🤖 LLM Analysis: {analysis}")
                    
                    # Execute tool if needed
                    if analysis.get('needs_tool') and analysis.get('tool_name'):
                        tool_name = analysis['tool_name']
                        params = analysis.get('parameters', {})
                        
                        # Add filename if not provided
                        if 'filename' not in params or not params.get('filename'):
                            if uploaded_files:
                                params['filename'] = uploaded_files[-1].get('filename')
                        
                        logger.info(f"🔧 LLM-directed tool call: {tool_name} with params: {params}")
                        
                        # Execute the tool
                        tool_result = self._execute_tool(tool_name, params)
                        tool_results.append({
                            "tool": tool_name,
                            "args": params,
                            "result": tool_result
                        })
                        
                        # Extract download URL
                        if tool_result.get("download_url"):
                            download_urls.append({
                                "filename": tool_result.get("filename"),
                                "url": tool_result.get("download_url"),
                                "type": "chart" if "chart" in tool_name else "excel"
                            })
                        
                        # Generate natural language response
                        if tool_result.get('success'):
                            final_text = f"I've completed your request:\n\n- {tool_result.get('message', 'Done')}\n"
                            if download_urls:
                                final_text += "\nDownload your files:\n"
                                for dl in download_urls:
                                    final_text += f"- {dl['filename']}: {dl['url']}\n"
                        else:
                            final_text = f"I encountered an issue: {tool_result.get('error', 'Unknown error')}"
                        
                        # Extract images for inline display
                        images = []
                        for dl in download_urls:
                            if dl.get('type') == 'chart':
                                images.append({
                                    "url": dl.get('url'),
                                    "filename": dl.get('filename'),
                                    "type": "chart"
                                })
                        
                        return {
                            "success": True,
                            "message": final_text,
                            "type": "text",
                            "tool_results": tool_results,
                            "download_urls": download_urls,
                            "images": images  # For inline image display in frontend
                        }
                    else:
                        # No tool needed, generate conversational response
                        conv_response = self.model.generate_content(
                            system_prompt,
                            generation_config=genai.types.GenerationConfig(
                                temperature=0.7,
                                top_p=0.95,
                                top_k=40,
                            )
                        )
                        final_text = conv_response.text if conv_response.text else analysis.get('explanation', 'I can help with that!')
                
                except (json.JSONDecodeError, AttributeError, KeyError) as parse_error:
                    logger.error(f"❌ Failed to parse LLM analysis: {parse_error}")
                    # Fallback to simple response
                    final_text = "I understand you want to work with your Excel data. Could you please rephrase your request? For example: 'Create a bar chart for the Status column' or 'Highlight rows where Status is Invited in yellow'."
                
                return {
                    "success": True,
                    "message": final_text,
                    "type": "text",
                    "tool_results": tool_results,
                    "download_urls": download_urls,
                    "images": []  # No images in error case
                }
            
            tool_results = []
            download_urls = []
            final_text = ""
            
            # Handle function calling (LLM decides which tools to use)
            max_iterations = 3
            iteration = 0
            
            while iteration < max_iterations:
                iteration += 1
                
                # Check if LLM wants to call a function
                function_calls = []
                if response.candidates and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            function_calls.append(part.function_call)
                        elif hasattr(part, 'text') and part.text:
                            final_text += part.text
                
                # If no function calls, we're done
                if not function_calls:
                    break
                
                # Execute each function call
                for function_call in function_calls:
                    function_name = function_call.name
                    function_args = dict(function_call.args)
                    
                    # Add filename if not provided
                    if 'filename' not in function_args or not function_args.get('filename'):
                        if uploaded_files:
                            function_args['filename'] = uploaded_files[-1].get('filename')
                    
                    logger.info(f"🤖 LLM calling function: {function_name} with args: {function_args}")
                    
                    # Execute the tool
                    tool_result = self._execute_tool(function_name, function_args)
                    tool_results.append({
                        "tool": function_name,
                        "args": function_args,
                        "result": tool_result
                    })
                    
                    # Extract download URL
                    if tool_result.get("download_url"):
                        download_urls.append({
                            "filename": tool_result.get("filename"),
                            "url": tool_result.get("download_url"),
                            "type": "chart" if "chart" in function_name else "excel"
                        })
                
                # After executing functions, ask LLM to provide final response
                # Build a follow-up prompt with the tool results
                if tool_results:
                    results_summary = "Tool execution results:\n"
                    for tr in tool_results:
                        results_summary += f"- {tr['tool']}: {tr['result'].get('message', 'Done')}\n"
                    
                    follow_up_prompt = f"{system_prompt}\n\n{results_summary}\n\nPlease provide a natural language response to the user about what was done."
                    
                    # Get final response from LLM
                    response = self.model.generate_content(
                        follow_up_prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.7,
                            top_p=0.95,
                            top_k=40,
                        )
                    )
                else:
                    break
            
            # If LLM used tools but didn't provide final text, create summary
            if tool_results and not final_text:
                final_text = "I've completed your request:\n\n"
                for result in tool_results:
                    if result['result'].get('success'):
                        final_text += f"- {result['result'].get('message', 'Done')}\n"
                
                if download_urls:
                    final_text += "\nDownload your files:\n"
                    for dl in download_urls:
                        final_text += f"- {dl['filename']}: {dl['url']}\n"
            
            # If still no text, extract from last response
            if not final_text and response.text:
                final_text = response.text
            
            # Fallback message
            if not final_text:
                final_text = "I've processed your request. Let me know if you need anything else!"
            
            logger.info(f"✅ LLM-based agentic processing complete with {len(tool_results)} tool calls")
            
            # Extract images (charts) for inline display
            images = []
            for dl in download_urls:
                if dl.get('type') == 'chart':
                    images.append({
                        "url": dl.get('url'),
                        "filename": dl.get('filename'),
                        "type": "chart"
                    })
            
            return {
                "success": True,
                "message": final_text,
                "type": "text",
                "tool_results": tool_results,
                "download_urls": download_urls,
                "images": images  # For inline image display in frontend
            }
            
        except Exception as e:
            logger.error(f"Error in agentic processing: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "message": f"I encountered an error while processing your request: {str(e)}"
            }
    
    def _execute_tool(self, function_name: str, function_args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool function"""
        try:
            if function_name == "generate_chart":
                return self.excel_tools.generate_chart(**function_args)
            elif function_name == "modify_excel":
                return self.excel_tools.modify_excel(**function_args)
            elif function_name == "analyze_data":
                return self.excel_tools.analyze_data(**function_args)
            else:
                return {"success": False, "error": f"Unknown tool: {function_name}"}
        except Exception as e:
            logger.error(f"Error executing tool {function_name}: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _create_summary_message(self, tool_results: List[Dict], download_urls: List[Dict]) -> str:
        """Create a summary message from tool results"""
        messages = []
        
        for result in tool_results:
            tool_name = result.get("tool", "")
            tool_result = result.get("result", {})
            
            if tool_result.get("success"):
                msg = tool_result.get("message", "")
                if msg:
                    messages.append(msg)
        
        summary = " ".join(messages)
        
        if download_urls:
            summary += "\n\nDownload links:\n"
            for dl in download_urls:
                summary += f"- {dl['filename']}: {dl['url']}\n"
        
        return summary if summary else "Task completed successfully!"

