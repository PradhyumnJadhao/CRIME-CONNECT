import React, { useEffect, useRef } from 'react';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // Removed touch guard so laptops with touchscreens still get the cursor

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      }
    };

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.35;
      ringY += (mouseY - ringY) * 0.35;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px)`;
      }

      requestAnimationFrame(animateRing);
    };

    window.addEventListener('mousemove', handleMouseMove);
    requestAnimationFrame(animateRing);

    // Hover effects
    const updateHoverState = (e) => {
      if (e.target.closest('a, button, input, .interactive')) {
        document.body.classList.add('cursor-hovering');
      } else {
        document.body.classList.remove('cursor-hovering');
      }
    };
    window.addEventListener('mouseover', updateHoverState);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', updateHoverState);
    };
  }, []);

  return (
    <>
      <div 
        ref={ringRef} 
        id="cursor-ring" 
        className="fixed top-[-18px] left-[-18px] w-[36px] h-[36px] border-[1.5px] border-cyan-DEFAULT/70 rounded-full pointer-events-none z-[99999] transition-all duration-200 ease-out will-change-transform
                   [.cursor-hovering_&]:w-[56px] [.cursor-hovering_&]:h-[56px] [.cursor-hovering_&]:top-[-28px] [.cursor-hovering_&]:left-[-28px] [.cursor-hovering_&]:border-alert-DEFAULT [.cursor-hovering_&]:bg-alert-glow/30"
      />
      <div 
        ref={dotRef} 
        id="cursor-dot" 
        className="fixed top-[-3px] left-[-3px] w-[6px] h-[6px] bg-cyan-DEFAULT rounded-full shadow-[0_0_12px_rgba(0,212,255,0.5)] pointer-events-none z-[99999] transition-all duration-100 ease-out will-change-transform
                   [.cursor-hovering_&]:scale-0 [.cursor-hovering_&]:opacity-0"
      />
    </>
  );
};

export default CustomCursor;
