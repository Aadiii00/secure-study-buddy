import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ViolationType } from '@/types/exam';
import { useWebcam } from '@/proctoring/useWebcam';
import { useFaceDetection } from '@/proctoring/useFaceDetection';
import { useProctorEvents } from '@/proctoring/useProctorEvents';
import { captureEvidence } from '@/proctoring/evidenceCapture';
import { AlertTriangle, Camera, Clock, ChevronLeft, ChevronRight, Send, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import ViolationWarningModal from '@/components/exam/ViolationWarningModal';

const SecureExamPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [attemptId, setAttemptId] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examTitle, setExamTitle] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [violationCounter, setViolationCounter] = useState(0);
  const [examReady, setExamReady] = useState(false);

  // Webcam
  const { videoRef, cameraActive, startCamera } = useWebcam();

  // Face detection with 5s grace period
  const handleFaceAnomaly = useCallback((type: 'no_face' | 'multiple_faces' | 'face_not_centered') => {
    setViolationCounter((prev) => prev + 1);
    const messages = { no_face: 'No face detected for 5+ seconds', multiple_faces: 'Multiple faces detected', face_not_centered: 'Face not centered' };
    setWarningMessage(`⚠️ ${messages[type]}`);
    setShowWarning(true);
  }, []);

  const { modelsLoaded, faceCount, detectFaces } = useFaceDetection({
    videoRef,
    enabled: !!attemptId,
    noFaceGracePeriod: 5000,
    onAnomaly: handleFaceAnomaly,
  });

  // Violation handler for proctor events
  const handleViolation = useCallback((type: ViolationType, details: string) => {
    setViolationCounter((prev) => prev + 1);
    if (['tab_switch', 'devtools_open', 'fullscreen_exit', 'camera_disabled'].includes(type)) {
      setWarningMessage(`⚠️ ${details}`);
      setShowWarning(true);
    }
  }, []);

  const handleAutoSubmit = useCallback(async () => {
    if (submitted) return;
    toast.error('Auto-submitted due to violations.');
    await submitExam('auto_submitted');
  }, [submitted]);

  // Proctor events
  const { tabSwitchCount, timeOutside } = useProctorEvents({
    attemptId,
    onViolation: handleViolation,
    onAutoSubmit: handleAutoSubmit,
  });

  // Initialize exam
  useEffect(() => {
    if (!examId || !user) return;
    const initExam = async () => {
      const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (!exam) { navigate('/dashboard'); return; }
      setExamTitle(exam.title);
      setTimeLeft(exam.duration_minutes * 60);
      const { data: qs } = await supabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
      setQuestions(qs || []);
      const { data: attempt } = await supabase.from('exam_attempts').insert({ exam_id: examId, user_id: user.id }).select().single();
      if (attempt) setAttemptId(attempt.id);
      try { await document.documentElement.requestFullscreen(); } catch (e) {}
      startCamera();
      setExamReady(true);
    };
    initExam();
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [examId, user]);

  // Block clipboard/drag/keys
  useEffect(() => {
    const blockClipboard = (e: ClipboardEvent) => { e.preventDefault(); e.stopPropagation(); if (e.clipboardData) e.clipboardData.setData('text/plain', ''); };
    const blockDrag = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'a', 'u', 'r'].includes(e.key)) e.preventDefault();
      if (e.key === 'F5') e.preventDefault();
    };
    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);
    document.addEventListener('paste', blockClipboard, true);
    document.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('drop', blockDrag, true);
    document.addEventListener('keydown', blockKeys, true);
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('copy', blockClipboard, true);
      document.removeEventListener('cut', blockClipboard, true);
      document.removeEventListener('paste', blockClipboard, true);
      document.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('drop', blockDrag, true);
      document.removeEventListener('keydown', blockKeys, true);
      document.body.style.userSelect = '';
    };
  }, []);

  // Periodic face detection + evidence capture (every 15s)
  useEffect(() => {
    if (!examReady || !cameraActive || !modelsLoaded || !attemptId) return;
    const initialTimeout = setTimeout(async () => {
      const result = await detectFaces();
      await captureEvidence(videoRef, canvasRef, attemptId, result.faceCount, result.isCentered, !!result.anomalyType);
    }, 2000);
    const interval = setInterval(async () => {
      const result = await detectFaces();
      await captureEvidence(videoRef, canvasRef, attemptId, result.faceCount, result.isCentered, !!result.anomalyType);
    }, 15000);
    return () => { clearTimeout(initialTimeout); clearInterval(interval); };
  }, [examReady, cameraActive, modelsLoaded, attemptId, detectFaces]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { submitExam('completed'); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  // Camera disable detection
  useEffect(() => {
    if (attemptId && !cameraActive && questions.length > 0 && examReady) {
      const timeout = setTimeout(() => { if (!cameraActive) handleViolation('camera_disabled', 'Camera disabled'); }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [cameraActive, attemptId, questions.length, examReady]);

  const submitExam = async (status: string) => {
    if (submitted) return;
    setSubmitted(true);
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct_option) correct++; });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    await supabase.from('exam_attempts').update({ ended_at: new Date().toISOString(), answers, score, status }).eq('id', attemptId);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    toast.success(`Submitted! Score: ${score}%`);
    navigate(`/results/${attemptId}`);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isUrgent = timeLeft < 300;

  if (submitted) return null;

  return (
    <div className="min-h-screen bg-background select-none" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none' }}>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm truncate max-w-[200px]">{examTitle}</span>
          </div>
          <div className={`font-mono text-lg font-semibold ${isUrgent ? 'text-danger' : ''}`}>
            <Clock className="w-4 h-4 inline mr-1" />
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-3">
            {violationCounter > 0 && (
              <span className="text-xs text-danger flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {violationCounter}
              </span>
            )}
            <span className={`text-xs flex items-center gap-1 ${cameraActive ? 'text-success' : 'text-danger'}`}>
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{cameraActive ? 'On' : 'Off'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-20 px-4 md:px-6 max-w-3xl mx-auto">
        {/* Camera preview */}
        <div className="fixed top-16 right-4 z-40">
          <div className="w-32 h-24 md:w-40 md:h-28 rounded border border-border overflow-hidden bg-muted relative">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <span className={`absolute bottom-1 left-1 text-[10px] px-1 rounded ${
              faceCount === 1 ? 'bg-success/80 text-success-foreground' : 'bg-danger/80 text-danger-foreground'
            }`}>
              {faceCount === 0 ? 'No Face' : faceCount === 1 ? '1 Face' : `${faceCount} Faces`}
            </span>
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
          </div>
        </div>

        {/* Question nav */}
        <div className="mb-4 mr-36 md:mr-44 flex items-center gap-1.5 flex-wrap">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQuestion(i)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                i === currentQuestion ? 'bg-primary text-primary-foreground' :
                answers[questions[i]?.id] !== undefined ? 'bg-muted text-foreground border border-border' :
                'bg-background text-muted-foreground border border-border'
              }`}>{i + 1}</button>
          ))}
        </div>

        {/* Question */}
        {questions.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div key={currentQuestion} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-muted-foreground">Q{currentQuestion + 1} of {questions.length}</span>
                <span className={`text-xs ${answers[questions[currentQuestion]?.id] !== undefined ? 'text-success' : 'text-muted-foreground'}`}>
                  {answers[questions[currentQuestion]?.id] !== undefined ? 'Answered' : 'Unanswered'}
                </span>
              </div>
              <h2 className="text-base font-medium mb-5">{questions[currentQuestion]?.question_text}</h2>
              <div className="space-y-2">
                {(questions[currentQuestion]?.options as string[] || []).map((option: string, idx: number) => (
                  <button key={idx} onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: idx })}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      answers[questions[currentQuestion].id] === idx
                        ? 'border-foreground bg-muted'
                        : 'border-border hover:border-foreground/30'
                    }`}>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium mr-2 ${
                      answers[questions[currentQuestion].id] === idx ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>{String.fromCharCode(65 + idx)}</span>
                    {option}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-3xl mx-auto">
          <Button variant="outline" size="sm" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground">{Object.keys(answers).length}/{questions.length}</span>
          {currentQuestion < questions.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentQuestion(currentQuestion + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => submitExam('completed')}>
              <Send className="w-4 h-4 mr-1" /> Submit
            </Button>
          )}
        </div>
      </div>

      <ViolationWarningModal open={showWarning} message={warningMessage} onClose={() => setShowWarning(false)} violationCount={violationCounter} />
    </div>
  );
};

export default SecureExamPage;
