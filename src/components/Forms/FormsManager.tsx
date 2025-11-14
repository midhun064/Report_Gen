import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Grid3X3,
  List,
  Star,
  TrendingUp,
  Zap,
  Calendar,
  LogOut,
  Plane,
  User,
  Receipt,
  Banknote,
  ShoppingCart,
  Heart,
  Car,
  Shield,
  Key,
  Bus,
  Building,
  Wrench,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useForm } from '../../context/FormContext';
import { FORMS_DATA, FORM_CATEGORIES, getFormsByCategory, searchForms, FormData } from '../../data/formsData';

const FormsManager: React.FC = () => {
  const { setCurrentForm } = useForm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Forms');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'priority'>('name');

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Calendar,
      LogOut,
      Plane,
      User,
      Receipt,
      Banknote,
      ShoppingCart,
      Heart,
      Car,
      Shield,
      Key,
      AlertTriangle,
      Users,
      Bus,
      Building,
      Wrench,
      AlertCircle,
    };
    return iconMap[iconName] || FileText;
  };

  // Filter and sort forms
  const filteredForms = useMemo(() => {
    let forms = selectedCategory === 'All Forms' 
      ? FORMS_DATA 
      : getFormsByCategory(selectedCategory);

    if (searchQuery) {
      forms = searchForms(searchQuery);
    }

    // Sort forms
    forms.sort((a, b) => {
      switch (sortBy) {
        case 'category':
          return a.category.localeCompare(b.category);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return forms;
  }, [searchQuery, selectedCategory, sortBy]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Zap className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      default:
        return <Star className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'coming-soon':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const FormCard: React.FC<{ form: FormData }> = ({ form }) => {
    const IconComponent = getIconComponent(form.icon);
    
    return (
      <div 
        className={`${form.bgColor} rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 relative overflow-hidden`}
        onClick={() => setCurrentForm(form.formType)}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${form.bgColor} border border-white/30`}>
              <IconComponent className={`h-6 w-6 ${form.color}`} />
            </div>
            <div className="flex items-center space-x-2">
              {getPriorityIcon(form.priority)}
              {getStatusIcon(form.status)}
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
              {form.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {form.description}
            </p>
          </div>

          {/* Footer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{form.estimatedTime}</span>
              </span>
              <span className="px-2 py-1 bg-white/60 rounded-full text-xs font-medium">
                {form.category}
              </span>
            </div>
            
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              <span>{form.requiredApprovals.length} approval(s) required</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FormListItem: React.FC<{ form: FormData }> = ({ form }) => {
    const IconComponent = getIconComponent(form.icon);
    
    return (
      <div 
        className={`${form.bgColor} rounded-xl p-4 border border-white/20 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group`}
        onClick={() => setCurrentForm(form.formType)}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${form.bgColor} border border-white/30`}>
            <IconComponent className={`h-5 w-5 ${form.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {form.title}
              </h3>
              <div className="flex items-center space-x-1">
                {getPriorityIcon(form.priority)}
                {getStatusIcon(form.status)}
              </div>
            </div>
            <p className="text-sm text-gray-600 truncate">
              {form.description}
            </p>
          </div>
          
          <div className="text-right text-xs text-gray-500 space-y-1">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{form.estimatedTime}</span>
            </div>
            <div className="px-2 py-1 bg-white/60 rounded-full text-xs font-medium">
              {form.category}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Forms & Requests</h1>
            <p className="text-gray-600">Access all company forms and submit your requests</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{filteredForms.length}</div>
            <div className="text-sm text-gray-500">Available Forms</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search forms by name, description, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
          >
            {FORM_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'category' | 'priority')}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="priority">Sort by Priority</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-red-500" />
              <span>High Priority</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 text-yellow-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-green-500" />
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Grid/List */}
      {filteredForms.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Forms Found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-3'
        }>
          {filteredForms.map((form) => (
            viewMode === 'grid' ? (
              <FormCard key={form.id} form={form} />
            ) : (
              <FormListItem key={form.id} form={form} />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default FormsManager;
