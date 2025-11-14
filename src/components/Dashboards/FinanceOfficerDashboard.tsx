import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, Filter, RefreshCw, Eye, BarChart3, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAvatarState } from '../../hooks/useAvatarState';
import { financeService, FinanceQueueItem, FinanceLoginResponse } from '../../services/financeService';
import ChatbotPanel, { ChatbotHandle } from '../Chatbot/ChatbotPanel';
import RejectionReasonModal from '../Modal/RejectionReasonModal';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

const statusBadge: Record<string, string> = {
  Pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Approved: 'bg-green-50 text-green-700 border border-green-200',
  Rejected: 'bg-red-50 text-red-700 border border-red-200',
};

const FinanceOfficerDashboard: React.FC = () => {
  const { user, sessionId } = useAuth();
  const { updateAvatar, getGifUrl } = useAvatarState();
  const financeId = user?.id;
  const chatbotRef = React.useRef<ChatbotHandle | null>(null);

  const [items, setItems] = useState<FinanceQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('Pending');
  const [selectedForm, setSelectedForm] = useState<FinanceQueueItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<FinanceQueueItem | null>(null);
  const [summary, setSummary] = useState<FinanceLoginResponse['summary']>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    forms_by_type: {}
  });
  const [webhookTriggered, setWebhookTriggered] = useState(false);

  // Load finance data on mount
  useEffect(() => {
    const loadFinanceData = async () => {
      if (!financeId || !user || webhookTriggered) return;
      
      setLoading(true);
      setError(null);
      setWebhookTriggered(true);
      
      try {
        console.log('📊 Finance Officer dashboard loaded - fetching data...');
        
        const response = await financeService.loadFinanceQueue();
        
        console.log('📊 Finance response received:', response);
        
        if (response.success) {
          setItems(response.forms);
          setSummary(response.summary);
          console.log(`✅ Successfully loaded ${response.forms.length} petty cash requests`);
        } else {
          setError('Failed to load forms from finance service');
        }
      } catch (err) {
        console.error('Finance data load failed:', err);
        setError('Failed to load finance data');
      } finally {
        setLoading(false);
      }
    };
    loadFinanceData();
  }, [financeId, user, webhookTriggered, sessionId]);

  // Helper function to get finance approval status for display
  const getFinanceApprovalStatus = (item: FinanceQueueItem): string => {
    if (item.finance_approval && item.finance_approval !== 'Pending') {
      return item.finance_approval;
    }
    return 'Pending';
  };

  // Helper function to determine if approve/reject buttons should be shown
  const shouldShowApprovalButtons = (item: FinanceQueueItem): boolean => {
    // Show buttons only if manager has approved and finance hasn't decided yet
    return item.line_manager_approval === 'Approved' && 
           (!item.finance_approval || item.finance_approval === 'Pending');
  };

  const filtered = useMemo(() => {
    let filteredItems = items;
    if (filter !== 'All') {
      filteredItems = items.filter(item => getFinanceApprovalStatus(item) === filter);
    }
    return filteredItems;
  }, [items, filter]);

  // Handle approval action
  const handleApproval = async (item: FinanceQueueItem, decision: 'Approved' | 'Rejected', reason?: string) => {
    try {
      const financeName = user?.profile?.first_name && user?.profile?.last_name 
        ? `${user.profile.first_name} ${user.profile.last_name}`
        : `Finance_${financeId}`;

      await financeService.updateFormStatus(
        item.request_id.toString(),
        decision,
        user?.id || 'finance',
        '',
        sessionId || undefined,
        financeName,
        reason
      );
      
      // Reload data
      const response = await financeService.loadFinanceQueue();
      if (response.success) {
        setItems(response.forms);
        setSummary(response.summary);
      }
    } catch (err) {
      console.error('Failed to update form status:', err);
      alert('Failed to update form status');
    }
  };

  // Handle view details
  const handleViewDetails = async (item: FinanceQueueItem) => {
    setSelectedForm(item);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    
    try {
      const details = await financeService.getFormDetails(item.request_id.toString(), item.form_type);
      setFormDetails(details);
    } catch (err) {
      console.error('Failed to load form details:', err);
      setFormDetails({ error: 'Failed to load form details' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeService.loadFinanceQueue();
      if (response.success) {
        setItems(response.forms);
        setSummary(response.summary);
      } else {
        setError('Failed to refresh data');
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
      {/* Chief Smile Officer & Chat Interface - At the Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Left Panel - Chief Smile Officer Profile */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6">
          <div className="text-center relative flex flex-col items-center justify-center h-full">
            {/* Large Centered Avatar */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 mb-3 sm:mb-4 rounded-full overflow-hidden bg-blue-100 shadow-xl border-4 border-white flex items-center justify-center">
              <img
                src={getGifUrl}
                alt="Chief Smile Officer"
                className="w-full h-full object-cover"
                id="captain-alpha-avatar"
              />
            </div>
            
            {/* Professional Title */}
            <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-2">Chief Smile Officer</h3>
            
            {/* Status Indicator */}
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              <span className="text-xs sm:text-sm text-gray-600 font-medium">• Standing By</span>
            </div>

          </div>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <ChatbotPanel onAvatarStateChange={updateAvatar} autoAskPendingOnMount={true} ref={chatbotRef} />
        </div>
      </div>

      {/* Refresh and Filter Controls */}
      <div id="approval-table-section" className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="group inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-sky-500 to-blue-400 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg text-sm sm:text-base"
            title="Refresh data from database"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
              className="appearance-none pl-8 sm:pl-9 pr-8 sm:pr-10 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{summary.total_pending}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Approved</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{summary.total_approved}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">{summary.total_rejected}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{items.length}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </div>
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
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Request ID</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Purpose</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Manager</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Finance Status</th>
                    <th className="px-3 sm:px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={item.request_id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-900">
                        {item.request_id}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700">
                        <div className="font-medium">{item.employee_name}</div>
                        <div className="text-xs text-gray-500">{item.department}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700">
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 mr-1" />
                          <span className="font-semibold">{Number(item.amount_requested).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-700 max-w-xs truncate hidden sm:table-cell">{item.purpose}</td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                        <div className="text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            item.line_manager_approval === 'Approved' ? 'bg-green-100 text-green-700' :
                            item.line_manager_approval === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.line_manager_approval || 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[getFinanceApprovalStatus(item)] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                          {getFinanceApprovalStatus(item)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-right space-x-1 sm:space-x-2">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
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
                                getFinanceApprovalStatus(item) === 'Approved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {getFinanceApprovalStatus(item) === 'Approved' ? '✅ Approved' : '❌ Rejected'}
                              </div>
                              {item.finance_signature && (
                                <div className="text-gray-500 text-xs">
                                  by {item.finance_signature}
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
                      <td colSpan={7} className="px-3 sm:px-6 py-10 text-center text-gray-500">
                        <div className="inline-flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">No petty cash or travel expense requests found for this filter.</span>
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

      {/* Details Modal */}
      {showDetailsModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Request Details - ID: {selectedForm.request_id}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
                            
                            // For finance forms, show all relevant approval stages
                            if ('line_manager_approval' in formDetails) rows.push({ label: 'Manager Decision', value: formDetails.line_manager_approval });
                            if ('finance_approval' in formDetails) rows.push({ label: 'Finance', value: formDetails.finance_approval });

                            return (
                              <div className="space-y-3">
                                {/* Approval Flow - Horizontal Flow */}
                                <div className="flex items-center overflow-x-auto pb-2">
                                  {rows.map((r, idx) => {
                                    // Determine status value
                                    let statusValue: string;
                                    if (typeof r.value === 'string') {
                                      statusValue = r.value;
                                    } else if (r.value === true) {
                                      statusValue = 'Approved';
                                    } else if (r.value === false) {
                                      statusValue = 'Rejected';
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
                                  const reason = formDetails.line_manager_rejected_reason || formDetails.finance_rejected_reason;
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
                                      if (formDetails.line_manager_approval === 'Pending') return 'Awaiting Manager Approval';
                                      if (formDetails.line_manager_approval === 'Approved' && formDetails.finance_approval === 'Pending') return 'Finance Review';
                                      if (formDetails.finance_approval === 'Approved') return 'Completed';
                                      return 'Processing';
                                    })()}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Right: Form Details (for petty-cash) - 60% */}
                        {selectedForm?.form_type === 'petty-cash' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                            <h6 className="font-semibold text-gray-900 mb-2">Petty Cash Details</h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Amount Requested:</span>
                                <span className="text-gray-900 font-semibold">
                                  IDR {formDetails.amount_requested ? Number(formDetails.amount_requested).toFixed(2) : 'N/A'}
                                </span>
                    </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Expected Settlement:</span>
                                <span className="text-gray-900">{formDetails.expected_settlement_date || 'N/A'}</span>
                    </div>
                              <div className="py-1">
                                <span className="text-gray-600 font-medium block mb-1">Purpose:</span>
                                <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                  {formDetails.purpose || 'N/A'}
                      </p>
                    </div>
                  </div>
                          </div>
                        )}

                        {/* Right: Form Details (for travel-request) - 60% */}
                        {selectedForm?.form_type === 'travel-request' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                            <h6 className="font-semibold text-gray-900 mb-2">Travel Request Details</h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Destination:</span>
                                <span className="text-gray-900">{formDetails.destination || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Departure Date:</span>
                                <span className="text-gray-900">{formDetails.departure_date || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Return Date:</span>
                                <span className="text-gray-900">{formDetails.return_date || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Estimated Cost:</span>
                                <span className="text-gray-900 font-semibold">IDR {formDetails.amount_requested ? Number(formDetails.amount_requested).toFixed(2) : 'N/A'}</span>
                              </div>
                              {formDetails.purpose && (
                                <div className="py-1">
                                  <span className="text-gray-600 font-medium block mb-1">Purpose:</span>
                                  <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                    {formDetails.purpose}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Right: Form Details (for purchase-requisition) - 60% */}
                        {selectedForm?.form_type === 'purchase-requisition' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                            <h6 className="font-semibold text-gray-900 mb-2">Purchase Requisition Details</h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Item Description:</span>
                                <span className="text-gray-900 font-semibold">{formDetails.item_description || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Quantity:</span>
                                <span className="text-gray-900">{formDetails.quantity || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Unit Cost:</span>
                                <span className="text-gray-900">
                                  IDR {formDetails.unit_cost ? Number(formDetails.unit_cost).toFixed(2) : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Estimated Total:</span>
                                <span className="text-gray-900 font-semibold">
                                  IDR {formDetails.estimated_total ? Number(formDetails.estimated_total).toFixed(2) : 'N/A'}
                                </span>
                              </div>
                              {formDetails.purpose_of_purchase && (
                                <div className="py-1">
                                  <span className="text-gray-600 font-medium block mb-1">Purpose of Purchase:</span>
                                  <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                    {formDetails.purpose_of_purchase}
                                  </p>
                                </div>
                              )}
                            </div>
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

      {/* Rejection Modal */}
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
          formType="petty-cash"
          employeeName={pendingRejection.employee_name}
          requestId={String(pendingRejection.request_id)}
        />
      )}
    </div>
  );
};

export default FinanceOfficerDashboard;


