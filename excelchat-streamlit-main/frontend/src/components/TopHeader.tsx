import React, { useState } from 'react';
import { User, Settings, Shield, ChevronDown, Mail, Calendar, ListTodo, ArrowRight } from 'lucide-react';

const TopHeader: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="bg-gradient-to-b from-sky-50 to-sky-100/80 backdrop-blur-md border-b border-sky-200/50 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Logo and Brand - Left Side */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-shrink">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              {/* Blue square icon with shield outline */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-sky-700 truncate">AdminEase</h1>
                <p className="hidden sm:block text-sm text-sky-600 font-medium">
                  Regular Employee Dashboard • Employee Department
                </p>
              </div>
            </div>
            {/* User ID Badge */}
            <div className="hidden sm:block bg-sky-100 text-sky-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
              ID: EMP001
            </div>
          </div>

          {/* Center-Right Action Icons */}
          <div className="flex items-center space-x-2">
            {/* Calendar */}
            <button 
              className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all duration-200"
              title="Calendar"
            >
              <Calendar className="h-5 w-5" />
            </button>

            {/* Messages */}
            <button className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all duration-200" title="Messages">
              <Mail className="h-5 w-5" />
            </button>

            {/* Tasks */}
            <button className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all duration-200" title="Tasks">
              <ListTodo className="h-5 w-5" />
            </button>

            {/* Settings */}
            <button className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all duration-200" title="Settings">
              <Settings className="h-5 w-5" />
            </button>
            
            {/* User Profile Dropdown */}
            <div className="relative pl-2 border-l border-gray-200">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center space-x-1 sm:space-x-3 p-1 sm:p-2 rounded-lg transition-all duration-200 group ${
                  isProfileOpen 
                    ? 'bg-sky-600 text-white' 
                    : 'hover:bg-sky-100 text-sky-700 hover:text-sky-900'
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm ${
                  isProfileOpen ? 'bg-white/20' : 'bg-sky-600'
                }`}>
                  <User className={`h-4 w-4 sm:h-5 sm:w-5 ${isProfileOpen ? 'text-white' : 'text-white'}`} />
                </div>
                <div className="hidden lg:block text-left">
                  <p className={`text-sm font-semibold ${isProfileOpen ? 'text-white' : 'text-sky-700'}`}>
                    John Doe
                  </p>
                  <p className={`text-xs truncate max-w-32 ${isProfileOpen ? 'text-white' : 'text-sky-600'}`}>
                    john.doe@company.com
                  </p>
                </div>
                <ChevronDown className={`hidden md:block h-4 w-4 transition-transform duration-200 ${
                  isProfileOpen ? 'text-white rotate-180' : 'text-sky-700'
                }`} />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-xl shadow-xl border border-sky-100 z-50 overflow-hidden">
                  {/* Profile Header */}
                  <div className="bg-sky-600 p-6 text-white">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">John Doe</h3>
                        <p className="text-white text-sm">Regular Employee</p>
                        <p className="text-white text-xs">ID: EMP001</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-gray-600">
                        <Mail className="h-4 w-4 text-sky-500" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">Email</span>
                          <p className="text-sm text-gray-700">john.doe@company.com</p>
                        </div>
                      </div>
                    </div>

                    {/* Settings Button */}
                    <div className="pt-4 border-t border-gray-100">
                      <button className="flex items-center space-x-2 p-3 w-full text-left hover:bg-sky-50 rounded-lg transition-colors">
                        <Settings className="h-4 w-4 text-sky-500" />
                        <span className="text-sm font-medium text-sky-600">Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button - Separate from Profile */}
            <div className="pl-1 sm:pl-2 border-l border-gray-200">
              <button
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-sm"
                title="Logout"
                type="button"
              >
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
