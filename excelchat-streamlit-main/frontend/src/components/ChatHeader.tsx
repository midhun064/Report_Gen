const ChatHeader = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-sky-50 to-sky-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 rounded-t-2xl border-b border-sky-100">
      {/* soft background shapes */}
      <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-sky-200/20 rounded-full translate-x-6 sm:translate-x-8 md:translate-x-12 -translate-y-6 sm:-translate-y-8 md:-translate-y-12"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-sky-200/20 rounded-full -translate-x-6 sm:-translate-x-8 md:-translate-x-12 translate-y-6 sm:translate-y-8 md:translate-y-12"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-lg sm:text-xl font-bold text-sky-900 truncate">Chief Smile Officer</h4>
          <p className="text-xs sm:text-sm text-sky-700/80 mt-1 hidden sm:block">Text messages and voice transcripts appear here.</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <span className="px-2 sm:px-4 py-1 sm:py-2 bg-sky-100 text-sky-800 text-xs sm:text-sm font-medium rounded-full flex items-center space-x-1 sm:space-x-2">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sky-500 rounded-full"></span>
            <span className="hidden sm:inline">Online</span>
            <span className="sm:hidden">●</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
