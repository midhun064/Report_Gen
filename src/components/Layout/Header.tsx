import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Shield, ChevronDown, Mail, Building, Calendar, UserCheck, ListTodo, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName } from '../../types/auth';
import CalendarWidget from '../Calendar/CalendarWidget';
import { employeeProfileService, EmployeeProfile } from '../../services/employeeProfileService';
import NotificationBell from '../Notifications/NotificationBell';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Handle logout with proper event handling
  const handleLogout = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Direct logout without confirmation
    logout();
  };

  // Fetch employee profile data
  const fetchEmployeeProfile = async () => {
    if (!user?.profile || !('employee_code' in user.profile)) {
      console.log('🔍 [Header] No employee code found in user profile');
      return;
    }

    const employeeId = String(user.profile.employee_code);
    console.log(`🔍 [Header] Fetching profile for employee: ${employeeId}`);
    
    setProfileLoading(true);
    try {
      const profile = await employeeProfileService.getEmployeeProfile(employeeId);
      if (profile) {
        console.log('✅ [Header] Employee profile loaded from API:', profile);
        setEmployeeProfile(profile);
      } else {
        console.log('⚠️ [Header] No profile data received from API');
        setEmployeeProfile(null);
      }
    } catch (error) {
      console.error('❌ [Header] Error fetching employee profile:', error);
      setEmployeeProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch employee profile when user is available
  useEffect(() => {
    if (user && user.profile && 'employee_code' in user.profile) {
      fetchEmployeeProfile();
    }
  }, [user]);

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
                  {user?.role || 'Regular Employee'} Dashboard • Employee Department
                </p>
              </div>
            </div>
            {/* User ID Badge */}
            {user?.profile && 'employee_code' in user.profile && (
              <div className="hidden sm:block bg-sky-100 text-sky-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                ID: {String(user.profile.employee_code)}
              </div>
            )}
          </div>

          {/* Center-Right Action Icons */}
          <div className="flex items-center space-x-2">
            {/* Calendar */}
            <div className="relative" ref={calendarRef}>
              <button 
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-all duration-200"
                title="Calendar"
              >
                <Calendar className="h-5 w-5" />
              </button>

              {/* Calendar Widget */}
              {isCalendarOpen && (
                <div className="absolute right-0 top-full mt-3 z-50">
                  <CalendarWidget />
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationBell />

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
            <div className="relative pl-2 border-l border-gray-200" ref={profileRef}>
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
                    {user ? getUserDisplayName(user) : 'User'}
                  </p>
                  <p className={`text-xs truncate max-w-32 ${isProfileOpen ? 'text-white' : 'text-sky-600'}`}>
                    {user?.email}
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
                        <h3 className="text-lg font-bold text-white">{user ? getUserDisplayName(user) : 'User'}</h3>
                        <p className="text-white text-sm">{user?.role || 'Regular Employee'}</p>
                        {user?.profile && 'employee_code' in user.profile && (
                          <p className="text-white text-xs">ID: {String(user.profile.employee_code)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="p-6 space-y-4">
                    {profileLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading profile...</span>
                      </div>
                    ) : employeeProfile ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Mail className="h-4 w-4 text-sky-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Email</span>
                            <p className="text-sm text-gray-700">{employeeProfile.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Building className="h-4 w-4 text-sky-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Department</span>
                            <p className="text-sm text-gray-700">{employeeProfile.department_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <UserCheck className="h-4 w-4 text-sky-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Manager</span>
                            <p className="text-sm text-gray-700">{employeeProfile.manager_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <UserCheck className="h-4 w-4 text-sky-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">HR Contact</span>
                            <p className="text-sm text-gray-700">{employeeProfile.hr_contact_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-600">
                          <Calendar className="h-4 w-4 text-sky-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">Join Date</span>
                            <p className="text-sm text-gray-700">
                              {new Date(employeeProfile.join_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4">
                        <div className="text-center">
                          <div className="text-gray-500 mb-2">
                            <User className="h-8 w-8 mx-auto" />
                          </div>
                          <p className="text-sm text-gray-600">Profile data not available</p>
                          <p className="text-xs text-gray-500 mt-1">Please check your connection</p>
                        </div>
                      </div>
                    )}

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
                onClick={handleLogout}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-sm"
                title="Logout"
                type="button"
                style={{ position: 'relative', zIndex: 10 }}
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

export default Header;

