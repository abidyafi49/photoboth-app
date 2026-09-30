import { useEffect, useRef, useState, useCallback } from "react";

import { createSocket } from "../../server/src/lib/socket";
import type { ServerEvent } from "./types/socket";
import CameraPreview from "./components/CameraPreview";
import RemoteVideo from "./components/RemoteVideo";
import CountdownOverlay from "./components/CountdownOverlay";
import CaptureButton from "./components/CaptureButton";
import PhotoStripEditorPage from "./components/pages/PhotoStripEditorPage";
import PartnerStatus from "./components/PartnerStatus";
import { useWebRTC } from "./hooks/useWebRTC";

type PhotoShot = {
  shot: number;
  myPhoto: string;
  partnerPhoto: string;
};

type View = "HOME" | "CREATE" | "JOIN" | "ROOM" | "SELECT_PHOTOS";

function App() {
  const socketRef = useRef<WebSocket | null>(null);

  const roomIdRef = useRef<string | null>(null);

  const participantIdRef = useRef<string | null>(null);

  const captureInProgressRef = useRef(false);

  const countdownIntervalRef = useRef<number | null>(null);

  const [view, setView] = useState<View>("HOME");

  const [roomId, setRoomId] = useState("");

  const [joinCode, setJoinCode] = useState("");

  const [connected, setConnected] = useState(false);

  const [partnerConnected, setPartnerConnected] = useState(false);

  const [error, setError] = useState("");

  const [cameraReady, setCameraReady] = useState(false);

  const [partnerCameraReady, setPartnerCameraReady] = useState(false);
  const [partnerWebRTCReady, setPartnerWebRTCReady] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [isInitiator, setIsInitiator] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);
  const [currentShot, setCurrentShot] = useState(0);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [partnerContinueReady, setPartnerContinueReady] = useState(false);
  const [photos, setPhotos] = useState<PhotoShot[]>([]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const { remoteStream } = useWebRTC({
    socket,
    localStream,
    partnerConnected,
    isInitiator,
    partnerWebRTCReady,
  });

  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  function handleServerEvent(message: ServerEvent) {
    switch (message.type) {
      case "ROOM_CREATED":
        roomIdRef.current = message.roomId;
        participantIdRef.current = message.participantId;

        setRoomId(message.roomId);
        setIsInitiator(message.initiator);
        setView("ROOM");
        break;

      case "ROOM_JOINED":
        roomIdRef.current = message.roomId;
        participantIdRef.current = message.participantId;

        setRoomId(message.roomId);
        setIsInitiator(message.initiator);
        setView("ROOM");
        break;

      case "ROOM_RECONNECTED":
        roomIdRef.current = message.roomId;
        participantIdRef.current = message.participantId;

        setRoomId(message.roomId);
        setIsInitiator(message.initiator);

        setPartnerCameraReady(false);
        setPartnerWebRTCReady(false);
        setPartnerConnected(true);

        if (localStreamRef.current) {
          send({ type: "CAMERA_READY" });
        }

        console.log("[Reconnect] Successfully reconnected");
        break;

      case "PARTNER_CONNECTED":
        setPartnerConnected(true);
        setPartnerCameraReady(false);
        setPartnerWebRTCReady(false);
        break;

      case "PARTNER_DISCONNECTED":
        console.log("[Room] Partner disconnected");

        setPartnerConnected(false);
        setPartnerCameraReady(false);
        setPartnerWebRTCReady(false);
        setPartnerContinueReady(false);
        setWaitingForPartner(false);

        setCapturedPhoto(null);
        setPartnerPhoto(null);
        setPhotos([]);

        setCountdown(null);
        setIsCapturing(false);
        captureInProgressRef.current = false;

        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        break;

      case "PARTNER_CAMERA_READY":
        setPartnerCameraReady(true);
        break;

      case "PARTNER_WEBRTC_READY":
        console.log("[WebRTC] Partner is ready");
        setPartnerWebRTCReady(true);
        break;

      case "PARTNER_PHOTO_CAPTURED":
        console.log("[Capture] Partner photo received");
        setPartnerPhoto(message.photo);
        break;

      case "COUNTDOWN_START":
        setCurrentShot(1);
        setCapturedPhoto(null);
        setPartnerPhoto(null);
        setWaitingForPartner(false);
        setPartnerContinueReady(false);
        startCountdown();
        break;

      case "PHOTOS_READY":
        setWaitingForPartner(false);
        console.log("[Capture] Both photos are ready");
        break;

      case "RETAKE_START":
        setCurrentShot(message.shot);
        setCapturedPhoto(null);
        setPartnerPhoto(null);
        setPhotos((previousPhotos) =>
          previousPhotos.filter((photo) => photo.shot !== message.shot),
        );
        setWaitingForPartner(false);
        setPartnerContinueReady(false);
        startCountdown();
        break;

      case "CONTINUE_WAITING":
        setPartnerContinueReady(true);
        console.log("[Capture] Partner is waiting for your decision");
        break;

      case "NEXT_SHOT":
        setCurrentShot(message.shot);
        setCapturedPhoto(null);
        setPartnerPhoto(null);
        setWaitingForPartner(false);
        setPartnerContinueReady(false);
        startCountdown();
        break;

      case "COMPOSE_START":
        console.log("[Capture] Starting photo composition");
        setView("SELECT_PHOTOS");
        break;

      case "ERROR":
        setError(message.message);
        break;
    }
  }

  useEffect(() => {
    let isUnmounted = false;
    let reconnectTimer: number | null = null;

    function connect() {
      if (isUnmounted) return;

      const ws = createSocket();

      socketRef.current = ws;
      setSocket(ws);

      ws.addEventListener("open", () => {
        if (isUnmounted) {
          ws.close();
          return;
        }

        console.log("[WebSocket] Connected");
        setConnected(true);

        const roomId = roomIdRef.current;
        const participantId = participantIdRef.current;

        // Jika identitas tersedia, ini adalah reconnect.
        if (roomId && participantId) {
          console.log("[Reconnect] Requesting room reconnect");

          ws.send(
            JSON.stringify({
              type: "RECONNECT_ROOM",
              roomId,
              participantId,
            }),
          );
        }
      });

      ws.addEventListener("close", () => {
        if (socketRef.current === ws) {
          socketRef.current = null;
          setSocket(null);
        }

        if (isUnmounted) return;

        console.log("[WebSocket] Disconnected");
        setConnected(false);
        setPartnerConnected(false);
        setPartnerCameraReady(false);
        setPartnerWebRTCReady(false);

        reconnectTimer = window.setTimeout(() => connect(), 2000);
      });

      ws.addEventListener("message", (event) => {
        if (isUnmounted) return;

        try {
          const message = JSON.parse(event.data) as ServerEvent;

          console.log("[Server]", message);
          handleServerEvent(message);
        } catch (error) {
          console.error("[WebSocket] Invalid message:", error);
        }
      });
    }

    connect();

    return () => {
      isUnmounted = true;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      const currentSocket = socketRef.current;
      socketRef.current = null;

      if (currentSocket) {
        currentSocket.close();
      }

      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!capturedPhoto || !partnerPhoto || currentShot === 0) {
      return;
    }

    setPhotos((previousPhotos) => {
      const updatedPhoto: PhotoShot = {
        shot: currentShot,
        myPhoto: capturedPhoto,
        partnerPhoto,
      };

      const existingIndex = previousPhotos.findIndex(
        (photo) => photo.shot === currentShot,
      );

      if (existingIndex === -1) {
        return [...previousPhotos, updatedPhoto].sort((a, b) => a.shot - b.shot);
      }

      return previousPhotos.map((photo) =>
        photo.shot === currentShot ? updatedPhoto : photo,
      );
    });
  }, [capturedPhoto, partnerPhoto, currentShot]);

  function send(message: unknown) {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }

  function createRoom() {
    setError("");

    send({
      type: "CREATE_ROOM",
    });
  }

  function joinRoom() {
    setError("");

    send({
      type: "JOIN_ROOM",
      roomId: joinCode,
    });
  }

const handleCapture = useCallback(() => {
  const video = localVideoRef.current;

  try {
    if (!video) {
      throw new Error("Local video not available");
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error("Video has no dimensions");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const image = canvas.toDataURL("image/jpeg", 0.92);

    setCapturedPhoto(image);

    send({
      type: "PHOTO_CAPTURED",
      photo: image,
    });

    console.log("[Capture] Photo captured and sent");
  } catch (error) {
    console.error("[Capture] Failed:", error);
  } finally {
    captureInProgressRef.current = false;
    setIsCapturing(false);
  }
}, []);
  
const handleRetake = () => {
  if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
    return;
  }

  send({ type: "RETAKE" });
};

const handleContinue = () => {
  if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
    return;
  }

  setWaitingForPartner(true);
  send({ type: "CONTINUE" });
};

const startCountdown = useCallback(() => {
  if (captureInProgressRef.current) {
    return;
  }

  captureInProgressRef.current = true;
  setIsCapturing(true);

  let count = 3;
  setCountdown(count);

  console.log("[Capture] Starting countdown");

  countdownIntervalRef.current = window.setInterval(() => {
    count -= 1;

    if (count > 0) {
      setCountdown(count);
      return;
    }

    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setCountdown(null);
    console.log("[Capture] CAPTURE_NOW");

    handleCapture();
  }, 1000);
}, [handleCapture]);



const handleCameraReady = useCallback(
  (stream: MediaStream, video: HTMLVideoElement) => {
    console.log("[Camera] Local camera ready");

    setLocalStream(stream);

    localVideoRef.current = video;

    setCameraReady(true);

    send({
      type: "CAMERA_READY",
    });
  },
  [],
);

  if (view === "HOME") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col gap-4 w-80">
          <h1 className="text-3xl font-bold text-center">Snap Together ❤️</h1>

          <p className="text-center">
            WebSocket: {connected ? "Connected" : "Disconnected"}
          </p>

          <button
            onClick={createRoom}
            className="bg-black text-white rounded-lg py-3"
          >
            Create Room
          </button>

          <button
            onClick={() => setView("JOIN")}
            className="border rounded-lg py-3"
          >
            Join Room
          </button>
        </div>
      </main>
    );
  }

  if (view === "JOIN") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-80 flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Join Room</h1>

          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="AB12CD"
            className="border rounded-lg px-4 py-3"
          />

          <button
            onClick={joinRoom}
            className="bg-black text-white rounded-lg py-3"
          >
            Join
          </button>

          {error && <p className="text-red-500">{error}</p>}

          <button onClick={() => setView("HOME")} className="text-sm">
            Back
          </button>
        </div>
      </main>
    );
  }


if (view === "SELECT_PHOTOS") {
  return (
    <PhotoStripEditorPage photos={photos} onBack={() => setView("ROOM")} />
  );
}

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="min-h-screen bg-neutral-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                ✨ Photobooth
              </h1>

              <p className="mt-1 text-sm text-white/50">
                Capture memories together
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="text-xs text-white/40">ROOM</span>

              <span className="ml-2 font-mono font-semibold">{roomId}</span>
            </div>
          </header>

          {/* Camera area */}
          <div className="grid gap-5 md:grid-cols-2">
            <CameraPreview onReady={handleCameraReady} label="You" />

            <RemoteVideo stream={remoteStream} />
          </div>

          {(capturedPhoto || partnerPhoto) && (
            <section className="mt-10">
              <h2 className="mb-6 text-center text-xl font-bold">Our Photos</h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-center text-sm text-white/70">
                    Your Photo
                  </h3>

                  {capturedPhoto ? (
                    <img
                      src={capturedPhoto}
                      alt="Your captured photo"
                      className="w-full rounded-2xl border border-white/10"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-2xl bg-white/5 text-sm text-white/40">
                      Waiting for your photo...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-center text-sm text-white/70">
                    Partner's Photo
                  </h3>

                  {partnerPhoto ? (
                    <img
                      src={partnerPhoto}
                      alt="Partner's captured photo"
                      className="w-full rounded-2xl border border-white/10"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-2xl bg-white/5 text-sm text-white/40">
                      Waiting for partner's photo...
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {capturedPhoto && partnerPhoto && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-sm text-white/60">Shot {currentShot} of 4</p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleRetake}
                  disabled={waitingForPartner}
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retake
                </button>

                <button
                  onClick={handleContinue}
                  disabled={waitingForPartner}
                  className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>

              {waitingForPartner && (
                <p className="text-sm text-white/60">
                  Waiting for partner to continue...
                </p>
              )}

              {partnerContinueReady && !waitingForPartner && (
                <p className="text-sm text-green-400">
                  Your partner is ready to continue.
                </p>
              )}
            </div>
          )}

          {/* Partner Status */}
          <div className="mx-auto mt-6 max-w-md">
            <PartnerStatus
              partnerConnected={partnerConnected}
              partnerCameraReady={partnerCameraReady}
              partnerWebRTCReady={partnerWebRTCReady}
            />
          </div>

          {/* Capture */}
          <div className="mt-10 flex flex-col items-center">
            <CaptureButton
              onClick={() => {
                console.log("[Capture] Button clicked");

                send({
                  type: "START_CAPTURE",
                });
              }}
              disabled={
                !partnerConnected ||
                !cameraReady ||
                !partnerCameraReady ||
                isCapturing
              }
            />

            <p className="mt-5 text-sm text-white/40">Press to capture</p>
          </div>
        </div>

        <CountdownOverlay count={countdown} />
      </div>
    </main>
  );
}

export default App;
