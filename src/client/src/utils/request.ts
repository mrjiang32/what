import axios from "axios";

const request = axios.create({
  baseURL: "/",
});

// 请求拦截器：自动从 localStorage 取 Token 注入请求头
request.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default request;