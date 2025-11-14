import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Key, Building, Clock, User, FileText } from 'lucide-react';

interface FacilityAccessFormData {
  access_request_type: string;
  facilities_requested: string;
  justification: string;
}

const FacilityAccessForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FacilityAccessFormData>({
    access_request_type: '',
    facilities_requested: '',
    justification: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const accessRequestTypes = [
    'New Access Card',
    'Temporary Access',
    'Extended Access Hours',
    'Other'
  ];

  const handleInputChange = (field: keyof FacilityAccessFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.profile || !('employee_code' in user.profile)) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/forms/facility-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          employee_id: user.profile.employee_code,
          employee_name: `${user.profile.firstName} ${user.profile.lastName}`,
          department: user.profile.department,
          manager: user.profile.managerName || 'N/A'
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          access_request_type: '',
          facilities_requested: '',
          justification: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.access_request_type && formData.facilities_requested && formData.justification;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facility Access Booking Form</h1>
              <p className="text-gray-600 mt-2">Request access to specific facilities and areas within the organization</p>
            </div>
          </div>

          {/* Form Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Estimated Time</p>
                <p className="text-sm text-gray-600">5-10 minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <User className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Required Approvals</p>
                <p className="text-sm text-gray-600">Line Manager, Security Officer</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
              <Building className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Form ID</p>
                <p className="text-sm text-gray-600">FAC-AC-15</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Access Request Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Access Request Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accessRequestTypes.map((type) => (
                  <label key={type} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="access_request_type"
                      value={type}
                      checked={formData.access_request_type === type}
                      onChange={(e) => handleInputChange('access_request_type', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      formData.access_request_type === type 
                        ? 'border-blue-600 bg-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {formData.access_request_type === type && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-gray-700 font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Facilities Requested */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Facilities / Areas Requested <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.facilities_requested}
                onChange={(e) => handleInputChange('facilities_requested', e.target.value)}
                placeholder="Specify which area or facility you need access to (e.g., office, lab, server room, parking area, etc.)"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                rows={4}
                required
              />
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => handleInputChange('justification', e.target.value)}
                placeholder="Provide the reason why this access is needed (e.g., project requirement, maintenance work, extended shift, etc.)"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                rows={4}
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                  isFormValid && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-green-700 font-medium">Form submitted successfully!</p>
                </div>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✗</span>
                  </div>
                  <p className="text-red-700 font-medium">Error submitting form. Please try again.</p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default FacilityAccessForm;




