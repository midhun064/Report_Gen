import React, { useState } from 'react';
import { LogIn, Mail, Lock, KeyRound, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMobileDemo, setShowMobileDemo] = useState(false);
  const [isDemoExpanded, setIsDemoExpanded] = useState(false);

  const { login } = useAuth();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      
      if (!success) {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 relative">
      {/* Demo Credentials Panel - Desktop (md+) */}
      <div className="hidden md:block absolute top-4 right-4 max-w-sm w-full bg-white rounded-xl shadow-xl border border-gray-200">
        <button
          type="button"
          onClick={() => setIsDemoExpanded(!isDemoExpanded)}
          className="w-full flex items-center justify-between p-6 pb-4 hover:bg-gray-50 transition-colors rounded-t-xl"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <KeyRound className="w-5 h-5 text-sky-600 mr-2" />
            Demo Credentials
          </h3>
          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isDemoExpanded ? 'transform rotate-180' : ''}`} />
        </button>
        {isDemoExpanded && (
          <div className="px-6 pb-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
          {/* Line Managers */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Line Managers</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Michael Manager:</strong> michael.manager@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('michael.manager@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Sarah Supervisor:</strong> sarah.supervisor@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('sarah.supervisor@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>

          {/* HR Staff */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">HR Staff</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Helen HR:</strong> helen.hr@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('helen.hr@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Harry HRManager:</strong> harry.hrmanager@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('harry.hrmanager@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>

          {/* Finance Staff */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Finance Staff</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Frank Finance:</strong> frank.finance@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('frank.finance@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>

          {/* IT Staff */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">IT Staff</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Ian ITSupport:</strong> ian.itsupport@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('ian.itsupport@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Irene ITManager:</strong> irene.itmanager@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('irene.itmanager@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>

          {/* Operations Staff */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Operations Staff</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Debbie Desk:</strong> debbie.desk@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('debbie.desk@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Fred Facilities:</strong> fred.facilities@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('fred.facilities@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>


          {/* Legal Staff */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Legal Staff</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Laura Legal:</strong> laura.legal@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('laura.legal@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>

          {/* Employees */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Employees</h4>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>John Doe:</strong> john.doe@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('john.doe@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Jane Smith:</strong> jane.smith@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('jane.smith@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span><strong>Bob Johnson:</strong> bob.johnson@company.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('bob.johnson@company.com');
                    setPassword('hashed_password');
                  }}
                  className="text-sky-600 hover:text-sky-800 text-xs underline ml-2"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>
            </div>
          </div>
        )}
      </div>

      {/* Demo Credentials - Mobile trigger button */}
      <button
        type="button"
        onClick={() => setShowMobileDemo(true)}
        className="md:hidden fixed bottom-6 right-6 z-20 bg-white text-gray-800 border border-gray-200 shadow-lg px-4 py-2 rounded-full flex items-center gap-2"
      >
        <KeyRound className="w-4 h-4 text-sky-600" />
        Demo Credentials
      </button>

      {/* Demo Credentials - Mobile slide-over */}
      {showMobileDemo && (
        <div className="md:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMobileDemo(false)}></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center"><KeyRound className="w-5 h-5 text-sky-600 mr-2" /> Demo Credentials</h3>
              <button aria-label="Close" onClick={() => setShowMobileDemo(false)} className="p-2 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {/* Mobile compact lists - Show all roles */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Line Managers</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Michael Manager:</strong> michael.manager@company.com</span>
                    <button type="button" onClick={() => { setEmail('michael.manager@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Sarah Supervisor:</strong> sarah.supervisor@company.com</span>
                    <button type="button" onClick={() => { setEmail('sarah.supervisor@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">HR Staff</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Helen HR:</strong> helen.hr@company.com</span>
                    <button type="button" onClick={() => { setEmail('helen.hr@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Finance Staff</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Frank Finance:</strong> frank.finance@company.com</span>
                    <button type="button" onClick={() => { setEmail('frank.finance@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">IT Staff</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Ian ITSupport:</strong> ian.itsupport@company.com</span>
                    <button type="button" onClick={() => { setEmail('ian.itsupport@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Operations Staff</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Debbie Desk:</strong> debbie.desk@company.com</span>
                    <button type="button" onClick={() => { setEmail('debbie.desk@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Marketing Staff</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Mark Marketing:</strong> mark.marketing@company.com</span>
                    <button type="button" onClick={() => { setEmail('mark.marketing@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Legal Staff</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Laura Legal:</strong> laura.legal@company.com</span>
                    <button type="button" onClick={() => { setEmail('laura.legal@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">Employees</h4>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>John Doe:</strong> john.doe@company.com</span>
                    <button type="button" onClick={() => { setEmail('john.doe@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Jane Smith:</strong> jane.smith@company.com</span>
                    <button type="button" onClick={() => { setEmail('jane.smith@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span><strong>Bob Johnson:</strong> bob.johnson@company.com</span>
                    <button type="button" onClick={() => { setEmail('bob.johnson@company.com'); setPassword('hashed_password'); }} className="text-blue-600 hover:text-blue-800 text-xs underline ml-2">Fill</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md md:max-w-lg">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AdminEase</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Sign In</h2>
          
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-gray-400"
                  placeholder="Enter your email"
                />
              </div>
            </div>


            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-gray-400"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}


            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center shadow-sm"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </>
              )}
            </button>

            {/* Helper text */}
            <p className="text-xs text-gray-500 text-center">Use Demo Credentials to auto-fill test users</p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;