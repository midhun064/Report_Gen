import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, User, Building, Package, Eye, CheckCircle, XCircle, AlertCircle, X, Calculator } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../context/FormContext';

interface PurchaseRequisitionFormData {
  request_id: string;
  form_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  manager: string;
  item_description: string;
  quantity: number;
  unit_cost: number;
  estimated_total: number;
  purpose_of_purchase: string;
  line_manager_approval: string;
  line_manager_rejected_reason?: string;
  finance_approval: string;
  finance_rejected_reason?: string;
  status: string;
  created_at: string;
}

const PurchaseRequisitionForm: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentForm } = useForm();
  const [isLoading, setIsLoading] = useState(true);
  const [existingRequests, setExistingRequests] = useState<PurchaseRequisitionFormData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    item_description: '',
    quantity: '',
    unit_cost: '',
    estimated_total: '',
    purpose_of_purchase: ''
  });

  useEffect(() => {
    if (user?.profile && 'employee_code' in user.profile) {
      loadExistingRequests();
    }
  }, [user]);

  const loadExistingRequests = async () => {
    if (!user?.profile || !('employee_code' in user.profile)) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/purchase-requisition/user-forms?employee_id=${user.profile.employee_code}`);
      if (response.ok) {
        const requests = await response.json();
        setExistingRequests(requests);
      }
    } catch (error) {
      console.error('Failed to load purchase requisitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate estimated total when quantity or unit cost changes
    if (name === 'quantity' || name === 'unit_cost') {
      const quantity = name === 'quantity' ? parseFloat(value) : parseFloat(formData.quantity);
      const unitCost = name === 'unit_cost' ? parseFloat(value) : parseFloat(formData.unit_cost);
      
      if (!isNaN(quantity) && !isNaN(unitCost)) {
        const total = quantity * unitCost;
        setFormData(prev => ({
          ...prev,
          estimated_total: total.toFixed(2)
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.profile || !('employee_code' in user.profile)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/purchase-requisition/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: user.profile.employee_code,
          employee_name: user.profile.first_name + ' ' + user.profile.last_name,
          department: (user.profile as any).department || 'Unknown',
          manager: user.profile.manager_name || 'Manager',
          item_description: formData.item_description,
          quantity: parseInt(formData.quantity),
          unit_cost: parseFloat(formData.unit_cost),
          estimated_total: parseFloat(formData.estimated_total),
          purpose_of_purchase: formData.purpose_of_purchase
        })
      });

      if (response.ok) {
        await response.json();
        alert('Purchase requisition submitted successfully!');
        setFormData({
          item_description: '',
          quantity: '',
          unit_cost: '',
          estimated_total: '',
          purpose_of_purchase: ''
        });
        setShowNewForm(false);
        loadExistingRequests();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to submit purchase requisition:', error);
      alert('Failed to submit purchase requisition. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          <div className="p-3 bg-blue-100 rounded-xl">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Purchase Requisition</h2>
            <p className="text-gray-600">Submit and manage your purchase requisition requests</p>
          </div>
        </div>
        <button
          onClick={() => setCurrentForm('none')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* New Form Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>{showNewForm ? 'Cancel New Request' : 'New Purchase Requisition'}</span>
        </button>
      </div>

      {/* New Form */}
      {showNewForm && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Purchase Requisition</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Description *
                </label>
                <textarea
                  name="item_description"
                  value={formData.item_description}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the item you want to purchase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Purchase *
                </label>
                <textarea
                  name="purpose_of_purchase"
                  value={formData.purpose_of_purchase}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Explain why this purchase is needed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost (IDR) *
                </label>
                <input
                  type="number"
                  name="unit_cost"
                  value={formData.unit_cost}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Total (IDR) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="estimated_total"
                    value={formData.estimated_total}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <Calculator className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Requests */}
      {existingRequests.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Requisitions Found</h3>
          <p className="text-gray-500">You haven't submitted any purchase requisition requests yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Purchase Requisitions ({existingRequests.length})
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>Viewing your requests</span>
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
                        Purchase Requisition
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
                      <p className="text-xs text-gray-500">Manager</p>
                      <p className="text-sm font-medium text-gray-900">{request.manager}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Item Description</p>
                      <p className="text-sm font-medium text-gray-900">{request.item_description}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Purpose of Purchase</p>
                      <p className="text-sm font-medium text-gray-900">{request.purpose_of_purchase}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-medium text-gray-900">{request.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Unit Cost</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(request.unit_cost)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(request.estimated_total)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Line Manager Approval</p>
                      <p>{request.line_manager_approval || 'Pending'}</p>
                      {request.line_manager_rejected_reason && (
                        <p className="text-red-600 mt-1">Reason: {request.line_manager_rejected_reason}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Finance Approval</p>
                      <p>{request.finance_approval || 'Pending'}</p>
                      {request.finance_rejected_reason && (
                        <p className="text-red-600 mt-1">Reason: {request.finance_rejected_reason}</p>
                      )}
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

export default PurchaseRequisitionForm;





