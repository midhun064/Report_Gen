import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, XCircle, Clock, Filter, BarChart3, RefreshCw, Eye, Phone } from 'lucide-react';
import ChatbotPanel, { ChatbotHandle } from '../Chatbot/ChatbotPanel';
import { useAvatarState } from '../../hooks/useAvatarState';
import RejectionReasonModal from '../Modal/RejectionReasonModal';
import { getApiUrl } from '../../config/api';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

const statusBadge: Record<string, string> = {
  Pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Approved: 'bg-green-50 text-green-700 border border-green-200',
  Rejected: 'bg-red-50 text-red-700 border border-red-200',
};

interface HRQueueItem {
  request_id: string;
  form_type: string;
  employee_name: string;
  department: string;
  created_at: string;
  hr_approval?: string;
  hr_signature?: string;
  hr_date?: string;
}

interface HRLoginResponse {
  success: boolean;
  forms: HRQueueItem[];
  summary: {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    forms_by_type: Record<string, number>;
  };
}

const HRDashboard: React.FC = () => {
  const { user, sessionId } = useAuth();
  const { updateAvatar, getGifUrl } = useAvatarState();
  // Get HR ID from profile - for HR staff, use hr_id from profile
  const hrId = user?.profile && 'hr_id' in user.profile ? user.profile.hr_id : user?.id;
  const [isListening, setIsListening] = React.useState(false);
  const [items, setItems] = useState<HRQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('Pending');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('All');
  const [selectedForm, setSelectedForm] = useState<HRQueueItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<HRQueueItem | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [summary, setSummary] = useState<HRLoginResponse['summary']>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    forms_by_type: {}
  });
  const [webhookTriggered, setWebhookTriggered] = useState(false);
  const chatbotRef = React.useRef<ChatbotHandle | null>(null);

  // Automatically trigger HR login when HR dashboard loads
  useEffect(() => {
    const loadHRData = async () => {
      if (!hrId || !user || webhookTriggered) return;
      
      setLoading(true);
      setError(null);
      setWebhookTriggered(true);
      
      try {
        console.log('📊 HR dashboard loaded - fetching data...');
        console.log('🔍 HR Dashboard Debug - User:', user);
        console.log('🔍 HR Dashboard Debug - HR ID being used:', hrId);
        
        // Fetch HR queue data
        const response = await fetch(getApiUrl(`/api/hr/queue?hr_id=${hrId}`));
        
        if (response.ok) {
          const forms = await response.json();
          console.log('🔍 HR Dashboard Debug - Forms received:', forms);
          setItems(forms);
          
          // Calculate summary
          const summary = {
            total_pending: forms.filter((f: HRQueueItem) => !f.hr_approval || f.hr_approval === 'Pending').length,
            total_approved: forms.filter((f: HRQueueItem) => f.hr_approval === 'Approved').length,
            total_rejected: forms.filter((f: HRQueueItem) => f.hr_approval === 'Rejected').length,
            forms_by_type: forms.reduce((acc: Record<string, number>, form: HRQueueItem) => {
              acc[form.form_type] = (acc[form.form_type] || 0) + 1;
              return acc;
            }, {})
          };
          setSummary(summary);
          
          console.log(`✅ Successfully loaded ${forms.length} forms for HR approval`);
          console.log('🔍 HR Dashboard Debug - Summary:', summary);
        } else {
          const errorText = await response.text();
          console.error('❌ HR Dashboard Error:', response.status, errorText);
          setError('Failed to load forms from HR service');
        }
      } catch (err) {
        console.error('HR login data load failed:', err);
        setError('Failed to load HR data');
      } finally {
        setLoading(false);
      }
    };
    loadHRData();
  }, [hrId, user, webhookTriggered, sessionId]);

  // Helper function to get HR approval status for display
  const getHRApprovalStatus = (item: HRQueueItem): string => {
    // Use hr_approval field if available, otherwise show 'Pending'
    if (item.hr_approval && item.hr_approval !== 'Pending') {
      return item.hr_approval; // 'Approved' or 'Rejected'
    }
    return 'Pending'; // No HR approval yet or explicitly Pending
  };

  // Helper function to determine if approve/reject buttons should be shown
  const shouldShowApprovalButtons = (item: HRQueueItem): boolean => {
    // Show buttons only if HR hasn't approved/rejected yet
    return !item.hr_approval || item.hr_approval === 'Pending';
  };

  const filtered = useMemo(() => {
    let filteredItems = items;
    
    // Filter by form type first
    if (formTypeFilter !== 'All') {
      filteredItems = filteredItems.filter((i) => i.form_type === formTypeFilter);
    }
    
    // Then filter by status
    if (filter !== 'All') {
      filteredItems = filteredItems.filter((i) => getHRApprovalStatus(i) === filter);
    }
    
    return filteredItems;
  }, [items, filter, formTypeFilter]);

  // Count helper that respects current status filter
  const countByType = (type: string) => {
    return items.filter(i => (
      (type === 'All' ? true : i.form_type === type) &&
      (filter === 'All' ? true : getHRApprovalStatus(i) === filter)
    )).length;
  };

  // Handle refresh - reload data from database
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Refreshing HR dashboard data...');
      
      const response = await fetch(getApiUrl(`/api/hr/queue?hr_id=${hrId}`));
      
      if (response.ok) {
        const forms = await response.json();
        setItems(forms);
        
        // Calculate summary
        const summary = {
          total_pending: forms.filter((f: HRQueueItem) => !f.hr_approval || f.hr_approval === 'Pending').length,
          total_approved: forms.filter((f: HRQueueItem) => f.hr_approval === 'Approved').length,
          total_rejected: forms.filter((f: HRQueueItem) => f.hr_approval === 'Rejected').length,
          forms_by_type: forms.reduce((acc: Record<string, number>, form: HRQueueItem) => {
            acc[form.form_type] = (acc[form.form_type] || 0) + 1;
            return acc;
          }, {})
        };
        setSummary(summary);
        
        console.log(`✅ Successfully refreshed ${forms.length} forms`);
      } else {
        setError('Failed to refresh forms from HR service');
      }
    } catch (e) {
      console.error('❌ Refresh failed:', e);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (item: HRQueueItem) => {
    setSelectedForm(item);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setFormDetails(null);
    setLeaveBalance(null);
    
    try {
      // Fetch complete form details from backend
      const response = await fetch(getApiUrl(`/api/hr/form-details?form_id=${item.request_id}&form_type=${item.form_type}`));
      if (response.ok) {
        const details = await response.json();
        setFormDetails(details);
        
        // If it's a leave request, also fetch leave balance
        if (item.form_type === 'leave-request' && details.employee_id) {
          setBalanceLoading(true);
          try {
            const balanceResponse = await fetch(getApiUrl(`/api/hr/employee-leave-balance/${details.employee_id}`));
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
      } else {
        console.error('Failed to fetch form details:', response.statusText);
        setFormDetails({ error: 'Failed to load form details' });
      }
    } catch (error) {
      console.error('Error fetching form details:', error);
      setFormDetails({ error: 'Error loading form details' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle approve/reject actions
  const handleApproval = async (item: HRQueueItem, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
      try {
        console.log(`${status === 'Approved' ? '✅' : '❌'} ${status} request ${item.request_id} via HR...`);
        
        // Get HR name for signature
        const hrName = user?.profile?.first_name && user?.profile?.last_name 
          ? `${user.profile.first_name} ${user.profile.last_name}`
          : `HR_${hrId}`;

        const response = await fetch(getApiUrl('/api/hr/update-status'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            form_id: item.request_id,
            form_type: item.form_type,
            status: status,
            hr_id: hrId,
            hr_name: hrName,
            rejection_reason: rejectionReason || ''
          })
        });

        if (response.ok) {
          // Update local state - set hr_approval and signature
          setItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.request_id === item.request_id 
                ? { 
                    ...prevItem, 
                    hr_approval: status,
                    hr_signature: hrName,
                    hr_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
                  } 
                : prevItem
            )
          );
        
        // Update summary
        setSummary(prevSummary => {
          const statusKey = `total_${status.toLowerCase()}` as keyof HRLoginResponse['summary'];
          const currentValue = prevSummary[statusKey];
          
          return {
            ...prevSummary,
            total_pending: prevSummary.total_pending - 1,
            [statusKey]: typeof currentValue === 'number' ? currentValue + 1 : 1
          };
        });

        console.log(`✅ Successfully ${status.toLowerCase()} request ${item.request_id}`);
      } else {
        const errorMsg = status === 'Rejected' && rejectionReason 
          ? `Failed to reject request: ${rejectionReason}` 
          : `Failed to ${status.toLowerCase()} request`;
        setError(errorMsg);
        console.error(`❌ Failed to ${status.toLowerCase()} request ${item.request_id}, reason:`, rejectionReason);
      }
    } catch (error) {
      console.error(`Error ${status.toLowerCase()} request:`, error);
      setError(`Failed to ${status.toLowerCase()} request`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-4">
      {/* Chief Smile Officer & Chat Interface - At the Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Panel - Chief Smile Officer Profile */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="text-center relative flex flex-col items-center justify-center h-full">
            {/* Large Centered Avatar */}
            <div className="w-40 h-40 mb-4 rounded-full overflow-hidden bg-blue-100 shadow-xl border-4 border-white flex items-center justify-center">
              <img
                src={getGifUrl}
                alt="Chief Smile Officer"
                className="w-full h-full object-cover"
                id="captain-alpha-avatar"
              />
            </div>
            
            {/* Professional Title */}
            <h3 className="text-xl font-bold text-blue-900 mb-2">Chief Smile Officer</h3>
            
            {/* Status Indicator */}
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              <span className="text-sm text-gray-600 font-medium">• Standing By</span>
            </div>

          </div>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <ChatbotPanel onAvatarStateChange={updateAvatar} autoAskPendingOnMount ref={chatbotRef} />
        </div>
      </div>

      {/* Refresh and Filter Controls */}
      <div id="approval-table-section" className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-400 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg"
            title="Refresh data from database"
          >
            <RefreshCw className={`h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
              className="appearance-none pl-9 pr-10 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            <Filter className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.total_pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{summary.total_approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Forms</p>
              <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Form Type Filter Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Form Type</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFormTypeFilter('All')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              formTypeFilter === 'All'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            All Forms ({countByType('All')})
          </button>
          <button
            onClick={() => { setFormTypeFilter('leave-request'); setFilter('All'); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              formTypeFilter === 'leave-request'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            Leave Request ({countByType('leave-request')})
          </button>
          {countByType('employee-info-update') > 0 && (
            <button
              onClick={() => { setFormTypeFilter('employee-info-update'); setFilter('All'); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                formTypeFilter === 'employee-info-update'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Employee Info Update ({countByType('employee-info-update')})
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">Loading…</div>
      )}
      {error && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Forms Table - Full Width Below */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Form</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Department</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Created</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">HR Approval</th>
                    <th className="px-3 sm:px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={`${item.form_type}-${item.request_id}`} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-900">
                        {item.form_type}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700">{item.employee_name}</td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">{item.department || '-'}</td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{item.created_at || '-'}</td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[getHRApprovalStatus(item)] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                          {getHRApprovalStatus(item)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-right space-x-1 sm:space-x-2">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          {/* View Details Button - Always visible */}
                          <button 
                            onClick={() => handleViewDetails(item)}
                            className="group inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-sm text-xs sm:text-sm"
                            disabled={loading}
                            title="View form details"
                          >
                            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" /> 
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">View</span>
                          </button>
                        
                          {/* Approval Buttons */}
                          {shouldShowApprovalButtons(item) ? (
                            <>
                              <button 
                                onClick={() => handleApproval(item, 'Approved')}
                                className="group inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg text-xs sm:text-sm"
                                disabled={loading}
                              >
                                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" /> 
                                <span className="hidden sm:inline">Approve</span>
                                <span className="sm:hidden">✓</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setPendingRejection(item);
                                  setShowRejectionModal(true);
                                }}
                                className="group inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg sm:rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg text-xs sm:text-sm"
                                disabled={loading}
                              >
                                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" /> 
                                <span className="hidden sm:inline">Reject</span>
                                <span className="sm:hidden">✗</span>
                              </button>
                            </>
                          ) : (
                            <div className="text-xs space-y-1">
                              <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium ${
                                getHRApprovalStatus(item) === 'Approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {getHRApprovalStatus(item) === 'Approved' ? '✅ Approved' : '❌ Rejected'}
                              </div>
                              {item.hr_signature && (
                                <div className="text-gray-500 text-xs">
                                  by {item.hr_signature}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 sm:px-6 py-10 text-center text-gray-500">
                        <div className="inline-flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">No items found for this filter.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Form Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Form Details - {selectedForm?.form_type?.replace('-', ' ').toUpperCase()}
              </h3>
              
              {/* Leave Balance Box - Only for leave requests */}
              {selectedForm?.form_type === 'leave-request' ? (
                <div className="flex items-center space-x-4">
                  {balanceLoading ? (
                    <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  ) : leaveBalance ? (
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-semibold text-gray-700">Leave Balance:</div>
                      <div className="flex space-x-3">
                        {/* Annual Left */}
                        <div className="text-center">
                          <div className="bg-blue-100 border border-blue-300 rounded-lg px-2 py-1 w-20 h-16 flex flex-col justify-center">
                            <div className="font-bold text-blue-900 text-base">{Number((leaveBalance.annual_leave_total || 12) - (leaveBalance.annual_leave_used || 0)).toFixed(1)}</div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1 font-medium">Annual Left</div>
                        </div>
                        
                        {/* Annual Used */}
                        <div className="text-center">
                          <div className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 w-20 h-16 flex flex-col justify-center">
                            <div className="font-bold text-gray-900 text-base">{Number(leaveBalance.annual_leave_used || 0).toFixed(1)}</div>
                            <div className="text-xs text-gray-700 font-medium">days used</div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Annual Used</div>
                        </div>
                        
                        {/* Unpaid */}
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
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              )}
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
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
              ) : formDetails ? (
                <div className="space-y-3">
                  {/* Employee Header */}
                  <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">#{formDetails.id || selectedForm?.request_id}</span>
                        </div>
                        <h5 className="font-semibold text-gray-900">{formDetails.employee_name || selectedForm?.employee_name}</h5>
                      </div>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                        {formDetails.created_at ? new Date(formDetails.created_at).toLocaleDateString() : selectedForm?.created_at ? new Date(selectedForm.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>

                    {/* Approval Status and Form Details Side by Side */}
                    <div className="mb-3">
                      <div className="grid grid-cols-5 gap-3">
                        {/* Left: Approval Status with Horizontal Flow - 40% */}
                        <div className="col-span-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                          {(() => {
                            // Build dynamic approvals present in the form
                            const rows: Array<{label: string, value: any}> = [];
                            
                            // For employee info updates, skip line manager approval (goes directly to HR)
                            const isEmployeeInfoUpdate = selectedForm?.form_type === 'employee-info-update';
                            
                            if ('line_manager_approval' in formDetails && !isEmployeeInfoUpdate) {
                              rows.push({ label: 'Manager Decision', value: formDetails.line_manager_approval });
                            }
                            if ('department_head_approval' in formDetails) rows.push({ label: 'Department Head', value: formDetails.department_head_approval });
                            if ('finance_approval' in formDetails) rows.push({ label: 'Finance', value: formDetails.finance_approval });
                            if ('finance_verification' in formDetails) rows.push({ label: 'Finance Verification', value: formDetails.finance_verification });
                            if ('hr_approval' in formDetails) rows.push({ label: 'HR Decision', value: formDetails.hr_approval });
                            if ('facilities_officer_confirmation' in formDetails) rows.push({ label: 'Facilities Officer', value: formDetails.facilities_officer_confirmation });
                            if ('line_manager_acknowledgement' in formDetails && !isEmployeeInfoUpdate) {
                              rows.push({ label: 'Manager Acknowledgement', value: formDetails.line_manager_acknowledgement });
                            }
                            if ('line_manager_clearance' in formDetails && !isEmployeeInfoUpdate) {
                              rows.push({ label: 'Manager Clearance', value: formDetails.line_manager_clearance });
                            }
                            if ('it_clearance' in formDetails) rows.push({ label: 'IT Clearance', value: formDetails.it_clearance });
                            if ('finance_clearance' in formDetails) rows.push({ label: 'Finance Clearance', value: formDetails.finance_clearance });
                            if ('admin_clearance' in formDetails) rows.push({ label: 'Admin Clearance', value: formDetails.admin_clearance });

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
                                      const isExitClearance = selectedForm?.form_type === 'exit-clearance';
                                      const isClearanceField = r.label.toLowerCase().includes('clearance');
                                      statusValue = isExitClearance && isClearanceField ? 'Pending' : 'Rejected';
                                    } else {
                                      statusValue = 'Pending';
                                    }
                                    
                                    const statusLower = (statusValue || '').toLowerCase();
                                    const isApproved = ['approved','cleared','resolved','closed','completed','complete','true','yes'].includes(statusLower);
                                    const isRejected = ['rejected','false','no'].includes(statusLower);
                                    
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
                                  const reason = formDetails.line_manager_rejected_reason || formDetails.department_head_rejected_reason || formDetails.hr_rejected_reason || formDetails.finance_rejected_reason;
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
                                    {(() => {
                                      // For employee info updates, skip line manager approval logic
                                      if (isEmployeeInfoUpdate) {
                                        if (formDetails.hr_approval === 'Pending') return 'HR Review';
                                        if (formDetails.hr_approval === 'Approved') return 'Completed';
                                        return 'Processing';
                                      }
                                      
                                      // For other forms, use original logic
                                      if (formDetails.line_manager_approval === 'Pending') return 'Awaiting Manager Approval';
                                      if (formDetails.line_manager_approval === 'Approved' && formDetails.hr_approval === 'Pending') return 'HR Review';
                                      if (formDetails.hr_approval === 'Approved') return 'Completed';
                                      return 'Processing';
                                    })()}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Right: Form Details (for leave-request) - 60% */}
                        {selectedForm?.form_type === 'leave-request' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                            <h6 className="font-semibold text-gray-900 mb-2">Leave Details</h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium w-24">Leave Type:</span>
                                <span className="text-gray-900 font-semibold">{formDetails.leave_type || 'N/A'}</span>
                              </div>
                              <div className="flex items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium w-24">Start Date:</span>
                                <span className="text-gray-900">{formDetails.start_date || 'N/A'}</span>
                              </div>
                              <div className="flex items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium w-24">End Date:</span>
                                <span className="text-gray-900">{formDetails.end_date || 'N/A'}</span>
                              </div>
                              <div className="flex items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium w-24">Total Days:</span>
                                <span className="text-gray-900 font-semibold">{formDetails.total_days || 'N/A'}</span>
                              </div>
                              <div className="py-1">
                                <span className="text-gray-600 font-medium block mb-1">Reason:</span>
                                <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                  {formDetails.reason || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Right: Form Details - 60% */}
                        {selectedForm?.form_type !== 'leave-request' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                        <h6 className="font-semibold text-gray-900 mb-3">
                          {selectedForm?.form_type === 'employee-info-update' ? 'Employee Info Update Details' : 'Form Details'}
                        </h6>
                        {selectedForm?.form_type === 'employee-info-update' ? (
                          // Special layout for Employee Info Update - matching the image structure
                          <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Update Type:</span>
                              <span className="text-sm font-semibold text-gray-900">{formDetails.update_type || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">New Information:</span>
                              <span className="text-sm font-semibold text-gray-900">{formDetails.new_information || 'N/A'}</span>
                            </div>
                            {formDetails.old_information && (
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">Current Information:</span>
                                <span className="text-sm font-semibold text-gray-900">{formDetails.old_information}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Payroll Insurance Notified:</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formDetails.payroll_insurance_notified ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">Employee Signature:</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formDetails.employee_signature || 'Not signed'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          // Generic layout for other forms
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            {(() => {
                              // Hide: id, form_id, employee_id, created_at, updated_at, employee_name, department, status, line_manager, request_id, manager
                              const hiddenKeys = new Set(['id', 'form_id', 'employee_id', 'created_at', 'updated_at', 'employee_name', 'department', 'status', 'line_manager', 'request_id', 'manager']);
                              const entries = Object.entries(formDetails).filter(([key]) => !hiddenKeys.has(key));
                              
                              // Exclude noisy or redundant fields (shown elsewhere)
                              const redundantPatterns = [
                                /_signature$/i,
                                /_signature_date$/i,
                                /^employee_signature$/i,
                                /^employee_signature_date$/i,
                                /(approval|acknowledgement|confirmation|clearance|rejected_reason)$/i
                              ];
                              const valueIsRenderable = (value: any) => {
                                if (typeof value === 'boolean' || typeof value === 'number') return true;
                                if (value === null || value === undefined) return false;
                                if (typeof value === 'string') return value.trim() !== '';
                                return true;
                              };
                              const notRedundant = ([key, _]: [string, any]) => !redundantPatterns.some(re => re.test(key));
                              
                              const prioritized = entries
                                .filter(notRedundant)
                                .filter(([_, v]) => valueIsRenderable(v))
                                .sort((a, b) => a[0].localeCompare(b[0]));
                              
                              // Render in grid
                              const rendered: JSX.Element[] = [];
                              for (const [key, value] of prioritized) {
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="group inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Close
              </button>
              {selectedForm && shouldShowApprovalButtons(selectedForm) && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleApproval(selectedForm, 'Approved');
                    }}
                    className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setPendingRejection(selectedForm);
                      setShowRejectionModal(true);
                    }}
                    className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <XCircle className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {pendingRejection && (
        <RejectionReasonModal
          isOpen={showRejectionModal}
          onClose={() => {
            setShowRejectionModal(false);
            setPendingRejection(null);
          }}
          onConfirm={async (reason: string) => {
            if (pendingRejection) {
              await handleApproval(pendingRejection, 'Rejected', reason);
            }
            setShowRejectionModal(false);
            setPendingRejection(null);
          }}
          formType={pendingRejection.form_type}
          employeeName={pendingRejection.employee_name}
          requestId={pendingRejection.request_id}
        />
      )}
    </div>
  );
};

export default HRDashboard;
