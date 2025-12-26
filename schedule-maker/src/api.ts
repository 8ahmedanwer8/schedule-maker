// api.ts
import axios from "axios";
import { getSessionId } from "./session";

export const api = axios.create({
  baseURL: "http://localhost:5000", // same origin, or set your backend URL
});

api.interceptors.request.use((config) => {
  const sid = getSessionId();
  if (sid) {
    config.headers = config.headers ?? {};
    config.headers["x-session-id"] = sid;
  }
  return config;
});
