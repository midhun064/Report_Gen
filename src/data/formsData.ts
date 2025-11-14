export interface FormData {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  bgColor: string;
  status: 'active' | 'coming-soon' | 'maintenance';
  estimatedTime: string;
  requiredApprovals: string[];
  keywords: string[];
  formType: string;
  priority: 'high' | 'medium' | 'low';
}

export const FORMS_DATA: FormData[] = [
  {
    id: 'FAC-AC-15',
    title: 'Facility Access Booking Form',
    description: 'Request access to specific facilities and areas within the organization',
    category: 'Facilities & Operations',
    icon: 'Key',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    status: 'active',
    estimatedTime: '5-10 minutes',
    requiredApprovals: ['Line Manager', 'Security Officer'],
    keywords: ['facility', 'access', 'security', 'card', 'temporary', 'visitor', 'contractor'],
    formType: 'facility-access',
    priority: 'medium'
  },
  {
    id: 'IT-PWD-16',
    title: 'Password Reset Request Form',
    description: 'Request password reset for various systems and accounts',
    category: 'Information Technology',
    icon: 'Shield',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    status: 'active',
    estimatedTime: '3-5 minutes',
    requiredApprovals: ['Line Manager', 'IT Helpdesk'],
    keywords: ['password', 'reset', 'account', 'login', 'security', 'access', 'system'],
    formType: 'password-reset',
    priority: 'high'
  },
  {
    id: 'FIN-PR-08',
    title: 'Purchase Requisition Form',
    description: 'Submit purchase requests for items needed for business operations',
    category: 'Finance',
    icon: 'ShoppingCart',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    status: 'active',
    estimatedTime: '10-15 minutes',
    requiredApprovals: ['Department Head', 'Finance Officer'],
    keywords: ['purchase', 'requisition', 'procurement', 'items', 'supplies', 'equipment', 'budget'],
    formType: 'purchase-requisition',
    priority: 'medium'
  }
];

export const FORM_CATEGORIES = [
  'All Forms',
  'Human Resources',
  'Finance',
  'Information Technology',
  'Facilities & Operations'
];

export const getFormsByCategory = (category: string): FormData[] => {
  if (category === 'All Forms') {
    return FORMS_DATA;
  }
  return FORMS_DATA.filter(form => form.category === category);
};

export const searchForms = (query: string): FormData[] => {
  const lowercaseQuery = query.toLowerCase();
  return FORMS_DATA.filter(form => 
    form.title.toLowerCase().includes(lowercaseQuery) ||
    form.description.toLowerCase().includes(lowercaseQuery) ||
    form.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
  );
};
