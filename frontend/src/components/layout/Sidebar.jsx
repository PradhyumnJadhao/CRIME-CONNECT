import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Network, ScanFace, UploadCloud, Clock, FolderOpen } from 'lucide-react';

const Sidebar = ({ isOpen }) => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Graph Explorer', path: '/graph', icon: <Network size={20} /> },
    { name: 'AI Detective', path: '/chat', icon: <ScanFace size={20} /> },
    { name: 'Upload', path: '/upload', icon: <UploadCloud size={20} /> },
    { name: 'Timeline', path: '/timeline', icon: <Clock size={20} /> },
    { name: 'Cases', path: '/cases', icon: <FolderOpen size={20} /> },
  ];

  return (
    <aside className={`bg-bg-surface border-r border-cyan-border flex flex-col items-center py-6 flex-shrink-0 z-50 transition-all duration-300 ${isOpen ? 'w-[240px]' : 'w-0 md:w-[70px] overflow-hidden'}`}>
      
      {/* Logo */}
      <div className={`flex flex-col items-center mb-10 w-full px-6 ${isOpen ? '' : 'md:px-2'}`}>
        <div className="w-10 h-10 rounded shadow-glow-cyan bg-grad-cyan flex items-center justify-center text-bg-deep font-bold mb-3">
          <Network size={24} />
        </div>
        <h1 className={`font-display font-bold text-[16px] tracking-widest text-text-main text-center ${isOpen ? 'block' : 'hidden'}`}>
          CRIME-CONNECT
        </h1>
        <div className={`font-mono text-[9px] text-cyan-DEFAULT tracking-[0.2em] mt-1 shadow-glow-cyan ${isOpen ? 'block' : 'hidden'}`}>
          INTELLIGENCE SYSTEM
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 w-full px-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg font-body text-[14px] font-medium transition-all duration-300 ${isOpen ? '' : 'justify-center md:px-2'}
              ${isActive 
                ? 'bg-cyan-glow border border-cyan-border text-cyan-DEFAULT shadow-glow-cyan' 
                : 'text-text-placeholder hover:text-text-main hover:bg-bg-card border border-transparent'}`
            }
          >
            {item.icon}
            <span className={`${isOpen ? 'inline' : 'hidden'}`}>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="mt-auto w-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-DEFAULT opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-DEFAULT"></span>
          </span>
          <span className="font-mono text-[10px] text-text-placeholder">NODE SYNCED</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
