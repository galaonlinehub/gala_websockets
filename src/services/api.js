// import axios from "axios";
// import { config } from "../config/index.js";

// const api = axios.create({
//   baseURL: config.apiBaseUrl,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // api.interceptors.request.use(
// //   (axiosConfig) => {
// //     if (config.apiToken) {
// //       axiosConfig.headers.Authorization = `Bearer ${config.apiToken}`;
// //     }
// //     return axiosConfig;
// //   },
// //   (error) => Promise.reject(error)
// // );

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error(
//       `API Error: ${error.response?.status || "Unknown"} - ${error.message}`
//     );
//     throw error;
//   }
// );

// export const get = async (endpoint, headers = {}) => {
//   const response = await api.get(endpoint, { headers });
//   return response.data;
// };

// export const post = async (endpoint, data, headers = {}) => {
//   const response = await api.post(endpoint, data, { headers });
//   return response.data;
// };

// export const put = async (endpoint, data, headers = {}) => {
//   const response = await api.put(endpoint, data, { headers });
//   return response.data;
// };

// export const patch = async (endpoint, data, headers = {}) => {
//   const response = await api.patch(endpoint, data, { headers });
//   return response.data;
// };

// export const del = async (endpoint, headers = {}) => {
//   const response = await api.delete(endpoint, { headers });
//   return response.data;
// };

// export default api;


import axios from "axios";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";


export const makeAuthenticatedRequest = (token, isDev = false) => {
  const client = axios.create({
    baseURL: config.apiBaseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  client.interceptors.request.use((config) => {
    if (isDev) {
      config.headers["X-Dev-Request"] = "true";
      logger.debug(`[DEV API] ${config.method.toUpperCase()} ${config.url}`);
    }

    config.headers["X-Source"] = "sfu";
    return config;
  });

  return client;
};

