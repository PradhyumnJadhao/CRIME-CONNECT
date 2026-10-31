import React from 'react';

const Footer = () => {
  return (
    <footer id="footer" className="relative z-10 pt-16 pb-8 bg-[#08060c] border-t border-violet-border/30">
      <div className="w-full max-w-[1200px] mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="font-display font-bold text-[18px] text-text-main mb-2">◈ CRIME-CONNECT</div>
            <div className="text-[14px] text-text-placeholder mb-1">Autonomous Forensic Intelligence System</div>
            
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-semibold text-[14px] text-text-main mb-4">PLATFORM</h4>
            <div className="flex flex-col gap-2.5">
              {['Dashboard'].map(link => (
                <a key={link} href="#" className="interactive text-[14px] text-text-placeholder hover:text-amber-500 transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-violet-border/30 text-[13px] text-text-placeholder">
          <div>© 2025 Crime-Connect</div>
          <div className="uppercase tracking-wider text-[11px] text-text-placeholder font-mono">FORENSIC INTELLIGENCE SYSTEM</div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
