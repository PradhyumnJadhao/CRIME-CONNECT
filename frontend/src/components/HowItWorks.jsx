import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HowItWorks = () => {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const [typedText, setTypedText] = useState('');
  
  const terminalContent = [
    { text: "> analyze(\"FIR_1042.pdf\")", color: "text-amber-500", wait: 500 },
    { text: "[✓] Extracted: Suspect \"Raju Singh\" — confidence: 97.2%", color: "text-semantic-success", wait: 800 },
    { text: "[✓] Found: Location \"Koregaon Bank\" — 2 FIRs", color: "text-semantic-success", wait: 400 },
    { text: "[◈] Relationship: Raju → called → Karim Khan", color: "text-violet-light", wait: 600 },
    { text: "[◈] Relationship: Karim → was_at → Koregaon Bank", color: "text-violet-light", wait: 500 },
    { text: "[!] Hidden connection found: 3-hop chain to unsolved Case #0991", color: "text-amber-light", wait: 1000 }
  ];

  useEffect(() => {
    const el = containerRef.current;
    gsap.fromTo('.step-card',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.2, scrollTrigger: { trigger: el, start: "top 75%" } }
    );
    
    // Typewriter effect logic
    let currentLine = 0;
    let currentChar = 0;
    let currentHtml = '';
    let isTyping = false;
    let timeoutId;

    const typeTerminal = () => {
      if (currentLine >= terminalContent.length) return;
      isTyping = true;
      const line = terminalContent[currentLine];
      
      if (currentChar < line.text.length) {
        // Typing characters
        const char = line.text.charAt(currentChar);
        
        let newContent = currentHtml;
        const lineHtml = `<div class="${line.color} mt-1">${line.text.substring(0, currentChar + 1)}<span class="animate-blink inline-block w-2 h-3.5 bg-amber-500 ml-1.5 align-[-2px]"></span></div>`;
        setTypedText(newContent + lineHtml);
        
        currentChar++;
        timeoutId = setTimeout(typeTerminal, 30); // Typing speed
      } else {
        // Line finished
        const completedLine = `<div class="${line.color} mt-1">${line.text}</div>`;
        currentHtml += completedLine;
        setTypedText(currentHtml + `<div class="mt-1"><span class="animate-blink inline-block w-2 h-3.5 bg-amber-500 ml-1.5 align-[-2px]"></span></div>`);
        
        currentChar = 0;
        currentLine++;
        timeoutId = setTimeout(typeTerminal, line.wait);
      }
    };

    ScrollTrigger.create({
      trigger: terminalRef.current,
      start: "top 80%",
      once: true,
      onEnter: () => {
        timeoutId = setTimeout(typeTerminal, 500);
      }
    });

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <section id="how-it-works" className="relative z-10 py-28 bg-violet-glow/5 border-t border-violet-border/30">
      <div ref={containerRef} className="w-full max-w-[1200px] mx-auto px-6">
        
        <div className="text-center mb-20">
          <h2 className="font-display font-bold text-[clamp(28px,4vw,48px)] text-gradient mb-4">
            From Raw FIR to Criminal Network
          </h2>
          <h3 className="font-display font-bold text-[24px] text-amber-500">
            In under 60 seconds.
          </h3>
        </div>

        {/* 3 Steps Grid */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-0 max-w-[1000px] mx-auto mb-20 relative">
          
          {/* Step 1 */}
          <div className="step-card w-full lg:w-[30%] glass-card p-10 relative group hover:border-violet-border">
            <span className="absolute -top-3 left-6 font-display font-extrabold text-[96px] text-gradient opacity-10 leading-none select-none">1</span>
            <div className="text-amber-500 text-[40px] mb-5">⬆️</div>
            <h3 className="font-display font-bold text-[20px] text-text-main mb-3">Upload Documents</h3>
            <p className="text-[14px] text-text-muted leading-[1.7] mb-5">Drop raw PDF FIRs, CDRs, witness statements. Supports any format. All processing stays local.</p>
            <span className="inline-block px-3 py-1 rounded-full font-mono text-[11px] bg-semantic-success/10 text-semantic-success border border-semantic-success/20">
              &lt; 5s per document
            </span>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center w-[10%] text-violet opacity-50 overflow-visible relative h-20">
              <svg width="60" height="20" viewBox="0 0 60 20" fill="none" className="absolute left-1/2 -translate-x-1/2">
                 <path d="M0 10 L50 10 M40 0 L55 10 L40 20" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className="animate-[dash-flow_2s_linear_infinite]" />
              </svg>
          </div>

          {/* Step 2 HERO */}
          <div className="step-card w-full lg:w-[40%] bg-bg-card backdrop-blur-xl border border-amber-border/80 rounded-2xl p-10 relative z-10 shadow-[0_0_60px_rgba(245,158,11,0.12)] -translate-y-2">
            <span className="absolute -top-3 left-6 font-display font-extrabold text-[96px] text-gradient opacity-10 leading-none select-none">2</span>
             <span className="absolute top-4 right-4 bg-amber-500 text-[#0e0b14] font-mono text-[9px] font-bold px-2 py-1 rounded-full tracking-widest uppercase">
              Core Feature
            </span>
            <div className="text-violet text-[40px] mb-5">⬡</div>
            <h3 className="font-display font-bold text-[20px] text-text-main mb-3">AI Builds Knowledge Graph</h3>
            <p className="text-[14px] text-text-muted leading-[1.7] mb-5">Llama-3 identifies suspects, locations, weapons, dates. LangGraph agents build Neo4j relationship triples automatically.</p>
            <span className="inline-block px-3 py-1 rounded-full font-mono text-[11px] bg-semantic-success/10 text-semantic-success border border-semantic-success/20">
              94.3% accuracy
            </span>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center w-[10%] text-violet opacity-50 overflow-visible relative h-20">
              <svg width="60" height="20" viewBox="0 0 60 20" fill="none" className="absolute left-1/2 -translate-x-1/2">
                 <path d="M0 10 L50 10 M40 0 L55 10 L40 20" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className="animate-[dash-flow_2s_linear_infinite]" />
              </svg>
          </div>

          {/* Step 3 */}
          <div className="step-card w-full lg:w-[30%] glass-card p-10 relative group hover:border-violet-border">
            <span className="absolute -top-3 left-6 font-display font-extrabold text-[96px] text-gradient opacity-10 leading-none select-none">3</span>
            <div className="text-violet text-[40px] mb-5">🕸️</div>
            <h3 className="font-display font-bold text-[20px] text-text-main mb-3">Discover Hidden Networks</h3>
            <p className="text-[14px] text-text-muted leading-[1.7] mb-5">Ask 'Who is connected to Suspect X?' — the agent traverses 4 hops, verifies alibis, and returns evidence with citations.</p>
            <span className="inline-block px-3 py-1 rounded-full font-mono text-[11px] bg-semantic-success/10 text-semantic-success border border-semantic-success/20">
              0 hallucinations
            </span>
          </div>

        </div>

        {/* Terminal Section */}
        <div ref={terminalRef} className="step-card max-w-[760px] mx-auto bg-[#0c0a14] rounded-2xl p-7 border border-violet-border/50 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-1.5 mb-5 pb-4 border-b border-violet-border/30">
            <div className="w-3 h-3 rounded-full bg-semantic-danger"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-semantic-success"></div>
            <div className="ml-auto font-mono text-[12px] text-text-placeholder tracking-widest">
              crime-connect — agent log
            </div>
          </div>
          <div className="font-mono text-[13px] leading-[1.9] min-h-[160px]" dangerouslySetInnerHTML={{ __html: typedText || `<div class="mt-1"><span class="animate-blink inline-block w-2 h-3.5 bg-amber-500 ml-1.5 align-[-2px]"></span></div>` }}>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
