import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, X, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWsStore } from '../../store/wsStore';
import api from '../../api/axios';

const Topbar = ({ toggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuthStore();
  const { notifications, clearNotifications, subscribe, addNotification } = useWsStore();
  const [stats, setStats] = useState({ total_cases: 0, alerts: 0 });
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Fetch live stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (_) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to WS messages for notifications (uses shared connection)
  useEffect(() => {
    const unsub = subscribe((data) => {
      if (data.message) addNotification(data.message);
    });
    return unsub;
  }, [subscribe, addNotification]);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.length;

  return (
    <header className={`h-[70px] bg-bg-surface border-b border-cyan-border flex justify-between items-center px-4 md:px-8 z-40 fixed top-0 right-0 backdrop-blur-md bg-opacity-80 transition-all duration-300 ${isSidebarOpen ? 'left-0 md:left-[240px]' : 'left-0'}`}>
      
      <div className="flex-1 flex items-center">
        <button 
          onClick={toggleSidebar}
          className="text-text-placeholder hover:text-cyan-DEFAULT transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        
        {/* Live Stats from API */}
        <div className="hidden md:flex items-center gap-4 border-r border-cyan-border/50 pr-6 mr-2">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-text-placeholder uppercase">Active Cases</span>
            <span className="font-display font-medium text-cyan-DEFAULT">{stats.total_cases}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-text-placeholder uppercase">Alerts</span>
            <span className="font-display font-medium text-alert-DEFAULT">
              {stats.alerts > 0 ? `${stats.alerts} Critical` : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative text-text-placeholder hover:text-cyan-DEFAULT transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-alert-DEFAULT text-white text-[9px] flex items-center justify-center shadow-glow-alert font-mono">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-9 w-80 bg-bg-card border border-cyan-border rounded-xl shadow-panel z-50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-cyan-border bg-bg-deep">
                <span className="font-mono text-xs text-cyan-DEFAULT tracking-widest uppercase">Live Alerts</span>
                <button
                  onClick={() => { clearNotifications(); setShowNotifs(false); }}
                  className="text-text-placeholder hover:text-alert-DEFAULT"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-text-placeholder text-center font-mono">No notifications yet.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-cyan-border/30 hover:bg-bg-deep">
                      <p className="text-xs text-text-main">{n.msg}</p>
                      <span className="text-[10px] text-text-placeholder font-mono">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded bg-bg-deep border border-cyan-border flex items-center justify-center text-cyan-DEFAULT">
            <User size={18} />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="font-body text-[13px] font-medium text-text-main">{user?.name || 'Operative'}</span>
            <span className="font-mono text-[10px] text-text-placeholder">{user?.role || 'Guest'} Level</span>
          </div>
        </div>

        <button 
          onClick={() => {
            logout();
            localStorage.removeItem('generatedTimeline');
          }}
          className="ml-2 font-mono text-[11px] text-white border border-white/30 bg-white/10 px-3 py-1.5 rounded hover:bg-white hover:text-bg-deep transition-colors"
        >
          LOG OUT
        </button>
      </div>
      
    </header>
  );
};

export default Topbar;
