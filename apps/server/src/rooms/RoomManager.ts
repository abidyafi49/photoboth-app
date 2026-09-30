import { randomBytes, randomUUID } from "crypto";
import type { WebSocket } from "ws";

import type { Participant, Room } from "./types";

const RECONNECT_TIMEOUT = 60_000;

export class RoomManager {
  private rooms = new Map<string, Room>();

  // =========================
  // ROOM
  // =========================

  createRoom(socket: WebSocket) {
    const roomId = this.generateRoomId();

    const participant: Participant = {
      id: randomUUID(),
      socket,
      cameraReady: false,
      ready: false,
      continueReady: false,
    };

    const room: Room = {
      id: roomId,
      participants: new Map([[participant.id, participant]]),
      phase: "LOBBY",
      currentShot: 0,
      capturedParticipants: new Set(),
    };

    this.rooms.set(roomId, room);

    return {
      room,
      participant,
    };
  }

  joinRoom(roomId: string, socket: WebSocket) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    if (room.participants.size >= 2) {
      return { error: "ROOM_FULL" };
    }

    const participant: Participant = {
      id: randomUUID(),
      socket,
      cameraReady: false,
      ready: false,
      continueReady: false,
    };

    room.participants.set(participant.id, participant);
    room.phase = "CONNECTED";

    return {
      room,
      participant,
    };
  }

  // =========================
  // FIND
  // =========================

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  getParticipant(room: Room, participantId: string) {
    return room.participants.get(participantId);
  }

  // =========================
  // DISCONNECT
  // =========================

  disconnectParticipant(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(participantId);
    if (!participant) return;

    // Jangan menandai participant yang sudah reconnect.
    if (participant.disconnectedAt !== undefined) return;

    participant.disconnectedAt = Date.now();

    // Reset sesi capture karena partner terputus.
    room.phase = "LOBBY";
    room.currentShot = 0;
    room.capturedParticipants.clear();

    for (const p of room.participants.values()) {
      p.continueReady = false;
      p.ready = false;
    }

    // Hapus participant jika tidak reconnect dalam 60 detik.
    const disconnectedAt = participant.disconnectedAt;

    setTimeout(() => {
      const currentRoom = this.rooms.get(roomId);
      if (!currentRoom) return;

      const currentParticipant = currentRoom.participants.get(participantId);
      if (!currentParticipant) return;

      // Pastikan timer ini masih berlaku.
      if (currentParticipant.disconnectedAt !== disconnectedAt) return;

      this.removeParticipant(roomId, participantId);
    }, RECONNECT_TIMEOUT);
  }

  // =========================
  // RECONNECT
  // =========================

  reconnectParticipant(
    roomId: string,
    participantId: string,
    socket: WebSocket,
  ) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const participant = room.participants.get(participantId);

    if (!participant) {
      return { error: "PARTICIPANT_NOT_FOUND" };
    }

    if (participant.disconnectedAt === undefined) {
      return { error: "PARTICIPANT_ALREADY_CONNECTED" };
    }

    const elapsed = Date.now() - participant.disconnectedAt;

    if (elapsed > RECONNECT_TIMEOUT) {
      this.removeParticipant(roomId, participantId);
      return { error: "RECONNECT_TIMEOUT" };
    }

    // Ganti koneksi lama dengan koneksi baru.
    participant.socket = socket;
    participant.disconnectedAt = undefined;

    // Kesiapan kamera dan WebRTC perlu diulang.
    participant.cameraReady = false;
    participant.ready = false;
    participant.continueReady = false;

    room.phase =
      room.participants.size === 2 &&
      [...room.participants.values()].every(
        (p) => p.disconnectedAt === undefined,
      )
        ? "CONNECTED"
        : "LOBBY";

    return {
      room,
      participant,
    };
  }

  // =========================
  // REMOVE
  // =========================

  removeParticipant(roomId: string, participantId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(participantId);

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      return;
    }

    room.phase = "LOBBY";
    room.currentShot = 0;
    room.capturedParticipants.clear();

    for (const participant of room.participants.values()) {
      participant.continueReady = false;
      participant.ready = false;
    }
  }

  // =========================
  // BROADCAST
  // =========================

  broadcast(room: Room, message: unknown, excludeParticipantId?: string) {
    const payload = JSON.stringify(message);

    for (const participant of room.participants.values()) {
      if (participant.id === excludeParticipantId) {
        continue;
      }

      if (
        participant.disconnectedAt === undefined &&
        participant.socket.readyState === 1
      ) {
        participant.socket.send(payload);
      }
    }
  }

  // =========================
  // PRIVATE
  // =========================

  private generateRoomId() {
    return randomBytes(4).toString("hex").toUpperCase();
  }
}
