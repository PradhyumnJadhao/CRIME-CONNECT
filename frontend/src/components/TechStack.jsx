import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TechStack = () => {
  const containerRef = useRef(null);

  const stack = [
    { name: 'Neo4j', sub: 'Graph Database', icon: '⬡', color: 'text-teal-400 bg-teal-400/10' },
    { name: 'LangGraph', sub: 'Agent Orchestration', icon: '⌘', color: 'text-violet-400 bg-violet-400/10' },
    { name: 'Llama-3', sub: 'Local LLM', icon: '◉', color: 'text-amber-500 bg-amber-500/10' },
    { name: 'ChromaDB', sub: 'Vector Search', icon: '❂', color: 'text-fuchsia-400 bg-fuchsia-400/10' },
    { name: 'FastAPI', sub: 'Backend API', icon: '⚡', color: 'text-semantic-success bg-semantic-success/10' },
    { name: 'React', sub: 'Frontend UI', icon: '⚛', color: 'text-blue-400 bg-blue-400/10' },
  ];

  useEffect(() => {
    const cards = containerRef.current.querySelectorAll('.tech-card');
    gsap.fromTo(cards,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, scrollTrigger: { trigger: containerRef.current, start: "top 80%" } }
    );
  }, []);

  return (
    <section className="relative z-10 py-24 border-t border-violet-border/30 bg-bg-deep">
      <div className="w-full max-w-[1100px] mx-auto px-6 text-center">
        
        <h2 className="font-display font-bold text-3xl text-gradient mb-12">
          Enterprise-Grade Architecture
        </h2>

        <div ref={containerRef} className="flex justify-center flex-wrap gap-4">
          {stack.map((tech, i) => (
            <div key={i} className="tech-card interactive w-[160px] glass-card p-6 flex flex-col items-center justify-center group hover:border-violet-border">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] mb-4 transition-transform group-hover:-translate-y-1 ${tech.color}`}>
                {tech.icon}
              </div>
              <h3 className="font-display font-semibold text-[14px] text-text-main mb-1">{tech.name}</h3>
              <p className="font-body text-[12px] text-text-placeholder">{tech.sub}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TechStack;
