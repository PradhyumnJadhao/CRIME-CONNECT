import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ChevronDown, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const headlineRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Word by word animation
    const words = document.querySelectorAll('.hero-word');
    gsap.fromTo(words,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.2 }
    );

    gsap.fromTo('.hero-fade-up',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out', delay: 0.8 }
    );

    // Parallax on scroll
    const handleScroll = () => {
      if (window.scrollY < window.innerHeight) {
        gsap.to('.hero-content', { y: window.scrollY * 0.15, duration: 0 });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="home" className="min-h-screen relative flex flex-col justify-center items-center overflow-hidden pt-24 pb-16">
      <div className="w-full max-w-[1000px] mx-auto px-6 md:px-12 flex flex-col items-center justify-center hero-content text-center z-10">

        <h1 ref={headlineRef} className="font-display font-extrabold text-[clamp(40px,7vw,96px)] leading-[1.05] tracking-tight mb-8">
          <span className="block text-[#e2e8f0] opacity-90 hero-word drop-shadow-lg">The AI That Thinks</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600 hero-word drop-shadow-xl">Like a Detective.</span>
        </h1>

        <p className="text-[17px] md:text-[20px] text-[#94a3b8] max-w-[760px] mx-auto leading-relaxed mb-12 hero-fade-up font-light tracking-wide">
          Upload disconnected FIR documents. Get an interactive knowledge graph, suspect profiling, and autonomous investigative leads — Because justice demands perfect intelligence.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-5 hero-fade-up w-full mb-20">
          <button
            onClick={() => navigate('/login?mode=signup')}
            className="interactive bg-gradient-to-r from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-semibold flex-shrink-0 text-[16px] px-8 py-3.5 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all transform hover:scale-105"
          >
            Start Investigation &rarr;
          </button>
          <button className="interactive bg-transparent border border-white/20 hover:bg-white/5 text-white flex-shrink-0 text-[16px] px-8 py-3.5 rounded-lg transition-all flex items-center justify-center">
            <Play size={16} className="fill-current mr-2" /> Watch Demo
          </button>
        </div>

      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 hero-fade-up" style={{ animationDelay: '2s' }}>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#64748b]">Scroll to explore</span>
        <ChevronDown size={18} className="text-red-500 animate-bounce-down" />
      </div>
    </section>
  );
};

export default Hero;
