import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:3002/api").replace(/\/api\/?$/, '');

export const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});
