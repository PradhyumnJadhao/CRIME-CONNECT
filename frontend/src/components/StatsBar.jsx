import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const StatsBar = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    gsap.fromTo(el, 
      { opacity: 0, y: 30 },
      {
        opacity: 1, 
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        }
      }
    );
  }, []);

  return (
    <section ref={containerRef} className="relative z-10 border-y border-violet-border/40 bg-violet-glow/5 py-12 overflow-hidden">
      <div className="w-full max-w-[1200px] mx-auto px-6">
        
        <div className="flex flex-wrap justify-center gap-x-20 gap-y-12">
          <div className="text-center">
            <h3 className="font-display font-extrabold text-[36px] text-gradient leading-none mb-1.5">8,432</h3>
            <p className="text-[13px] text-text-placeholder tracking-wide">Entity Nodes in Graph</p>
          </div>
          <div className="text-center">
            <h3 className="font-display font-extrabold text-[36px] text-gradient leading-none mb-1.5">21,891</h3>
            <p className="text-[13px] text-text-placeholder tracking-wide">Criminal Connections</p>
          </div>
          <div className="text-center">
            <h3 className="font-display font-extrabold text-[36px] text-gradient leading-none mb-1.5">312</h3>
            <p className="text-[13px] text-text-placeholder tracking-wide">Suspects Identified</p>
          </div>
          <div className="text-center">
            <h3 className="font-display font-extrabold text-[36px] text-gradient leading-none mb-1.5">9</h3>
            <p className="text-[13px] text-text-placeholder tracking-wide">Criminal Rings Exposed</p>
          </div>
        </div>

      </div>

      <div className="mt-10 pt-5 border-t border-violet-border/30 overflow-hidden w-full">
        <div className="flex gap-10 whitespace-nowrap opacity-60">
           {/* Simple Marquee Implementation via duplicating content and animating */}
           <div className="flex gap-10 min-w-full justify-between animate-[marquee_30s_linear_infinite]">
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> Built with: Neo4j</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> LangGraph</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> Llama-3</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> ChromaDB</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> FastAPI</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> Made for Investigators</span>
           </div>
           {/* Duplicate for seamless infinite scrolling if screen is wide */}
           <div className="flex gap-10 min-w-full justify-between animate-[marquee_30s_linear_infinite]" aria-hidden="true">
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> Built with: Neo4j</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> LangGraph</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> Llama-3</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> ChromaDB</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> FastAPI</span>
             <span className="font-mono text-xs text-text-placeholder flex items-center gap-2"><span className="text-amber-500/70 text-[8px]">◈</span> Made for Investigators</span>
           </div>
        </div>
      </div>

    </section>
  );
};

export default StatsBar;
