import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)


class SimpleChatSystem:
    """
    Simple chat system that responds to user questions and maintains sessions
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)

        self.model_candidates = [
            "models/gemini-2.5-flash",
            "models/gemini-pro-latest",
            "models/gemini-2.0-flash",
        ]

        self.model = None
        self.model_name = None

        for candidate in self.model_candidates:
            try:
                self.model = genai.GenerativeModel(candidate)
                self.model_name = candidate
                logger.info(f"✅ Gemini model initialized: {candidate}")
                test_response = self.model.generate_content("Hello, respond with 'OK'")
                logger.info(f"✅ Model test successful: {test_response.text[:20]}")
                break
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize '{candidate}': {e}")
                self.model = None

        if self.model is None:
            try:
                models = list(genai.list_models())
                available = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
                logger.error(f"❌ No working model found. Available models: {available}")
            except Exception as list_err:
                logger.error(f"❌ Could not list models: {list_err}")
            raise Exception("❌ Could not initialize any Gemini model")

        # Session persistence
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.sessions_dir = Path(__file__).resolve().parent.parent / "sessions"
        self.sessions_dir.mkdir(exist_ok=True)

    def create_session(self, user_id: Optional[str] = None) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "conversation_history": [],
            "memory_summary": "",
            "preferences": {},
        }
        self._persist_session_to_disk(session_id)
        logger.info(f"Created new session: {session_id}")
        return session_id

    def process_chat_message(self, session_id: str, message: str) -> Dict[str, Any]:
        try:
            # Try to load from disk if not in memory
            if session_id not in self.sessions:
                if not self._load_session_from_disk(session_id):
                    return {"success": False, "error": "Session not found"}
            
            session = self.sessions[session_id]
            conversation_history = session.get("conversation_history", [])
            memory_summary = session.get("memory_summary", "")
            preferences = session.get("preferences", {})

            # Lightweight preference extraction (assistant name)
            try:
                import re
                name_match = re.search(
                    r"(?:cal+l+\s*you|call\s*you|your\s*name\s*is|name\s*you\s*as)\s*[\"']?\s*([A-Za-z][A-Za-z0-9_-]{1,30})\s*[\"']?\b",
                    message,
                    re.IGNORECASE,
                )
                if name_match:
                    pref_name = name_match.group(1).strip().strip("'\"").rstrip(".,!?")
                    preferences["assistant_name"] = pref_name
                    session["preferences"] = preferences
            except Exception:
                pass

            # If user asks the assistant's name and one is stored, answer directly
            user_lower = (message or "").strip().lower()
            if preferences.get("assistant_name") and any(
                q in user_lower for q in [
                    "what is your name", "what's your name", "your name?", "who are you", "name please"
                ]
            ):
                ai_message = f"I'm {preferences['assistant_name']}."
                session["conversation_history"].append({
                    "user_message": message,
                    "ai_response": ai_message,
                    "timestamp": datetime.now().isoformat()
                })
                self._persist_session_to_disk(session_id)
                return {"success": True, "type": "text", "message": ai_message}

            history_context = ""
            if conversation_history:
                recent_history = conversation_history[-3:]
                history_context = "\n\nRecent Conversation:\n"
                for exchange in recent_history:
                    history_context += f"User: {exchange['user_message']}\n"
                    history_context += f"Assistant: {exchange['ai_response']}\n"

            assistant_name_line = ""
            if preferences.get("assistant_name"):
                assistant_name_line = (
                    f"Your name is '{preferences.get('assistant_name')}'. "
                    f"Always introduce or refer to yourself with this name when relevant.\n"
                )

            # Optional data context from uploaded files
            # This is how the AI "sees" the Excel file data - it reads the summary created during upload
            data_context = ""
            try:
                uploaded = (session.get('uploaded_files') or [])[-2:]  # last two files
                if uploaded:
                    parts = ["You have the following uploaded data available (summaries):"]
                    for uf in uploaded:
                        file_summary = (uf.get('summary') or '')[:2000]
                        parts.append(
                            f"\nFile: {uf.get('filename')} (rows≈{uf.get('rows')})\n{file_summary}"
                        )
                    data_context = "\n\n" + "\n\n".join(parts)
                    logger.info(f"📊 Including data context for {len(uploaded)} file(s) in chat prompt")
            except Exception as e:
                logger.warning(f"⚠️ Error building data context: {e}")
                data_context = ""

            ai_prompt = f"""
{assistant_name_line}You are a helpful, friendly AI assistant. Respond naturally to the user's message using prior context.

Conversation Memory (compact summary to use as context):
{memory_summary if memory_summary else '(no memory yet)'}

User Message: "{message}"
{history_context}

Data Context:
{data_context if data_context else '(no uploaded data)'}

Guidelines:
- Be conversational, warm, and helpful
- Answer questions directly and clearly
- If you don't know something, say so honestly
- Keep responses concise but informative
- Use a friendly tone
- Use plain text formatting only - NO markdown symbols like **, *, _, etc.
- Present information in clean, readable format without special formatting characters
 {assistant_name_line}

Respond naturally:"""

            response = self.model.generate_content(
                ai_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                ),
            )
            ai_message = response.text

            session["conversation_history"].append({
                "user_message": message,
                "ai_response": ai_message,
                "timestamp": datetime.now().isoformat(),
            })

            # Update rolling memory summary
            try:
                mem_update_prompt = f"""
You maintain a compact conversation memory. Update the summary to include the latest exchange.

Previous Summary:
{memory_summary}

Latest Exchange:
User: {message}
Assistant: {ai_message}

Rules:
- Keep it under 1200 characters
- Focus on user preferences, goals, unresolved questions, decisions, key facts
- Do not repeat verbatim text; keep it concise
- Return only the updated summary text
"""
                mem_response = self.model.generate_content(
                    mem_update_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3, top_p=0.9, top_k=32
                    ),
                )
                session["memory_summary"] = (mem_response.text or "").strip()
            except Exception:
                pass

            self._persist_session_to_disk(session_id)
            return {"success": True, "type": "text", "message": ai_message}
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I encountered an error processing your request.",
            }

    def get_session_info(self, session_id: str) -> Dict[str, Any]:
        if session_id not in self.sessions:
            return {"success": False, "error": "Session not found"}
        session = self.sessions[session_id]
        return {
            "success": True,
            "session_id": session_id,
            "created_at": session["created_at"],
            "conversation_count": len(session["conversation_history"]),
        }

    def _load_session_from_disk(self, session_id: str) -> bool:
        """Load a session from disk into memory if it exists"""
        if session_id in self.sessions:
            return True  # Already in memory
        
        try:
            file_path = self.sessions_dir / f"{session_id}.json"
            if file_path.exists():
                with file_path.open('r', encoding='utf-8') as f:
                    disk_data = json.load(f)
                
                # Convert disk format to memory format
                messages = disk_data.get("messages", [])
                conversation_history = []
                
                # Reconstruct conversation_history from interleaved messages
                i = 0
                while i < len(messages):
                    if i + 1 < len(messages):
                        user_msg = messages[i]
                        assistant_msg = messages[i + 1]
                        if user_msg.get("role") == "user" and assistant_msg.get("role") == "assistant":
                            conversation_history.append({
                                "user_message": user_msg.get("message", ""),
                                "ai_response": assistant_msg.get("message", ""),
                                "timestamp": user_msg.get("timestamp") or assistant_msg.get("timestamp", "")
                            })
                        i += 2
                    else:
                        i += 1
                
                # Load into memory
                self.sessions[session_id] = {
                    "session_id": session_id,
                    "user_id": disk_data.get("user_id"),
                    "created_at": disk_data.get("created_at", ""),
                    "conversation_history": conversation_history,
                    "memory_summary": disk_data.get("memory_summary", ""),
                    "preferences": disk_data.get("preferences", {}),
                    "uploaded_files": disk_data.get("uploaded_files", []),
                }
                logger.info(f"✅ Loaded session {session_id} from disk ({len(conversation_history)} messages)")
                return True
        except Exception as e:
            logger.warning(f"Failed to load session {session_id} from disk: {e}")
        
        return False

    def _persist_session_to_disk(self, session_id: str) -> None:
        try:
            if session_id not in self.sessions:
                return
            session = self.sessions[session_id]
            storage_obj = {
                "session_id": session.get("session_id"),
                "user_id": session.get("user_id"),
                "created_at": session.get("created_at"),
                "memory_summary": session.get("memory_summary", ""),
                "preferences": session.get("preferences", {}),
            }

            interleaved = []
            for item in session.get("conversation_history", []):
                interleaved.append({
                    "role": "user",
                    "message": item.get("user_message"),
                    "timestamp": item.get("timestamp"),
                })
                interleaved.append({
                    "role": "assistant",
                    "message": item.get("ai_response"),
                    "timestamp": item.get("timestamp"),
                })
            storage_obj["messages"] = interleaved

            target = self.sessions_dir / f"{session_id}.json"
            with target.open("w", encoding="utf-8") as f:
                json.dump(storage_obj, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed saving session {session_id}: {e}")


