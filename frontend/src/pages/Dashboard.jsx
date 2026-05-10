import React, { useState, useEffect, useCallback } from 'react';
import { Network, Users, AlertTriangle, Activity, Database, Server, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon, colorClass, delta }) => (
  <motion.div 
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="bg-bg-card border border-cyan-border rounded-xl p-6 relative overflow-hidden group hover:border-cyan-DEFAULT transition-colors shadow-panel"
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${colorClass}`}></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div>
        <h3 className="font-mono text-xs tracking-wider text-text-placeholder uppercase">{title}</h3>
        <p className={`font-display text-3xl font-bold mt-1 text-text-main`}>{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 text-white`}>
        {icon}
      </div>
    </div>
    <div className="flex items-center gap-2 text-xs font-mono relative z-10">
      <span className="text-cyan-DEFAULT">{delta}</span>
      <span className="text-text-muted">live data</span>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_cases: 0,
    suspects_count: 0,
    alerts: 0,
    live_connections: 0
  });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/activity')
      ]);
      setStats(statsRes.data);
      setActivities(activityRes.data.activities || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
       console.error("Dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-main tracking-wide">Command Center</h1>
          <p className="text-text-placeholder font-mono text-sm mt-1">
            Global Intelligence Overview
            {lastUpdated && <span className="ml-3 text-cyan-DEFAULT/50">· Last synced {lastUpdated}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button
             onClick={fetchDashboardData}
             disabled={isLoading}
             className="flex items-center gap-2 font-mono text-[10px] text-white border border-white/30 bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors"
           >
             <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> SYNC
           </button>
           <span className="flex items-center gap-2 font-mono text-[10px] text-cyan-DEFAULT border border-cyan-DEFAULT/30 bg-cyan-glow/10 px-3 py-1.5 rounded">
             <Server size={12}/> DB CONNECTED
           </span>
           <span className="flex items-center gap-2 font-mono text-[10px] text-cyan-DEFAULT border border-cyan-DEFAULT/30 bg-cyan-glow/10 px-3 py-1.5 rounded">
             <Database size={12}/> CHROMA ACTIVE
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Cases" value={isLoading ? '—' : stats.total_cases} icon={<Network size={24} />} colorClass="bg-cyan-DEFAULT" delta={`${stats.total_cases} total`} />
        <StatCard title="Suspects Tracked" value={isLoading ? '—' : stats.suspects_count} icon={<Users size={24} />} colorClass="bg-alert-DEFAULT" delta={`${stats.suspects_count} in graph`} />
        <StatCard title="Active Alerts" value={isLoading ? '—' : stats.alerts} icon={<AlertTriangle size={24} />} colorClass="bg-warning-DEFAULT" delta={stats.alerts === 0 ? 'All clear' : `${stats.alerts} flagged`} />
        <StatCard title="Graph Connections" value={isLoading ? '—' : stats.live_connections} icon={<Activity size={24} />} colorClass="bg-cyan-DEFAULT" delta={`${stats.live_connections} edges`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Log */}
        <div className="lg:col-span-1 bg-bg-card border border-cyan-border rounded-xl shadow-panel overflow-hidden flex flex-col h-[500px]">
          <div className="h-14 bg-bg-deep border-b border-cyan-border px-5 flex items-center justify-between shrink-0">
            <h3 className="font-display text-sm tracking-widest text-text-main uppercase">Activity Stream</h3>
            {isLoading 
              ? <RefreshCw size={14} className="animate-spin text-cyan-DEFAULT" /> 
              : <span className="w-2 h-2 rounded-full bg-cyan-DEFAULT animate-pulse shadow-glow-cyan"></span>
            }
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {activities.length > 0 ? activities.map((log, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-cyan-border/30 hover:bg-bg-deep transition-colors">
                <div className="w-[1px] bg-cyan-DEFAULT/50 relative mt-1">
                  <div className="absolute top-0 -left-[3px] w-[7px] h-[7px] rounded-full bg-cyan-DEFAULT shadow-glow-cyan"></div>
                </div>
                <div>
                  <p className="text-sm font-body text-text-main leading-snug">{log.a}</p>
                  <span className="text-[10px] font-mono text-text-placeholder mt-1 block">{log.t}</span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-sm text-text-placeholder text-center font-mono">
                {isLoading ? 'Fetching activity...' : 'No recent activity. Upload a FIR to begin.'}
              </div>
            )}
          </div>
        </div>

        {/* Live Graph Preview */}
        <div className="lg:col-span-2 bg-bg-card border border-cyan-border rounded-xl shadow-panel overflow-hidden relative h-[500px] flex flex-col flex justify-center items-center">
            
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.2) 0%, transparent 60%)'
            }}></div>

            <Network size={60} className="text-cyan-DEFAULT/20 mb-4 animate-pulse" />
            <p className="font-mono text-text-placeholder text-sm text-center max-w-sm">
               Live topology visualization requires expanding the Graph Explorer module.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => navigate('/graph')} className="border border-white text-white px-6 py-2 rounded font-mono text-xs hover:bg-white hover:text-bg-deep transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                 Enter Graph Mode
              </button>
              <button onClick={() => navigate('/upload')} className="border border-cyan-DEFAULT text-cyan-DEFAULT px-6 py-2 rounded font-mono text-xs hover:bg-cyan-glow transition-all">
                 Upload FIR
              </button>
            </div>
            <div className="absolute top-4 left-4 font-mono text-[10px] text-cyan-DEFAULT/50 tracking-widest border border-cyan-border px-2 py-1 rounded">PREVIEW OVERLAY</div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
