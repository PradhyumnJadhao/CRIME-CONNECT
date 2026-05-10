import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing'; // Landing might be replaced or kept depending on design
import Login from './pages/Login';
import Register from './pages/Register';
import AuthPage from './pages/AuthPage'; // unified login/register
import CustomCursor from './components/CustomCursor';
import ParticleCanvas from './components/ParticleCanvas';
import Dashboard from './pages/Dashboard';
import GraphExplorer from './pages/GraphExplorer';
import Chat from './pages/Chat';
import Upload from './pages/Upload';
import Timeline from './pages/Timeline';
import Cases from './pages/Cases';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <ParticleCanvas />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/graph" element={<GraphExplorer />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/cases" element={<Cases />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
