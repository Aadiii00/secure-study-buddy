import { useCallback, useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/integrations/supabase/client';

interface UseProctoringOptions {
  attemptId: string;
  snapshotInterval?: number; // ms
  onAnomaly?: (type: 'no_face' | 'multiple_faces' | 'face_not_centered') => void;
  enabled?: boolean;
}

/**
 * AI Proctoring hook using face-api.js for real face detection.
 * Captures snapshots every N seconds, detects face count and position.
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

  // Load face-api.js models
  useEffect(() => {
    if (!enabled) return;
    const loadModels = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load face detection models:', err);
      }
    };
    loadModels();
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
        await videoRef.current.play();
      }
      setCameraActive(true);
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
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Face detection
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
    );

    const faces = detections.length;
    setFaceCount(faces);

    let anomalyDetected = false;
    let centered = true;

    if (faces === 0) {
      onAnomaly?.('no_face');
      anomalyDetected = true;
      setAnomalyCount((prev) => prev + 1);
    } else if (faces > 1) {
      onAnomaly?.('multiple_faces');
      anomalyDetected = true;
      setAnomalyCount((prev) => prev + 1);
    } else if (faces === 1) {
      // Check if face is centered
      const box = detections[0].box;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const frameCenterX = video.videoWidth / 2;
      const frameCenterY = video.videoHeight / 2;
      const tolerance = 0.3;

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

    setIsCentered(centered);

    // Save snapshot to database
    const imageData = canvas.toDataURL('image/jpeg', 0.5);

    await supabase.from('proctoring_snapshots').insert({
      attempt_id: attemptId,
      image_data: imageData,
      face_count: faces,
      is_centered: centered,
      anomaly_detected: anomalyDetected,
    });
  }, [attemptId, cameraActive, modelsLoaded, onAnomaly]);

  // Periodic snapshots
  useEffect(() => {
    if (!enabled || !cameraActive || !modelsLoaded) return;

    const interval = setInterval(captureAndAnalyze, snapshotInterval);
    // Capture immediately
    captureAndAnalyze();

    return () => clearInterval(interval);
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
