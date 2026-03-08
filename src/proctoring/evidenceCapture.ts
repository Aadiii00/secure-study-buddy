import { supabase } from '@/integrations/supabase/client';

/**
 * Capture a screenshot from the webcam video element and store it.
 */
export async function captureEvidence(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  attemptId: string,
  faceCount: number,
  isCentered: boolean,
  anomalyDetected: boolean
): Promise<string | null> {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (!video || !canvas || video.readyState < 2) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg', 0.5);

  try {
    await supabase.from('proctoring_snapshots').insert({
      attempt_id: attemptId,
      image_data: imageData,
      face_count: faceCount,
      is_centered: isCentered,
      anomaly_detected: anomalyDetected,
    });
  } catch (err) {
    console.warn('Failed to save snapshot:', err);
  }

  return imageData;
}
