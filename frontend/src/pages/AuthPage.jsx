import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User, ShieldAlert, ArrowRight, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';

const AuthPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const { login, register, googleLogin, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const success = await googleLogin(tokenResponse.access_token);
      if (success) navigate('/dashboard');
    },
    onError: () => setLocalError('Google Authentication Failed'),
  });

  useEffect(() => {
    setLocalError('');
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError("Passphrases do not match");
        return;
      }
      const success = await register(name, email, password);
      if (success) {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setLocalError('Provisioning successful. Please authenticate.');
      }
    } else {
      const success = await login(email, password);
      if (success) navigate('/dashboard');
    }
  };


  return (
    <div className="min-h-screen bg-bg-main flex text-text-main font-body selection:bg-cyan-glow selection:text-text-main">
      
      {/* LEFT SIDE - Auth Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 border-r border-cyan-border relative z-10 bg-bg-surface/50 backdrop-blur-xl">
        
        {/* Decorative accents */}
        <div className="absolute top-0 right-0 w-[1px] h-32 bg-gradient-to-b from-cyan-DEFAULT to-transparent shadow-glow-cyan" />
        
        <div className="mb-10 animate-fadeIn">
          <button 
            onClick={() => navigate('/')}
            className="w-14 h-14 bg-bg-deep border border-cyan-DEFAULT rounded-lg flex items-center justify-center mb-6 shadow-glow-cyan hover:bg-cyan-glow/10 transition-all transform hover:scale-105 group"
            aria-label="Return to Home"
          >
             <ArrowLeft size={24} className="text-cyan-DEFAULT group-hover:-translate-x-1 transition-transform" />
          </button>
          <h1 className="font-display text-3xl font-bold tracking-wide">
            {mode === 'login' ? 'Access Gateway' : 'Clearance Request'}
          </h1>
          <p className="text-text-muted mt-2 text-sm max-w-[350px]">
            {mode === 'login' 
              ? 'Authenticate to access the forensic intelligence platform.' 
              : 'Register for automated intelligence and evidence analysis.'}
          </p>
        </div>

        {/* Toggle Login/Signup */}
        <div className="flex bg-bg-deep rounded-lg p-1 border border-cyan-border/50 mb-8 w-full max-w-sm">
          <button 
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'signup' ? 'bg-cyan-glow/20 text-text-main border border-cyan-border/50 shadow-[inset_0_1px_4px_rgba(0,183,235,0.2)]' : 'text-text-placeholder hover:text-text-muted'}`}
            onClick={(e) => { e.preventDefault(); setMode('signup'); }}
          >
            Sign up
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'login' ? 'bg-cyan-glow/20 text-text-main border border-cyan-border/50 shadow-[inset_0_1px_4px_rgba(0,183,235,0.2)]' : 'text-text-placeholder hover:text-text-muted'}`}
            onClick={(e) => { e.preventDefault(); setMode('login'); }}
          >
            Log in
          </button>
        </div>

        {(error || localError) && (
          <div className="mb-6 p-3 bg-alert-DEFAULT/10 border border-alert-DEFAULT/30 rounded-lg flex items-start gap-3 w-full max-w-sm animate-fadeIn">
             <AlertCircle size={16} className="text-alert-DEFAULT mt-0.5 shrink-0" />
             <span className="text-sm text-alert-DEFAULT">{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
          
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-mono text-cyan-DEFAULT/80 tracking-widest uppercase">Operative Alias</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-text-placeholder" />
                <input 
                  type="text" 
                  value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full bg-bg-deep border border-cyan-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-mono text-cyan-DEFAULT/80 tracking-widest uppercase">Secure Comms (Email)</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-text-placeholder" />
              <input 
                type="email" 
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-bg-deep border border-cyan-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                placeholder="agent@intel.gov"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-cyan-DEFAULT/80 tracking-widest uppercase">Passphrase</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-text-placeholder" />
              <input 
                type="password" 
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-bg-deep border border-cyan-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                placeholder="••••••••••"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1 animate-fadeIn">
              <label className="text-xs font-mono text-cyan-DEFAULT/80 tracking-widest uppercase">Confirm Passphrase</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-text-placeholder" />
                <input 
                  type="password" 
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full bg-bg-deep border border-cyan-border rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-cyan-DEFAULT focus:ring-1 focus:ring-cyan-DEFAULT/50 transition-all placeholder:text-text-placeholder/50"
                  placeholder="••••••••••"
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-cyan-DEFAULT hover:bg-cyan-hover text-bg-deep font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(0,183,235,0.3)] mt-2"
            >
              {isLoading ? (
                <><RefreshCw size={18} className="animate-spin" /> PROCESSING...</>
              ) : mode === 'login' ? (
                <><ShieldAlert size={18} /> INITIALIZE UPLINK</>
              ) : (
                <><ArrowRight size={18} /> REQUEST PROVISIONING</>
              )}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-cyan-border/50"></span></div>
            <div className="relative flex justify-center text-xs uppercase font-mono">
              <span className="bg-bg-surface px-2 text-text-placeholder">Or continue with</span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="flex justify-center">
            <button 
              type="button" 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 px-8 py-2.5 border border-cyan-border/50 bg-bg-deep rounded-xl hover:bg-cyan-glow/10 hover:border-cyan-DEFAULT/50 transition-all text-sm font-medium min-w-[200px]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-[11px] text-text-placeholder mt-8 text-center max-w-sm">
            By authenticating, you agree to the <a href="#" className="text-cyan-DEFAULT hover:underline">Terms of Service</a> and <a href="#" className="text-cyan-DEFAULT hover:underline">Privacy Directive</a>.
            Unauthorized access will be logged.
          </p>

        </form>
      </div>

      {/* RIGHT SIDE - Image/Graphic */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-end justify-start p-12">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity grayscale"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2940&auto=format&fit=crop')" }} 
        />
        
        {/* Neon scanline overlays */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,11,20,0.8),rgba(14,11,20,0.4))]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9InJnYmEoMCwyMTIsMjU1LDAuMDUpIi8+PC9zdmc+')] mix-blend-overlay opacity-50 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full border-l-[4px] border-cyan-DEFAULT/20" />

        <div className="relative z-10 max-w-xl bg-bg-surface/80 backdrop-blur-md border border-cyan-border p-6 rounded-2xl shadow-panel">
          <div className="mb-4">
            <span className="font-mono text-[10px] text-cyan-DEFAULT tracking-widest border border-cyan-DEFAULT/30 bg-cyan-glow/10 px-3 py-1 rounded">SYSTEM.UPDATE</span>
          </div>
          <p className="font-display text-lg text-text-main font-medium leading-relaxed">
            "Crime-Connect has fundamentally transformed our operations. The automated Knowledge Graph drastically reduced our manual correlation efforts. Entities we previously missed are now highlighted within seconds."
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-DEFAULT/20 border border-cyan-DEFAULT flex items-center justify-center text-cyan-DEFAULT font-bold">DT</div>
            <div>
              <p className="font-display font-medium text-sm text-text-main">David T.</p>
              <p className="font-mono text-[10px] text-text-placeholder uppercase">Lead Investigator, Cyber Division</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-DEFAULT animate-pulse shadow-glow-cyan"></span>
            <span className="font-mono text-[10px] text-cyan-DEFAULT tracking-widest uppercase">Nodes Synchronized</span>
        </div>
      </div>
      
    </div>
  );
};

export default AuthPage;
