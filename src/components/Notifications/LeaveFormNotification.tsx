import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle, User, Shield } from 'lucide-react';

interface LeaveFormNotification {
  id: string;
  form_type: string;
  form_id: string;
  approval_field: string;
  old_value: string;
  new_value: string;
  title: string;
  change_type: string;
  timestamp: string;
}

interface LeaveFormNotificationProps {
  notifications: LeaveFormNotification[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
}

const LeaveFormNotification: React.FC<LeaveFormNotificationProps> = ({
  notifications,
  onClose,
  onMarkRead
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      console.log('🔔 Notifications received:', notifications);
      console.log('🔑 Notification IDs:', notifications.map(n => n.id));
      setIsVisible(true);
    }
  }, [notifications]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  const getApprovalIcon = (approvalField: string) => {
    switch (approvalField) {
      case 'line_manager_approval':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'hr_approval':
        return <Shield className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (changeType: string) => {
    switch (changeType) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (changeType: string) => {
    switch (changeType) {
      case 'approved':
        return 'border-green-200 bg-green-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getApprovalFieldName = (approvalField: string) => {
    switch (approvalField) {
      case 'line_manager_approval':
        return 'Manager Approval';
      case 'hr_approval':
        return 'HR Approval';
      default:
        return approvalField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Leave Request Updates
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification, index) => (
            <div
              key={notification.id || `${notification.form_type}-${notification.form_id}-${notification.approval_field}-${index}`}
              className={`p-4 border-l-4 ${getStatusColor(notification.change_type)} ${
                index !== notifications.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex items-center space-x-2">
                  {getApprovalIcon(notification.approval_field)}
                  {getStatusIcon(notification.change_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {notification.title}
                    </h4>
                    <button
                      onClick={() => onMarkRead(notification.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                    >
                      Mark as read
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium text-gray-900">
                      {getApprovalFieldName(notification.approval_field)}
                    </span>{' '}
                    changed from{' '}
                    <span className="font-medium text-gray-900">
                      {notification.old_value}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium text-gray-900">
                      {notification.new_value}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {notifications.length} leave request update{notifications.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveFormNotification;
