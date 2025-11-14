import React, { useState, useEffect } from 'react';
import { Calendar, FileText, User, Building, Clock, Eye, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../context/FormContext';
import { formService, LeaveRequestForm as LeaveRequestFormType } from '../../services/formService';

const LeaveRequestForm: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentForm } = useForm();
  const [isLoading, setIsLoading] = useState(true);
  const [existingRequests, setExistingRequests] = useState<LeaveRequestFormType[]>([]);

  // Format dates to remove time/GMT and present a friendly date string
  const formatDate = (value?: string | null) => {
    if (!value) return 'No date';
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
      // Fallback: strip trailing time and GMT if present
      return String(value).replace(/\s\d{2}:\d{2}:\d{2}\s*GMT?$/i, '');
    } catch {
      return String(value).replace(/\s\d{2}:\d{2}:\d{2}\s*GMT?$/i, '');
    }
  };

  useEffect(() => {
    if (user?.profile && 'employee_code' in user.profile) {
      loadExistingRequests();
    }
  }, [user]);

  const loadExistingRequests = async () => {
    if (!user?.profile || !('employee_code' in user.profile)) return;
    
    try {
      setIsLoading(true);
      const requests = await formService.getLeaveRequests(user.profile.employee_code);
      setExistingRequests(requests);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'Pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leave Request Data</h2>
            <p className="text-gray-600">Your leave request history from database</p>
          </div>
        </div>
        <button
          onClick={() => setCurrentForm('none')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {existingRequests.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Requests Found</h3>
          <p className="text-gray-500">No leave request data found for your employee ID in the database.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Found {existingRequests.length} Leave Request(s)
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>Viewing database records</span>
            </div>
          </div>

          <div className="grid gap-6">
            {existingRequests.map((request) => (
              <div key={request.request_id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {request.leave_type} Leave Request
                      </h4>
                      <p className="text-sm text-gray-500">Request ID: {request.request_id}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Employee</p>
                      <p className="text-sm font-medium text-gray-900">{request.employee_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="text-sm font-medium text-gray-900">{request.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Line Manager</p>
                      <p className="text-sm font-medium text-gray-900">{request.line_manager}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(request.start_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(request.end_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Total Days</p>
                      <p className="text-sm font-medium text-gray-900">{request.total_days} days</p>
                    </div>
                  </div>
                </div>

                {request.reason && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Reason</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{request.reason}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Employee Signature</p>
                      <p>{request.employee_signature || 'Not signed'}</p>
                      <p>{formatDate(request.employee_signature_date)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Line Manager Approval</p>
                      <p>{request.line_manager_approval || 'Pending'}</p>
                      <p>{formatDate(request.line_manager_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestForm;