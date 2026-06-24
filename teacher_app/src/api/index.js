import axios from 'axios';
import { store } from '../store';
import { API_URL } from '@env';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = store.getState().auth.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log("Store couldn't be accessed!", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
