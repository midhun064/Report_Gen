import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from '../../context/FormContext';
import { userFormsService, UserFormData } from '../../services/userFormsService';
import { Database, X, List, Grid3X3 } from 'lucide-react';

type ViewMode = 'grid' | 'list';

const formatValue = (value: unknown, key?: string, formType?: string): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  
  // Format currency for petty cash amount_requested field
  if (formType === 'petty-cash' && key === 'amount_requested') {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isNaN(numValue)) {
      return `IDR ${numValue.toFixed(2)}`;
    }
  }
  
  return String(value);
};

const GenericFormDataList: React.FC = () => {
  const { user } = useAuth();
  const { currentForm, setCurrentForm } = useForm();

  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const title = useMemo(() => (currentForm || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), [currentForm]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!user?.profile || !('employee_code' in user.profile) || !currentForm) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const all: UserFormData = await userFormsService.getUserForms(user.profile.employee_code);
        const data = all[currentForm] || [];
        setRecords(Array.isArray(data) ? data : []);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, currentForm]);

  if (isLoading) {
    return (
      <div className="p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title} Data</h2>
          <p className="text-gray-600">Viewing data fetched from backend for your employee ID</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentForm('none')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
          <p className="text-gray-500">No data was returned by the backend for this form.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {records.map((rec, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="text-sm text-gray-900 font-semibold mb-3">Record #{idx + 1}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(rec).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <span className="text-xs text-gray-500">{k.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-gray-900 break-words">{formatValue(v, k, currentForm || undefined)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenericFormDataList;


