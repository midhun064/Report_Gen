import React, { useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { managerService, ManagerQueueItem, ManagerLoginResponse } from '../../services/managerService';
import { CheckCircle2, XCircle, Clock, Filter, BarChart3, RefreshCw, Eye, Phone } from 'lucide-react';
import ChatbotPanel, { ChatbotHandle } from '../Chatbot/ChatbotPanel';
import { useAvatarState } from '../../hooks/useAvatarState';
import RejectionReasonModal from '../Modal/RejectionReasonModal';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

const statusBadge: Record<string, string> = {
  Pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Approved: 'bg-green-50 text-green-700 border border-green-200',
  Rejected: 'bg-red-50 text-red-700 border border-red-200',
};

const ManagerDashboard: React.FC = () => {
  const { user, sessionId } = useAuth();
  const { updateAvatar, getGifUrl } = useAvatarState();
  const managerId = (user?.profile as any)?.manager_id || user?.id; // fallback
  const [isListening, setIsListening] = React.useState(false);
  const [items, setItems] = useState<ManagerQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('Pending');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('All');
  const [selectedForm, setSelectedForm] = useState<ManagerQueueItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<ManagerQueueItem | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [summary, setSummary] = useState<ManagerLoginResponse['summary']>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    forms_by_type: {}
  });
  const [webhookTriggered, setWebhookTriggered] = useState(false);
  const chatbotRef = React.useRef<ChatbotHandle | null>(null);

  // Automatically trigger agentic manager login when manager dashboard loads
  useEffect(() => {
    const loadManagerData = async () => {
      if (!managerId || !user || webhookTriggered) return;
      
      setLoading(true);
      setError(null);
      setWebhookTriggered(true);
      
      try {
        console.log('📊 Manager dashboard loaded - fetching data...');
        
        // Prepare manager data for standard service
        const managerData = {
          first_name: user.profile?.first_name || '',
          last_name: user.profile?.last_name || '',
          name: `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim(),
          department: user.department?.department_name || user.department_code || '',
          role: user.role,
          email: user.email
        };
        const response = await managerService.triggerManagerLogin(managerId, managerData, sessionId || undefined);
        
        console.log('📊 Standard response received:', response);
        
        if (response.success) {
          // MANAGER DASHBOARD: Show forms that managers can approve/reject + IT incidents (view only)
          // Approval forms: leave-request, petty-cash, travel-request, purchase-requisition
          // View only: it-incident, password-reset
          // EXCLUDED: meeting-room (handled by Facilities Desk Coordinator)
          const managerVisibleForms = ['leave-request', 'petty-cash', 'travel-request', 'purchase-requisition', 'it-incident', 'password-reset'];
          const filteredForms = response.forms.filter(form => 
            managerVisibleForms.includes(form.form_type)
          );
          
          setItems(filteredForms);
          
          // Recalculate summary for filtered forms (exclude IT incidents and password-reset from pending/approved/rejected counts)
          const approvalForms = filteredForms.filter(f => f.form_type !== 'it-incident' && f.form_type !== 'password-reset');
          const filteredSummary = {
            total_pending: approvalForms.filter(f => !f.line_manager_approval || f.line_manager_approval === 'Pending').length,
            total_approved: approvalForms.filter(f => f.line_manager_approval === 'Approved').length,
            total_rejected: approvalForms.filter(f => f.line_manager_approval === 'Rejected').length,
            forms_by_type: filteredForms.reduce((acc: Record<string, number>, form) => {
              acc[form.form_type] = (acc[form.form_type] || 0) + 1;
              return acc;
            }, {})
          };
          
          setSummary(filteredSummary);
          console.log(`✅ Successfully loaded ${filteredForms.length} manager visible forms (${approvalForms.length} approval + ${filteredForms.length - approvalForms.length} view-only) from ${response.forms.length} total`);
        } else {
          setError('Failed to load forms from manager service');
        }
      } catch (err) {
        console.error('Manager login data load failed:', err);
        setError('Failed to load manager data');
      } finally {
        setLoading(false);
      }
    };
    loadManagerData();
  }, [managerId, user, webhookTriggered, sessionId]);

  // Helper function to get manager approval status for display
  const getManagerApprovalStatus = (item: ManagerQueueItem): string => {
    // Use line_manager_approval field if available, otherwise show 'Pending'
    if (item.line_manager_approval && item.line_manager_approval !== 'Pending') {
      return item.line_manager_approval; // 'Approved' or 'Rejected'
    }
    return 'Pending'; // No manager approval yet or explicitly Pending
  };

  // Helper function to determine if approve/reject buttons should be shown
  const shouldShowApprovalButtons = (item: ManagerQueueItem): boolean => {
    // IT incidents and password-reset are view-only, no approval buttons
    if (item.form_type === 'it-incident' || item.form_type === 'password-reset') {
      return false;
    }
    
    // For other forms, show buttons if line manager hasn't approved/rejected yet
    return !item.line_manager_approval || item.line_manager_approval === 'Pending';
  };

  const filtered = useMemo(() => {
    let filteredItems = items;
    
    // Filter by form type first
    if (formTypeFilter !== 'All') {
      filteredItems = filteredItems.filter((i) => i.form_type === formTypeFilter);
    }
    
    // Then filter by status
    if (filter !== 'All') {
      filteredItems = filteredItems.filter((i) => getManagerApprovalStatus(i) === filter);
    }
    
    return filteredItems;
  }, [items, filter, formTypeFilter]);

  // Count helper that respects current status filter
  const countByType = (type: string) => {
    return items.filter(i => (
      (type === 'All' ? true : i.form_type === type) &&
      (filter === 'All' ? true : getManagerApprovalStatus(i) === filter)
    )).length;
  };

  // Handle refresh - reload data from database
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Refreshing manager dashboard data...');
      
      // Prepare manager data for webhook
      const managerData = {
        first_name: user?.profile?.first_name || '',
        last_name: user?.profile?.last_name || '',
        name: `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim(),
        department: user?.department?.department_name || user?.department_code || '',
        role: user?.role,
        email: user?.email
      };

      // Trigger the n8n webhook to get fresh data
      const response = await managerService.triggerManagerLogin(managerId, managerData, sessionId || undefined);
      
      console.log('📊 Refresh response received:', response);
      
      if (response.success) {
        setItems(response.forms);
        setSummary(response.summary);
        console.log(`✅ Successfully refreshed ${response.forms.length} forms`);
      } else {
        setError('Failed to refresh forms from webhook');
      }
    } catch (e) {
      console.error('❌ Refresh failed:', e);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (item: ManagerQueueItem) => {
    setSelectedForm(item);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setFormDetails(null);
    setLeaveBalance(null);
    
    try {
      // Fetch complete form details from backend
      const response = await fetch(getApiUrl(`/api/manager/form-details?form_id=${item.request_id}&form_type=${item.form_type}`));
      if (response.ok) {
        const details = await response.json();
        setFormDetails(details);
        
        // If it's an IT incident or password reset form, automatically acknowledge it
        if ((item.form_type === 'it-incident' || item.form_type === 'password-reset') && !item.line_manager_acknowledgement) {
          try {
            const endpoint = item.form_type === 'it-incident' 
              ? getApiUrl('/api/manager/acknowledge-it-incident')
              : getApiUrl('/api/manager/acknowledge-password-reset');
              
            const ackResponse = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                form_id: item.request_id,
                manager_id: managerId
              })
            });
            
            if (ackResponse.ok) {
              console.log(`✅ ${item.form_type} acknowledged by manager`);
              // Refresh the queue to show updated status
              setTimeout(() => handleRefresh(), 500);
            }
          } catch (ackError) {
            console.error('Failed to acknowledge IT incident:', ackError);
          }
        }
        
        // If it's a leave request, also fetch leave balance
        if (item.form_type === 'leave-request' && details.employee_id) {
          setBalanceLoading(true);
          try {
            const balanceResponse = await fetch(getApiUrl(`/api/manager/employee-leave-balance/${details.employee_id}`));
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
  const handleApproval = async (item: ManagerQueueItem, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
      try {
        console.log(`${status === 'Approved' ? '✅' : '❌'} ${status} request ${item.request_id} via webhook...`);
        
        // Get manager name for signature
        const managerName = user?.profile?.first_name && user?.profile?.last_name 
          ? `${user.profile.first_name} ${user.profile.last_name}`
          : `Manager_${managerId}`;

        const success = await managerService.updateFormStatus(
          item.request_id.toString(),
          item.form_type,
          status,
          managerId,
          `${status} by manager via dashboard`,
          sessionId || undefined,
          managerName,
          rejectionReason
        );

        if (success) {
          // Update local state - set line_manager_approval and signature
          setItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.request_id === item.request_id 
                ? { 
                    ...prevItem, 
                    line_manager_approval: status,
                    line_manager_signature: managerName,
                    line_manager_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
                  } 
                : prevItem
            )
          );
        
        // Update summary
        setSummary(prevSummary => {
          const statusKey = `total_${status.toLowerCase()}` as keyof ManagerLoginResponse['summary'];
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
          <ChatbotPanel onAvatarStateChange={updateAvatar} autoAskPendingOnMount={true} ref={chatbotRef} />
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

      {/* Form Type Filter Buttons - Manager Forms (Approval + View Only) */}
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
          {countByType('leave-request') > 0 && (
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
          )}
          {countByType('travel-request') > 0 && (
          <button
            onClick={() => { setFormTypeFilter('travel-request'); setFilter('All'); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              formTypeFilter === 'travel-request'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            Travel Request ({countByType('travel-request')})
          </button>
          )}
          {countByType('petty-cash') > 0 && (
          <button
            onClick={() => { setFormTypeFilter('petty-cash'); setFilter('All'); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              formTypeFilter === 'petty-cash'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            Petty Cash ({countByType('petty-cash')})
          </button>
          )}
          {countByType('purchase-requisition') > 0 && (
            <button
              onClick={() => { setFormTypeFilter('purchase-requisition'); setFilter('All'); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                formTypeFilter === 'purchase-requisition'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Purchase Requisition ({countByType('purchase-requisition')})
            </button>
          )}
          {countByType('it-incident') > 0 && (
          <button
            onClick={() => { setFormTypeFilter('it-incident'); setFilter('All'); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              formTypeFilter === 'it-incident'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            IT Incident ({countByType('it-incident')})
          </button>
          )}
          {countByType('password-reset') > 0 && (
          <button
            onClick={() => { setFormTypeFilter('password-reset'); setFilter('All'); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              formTypeFilter === 'password-reset'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            Password Reset ({countByType('password-reset')})
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
          <div id="approval-panel" className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Form</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Department</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 hidden md:table-cell">Created</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600">Manager Approval</th>
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
                        {item.form_type === 'it-incident' || item.form_type === 'password-reset' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            View Only
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[getManagerApprovalStatus(item)] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                            {getManagerApprovalStatus(item)}
                          </span>
                        )}
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
                        
                        {/* Approval Buttons - Only for manager approval forms */}
                        {item.form_type === 'it-incident' || item.form_type === 'password-reset' ? (
                          // IT incidents and password-reset are view-only, no approval/rejection indicators
                          null
                        ) : shouldShowApprovalButtons(item) ? (
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
                              getManagerApprovalStatus(item) === 'Approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getManagerApprovalStatus(item) === 'Approved' ? '✅ Approved' : '❌ Rejected'}
                            </div>
                            {item.line_manager_signature && (
                              <div className="text-gray-500 text-xs">
                                by {item.line_manager_signature}
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
                          <div className="bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 min-w-[50px] text-center">
                            <div className="font-bold text-blue-900 text-sm">{Number(12 - (leaveBalance.annual_leave_used || 0)).toFixed(1)}</div>
                            <div className="text-xs text-blue-600">/ 12.0</div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1">Annual Left</div>
                        </div>
                        
                        {/* Annual Used */}
                        <div className="text-center">
                          <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 min-w-[50px] text-center">
                            <div className="font-bold text-gray-900 text-sm">{Number(leaveBalance.annual_leave_used || 0).toFixed(1)}</div>
                            <div className="text-xs text-gray-600">days used</div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Annual Used</div>
                        </div>
                        
                        {/* Unpaid */}
                        <div className="text-center">
                          <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 min-w-[50px] text-center">
                            <div className="font-bold text-yellow-900 text-sm">{Number(leaveBalance.unpaid_leave_used || 0).toFixed(1)}</div>
                            <div className="text-xs text-yellow-600">days used</div>
                          </div>
                          <div className="text-xs text-yellow-600 mt-1">Unpaid</div>
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
                            
                            // For IT incident and password reset forms, only show IT Support stage
                            if (selectedForm?.form_type === 'it-incident' || selectedForm?.form_type === 'password-reset') {
                              // Check if IT has processed the ticket/password reset
                              const itProcessed = formDetails.it_helpdesk_ticket_number && formDetails.incident_description;
                              const passwordProcessed = formDetails.new_password && formDetails.it_helpdesk_reset_by;
                              const itStatus = formDetails.status === 'In Progress' ? 'In Progress' : 
                                             formDetails.status === 'Closed' ? 'Closed' :
                                             formDetails.status === 'Completed' ? 'Completed' :
                                             formDetails.status === 'Rejected' ? 'Rejected' :
                                             itProcessed || passwordProcessed ? 'Details Filled' : 'Pending';
                              rows.push({ label: 'IT Support', value: itStatus });
                            } else {
                              // For other forms, show all relevant approval stages
                              if ('line_manager_approval' in formDetails) rows.push({ label: 'Manager Decision', value: formDetails.line_manager_approval });
                              if ('department_head_approval' in formDetails) rows.push({ label: 'Department Head', value: formDetails.department_head_approval });
                              if ('finance_approval' in formDetails) rows.push({ label: 'Finance', value: formDetails.finance_approval });
                              if ('finance_verification' in formDetails) rows.push({ label: 'Finance Verification', value: formDetails.finance_verification });
                              if ('hr_approval' in formDetails) rows.push({ label: 'HR', value: formDetails.hr_approval });
                              if ('facilities_officer_confirmation' in formDetails) rows.push({ label: 'Facilities Officer', value: formDetails.facilities_officer_confirmation });
                              if ('line_manager_acknowledgement' in formDetails) rows.push({ label: 'Manager Acknowledgement', value: formDetails.line_manager_acknowledgement });
                              if ('line_manager_clearance' in formDetails) rows.push({ label: 'Manager Clearance', value: formDetails.line_manager_clearance });
                              if ('it_clearance' in formDetails) rows.push({ label: 'IT Clearance', value: formDetails.it_clearance });
                              if ('finance_clearance' in formDetails) rows.push({ label: 'Finance Clearance', value: formDetails.finance_clearance });
                              if ('admin_clearance' in formDetails) rows.push({ label: 'Admin Clearance', value: formDetails.admin_clearance });
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
                                      // For IT incident forms
                                      if (selectedForm?.form_type === 'it-incident') {
                                        if (formDetails.status === 'Closed') return 'Completed';
                                        if (formDetails.status === 'Rejected') return 'Rejected';
                                        if (formDetails.status === 'In Progress') return 'IT Working on Resolution';
                                        if (formDetails.it_helpdesk_ticket_number) return 'IT Processing';
                                        return 'Awaiting IT Support';
                                      }
                                      // For password reset forms
                                      if (selectedForm?.form_type === 'password-reset') {
                                        if (formDetails.status === 'Completed') return 'Password Reset Completed';
                                        if (formDetails.status === 'Rejected') return 'Rejected';
                                        if (formDetails.new_password) return 'Password Set - Awaiting Employee';
                                        return 'Awaiting IT Support';
                                      }
                                      // For other forms
                                      if (formDetails.line_manager_approval === 'Pending') return 'Awaiting Manager Approval';
                                      if (formDetails.line_manager_approval === 'Approved' && formDetails.hr_approval === 'Pending') return 'HR Review';
                                      if (formDetails.hr_approval === 'Approved') return 'Completed';
                                      return 'Processing';
                                    })()}
                          </span>
                                </div>
                                
                                {/* IT Ticket Number and Resolution Notes - Only for IT Incidents */}
                                {selectedForm?.form_type === 'it-incident' && (
                                  <>
                                    {formDetails.it_helpdesk_ticket_number && (
                                      <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-2">
                                        <span className="font-medium text-green-700">IT Ticket #:</span>
                                        <span className="ml-2 text-green-900 font-bold">{formDetails.it_helpdesk_ticket_number}</span>
                                      </div>
                                    )}
                                    {formDetails.status === 'Closed' && formDetails.it_resolution_notes && (
                                      <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="font-medium text-blue-700 mb-2">Resolution Notes:</div>
                                        <p className="text-blue-900 text-xs whitespace-pre-wrap">{formDetails.it_resolution_notes}</p>
                                      </div>
                                    )}
                                  </>
                                )}
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
                        
                        {/* Right: Form Details (for password-reset) - 60% */}
                        {selectedForm?.form_type === 'password-reset' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                            <h6 className="font-semibold text-gray-900 mb-2">Password Reset Details</h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium w-24">System:</span>
                                <span className="text-gray-900 font-semibold">{formDetails.system_for_reset || 'N/A'}</span>
                              </div>
                              <div className="flex items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium w-24">Reason:</span>
                                <span className="text-gray-900">{formDetails.reset_reason || 'N/A'}</span>
                              </div>
                              {formDetails.new_password && (
                                <div className="flex items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-600 font-medium w-24">New Password:</span>
                                  <span className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{formDetails.new_password}</span>
                                </div>
                              )}
                              {formDetails.it_helpdesk_reset_by && (
                                <div className="flex items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-600 font-medium w-24">Reset By:</span>
                                  <span className="text-gray-900">{formDetails.it_helpdesk_reset_by}</span>
                                </div>
                              )}
                              {formDetails.it_helpdesk_date && (
                                <div className="flex items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-600 font-medium w-24">Reset Date:</span>
                                  <span className="text-gray-900">{new Date(formDetails.it_helpdesk_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              <div className="py-1">
                                <span className="text-gray-600 font-medium block mb-1">Status:</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  formDetails.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  formDetails.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {formDetails.status || 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Right: Form Details (for it-incident) - 60% */}
                        {selectedForm?.form_type === 'it-incident' && (
                          <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                            <h6 className="font-semibold text-gray-900 mb-2">IT Incident Details</h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">System Number:</span>
                                <span className="text-gray-900 font-semibold">{formDetails.employee_system_number || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Affected System:</span>
                                <span className="text-gray-900">{formDetails.affected_system || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Incident Date:</span>
                                <span className="text-gray-900">{formDetails.incident_date ? new Date(formDetails.incident_date).toLocaleString() : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Status:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  formDetails.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                                  formDetails.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                  formDetails.status === 'Closed' ? 'bg-green-100 text-green-800' :
                                  formDetails.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {formDetails.status || 'N/A'}
                                </span>
                              </div>
                              {formDetails.it_helpdesk_assigned_to && (
                                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                  <span className="text-gray-600 font-medium">Assigned To:</span>
                                  <span className="text-gray-900 text-xs">{formDetails.it_helpdesk_assigned_to}</span>
                                </div>
                              )}
                              {formDetails.incident_description && (
                                <div className="py-1">
                                  <span className="text-gray-600 font-medium block mb-1">Description:</span>
                                  <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100 max-h-32 overflow-y-auto">
                                    {formDetails.incident_description}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

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
                                <span className="text-gray-600 font-medium">Travel Purpose:</span>
                                <span className="text-gray-900 font-semibold">{formDetails.travel_purpose || 'N/A'}</span>
                      </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Destination:</span>
                                <span className="text-gray-900">{formDetails.destination || 'N/A'}</span>
                    </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Start Date:</span>
                                <span className="text-gray-900">{formDetails.start_date || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">End Date:</span>
                                <span className="text-gray-900">{formDetails.end_date || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Estimated Cost:</span>
                                <span className="text-gray-900 font-semibold">
                                  IDR {formDetails.estimated_cost ? Number(formDetails.estimated_cost).toFixed(2) : 'N/A'}
                                </span>
                              </div>
                              {formDetails.travel_notes && (
                                <div className="py-1">
                                  <span className="text-gray-600 font-medium block mb-1">Travel Notes:</span>
                                  <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                                    {formDetails.travel_notes}
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

                    {/* Form Details for other forms */}
                    {selectedForm?.form_type !== 'leave-request' && selectedForm?.form_type !== 'it-incident' && selectedForm?.form_type !== 'petty-cash' && selectedForm?.form_type !== 'travel-request' && selectedForm?.form_type !== 'purchase-requisition' && selectedForm?.form_type !== 'password-reset' && (
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
          requestId={String(pendingRejection.request_id)}
        />
      )}
    </div>
  );
};

export default ManagerDashboard;


