import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '../store/uiStore';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'About', href: '#footer' },
  ];

  const navigate = useNavigate();

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 h-[68px] z-[1000] transition-all duration-400 ease-in-out flex items-center ${
        scrolled ? 'bg-[#0e0b14]/90 backdrop-blur-[20px] saturate-150 border-b border-violet-border' : 'bg-transparent'
      }`}>
        <div className="w-full max-w-[1200px] mx-auto px-6 md:px-12 flex justify-between items-center">
          
          <div className="flex flex-col gap-[1px]">
            <span className="font-display font-bold text-[18px] tracking-wide text-gradient-amber">
              ◈ CRIME-CONNECT
            </span>
            <span className="font-mono text-[10px] text-text-placeholder tracking-[0.15em]">
              FORENSIC AI
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="interactive relative font-body font-medium text-[14px] text-text-muted px-3.5 py-2 rounded-md transition-colors hover:text-amber after:content-[''] after:absolute after:bottom-[2px] after:left-1/2 after:right-1/2 after:h-[1px] after:bg-amber after:transition-all after:duration-300 hover:after:left-3.5 hover:after:right-3.5"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <button className="interactive btn-ghost" onClick={() => navigate('/login')}>Login</button>
            <button className="interactive px-4 py-2 rounded-lg h-9 bg-grad-violet border-none text-white font-display text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_0_24px_rgba(139,92,246,0.35)] flex items-center" onClick={() => navigate('/login?mode=signup')}>
              Sign Up
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button 
            className="md:hidden interactive text-text-muted p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-[#0e0b14]/95 backdrop-blur-xl z-[999] flex flex-col items-center justify-center gap-6 animate-fadeIn">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className="font-display font-bold text-2xl text-text-muted hover:text-amber"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <div className="flex flex-col gap-4 mt-8 w-[200px]">
            <button className="interactive btn-ghost justify-center w-full" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>Login</button>
            <button className="interactive px-4 py-3 rounded-lg bg-grad-violet text-white font-display font-bold justify-center w-full" onClick={() => { setMobileMenuOpen(false); navigate('/login?mode=signup'); }}>
              Sign Up
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
