export type ServerEvent =
  | {
      type: "ROOM_CREATED";
      roomId: string;
      participantId: string;
      initiator: boolean;
    }
  | {
      type: "ROOM_JOINED";
      roomId: string;
      participantId: string;
      initiator: boolean;
    }
  | {
      type: "ROOM_RECONNECTED";
      roomId: string;
      participantId: string;
      initiator: boolean;
    }
  | {
      type: "PARTNER_CONNECTED";
    }
  | {
      type: "PARTNER_DISCONNECTED";
    }
  | {
      type: "PARTNER_CAMERA_READY";
    }
  | { type: "PARTNER_WEBRTC_READY" }
  | { type: "COUNTDOWN_START" }
  | { type: "CAPTURE_NOW" }
  | { type: "START_CAPTURE" }
  | { type: "PHOTOS_READY" }
  | { type: "RETAKE_START"; shot: number }
  | { type: "CONTINUE_WAITING" }
  | { type: "NEXT_SHOT"; shot: number }
  | { type: "COMPOSE_START" }
  | {
      type: "PARTNER_PHOTO_CAPTURED";
      photo: string;
    }
  | { type: "LEAVE_ROOM" }
  | {
      type: "WEBRTC_OFFER";
      offer: RTCSessionDescriptionInit;
    }
  | {
      type: "WEBRTC_ANSWER";
      answer: RTCSessionDescriptionInit;
    }
  | {
      type: "WEBRTC_ICE_CANDIDATE";
      candidate: RTCIceCandidateInit;
    }
  | {
      type: "ERROR";
      message: string;
    };
