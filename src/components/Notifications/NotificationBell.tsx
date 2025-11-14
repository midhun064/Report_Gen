import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FormStateNotification } from '../../services/formStateService';

const NotificationBell: React.FC = () => {
  const { formNotifications, markNotificationAsRead } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const unreadCount = formNotifications.length;

  const handleNotificationClick = async (notification: FormStateNotification) => {
    await markNotificationAsRead(notification.id);
  };

  const getApprovalFieldName = (approvalField: string) => {
    switch (approvalField) {
      case 'line_manager_approval':
        return 'Manager Approval';
      case 'hr_approval':
        return 'HR Approval';
      case 'facilities_desk_approval':
        return 'Facilities Desk Approval';
      case 'facilities_manager_approval':
        return 'Facilities Manager Approval';
      default:
        return approvalField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (changeType: string) => {
    switch (changeType) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'pending':
        return 'text-blue-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
            <button
              onClick={() => setIsDropdownOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {formNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              formNotifications.map((notification, index) => (
                <div
                  key={notification.id || `${notification.form_type}-${notification.form_id}-${notification.approval_field}-${index}`}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">
                          {getApprovalFieldName(notification.approval_field)}
                        </span>{' '}
                        changed from{' '}
                        <span className="font-medium">
                          {notification.old_value}
                        </span>{' '}
                        to{' '}
                        <span className={`font-medium ${getStatusColor(notification.change_type)}`}>
                          {notification.new_value}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {formNotifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                Click on a notification to mark it as read
              </p>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
