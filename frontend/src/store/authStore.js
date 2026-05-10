import { create } from 'zustand';
import api from '../api/axios';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      localStorage.setItem('user', JSON.stringify(userData));
      
      set({ 
        user: userData, 
        token: access_token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Login failed', 
        isLoading: false 
      });
      return false;
    }
  },

  googleLogin: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/google-login', { token: idToken });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      localStorage.setItem('user', JSON.stringify(userData));
      
      set({ 
        user: userData, 
        token: access_token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Google Authentication failed', 
        isLoading: false 
      });
      return false;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/register', { username, email, password });
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ 
        error: error.response?.data?.detail || 'Registration failed', 
        isLoading: false 
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  }
}));
