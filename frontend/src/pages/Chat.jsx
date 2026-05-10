import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, ShieldAlert, CheckCircle2, ChevronRight, Hash, Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';

import ReactMarkdown from 'react-markdown';

const Chat = () => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [
      { role: 'ai', content: 'Agentic Reasoning System initialized. Accessing global case memory. How can I assist with your investigation today?', timestamp: new Date().toLocaleTimeString() }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    fetchActiveEntities();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchActiveEntities = async () => {
    try {
      const response = await api.get('/graph/');
      const nodes = response.data.nodes || [];
      // Select some interesting entities for the preview
      const preview = nodes
        .filter(n => n.label !== 'Case')
        .slice(0, 5)
        .map(n => ({
          id: n.properties.name || n.properties.case_id || n.id,
          type: n.label.toLowerCase(),
          match: 'ACTIVE'
        }));
      setEvidence(preview);
    } catch (err) {
      console.error("Failed to fetch entities for chat context:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userQuery = input;
    const userMsg = { role: 'user', content: userQuery, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/chat/', { query: userQuery });
      
      const aiResponse = {
        role: 'ai',
        content: response.data.answer,
        timestamp: new Date().toLocaleTimeString(),
        reasoning: true,
        confidence: response.data.confidence
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error("Chat failure:", err);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: "Error accessing neural core. System may be offline or database not initialized.", 
        timestamp: new Date().toLocaleTimeString() 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      
      {/* Left Interface - Chat */}
      <div className="flex-1 bg-bg-card border border-cyan-border rounded-xl flex flex-col overflow-hidden relative shadow-panel">
        <div className="h-14 bg-bg-deep border-b border-cyan-border flex items-center px-6 shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <Bot size={20} className="text-cyan-DEFAULT" />
            <h2 className="font-display font-medium tracking-widest text-[15px]">AI DETECTIVE</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setMessages([
                  { role: 'ai', content: 'Agentic Reasoning System initialized. Accessing global case memory. How can I assist with your investigation today?', timestamp: new Date().toLocaleTimeString() }
                ]);
                localStorage.removeItem('chatMessages');
              }}
              className="font-mono text-xs text-cyan-DEFAULT border border-cyan-DEFAULT/30 bg-cyan-glow/10 px-3 py-1.5 rounded hover:bg-cyan-glow/20 transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> NEW CHAT
            </button>
            <div className="font-mono text-xs text-alert-DEFAULT flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-alert-DEFAULT animate-pulse"></span>
              REASONING ACTIVE
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
              key={i} 
              className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="font-mono text-[9px] text-text-placeholder uppercase">{msg.role === 'user' ? 'OPERATOR' : 'INTELLIGENCE CORE'}</span>
                <span className="font-mono text-[9px] text-text-placeholder/50">{msg.timestamp}</span>
              </div>
              <div className={`p-4 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-cyan-glow/10 border border-cyan-DEFAULT/30 text-text-main rounded-tr-sm' 
                  : 'bg-bg-deep border border-cyan-border text-text-main rounded-tl-sm shadow-lg'
              }`}>
                {msg.role === 'ai' ? (
                  <div className="prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
                
                {msg.reasoning && (
                  <div className="mt-4 pt-3 border-t border-dashed border-cyan-border/30">
                    <div className="flex items-center gap-2 text-cyan-DEFAULT font-mono text-[10px]">
                       <CheckCircle2 size={12} /> Graph Traversal Success
                    </div>
                    <div className="flex items-center gap-2 text-text-placeholder font-mono text-[10px] mt-1">
                       <ShieldAlert size={12} className="text-warning-DEFAULT" /> Confidence: {msg.confidence || 'Analysis Complete'}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
             <div className="flex items-center gap-2 text-cyan-DEFAULT font-mono text-xs p-4 bg-bg-deep border border-cyan-border rounded-xl rounded-tl-sm w-fit animate-pulse">
               <Loader2 size={14} className="animate-spin" /> Querying knowledge space...
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-bg-deep border-t border-cyan-border">
          <div className="flex items-center bg-bg-card border border-cyan-border/50 rounded-lg pr-2 focus-within:border-cyan-DEFAULT transition-all">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query active intelligence memory..." 
              className="flex-1 bg-transparent border-none outline-none p-4 text-sm font-mono text-text-main placeholder:text-text-placeholder focus:ring-0"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping}
              className="w-10 h-10 flex items-center justify-center bg-cyan-glow/20 hover:bg-cyan-glow/40 text-cyan-DEFAULT rounded transition-colors disabled:opacity-30"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Interface - Evidence Panel */}
      <div className="w-[300px] bg-bg-card border border-cyan-border rounded-xl hidden xl:flex flex-col overflow-hidden shadow-panel">
        <div className="h-14 bg-bg-deep border-b border-cyan-border flex items-center px-5 shrink-0">
          <ShieldAlert size={18} className="text-warning-DEFAULT mr-2" />
          <h3 className="font-display font-medium text-[12px] tracking-wider uppercase text-text-main">Neural Context</h3>
        </div>
        
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {evidence.length > 0 ? evidence.map((ev, i) => (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={i} className="bg-bg-deep border border-cyan-border/40 rounded-lg p-3 group hover:border-cyan-DEFAULT transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] text-cyan-DEFAULT flex items-center gap-1 uppercase"><Hash size={10}/> {ev.type}</span>
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-cyan-DEFAULT/10 text-cyan-DEFAULT border border-cyan-DEFAULT/20">IDENTIFIED</span>
              </div>
              <p className="font-mono text-xs text-text-main truncate">{ev.id}</p>
            </motion.div>
          )) : (
            <div className="text-center py-10 opacity-30">
                <Bot size={40} className="mx-auto mb-2" />
                <p className="font-mono text-[10px] uppercase">No neural links found</p>
            </div>
          )}
          
          <div className="mt-6 border-t border-dashed border-cyan-border pt-4">
             <p className="text-[10px] font-mono text-text-placeholder leading-relaxed uppercase">
                The AI is continuously scanning the Graph topology. Relevant nodes are automatically injected into the reasoning context.
             </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Chat;
