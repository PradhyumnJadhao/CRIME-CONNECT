import React, { useEffect, useRef } from 'react';

const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    let particles = [];
    let mouseX = -1000;
    let mouseY = -1000;
    
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 40 : 100;
    const connectionDist = isMobile ? 120 : 180;
    
    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Mouse handler - need to adjust for scroll
    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Scroll handler for parallax
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);

    class Particle {
      constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        // Pinkish color matching the Vanta image user provided
        this.color = Math.random() > 0.5 ? '#9c4163' : '#7c2d12'; 
      }

      update() {
        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse interaction (gentle attraction/repulsion)
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const force = (200 - dist) / 2000;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
        }
        
        // Speed cap
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 1.5) {
          this.vx = (this.vx / speed) * 1.5;
          this.vy = (this.vy / speed) * 1.5;
        }
      }

      draw() {
        // Adjust Y for scroll parallax
        const displayY = (this.y - (scrollYRef.current * 0.2) + canvas.height * 2) % canvas.height;
        
        ctx.beginPath();
        ctx.arc(this.x, displayY, this.size, 0, Math.PI * 2);
        
        // Add glow to points
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 1;
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
      }
    }

    // Init
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          
          const displayY1 = (p1.y - (scrollYRef.current * 0.2) + canvas.height * 2) % canvas.height;
          const displayY2 = (p2.y - (scrollYRef.current * 0.2) + canvas.height * 2) % canvas.height;
          
          const dx = p1.x - p2.x;
          const dy = displayY1 - displayY2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < connectionDist) {
            ctx.beginPath();
            ctx.moveTo(p1.x, displayY1);
            ctx.lineTo(p2.x, displayY2);
            // Dynamic opacity based on distance
            const opacity = (1 - dist / connectionDist) * 0.25;
            ctx.strokeStyle = `rgba(156, 65, 99, ${opacity})`; // Pink color from image
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      drawConnections();
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[-1] pointer-events-none bg-[#020205]" 
    />
  );
};

export default ParticleCanvas;
