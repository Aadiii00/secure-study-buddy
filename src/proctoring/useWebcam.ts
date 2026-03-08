import { useCallback, useRef, useState } from 'react';

/**
 * Webcam hook — handles getUserMedia, mirrored preview, and permission blocking.
 */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.transform = 'scaleX(-1)'; // mirror
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          v.onloadedmetadata = () => {
            v.play().then(resolve).catch(resolve);
          };
        });
      }
      setCameraActive(true);
      setPermissionDenied(false);
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraActive(false);
      setPermissionDenied(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  return { videoRef, cameraActive, permissionDenied, startCamera, stopCamera };
}
