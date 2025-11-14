import React, { useState } from 'react';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface PasswordResetFormData {
  system_for_reset: string;
  reset_reason: string;
}

const PasswordResetForm: React.FC = () => {
  const [formData, setFormData] = useState<PasswordResetFormData>({
    system_for_reset: '',
    reset_reason: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const systemOptions = [
    { value: 'Email', label: 'Email' },
    { value: 'ERP', label: 'ERP' },
    { value: 'CRM', label: 'CRM' },
    { value: 'VPN', label: 'VPN' },
    { value: 'Other', label: 'Other' }
  ];

  const reasonOptions = [
    { value: 'Forgotten Password', label: 'Forgotten Password' },
    { value: 'Locked Account', label: 'Locked Account' },
    { value: 'Security Concern', label: 'Security Concern (e.g., suspected compromise)' },
    { value: 'Other', label: 'Other' }
  ];

  const handleSystemChange = (system: string) => {
    setFormData(prev => ({
      ...prev,
      system_for_reset: system
    }));
  };

  const handleReasonChange = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      reset_reason: reason
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.system_for_reset) {
      newErrors.system_for_reset = 'Please select a system';
    }

    if (!formData.reset_reason) {
      newErrors.reset_reason = 'Please select a reason for reset';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare the form data for submission
      const submissionData = {
        system_for_reset: formData.system_for_reset,
        reset_reason: formData.reset_reason
      };

      // Here you would typically submit to your API
      console.log('Password Reset Form Data:', submissionData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form after successful submission
      setFormData({
        system_for_reset: '',
        reset_reason: ''
      });
      
      alert('Password reset request submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <div className="p-3 bg-purple-100 rounded-lg mr-4">
          <Shield className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Password Reset Request Form</h2>
          <p className="text-gray-600">Request password reset for various systems and accounts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* System Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            System for Password Reset
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-4">Select the system where the password needs to be reset</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {systemOptions.map((option) => (
              <label key={option.value} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="system"
                  value={option.value}
                  checked={formData.system_for_reset === option.value}
                  onChange={() => handleSystemChange(option.value)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          
          {errors.system_for_reset && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.system_for_reset}
            </p>
          )}
        </div>


        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Reason for Reset
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-4">Select the appropriate reason</p>
          
          <div className="space-y-3">
            {reasonOptions.map((option) => (
              <label key={option.value} className="flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value={option.value}
                  checked={formData.reset_reason === option.value}
                  onChange={() => handleReasonChange(option.value)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 mt-1"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          
          {errors.reset_reason && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.reset_reason}
            </p>
          )}
        </div>


        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordResetForm;
