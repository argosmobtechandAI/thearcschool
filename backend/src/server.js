import http from "http";
import app from "./app.js";
import { initSocket } from "./sockets/chatHandler.js";

const PORT = process.env.PORT || 3002;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});