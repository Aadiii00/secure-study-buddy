import { useCallback, useEffect, useRef, useState } from 'react';

export type FaceAnomalyType = 'no_face' | 'multiple_faces' | 'face_not_centered';

interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  /** Grace period in ms before "no face" fires (default 5000) */
  noFaceGracePeriod?: number;
  onAnomaly?: (type: FaceAnomalyType) => void;
}

/**
 * Face detection hook using face-api.js TinyFaceDetector.
 * Loads models lazily. Fires anomaly only after grace period for no-face.
 */
export function useFaceDetection({
  videoRef,
  enabled,
  noFaceGracePeriod = 5000,
  onAnomaly,
}: UseFaceDetectionOptions) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [isCentered, setIsCentered] = useState(true);
  const faceApiRef = useRef<any>(null);
  const noFaceStartRef = useRef<number | null>(null);
  const noFaceFiredRef = useRef(false);

  // Load models
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const faceapi = await import('face-api.js');
        faceApiRef.current = faceapi;
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (!cancelled) setModelsLoaded(true);
      } catch {
        if (!cancelled) setModelsLoaded(true); // still allow camera
      }
    };
    load();
    return () => { cancelled = true; };
  }, [enabled]);

  const detectFaces = useCallback(async (): Promise<{
    faceCount: number;
    isCentered: boolean;
    anomalyType: FaceAnomalyType | null;
  }> => {
    const faceapi = faceApiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video || video.readyState < 2) {
      return { faceCount: 0, isCentered: true, anomalyType: null };
    }

    try {
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
      );

      const faces = detections.length;
      setFaceCount(faces);

      if (faces === 0) {
        // Grace period logic
        if (noFaceStartRef.current === null) {
          noFaceStartRef.current = Date.now();
          noFaceFiredRef.current = false;
        }
        const elapsed = Date.now() - noFaceStartRef.current;
        if (elapsed >= noFaceGracePeriod && !noFaceFiredRef.current) {
          noFaceFiredRef.current = true;
          onAnomaly?.('no_face');
          return { faceCount: 0, isCentered: true, anomalyType: 'no_face' };
        }
        return { faceCount: 0, isCentered: true, anomalyType: null };
      }

      // Face found — reset grace
      noFaceStartRef.current = null;
      noFaceFiredRef.current = false;

      if (faces > 1) {
        onAnomaly?.('multiple_faces');
        return { faceCount: faces, isCentered: true, anomalyType: 'multiple_faces' };
      }

      // Check centering
      const box = detections[0].box;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const frameW = video.videoWidth || 640;
      const frameH = video.videoHeight || 480;
      const tolerance = 0.35;

      const centered =
        Math.abs(centerX - frameW / 2) <= (frameW / 2) * tolerance &&
        Math.abs(centerY - frameH / 2) <= (frameH / 2) * tolerance;

      setIsCentered(centered);
      if (!centered) {
        onAnomaly?.('face_not_centered');
        return { faceCount: 1, isCentered: false, anomalyType: 'face_not_centered' };
      }

      return { faceCount: 1, isCentered: true, anomalyType: null };
    } catch {
      return { faceCount: 0, isCentered: true, anomalyType: null };
    }
  }, [videoRef, noFaceGracePeriod, onAnomaly]);

  return { modelsLoaded, faceCount, isCentered, detectFaces };
}
