import React, { useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { facilitiesDeskService, FacilitiesDeskQueueItem, FacilitiesDeskLoginResponse } from '../../services/facilitiesDeskService';
import { CheckCircle2, XCircle, Clock, Filter, BarChart3, RefreshCw, Eye } from 'lucide-react';
import ChatbotPanel, { ChatbotHandle } from '../Chatbot/ChatbotPanel';
import { useAvatarState } from '../../hooks/useAvatarState';
import RejectionReasonModal from '../Modal/RejectionReasonModal';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

const statusBadge: Record<string, string> = {
  Pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Approved: 'bg-green-50 text-green-700 border border-green-200',
  Rejected: 'bg-red-50 text-red-700 border border-red-200',
};

const FacilitiesDeskDashboard: React.FC = () => {
  const { user, sessionId } = useAuth();
  const { updateAvatar, getGifUrl } = useAvatarState();
  const facilitiesId = user?.id; // Facilities desk user ID
  const [items, setItems] = useState<FacilitiesDeskQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('Pending');
  const [selectedForm, setSelectedForm] = useState<FacilitiesDeskQueueItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<FacilitiesDeskQueueItem | null>(null);
  const [summary, setSummary] = useState<FacilitiesDeskLoginResponse['summary']>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    forms_by_type: {}
  });
  const [webhookTriggered, setWebhookTriggered] = useState(false);
  const chatbotRef = React.useRef<ChatbotHandle | null>(null);

  // Automatically trigger facilities desk login when dashboard loads
  useEffect(() => {
    const loadFacilitiesData = async () => {
      if (!facilitiesId || !user || webhookTriggered) return;
      
      setLoading(true);
      setError(null);
      setWebhookTriggered(true);
      
      try {
        console.log('📊 Facilities Desk dashboard loaded - fetching data...');
        
        const response = await facilitiesDeskService.loadFacilitiesQueue();
        
        console.log('📊 Facilities response received:', response);
        
        if (response.success) {
          setItems(response.forms);
          setSummary(response.summary);
          console.log(`✅ Successfully loaded ${response.forms.length} meeting room requests`);
        } else {
          setError('Failed to load forms from facilities service');
        }
      } catch (err) {
        console.error('Facilities desk data load failed:', err);
        setError('Failed to load facilities desk data');
      } finally {
        setLoading(false);
      }
    };
    loadFacilitiesData();
  }, [facilitiesId, user, webhookTriggered, sessionId]);

  // Helper function to get facilities desk approval status for display
  const getFacilitiesApprovalStatus = (item: FacilitiesDeskQueueItem): string => {
    if (item.facilities_desk_approval && item.facilities_desk_approval !== 'Pending') {
      return item.facilities_desk_approval; // 'Approved' or 'Rejected'
    }
    return 'Pending';
  };

  // Helper function to determine if approve/reject buttons should be shown
  const shouldShowApprovalButtons = (item: FacilitiesDeskQueueItem): boolean => {
    return !item.facilities_desk_approval || item.facilities_desk_approval === 'Pending';
  };

  const filtered = useMemo(() => {
    let filteredItems = items;
    
    // Filter by status
    if (filter !== 'All') {
      filteredItems = filteredItems.filter((i) => getFacilitiesApprovalStatus(i) === filter);
    }
    
    return filteredItems;
  }, [items, filter]);

  // Handle refresh - reload data from database
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Refreshing facilities desk dashboard data...');
      
      const response = await facilitiesDeskService.loadFacilitiesQueue();
      
      console.log('📊 Refresh response received:', response);
      
      if (response.success) {
        setItems(response.forms);
        setSummary(response.summary);
        console.log(`✅ Successfully refreshed ${response.forms.length} forms`);
      } else {
        setError('Failed to refresh forms');
      }
    } catch (e) {
      console.error('❌ Refresh failed:', e);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (item: FacilitiesDeskQueueItem) => {
    setSelectedForm(item);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setFormDetails(null);
    
    try {
      const formType = item.form_type || 'meeting-room'; // Default to meeting-room for backward compatibility
      const response = await fetch(getApiUrl(`/api/facilities-desk/form-details?form_id=${item.request_id}&form_type=${formType}`));
      if (response.ok) {
        const details = await response.json();
        setFormDetails(details);
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
  const handleApproval = async (item: FacilitiesDeskQueueItem, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
      try {
        console.log(`${status === 'Approved' ? '✅' : '❌'} ${status} ${item.form_type || 'meeting-room'} request ${item.request_id}...`);
        
        // Get facilities officer name for signature
        const facilitiesName = user?.profile?.first_name && user?.profile?.last_name 
          ? `${user.profile.first_name} ${user.profile.last_name}`
          : `FacilitiesOfficer_${facilitiesId}`;

        const success = await facilitiesDeskService.updateFormStatus(
          item.request_id.toString(),
          status,
          facilitiesId || '',
          item.form_type || 'meeting-room',
          `${status} by facilities desk via dashboard`,
          sessionId || undefined,
          facilitiesName,
          rejectionReason
        );

        if (success) {
          // Update local state
          setItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.request_id === item.request_id 
                ? { 
                    ...prevItem, 
                    facilities_desk_approval: status,
                    facilities_desk_signature: facilitiesName,
                    facilities_desk_date: new Date().toISOString().split('T')[0]
                  } 
                : prevItem
            )
          );
        
        // Update summary
        setSummary(prevSummary => {
          const statusKey = `total_${status.toLowerCase()}` as keyof FacilitiesDeskLoginResponse['summary'];
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
        console.error(`❌ Failed to ${status.toLowerCase()} request ${item.request_id}`);
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
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
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
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Request ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Form Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={`${item.form_type || 'meeting-room'}-${item.request_id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {item.request_id}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{item.employee_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{item.department || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.form_type === 'facility-access' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.form_type === 'facility-access' ? 'Facility Access' : 'Meeting Room'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {item.form_type === 'facility-access' ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{item.access_request_type || '-'}</div>
                          <div className="text-xs text-gray-500">{item.facilities_requested || '-'}</div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{item.room_requested || '-'}</div>
                          <div className="text-xs text-gray-500">
                            {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : '-'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {item.form_type === 'facility-access' ? 
                        (item.created_at ? new Date(item.created_at).toLocaleDateString() : '-') :
                        (item.booking_date || '-')
                      }
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[getFacilitiesApprovalStatus(item)] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                        {getFacilitiesApprovalStatus(item)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-right space-x-2">
                      <div className="flex items-center space-x-2">
                        {/* View Details Button - Always visible */}
                        <button 
                          onClick={() => handleViewDetails(item)}
                          className="group inline-flex items-center px-3 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-sm"
                          disabled={loading}
                          title="View form details"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5 group-hover:scale-110 transition-transform duration-200" /> 
                          View Details
                        </button>
                        
                        {/* Approval Buttons */}
                        {shouldShowApprovalButtons(item) ? (
                          <>
                            <button 
                              onClick={() => handleApproval(item, 'Approved')}
                              className="group inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg"
                              disabled={loading}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" /> 
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                setPendingRejection(item);
                                setShowRejectionModal(true);
                              }}
                              className="group inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg"
                              disabled={loading}
                            >
                              <XCircle className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" /> Reject
                            </button>
                          </>
                        ) : (
                          <div className="text-xs space-y-1">
                            <div className={`px-3 py-1.5 rounded-lg font-medium ${
                              getFacilitiesApprovalStatus(item) === 'Approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getFacilitiesApprovalStatus(item) === 'Approved' ? '✅ Approved' : '❌ Rejected'}
                            </div>
                            {item.facilities_desk_signature && (
                              <div className="text-gray-500">
                                by {item.facilities_desk_signature}
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
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      <div className="inline-flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>No requests found for this filter.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Form Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedForm?.form_type === 'facility-access' ? 'Facility Access Request Details' : 'Meeting Room Booking Details'} - ID: {selectedForm?.request_id}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
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
                  <div className="flex gap-3">
                    {/* Left: Approval Status with Horizontal Flow */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <h6 className="font-semibold text-gray-900 mb-1.5">Approval Status</h6>
                      <div className="space-y-3">
                        {/* Approval Flow - Horizontal Flow */}
                        <div className="flex items-center overflow-x-auto pb-2">
                          {/* Stage 1: Facilities Desk */}
                          <div className="flex flex-col items-center min-w-[120px]">
                            <div className={`w-full px-3 py-2 rounded-lg border-2 text-center transition-all ${
                              formDetails.facilities_desk_approval === 'Approved' 
                                ? 'bg-green-50 border-green-400 shadow-sm' 
                                : formDetails.facilities_desk_approval === 'Rejected'
                                ? 'bg-red-50 border-red-400 shadow-sm'
                                : 'bg-yellow-50 border-yellow-300'
                            }`}>
                              <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Facilities Desk
                              </div>
                              <div className={`text-xs font-bold ${
                                formDetails.facilities_desk_approval === 'Approved' 
                                  ? 'text-green-700' 
                                  : formDetails.facilities_desk_approval === 'Rejected'
                                  ? 'text-red-700'
                                  : 'text-yellow-700'
                              }`}>
                                {formDetails.facilities_desk_approval || 'Pending'}
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
                              formDetails.facilities_manager_approval === 'Approved' 
                                ? 'bg-green-50 border-green-400 shadow-sm' 
                                : formDetails.facilities_manager_approval === 'Rejected'
                                ? 'bg-red-50 border-red-400 shadow-sm'
                                : 'bg-yellow-50 border-yellow-300'
                            }`}>
                              <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
                                Facilities Manager
                              </div>
                              <div className={`text-xs font-bold ${
                                formDetails.facilities_manager_approval === 'Approved' 
                                  ? 'text-green-700' 
                                  : formDetails.facilities_manager_approval === 'Rejected'
                                  ? 'text-red-700'
                                  : 'text-yellow-700'
                              }`}>
                                {formDetails.facilities_manager_approval || 'Pending'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Rejection Reason */}
                        {(formDetails.facilities_desk_rejected_reason || formDetails.facilities_manager_rejected_reason) && (
                          <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                            <span className="font-medium text-red-700">Rejection Reason:</span>
                            <span className="ml-2 text-red-900">
                              {formDetails.facilities_desk_rejected_reason || formDetails.facilities_manager_rejected_reason}
                            </span>
                          </div>
                        )}
                        
                        {/* Next Stage */}
                        <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center">
                          <span className="font-medium text-blue-700">Next Stage:</span>
                          <span className="ml-2 text-blue-900 font-semibold">
                            {formDetails.facilities_desk_approval === 'Rejected' 
                              ? 'Rejected - No Further Action'
                              : formDetails.facilities_manager_approval === 'Approved'
                              ? 'Completed'
                              : formDetails.facilities_manager_approval === 'Rejected'
                              ? 'Rejected - No Further Action'
                              : formDetails.facilities_desk_approval === 'Approved'
                              ? 'Facilities Manager'
                              : 'Facilities Desk'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Form Details */}
                    <div className="w-80 bg-white rounded-lg p-3 border border-gray-200">
                      {selectedForm?.form_type === 'facility-access' ? (
                        <>
                          <h6 className="font-semibold text-gray-900 mb-2">Facility Access Details</h6>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Access Type:</span>
                              <span className="text-gray-900 font-semibold">{formDetails.access_request_type || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Facilities Requested:</span>
                              <span className="text-gray-900">{formDetails.facilities_requested || 'N/A'}</span>
                            </div>
                            <div className="py-1">
                              <span className="text-gray-600 font-medium block mb-1">Justification:</span>
                              <p className="text-gray-900 text-xs bg-gray-50 rounded p-2 border border-gray-100 max-h-32 overflow-y-auto">
                                {formDetails.justification || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <h6 className="font-semibold text-gray-900 mb-2">Booking Details</h6>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Room:</span>
                              <span className="text-gray-900 font-semibold">{formDetails.room_requested || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Booking Date:</span>
                              <span className="text-gray-900">{formDetails.booking_date || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Start Time:</span>
                              <span className="text-gray-900">{formDetails.start_time || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">End Time:</span>
                              <span className="text-gray-900">{formDetails.end_time || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-gray-100">
                              <span className="text-gray-600 font-medium">Participants:</span>
                              <span className="text-gray-900 font-semibold">{formDetails.participants_count || 'N/A'}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
          formType="meeting-room"
          employeeName={pendingRejection.employee_name}
          requestId={String(pendingRejection.request_id)}
        />
      )}
    </div>
  );
};

export default FacilitiesDeskDashboard;


