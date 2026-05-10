import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex w-full h-screen bg-bg-main items-center justify-center p-4 relative z-10">
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-bg-main to-bg-main pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 bg-bg-surface border border-cyan-border rounded-xl shadow-[0_0_40px_rgba(0,183,235,0.1)] backdrop-blur-sm relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-DEFAULT to-transparent"></div>
        <div className="absolute -left-6 -top-6 w-12 h-12 border border-cyan-DEFAULT/30 rounded-full"></div>
        
        <div className="text-center mb-8 relative">
           <div className="w-16 h-16 mx-auto bg-bg-deep border-2 border-cyan-DEFAULT/50 rounded-lg flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,183,235,0.2)]">
             <span className="font-display font-bold text-2xl text-cyan-DEFAULT">CC</span>
           </div>
           <h2 className="font-display text-2xl font-semibold text-text-main">Access Gateway</h2>
           <p className="font-mono text-xs text-text-placeholder uppercase tracking-wider mt-2">Crime Connect • Authorized Personnel Only</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-alert-DEFAULT/10 border border-alert-DEFAULT/50 rounded-lg flex items-start gap-3">
             <AlertCircle size={16} className="text-alert-DEFAULT mt-0.5" />
             <span className="text-sm font-body text-alert-DEFAULT">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="font-mono text-xs text-cyan-DEFAULT/80 uppercase ml-1">Email Designation</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-text-placeholder" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg-deep border border-cyan-border/50 text-text-main font-body text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                placeholder="agent@intel.gov"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs text-cyan-DEFAULT/80 uppercase ml-1">Security Clearance</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-text-placeholder" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-bg-deep border border-cyan-border/50 text-text-main font-body text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                placeholder="••••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-cyan-DEFAULT hover:bg-cyan-hover text-bg-deep font-body font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(0,183,235,0.3)] hover:shadow-[0_0_30px_rgba(0,183,235,0.5)]"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  INITIALIZE UPLINK
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
          
          <div className="text-center mt-6">
            <p className="font-mono text-xs text-text-placeholder">
              Unregistered Operative?{' '}
              <Link to="/register" className="text-cyan-DEFAULT hover:underline underline-offset-4 decoration-cyan-DEFAULT/50">Request Access</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
