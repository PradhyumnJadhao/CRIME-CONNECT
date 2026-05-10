import React, { useState, useEffect } from 'react';
import useUIStore from '../store/uiStore';
import { X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AuthModal = () => {
  const { authModalOpen, authModalTab, closeAuthModal, setAuthModalTab } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle escape to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeAuthModal]);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        closeAuthModal();
        navigate('/dashboard'); // REDIRECT HERE
        setTimeout(() => setSuccess(false), 500); // reset state after closing
      }, 1500);
    }, 2000);
  };

  if (!authModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-[#08060c]/85 backdrop-blur-[8px] flex items-center justify-center animate-fadeIn">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-[440px] m-4 bg-[#140f20]/95 border border-violet-border rounded-[20px] p-10 md:p-12 shadow-[0_40px_100px_rgba(139,92,246,0.20)] animate-border-pulse animate-[scaleIn_0.3s_ease] overflow-y-auto max-h-[95vh]">
        
        <button 
          onClick={closeAuthModal}
          className="interactive absolute top-4 right-4 w-8 h-8 rounded-full border border-violet-border/30 flex items-center justify-center text-text-muted transition-all hover:bg-violet-border hover:text-text-main"
        >
          <X size={18} />
        </button>

        <div className="w-[52px] h-[52px] mx-auto mb-5 rounded-full bg-grad-violet shadow-[0_0_30px_rgba(139,92,246,0.35)] flex items-center justify-center text-[20px] text-white">
          ◈
        </div>

        <h2 className="font-display font-bold text-[24px] text-text-main text-center mb-1.5">
          {authModalTab === 'login' ? 'Welcome Back' : 'Join Crime-Connect'}
        </h2>
        
        <p className="font-body text-[14px] text-text-placeholder text-center mb-8">
          Autonomous Forensic Intelligence System
        </p>

        {/* Tabs */}
        <div className="flex bg-[#0e0b14]/80 rounded-[10px] p-1 mb-7">
          <button 
            className={`interactive flex-1 py-2 rounded-lg font-body text-[14px] font-medium transition-all ${authModalTab === 'login' ? 'bg-grad-violet text-white' : 'bg-transparent text-text-placeholder hover:text-text-muted'}`}
            onClick={() => setAuthModalTab('login')}
          >
            Sign In
          </button>
          <button 
            className={`interactive flex-1 py-2 rounded-lg font-body text-[14px] font-medium transition-all ${authModalTab === 'signup' ? 'bg-grad-violet text-white' : 'bg-transparent text-text-placeholder hover:text-text-muted'}`}
            onClick={() => setAuthModalTab('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {authModalTab === 'signup' && (
            <div>
              <label className="block text-[13px] text-text-placeholder mb-2">Full Name</label>
              <input type="text" required className="interactive w-full h-12 bg-[#0e0b14]/80 border border-violet-border/50 rounded-[10px] px-4 text-[15px] text-text-main focus:outline-none focus:border-violet-light focus:shadow-[0_0_0_3px_rgba(139,92,246,0.35)] transition-all" />
            </div>
          )}

          <div>
            <label className="block text-[13px] text-text-placeholder mb-2">Email Address</label>
            <input type="email" required className="interactive w-full h-12 bg-[#0e0b14]/80 border border-violet-border/50 rounded-[10px] px-4 text-[15px] text-text-main focus:outline-none focus:border-violet-light focus:shadow-[0_0_0_3px_rgba(139,92,246,0.35)] transition-all" />
          </div>

          <div>
            <label className="block text-[13px] text-text-placeholder mb-2">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required className="interactive w-full h-12 bg-[#0e0b14]/80 border border-violet-border/50 rounded-[10px] pl-4 pr-11 text-[15px] text-text-main focus:outline-none focus:border-violet-light focus:shadow-[0_0_0_3px_rgba(139,92,246,0.35)] transition-all" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="interactive absolute right-3.5 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-muted">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {authModalTab === 'signup' && (
            <div>
              <label className="block text-[13px] text-text-placeholder mb-2">Role</label>
              <select required className="interactive w-full h-12 bg-[#0e0b14]/80 border border-violet-border/50 rounded-[10px] px-4 text-[15px] text-text-main focus:outline-none focus:border-violet-light focus:shadow-[0_0_0_3px_rgba(139,92,246,0.35)] transition-all appearance-none cursor-pointer">
                <option value="investigator" className="bg-[#150f22]">Investigator</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || success}
            className="interactive w-full h-[52px] bg-grad-violet border-none rounded-[10px] text-white font-display font-semibold text-[15px] transition-all relative overflow-hidden mt-2
                       hover:brightness-110 hover:shadow-[0_8px_32px_rgba(139,92,246,0.35)] disabled:opacity-80 disabled:pointer-events-none"
          >
            {loading ? (
               <span className="flex items-center justify-center gap-2">
                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                 Authenticating...
               </span>
            ) : success ? (
              <span className="flex items-center justify-center gap-2 text-[#86efac]">
                 ✓ Redirecting...
               </span>
            ) : (
              authModalTab === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-violet-border/30"></div>
          <span className="text-[13px] text-text-placeholder whitespace-nowrap">— or continue with —</span>
          <div className="flex-1 h-px bg-violet-border/30"></div>
        </div>

        <div className="flex flex-col gap-3">
           <button type="button" className="interactive w-full h-12 rounded-[10px] border border-violet-border/50 bg-transparent text-text-muted font-body font-medium flex justify-center items-center gap-3 transition-colors hover:bg-violet-glow/10 hover:border-violet-border">
             <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
             GitHub
           </button>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
