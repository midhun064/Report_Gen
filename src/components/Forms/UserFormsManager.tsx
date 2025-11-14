import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/api';
import { 
  Clock, 
  Users, 
  AlertTriangle,
  Calendar,
  LogOut,
  Plane,
  User,
  Receipt,
  Banknote,
  ShoppingCart,
  Heart,
  Car,
  Shield,
  Key,
  Bus,
  Building,
  Wrench,
  AlertCircle,
  FileText,
  Database,
  XCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
// Removed unused useForm import
import { userFormsService, FormSummary } from '../../services/userFormsService';

type Props = { 
  embedded?: boolean;
  selectedFormType?: string;
  selectedStatus?: string;
  onFormDataChange?: (formSummaries: FormSummary[]) => void;
};

const UserFormsManager: React.FC<Props> = ({ embedded = false, selectedFormType, selectedStatus, onFormDataChange }) => {
  const { user } = useAuth();
  const [formSummaries, setFormSummaries] = useState<FormSummary[]>([]);
  const [individualForms, setIndividualForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Forms');
  const [selectedDateRange, setSelectedDateRange] = useState('All Time');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFormSummary, setSelectedFormSummary] = useState<FormSummary | null>(null);
  const [selectedIndividualForm, setSelectedIndividualForm] = useState<any>(null);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [resolutionLoading, setResolutionLoading] = useState<string | null>(null);

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Calendar,
      LogOut,
      Plane,
      User,
      Receipt,
      Banknote,
      ShoppingCart,
      Heart,
      Car,
      Shield,
      Key,
      AlertTriangle,
      Users,
      Bus,
      Building,
      Wrench,
      AlertCircle,
    };
    return iconMap[iconName] || FileText;
  };

  // Load user forms data
  const loadUserForms = async () => {
    if (!user?.profile || !('employee_code' in user.profile)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const forms = await userFormsService.getUserForms(user.profile.employee_code, true); // Force refresh
      
      const summaries = userFormsService.getFormSummaries(forms);
      setFormSummaries(summaries);

      // Create individual form entries for separate display
      const individualFormsList: any[] = [];
      Object.entries(forms).forEach(([formType, formList]) => {
        if (formList && Array.isArray(formList)) {
          formList.forEach((form, index) => {
            const metadata = userFormsService.getFormMetadata(formType);
            individualFormsList.push({
              ...form,
              formType,
              title: metadata?.title || formType,
              icon: metadata?.icon || 'FileText',
              category: metadata?.category || 'Other',
              submissionNumber: index + 1,
              totalSubmissions: formList.length
            });
          });
        }
      });

      // Sort by creation date (most recent first)
      individualFormsList.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setIndividualForms(individualFormsList);

      // Notify parent component of form data changes
      if (onFormDataChange) {
        onFormDataChange(summaries);
      }

      // Removed rejectionReasons computation (unused)
    } catch (error) {
      console.error('Failed to load user forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserForms();
  }, [user]);

  // Handle opening form details modal for individual forms
  const handleViewIndividualForm = async (individualForm: any) => {
    setSelectedIndividualForm(individualForm);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setFormDetails(null);
    setLeaveBalance(null);

    try {
      // Set the form details to show just this individual form
      setFormDetails([individualForm]);
      
      // If it's a leave request, also fetch leave balance
      if (individualForm.formType === 'leave-request' && user?.id) {
        setBalanceLoading(true);
        try {
          const balanceResponse = await fetch(getApiUrl(`/api/forms/employee-leave-balance/${user.id}`));
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            setLeaveBalance(balanceData);
          } else {
            console.error('Failed to fetch leave balance:', balanceResponse.statusText);
          }
        } catch (balanceError) {
          console.error('Error fetching leave balance:', balanceError);
        } finally {
          setBalanceLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to load form details:', error);
      setFormDetails({ error: 'Failed to load form details' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle opening form details modal
  const handleViewDetails = async (summary: FormSummary) => {
    setSelectedFormSummary(summary);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setFormDetails(null);
    setLeaveBalance(null);

    try {
      // Load detailed form data for this specific form type
      if (user?.profile && 'employee_code' in user.profile) {
        const forms = await userFormsService.getUserForms(user.profile.employee_code, true); // Force refresh
        const formData = forms[summary.formType] || [];
        setFormDetails(formData);
        
        // If it's a leave request, also fetch leave balance
        if (summary.formType === 'leave-request' && user?.id) {
          setBalanceLoading(true);
          try {
            const balanceResponse = await fetch(getApiUrl(`/api/forms/employee-leave-balance/${user.id}`));
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json();
              setLeaveBalance(balanceData);
            } else {
              console.error('Failed to fetch leave balance:', balanceResponse.statusText);
            }
          } catch (balanceError) {
            console.error('Error fetching leave balance:', balanceError);
          } finally {
            setBalanceLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load form details:', error);
      setFormDetails({ error: 'Failed to load form details' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle employee resolution for IT tickets
  const handleEmployeeResolution = async (submission: any, resolution: 'Confirmed' | 'Rejected') => {
    if (!user?.profile || !('employee_code' in user.profile)) {
      alert('❌ User information not available');
      return;
    }

    // Set loading state for this specific submission
    setResolutionLoading(submission.request_id);

    let confirmationNotes = '';

    // No popup for either button - just use default messages
    if (resolution === 'Rejected') {
      confirmationNotes = 'Employee reported: Problem not solved';
    } else {
      confirmationNotes = 'Employee confirmed: Problem is solved';
    }

    try {
        const endpoint = resolution === 'Confirmed' 
          ? getApiUrl('/api/user-confirmation/confirm-problem-solved')
          : getApiUrl('/api/user-confirmation/reject-resolution');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: submission.request_id,
          employee_id: user.profile.employee_code,
          ...(resolution === 'Confirmed' 
            ? { confirmation_notes: confirmationNotes }
            : { rejection_reason: confirmationNotes }
          )
        })
      });

      if (response.ok) {
        if (resolution === 'Confirmed') {
          alert(`✅ Problem confirmed as solved!\n\nTicket: ${submission.it_helpdesk_ticket_number}\n\nIT Support can now close this ticket.`);
        } else {
          alert(`❌ Resolution rejected!\n\nTicket: ${submission.it_helpdesk_ticket_number}\n\nIT Support will continue working on this ticket.`);
        }
        
        // Update local state immediately to hide buttons
        if (formDetails && Array.isArray(formDetails)) {
          const updatedFormDetails = formDetails.map((form: any) => {
            if (form.request_id === submission.request_id) {
              return {
                ...form,
                employee_confirmation_status: resolution
              };
            }
            return form;
          });
          setFormDetails(updatedFormDetails);
        }
        
        // Also refresh the form summaries to update the main list
        try {
          if (user?.profile && 'employee_code' in user.profile) {
            const forms = await userFormsService.getUserForms(user.profile.employee_code, true); // Force refresh
            const summaries = userFormsService.getFormSummaries(forms);
            setFormSummaries(summaries);
            
            // Update form details if we have a selected form summary
            if (selectedFormSummary) {
              setFormDetails(forms[selectedFormSummary.formType] || []);
            }
          }
        } catch (error) {
          console.error('Failed to refresh form data:', error);
        }
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to ${resolution === 'Confirmed' ? 'confirm' : 'reject'} resolution:\n${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`Failed to ${resolution === 'Confirmed' ? 'confirm' : 'reject'} resolution:`, err);
      alert(`❌ Failed to ${resolution === 'Confirmed' ? 'confirm' : 'reject'} resolution. Please try again.`);
    } finally {
      // Clear loading state
      setResolutionLoading(null);
    }
  };

  // Helper function to map form status to filter categories for individual forms
  const getStatusCategoryForForm = (form: any): string => {
    const status = form.status?.toLowerCase() || 'pending';
    
    // Handle different status types - be more specific about what constitutes "Open"
    if (['approved', 'completed', 'closed', 'resolved'].includes(status)) {
      return 'Resolve';
    } else if (['updated'].includes(status)) {
      return 'Update';
    } else if (['in progress', 'assigned', 'processing'].includes(status)) {
      return 'In Progress';
    } else if (['rejected', 'cancelled'].includes(status)) {
      return 'Close';
    } else if (['open', 'new'].includes(status)) {
      return 'Open';
    } else if (['pending', 'submitted'].includes(status)) {
      return 'Pending'; // Keep pending as its own category
    } else {
      return 'Pending'; // Default to Pending for unknown statuses
    }
  };

  // Helper function to get current form data (either from selectedFormSummary or selectedIndividualForm)
  const getCurrentFormData = (): { icon: string; title: string; formType: string } | null => {
    if (selectedIndividualForm) {
      return {
        icon: selectedIndividualForm.icon || 'FileText',
        title: selectedIndividualForm.title || selectedIndividualForm.formType,
        formType: selectedIndividualForm.formType
      };
    } else if (selectedFormSummary) {
      return {
        icon: selectedFormSummary.icon || 'FileText',
        title: selectedFormSummary.title || getCurrentFormData()?.formType || 'Unknown Form',
        formType: getCurrentFormData()?.formType || 'unknown'
      };
    }
    return null;
  };

  // Helper function to check if form matches date range
  const matchesDateRange = (form: any): boolean => {
    if (selectedDateRange === 'All Time') return true;
    
    const formDate = new Date(form.created_at || 0);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedDateRange) {
      case 'Today':
        return formDate >= today;
      case 'This Week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return formDate >= weekAgo;
      case 'This Month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return formDate >= monthAgo;
      case 'Last 3 Months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return formDate >= threeMonthsAgo;
      case 'Last 6 Months':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return formDate >= sixMonthsAgo;
      case 'This Year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return formDate >= yearStart;
      default:
        return true;
    }
  };

  // Filter individual forms based on category, selectedFormType, selectedStatus, and date range
  const filteredIndividualForms = individualForms.filter(form => {
    const matchesCategory = selectedCategory === 'All Forms' || 
      form.category === selectedCategory;
    
    // If selectedFormType is provided from parent, use it for filtering
    const matchesFormType = !selectedFormType || selectedFormType === 'All' || 
      form.formType === selectedFormType;
    
    // If selectedStatus is provided from parent, use it for filtering
    const matchesStatus = !selectedStatus || selectedStatus === 'All' || 
      form.status === selectedStatus || getStatusCategoryForForm(form) === selectedStatus;
    
    // Check date range
    const matchesDate = matchesDateRange(form);
    
    return matchesCategory && matchesFormType && matchesStatus && matchesDate;
  });

  // Get unique categories
  const categories = ['All Forms', ...Array.from(new Set(formSummaries.map(s => s.category)))];

  // Removed unused getStatusIcon helper

  // Removed unused statusBadge mapping

  // Determine manager approval status across different form schemas
  const getManagerApproval = (formType: string, submission: any): { status: 'Approved' | 'Rejected' | 'Pending', reason?: string } => {
    // Common rejection reason field when present
    const rejectedReason = submission.line_manager_rejected_reason || submission.department_head_rejected_reason || submission.hr_rejected_reason || submission.finance_rejected_reason || submission.facilities_desk_rejected_reason || submission.facilities_manager_rejected_reason;

    switch (formType) {
      case 'leave-request':
      case 'travel-request':
      case 'meeting-room':
      case 'expense-reimbursement':
      case 'petty-cash':
      case 'maintenance-request':
      case 'event-participation':
      case 'mileage-claim':
      case 'medical-claim': {
        const lm = submission.line_manager_approval as string | null | undefined;
        if (lm === 'Approved') return { status: 'Approved' };
        if (lm === 'Rejected') return { status: 'Rejected', reason: rejectedReason };
        return { status: 'Pending' };
      }
      case 'facility-access': {
        const fd = submission.facilities_desk_approval as string | null | undefined;
        if (fd === 'Approved') return { status: 'Approved' };
        if (fd === 'Rejected') return { status: 'Rejected', reason: rejectedReason };
        return { status: 'Pending' };
      }
      case 'purchase-requisition': {
        const lm = submission.line_manager_approval as string | null | undefined;
        if (lm === 'Approved') return { status: 'Approved' };
        if (lm === 'Rejected') return { status: 'Rejected', reason: rejectedReason };
        return { status: 'Pending' };
      }
      case 'it-incident': {
        // IT incidents use status-based workflow, not approval workflow
        if (submission.status && typeof submission.status === 'string') {
          const status = submission.status.toLowerCase();
          if (status === 'resolved' || status === 'closed') return { status: 'Approved' };
          if (status === 'in progress') return { status: 'Pending' };
        }
        return { status: 'Pending' };
      }
      case 'exit-clearance': {
        const clear = submission.line_manager_clearance as boolean | null | undefined;
        if (clear === true) return { status: 'Approved' };
        if (clear === false && rejectedReason) return { status: 'Rejected', reason: rejectedReason };
        return { status: 'Pending' };
      }
      case 'info-update': {
        // Employee info updates - check HR approval status
        const hr = submission.hr_approval as string | null | undefined;
        if (hr === 'Approved') return { status: 'Approved' };
        if (hr === 'Rejected') return { status: 'Rejected', reason: submission.hr_rejected_reason };
        return { status: 'Pending' };
      }
      default:
        return { status: 'Pending' };
    }
  };


  // Extract a rejection reason from any *_rejected_reason field in the record
  const extractRejectionReason = (submission: any): string | undefined => {
    try {
      if (!submission || typeof submission !== 'object') return undefined;
      const keys = Object.keys(submission);
      for (const key of keys) {
        if (key.toLowerCase().endsWith('_rejected_reason')) {
          const val = submission[key];
          if (typeof val === 'string' && val.trim().length > 0) {
            return val.trim();
          }
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  };


  if (isLoading) {
    return (
      <div className={embedded ? "px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8"}>
        {!embedded && (
        <div className="mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Your Forms & Requests</h2>
            <div className="text-gray-600">
              <p className="inline">View and manage your submitted forms</p>
            </div>
          </div>
        </div>
        )}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your forms...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "px-0 py-0" : "max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8"}>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
          <h2 className="text-3xl font-bold text-gray-900">Your Forms & Requests</h2>
          <div className="text-gray-600">
            <p className="inline">View and manage your submitted forms</p>
          </div>
        </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="Last 3 Months">Last 3 Months</option>
                <option value="Last 6 Months">Last 6 Months</option>
                <option value="This Year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* Forms Table - Manager Dashboard Style */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">



        {/* Individual Forms Table */}
      {filteredIndividualForms.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Forms Found</h3>
          <p className="text-gray-500 mb-4">
            {individualForms.length === 0 
              ? "You haven't submitted any forms yet. Use the chatbot or contact your administrator to submit forms."
                : "No forms match your filter criteria. Try adjusting your filter."
            }
          </p>
        </div>
      ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Form</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Submission</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Category</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Date</th>
                <th className="px-3 sm:px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredIndividualForms.map((form, index) => (
                  <tr key={`${form.formType}-${form.id || index}`} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3">
                          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            {React.createElement(getIconComponent(form.icon), { className: "h-3 w-3 sm:h-4 sm:w-4 text-blue-600" })}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{form.title}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{form.formType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        form.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                        form.status === 'Updated' ? 'bg-green-50 text-green-700 border border-green-200' :
                        form.status === 'Closed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        form.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        form.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                        {form.status || 'Pending'}
                        </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">
                      #{form.submissionNumber} of {form.totalSubmissions}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700 hidden md:table-cell">{form.category}</td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                      {form.created_at ? new Date(form.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-right">
                      <button
                        onClick={() => handleViewIndividualForm(form)}
                        className="group inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 text-xs sm:text-sm"
                        title="View form details"
                      >
                        <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" /> 
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIndividualForms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-10 text-center text-gray-500">
                      <div className="inline-flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">No forms found for this filter.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Details Modal */}
      {showDetailsModal && (selectedFormSummary || selectedIndividualForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {React.createElement(getIconComponent(getCurrentFormData()?.icon || 'FileText'), { className: "h-5 w-5 text-blue-600" })}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getCurrentFormData()?.title || 'Form Details'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedIndividualForm ? 'Individual Form Details' : 'Form Details & Submissions'}
                  </p>
                </div>
              </div>
              
              {/* Leave Balance Box - Only for leave requests */}
              {getCurrentFormData()?.formType === 'leave-request' ? (
                <div className="flex items-center space-x-4">
                  {balanceLoading ? (
                    <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  ) : leaveBalance ? (
                    <div className="flex items-center space-x-4">
                      <div className="text-xs font-semibold text-gray-700">Leave Balance:</div>
                      <div className="flex space-x-3">
                        <div className="text-center">
                          <div className="bg-blue-100 border border-blue-300 rounded-lg px-2 py-1 w-20 h-16 flex flex-col justify-center">
                            <div className="font-bold text-blue-900 text-base">{Number((leaveBalance.annual_leave_total || 12) - (leaveBalance.annual_leave_used || 0)).toFixed(1)}</div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1 font-medium">Annual Left</div>
                        </div>
                        <div className="text-center">
                          <div className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 w-20 h-16 flex flex-col justify-center">
                            <div className="font-bold text-gray-900 text-base">{Number(leaveBalance.annual_leave_used || 0).toFixed(1)}</div>
                            <div className="text-xs text-gray-700 font-medium">days used</div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Annual Used</div>
                        </div>
                        <div className="text-center">
                          <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-2 py-1 w-20 h-16 flex flex-col justify-center">
                            <div className="font-bold text-yellow-900 text-base">{Number(leaveBalance.unpaid_leave_used || 0).toFixed(1)}</div>
                            <div className="text-xs text-yellow-700 font-medium">days used</div>
                          </div>
                          <div className="text-xs text-yellow-600 mt-1 font-medium">Unpaid</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500">N/A</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-lg"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-lg"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading form details...</span>
                </div>
              ) : formDetails?.error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">❌ Error</div>
                  <p className="text-gray-600">{formDetails.error}</p>
                </div>
              ) : formDetails && Array.isArray(formDetails) ? (
                <div className="space-y-3">
                  {/* Form Submissions - No Form Summary section */}
                    <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">Your Submissions</h4>
                    </div>
                    <div className="space-y-2.5">
                      {formDetails.map((submission: any, index: number) => (
                        <div key={index} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                              </div>
                              <h5 className="font-semibold text-gray-900">Submission #{index + 1}</h5>
                            </div>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                              {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                        {/* Employee Info Update - Custom Layout with 40/60 split */}
                        {getCurrentFormData()?.formType === 'info-update' ? (
                          <div className="mb-3">
                            <div className="flex flex-col lg:flex-row gap-3">
                              {/* Left: Approval Status - 40% */}
                              <div className="w-full lg:w-2/5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                                <div className="space-y-3">
                                  {/* Approval Flow - Only HR for Employee Info Updates */}
                                  <div className="flex items-center justify-center pb-2">
                                    {/* HR Approval Only */}
                                    <div className="flex flex-col items-center min-w-[120px] sm:min-w-[140px]">
                                      <div className={`w-full px-4 py-3 rounded-lg border-2 text-center transition-all ${
                                        submission.hr_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.hr_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          HR Approval
                                        </div>
                                        <div className={`text-sm font-bold ${
                                          submission.hr_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.hr_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.hr_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Rejection Reason */}
                                  {(() => {
                                    const reason = submission.line_manager_rejected_reason || submission.hr_rejected_reason;
                                    if (reason && String(reason).trim()) {
                                      return (
                                        <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                                          <span className="font-medium text-red-700">Rejection Reason:</span>
                                          <span className="ml-2 text-red-900">{String(reason)}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Next Stage */}
                                  <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center">
                                    <span className="font-medium text-blue-700">Next Stage:</span>
                                    <span className="ml-2 text-blue-900 font-semibold">
                                      {submission.line_manager_approval === 'Rejected' 
                                        ? 'Rejected - No Further Action'
                                        : submission.hr_approval === 'Approved'
                                        ? 'Completed'
                                        : submission.hr_approval === 'Rejected'
                                        ? 'Rejected - No Further Action'
                                        : submission.line_manager_approval === 'Approved'
                                        ? 'HR'
                                        : 'Line Manager'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right: Form Information - 60% */}
                              <div className="w-full lg:w-3/5 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Form Information</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Update Type:</span>
                                    <span className="text-gray-900 font-semibold">{submission.update_type || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">New Information:</span>
                                    <span className="text-gray-900 font-semibold">{submission.new_information || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      submission.status === 'Updated' 
                                        ? 'bg-green-100 text-green-800' 
                                        : submission.status === 'Pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {submission.status || 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : getCurrentFormData()?.formType === 'facility-access' ? (
                          <div className="mb-3">
                            <div className="flex flex-col lg:flex-row gap-3">
                              {/* Left: Approval Status - 40% */}
                              <div className="w-full lg:w-2/5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                                <div className="space-y-3">
                                  {/* Approval Flow - Horizontal Flow */}
                                  <div className="flex items-center overflow-x-auto pb-2">
                                    {/* Stage 1: Facilities Desk */}
                                    <div className="flex flex-col items-center min-w-[100px] sm:min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.facilities_desk_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.facilities_desk_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          Facilities Desk
                                        </div>
                                        <div className={`text-xs font-bold ${
                                          submission.facilities_desk_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.facilities_desk_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.facilities_desk_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Arrow */}
                                    <div className="flex items-center px-2">
                                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                      </svg>
                                    </div>
                                    
                                    {/* Stage 2: Facilities Manager */}
                                    <div className="flex flex-col items-center min-w-[100px] sm:min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.facilities_manager_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.facilities_manager_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          Facilities Manager
                                        </div>
                                        <div className={`text-xs font-bold ${
                                          submission.facilities_manager_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.facilities_manager_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.facilities_manager_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Rejection Reason */}
                                  {(() => {
                                    const reason = submission.facilities_desk_rejected_reason || submission.facilities_manager_rejected_reason;
                                    if (reason && String(reason).trim()) {
                                      return (
                                        <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                                          <span className="font-medium text-red-700">Rejection Reason:</span>
                                          <span className="ml-2 text-red-900">{String(reason)}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Next Stage */}
                                  <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center">
                                    <span className="font-medium text-blue-700">Next Stage:</span>
                                    <span className="ml-2 text-blue-900 font-semibold">
                                      {submission.facilities_desk_approval === 'Rejected' 
                                        ? 'Rejected - No Further Action'
                                        : submission.facilities_manager_approval === 'Approved'
                                        ? 'Completed'
                                        : submission.facilities_manager_approval === 'Rejected'
                                        ? 'Rejected - No Further Action'
                                        : submission.facilities_desk_approval === 'Approved'
                                        ? 'Facilities Manager'
                                        : 'Facilities Desk'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right: Form Details - 60% */}
                              <div className="w-full lg:w-3/5 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Facility Access Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Access Request Type:</span>
                                    <span className="text-gray-900 font-semibold">{submission.access_request_type || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Facilities Requested:</span>
                                    <span className="text-gray-900">{submission.facilities_requested || 'N/A'}</span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Justification:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100 max-h-32 overflow-y-auto">
                                      {submission.justification || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : getCurrentFormData()?.formType === 'password-reset' ? (
                          <div className="mb-3">
                            <div className="flex flex-col lg:flex-row gap-3">
                              {/* Left: Approval Status - 40% */}
                              <div className="w-full lg:w-2/5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                                <div className="space-y-3">
                                  {/* IT Helpdesk Status Only */}
                                  <div className="flex items-center justify-center">
                                    <div className="flex flex-col items-center min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.status === 'Completed' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.it_helpdesk_rejected_reason
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          IT Helpdesk
                                        </div>
                                        <div className="text-xs font-medium text-gray-800">
                                          {submission.status === 'Completed' ? 'Completed' : 
                                           submission.it_helpdesk_rejected_reason ? 'Rejected' : 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right: Form Details - 60% */}
                              <div className="w-full lg:w-3/5 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Password Reset Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">System:</span>
                                    <span className="text-gray-900">{submission.system_for_reset || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Reason:</span>
                                    <span className="text-gray-900">{submission.reset_reason || 'N/A'}</span>
                                  </div>
                                  {submission.new_password && (
                                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                      <span className="text-gray-600 font-medium">New Password:</span>
                                      <span className="text-gray-900 font-mono bg-green-50 px-2 py-1 rounded border border-green-200">
                                        {submission.new_password}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : getCurrentFormData()?.formType === 'purchase-requisition' ? (
                          <div className="mb-3">
                            <div className="flex flex-col lg:flex-row gap-3">
                              {/* Left: Approval Status - 40% */}
                              <div className="w-full lg:w-2/5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                                <div className="space-y-3">
                                  {/* Approval Flow - Horizontal Flow */}
                                  <div className="flex items-center overflow-x-auto pb-2">
                                    {/* Stage 1: Line Manager */}
                                    <div className="flex flex-col items-center min-w-[100px] sm:min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.line_manager_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.line_manager_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          Line Manager
                                        </div>
                                        <div className={`text-xs font-bold ${
                                          submission.line_manager_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.line_manager_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.line_manager_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Arrow */}
                                    <div className="flex items-center px-2">
                                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                      </svg>
                                    </div>
                                    
                                    {/* Stage 2: Finance */}
                                    <div className="flex flex-col items-center min-w-[100px] sm:min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.finance_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.finance_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          Finance
                                        </div>
                                        <div className={`text-xs font-bold ${
                                          submission.finance_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.finance_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.finance_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Rejection Reason */}
                                  {(() => {
                                    const reason = submission.line_manager_rejected_reason || submission.finance_rejected_reason;
                                    if (reason && String(reason).trim()) {
                                      return (
                                        <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                                          <span className="font-medium text-red-700">Rejection Reason:</span>
                                          <span className="ml-2 text-red-900">{String(reason)}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Next Stage */}
                                  <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center">
                                    <span className="font-medium text-blue-700">Next Stage:</span>
                                    <span className="ml-2 text-blue-900 font-semibold">
                                      {submission.line_manager_approval === 'Rejected' 
                                        ? 'Rejected - No Further Action'
                                        : submission.finance_approval === 'Approved'
                                        ? 'Completed'
                                        : submission.finance_approval === 'Rejected'
                                        ? 'Rejected - No Further Action'
                                        : submission.line_manager_approval === 'Approved'
                                        ? 'Finance'
                                        : 'Line Manager'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Right: Form Details - 60% */}
                              <div className="w-full lg:w-3/5 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Purchase Requisition Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Item Description:</span>
                                    <span className="text-gray-900 font-semibold">{submission.item_description || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Quantity:</span>
                                    <span className="text-gray-900">{submission.quantity || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Unit Cost:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.unit_cost ? Number(submission.unit_cost).toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Estimated Total:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.estimated_total ? Number(submission.estimated_total).toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Purpose of Purchase:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.purpose_of_purchase || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : getCurrentFormData()?.formType === 'meeting-room' ? (
                          <div className="mb-3">
                            <div className="flex gap-3">
                              {/* Left: Approval Status - 40% */}
                              <div className="w-2/5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                                <div className="space-y-3">
                                  {/* Approval Flow - Horizontal Flow */}
                                  <div className="flex items-center overflow-x-auto pb-2">
                                    {/* Stage 1: Facilities Desk */}
                                    <div className="flex flex-col items-center min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.facilities_desk_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.facilities_desk_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          Facilities Desk
                                        </div>
                                        <div className={`text-xs font-bold ${
                                          submission.facilities_desk_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.facilities_desk_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.facilities_desk_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Arrow */}
                                    <div className="flex items-center px-2">
                                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                      </svg>
                                    </div>
                                    
                                    {/* Stage 2: Facilities Manager */}
                                    <div className="flex flex-col items-center min-w-[120px]">
                                      <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                                        submission.facilities_manager_approval === 'Approved' 
                                          ? 'bg-green-50 border-green-400 shadow-sm' 
                                          : submission.facilities_manager_approval === 'Rejected'
                                          ? 'bg-red-50 border-red-400 shadow-sm'
                                          : 'bg-yellow-50 border-yellow-300'
                                      }`}>
                                        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                          Facilities Manager
                                        </div>
                                        <div className={`text-xs font-bold ${
                                          submission.facilities_manager_approval === 'Approved' 
                                            ? 'text-green-700' 
                                            : submission.facilities_manager_approval === 'Rejected'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                        }`}>
                                          {submission.facilities_manager_approval || 'Pending'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Rejection Reason */}
                                  {(() => {
                                    const reason = submission.facilities_desk_rejected_reason || submission.facilities_manager_rejected_reason;
                                    if (reason && String(reason).trim()) {
                                      return (
                                        <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                                          <span className="font-medium text-red-700">Rejection Reason:</span>
                                          <span className="ml-2 text-red-900">{String(reason)}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Next Stage */}
                                  <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center">
                                    <span className="font-medium text-blue-700">Next Stage:</span>
                                    <span className="ml-2 text-blue-900 font-semibold">
                                      {submission.facilities_desk_approval === 'Rejected' 
                                        ? 'Rejected - No Further Action'
                                        : submission.facilities_manager_approval === 'Approved'
                                        ? 'Completed'
                                        : submission.facilities_manager_approval === 'Rejected'
                                        ? 'Rejected - No Further Action'
                                        : submission.facilities_desk_approval === 'Approved'
                                        ? 'Facilities Manager'
                                        : 'Facilities Desk'
                                      }
                                    </span>
                                  </div>
                                  
                                  {/* Calendar Icon - Only show when approved */}
                                  {submission.facilities_manager_approval === 'Approved' && (
                                    <div className="mt-3">
                                      <button
                                        onClick={() => {
                                          // Create Google Calendar event
                                          const startDate = submission.booking_date;
                                          const startTime = submission.start_time;
                                          const endTime = submission.end_time;
                                          
                                          if (startDate && startTime && endTime) {
                                            try {
                                              // Parse the date and time properly
                                              // Assuming booking_date is in YYYY-MM-DD format and times are in HH:MM format
                                              const [year, month, day] = startDate.split('-');
                                              const [startHour, startMinute] = startTime.split(':');
                                              const [endHour, endMinute] = endTime.split(':');
                                              
                                              // Create Date objects with proper timezone handling
                                              const eventStart = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(startHour), parseInt(startMinute));
                                              const eventEnd = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(endHour), parseInt(endMinute));
                                              
                                              // Format for Google Calendar (YYYYMMDDTHHMMSSZ)
                                              const formatForGoogleCalendar = (date: Date) => {
                                                const year = date.getFullYear();
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const hours = String(date.getHours()).padStart(2, '0');
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                const seconds = String(date.getSeconds()).padStart(2, '0');
                                                return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
                                              };
                                              
                                              const startISO = formatForGoogleCalendar(eventStart);
                                              const endISO = formatForGoogleCalendar(eventEnd);
                                              
                                              const title = `Meeting Room Booking - ${submission.room_requested || 'Conference Room'}`;
                                              const details = `Meeting Room: ${submission.room_requested || 'N/A'}\nParticipants: ${submission.participants_count || 'N/A'}\nEmployee: ${submission.employee_name || 'N/A'}`;
                                              
                                              const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startISO}/${endISO}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(submission.room_requested || 'Conference Room')}`;
                                              
                                              window.open(googleCalendarUrl, '_blank');
                                            } catch (error) {
                                              console.error('Error formatting date/time for Google Calendar:', error);
                                              alert('Error formatting date/time. Please check the booking details.');
                                            }
                                          } else {
                                            alert('Unable to create calendar event: Missing date or time information');
                                          }
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                                        title="Add to Google Calendar"
                                      >
                                        <Calendar className="w-4 h-4" />
                                        Add to Calendar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Right: Booking Details - 60% */}
                              <div className="w-3/5 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Booking Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Room:</span>
                                    <span className="text-gray-900 font-semibold">{submission.room_requested || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Booking Date:</span>
                                    <span className="text-gray-900">{submission.booking_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Start Time:</span>
                                    <span className="text-gray-900">{submission.start_time || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">End Time:</span>
                                    <span className="text-gray-900">{submission.end_time || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Participants:</span>
                                    <span className="text-gray-900 font-semibold">{submission.participants_count || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Standard Layout for Other Forms */
                        <div className="mb-3">
                          <div className="grid grid-cols-5 gap-3">
                            {/* Left: Approval Status - 40% */}
                            <div className="col-span-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                            {(() => {
                              const manager = getManagerApproval(getCurrentFormData()?.formType || 'unknown', submission);

                              // Build dynamic approvals present in the submission
                              const rows: Array<{label: string, value: any}> = [];
                              
                              // Special handling for IT Incidents - streamlined workflow
                              if (getCurrentFormData()?.formType === 'it-incident') {
                                // Show assignment status
                                  const isAssigned = submission.it_helpdesk_assigned_to && String(submission.it_helpdesk_assigned_to).trim() !== '';
                                  rows.push({ 
                                    label: 'IT Support Assignment', 
                                    value: isAssigned ? 'Assigned' : 'Pending' 
                                  });
                                
                                // Show resolution status with cleaner mapping
                                  const statusMap: {[key: string]: string} = {
                                    'Open': 'Pending',
                                    'In Progress': 'In Progress',
                                    'Resolved': 'Resolved',
                                    'Closed': 'Closed'
                                  };
                                  rows.push({ 
                                    label: 'IT Support Resolution', 
                                    value: statusMap[submission.status] || submission.status 
                                  });
                              } else {
                                // Standard approval flow for other form types
                              // For meeting room, use new field names
                              if (getCurrentFormData()?.formType === 'meeting-room') {
                                if ('facilities_desk_approval' in submission) rows.push({ label: 'Facilities Desk', value: submission.facilities_desk_approval });
                                if ('facilities_manager_approval' in submission) rows.push({ label: 'Facilities Manager', value: submission.facilities_manager_approval });
                              } else {
                                // Standard approval flow for other form types
                              if ('line_manager_approval' in submission) rows.push({ label: 'Manager Decision', value: submission.line_manager_approval });
                              if ('department_head_approval' in submission) rows.push({ label: 'Department Head', value: submission.department_head_approval });
                              if ('finance_approval' in submission) rows.push({ label: 'Finance', value: submission.finance_approval });
                              if ('finance_verification' in submission) rows.push({ label: 'Finance Verification', value: submission.finance_verification });
                              if ('hr_approval' in submission) rows.push({ label: 'HR', value: submission.hr_approval });
                              if ('line_manager_acknowledgement' in submission) rows.push({ label: 'Manager Acknowledgement', value: submission.line_manager_acknowledgement });
                              if ('line_manager_clearance' in submission) rows.push({ label: 'Manager Clearance', value: submission.line_manager_clearance });
                              if ('it_clearance' in submission) rows.push({ label: 'IT Clearance', value: submission.it_clearance });
                              if ('finance_clearance' in submission) rows.push({ label: 'Finance Clearance', value: submission.finance_clearance });
                              if ('admin_clearance' in submission) rows.push({ label: 'Admin Clearance', value: submission.admin_clearance });
                              }
                              }

                              return (
                                <div className="space-y-3">
                                  {/* Approval Flow - Horizontal Flow */}
                                  <div className="flex items-center overflow-x-auto pb-2">
                                    {rows.map((r, idx) => {
                                    // Special rule: Manager Acknowledgement mapping (true=Approved, false=Rejected, null=Pending)
                                    let displayVal = r.value;
                                    if (r.label.toLowerCase().includes('acknowledgement')) {
                                      if (displayVal === true) displayVal = 'Approved';
                                      else if (displayVal === false) displayVal = 'Rejected';
                                      else displayVal = 'Pending';
                                    }
                                      
                                      // Determine status value
                                      let statusValue: string;
                                      if (typeof displayVal === 'string') {
                                        statusValue = displayVal;
                                      } else if (displayVal === true) {
                                        statusValue = 'Approved';
                                      } else if (displayVal === false) {
                                        const isExitClearance = getCurrentFormData()?.formType === 'exit-clearance';
                                        const isClearanceField = r.label.toLowerCase().includes('clearance');
                                        statusValue = isExitClearance && isClearanceField ? 'Pending' : 'Rejected';
                                      } else {
                                        statusValue = 'Pending';
                                      }
                                      
                                      const statusLower = (statusValue || '').toLowerCase();
                                      // For IT incidents, 'Resolved' and 'Closed' are success states, 'In Progress' is pending
                                      const isApproved = getCurrentFormData()?.formType === 'it-incident' 
                                        ? ['assigned', 'resolved', 'closed', 'completed'].includes(statusLower)
                                        : ['approved','cleared','resolved','closed','completed','complete','true','yes'].includes(statusLower);
                                      const isRejected = getCurrentFormData()?.formType === 'it-incident'
                                        ? false // IT incidents don't have rejection, just different statuses
                                        : ['rejected','false','no'].includes(statusLower);
                                      
                                    return (
                                        <React.Fragment key={r.label}>
                                          {/* Approval Stage Box */}
                                          <div className="flex flex-col items-center min-w-[120px]">
                                            <div className={`
                                              w-full px-3 py-2 rounded-lg border-2 text-center transition-all
                                              ${isApproved ? 'bg-green-50 border-green-400 shadow-sm' : 
                                                isRejected ? 'bg-red-50 border-red-400 shadow-sm' : 
                                                'bg-yellow-50 border-yellow-300'}
                                            `}>
                                              <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                                {r.label}
                                              </div>
                                              <div className={`
                                                text-xs font-bold
                                                ${isApproved ? 'text-green-700' : 
                                                  isRejected ? 'text-red-700' : 
                                                  'text-yellow-700'}
                                              `}>
                                                {statusValue}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Arrow between stages */}
                                          {idx < rows.length - 1 && (
                                            <div className="flex items-center px-2">
                                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                              </svg>
                                            </div>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Rejection Reason if any */}
                                  {(() => {
                                    const reason = manager.reason || extractRejectionReason(submission);
                                    if (reason && String(reason).trim()) {
                                      return (
                                        <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                                          <span className="font-medium text-red-700">Rejection Reason:</span>
                                          <span className="ml-2 text-red-900">{String(reason)}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  
                                  {/* IT Support Resolution Section for IT Incidents */}
                                  {getCurrentFormData()?.formType === 'it-incident' && submission.it_helpdesk_ticket_number && (
                                    <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
                                      <div className="flex items-center justify-between mb-3">
                                        <h6 className="text-base font-semibold text-blue-900">IT Support Resolution</h6>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs text-blue-600 font-medium">Ticket #</span>
                                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-bold">
                                            {submission.it_helpdesk_ticket_number}
                                          </span>
                                        </div>
                                  </div>
                                  
                                      {submission.it_resolution_date && (
                                        <div className="mb-3">
                                          <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-600">Resolved on:</span>
                                            <span className="text-xs font-medium text-gray-900">{submission.it_resolution_date}</span>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {submission.it_resolution_notes && (
                                        <div className="mb-3">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Notes</label>
                                          <div className="bg-white border border-gray-200 rounded-lg p-2">
                                            <p className="text-xs text-gray-900 leading-relaxed">
                                              {submission.it_resolution_notes}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Status Messages */}
                                      {submission.status === 'Open' && submission.employee_confirmation_status === 'Rejected' && (
                                        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                          <div className="flex items-center space-x-1">
                                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                            <span className="text-xs font-medium text-amber-800">Awaiting IT Support Update</span>
                                          </div>
                                          <p className="text-xs text-amber-700 mt-0.5">You reported the issue is not resolved. IT Support is working on an updated solution.</p>
                                        </div>
                                      )}
                                      
                                      {submission.employee_confirmation_status === 'Confirmed' && (
                                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                          <div className="flex items-center space-x-1">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                            <span className="text-xs font-medium text-green-800">Problem Resolved</span>
                                          </div>
                                          <p className="text-xs text-green-700 mt-0.5">You confirmed the issue is solved. Ticket is closed.</p>
                                        </div>
                                      )}
                                      
                                      {/* Action Buttons */}
                                      {submission.it_helpdesk_ticket_number && submission.it_resolution_notes && 
                                       submission.status === 'Resolved' && 
                                       (submission.employee_confirmation_status !== 'Confirmed' && submission.employee_confirmation_status !== 'Rejected') && (
                                        <div className="border-t border-blue-200 pt-3">
                                          <p className="text-xs text-gray-700 mb-3 text-center">
                                            Please confirm if your problem is solved:
                                          </p>
                                          <div className="flex space-x-2 justify-center">
                                            <button
                                              onClick={() => handleEmployeeResolution(submission, 'Confirmed')}
                                              disabled={resolutionLoading === submission.request_id}
                                              className={`inline-flex items-center px-3 py-1.5 text-white text-xs font-medium rounded transition-colors ${
                                                resolutionLoading === submission.request_id 
                                                  ? 'bg-gray-400 cursor-not-allowed' 
                                                  : 'bg-green-600 hover:bg-green-700'
                                              }`}
                                            >
                                              {resolutionLoading === submission.request_id ? (
                                                <div className="w-3 h-3 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                              ) : (
                                                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              )}
                                              {resolutionLoading === submission.request_id ? 'Processing...' : 'Confirm Resolution'}
                                            </button>
                                            <button
                                              onClick={() => handleEmployeeResolution(submission, 'Rejected')}
                                              disabled={resolutionLoading === submission.request_id}
                                              className={`inline-flex items-center px-3 py-1.5 text-white text-xs font-medium rounded transition-colors ${
                                                resolutionLoading === submission.request_id 
                                                  ? 'bg-gray-400 cursor-not-allowed' 
                                                  : 'bg-red-600 hover:bg-red-700'
                                              }`}
                                            >
                                              {resolutionLoading === submission.request_id ? (
                                                <div className="w-3 h-3 mr-1.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                              ) : (
                                                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              )}
                                              {resolutionLoading === submission.request_id ? 'Processing...' : 'Report Unresolved'}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            </div>
                            
                            {/* Right: Form Details (for leave-request) - 60% */}
                            {getCurrentFormData()?.formType === 'leave-request' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Leave Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium w-24">Leave Type:</span>
                                    <span className="text-gray-900 font-semibold">{submission.leave_type || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium w-24">Start Date:</span>
                                    <span className="text-gray-900">{submission.start_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium w-24">End Date:</span>
                                    <span className="text-gray-900">{submission.end_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium w-24">Total Days:</span>
                                    <span className="text-gray-900 font-semibold">{submission.total_days || 'N/A'}</span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Reason:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.reason || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* meeting-room details now handled in the special layout above */}

                            {/* Right: Form Details (for petty-cash) - 60% */}
                            {getCurrentFormData()?.formType === 'petty-cash' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Petty Cash Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Amount Requested:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.amount_requested ? Number(submission.amount_requested).toFixed(2) : 'N/A'}
                                    </span>
                          </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Expected Settlement:</span>
                                    <span className="text-gray-900">{submission.expected_settlement_date || 'N/A'}</span>
                        </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Cash Issued By:</span>
                                    <span className="text-gray-900">{submission.cash_issued_by || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Cash Issued Date:</span>
                                    <span className="text-gray-900">{submission.cash_issued_date || 'N/A'}</span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Purpose:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.purpose || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Right: Form Details (for expense-reimbursement) - 60% */}
                            {getCurrentFormData()?.formType === 'expense-reimbursement' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Expense Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Total Amount:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.total_amount ? Number(submission.total_amount).toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Expense Period:</span>
                                    <span className="text-gray-900">{submission.expense_period || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Bank Account:</span>
                                    <span className="text-gray-900">{submission.bank_account || 'N/A'}</span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Description:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.description || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Right: Form Details (for travel-request) - 60% */}
                            {getCurrentFormData()?.formType === 'travel-request' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Travel Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Destination:</span>
                                    <span className="text-gray-900 font-semibold">{submission.destination || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Start Date:</span>
                                    <span className="text-gray-900">{submission.departure_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">End Date:</span>
                                    <span className="text-gray-900">{submission.return_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Estimated Cost:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.total_estimated_cost ? Number(submission.total_estimated_cost).toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Purpose:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.travel_purpose || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Right: Form Details (for equipment-request) - 60% */}
                            {getCurrentFormData()?.formType === 'equipment-request' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Equipment Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Equipment Type:</span>
                                    <span className="text-gray-900 font-semibold">{submission.equipment_type || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Estimated Cost:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.estimated_cost ? Number(submission.estimated_cost).toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Priority:</span>
                                    <span className="text-gray-900">{submission.priority || 'N/A'}</span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Description:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.equipment_description || 'N/A'}
                                    </p>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Justification:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.justification || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Right: Form Details (for training-request) - 60% */}
                            {getCurrentFormData()?.formType === 'training-request' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">Training Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Training Type:</span>
                                    <span className="text-gray-900 font-semibold">{submission.training_type || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Start Date:</span>
                                    <span className="text-gray-900">{submission.start_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">End Date:</span>
                                    <span className="text-gray-900">{submission.end_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Estimated Cost:</span>
                                    <span className="text-gray-900 font-semibold">
                                      IDR {submission.estimated_cost ? Number(submission.estimated_cost).toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Description:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.training_description || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Right: Form Details (for it-access) - 60% */}
                            {getCurrentFormData()?.formType === 'it-access' && (
                              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                                <h6 className="font-semibold text-gray-900 mb-2">IT Access Details</h6>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Access Type:</span>
                                    <span className="text-gray-900 font-semibold">{submission.access_type || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Requested Systems:</span>
                                    <span className="text-gray-900">{submission.requested_systems || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-600 font-medium">Access Level:</span>
                                    <span className="text-gray-900">{submission.access_level || 'N/A'}</span>
                                  </div>
                                  <div className="py-1">
                                    <span className="text-gray-600 font-medium block mb-1">Business Justification:</span>
                                    <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                      {submission.business_justification || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Right: Form Details (for it-incident) - 60% */}
                            {getCurrentFormData()?.formType === 'it-incident' && (
                              <div className="col-span-3 bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                  <h6 className="text-lg font-semibold text-gray-900">IT Incident Details</h6>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">Date:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {submission.incident_date ? new Date(submission.incident_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-sm text-gray-600 font-medium">Affected System</span>
                                      <p className="text-sm text-gray-900 mt-1">{submission.affected_system || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-sm text-gray-600 font-medium">Status</span>
                                      <p className="text-sm text-gray-900 mt-1 capitalize">{submission.status || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mb-4">
                                  <span className="text-sm text-gray-600 font-medium block mb-2">Incident Description</span>
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 leading-relaxed">
                                      {submission.incident_description || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                        )}

                        {/* Hide form details for forms that have dedicated right-side panels */}
                        {!['leave-request', 'meeting-room', 'petty-cash', 'expense-reimbursement', 'travel-request', 'equipment-request', 'training-request', 'it-access', 'it-incident', 'info-update', 'facility-access', 'password-reset', 'purchase-requisition'].includes(getCurrentFormData()?.formType || 'unknown') && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          {(() => {
                            // Order important fields first for a professional layout
                            // Hide: id, form_id, employee_id, created_at, updated_at, employee_name, department, status, line_manager, request_id, manager
                            const hiddenKeys = new Set(['id', 'form_id', 'employee_id', 'created_at', 'updated_at', 'employee_name', 'department', 'status', 'line_manager', 'request_id', 'manager']);
                            const entries = Object.entries(submission).filter(([key]) => !hiddenKeys.has(key));
                            let priority: string[];
                            if (getCurrentFormData()?.formType === 'exit-clearance') {
                              priority = ['last_working_day','line_manager_clearance','it_clearance','finance_clearance','admin_clearance'];
                            } else {
                              priority = [];
                            }
                            // Exclude noisy or redundant fields (shown elsewhere)
                            const redundantPatterns = [
                              /_signature$/i,
                              /_signature_date$/i,
                              /^employee_signature$/i,
                              /^employee_signature_date$/i,
                              /(approval|acknowledgement|confirmation|clearance)$/i
                            ];
                            const valueIsRenderable = (value: any) => {
                              if (typeof value === 'boolean' || typeof value === 'number') return true;
                              if (value === null || value === undefined) return false;
                              if (typeof value === 'string') return value.trim() !== '';
                              return true;
                            };
                            const notRedundant = ([key, _]: [string, any]) => !redundantPatterns.some(re => re.test(key));
                            
                            // Sort priority items according to priority array order
                            const priorityItems = entries
                              .filter(([key]) => priority.includes(key))
                              .filter(notRedundant)
                              .sort((a, b) => priority.indexOf(a[0]) - priority.indexOf(b[0]));
                            
                            const otherItems = entries
                              .filter(([key]) => !priority.includes(key))
                              .filter(notRedundant)
                              .sort((a, b) => a[0].localeCompare(b[0]));
                            
                            const prioritized = [...priorityItems, ...otherItems].filter(([_, v]) => valueIsRenderable(v));
                            
                            // Render in strict 3x3 grid order without spanning
                            const rendered: JSX.Element[] = [];
                            for (const [key, value] of prioritized) {
                              const label = key === 'start_date'
                                ? 'Start Date'
                                : key === 'end_date'
                                  ? 'End Date'
                                  : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                              rendered.push(
                                <div key={key} className="flex items-center bg-white rounded-md px-2 py-1 border border-gray-100">
                                  <span className="font-medium text-gray-600 text-[11px] uppercase tracking-wide w-32">
                                    {label}
                                  </span>
                                  <span className="text-gray-900 font-medium text-sm ml-2 truncate">
                                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                                     typeof value === 'object' ? JSON.stringify(value) :
                                     String(value)}
                                  </span>
                                </div>
                              );
                            }
                            return rendered;
                          })()}
                        </div>
                        )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Submission Data</h4>
                  <p className="text-gray-500 max-w-md mx-auto">
                    This form type doesn't have detailed submission data available for viewing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFormsManager;
