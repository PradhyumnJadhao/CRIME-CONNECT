import { create } from 'zustand';

const useUIStore = create((set) => ({
  authModalOpen: false,
  authModalTab: 'login', // 'login' or 'signup'
  
  openAuthModal: (tab = 'login') => set({ authModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ authModalOpen: false }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
}));

export default useUIStore;
