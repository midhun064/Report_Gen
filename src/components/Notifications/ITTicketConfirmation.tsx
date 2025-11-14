import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/api';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../config/api';

interface ITTicketConfirmation {
  request_id: string;
  form_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  incident_date: string;
  affected_system: string;
  incident_description: string;
  it_helpdesk_ticket_number: string;
  it_helpdesk_assigned_to: string;
  it_resolution_notes: string;
  it_resolution_date: string;
  status: string;
  employee_confirmation_status: string;
  created_at: string;
}

const ITTicketConfirmation: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ITTicketConfirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingConfirmations();
  }, []);

  const fetchPendingConfirmations = async () => {
    if (!user?.profile || !('employee_code' in user.profile)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        getApiUrl(`/api/user-confirmation/pending-confirmations?employee_id=${user.profile.employee_code}`
      ));

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        // Handle different error types
        if (response.status === 404) {
          setError('API endpoint not found. Please ensure the backend server is running.');
        } else if (response.status === 500) {
          setError('Server error. Please check the backend logs.');
        } else {
          try {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to fetch pending confirmations');
          } catch {
            setError(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch pending confirmations:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to backend server. Please ensure it is running on port 5001.');
      } else {
        setError('Failed to fetch pending confirmations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProblemSolved = async (ticket: ITTicketConfirmation) => {
    const confirmationNotes = prompt(
      `Confirm that your IT problem is solved:\n\nTicket: ${ticket.it_helpdesk_ticket_number}\nProblem: ${ticket.incident_description}\n\nIT Support Notes: ${ticket.it_resolution_notes}\n\nAdd any additional notes (optional):`
    );

    if (confirmationNotes === null) return; // User cancelled

    setProcessing(ticket.request_id);

    try {
      const response = await fetch(getApiUrl('/api/user-confirmation/confirm-problem-solved'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: ticket.request_id,
          employee_id: user?.profile && 'employee_code' in user.profile ? user.profile.employee_code : '',
          confirmation_notes: confirmationNotes
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Problem confirmed as solved!\n\nTicket: ${ticket.it_helpdesk_ticket_number}\n\nIT Support can now close this ticket.`);
        await fetchPendingConfirmations();
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to confirm problem solved:\n${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to confirm problem solved:', err);
      alert('❌ Failed to confirm problem solved. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectResolution = async (ticket: ITTicketConfirmation) => {
    const rejectionReason = prompt(
      `The IT problem is still not solved. Please explain what's still wrong:\n\nTicket: ${ticket.it_helpdesk_ticket_number}\nProblem: ${ticket.incident_description}\nIT Support Notes: ${ticket.it_resolution_notes}\n\nWhat's still not working?`
    );

    if (!rejectionReason || rejectionReason.trim().length < 10) {
      alert('❌ Please provide a detailed explanation (at least 10 characters) of what is still not working.');
      return;
    }

    setProcessing(ticket.request_id);

    try {
      const response = await fetch(getApiUrl('/api/user-confirmation/reject-resolution'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: ticket.request_id,
          employee_id: user?.profile && 'employee_code' in user.profile ? user.profile.employee_code : '',
          rejection_reason: rejectionReason
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`❌ Resolution rejected!\n\nTicket: ${ticket.it_helpdesk_ticket_number}\n\nIT Support will continue working on this ticket.`);
        await fetchPendingConfirmations();
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to reject resolution:\n${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to reject resolution:', err);
      alert('❌ Failed to reject resolution. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading IT ticket confirmations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
        <div className="flex items-center justify-between text-red-600">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Error: {error}</span>
          </div>
          <button
            onClick={fetchPendingConfirmations}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="text-center text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No IT Tickets Awaiting Confirmation</h3>
          <p className="text-sm text-gray-600">All your IT tickets are up to date!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">IT Ticket Confirmations</h3>
        <p className="text-sm text-gray-600">Please confirm if your IT problems have been solved</p>
      </div>

      <div className="divide-y divide-gray-200">
        {tickets.map((ticket) => (
          <div key={ticket.request_id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-900">
                      Ticket #{ticket.it_helpdesk_ticket_number}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Resolved: {new Date(ticket.it_resolution_date).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Problem:</span>
                    <p className="text-sm text-gray-900 mt-1">{ticket.incident_description}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">IT Support Resolution:</span>
                    <p className="text-sm text-gray-900 mt-1 bg-blue-50 p-3 rounded-lg">
                      {ticket.it_resolution_notes}
                    </p>
                  </div>

                  <div className="text-xs text-gray-500">
                    Assigned to: {ticket.it_helpdesk_assigned_to}
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleConfirmProblemSolved(ticket)}
                  disabled={processing === ticket.request_id}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing === ticket.request_id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Problem Solved
                </button>

                <button
                  onClick={() => handleRejectResolution(ticket)}
                  disabled={processing === ticket.request_id}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing === ticket.request_id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Still Having Issues
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ITTicketConfirmation;
