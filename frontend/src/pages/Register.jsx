import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(username, email, password);
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="flex w-full h-screen bg-bg-main items-center justify-center p-4 relative z-10">
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-900/10 via-bg-main to-bg-main pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 bg-bg-surface border border-cyan-border rounded-xl shadow-[0_0_40px_rgba(0,183,235,0.1)] backdrop-blur-sm relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-cyan-DEFAULT via-transparent to-transparent"></div>
        <div className="absolute -right-10 -bottom-10 w-32 h-32 border-[4px] border-cyan-DEFAULT/5 rounded-full pointer-events-none"></div>

        <div className="text-center mb-8">
           <ShieldAlert size={48} className="mx-auto text-cyan-DEFAULT mb-3 opacity-90 drop-shadow-[0_0_10px_rgba(0,183,235,0.5)]" />
           <h2 className="font-display text-2xl font-semibold text-text-main">Clearance Request</h2>
           <p className="font-mono text-xs text-text-placeholder uppercase tracking-wider mt-2">New Operative Registration</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-alert-DEFAULT/10 border border-alert-DEFAULT/50 rounded-lg flex items-start gap-3">
             <AlertCircle size={16} className="text-alert-DEFAULT mt-0.5 shrink-0" />
             <span className="text-sm font-body text-alert-DEFAULT">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="font-mono text-xs text-cyan-DEFAULT/80 uppercase ml-1">Operative Alias</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-text-placeholder" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-bg-deep border border-cyan-border/50 text-text-main font-body text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                placeholder="Agent Smith"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs text-cyan-DEFAULT/80 uppercase ml-1">Secure Comms (Email)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-text-placeholder" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-bg-deep border border-cyan-border/50 text-text-main font-body text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                placeholder="smith@intel.gov"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs text-cyan-DEFAULT/80 uppercase ml-1">Passphrase</label>
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

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-cyan-DEFAULT/10 border border-cyan-DEFAULT hover:bg-cyan-DEFAULT text-cyan-DEFAULT hover:text-bg-deep font-body font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group shadow-[inset_0_0_20px_rgba(0,183,235,0.1)] hover:shadow-[0_0_20px_rgba(0,183,235,0.4)]"
            >
              {isLoading ? 'PROCESSING...' : (
                <>
                  REQUEST PROVISIONING
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
          
          <div className="text-center mt-6">
            <p className="font-mono text-xs text-text-placeholder">
              Already credentialed?{' '}
              <Link to="/login" className="text-cyan-DEFAULT hover:underline underline-offset-4 decoration-cyan-DEFAULT/50">Return to Portal</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
