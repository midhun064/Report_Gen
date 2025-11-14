import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName } from '../../types/auth';

interface UserInfoSummaryProps {
  showDetails?: boolean;
  className?: string;
}

const UserInfoSummary: React.FC<UserInfoSummaryProps> = ({ 
  showDetails = false, 
  className = "" 
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const profile = user.profile;
  const department = user.department;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {getUserDisplayName(user).split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {getUserDisplayName(user)}
          </h3>
          <p className="text-sm text-gray-600">{user.role}</p>
          {showDetails && (
            <div className="mt-1 space-y-1">
              {profile && 'position' in profile && profile.position && (
                <p className="text-xs text-gray-500">{profile.position}</p>
              )}
              {department && (
                <p className="text-xs text-gray-500">{department.department_name}</p>
              )}
              {profile && 'employee_code' in profile && (
                <p className="text-xs text-gray-500">ID: {profile.employee_code}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserInfoSummary;


