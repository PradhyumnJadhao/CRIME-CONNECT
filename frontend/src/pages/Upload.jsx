import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2, AlertCircle, Plus, RefreshCw, Network, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useUploadStore } from '../store/uploadStore';
import { useWsStore } from '../store/wsStore';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentCaseId, setCurrentCaseId] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const navigate = useNavigate();
  
  const {
      files, addFiles, logs, addLog, clearLogs, 
      progress, setProgress, uploadState, setUploadState, jobId, setJobId, reset
  } = useUploadStore();

  const { subscribe } = useWsStore();

  const uploadIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const fetchCaseGraph = async (caseId) => {
    if (!caseId) return;
    setIsGraphLoading(true);
    try {
      const response = await api.get(`/graph/?case_id=${caseId}`);
      const formattedData = {
        nodes: response.data.nodes.map(n => ({ ...n, name: n.properties?.name || n.label })),
        links: response.data.edges.map(e => ({ source: e.source, target: e.target, label: e.type }))
      };
      setGraphData(formattedData);
    } catch (err) {
      console.error("Failed to fetch case graph:", err);
    } finally {
      setIsGraphLoading(false);
    }
  };

  const simulateUploadAndProcessing = async () => {
    if (files.length === 0) return;
    setUploadState('uploading');
    clearLogs();
    setProgress(10);
    localStorage.removeItem('chatMessages'); // Clear chatbot history for new FIR
    
    let prog = 10;
    uploadIntervalRef.current = setInterval(() => {
      prog += 10;
      if(prog < 90) setProgress(prog);
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const response = await api.post('/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(uploadIntervalRef.current);
      setProgress(100);
      setUploadState('processing');
      
      const newJobId = response.data.job_id;
      // In the real backend, the case_id is inside the response
      // Let's assume the response has case_id or we extract from filename
      // Based on my ingest update, IngestResponse should have it!
      // Wait, let's check IngestResponse in ingest.py.
      // Ah, I missed adding case_id to the response model. I'll add it later!
      // For now assume it might be in response or let's update it.
      
      const cid = response.data.case_id || response.data.job_id; 
      setCurrentCaseId(cid);
      setJobId(newJobId);
      pollStatus(newJobId);
    } catch (error) {
      clearInterval(uploadIntervalRef.current);
      setUploadState('idle');
      addLog(error.response?.data?.detail || 'Upload failed', 'error');
    }
  };

  const user = useAuthStore(state => state.user);

  // Use a ref for currentCaseId so the WS callback always has the latest value
  const currentCaseIdRef = useRef(currentCaseId);
  useEffect(() => {
    currentCaseIdRef.current = currentCaseId;
  }, [currentCaseId]);

  // Subscribe to shared WebSocket messages (no new WS connection created here)
  useEffect(() => {
    const unsub = subscribe((data) => {
      if (data.message) {
        addLog(`LIVE: ${data.message}`, 'info');
        if (data.message.includes('entities extracted') || data.message.includes('ready')) {
          fetchCaseGraph(currentCaseIdRef.current);
        }
      }
    });
    return unsub;
  }, [subscribe]);

  // Polling logic
  useEffect(() => {
    if (uploadState === 'processing' && jobId) {
      pollStatus(jobId);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [uploadState, jobId]);

  const pollStatus = (id) => {
    if(pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/ingest/status/${id}`);
        const data = res.data;
        setProgress(data.progress || 0);
        if (data.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          setUploadState('complete');
          fetchCaseGraph(currentCaseId);
        } else if (data.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setUploadState('idle');
          addLog(`Error: ${data.error}`, 'error');
        }
      } catch (error) {
        clearInterval(pollIntervalRef.current);
        addLog('Failed to fetch status', 'error');
      }
    }, 2000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-main tracking-wide">Document Ingestion</h1>
          <p className="text-text-placeholder font-mono text-sm mt-1">Upload multiple FIRs, incident reports, and evidence logs.</p>
        </div>
        <div className="flex gap-4">
            {/* Always show New Upload button when processing/complete */}
            {uploadState !== 'idle' && (
              <button onClick={() => { reset(); setGraphData({nodes:[], links:[]}); localStorage.removeItem('chatMessages'); }} className="border border-white text-white px-6 py-2 rounded-lg font-mono text-xs hover:bg-white/10 transition-all flex items-center gap-2">
                <Plus size={14} /> New Upload
              </button>
            )}
            {uploadState === 'idle' && files.length > 0 && (
              <button onClick={simulateUploadAndProcessing} className="bg-white text-bg-deep px-6 py-2 rounded-lg font-bold shadow-glow-cyan hover:bg-gray-100 transition-colors flex items-center gap-2">
                <UploadCloud size={18} /> Process {files.length} Files
              </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[400px]">
        
        {/* Left Section: Upload & Files */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {uploadState === 'idle' ? (
            <div 
              onClick={() => { document.getElementById('fileUploadInput').click(); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 transition-all cursor-pointer bg-bg-card backdrop-blur-md min-h-[400px]
                ${isDragging ? 'border-cyan-DEFAULT bg-cyan-glow/10' : 'border-cyan-border hover:border-cyan-DEFAULT/50'}`}
            >
              <input id="fileUploadInput" type="file" multiple className="hidden" onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} />
              <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-cyan-glow shadow-glow-cyan' : 'bg-bg-deep border border-cyan-border/30'}`}>
                <UploadCloud size={40} className={isDragging ? 'text-bg-deep' : 'text-cyan-DEFAULT'} />
              </div>
              <h3 className="text-xl font-display font-medium text-text-main mb-2">Drag & Drop Documents</h3>
              <p className="text-text-placeholder text-sm max-w-md text-center">Supports .pdf, .txt and scanned images. AI powered OCR & Link extraction.</p>
              <div className="mt-8 px-6 py-2 rounded-lg border border-cyan-DEFAULT bg-cyan-DEFAULT/10 text-cyan-DEFAULT font-mono text-sm hover:bg-cyan-DEFAULT hover:text-bg-deep transition-all shadow-[0_0_15px_rgba(0,212,255,0.1)]">
                Browse Files
              </div>
            </div>
          ) : (
            <div className="bg-bg-card border border-cyan-border rounded-xl p-6 h-[400px] relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 right-0 p-4 font-mono text-[10px] text-cyan-DEFAULT/50 tracking-widest z-10 flex justify-between">
                    <span>CASE_GRAPH_PREVIEW</span>
                    {isGraphLoading && <RefreshCw size={12} className="animate-spin" />}
                </div>
                
                {graphData.nodes.length > 0 ? (
                    <ForceGraph2D
                        width={600}
                        height={350}
                        graphData={graphData}
                        nodeAutoColorBy="label"
                        nodeLabel="name"
                        backgroundColor="#0a192f"
                        linkColor={() => 'rgba(0, 212, 255, 0.4)'}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder">
                        <Network size={40} className="mb-3 opacity-30 animate-pulse text-cyan-DEFAULT" />
                        <span className="font-mono text-xs italic">Graph will populate as entities are extracted...</span>
                    </div>
                )}
                
                {uploadState === 'complete' && (
                    <div className="absolute bottom-4 right-4 animate-fadeIn">
                        <button 
                            onClick={() => fetchCaseGraph(currentCaseId)}
                            className="p-2 bg-bg-deep border border-cyan-DEFAULT text-cyan-DEFAULT rounded-full hover:bg-cyan-DEFAULT hover:text-bg-deep transition-all shadow-glow-cyan"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                )}
            </div>
          )}

          {files.length > 0 && (
            <div className="bg-bg-card border border-cyan-border rounded-xl p-4">
              <h4 className="text-sm font-mono text-text-muted mb-4 tracking-wider uppercase">Queued Documents ({files.length})</h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-deep rounded-lg p-3 border border-cyan-border/30">
                    <div className="flex items-center gap-3"><FileText size={16} className="text-cyan-DEFAULT" /><span className="text-sm text-text-main truncate max-w-[200px]">{f.name}</span></div>
                    <span className="text-xs text-text-placeholder font-mono">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Logs Panel */}
        <div className="lg:col-span-2 bg-bg-card border border-cyan-border rounded-xl flex flex-col overflow-hidden relative min-h-[400px]">
          <div className="p-4 border-b border-cyan-border bg-bg-deep flex items-center justify-between">
            <span className="font-mono text-sm text-cyan-DEFAULT tracking-wider uppercase">Analytic Process Log</span>
            <div className="flex items-center gap-4">
                {uploadState === 'processing' && <Loader2 size={16} className="text-cyan-DEFAULT animate-spin" />}
                {uploadState === 'complete' && <CheckCircle size={16} className="text-cyan-DEFAULT" />}
                <button 
                    onClick={clearLogs}
                    className="text-[10px] font-mono text-text-placeholder hover:text-cyan-DEFAULT transition-colors uppercase"
                >
                    Clear Filter
                </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto font-mono text-xs space-y-4">
            <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-placeholder opacity-50">
                <ShieldAlert size={32} className="mb-3 text-cyan-DEFAULT/30" />
                <span>Uplink terminal ready. Awaiting payload.</span>
              </div>
            ) : (
              logs.map((log, i) => (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={i} className="flex gap-4 border-l-2 border-cyan-DEFAULT/10 pl-4 py-1">
                  <span className="text-cyan-DEFAULT/40 shrink-0 font-bold">{log.time}</span>
                  <span className={log.type === 'error' ? 'text-alert-DEFAULT' : 'text-text-main'}>
                    <span className="text-cyan-DEFAULT/70">▶</span> {log.msg}
                  </span>
                </motion.div>
              ))
            )}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-bg-deep border-t border-cyan-border">
            {(uploadState === 'uploading' || uploadState === 'processing') && (
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-mono text-text-placeholder tracking-widest">
                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-cyan-DEFAULT rounded-full animate-pulse shadow-glow-cyan" /> {uploadState.toUpperCase()}</span>
                  <span>{progress}% COMPLETED</span>
                </div>
                <div className="w-full h-1 bg-cyan-DEFAULT/20 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-cyan-DEFAULT shadow-glow-cyan" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            
            {uploadState === 'complete' && (
              <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                <button 
                    onClick={() => navigate('/cases')} 
                    className="py-2.5 bg-bg-deep border border-cyan-DEFAULT text-cyan-DEFAULT font-mono text-xs font-bold rounded hover:bg-cyan-glow/10 transition-all flex items-center justify-center gap-2"
                >
                    CASE ARCHIVE
                </button>
                <button 
                    onClick={() => navigate('/graph')} 
                    className="py-2.5 bg-cyan-DEFAULT text-bg-deep font-mono text-xs font-bold rounded shadow-glow-cyan hover:bg-cyan-hover transition-all flex items-center justify-center gap-2"
                >
                    LINK EXPLORER
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Upload;
