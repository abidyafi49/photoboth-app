import type { WebSocket } from "ws";

export type RoomPhase =
  | "LOBBY"
  | "CONNECTED"
  | "COUNTDOWN"
  | "WAITING_PHOTOS"
  | "PHOTO_READY"
  | "COMPOSING"
  | "DONE";

export type Participant = {
  id: string;
  socket: WebSocket;
  cameraReady: boolean;
  ready: boolean;
  continueReady: boolean;
  disconnectedAt?: number;
};

export type Room = {
  id: string;
  participants: Map<string, Participant>;
  phase: RoomPhase;
  currentShot: number;
  capturedParticipants: Set<string>;
};

