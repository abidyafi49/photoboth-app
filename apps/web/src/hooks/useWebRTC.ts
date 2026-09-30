import { useEffect, useRef, useState } from "react";

type UseWebRTCProps = {
  socket: WebSocket | null;
  localStream: MediaStream | null;
  partnerConnected: boolean;
  isInitiator: boolean;
  partnerWebRTCReady: boolean;
};

export function useWebRTC({
  socket,
  localStream,
  partnerConnected,
  isInitiator,
  partnerWebRTCReady,
}: UseWebRTCProps) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerInProgressRef = useRef(false);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>("new");
  const [peerVersion, setPeerVersion] = useState(0);

  // Create the peer connection only when needed.
  useEffect(() => {
    if (!socket || !localStream || !partnerConnected) {
      return;
    }

    const activeSocket = socket;
    const stream = localStream;

    let active = true;
    let peer: RTCPeerConnection | null = null;
    let handleMessage: ((event: MessageEvent) => void) | null = null;

    function sendSignal(message: unknown) {
      if (activeSocket.readyState !== WebSocket.OPEN) {
        console.warn("[WebRTC] WebSocket is not open. Message skipped.");
        return false;
      }

      activeSocket.send(JSON.stringify(message));
      return true;
    }

    function startConnection() {
      if (!active || activeSocket.readyState !== WebSocket.OPEN) {
        return;
      }

      // Prevent duplicate peer connections.
      if (peerRef.current) {
        return;
      }

      console.log("[WebRTC] Starting connection");

      const connection = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      peer = connection;
      peerRef.current = connection;
      pendingCandidatesRef.current = [];
      offerInProgressRef.current = false;

      stream.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind);
        connection.addTrack(track, stream);
      });

      connection.ontrack = (event) => {
        console.log("[WebRTC] Remote track received:", event.track.kind);

        if (event.streams.length > 0) {
          setRemoteStream(event.streams[0]);
        }
      };

      connection.onicecandidate = (event) => {
        if (!event.candidate || !active) return;

        console.log("[WebRTC] Sending ICE candidate");

        sendSignal({
          type: "WEBRTC_ICE_CANDIDATE",
          candidate: event.candidate.toJSON(),
        });
      };

      connection.onconnectionstatechange = () => {
        if (!active) return;

        const state = connection.connectionState;

        console.log("[WebRTC] Connection state:", state);
        setConnectionState(state);

        if (state === "failed" || state === "closed") {
          setRemoteStream(null);
        }
      };

      handleMessage = async (event: MessageEvent) => {
        if (!active) return;

        let message: any;

        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        try {
          if (message.type === "WEBRTC_OFFER") {
            console.log("[WebRTC] Offer received");

            await connection.setRemoteDescription(
              new RTCSessionDescription(message.offer),
            );

            for (const candidate of pendingCandidatesRef.current) {
              await connection.addIceCandidate(candidate);
            }

            pendingCandidatesRef.current = [];

            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);

            sendSignal({
              type: "WEBRTC_ANSWER",
              answer: connection.localDescription,
            });

            console.log("[WebRTC] Answer sent");
          }

          if (message.type === "WEBRTC_ANSWER") {
            console.log("[WebRTC] Answer received");

            await connection.setRemoteDescription(
              new RTCSessionDescription(message.answer),
            );

            for (const candidate of pendingCandidatesRef.current) {
              await connection.addIceCandidate(candidate);
            }

            pendingCandidatesRef.current = [];
          }

          if (message.type === "WEBRTC_ICE_CANDIDATE") {
            console.log("[WebRTC] ICE candidate received");

            const candidate = message.candidate;

            if (connection.remoteDescription) {
              await connection.addIceCandidate(candidate);
            } else {
              pendingCandidatesRef.current.push(candidate);
            }
          }
        } catch (error) {
          console.error("[WebRTC] Signaling error:", error);
        }
      };

      activeSocket.addEventListener("message", handleMessage);

      console.log("[WebRTC] Sending WEBRTC_READY");

      sendSignal({
        type: "WEBRTC_READY",
      });

      setPeerVersion((version) => version + 1);
    }

    // Wait for the WebSocket to open before creating the peer.
    if (activeSocket.readyState === WebSocket.OPEN) {
      startConnection();
    } else {
      activeSocket.addEventListener("open", startConnection);
    }

    return () => {
      active = false;
      activeSocket.removeEventListener("open", startConnection);

      if (handleMessage) {
        activeSocket.removeEventListener("message", handleMessage);
      }

      if (peer) {
        console.log("[WebRTC] Cleaning up");
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onconnectionstatechange = null;
        peer.close();
      }

      if (peerRef.current === peer) {
        peerRef.current = null;
      }

      pendingCandidatesRef.current = [];
      offerInProgressRef.current = false;

      setRemoteStream(null);
      setConnectionState("new");
    };
  }, [socket, localStream, partnerConnected]);

  // Create an offer without recreating the peer connection.
  useEffect(() => {
    if (!isInitiator || !partnerWebRTCReady) {
      return;
    }

    const peerFromRef = peerRef.current;

    if (!peerFromRef || peerFromRef.signalingState !== "stable") {
      return;
    }

    // Explicitly narrow the type to a non-null peer connection.
    const currentPeer: RTCPeerConnection = peerFromRef;

    if (offerInProgressRef.current) {
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("[WebRTC] Cannot create offer: socket is not open");
      return;
    }

    const activeSocket = socket;

    let cancelled = false;
    offerInProgressRef.current = true;

    async function createOffer() {
      try {
        console.log("[WebRTC] Creating offer...");

        const offer = await currentPeer.createOffer();

        if (cancelled || peerRef.current !== currentPeer) return;

        await currentPeer.setLocalDescription(offer);

        if (cancelled || peerRef.current !== currentPeer) return;

        if (activeSocket.readyState !== WebSocket.OPEN) {
          console.warn("[WebRTC] Socket closed before offer could be sent");
          return;
        }

        activeSocket.send(
          JSON.stringify({
            type: "WEBRTC_OFFER",
            offer: currentPeer.localDescription,
          }),
        );

        console.log("[WebRTC] Offer sent");
      } catch (error) {
        console.error("[WebRTC] Offer error:", error);
      } finally {
        offerInProgressRef.current = false;
      }
    }

    void createOffer();

    return () => {
      cancelled = true;
    };
  }, [socket, isInitiator, partnerWebRTCReady, peerVersion]);

  return {
    remoteStream,
    connectionState,
  };
}
