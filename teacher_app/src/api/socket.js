import io from 'socket.io-client';
import { SOCKET_URL } from '@env';

// Initialize socket (URL should match backend)
const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'],
});

export default socket;
