import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../config/api';
// import { useAuth } from '../../context/AuthContext'; // not used
import { RefreshCw, Eye, Trash2, AlertTriangle, MessageSquare, X, FileText, Clock } from 'lucide-react';

type FormType = 'All' | 'Leave Requests' | 'Travel Requests' | 'Petty Cash Requests' | 
                'Purchase Requisitions' | 'IT Incidents' | 'Password Resets' | 
                'Facility Bookings' | 'Meeting Room Bookings';

interface Form {
  id: string;
  form_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any; // For form-specific fields
}

interface AllForms {
  leave_requests: Form[];
  travel_requests: Form[];
  petty_cash_requests: Form[];
  purchase_requisitions: Form[];
  it_incidents: Form[];
  password_resets: Form[];
  facility_bookings: Form[];
  meeting_room_bookings: Form[];
}

const formTypeLabels: Record<string, string> = {
  'Leave Requests': 'leave_requests',
  'Travel Requests': 'travel_requests',
  'Petty Cash Requests': 'petty_cash_requests',
  'Purchase Requisitions': 'purchase_requisitions',
  'IT Incidents': 'it_incidents',
  'Password Resets': 'password_resets',
  'Facility Bookings': 'facility_bookings',
  'Meeting Room Bookings': 'meeting_room_bookings'
};

const statusBadge: Record<string, string> = {
  Open: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Approved: 'bg-green-50 text-green-700 border border-green-200',
  Rejected: 'bg-red-50 text-red-700 border border-red-200',
  Completed: 'bg-blue-50 text-blue-700 border border-blue-200',
  Closed: 'bg-gray-50 text-gray-700 border border-gray-200',
};

interface Session {
  session_id: string;
  user_id: string;
  user_role: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
  chat_history?: Array<{ timestamp: string; type: string; content: string }>;
  [key: string]: any;
}

const LegalStaffDashboard: React.FC = () => {
  // const { user } = useAuth(); // user is not used
  const [allForms, setAllForms] = useState<AllForms>({
    leave_requests: [],
    travel_requests: [],
    petty_cash_requests: [],
    purchase_requisitions: [],
    it_incidents: [],
    password_resets: [],
    facility_bookings: [],
    meeting_room_bookings: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FormType>('All');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePending, setDeletePending] = useState<{ formType: string; form: Form } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'forms' | 'sessions'>('forms');
  const [showChatView, setShowChatView] = useState(false);

  useEffect(() => {
    fetchAllForms();
  }, []);

  const fetchAllForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/legal/all-forms'));
      if (response.ok) {
        const data = await response.json();
        setAllForms(data);
      } else {
        setError('Failed to load forms');
      }
    } catch (err) {
      console.error('Failed to fetch forms:', err);
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredForms = (): Form[] => {
    if (filter === 'All') {
      return Object.values(allForms).flat();
    }
    const formTypeKey = formTypeLabels[filter];
    return allForms[formTypeKey as keyof AllForms] || [];
  };

  const handleViewDetails = (form: Form) => {
    setSelectedForm(form);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (form: Form, formType: string) => {
    setDeletePending({ formType, form });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletePending) return;

    try {
      const response = await fetch(
        getApiUrl(`/api/legal/delete-form/${deletePending.formType}/${deletePending.form.id}`),
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchAllForms();
        setShowDeleteModal(false);
        setDeletePending(null);
        alert('✅ Form deleted successfully!');
      } else {
        const error = await response.json();
        alert(`❌ Failed to delete form: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete form:', err);
      alert('❌ Failed to delete form. Please try again.');
    }
  };

  const getFormTypeName = (form: Form): string => {
    for (const [label, key] of Object.entries(formTypeLabels)) {
      if (form.id && allForms[key as keyof AllForms]?.some(f => f.id === form.id)) {
        return label;
      }
    }
    return 'Unknown';
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/legal/sessions'));
      if (response.ok) {
        const sessionData = await response.json();
        setSessions(sessionData);
      } else {
        const error = await response.json();
        console.error('Failed to fetch sessions:', error);
        setError('Failed to load chat histories');
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load chat histories');
    } finally {
      setSessionsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/legal/delete-session/${sessionId}`), { method: 'DELETE' });
      if (response.ok) {
        await fetchSessions();
        alert('✅ Chat history deleted successfully!');
      } else {
        alert('❌ Failed to delete chat history');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('❌ Failed to delete chat history');
    }
  };

  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    setShowChatView(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Legal Staff Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">View and manage all organization forms</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidePanel(!showSidePanel)}
                className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {showSidePanel ? 'Hide Panel' : 'Show Panel'}
              </button>
              <button
                onClick={fetchAllForms}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                <RefreshCw className={`h-4 w-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Side Panel */}
      <div className="flex">
        {/* Side Panel (slides in on mobile, sticky on desktop) */}
        <div
          className={
            `${showSidePanel ? 'translate-x-0' : '-translate-x-full'}
             fixed lg:relative top-[80px] left-0 h-[calc(100vh-80px)] w-[85vw] max-w-sm lg:w-80
             bg-white border-r border-gray-200 overflow-y-auto z-40 transition-transform duration-300 ease-in-out
             lg:translate-x-0 lg:sticky`
          }
        >
          <div className="p-4">
            {/* Tab Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSidePanelTab('forms')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  sidePanelTab === 'forms'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Form Management
              </button>
              <button
                onClick={() => {
                  setSidePanelTab('sessions');
                  fetchSessions();
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  sidePanelTab === 'sessions'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Session Management
              </button>
            </div>

            {/* Forms Tab Content */}
            {sidePanelTab === 'forms' && (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700 mb-3">Form Type Filter</div>
                {['All', 'Leave Requests', 'Travel Requests', 'Petty Cash Requests', 
                  'Purchase Requisitions', 'IT Incidents', 'Password Resets', 
                  'Facility Bookings', 'Meeting Room Bookings'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type as FormType)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      filter === type
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {/* Sessions Tab Content */}
            {sidePanelTab === 'sessions' && (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700 mb-3">Chat Histories</div>
                {sessionsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 text-blue-600 mx-auto animate-spin" />
                    <p className="text-sm text-gray-600 mt-2">Loading...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600 mt-2">No chat histories</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div key={session.session_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-gray-900 text-sm">{session.user_id}</div>
                        <div className="text-xs text-gray-600 mt-1">{session.user_role}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Created: {new Date(session.created_at).toLocaleDateString()}
                        </div>
                        {(session.chat_history && session.chat_history.length > 0) ? (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            {session.chat_history.length} message(s)
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1 italic">
                            No messages yet
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleViewSession(session)}
                            className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                          >
                            View Chat
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this chat history?')) {
                                deleteSession(session.session_id);
                              }
                            }}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Dark overlay when panel is open on mobile */}
        {showSidePanel && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden"
            onClick={() => setShowSidePanel(false)}
          />
        )}

      {/* Main Content - Conditional based on selected tab */}
      <div className="flex-1 flex overflow-x-hidden">
        {/* Form Management View */}
        {sidePanelTab === 'forms' && (
          <div className={`flex-1 px-4 sm:px-6 lg:px-8 py-8 ${showChatView ? 'lg:w-1/2' : 'w-full'}`}>

          {/* Loading or Error State */}
          {loading && (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
              <p className="mt-4 text-gray-600">Loading forms...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Forms Table */}
          {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Form Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Form ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getFilteredForms().map((form) => (
                    <tr key={`${form.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {getFormTypeName(form)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="font-medium">{form.employee_name}</div>
                        <div className="text-xs text-gray-500">{form.department}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{form.form_id}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          statusBadge[form.status] || 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {form.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(form.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(form)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Eye className="h-4 w-4 inline mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              const formType = Object.entries(formTypeLabels).find(
                                ([_, key]) => allForms[key as keyof AllForms]?.some(f => f.id === form.id)
                              )?.[1] || '';
                              handleDeleteClick(form, formType);
                            }}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {/* Empty State */}
          {!loading && !error && getFilteredForms().length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-4 text-gray-600">No forms found</p>
            </div>
          )}
          </div>
        )}

        {/* Session Management View - Only show chat when a session is selected */}
        {sidePanelTab === 'sessions' && !showChatView && (
          <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Session Management</h3>
              <p className="text-gray-600">Select a session from the side panel to view the conversation.</p>
            </div>
          </div>
        )}
        </div>

        {/* Chat View Panel - Only show when Session Management tab is active */}
        {sidePanelTab === 'sessions' && showChatView && selectedSession && (
          <div className="w-full lg:border-l lg:border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Chat Conversation</h3>
                <p className="text-sm text-gray-600">{selectedSession.user_id} - {selectedSession.user_role}</p>
              </div>
              <button
                onClick={() => {
                  setShowChatView(false);
                  setSelectedSession(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const messages = selectedSession.chat_history || selectedSession.conversation_history || [];
                return messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((msg: any, index: number) => (
                      <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.type === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                            : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        }`}>
                          <div className="font-semibold text-xs mb-1 opacity-75">
                            {msg.type === 'user' ? '👤 You' : '🤖 Assistant'}
                          </div>
                          <div className={msg.type === 'user' ? 'text-white text-sm' : 'text-gray-700 text-sm'}>
                            {msg.content}
                          </div>
                          <div className={`text-xs mt-2 opacity-60 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(msg.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg text-gray-600 mb-2">No chat messages</p>
                    <p className="text-sm text-gray-500">This session was created but no messages were exchanged.</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Form Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(selectedForm).map(([key, value]) => (
                  <div key={key} className="border-b pb-2">
                    <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}: </span>
                    <span className="text-gray-900">{String(value || 'N/A')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletePending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
                <h3 className="text-xl font-bold text-gray-900 ml-3">Confirm Delete</h3>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this form? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePending(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LegalStaffDashboard;

