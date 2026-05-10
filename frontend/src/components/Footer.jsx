import React from 'react';

const Footer = () => {
  return (
    <footer id="footer" className="relative z-10 pt-16 pb-8 bg-[#08060c] border-t border-violet-border/30">
      <div className="w-full max-w-[1200px] mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-16">
          
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="font-display font-bold text-[18px] text-text-main mb-2">◈ CRIME-CONNECT</div>
            <div className="text-[14px] text-text-placeholder mb-1">Autonomous Forensic Intelligence System</div>
            
            <div className="flex gap-2.5 mt-4">
              <a 
                href="https://github.com/anujparwal09/CRIME-CONNECT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="interactive w-9 h-9 rounded-full border border-violet-border/50 bg-transparent text-text-placeholder flex items-center justify-center text-[12px] font-medium transition-all hover:border-amber-border hover:text-amber-500 hover:scale-110"
              >
                Gi
              </a>
            </div>
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

          {/* Built By */}
          <div>
            <h4 className="font-display font-semibold text-[14px] text-text-main mb-4">BUILT BY</h4>
            <div className="text-[13px] text-text-placeholder leading-[1.8] flex flex-col gap-4">
              
              {/* Anuj */}
              <div>
                <p><span className="text-text-main font-medium">Anuj Parwal</span> <span className="text-text-placeholder">(Full Stack Developer) — Lead</span></p>
                <div className="flex gap-3 mt-1 text-[13px]">
                  <a href="https://github.com/anujparwal09" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">GitHub</a>
                  <span className="text-violet-border/30">|</span>
                  <a href="https://www.linkedin.com/in/anuj-parwal-805829283/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">LinkedIn</a>
                </div>
              </div>

              {/* Pradhyumn */}
              <div>
                <p><span className="text-text-main font-medium">Pradhyumn Jadhao</span> <span className="text-text-placeholder">— Contributor</span></p>
                <div className="flex gap-3 mt-1 text-[13px]">
                  <a href="https://github.com/PradhyumnJadhao" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">GitHub</a>
                  <span className="text-violet-border/30">|</span>
                  <a href="https://www.linkedin.com/in/pradhyumn-jadhao-9064ab301/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">LinkedIn</a>
                </div>
              </div>
              
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

