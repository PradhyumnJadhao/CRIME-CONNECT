import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CTASection = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, scrollTrigger: { trigger: containerRef.current, start: "top 80%" } }
    );
  }, []);

  return (
    <section className="relative z-10 py-32 border-t border-violet-border/30 bg-grad-bg text-center overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)] pointer-events-none mix-blend-screen" />

      <div ref={containerRef} className="w-full max-w-[800px] mx-auto px-6 relative z-10">
        
        <h2 className="font-display font-bold text-[clamp(36px,5vw,64px)] text-gradient mb-5 leading-[1.1]">
          Start Your First Investigation
        </h2>
        
        <p className="font-body text-[18px] text-text-muted mb-12">
          Upload FIRs. Let AI build the case. Find the criminal network.
        </p>

        <form className="flex flex-col sm:flex-row justify-center gap-3 max-w-[480px] mx-auto mb-8" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="Official Email Address" 
            className="interactive flex-1 h-[52px] bg-bg-mid border border-violet-border/50 rounded-xl px-5 text-[15px] text-text-main placeholder:text-text-placeholder focus:outline-none focus:border-amber-500 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.25)] transition-all"
          />
          <button className="interactive h-[52px] px-7 bg-grad-gold rounded-xl font-display font-semibold text-[14px] text-[#0e0b14] whitespace-nowrap transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            Request Access &rarr;
          </button>
        </form>

        <div className="flex justify-center gap-6 flex-wrap text-[13px] text-text-placeholder">
          {['Free for academic use', 'No cloud', 'MIT Licensed'].map(perk => (
            <span key={perk} className="flex items-center gap-1.5">
              <span className="text-semantic-success">✓</span> {perk}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CTASection;
