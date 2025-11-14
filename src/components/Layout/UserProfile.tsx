import React from 'react';
import { User, Mail, Phone, Calendar, Building, Briefcase, Users, UserCheck, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName } from '../../types/auth';

const UserProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const profile = user.profile;
  const department = user.department;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-100/30 to-blue-100/30 rounded-full translate-y-12 -translate-x-12"></div>
      
      <div className="relative z-10">
        <div className="flex items-start space-x-6">
          {/* Enhanced Avatar */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                  {getUserDisplayName(user)}
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                  {profile && 'employee_status' in profile && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                      {profile.employee_status}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gray-50 rounded-xl px-4 py-2">
                  <p className="text-lg font-bold text-gray-900">
                    {profile && 'employee_code' in profile ? profile.employee_code : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Employee ID</p>
                </div>
              </div>
            </div>

            {/* Enhanced Profile Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact Information */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-gray-100/50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center mb-4">
                  <Mail className="h-4 w-4 mr-2 text-blue-600" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <Mail className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  {profile && 'contact_number' in profile && profile.contact_number && (
                    <div className="flex items-center text-gray-700">
                      <Phone className="h-4 w-4 mr-3 text-gray-400" />
                      <span className="text-sm font-medium">{profile.contact_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Information */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-gray-100/50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center mb-4">
                  <Building className="h-4 w-4 mr-2 text-indigo-600" />
                  Work Information
                </h3>
                <div className="space-y-3">
                  {profile && 'position' in profile && profile.position && (
                    <div className="flex items-center text-gray-700">
                      <Briefcase className="h-4 w-4 mr-3 text-gray-400" />
                      <span className="text-sm font-medium">{profile.position}</span>
                    </div>
                  )}
                  {department && (
                    <div className="flex items-center text-gray-700">
                      <Building className="h-4 w-4 mr-3 text-gray-400" />
                      <span className="text-sm font-medium">{department.department_name}</span>
                    </div>
                  )}
                  {profile && 'join_date' in profile && profile.join_date && (
                    <div className="flex items-center text-gray-700">
                      <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                      <span className="text-sm font-medium">Joined {new Date(profile.join_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Manager and HR Information */}
              {(profile && ('manager_name' in profile || 'hr_name' in profile)) && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-gray-100/50">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center mb-4">
                    <Users className="h-4 w-4 mr-2 text-purple-600" />
                    Reporting Structure
                  </h3>
                  <div className="space-y-3">
                    {profile && 'manager_name' in profile && profile.manager_name && (
                      <div className="flex items-start text-gray-700">
                        <User className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">Manager:</span>
                          <p className="text-sm font-semibold">{profile.manager_name}</p>
                          {profile.manager_id && (
                            <p className="text-xs text-gray-500">ID: {profile.manager_id}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {profile && 'hr_name' in profile && profile.hr_name && (
                      <div className="flex items-start text-gray-700">
                        <UserCheck className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">HR Contact:</span>
                          <p className="text-sm font-semibold">{profile.hr_name}</p>
                          {profile.hr_id && (
                            <p className="text-xs text-gray-500">ID: {profile.hr_id}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Status Bar */}
            <div className="mt-6 pt-6 border-t border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">System Online</span>
                  </div>
                  {user.last_login && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>User ID: {user.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
