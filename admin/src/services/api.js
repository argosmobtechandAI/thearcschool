import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401s globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout on unauthorized (token expired/invalid)
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Fees API
export const createFee = (data) => api.post('/fees/createFee', data);
export const getFees = () => api.get('/fees/getFees');
export const updateFee = (data) => api.put('/fees/updateFee', data);
export const deleteFee = (id) => api.delete(`/fees/deleteFee/${id}`);

// Communication & Chat API
export const createCommunication = (data) => api.post('/communication/createChat', data);
export const getCommunication = (type) => api.get(`/communication/getChat/${type}`);

// School Info API
export const getInfo = () => api.get('/info/getAll');
export const updateSettings = (data) => api.put('/info/settings', data);

export const addChampion = (data) => api.post('/info/champion', data);
export const updateChampion = (id, data) => api.put(`/info/champion/${id}`, data);
export const deleteChampion = (id) => api.delete(`/info/champion/${id}`);

export const addGalleryImage = (data) => api.post('/info/gallery', data);
export const deleteGalleryImage = (id) => api.delete(`/info/gallery/${id}`);

export const addNewsletter = (data) => api.post('/info/newsletter', data);
export const deleteNewsletter = (id) => api.delete(`/info/newsletter/${id}`);

// Notification API
export const updateNotification = (id) => api.put(`/user/updateNotification/${id}`);

// File Upload API (proxied through backend — NO direct Supabase access)
export const uploadFile = async (file, bucket = "school") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  const response = await api.post("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.url;
};

export default api;
