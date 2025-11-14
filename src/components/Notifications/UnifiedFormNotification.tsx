import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle, User, Shield, Building, Calendar, ShoppingCart, Plane, DollarSign, Key, Monitor, Lock, FileText } from 'lucide-react';
import { FormStateNotification } from '../../services/formStateService';

interface UnifiedFormNotificationProps {
  notifications: FormStateNotification[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
}

const UnifiedFormNotification: React.FC<UnifiedFormNotificationProps> = ({
  notifications,
  onClose,
  onMarkRead
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      console.log('🔔 Unified notifications received:', notifications);
      setIsVisible(true);
    }
  }, [notifications]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getFormIcon = (formType: string) => {
    switch (formType) {
      case 'leave-request':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'meeting-room':
        return <Building className="w-4 h-4 text-purple-500" />;
      case 'facility-access':
        return <Key className="w-4 h-4 text-indigo-500" />;
      case 'purchase-requisition':
        return <ShoppingCart className="w-4 h-4 text-orange-500" />;
      case 'travel-request':
        return <Plane className="w-4 h-4 text-cyan-500" />;
      case 'petty-cash':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'it-incident':
        return <Monitor className="w-4 h-4 text-red-500" />;
      case 'password-reset':
        return <Lock className="w-4 h-4 text-yellow-500" />;
      case 'info-update':
        return <FileText className="w-4 h-4 text-teal-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getApprovalIcon = (approvalField: string) => {
    switch (approvalField) {
      case 'line_manager_approval':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'hr_approval':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'finance_approval':
        return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'facilities_desk_approval':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'facilities_manager_approval':
        return <Building className="w-4 h-4 text-indigo-500" />;
      case 'status':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'line_manager_acknowledgement':
        return <User className="w-4 h-4 text-blue-500" />;
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
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-orange-500" />;
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
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in_progress':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  const getApprovalFieldName = (approvalField: string) => {
    switch (approvalField) {
      case 'line_manager_approval':
        return 'Line Manager Approval';
      case 'hr_approval':
        return 'HR Approval';
      case 'finance_approval':
        return 'Finance Approval';
      case 'facilities_desk_approval':
        return 'Facilities Desk Approval';
      case 'facilities_manager_approval':
        return 'Facilities Manager Approval';
      case 'status':
        return 'Status';
      case 'line_manager_acknowledgement':
        return 'Manager Acknowledgement';
      default:
        return approvalField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getFormTypeName = (formType: string) => {
    switch (formType) {
      case 'leave-request':
        return 'Leave Request';
      case 'meeting-room':
        return 'Meeting Room Booking';
      case 'facility-access':
        return 'Facility Access Request';
      case 'purchase-requisition':
        return 'Purchase Requisition';
      case 'travel-request':
        return 'Travel Request';
      case 'petty-cash':
        return 'Petty Cash Request';
      case 'it-incident':
        return 'IT Incident';
      case 'password-reset':
        return 'Password Reset';
      case 'info-update':
        return 'Info Update';
      default:
        return formType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  // Group notifications by form type for better organization
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const formType = notification.form_type;
    if (!acc[formType]) {
      acc[formType] = [];
    }
    acc[formType].push(notification);
    return acc;
  }, {} as Record<string, FormStateNotification[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Form Approval Updates
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
          {Object.entries(groupedNotifications).map(([formType, formNotifications]) => (
            <div key={formType} className="border-b last:border-b-0">
              {/* Form Type Header */}
              <div className="px-4 py-2 bg-gray-50 border-b">
                <div className="flex items-center space-x-2">
                  {getFormIcon(formType)}
                  <h4 className="text-sm font-medium text-gray-700">
                    {getFormTypeName(formType)} Updates
                  </h4>
                </div>
              </div>
              
              {/* Form Notifications */}
              {formNotifications.map((notification, index) => (
                <div
                  key={notification.id || `${notification.form_type}-${notification.form_id}-${notification.approval_field}-${index}`}
                  className={`p-4 border-l-4 ${getStatusColor(notification.change_type)} ${
                    index !== formNotifications.length - 1 ? 'border-b' : ''
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
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {notifications.length} approval update{notifications.length !== 1 ? 's' : ''}
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

export default UnifiedFormNotification;


