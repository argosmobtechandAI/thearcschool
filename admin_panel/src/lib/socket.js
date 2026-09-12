import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : "http://localhost:3003");

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: false,
});
