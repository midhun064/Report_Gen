import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, FileText, Send, CheckCircle } from 'lucide-react';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'textarea';
  value: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface InteractiveFormProps {
  formType: 'leave_request' | 'expense' | 'travel';
  initialData?: Record<string, any>;
  userInfo: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
    managerName: string;
  };
  onSubmit: (formData: Record<string, any>) => void;
}

const InteractiveForm: React.FC<InteractiveFormProps> = ({
  formType,
  initialData,
  userInfo,
  onSubmit
}) => {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isInitialized = useRef(false);

  // Define form configurations
  const formConfigs: Record<string, FormField[]> = {
    leave_request: [
      {
        name: 'start_date',
        label: 'Start Date',
        type: 'date' as const,
        value: initialData?.start_date || '',
        required: true,
        placeholder: 'Select start date'
      },
      {
        name: 'end_date',
        label: 'End Date',
        type: 'date' as const,
        value: initialData?.end_date || '',
        required: true,
        placeholder: 'Select end date'
      },
      {
        name: 'leave_type',
        label: 'Leave Type',
        type: 'select' as const,
        value: initialData?.leave_type || '',
        required: true,
        options: ['Annual', 'Sick', 'Emergency', 'Personal']
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'textarea' as const,
        value: initialData?.reason || '',
        required: true,
        placeholder: 'Please provide reason for leave'
      }
    ]
  };

  // Simple initialization - only run once when component mounts
  useEffect(() => {
    if (formConfigs[formType] && !isInitialized.current) {
      const fieldsWithInitialData = formConfigs[formType].map(field => ({
        ...field,
        value: initialData?.[field.name] || field.value || ''
      }));
      setFormFields(fieldsWithInitialData);
      isInitialized.current = true;
    }
  }, [formType]); // Only depend on formType, not initialData

  // Memoize form data to prevent unnecessary recalculations
  const currentFormData = useMemo(() => {
    return formFields.reduce((acc, field) => {
      acc[field.name] = field.value;
      return acc;
    }, {} as Record<string, any>);
  }, [formFields]);

  // Memoize completion status
  const isFormComplete = useMemo(() => {
    const requiredFields = formFields.filter(field => field.required);
    const filledRequiredFields = requiredFields.filter(field => field.value.trim() !== '');
    return requiredFields.length > 0 && filledRequiredFields.length === requiredFields.length;
  }, [formFields]);

  // Update completion status when it changes
  useEffect(() => {
    setIsComplete(isFormComplete);
  }, [isFormComplete]);

  // No longer need to notify parent of updates - form is self-contained

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormFields(prev => prev.map(field => 
      field.name === fieldName ? { ...field, value } : field
    ));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isComplete && !isSubmitting && !isSubmitted) {
      setIsSubmitting(true);
      try {
        await onSubmit(currentFormData);
        setIsSubmitted(true);
      } catch (error) {
        console.error('Form submission error:', error);
        setIsSubmitting(false);
      }
    }
  }, [isComplete, isSubmitting, isSubmitted, currentFormData, onSubmit]);

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'date':
        return (
          <input
            type="date"
            value={field.value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <select
            value={field.value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            value={field.value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required={field.required}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={field.value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 max-w-md mx-auto">
      {/* Form Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {formType === 'leave_request' && 'Leave Request Form'}
            {formType === 'expense' && 'Expense Reimbursement Form'}
            {formType === 'travel' && 'Travel Request Form'}
          </h3>
        </div>
        
        {/* Employee Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Employee Information</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Name: {userInfo.firstName} {userInfo.lastName}</div>
            <div>ID: {userInfo.employeeCode}</div>
            <div>Department: {userInfo.department}</div>
            <div>Manager: {userInfo.managerName}</div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mb-6">
        {formFields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isSubmitted ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Form submitted successfully!</span>
            </>
          ) : isSubmitting ? (
            <>
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-600">Submitting...</span>
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Form is complete</span>
            </>
          ) : (
            <>
              <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
              <span className="text-sm text-gray-500">Please fill all required fields</span>
            </>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting || isSubmitted}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
            isSubmitted
              ? 'bg-green-600 text-white cursor-not-allowed'
              : isSubmitting
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : isComplete
              ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitted ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Submitted</span>
            </>
          ) : isSubmitting ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Submit Form</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InteractiveForm;
