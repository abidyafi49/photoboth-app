import { useCallback } from "react";

export function usePhotoCapture() {
  const capture = useCallback(async (stream: MediaStream) => {
    const video = document.createElement("video");

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await video.play();

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create canvas context");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    video.srcObject = null;

    if (!blob) {
      throw new Error("Failed to create photo");
    }

    return blob;
  }, []);

  return { capture };
}
