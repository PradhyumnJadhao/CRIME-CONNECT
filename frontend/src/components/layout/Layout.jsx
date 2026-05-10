import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useWsStore } from '../../store/wsStore';

const Layout = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const user = useAuthStore(state => state.user);
  const { connect, disconnect } = useWsStore();

  // Initialize ONE shared WebSocket connection for the entire app
  useEffect(() => {
    if (user?.id) {
      connect(String(user.id));
    }
    return () => {
      // Only disconnect on logout/unmount - not on route change
    };
  }, [user?.id]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isLanding) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen bg-transparent text-text-main font-body overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col relative w-full h-full transition-all duration-300">
        <Topbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto mt-[70px] p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full max-w-[1400px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
