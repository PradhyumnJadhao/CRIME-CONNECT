import React, { useState, useEffect } from 'react';
import { Network, FileText, AlertOctagon, ScanFace, FileSearch, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';

const iconMap = {
  alert: AlertOctagon,
  document: FileSearch,
  graph: Network,
  intel: ScanFace,
  system: FileText
};

const renderDescription = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const Timeline = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTimeline = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/timeline');
      const fetchedEvents = res.data.events || [];
      setEvents(fetchedEvents);
      localStorage.setItem('generatedTimeline', JSON.stringify(fetchedEvents));
    } catch (err) {
      console.error("Timeline fetch error:", err);
      setError("Failed to generate AI timeline. Ensure documents are uploaded and processed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedTimeline = localStorage.getItem('generatedTimeline');
    if (savedTimeline) {
      setEvents(JSON.parse(savedTimeline));
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-display font-bold text-text-main tracking-wide">Temporal Analysis</h1>
          <p className="text-text-placeholder font-mono text-sm mt-2">Chronological sequence of intelligence events and AI reasoning operations.</p>
        </div>
        
        <button
          onClick={fetchTimeline}
          disabled={isLoading}
          className="flex items-center gap-2 font-mono text-xs text-cyan-DEFAULT border border-cyan-DEFAULT/30 bg-cyan-glow/10 px-4 py-2 rounded hover:bg-cyan-glow/20 transition-colors shadow-[0_0_10px_rgba(0,212,255,0.1)] whitespace-nowrap"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> GENERATE TIMELINE
        </button>
      </div>

      {isLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-cyan-DEFAULT">
          <RefreshCw size={40} className="animate-spin mb-4" />
          <p className="font-mono text-sm animate-pulse">Generating live timeline according to our current FIR...</p>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="space-y-12">
          <div className="mb-4 p-4 bg-cyan-900/20 border border-cyan-DEFAULT/30 rounded-lg text-center font-mono text-sm text-cyan-100 flex items-center justify-center gap-3">
             <AlertOctagon size={16} className="text-cyan-DEFAULT" />
             <span>No active FIR data detected. Displaying a sample general investigation timeline.</span>
          </div>
          
          <div className="relative border-l-2 border-cyan-border/50 ml-6 md:ml-12 space-y-12 opacity-70">
            {[
              {
                time: "Day 1 - 09:00",
                title: "Incident Reported",
                desc: "First Information Report (FIR) formally logged into the system. Initial crime scene secured by responding officers.",
                type: "document"
              },
              {
                time: "Day 1 - 14:30",
                title: "Initial Evidence Collection",
                desc: "Forensics team collected physical evidence. Witness statements recorded and added to the preliminary case file.",
                type: "intel"
              },
              {
                time: "Day 2 - 10:15",
                title: "Suspect Identification",
                desc: "AI analysis of CCTV footage and witness descriptions highlighted two potential persons of interest.",
                type: "alert"
              },
              {
                time: "Day 3 - 16:45",
                title: "Network Graph Analysis",
                desc: "Cross-referencing communication logs established a link between the suspects and a known syndicate.",
                type: "graph"
              }
            ].map((ev, i) => {
              const IconComponent = iconMap[ev.type] || FileText;
              return (
                <div key={i} className="relative pl-8 md:pl-12 group">
                  <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-2 border-bg-deep flex items-center justify-center bg-bg-card border-cyan-border`}>
                    <IconComponent size={14} className="text-cyan-DEFAULT" />
                  </div>
                  <div className="font-mono text-xs text-cyan-DEFAULT mb-2 bg-cyan-glow/10 border border-cyan-DEFAULT/20 w-fit px-2 py-0.5 rounded tracking-widest uppercase">
                    {ev.time}
                  </div>
                  <div className="bg-bg-card border border-cyan-border rounded-xl p-5 shadow-panel group-hover:border-cyan-DEFAULT/60 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <IconComponent size={80} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-text-main mb-2">{ev.title}</h3>
                    <p className="text-text-muted font-body leading-relaxed">{renderDescription(ev.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative border-l-2 border-cyan-border/50 ml-6 md:ml-12 space-y-12">
        {events.map((ev, i) => {
          const IconComponent = iconMap[ev.type] || FileText;
          return (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="relative pl-8 md:pl-12 group"
            >
              {/* Timeline Dot */}
              <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-2 border-bg-deep flex items-center justify-center
                ${ev.type === 'alert' ? 'bg-warning-DEFAULT shadow-[0_0_15px_rgba(255,171,0,0.4)]' : 
                  ev.type === 'graph' ? 'bg-cyan-DEFAULT shadow-[0_0_15px_rgba(0,212,255,0.4)]' : 
                  'bg-bg-card border-cyan-border'}`}
              >
                <IconComponent size={14} className={ev.type === 'alert' || ev.type === 'graph' ? 'text-bg-deep' : 'text-cyan-DEFAULT'} />
              </div>

              <div className="font-mono text-xs text-cyan-DEFAULT mb-2 bg-cyan-glow/10 border border-cyan-DEFAULT/20 w-fit px-2 py-0.5 rounded tracking-widest uppercase">
                {ev.time}
              </div>
              
              <div className="bg-bg-card border border-cyan-border rounded-xl p-5 shadow-panel group-hover:border-cyan-DEFAULT/60 transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <IconComponent size={80} />
                </div>
                <h3 className="font-display text-lg font-bold text-text-main mb-2">{ev.title}</h3>
                <p className="text-text-muted font-body leading-relaxed">{renderDescription(ev.desc)}</p>
                
                <div className="mt-4 pt-4 border-t border-dashed border-cyan-border/30 flex items-center gap-4 text-xs font-mono">
                   <span className="text-text-placeholder hover:text-cyan-DEFAULT cursor-pointer transition-colors">Analyze Trace</span>
                   <span className="text-text-placeholder hover:text-cyan-DEFAULT cursor-pointer transition-colors">Find Related</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        
        {/* End of timeline fade */}
        {events.length > 0 && (
          <div className="absolute bottom-[-50px] left-[-2px] w-1 h-24 bg-gradient-to-b from-cyan-border/50 to-transparent"></div>
        )}
      </div>
    </div>
  );
}

export default Timeline;
