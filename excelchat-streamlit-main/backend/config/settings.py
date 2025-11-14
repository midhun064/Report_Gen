"""Centralized application settings and configuration"""
from typing import List
from pathlib import Path
import os


class Settings:
    """Centralized application settings"""
    
    # ==================== File Upload Settings ====================
    MAX_FILE_SIZE_MB: int = 100
    MAX_ROWS_THRESHOLD: int = 1_000_000
    SUPPORTED_EXTENSIONS: List[str] = ['.csv', '.xlsx', '.xls', '.ods', '.gsheet']
    
    # ==================== Response Formatting ====================
    SIMPLE_RESPONSE_MAX_LINES: int = 3
    SIMPLE_RESPONSE_MAX_CHARS: int = 500
    
    # ==================== Excel Settings ====================
    EXCEL_MAX_COLUMN_WIDTH: int = 50
    EXCEL_DEFAULT_COLOR: str = 'yellow'
    EXCEL_COLUMN_WIDTH_PADDING: int = 2
    
    # ==================== LLM Settings ====================
    LLM_TEMPERATURE: float = 0.7
    LLM_TOP_P: float = 0.95
    LLM_TOP_K: int = 40
    INTENT_DETECTION_TEMPERATURE: float = 0.1  # Lower for consistent classification
    OPERATION_PARSING_TEMPERATURE: float = 0.3  # Lower for structured output
    
    # ==================== Streaming Settings ====================
    STREAM_WORD_DELAY_SECONDS: float = 0.05
    STREAM_KEEPALIVE_INTERVAL: int = 50  # words
    
    # ==================== Session Settings ====================
    SESSION_CLEANUP_HOURS: int = 24
    MAX_CONVERSATION_HISTORY: int = 5
    
    # ==================== Paths ====================
    BACKEND_DIR: Path = Path(__file__).parent.parent
    UPLOADS_DIR: Path = BACKEND_DIR / "uploads"
    OUTPUTS_DIR: Path = BACKEND_DIR / "outputs"
    TEMPLATES_DIR: Path = BACKEND_DIR / "templates"
    
    # ==================== API Settings ====================
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 5000
    DEBUG_MODE: bool = True
    
    # ==================== CORS Settings ====================
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
    
    @classmethod
    def get_max_file_size_bytes(cls) -> int:
        """Get maximum file size in bytes"""
        return cls.MAX_FILE_SIZE_MB * 1024 * 1024
    
    @classmethod
    def get_cors_origins(cls) -> List[str]:
        """Get CORS origins from environment or use defaults"""
        env_origins = os.getenv('CORS_ORIGINS')
        if env_origins:
            return [origin.strip() for origin in env_origins.split(',')]
        return cls.CORS_ORIGINS
    
    @classmethod
    def validate_file_extension(cls, filename: str) -> bool:
        """Check if file extension is supported"""
        extension = '.' + filename.split('.')[-1].lower()
        return extension in cls.SUPPORTED_EXTENSIONS
    
    @classmethod
    def get_supported_extensions_string(cls) -> str:
        """Get human-readable list of supported extensions"""
        return ', '.join(cls.SUPPORTED_EXTENSIONS)


class ErrorMessages:
    """Centralized error messages for consistency"""
    
    @staticmethod
    def file_too_large(size_mb: float, max_mb: float) -> str:
        return f"❌ File too large: {size_mb:.1f}MB exceeds {max_mb}MB limit. Please upload a smaller file."
    
    @staticmethod
    def unsupported_format(extension: str, supported: str) -> str:
        return f"❌ Unsupported file format: {extension}. Supported formats: {supported}"
    
    @staticmethod
    def no_data_loaded() -> str:
        return "❌ No data loaded. Please upload a file first before asking questions."
    
    @staticmethod
    def session_not_found(session_id: str = None) -> str:
        if session_id:
            return f"❌ Session {session_id} not found. Please start a new conversation."
        return "❌ Session not found. Please start a new conversation."
    
    @staticmethod
    def file_upload_failed(filename: str, reason: str = None) -> str:
        if reason:
            return f"❌ Failed to upload {filename}: {reason}"
        return f"❌ Failed to upload {filename}. Please try again."
    
    @staticmethod
    def api_key_missing() -> str:
        return (
            "❌ GEMINI_API_KEY environment variable is required.\n"
            "Please set it in your .env file or environment variables.\n"
            "Get your API key from: https://aistudio.google.com/app/apikey"
        )
    
    @staticmethod
    def invalid_file_type(invalid_files: List[str], supported: str) -> str:
        files_str = ', '.join(invalid_files)
        return f"⚠️ Unsupported file types: {files_str}. Supported formats: {supported}"
    
    @staticmethod
    def upload_success(count: int, total_rows: int) -> str:
        return f"✅ Successfully uploaded {count} file(s) with {total_rows:,} total rows. Ready to analyze!"
    
    @staticmethod
    def all_uploads_failed() -> str:
        return "❌ Failed to upload files. Please check your file format and try again."
    
    @staticmethod
    def generic_error(operation: str, error: str) -> str:
        return f"❌ Error in {operation}: {error}"
    
    @staticmethod
    def log_format(context: str, error: str) -> str:
        """Consistent logging format"""
        return f"❌ {context}: {error}"


# Create singleton instance
settings = Settings()
error_messages = ErrorMessages()
