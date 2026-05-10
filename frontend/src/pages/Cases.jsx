import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Search as SearchIcon, ChevronRight, Loader2, CheckCircle, Network } from 'lucide-react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Cases = () => {
  const [caseList, setCaseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [investigatingId, setInvestigatingId] = useState(null);
  const [investigationResult, setInvestigationResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cases/');
      setCaseList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigate = async (caseId) => {
    setInvestigatingId(caseId);
    setInvestigationResult(null);
    try {
      const res = await api.post(`/investigate/${caseId}`);
      setInvestigationResult({ caseId, report: res.data.report });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setInvestigationResult({ caseId, error: msg });
    } finally {
      setInvestigatingId(null);
    }
  };

  const handleDownload = async (caseId) => {
    setDownloadingId(caseId);
    try {
      const res = await api.get(`/investigate/${caseId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report_${caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Error downloading report: " + (err.response?.data?.detail || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = caseList.filter(c =>
    c.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.filename || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-main tracking-wide">Case Registry</h1>
          <p className="text-text-placeholder font-mono text-sm mt-1">Manage and track all intelligence cases.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-bg-deep border border-cyan-border rounded px-3 py-1.5 focus-within:border-cyan-DEFAULT">
            <SearchIcon size={14} className="text-text-placeholder" />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm w-48 outline-none text-text-main placeholder:text-text-placeholder"
            />
          </div>
          <button
            onClick={fetchCases}
            className="flex items-center gap-2 bg-bg-deep border border-white/30 rounded px-4 py-1.5 text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 bg-bg-deep border border-white/30 rounded px-4 py-1.5 text-white hover:bg-white/10 transition-all active:scale-95 font-mono text-xs"
          >
            + New FIR
          </button>
        </div>
      </div>

      {/* Investigation Result Panel */}
      {investigationResult && (
        <div className={`bg-bg-card border rounded-xl p-5 ${investigationResult.error ? 'border-alert-DEFAULT' : 'border-cyan-DEFAULT'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-cyan-DEFAULT tracking-wider uppercase">
              {investigationResult.error ? '⚠ Investigation Error' : `✓ Investigation Report — ${investigationResult.caseId}`}
            </span>
            <button onClick={() => setInvestigationResult(null)} className="text-text-placeholder hover:text-white text-xs font-mono">CLOSE</button>
          </div>
          <p className={`text-sm font-body leading-relaxed ${investigationResult.error ? 'text-alert-DEFAULT' : 'text-text-main'}`}>
            {investigationResult.error
              ? `Could not generate report: ${investigationResult.error}. Note: The Neo4j graph must have data for this case. Try uploading and processing the FIR first.`
              : investigationResult.report
            }
          </p>
        </div>
      )}

      <div className="bg-bg-card border border-cyan-border rounded-xl overflow-hidden shadow-panel">
        <div className="grid grid-cols-7 gap-4 p-4 bg-bg-deep border-b border-cyan-border text-xs font-mono text-text-placeholder uppercase tracking-wider">
           <div className="col-span-2">Case ID</div>
           <div>Filename</div>
           <div>Entities</div>
           <div>Status</div>
           <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-cyan-border/50">
          {loading ? (
             <div className="p-8 text-center text-text-placeholder font-mono text-sm flex items-center justify-center gap-3">
               <Loader2 size={16} className="animate-spin text-cyan-DEFAULT" /> Loading cases...
             </div>
          ) : filtered.length === 0 ? (
             <div className="p-8 text-center text-text-placeholder font-mono text-sm">
               {searchQuery ? 'No cases match your search.' : 'No cases found. Upload a FIR to get started.'}
             </div>
          ) : (
            filtered.map((c, i) => {
              const totalEntities = Object.values(c.entity_counts || {}).reduce((a, b) => a + b, 0);
              const isInvestigating = investigatingId === c.case_id;
              const isDownloading = downloadingId === c.case_id;
              return (
              <div key={i} className="grid grid-cols-7 gap-4 p-4 items-center hover:bg-cyan-glow/5 transition-colors group">
                <div className="col-span-2 flex flex-col">
                   <span className="font-display font-medium text-text-main group-hover:text-cyan-DEFAULT transition-colors">{c.case_id}</span>
                   <span className="font-mono text-[10px] text-text-placeholder">{new Date(c.ingestion_timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm font-body text-text-main truncate">
                   {c.filename || `Report_${c.case_id?.slice(-6) || 'unknown'}`}
                </div>
                <div className="text-sm font-mono text-text-main flex items-center gap-2">
                   <FileText size={14} className="text-cyan-DEFAULT"/> {totalEntities} 
                </div>
                <div>
                   <span className="px-2.5 py-1 rounded-full text-xs font-mono border bg-cyan-glow/20 border-cyan-border text-cyan-DEFAULT flex items-center gap-1 w-fit">
                     <CheckCircle size={10} /> {c.status || 'completed'}
                   </span>
                </div>
                <div className="col-span-2 text-right flex justify-end gap-2">
                  <button
                    onClick={() => handleInvestigate(c.case_id)}
                    disabled={isInvestigating}
                    className="px-2 py-1.5 bg-white/10 hover:bg-white/20 border border-white/50 text-white rounded font-mono text-[10px] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isInvestigating
                      ? <><Loader2 size={12} className="animate-spin" /> ANALYZING...</>
                      : <><ChevronRight size={12} /> REPORT</>
                    }
                  </button>
                  <button
                    onClick={() => handleDownload(c.case_id)}
                    disabled={isDownloading}
                    className="p-1.5 hover:bg-bg-deep border border-white/30 hover:border-white rounded text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  </button>
                </div>
              </div>
            )})
          )}
        </div>
      </div>
      
    </div>
  );
}

export default Cases;
