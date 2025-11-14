import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, User, Building, Receipt, Eye, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../context/FormContext';
import { formService, ExpenseReimbursementForm as ExpenseReimbursementFormType } from '../../services/formService';

const ExpenseReimbursementForm: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentForm } = useForm();
  const [isLoading, setIsLoading] = useState(true);
  const [existingRequests, setExistingRequests] = useState<ExpenseReimbursementFormType[]>([]);

  useEffect(() => {
    if (user?.profile && 'employee_code' in user.profile) {
      loadExistingRequests();
    }
  }, [user]);

  const loadExistingRequests = async () => {
    if (!user?.profile || !('employee_code' in user.profile)) return;
    
    try {
      setIsLoading(true);
      const requests = await formService.getExpenseReimbursements(user.profile.employee_code);
      setExistingRequests(requests);
    } catch (error) {
      console.error('Failed to load expense reimbursements:', error);
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

  const formatCurrency = (amount: number) => {
    return `IDR ${Number(amount).toFixed(2)}`;
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
          <div className="p-3 bg-green-100 rounded-xl">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Reimbursement Data</h2>
            <p className="text-gray-600">Your expense reimbursement history from database</p>
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
          <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Expense Reimbursements Found</h3>
          <p className="text-gray-500">No expense reimbursement data found for your employee ID in the database.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Found {existingRequests.length} Expense Reimbursement(s)
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>Viewing database records</span>
            </div>
          </div>

          <div className="grid gap-6">
            {existingRequests.map((request) => (
              <div key={request.expense_id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        Expense Reimbursement Request
                      </h4>
                      <p className="text-sm text-gray-500">Expense ID: {request.expense_id}</p>
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
                      <p className="text-xs text-gray-500">Manager</p>
                      <p className="text-sm font-medium text-gray-900">{request.manager}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(request.total_amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Employee Signature</p>
                      <p>{request.employee_signature || 'Not signed'}</p>
                      <p>{request.employee_signature_date || 'No date'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Line Manager Approval</p>
                      <p>{request.line_manager_approval || 'Pending'}</p>
                      <p>{request.line_manager_date || 'No date'}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Finance Verification</p>
                      <p>{request.finance_verification || 'Pending'}</p>
                      <p>{request.finance_date || 'No date'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Reimbursement Processed</p>
                      <p>{request.reimbursement_processed_by || 'Not processed'}</p>
                      <p>{request.reimbursement_date || 'No date'}</p>
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

export default ExpenseReimbursementForm;