import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Testimonial = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, scrollTrigger: { trigger: containerRef.current, start: "top 80%" } }
    );
  }, []);

  return (
    <section className="relative z-10 py-24 text-center overflow-hidden bg-bg-deep">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-radial-glow pointer-events-none mix-blend-screen" />

      <div ref={containerRef} className="w-full max-w-[800px] mx-auto px-6 relative">
        <span className="absolute -top-10 -left-10 md:left-0 font-display font-black text-[120px] text-amber-500 opacity-15 leading-none select-none pointer-events-none">
          "
        </span>
        
        <h2 className="font-display font-bold text-[clamp(28px,3.5vw,48px)] text-gradient leading-[1.3] mb-8 relative z-10">
          94 seconds to find a connection that took investigators 3 weeks manually.
        </h2>
        
        <p className="font-body text-[15px] text-text-placeholder mb-14">
          — Multi-Hop Traversal Demo, Case #1042
        </p>

        <div className="flex justify-center gap-10 flex-wrap relative z-10">
          {['Zero-Hallucination', '100% Local Inference', 'Neo4j Enterprise Grade'].map(text => (
            <div key={text} className="flex items-center gap-2.5 text-[14px] text-text-muted">
              <span className="w-5 h-5 rounded-full bg-semantic-success/20 border border-semantic-success/30 flex items-center justify-center text-semantic-success text-[11px]">
                ✓
              </span>
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
