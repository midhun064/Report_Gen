import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Users, 
  UserCheck, 
  FileText, 
  Calendar,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../context/FormContext';
import { getUserDisplayName } from '../../types/auth';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentForm } = useForm();
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    contact: true,
    work: true,
    reporting: true,
    forms: false
  });

  if (!user) return null;

  const profile = user.profile;
  const department = user.department;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader = ({ 
    icon: Icon, 
    title, 
    section, 
    children 
  }: { 
    icon: any, 
    title: string, 
    section: string, 
    children: React.ReactNode 
  }) => (
    <div className="mb-4">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        {expandedSections[section] ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {expandedSections[section] && (
        <div className="mt-2 p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-gray-200/30">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-80 bg-white/70 backdrop-blur-sm border-r border-gray-200/50 shadow-xl h-full overflow-y-auto">
      {/* User Profile Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              {getUserDisplayName(user)}
            </h2>
            <p className="text-sm text-gray-600">{user.role}</p>
            {profile && 'employee_code' in profile && (
              <p className="text-xs text-gray-500 mt-1">ID: {profile.employee_code}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="p-4 space-y-2">
        {/* Contact Information */}
        <SectionHeader icon={Mail} title="Contact Information" section="contact">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">{user.email}</span>
            </div>
            {profile && 'contact_number' in profile && profile.contact_number && (
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{profile.contact_number}</span>
              </div>
            )}
          </div>
        </SectionHeader>

        {/* Work Information */}
        <SectionHeader icon={Building} title="Work Information" section="work">
          <div className="space-y-3">
            {profile && 'position' in profile && profile.position && (
              <div className="flex items-center space-x-3 text-sm">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{profile.position}</span>
              </div>
            )}
            {department && (
              <div className="flex items-center space-x-3 text-sm">
                <Building className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{department.department_name}</span>
              </div>
            )}
            {profile && 'join_date' in profile && profile.join_date && (
              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">Joined {new Date(profile.join_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </SectionHeader>

        {/* Reporting Structure */}
        <SectionHeader icon={Users} title="Reporting Structure" section="reporting">
          <div className="space-y-3">
            {profile && 'manager_name' in profile && profile.manager_name && (
              <div className="flex items-start space-x-3 text-sm">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-600 font-medium">Manager:</span>
                  <p className="text-gray-700 font-semibold">{profile.manager_name}</p>
                  {profile.manager_id && (
                    <p className="text-xs text-gray-500">ID: {profile.manager_id}</p>
                  )}
                </div>
              </div>
            )}
            {profile && 'hr_name' in profile && profile.hr_name && (
              <div className="flex items-start space-x-3 text-sm">
                <UserCheck className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-600 font-medium">HR Contact:</span>
                  <p className="text-gray-700 font-semibold">{profile.hr_name}</p>
                  {profile.hr_id && (
                    <p className="text-xs text-gray-500">ID: {profile.hr_id}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionHeader>

        {/* Forms Section */}
        <SectionHeader icon={FileText} title="Forms & Requests" section="forms">
          <div className="space-y-2">
            <button 
              onClick={() => setCurrentForm('none')}
              className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-all duration-200 text-left border border-blue-200/50"
            >
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <span className="text-sm font-semibold text-blue-800">Your Forms</span>
                <p className="text-xs text-blue-600">View your submitted forms</p>
              </div>
            </button>
          </div>
        </SectionHeader>
      </div>

      {/* Status Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600 font-medium">System Online</span>
        </div>
        {user.last_login && (
          <p className="text-xs text-gray-500 mt-1">
            Last login: {new Date(user.last_login).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
