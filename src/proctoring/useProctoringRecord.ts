import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useProctoringRecord({ attemptId, stream }: { attemptId: string, stream: MediaStream | null }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    if (!stream || !attemptId) return;
    
    try {
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      const recorder = new MediaRecorder(stream, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.start(1000); // collect 1s chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      console.log('Started recording proctoring video');
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Failed to initialize webcam recording.');
    }
  }, [stream, attemptId]);

  const stopRecordingAndUpload = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    
    return new Promise<string | null>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        
        try {
          const fileName = `${attemptId}/${Date.now()}.webm`;
          const { error: uploadError, data } = await supabase.storage
            .from('exam-recordings')
            .upload(fileName, blob, { contentType: 'video/webm' });
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('exam-recordings')
            .getPublicUrl(fileName);
            
          // Update exam_attempts table with the recording URL
          await supabase
            .from('exam_attempts')
            .update({ recording_url: publicUrl })
            .eq('id', attemptId);
            
          resolve(publicUrl);
        } catch (err) {
          console.error('Error saving recording:', err);
          resolve(null);
        }
      };
      
      mediaRecorderRef.current!.stop();
    });
  }, [attemptId]);

  return { startRecording, stopRecordingAndUpload, isRecording };
}
