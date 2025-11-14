import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Clock, Filter, RefreshCw, Eye, Save, Phone, X } from 'lucide-react';
import { useAvatarState } from '../../hooks/useAvatarState';
import ChatbotPanel, { ChatbotHandle } from '../Chatbot/ChatbotPanel';

type StatusFilter = 'All' | 'Open' | 'Resolved' | 'Closed' | 'Pending IT Action' | 'Password Set' | 'Completed';

interface ITTicket {
  request_id: string;
  form_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  contact_info: string;
  employee_system_number: string;
  incident_date: string;
  affected_system: string;
  it_helpdesk_ticket_number?: string;
  it_helpdesk_assigned_to?: string;
  incident_description?: string;
  it_helpdesk_rejected_reason?: string;
  it_resolution_notes?: string;
  it_resolution_date?: string;
  employee_confirmation_status?: string;
  employee_confirmation_date?: string;
  employee_confirmation_notes?: string;
  it_support_status: string;
  status: string;
  created_at: string;
  form_type: string;
  // Password reset specific fields
  new_password?: string;
  reset_reason?: string;
  system_for_reset?: string;
}

const statusBadge: Record<string, string> = {
  Open: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Resolved: 'bg-orange-50 text-orange-700 border border-orange-200',
  Closed: 'bg-green-50 text-green-700 border border-green-200',
  'Pending IT Action': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Password Set': 'bg-purple-50 text-purple-700 border border-purple-200',
  'Completed': 'bg-green-50 text-green-700 border border-green-200',
  'Pending Manager': 'bg-gray-50 text-gray-700 border border-gray-200',
};

const ITSupportDashboard: React.FC = () => {
  const { user } = useAuth();
  const { updateAvatar, getGifUrl } = useAvatarState();
  const itSupportName = `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim() || 'IT Support Officer';
  const [isListening, setIsListening] = React.useState(false);
  const chatbotRef = React.useRef<ChatbotHandle | null>(null);
  
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('All');
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [pendingFill, setPendingFill] = useState<ITTicket | null>(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // Password reset form state - use a map to store passwords per request_id (PRIMARY KEY)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<ITTicket | null>(null);
  const [passwordMap, setPasswordMap] = useState<Record<number, string>>({});  // Use request_id as key
  const [passwordResetProcessing, setPasswordResetProcessing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);
  
  // Clear password reset state when modal closes
  useEffect(() => {
    if (!showPasswordResetModal) {
      setPendingPasswordReset(null);
    }
  }, [showPasswordResetModal]);
  
  // Clear fill details state when modal closes
  useEffect(() => {
    if (!showFillModal) {
      setTicketNumber('');
      setIncidentDescription('');
      setResolutionNotes('');
      setPendingFill(null);
    }
  }, [showFillModal]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/it-support/queue'));
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
        console.log('✅ Loaded IT tickets:', data.length);
        
        // DEBUG: Log all form_ids to check for uniqueness
        const formIds = data.map((t: ITTicket) => t.form_id);
        const uniqueFormIds = new Set(formIds);
        console.log('🔍 [FRONTEND] Total tickets:', data.length);
        console.log('🔍 [FRONTEND] Unique form_ids:', uniqueFormIds.size);
        if (formIds.length !== uniqueFormIds.size) {
          console.warn('⚠️ [FRONTEND] DUPLICATE form_ids detected!');
          console.log('   All form_ids:', formIds);
        }
        
        // Log password reset forms specifically
        const passwordResetForms = data.filter((t: ITTicket) => 
          t.incident_type === 'Password Reset' || t.affected_system?.toLowerCase().includes('password')
        );
        console.log('🔍 [FRONTEND] Password reset forms:', passwordResetForms.length);
        passwordResetForms.forEach((form: ITTicket) => {
          console.log(`   - form_id: ${form.form_id}, system: ${form.affected_system}, status: ${form.status}`);
        });
      } else {
        setError('Failed to load IT tickets');
      }
    } catch (err) {
      console.error('Failed to fetch IT tickets:', err);
      setError('Failed to load IT tickets');
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'All') return true;
    return ticket.status === filter;
  });

  const handleFillDetails = (ticket: ITTicket) => {
    setPendingFill(ticket);
    setTicketNumber(ticket.it_helpdesk_ticket_number || '');
    setIncidentDescription(ticket.incident_description || '');
    setResolutionNotes(''); // Always start fresh for resolution notes
    setShowFillModal(true);
  };

  const handlePasswordReset = (ticket: ITTicket) => {
    // DEBUG: Log when opening password reset modal
    console.log('🔍 [FRONTEND] Opening password reset modal for:');
    console.log('   request_id (PRIMARY KEY):', ticket.request_id);
    console.log('   form_id:', ticket.form_id);
    console.log('   affected_system:', ticket.affected_system);
    console.log('   employee_id:', ticket.employee_id);
    console.log('   Current password in map for request_id', ticket.request_id, ':', passwordMap[ticket.request_id] || 'none');
    
    // Set the pending form and open modal
    setPendingPasswordReset(ticket);
    setShowPasswordResetModal(true);
  };

  const handleSaveDetails = async () => {
    // ✅ VALIDATION: Ticket number is required, resolution notes optional
    if (!pendingFill) {
      alert('❌ No ticket selected');
      return;
    }

    if (!ticketNumber.trim()) {
      alert('❌ IT Ticket Number is required');
      return;
    }

    setProcessing(true);
    
    const payload = {
      form_id: pendingFill.request_id,
      it_helpdesk_ticket_number: ticketNumber.trim(),
      it_resolution_notes: resolutionNotes.trim() || null,
      it_helpdesk_assigned_to: itSupportName
    };
    
    console.log('🔍 Sending payload to backend:', payload);
    
    try {
      const response = await fetch(getApiUrl('/api/it-support/save-ticket-details'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Ticket details saved successfully:', result);
        setShowFillModal(false);
        setPendingFill(null);
        setTicketNumber('');
        setIncidentDescription('');
        setResolutionNotes('');
        await fetchTickets();
        alert('✅ Ticket details saved successfully! The "Close" button is now available.');
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to save details: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Failed to save details:', err);
      alert('❌ Failed to save ticket details. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePasswordReset = async () => {
    if (!pendingPasswordReset) {
      alert('❌ No password reset request selected');
      return;
    }

    const password = passwordMap[pendingPasswordReset.request_id] || '';
    if (!password.trim()) {
      alert('❌ New password is required');
      return;
    }

    // DEBUG: Log what we're about to send
    console.log('🔍 [FRONTEND PASSWORD RESET DEBUG] Saving password reset:');
    console.log('   request_id (PRIMARY KEY):', pendingPasswordReset.request_id);
    console.log('   form_id:', pendingPasswordReset.form_id);
    console.log('   affected_system:', pendingPasswordReset.affected_system);
    console.log('   employee_id:', pendingPasswordReset.employee_id);
    console.log('   password length:', password.length);
    console.log('   Current passwordMap keys:', Object.keys(passwordMap));

    setPasswordResetProcessing(true);
    try {
      const requestBody = {
        request_id: pendingPasswordReset.request_id,  // Use PRIMARY KEY!
        it_helpdesk_reset_by: itSupportName,
        new_password: password,
      };
      
      console.log('🔍 [FRONTEND] Request body:', requestBody);
      
      const response = await fetch(getApiUrl('/api/it-support/save-password-reset-details'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Password reset details saved:', result);
        console.log('   Rows updated:', result.rows_updated);
        alert(`✅ Password reset details saved successfully! (Updated ${result.rows_updated} row)`);
        setShowPasswordResetModal(false);
        setPendingPasswordReset(null);
        // Clear the password for this request_id
        setPasswordMap(prev => {
          const newMap = { ...prev };
          delete newMap[pendingPasswordReset.request_id];
          return newMap;
        });
        fetchTickets(); // Refresh the list
      } else {
        const error = await response.json();
        console.error('❌ Failed to save password reset details:', error);
        alert(`❌ Failed to save password reset details: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error saving password reset details:', error);
      alert('❌ Error saving password reset details');
    } finally {
      setPasswordResetProcessing(false);
    }
  };



  const handleViewDetails = async (ticket: ITTicket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
    setDetailsLoading(true);

    try {
      const response = await fetch(getApiUrl(`/api/it-support/form-details?form_id=${ticket.request_id}&form_type=${ticket.form_type}`));
      if (response.ok) {
        const details = await response.json();
        setTicketDetails(details);
      } else {
        console.error('Failed to fetch ticket details');
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Chief Smile Officer & Chat Interface - At the Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Panel - Chief Smile Officer Profile */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center relative flex flex-col items-center justify-center h-full">
            {/* Large Centered Avatar */}
            <div className="w-48 h-48 mb-6 rounded-full overflow-hidden bg-blue-100 shadow-xl border-4 border-white flex items-center justify-center">
              <img
                src={getGifUrl}
                alt="Chief Smile Officer"
                className="w-full h-full object-cover"
                id="captain-alpha-avatar"
              />
            </div>
            
            {/* Professional Title */}
            <h3 className="text-2xl font-bold text-blue-900 mb-3">Chief Smile Officer</h3>
            
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
            onClick={fetchTickets}
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
              <option>Open</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
            <Filter className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
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
          {/* Tickets Table - Full Width Below */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {filteredTickets.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="inline-flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>No tickets found for this filter.</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Employee</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap hidden lg:table-cell">Form Type</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap hidden md:table-cell">Affected System</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap hidden lg:table-cell">Incident Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-6 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.request_id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 text-sm text-gray-700">
                      <div className="font-medium">{ticket.employee_name}</div>
                      <div className="text-xs text-gray-500">{ticket.department}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-sm text-gray-700 hidden lg:table-cell">
                      {ticket.form_type === 'it-incident' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">IT Incident</span>
                      ) : ticket.form_type === 'password-reset' ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Password Reset</span>
                      ) : (
                        ticket.form_type || 'N/A'
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-sm text-gray-700 hidden md:table-cell">{ticket.affected_system}</td>
                    <td className="px-3 sm:px-6 py-3 text-sm text-gray-600 hidden lg:table-cell">{new Date(ticket.incident_date).toLocaleDateString()}</td>
                    <td className="px-3 sm:px-6 py-3 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[ticket.status] || 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-sm text-right">
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <button 
                          onClick={() => handleViewDetails(ticket)}
                          className="group inline-flex items-center px-2 sm:px-3 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-sm"
                          disabled={loading}
                          title="View ticket details"
                        >
                          <Eye className="h-3.5 w-3.5 sm:mr-1.5 group-hover:scale-110 transition-transform duration-200" /> 
                          <span className="hidden sm:inline">View Details</span>
                        </button>
                        
                        {ticket.status === 'Open' && (
                          <>
                            {!ticket.it_helpdesk_ticket_number ? (
                            <button
                              onClick={() => handleFillDetails(ticket)}
                              className="group inline-flex items-center px-2 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                            >
                              <Save className="h-4 w-4 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                              <span className="hidden sm:inline">Fill Details</span>
                              <span className="sm:hidden">Fill</span>
                            </button>
                            ) : (
                              <button
                                onClick={() => handleFillDetails(ticket)}
                                className="group inline-flex items-center px-2 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                              >
                                <Save className="h-4 w-4 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                                <span className="hidden sm:inline">{ticket.employee_confirmation_status === 'Rejected' ? 'Update Resolution' : 'Update Details'}</span>
                                <span className="sm:hidden">Update</span>
                              </button>
                            )}
                          </>
                        )}
                        
                        {ticket.status === 'Closed' && (
                          <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            ✅ Ticket Closed
                            <div className="text-xs text-green-700 mt-1">
                              Employee confirmed problem is solved
                            </div>
                          </div>
                        )}
                        
                        {ticket.status === 'Resolved' && ticket.employee_confirmation_status === 'Pending' && (
                          <div className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            ⏳ Waiting for employee confirmation
                            <div className="text-xs text-amber-700 mt-1">
                              Employee needs to confirm if problem is solved
                            </div>
                          </div>
                        )}
                        
                        {ticket.status === 'Open' && ticket.employee_confirmation_status === 'Rejected' && (
                          <div className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                            ❌ Employee says problem not solved
                            <div className="text-xs text-red-700 mt-1">
                              Ticket returned to Open status - IT Support needs to continue working
                            </div>
                          </div>
                        )}
                        
                        {ticket.status === 'Resolved' && ticket.employee_confirmation_status === 'Confirmed' && (
                          <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            ✅ Employee confirmed problem solved
                            <div className="text-xs text-green-700 mt-1">
                              Ready to close ticket
                            </div>
                          </div>
                        )}
                        
                        {/* Password Reset Actions */}
                        {ticket.form_type === 'password-reset' && ticket.it_support_status === 'Pending IT Action' && (
                          <button
                            onClick={() => handlePasswordReset(ticket)}
                            className="group inline-flex items-center px-2 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                          >
                            <Save className="h-4 w-4 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                            <span className="hidden sm:inline">Set New Password</span>
                            <span className="sm:hidden">Password</span>
                          </button>
                        )}
                        
                        {ticket.form_type === 'password-reset' && ticket.it_support_status === 'Password Set' && (
                          <div className="text-sm text-purple-600 font-medium bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                            🔐 Password Set
                          </div>
                        )}
                        
                        {ticket.form_type === 'password-reset' && ticket.it_support_status === 'Completed' && (
                          <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            ✅ Password Reset Completed
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
        </>
      )}

      {/* Fill Details Modal */}
      {showFillModal && pendingFill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-2 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {pendingFill.it_helpdesk_ticket_number ? 'Update Ticket Details' : 'Fill Ticket Details'} - {pendingFill.employee_name}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Ticket Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Employee:</span>
                    <span className="ml-2 text-gray-900">{pendingFill.employee_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">System Number:</span>
                    <span className="ml-2 text-gray-900">{pendingFill.employee_system_number}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Affected System:</span>
                    <span className="ml-2 text-gray-900">{pendingFill.affected_system}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Incident Date:</span>
                    <span className="ml-2 text-gray-900">{new Date(pendingFill.incident_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* IT Ticket Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IT Ticket Number <span className="text-red-500">*</span> {pendingFill.it_helpdesk_ticket_number && <span className="text-green-600 text-xs">(Previously: {pendingFill.it_helpdesk_ticket_number})</span>}
                </label>
                <input
                  key={`ticket-${pendingFill?.request_id || 'new'}`}
                  type="text"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="e.g., TICKET-2025-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="off"
                />
              </div>

              {/* Incident Description (Read-Only - from employee) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Description (from employee)
                </label>
                <textarea
                  key={`incident-${pendingFill?.request_id || 'new'}`}
                  value={incidentDescription}
                  readOnly
                  disabled
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Resolution Notes - IT Support can add their notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes / Q&A {pendingFill.it_resolution_notes && <span className="text-orange-600 text-xs">(Update previous resolution)</span>}
                </label>
                <textarea
                  key={`notes-${pendingFill?.request_id || 'new'}`}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add your investigation notes, questions asked, troubleshooting steps, or resolution details here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Document your troubleshooting process, questions & answers, or resolution steps
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFillModal(false);
                  setPendingFill(null);
                  setTicketNumber('');
                  setIncidentDescription('');
                  setResolutionNotes('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={processing || !ticketNumber.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>{pendingFill.it_helpdesk_ticket_number ? 'Update Details' : 'Save Details'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-2 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                IT Ticket Details - #{selectedTicket.request_id}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : ticketDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Employee:</span>
                      <span className="ml-2">{ticketDetails.employee_name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Department:</span>
                      <span className="ml-2">{ticketDetails.department}</span>
                    </div>
                    
                    {/* Show different fields based on form type */}
                    {ticketDetails.form_type === 'password-reset' ? (
                      <>
                        <div>
                          <span className="font-semibold text-gray-700">System for Reset:</span>
                          <span className="ml-2">{ticketDetails.system_for_reset || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Reset Reason:</span>
                          <span className="ml-2">{ticketDetails.reset_reason || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Request Date:</span>
                          <span className="ml-2">{new Date(ticketDetails.created_at).toLocaleDateString()}</span>
                        </div>
                        {ticketDetails.new_password && (
                          <div>
                            <span className="font-semibold text-gray-700">New Password:</span>
                            <span className="ml-2 font-mono bg-green-50 px-2 py-1 rounded border border-green-200">{ticketDetails.new_password}</span>
                          </div>
                        )}
                        {ticketDetails.it_helpdesk_reset_by && (
                          <div>
                            <span className="font-semibold text-gray-700">Reset By:</span>
                            <span className="ml-2">{ticketDetails.it_helpdesk_reset_by}</span>
                          </div>
                        )}
                        {ticketDetails.it_helpdesk_date && (
                          <div>
                            <span className="font-semibold text-gray-700">Reset Date:</span>
                            <span className="ml-2">{new Date(ticketDetails.it_helpdesk_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="font-semibold text-gray-700">System Number:</span>
                          <span className="ml-2">{ticketDetails.employee_system_number || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Affected System:</span>
                          <span className="ml-2">{ticketDetails.affected_system || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Contact:</span>
                          <span className="ml-2">{ticketDetails.contact_info || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">Incident Date:</span>
                          <span className="ml-2">{ticketDetails.incident_date ? new Date(ticketDetails.incident_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {ticketDetails.it_helpdesk_ticket_number && (
                          <div>
                            <span className="font-semibold text-gray-700">Ticket Number:</span>
                            <span className="ml-2">{ticketDetails.it_helpdesk_ticket_number}</span>
                          </div>
                        )}
                        {ticketDetails.it_helpdesk_assigned_to && (
                          <div>
                            <span className="font-semibold text-gray-700">Assigned To:</span>
                            <span className="ml-2">{ticketDetails.it_helpdesk_assigned_to}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {(ticketDetails.incident_description || ticketDetails.reset_reason) && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-2">
                        {ticketDetails.form_type === 'password-reset' ? 'Reset Reason:' : 'Incident Description:'}
                      </span>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap">
                        {ticketDetails.form_type === 'password-reset' ? ticketDetails.reset_reason : ticketDetails.incident_description}
                      </div>
                    </div>
                  )}

                  {ticketDetails.it_resolution_notes && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-2">Resolution Notes / Q&A:</span>
                      <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap">
                        {ticketDetails.it_resolution_notes}
                      </div>
                    </div>
                  )}

                  {ticketDetails.it_helpdesk_rejected_reason && (
                    <div>
                      <span className="font-semibold text-gray-700 block mb-2">Rejection Reason:</span>
                      <div className="bg-red-50 rounded-lg p-4 text-sm text-red-900 whitespace-pre-wrap">
                        {ticketDetails.it_helpdesk_rejected_reason}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="font-semibold text-gray-700">Status:</span>
                    <span className={`ml-2 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      ticketDetails.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                      ticketDetails.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      ticketDetails.status === 'Closed' ? 'bg-green-100 text-green-800' :
                      ticketDetails.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticketDetails.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">No details available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && pendingPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-2 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Set New Password - {pendingPasswordReset.employee_name}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Password Reset Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Employee:</span>
                    <span className="ml-2 text-gray-900">{pendingPasswordReset.employee_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Department:</span>
                    <span className="ml-2 text-gray-900">{pendingPasswordReset.department}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">System for Reset:</span>
                    <span className="ml-2 text-gray-900">{pendingPasswordReset.system_for_reset || pendingPasswordReset.affected_system}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Reset Reason:</span>
                    <span className="ml-2 text-gray-900">{pendingPasswordReset.reset_reason || pendingPasswordReset.incident_description}</span>
                  </div>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  key={`password-${pendingPasswordReset?.request_id || 'new'}`}
                  type="password"
                  value={passwordMap[pendingPasswordReset.request_id] || ''}
                  onChange={(e) => {
                    setPasswordMap(prev => ({
                      ...prev,
                      [pendingPasswordReset.request_id]: e.target.value
                    }));
                  }}
                  placeholder="Enter the new password for the employee"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This password will be stored securely and provided to the employee
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setPendingPasswordReset(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePasswordReset}
                  disabled={passwordResetProcessing || !passwordMap[pendingPasswordReset.request_id]?.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg"
                >
                  {passwordResetProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2 inline" />
                      Save Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITSupportDashboard;
