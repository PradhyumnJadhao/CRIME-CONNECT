import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: '⬡',
    color: 'violet',
    title: 'Graph Intelligence',
    body: 'Maps hidden connections between suspects, locations, weapons, and events across thousands of FIRs using a living Neo4j Knowledge Graph.',
    tag: 'Neo4j GraphDB'
  },
  {
    icon: '◉',
    color: 'amber',
    title: 'Agentic AI Reasoning',
    body: "Our LangGraph agents don't just answer — they plan investigations. First check the suspect's location, then cross-reference CDRs, then verify the alibi.",
    tag: 'LangGraph'
  },
  {
    icon: '◫',
    color: 'danger',
    title: 'Temporal Crime Logic',
    body: 'Every event is timestamped. The AI knows if a suspect was at the crime scene BEFORE or AFTER the crime — enabling bulletproof alibi verification.',
    tag: 'Temporal Logic'
  },
  {
    icon: '✓',
    color: 'success',
    title: 'Zero-Hallucination Evidence',
    body: 'Every AI answer is traced to a specific FIR document, paragraph number, and confidence score. No guesswork. Full audit trail.',
    tag: 'Source-Traced'
  },
  {
    icon: '↔',
    color: 'info',
    title: 'Multi-Hop Reasoning',
    body: 'Connects Suspect A → Phone → Call → Suspect B → shared Location → Crime C across 4 hops — impossible manually, instant with GraphRAG.',
    tag: '4-Hop Traversal'
  },
  {
    icon: '◈',
    color: 'violet',
    title: 'Local & Private',
    body: '100% local inference using Llama-3 via Ollama. Sensitive police data never leaves the machine. Zero cloud calls.',
    tag: 'Privacy-First'
  }
];

const Features = () => {
  const headingRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, scrollTrigger: { trigger: headingRef.current, start: "top 85%" } }
    );

    cardsRef.current.forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        { 
          opacity: 1, y: 0, duration: 0.6, delay: i * 0.1, 
          scrollTrigger: { trigger: headingRef.current, start: "top 70%" }
        }
      );
    });
  }, []);

  const handleMouseMove = (e, index) => {
    const card = cardsRef.current[index];
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 3D Tilt
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    
    // Glow effect
    const glow = card.querySelector('.card-glow');
    if (glow) {
      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
      glow.style.opacity = '1';
    }
  };

  const handleMouseLeave = (index) => {
    const card = cardsRef.current[index];
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
    const glow = card.querySelector('.card-glow');
    if (glow) glow.style.opacity = '0';
  };

  return (
    <section id="features" className="relative z-10 py-28">
      <div className="w-full max-w-[1200px] mx-auto px-6">
        
        <div ref={headingRef} className="text-center mb-16">
          <span className="font-mono text-[11px] text-amber-500 tracking-[0.2em] uppercase mb-4 block">
            Why Crime-Connect?
          </span>
          <h2 className="font-display font-bold text-[clamp(28px,4vw,48px)] text-gradient mb-4">
            Not Just A Search Tool.
          </h2>
          <p className="text-[18px] text-text-muted max-w-[600px] mx-auto leading-[1.7]">
            An autonomous detective that plans, reasons, and connects the dots across thousands of case files.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[880px] mx-auto">
          {features.map((feat, i) => (
            <div 
              key={i}
              ref={el => cardsRef.current[i] = el}
              className="glass-card p-8 group interactive"
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
            >
              {/* Inner Glow following cursor */}
              <div 
                className="card-glow absolute w-[200px] h-[200px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 z-0 mix-blend-screen"
                style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
              />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] mb-5
                  ${feat.color === 'violet' ? 'bg-violet-glow/30 text-violet-light' : ''}
                  ${feat.color === 'amber' ? 'bg-amber-glow/40 text-amber-500' : ''}
                  ${feat.color === 'danger' ? 'bg-semantic-danger/15 text-semantic-danger' : ''}
                  ${feat.color === 'success' ? 'bg-semantic-success/15 text-semantic-success' : ''}
                  ${feat.color === 'info' ? 'bg-semantic-info/15 text-semantic-info' : ''}
                `}>
                  {feat.icon}
                </div>
                <h3 className="font-display font-semibold text-[18px] text-text-main mb-2.5">
                  {feat.title}
                </h3>
                <p className="text-[15px] text-text-muted leading-[1.7] mb-6">
                  {feat.body}
                </p>
                <div className="tag-amber">
                  {feat.tag}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Features;
