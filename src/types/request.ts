export interface Request {
  id: string;
  title: string;
  description: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  submittedBy: string;
  submittedAt: string;
  department: string;
  priority: 'low' | 'medium' | 'high';
}