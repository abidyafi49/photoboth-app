import type { WebSocket } from "ws";
import { RoomManager } from "../rooms/RoomManager";
//import type { Room } from "../rooms/types";

type ClientEvent =
  | { type: "CREATE_ROOM" }
  | { type: "JOIN_ROOM"; roomId: string }
  | {
      type: "RECONNECT_ROOM";
      roomId: string;
      participantId: string;
    }
  | { type: "CAMERA_READY" }
  | { type: "WEBRTC_READY" }
  | { type: "WEBRTC_OFFER"; offer: unknown }
  | { type: "WEBRTC_ANSWER"; answer: unknown }
  | { type: "WEBRTC_ICE_CANDIDATE"; candidate: unknown }
  | { type: "START_CAPTURE" }
  | { type: "PHOTO_CAPTURED"; photo: string }
  | { type: "RETAKE" }
  | { type: "CONTINUE" }
  | { type: "LEAVE_ROOM" };

type ClientSession = {
  roomId?: string;
  participantId?: string;
};

export function setupWebSocket(socket: WebSocket, roomManager: RoomManager) {
  const session: ClientSession = {};

  socket.on("message", (rawMessage) => {
    try {
      const event = JSON.parse(rawMessage.toString()) as ClientEvent;

      handleEvent(socket, event, session, roomManager);
    } catch {
      send(socket, {
        type: "ERROR",
        message: "Invalid message",
      });
    }
  });

  socket.on("close", () => {
    if (!session.roomId || !session.participantId) {
      return;
    }

    const room = roomManager.getRoom(session.roomId);

    if (!room) {
      return;
    }

    const participant = roomManager.getParticipant(room, session.participantId);

    // Abaikan koneksi lama yang tertutup setelah reconnect berhasil.
    if (!participant || participant.socket !== socket) {
      return;
    }

    roomManager.disconnectParticipant(session.roomId, session.participantId);

    roomManager.broadcast(
      room,
      {
        type: "PARTNER_DISCONNECTED",
      },
      session.participantId,
    );
  });
}

function handleEvent(
  socket: WebSocket,
  event: ClientEvent,
  session: ClientSession,
  roomManager: RoomManager,
) {
  // Abaikan event dari koneksi lama setelah reconnect.
  if (session.roomId && session.participantId) {
    const room = roomManager.getRoom(session.roomId);
    const participant = room
      ? roomManager.getParticipant(room, session.participantId)
      : undefined;

    if (!participant || participant.socket !== socket) {
      console.warn("[WebSocket] Ignoring event from stale socket");
      return;
    }
  }

  switch (event.type) {
    case "CREATE_ROOM":
      handleCreateRoom(socket, session, roomManager);
      break;

    case "JOIN_ROOM":
      handleJoinRoom(socket, event.roomId, session, roomManager);
      break;

    case "RECONNECT_ROOM":
      handleReconnectRoom(
        socket,
        event.roomId,
        event.participantId,
        session,
        roomManager,
      );
      break;

    case "CAMERA_READY":
      handleCameraReady(session, roomManager);
      break;

    case "WEBRTC_READY":
      handleWebRTCReady(session, roomManager);
      break;

    case "WEBRTC_OFFER":
      handleWebRTCOffer(session, event.offer, roomManager);
      break;

    case "WEBRTC_ANSWER":
      handleWebRTCAnswer(session, event.answer, roomManager);
      break;

    case "WEBRTC_ICE_CANDIDATE":
      handleWebRTCIceCandidate(session, event.candidate, roomManager);
      break;

    case "START_CAPTURE":
      handleStartCapture(session, roomManager);
      break;

    case "PHOTO_CAPTURED":
      handlePhotoCaptured(session, event.photo, roomManager);
      break;

    case "RETAKE":
      handleRetake(session, roomManager);
      break;

    case "CONTINUE":
      handleContinue(session, roomManager);
      break;

    case "LEAVE_ROOM":
      handleLeaveRoom(session, roomManager);
      break;

    default:
      send(socket, {
        type: "ERROR",
        message: "Unknown event",
      });
  }
}

function handleCreateRoom(
  socket: WebSocket,
  session: ClientSession,
  roomManager: RoomManager,
) {
  const result = roomManager.createRoom(socket);

  session.roomId = result.room.id;
  session.participantId = result.participant.id;

  send(socket, {
    type: "ROOM_CREATED",
    roomId: result.room.id,
    participantId: result.participant.id,
    initiator: true,
  });
}

function handleJoinRoom(
  socket: WebSocket,
  roomId: string,
  session: ClientSession,
  roomManager: RoomManager,
) {
  const result = roomManager.joinRoom(roomId.toUpperCase(), socket);

  if ("error" in result) {
    send(socket, {
      type: "ERROR",
      message: result.error,
    });

    return;
  }

  session.roomId = result.room.id;
  session.participantId = result.participant.id;

  send(socket, {
    type: "ROOM_JOINED",
    roomId: result.room.id,
    participantId: result.participant.id,
    initiator: false,
  });

  roomManager.broadcast(result.room, {
    type: "PARTNER_CONNECTED",
  });

  const existingParticipant = [...result.room.participants.values()].find(
    (participant) => participant.id !== result.participant.id,
  );

  if (existingParticipant?.cameraReady) {
    send(socket, {
      type: "PARTNER_CAMERA_READY",
    });
  }
}

function handleReconnectRoom(
  socket: WebSocket,
  roomId: string,
  participantId: string,
  session: ClientSession,
  roomManager: RoomManager,
) {
  const result = roomManager.reconnectParticipant(
    roomId.toUpperCase(),
    participantId,
    socket,
  );

  if ("error" in result) {
    send(socket, {
      type: "ERROR",
      message: result.error,
    });

    return;
  }

  const { room, participant } = result;

  // Pulihkan identitas sesi pada koneksi baru.
  session.roomId = room.id;
  session.participantId = participant.id;

  // Peserta pertama di Map adalah pembuat room.
  const initiator = [...room.participants.keys()][0] === participant.id;

  send(socket, {
    type: "ROOM_RECONNECTED",
    roomId: room.id,
    participantId: participant.id,
    initiator,
  });

  // Beri tahu peserta lain bahwa partner sudah kembali.
  roomManager.broadcast(
    room,
    {
      type: "PARTNER_CONNECTED",
    },
    participant.id,
  );

  const partner = [...room.participants.values()].find(
    (p) => p.id !== participant.id,
  );

  if (partner?.cameraReady) {
    send(socket, {
      type: "PARTNER_CAMERA_READY",
    });
  }
}

function handleCameraReady(session: ClientSession, roomManager: RoomManager) {
  if (!session.roomId || !session.participantId) {
    return;
  }

  const room = roomManager.getRoom(session.roomId);

  if (!room) {
    return;
  }

  const participant = roomManager.getParticipant(room, session.participantId);

  if (!participant) {
    return;
  }

  participant.cameraReady = true;

  roomManager.broadcast(
    room,
    {
      type: "PARTNER_CAMERA_READY",
    },
    participant.id,
  );
}

function handleWebRTCReady(session: ClientSession, roomManager: RoomManager) {
  if (!session.roomId || !session.participantId) return;

  const room = roomManager.getRoom(session.roomId);
  if (!room) return;

  roomManager.broadcast(
    room,
    {
      type: "PARTNER_WEBRTC_READY",
    },
    session.participantId,
  );
}

function handleStartCapture(session: ClientSession, roomManager: RoomManager) {
  if (!session.roomId || !session.participantId) return;

  const room = roomManager.getRoom(session.roomId);
  if (!room) return;

  if (room.participants.size !== 2) {
    console.log("[Capture] Room must have 2 participants");
    return;
  }

  if (room.phase !== "LOBBY" && room.phase !== "CONNECTED") {
    console.log("[Capture] Cannot start. Phase:", room.phase);
    return;
  }

  room.currentShot = 1;
  room.capturedParticipants.clear();

  for (const participant of room.participants.values()) {
    participant.continueReady = false;
  }

  room.phase = "COUNTDOWN";

  console.log("[Capture] Starting shot", room.currentShot);

  roomManager.broadcast(room, {
    type: "COUNTDOWN_START",
  });
}

function handleWebRTCOffer(
  session: ClientSession,
  offer: unknown,
  roomManager: RoomManager,
) {
  if (!session.roomId || !session.participantId) {
    return;
  }

  const room = roomManager.getRoom(session.roomId);

  if (!room) {
    return;
  }

  roomManager.broadcast(
    room,
    {
      type: "WEBRTC_OFFER",
      offer,
    },
    session.participantId,
  );
}

function handleWebRTCAnswer(
  session: ClientSession,
  answer: unknown,
  roomManager: RoomManager,
) {
  if (!session.roomId || !session.participantId) {
    return;
  }

  const room = roomManager.getRoom(session.roomId);

  if (!room) {
    return;
  }

  roomManager.broadcast(
    room,
    {
      type: "WEBRTC_ANSWER",
      answer,
    },
    session.participantId,
  );
}

function handleWebRTCIceCandidate(
  session: ClientSession,
  candidate: unknown,
  roomManager: RoomManager,
) {
  if (!session.roomId || !session.participantId) {
    return;
  }

  const room = roomManager.getRoom(session.roomId);

  if (!room) {
    return;
  }

  roomManager.broadcast(
    room,
    {
      type: "WEBRTC_ICE_CANDIDATE",
      candidate,
    },
    session.participantId,
  );
}

function handlePhotoCaptured(
  session: ClientSession,
  photo: string,
  roomManager: RoomManager,
) {
  if (!session.roomId || !session.participantId) return;

  const room = roomManager.getRoom(session.roomId);
  if (!room) return;

  if (room.phase !== "COUNTDOWN" && room.phase !== "WAITING_PHOTOS") {
    return;
  }

  if (
    typeof photo !== "string" ||
    !photo.startsWith("data:image/jpeg;base64,")
  ) {
    return;
  }

  if (room.capturedParticipants.has(session.participantId)) {
    return;
  }

  room.capturedParticipants.add(session.participantId);
  room.phase = "WAITING_PHOTOS";

  console.log("[Capture] Photo received from", session.participantId);

  roomManager.broadcast(
    room,
    {
      type: "PARTNER_PHOTO_CAPTURED",
      photo,
    },
    session.participantId,
  );

  if (room.capturedParticipants.size === 2) {
    room.phase = "PHOTO_READY";

    roomManager.broadcast(room, {
      type: "PHOTOS_READY",
    });

    console.log("[Capture] Both photos are ready");
  }
}

function handleRetake(session: ClientSession, roomManager: RoomManager) {
  if (!session.roomId || !session.participantId) return;

  const room = roomManager.getRoom(session.roomId);
  if (!room || room.phase !== "PHOTO_READY") return;

  room.capturedParticipants.clear();

  for (const participant of room.participants.values()) {
    participant.continueReady = false;
  }

  room.phase = "COUNTDOWN";

  console.log("[Capture] Retaking shot", room.currentShot);

  roomManager.broadcast(room, {
    type: "RETAKE_START",
    shot: room.currentShot,
  });
}

function handleContinue(session: ClientSession, roomManager: RoomManager) {
  if (!session.roomId || !session.participantId) return;

  const room = roomManager.getRoom(session.roomId);
  if (!room || room.phase !== "PHOTO_READY") return;

  const participant = roomManager.getParticipant(room, session.participantId);

  if (!participant || participant.continueReady) return;

  participant.continueReady = true;

  const allReady = [...room.participants.values()].every(
    (p) => p.continueReady,
  );

  if (!allReady) {
    roomManager.broadcast(room, {
      type: "CONTINUE_WAITING",
    });

    console.log("[Capture] Waiting for partner to continue");
    return;
  }

  if (room.currentShot >= 4) {
    room.phase = "COMPOSING";

    roomManager.broadcast(room, {
      type: "COMPOSE_START",
    });

    console.log("[Capture] All shots completed");
    return;
  }

  room.currentShot += 1;
  room.capturedParticipants.clear();

  for (const p of room.participants.values()) {
    p.continueReady = false;
  }

  room.phase = "COUNTDOWN";

  console.log("[Capture] Starting shot", room.currentShot);

  roomManager.broadcast(room, {
    type: "NEXT_SHOT",
    shot: room.currentShot,
  });
}

function handleLeaveRoom(session: ClientSession, roomManager: RoomManager) {
  if (!session.roomId || !session.participantId) {
    return;
  }

  const room = roomManager.getRoom(session.roomId);

  roomManager.removeParticipant(session.roomId, session.participantId);

  if (room) {
    roomManager.broadcast(room, {
      type: "PARTNER_DISCONNECTED",
    });
  }

  session.roomId = undefined;
  session.participantId = undefined;
}

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}
