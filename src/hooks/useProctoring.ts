import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseProctoringOptions {
  attemptId: string;
  snapshotInterval?: number;
  onAnomaly?: (type: 'no_face' | 'multiple_faces' | 'face_not_centered') => void;
  enabled?: boolean;
}

/**
 * AI Proctoring hook using face-api.js for real face detection.
 * Loads models lazily, waits for both camera + models before analyzing.
 */
export function useProctoring({
  attemptId,
  snapshotInterval = 15000,
  onAnomaly,
  enabled = true,
}: UseProctoringOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [isCentered, setIsCentered] = useState(true);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<any>(null);

  // Load face-api.js models (dynamic import to avoid build issues)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const loadModels = async () => {
      try {
        const faceapi = await import('face-api.js');
        faceApiRef.current = faceapi;

        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
        
        // Load only tiny face detector for speed
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        
        if (!cancelled) {
          console.log('Face detection models loaded successfully');
          setModelsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load face detection models:', err);
        // Still mark as loaded so camera works — detection just won't run
        if (!cancelled) setModelsLoaded(true);
      }
    };
    loadModels();

    return () => { cancelled = true; };
  }, [enabled]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!enabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to actually be ready
        await new Promise<void>((resolve) => {
          const v = videoRef.current!;
          v.onloadedmetadata = () => {
            v.play().then(resolve).catch(resolve);
          };
        });
      }
      setCameraActive(true);
      console.log('Camera started successfully');
    } catch (err) {
      console.error('Camera access denied:', err);
      setCameraActive(false);
      onAnomaly?.('no_face');
    }
  }, [enabled, onAnomaly]);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  // Detect faces and capture snapshot
  const captureAndAnalyze = useCallback(async () => {
    const faceapi = faceApiRef.current;
    if (!videoRef.current || !canvasRef.current || !cameraActive || !faceapi) return;

    const video = videoRef.current;
    if (video.readyState < 2) return; // video not ready

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    let faces = 0;
    let centered = true;
    let anomalyDetected = false;

    try {
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
      );

      faces = detections.length;
      setFaceCount(faces);

      if (faces === 0) {
        onAnomaly?.('no_face');
        anomalyDetected = true;
        setAnomalyCount((prev) => prev + 1);
      } else if (faces > 1) {
        onAnomaly?.('multiple_faces');
        anomalyDetected = true;
        setAnomalyCount((prev) => prev + 1);
      } else if (faces === 1) {
        const box = detections[0].box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const frameCenterX = (video.videoWidth || 640) / 2;
        const frameCenterY = (video.videoHeight || 480) / 2;
        const tolerance = 0.35;

        if (
          Math.abs(centerX - frameCenterX) > frameCenterX * tolerance ||
          Math.abs(centerY - frameCenterY) > frameCenterY * tolerance
        ) {
          centered = false;
          onAnomaly?.('face_not_centered');
          anomalyDetected = true;
          setAnomalyCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.warn('Face detection failed for this frame:', err);
      // Don't flag as anomaly on detection error
    }

    setIsCentered(centered);

    // Save snapshot
    try {
      const imageData = canvas.toDataURL('image/jpeg', 0.5);
      await supabase.from('proctoring_snapshots').insert({
        attempt_id: attemptId,
        image_data: imageData,
        face_count: faces,
        is_centered: centered,
        anomaly_detected: anomalyDetected,
      });
    } catch (err) {
      console.warn('Failed to save proctoring snapshot:', err);
    }
  }, [attemptId, cameraActive, onAnomaly]);

  // Periodic snapshots — only when both camera AND models are ready
  useEffect(() => {
    if (!enabled || !cameraActive || !modelsLoaded) return;

    // Delay first capture to let video stabilize
    const initialTimeout = setTimeout(() => {
      captureAndAnalyze();
    }, 2000);

    const interval = setInterval(captureAndAnalyze, snapshotInterval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, cameraActive, modelsLoaded, snapshotInterval, captureAndAnalyze]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    modelsLoaded,
    faceCount,
    isCentered,
    anomalyCount,
    startCamera,
    stopCamera,
  };
}
