import React, { useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import ChatbotPanel, { ChatbotHandle } from '../Chatbot/ChatbotPanel';
import FormRouter from '../Forms/FormRouter';
import UserFormsManager from '../Forms/UserFormsManager';
import { useForm } from '../../context/FormContext';
import { useAvatarState } from '../../hooks/useAvatarState';
import { FormSummary } from '../../services/userFormsService';

const Dashboard: React.FC = () => {
  const { currentForm } = useForm();
  const { updateAvatar, getGifUrl } = useAvatarState();
  const [selectedFormType, setSelectedFormType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [formSummaries, setFormSummaries] = useState<FormSummary[]>([]);
  const chatbotRef = React.useRef<ChatbotHandle | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle form data changes from UserFormsManager
  const handleFormDataChange = (summaries: FormSummary[]) => {
    setFormSummaries(summaries);
  };

  // Handle refresh - reload form data
  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing employee dashboard data...');
      
      // Force refresh by changing the key to trigger UserFormsManager re-render
      setRefreshKey(prev => prev + 1);
      setFormSummaries([]); // Clear current data
      
      console.log('✅ Employee dashboard refresh triggered');
      
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    }
  };

  // Calculate total forms for status filter counts
  const getTotalForms = () => {
    return formSummaries.reduce((total, summary) => total + summary.count, 0);
  };

  // Calculate counts for filter buttons
  const getFormTypeCount = (formType: string) => {
    if (formType === 'All') {
      return getTotalForms();
    }
    const summary = formSummaries.find(s => s.formType === formType);
    return summary ? summary.count : 0;
  };

  // Helper function to map form status to filter categories
  const getStatusCategory = (summary: FormSummary): string => {
    const status = summary.status?.toLowerCase() || 'pending';
    
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

  // Calculate counts for status filter
  const getStatusCount = (statusFilter: string) => {
    if (statusFilter === 'All') {
      return getTotalForms();
    }
    return formSummaries.filter(summary => {
      if (statusFilter === 'Pending') return summary.status === 'Pending';
      if (statusFilter === 'Approved') return summary.status === 'Approved';
      if (statusFilter === 'Rejected') return summary.status === 'Rejected';
      if (statusFilter === 'Open') return getStatusCategory(summary) === 'Open';
      if (statusFilter === 'Close') return getStatusCategory(summary) === 'Close';
      if (statusFilter === 'Resolve') return getStatusCategory(summary) === 'Resolve';
      if (statusFilter === 'Update') return getStatusCategory(summary) === 'Update';
      if (statusFilter === 'In Progress') return getStatusCategory(summary) === 'In Progress';
      return false;
    }).reduce((total, summary) => total + summary.count, 0);
  };


  // If a specific form is selected, show the form router
  if (currentForm && currentForm !== 'none') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <FormRouter />
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 relative space-y-4 sm:space-y-6">


      {/* Main Content Layout - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <ChatbotPanel 
            ref={(ref) => {
              chatbotRef.current = ref;
            }}
            onAvatarStateChange={updateAvatar} 
          />
          </div>
        </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sky-600 to-sky-500 text-white rounded-lg font-medium hover:from-sky-500 hover:to-sky-400 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
          <div className="relative">
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="appearance-none pl-9 pr-10 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All ({getStatusCount('All')})</option>
            <option value="Pending">Pending ({getStatusCount('Pending')})</option>
            <option value="Approved">Approved ({getStatusCount('Approved')})</option>
            <option value="Rejected">Rejected ({getStatusCount('Rejected')})</option>
            <option value="Open">Open ({getStatusCount('Open')})</option>
            <option value="Close">Close ({getStatusCount('Close')})</option>
            <option value="Resolve">Resolve ({getStatusCount('Resolve')})</option>
            <option value="Update">Update ({getStatusCount('Update')})</option>
            <option value="In Progress">In Progress ({getStatusCount('In Progress')})</option>
          </select>
          <Filter className="h-4 w-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
        </div>
      </div>


      {/* Form Type Filter Buttons - Employee Forms */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setSelectedFormType('All')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              selectedFormType === 'All'
                ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
            }`}
          >
            All Forms ({getFormTypeCount('All')})
          </button>
          {getFormTypeCount('leave-request') > 0 && (
            <button
              onClick={() => setSelectedFormType('leave-request')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'leave-request'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Leave Request ({getFormTypeCount('leave-request')})
            </button>
          )}
          {getFormTypeCount('travel-request') > 0 && (
            <button
              onClick={() => setSelectedFormType('travel-request')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'travel-request'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Travel Request ({getFormTypeCount('travel-request')})
            </button>
          )}
          {getFormTypeCount('petty-cash') > 0 && (
            <button
              onClick={() => setSelectedFormType('petty-cash')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'petty-cash'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Petty Cash ({getFormTypeCount('petty-cash')})
            </button>
          )}
          {getFormTypeCount('it-incident') > 0 && (
            <button
              onClick={() => setSelectedFormType('it-incident')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'it-incident'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              IT Incident ({getFormTypeCount('it-incident')})
            </button>
          )}
          {getFormTypeCount('meeting-room') > 0 && (
            <button
              onClick={() => setSelectedFormType('meeting-room')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'meeting-room'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Meeting Room ({getFormTypeCount('meeting-room')})
            </button>
          )}
          {getFormTypeCount('info-update') > 0 && (
            <button
              onClick={() => setSelectedFormType('info-update')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'info-update'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Info Update ({getFormTypeCount('info-update')})
            </button>
          )}
          {getFormTypeCount('facility-access') > 0 && (
            <button
              onClick={() => setSelectedFormType('facility-access')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'facility-access'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Facility Access ({getFormTypeCount('facility-access')})
            </button>
          )}
          {getFormTypeCount('purchase-requisition') > 0 && (
            <button
              onClick={() => setSelectedFormType('purchase-requisition')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'purchase-requisition'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Purchase Requisitions ({getFormTypeCount('purchase-requisition')})
            </button>
          )}
          {getFormTypeCount('password-reset') > 0 && (
            <button
              onClick={() => setSelectedFormType('password-reset')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                selectedFormType === 'password-reset'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-white shadow-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-md hover:shadow-lg border border-gray-200'
              }`}
            >
              Password Reset ({getFormTypeCount('password-reset')})
            </button>
          )}
        </div>
      </div>

      {/* Your Forms & Requests - Full Width Like Manager Dashboard */}
      <div className="mt-6">
        <UserFormsManager 
          key={refreshKey}
          embedded 
          selectedFormType={selectedFormType}
          selectedStatus={selectedStatus}
          onFormDataChange={handleFormDataChange} 
        />
      </div>


    </div>
  );
};

export default Dashboard;