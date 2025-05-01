import axios from "axios";
import { config } from "../config/index.js";

const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// api.interceptors.request.use(
//   (axiosConfig) => {
//     if (config.apiToken) {
//       axiosConfig.headers.Authorization = `Bearer ${config.apiToken}`;
//     }
//     return axiosConfig;
//   },
//   (error) => Promise.reject(error)
// );

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      `API Error: ${error.response?.status || "Unknown"} - ${error.message}`
    );
    throw error;
  }
);

export const get = async (endpoint, headers = {}) => {
  const response = await api.get(endpoint, { headers });
  return response.data;
};

export const post = async (endpoint, data, headers = {}) => {
  const response = await api.post(endpoint, data, { headers });
  return response.data;
};

export const put = async (endpoint, data, headers = {}) => {
  const response = await api.put(endpoint, data, { headers });
  return response.data;
};

export const patch = async (endpoint, data, headers = {}) => {
  const response = await api.patch(endpoint, data, { headers });
  return response.data;
};

export const del = async (endpoint, headers = {}) => {
  const response = await api.delete(endpoint, { headers });
  return response.data;
};

export default api;
