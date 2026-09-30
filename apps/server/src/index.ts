import http from "http";
import { WebSocketServer } from "ws";

import { RoomManager } from "./rooms/RoomManager";
import { setupWebSocket } from "./websocket/events";

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer();

const wss = new WebSocketServer({
  server,
});

const roomManager = new RoomManager();

wss.on("connection", (socket) => {
  console.log("Client connected");

  setupWebSocket(socket, roomManager);
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
