import { create } from 'zustand';

export const useUploadStore = create((set) => ({
  files: [],
  logs: [],
  progress: 0,
  uploadState: 'idle',
  jobId: null,
  
  setFiles: (newFiles) => set({ files: newFiles }),
  addFiles: (newFiles) => set((state) => ({ files: [...state.files, ...newFiles] })),
  addLog: (msg, type = 'info') => set(state => ({ 
      logs: [...state.logs, { time: new Date().toLocaleTimeString(), msg, type }] 
  })),
  clearLogs: () => set({ logs: [] }),
  setProgress: (p) => set({ progress: p }),
  setUploadState: (s) => set({ uploadState: s }),
  setJobId: (id) => set({ jobId: id }),
  reset: () => set({ files: [], logs: [], progress: 0, uploadState: 'idle', jobId: null })
}));
