// Service to fetch user-specific form data from backend
import { getApiUrl } from '../config/api';

export interface UserFormData {
  [formType: string]: any[];
}

export interface FormSummary {
  formType: string;
  title: string;
  count: number;
  latestDate: string;
  status: string;
  category: string;
  icon: string;
  color: string;
  bgColor: string;
  statusBreakdown?: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

// Cache to prevent duplicate API calls
const formsCache = new Map<string, { data: UserFormData; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

export const userFormsService = {
  // Fetch all forms with data for the current user (with caching)
  async getUserForms(employeeId: string, forceRefresh = false): Promise<UserFormData> {
    const cacheKey = employeeId;
    const now = Date.now();
    
    // Check cache first
    if (!forceRefresh && formsCache.has(cacheKey)) {
      const cached = formsCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log('🔍 UserFormsService: Using cached data for employee_id:', employeeId);
        return cached.data;
      } else {
        // Cache expired, remove it
        formsCache.delete(cacheKey);
      }
    }
    
    try {
      console.log('🔍 UserFormsService: Fetching forms for employee_id:', employeeId);
      const response = await fetch(getApiUrl(`/api/forms/user-forms?employee_id=${employeeId}`));
      if (!response.ok) {
        throw new Error(`Failed to fetch user forms: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('🔍 UserFormsService: Received data:', data);
      
      // Cache the result
      formsCache.set(cacheKey, { data, timestamp: now });
      
      return data;
    } catch (error) {
      console.error('❌ UserFormsService: Error fetching user forms:', error);
      return {};
    }
  },
  
  // Clear cache for a specific user or all users
  clearCache(employeeId?: string) {
    if (employeeId) {
      formsCache.delete(employeeId);
      console.log('🔍 UserFormsService: Cache cleared for employee_id:', employeeId);
    } else {
      formsCache.clear();
      console.log('🔍 UserFormsService: All cache cleared');
    }
  },

  // Get form metadata for a specific form type
  getFormMetadata(formType: string) {
    const formMetadata = {
      'leave-request': {
        title: 'Leave Requests',
        category: 'Human Resources',
        icon: 'Calendar',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      'employee-onboarding': {
        title: 'Employee Onboarding',
        category: 'Human Resources',
        icon: 'Users',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50'
      },
      'expense-reimbursement': {
        title: 'Expense Reimbursements',
        category: 'Finance',
        icon: 'Receipt',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      'it-access': {
        title: 'IT Access Requests',
        category: 'Information Technology',
        icon: 'Shield',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50'
      },
      'exit-clearance': {
        title: 'Exit/Clearance Forms',
        category: 'Human Resources',
        icon: 'LogOut',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      'travel-request': {
        title: 'Travel Requests',
        category: 'Human Resources',
        icon: 'Plane',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      'info-update': {
        title: 'Employee Info Updates',
        category: 'Human Resources',
        icon: 'User',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      'petty-cash': {
        title: 'Petty Cash Requests',
        category: 'Finance',
        icon: 'Banknote',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      },
      'purchase-requisition': {
        title: 'Purchase Requisitions',
        category: 'Finance',
        icon: 'ShoppingCart',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      'medical-claim': {
        title: 'Medical Claims',
        category: 'Finance',
        icon: 'Heart',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50'
      },
      'mileage-claim': {
        title: 'Mileage Claims',
        category: 'Finance',
        icon: 'Car',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      },
      'it-incident': {
        title: 'IT Incidents',
        category: 'Information Technology',
        icon: 'AlertTriangle',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      'meeting-room': {
        title: 'Meeting Room Bookings',
        category: 'Facilities & Operations',
        icon: 'Users',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50'
      },
      'transport-request': {
        title: 'Transport Requests',
        category: 'Facilities & Operations',
        icon: 'Bus',
        color: 'text-lime-600',
        bgColor: 'bg-lime-50'
      },
      'facility-access': {
        title: 'Facility Access Requests',
        category: 'Facilities & Operations',
        icon: 'Building',
        color: 'text-slate-600',
        bgColor: 'bg-slate-50'
      },
      'password-reset': {
        title: 'Password Reset Requests',
        category: 'Information Technology',
        icon: 'Shield',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      'maintenance-request': {
        title: 'Maintenance Requests',
        category: 'Facilities & Operations',
        icon: 'Wrench',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      'safety-incident': {
        title: 'Safety Incidents',
        category: 'Facilities & Operations',
        icon: 'AlertCircle',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      'nda-request': {
        title: 'NDA Requests',
        category: 'Legal',
        icon: 'FileText',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      },
      'contract-approval': {
        title: 'Contract Approvals',
        category: 'Legal',
        icon: 'FileText',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100'
      }
    };

    return formMetadata[formType as keyof typeof formMetadata];
  },

  // Get form summaries for display
  getFormSummaries(userForms: UserFormData): FormSummary[] {
    const formMetadata = {
      'leave-request': {
        title: 'Leave Requests',
        category: 'Human Resources',
        icon: 'Calendar',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      'employee-onboarding': {
        title: 'Employee Onboarding',
        category: 'Human Resources',
        icon: 'Users',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50'
      },
      'expense-reimbursement': {
        title: 'Expense Reimbursements',
        category: 'Finance',
        icon: 'Receipt',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50'
      },
      'it-access': {
        title: 'IT Access Requests',
        category: 'Information Technology',
        icon: 'Shield',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50'
      },
      'exit-clearance': {
        title: 'Exit/Clearance Forms',
        category: 'Human Resources',
        icon: 'LogOut',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      'travel-request': {
        title: 'Travel Requests',
        category: 'Human Resources',
        icon: 'Plane',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      'info-update': {
        title: 'Employee Info Updates',
        category: 'Human Resources',
        icon: 'User',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      'petty-cash': {
        title: 'Petty Cash Requests',
        category: 'Finance',
        icon: 'Banknote',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      },
      'purchase-requisition': {
        title: 'Purchase Requisitions',
        category: 'Finance',
        icon: 'ShoppingCart',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      'medical-claim': {
        title: 'Medical Claims',
        category: 'Finance',
        icon: 'Heart',
        color: 'text-pink-600',
        bgColor: 'bg-pink-50'
      },
      'mileage-claim': {
        title: 'Mileage Claims',
        category: 'Finance',
        icon: 'Car',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      },
      'it-incident': {
        title: 'IT Incidents',
        category: 'Information Technology',
        icon: 'AlertTriangle',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      'meeting-room': {
        title: 'Meeting Room Bookings',
        category: 'Facilities & Operations',
        icon: 'Users',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50'
      },
      'transport-request': {
        title: 'Transport Requests',
        category: 'Facilities & Operations',
        icon: 'Bus',
        color: 'text-lime-600',
        bgColor: 'bg-lime-50'
      },
      'facility-access': {
        title: 'Facility Access Requests',
        category: 'Facilities & Operations',
        icon: 'Building',
        color: 'text-slate-600',
        bgColor: 'bg-slate-50'
      },
      'password-reset': {
        title: 'Password Reset Requests',
        category: 'Information Technology',
        icon: 'Shield',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      'maintenance-request': {
        title: 'Maintenance Requests',
        category: 'Facilities & Operations',
        icon: 'Wrench',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      },
      'safety-incident': {
        title: 'Safety Incidents',
        category: 'Facilities & Operations',
        icon: 'AlertCircle',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      },
      'nda-request': {
        title: 'NDA Requests',
        category: 'Legal',
        icon: 'FileText',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      },
      'contract-approval': {
        title: 'Contract Approvals',
        category: 'Legal',
        icon: 'FileText',
        color: 'text-slate-700',
        bgColor: 'bg-slate-100'
      }
    };

    const summaries: FormSummary[] = [];


    Object.entries(userForms).forEach(([formType, forms]) => {
      if (forms && forms.length > 0) {
        const metadata = formMetadata[formType as keyof typeof formMetadata];
        if (metadata) {
          // Get the latest form by created_at
          const latestForm = forms.reduce((latest, current) => {
            const latestDate = new Date(latest.created_at || 0);
            const currentDate = new Date(current.created_at || 0);
            return currentDate > latestDate ? current : latest;
          });

          // Calculate status breakdown for all forms of this type
          const statusBreakdown = {
            pending: 0,
            approved: 0,
            rejected: 0
          };

          forms.forEach(form => {
            const formStatus = (form.status as string || 'Pending').toLowerCase();
            if (formStatus === 'approved') {
              statusBreakdown.approved++;
            } else if (formStatus === 'rejected') {
              statusBreakdown.rejected++;
            } else {
              statusBreakdown.pending++;
            }
          });

          // Use original database status from the latest record for table display
          const baseStatus = (latestForm.status as string) || 'Pending';

          summaries.push({
            formType,
            title: metadata.title,
            count: forms.length,
            latestDate: latestForm.created_at || '',
            status: baseStatus,
            category: metadata.category,
            icon: metadata.icon,
            color: metadata.color,
            bgColor: metadata.bgColor,
            statusBreakdown
          });
        }
      }
    });

    // Sort by latest date (most recent first)
    return summaries.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }
};
