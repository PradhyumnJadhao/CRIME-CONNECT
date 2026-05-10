import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import DemoSection from '../components/DemoSection';
import Testimonial from '../components/Testimonial';
import Footer from '../components/Footer';
import CustomCursor from '../components/CustomCursor';
import ParticleCanvas from '../components/ParticleCanvas';

const Landing = () => {
  return (
    <div className="relative min-h-screen bg-transparent text-text-main font-body selection:bg-cyan-glow selection:text-text-main">
      
      <Navbar />
      
      <main className="relative z-10 flex flex-col">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonial />
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
