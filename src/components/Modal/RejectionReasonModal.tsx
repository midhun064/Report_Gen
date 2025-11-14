import React, { useState } from 'react';
import { XCircle, AlertTriangle, Send } from 'lucide-react';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  formType: string;
  employeeName: string;
  requestId: string;
}

const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  formType,
  employeeName,
  requestId
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-defined common rejection reasons for different form types
  const getSuggestedReasons = (formType: string): string[] => {
    switch (formType) {
      case 'leave-request':
        return [
          'Insufficient notice period',
          'Conflict with team workload',
          'Missing documentation',
          'Exceeds leave balance',
          'Seasonal coverage requirements'
        ];
      case 'travel-request':
        return [
          'Budget constraints',
          'Purpose unclear or insufficient',
          'Dates conflict with projects',
          'Missing cost justification',
          'Policy compliance issue'
        ];
      case 'expense-reimbursement':
        return [
          'Missing receipts',
          'Amount exceeds policy limits',
          'Personal charge included',
          'Unexpected business expense',
          'Documentation incomplete'
        ];
      case 'petty-cash':
        return [
          'Amount exceeds approved limit',
          'Purpose not business related',
          'Alternative payment method available',
          'Missing authorization',
          'Budget allocation exceeded'
        ];
      case 'it-access':
        return [
          'Security clearance insufficient',
          'Business justification needed',
          'System access policy violation',
          'Missing manager authorization',
          'Conflicts with existing access'
        ];
      case 'meeting-room':
        return [
          'Room already booked',
          'Capacity exceeds room limit',
          'Required equipment unavailable',
          'Time conflict with maintenance',
          'Approval from facilities needed'
        ];
      default:
        return [
          'Policy compliance issue',
          'Missing documentation',
          'Authorization required',
          'Budget constraints',
          'Alternative solution needed'
        ];
    }
  };

  const suggestedReasons = getSuggestedReasons(formType);

  const handleSubmit = async () => {
    if (!rejectionReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(rejectionReason.trim());
      setRejectionReason('');
      onClose();
    } catch (error) {
      console.error('Error submitting rejection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[95vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Reject Request
                </h2>
                <p className="text-xs text-gray-600">
                  {employeeName} • {formType.replace('-', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 overflow-y-auto">
          {/* Request Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600">ID:</span>
              <span className="text-xs text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                {requestId}
              </span>
            </div>
          </div>

          {/* Compact Warning */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-yellow-700">
                  Provide constructive feedback to help the employee improve future requests.
                </p>
              </div>
            </div>
          </div>

          {/* Suggested Reasons */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-700 mb-2 block">
              Quick Select:
            </label>
            <div className="flex flex-wrap gap-1">
              {suggestedReasons.slice(0, 5).map((reason, index) => (
                <button
                  key={index}
                  onClick={() => setRejectionReason(reason)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-4">
            <label htmlFor="rejectionReason" className="block text-xs font-medium text-gray-700 mb-1">
              Rejection Reason *
            </label>
            <textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter reason..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              required
            />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{rejectionReason.length}/300</span>
              <span className="text-gray-400">Ctrl+Enter to submit</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rejectionReason.trim() || isSubmitting}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                <span>Rejecting...</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                <span>Reject</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionReasonModal;
