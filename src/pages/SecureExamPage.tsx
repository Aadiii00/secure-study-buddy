import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';
import { useProctoring } from '@/hooks/useProctoring';
import { supabase } from '@/integrations/supabase/client';
import { ViolationType } from '@/types/exam';
import { Shield, AlertTriangle, Camera, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ViolationWarningModal from '@/components/exam/ViolationWarningModal';

const SecureExamPage = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Handle violation callback
  const handleViolation = useCallback((type: ViolationType, details: string) => {
    setViolationCounter((prev) => prev + 1);
    if (['tab_switch', 'devtools_open', 'fullscreen_exit', 'camera_disabled'].includes(type)) {
      setWarningMessage(`⚠️ Security Violation: ${details}`);
      setShowWarning(true);
    }
  }, []);

  // Auto-submit on critical violations
  const handleAutoSubmit = useCallback(async () => {
    if (submitted) return;
    toast.error('Exam auto-submitted due to multiple serious violations.');
    await submitExam('auto_submitted');
  }, [submitted]);

  // Security monitoring
  const { tabSwitchCount, timeOutside } = useSecurityMonitor({
    attemptId,
    onViolation: handleViolation,
    onAutoSubmit: handleAutoSubmit,
  });

  // Face proctoring
  const {
    videoRef,
    canvasRef,
    cameraActive,
    startCamera,
    faceCount,
    anomalyCount,
  } = useProctoring({
    attemptId,
    onAnomaly: (type) => {
      const messages = {
        no_face: 'No face detected in camera',
        multiple_faces: 'Multiple faces detected',
        face_not_centered: 'Face is not centered in frame',
      };
      handleViolation(type, messages[type]);
    },
    enabled: !!attemptId,
  });

  // Initialize exam
  useEffect(() => {
    if (!examId || !user) return;

    const initExam = async () => {
      // Fetch exam
      const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (!exam) { navigate('/dashboard'); return; }
      setExamTitle(exam.title);
      setTimeLeft(exam.duration_minutes * 60);

      // Fetch questions
      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index');
      setQuestions(qs || []);

      // Create attempt
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .insert({ exam_id: examId, user_id: user.id })
        .select()
        .single();
      if (attempt) setAttemptId(attempt.id);

      // Enter fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        console.warn('Fullscreen not supported');
      }

      // Start camera
      startCamera();
    };

    initExam();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [examId, user]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          submitExam('completed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  // Auto-submit if camera disabled during exam
  useEffect(() => {
    if (attemptId && !cameraActive && questions.length > 0) {
      const timeout = setTimeout(() => {
        if (!cameraActive) {
          handleViolation('camera_disabled', 'Camera was disabled during exam');
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [cameraActive, attemptId, questions.length]);

  const submitExam = async (status: string) => {
    if (submitted) return;
    setSubmitted(true);

    // Calculate score
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) correct++;
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    await supabase
      .from('exam_attempts')
      .update({
        ended_at: new Date().toISOString(),
        answers,
        score,
        status,
      })
      .eq('id', attemptId);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    toast.success(`Exam submitted! Score: ${score}%`);
    navigate(`/results/${attemptId}`);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeLeft < 300; // Less than 5 minutes

  if (submitted) return null;

  return (
    <div className="min-h-screen bg-background select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{examTitle}</span>
            <span className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">SECURE MODE</span>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
            isUrgent ? 'bg-danger/10 text-danger pulse-danger' : 'bg-secondary text-foreground'
          }`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>

          {/* Violation counter */}
          <div className="flex items-center gap-4">
            {violationCounter > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{violationCounter} violations</span>
              </div>
            )}
            {/* Camera indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
              cameraActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}>
              <Camera className="w-4 h-4" />
              <span>{cameraActive ? 'Camera On' : 'Camera Off'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-20 pb-24 px-6 max-w-4xl mx-auto">
        {/* Camera preview (small) */}
        <div className="fixed top-20 right-4 z-40">
          <div className="glass-card overflow-hidden w-48 h-36 rounded-xl border-2 border-border">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center px-2">
              <span className="text-xs font-mono bg-background/80 px-1.5 py-0.5 rounded text-foreground">
                Faces: {faceCount}
              </span>
            </div>
          </div>
        </div>

        {/* Question */}
        {questions.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-mono text-muted-foreground">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
                        i === currentQuestion
                          ? 'bg-primary'
                          : answers[questions[i]?.id] !== undefined
                          ? 'bg-primary/40'
                          : 'bg-secondary'
                      }`}
                      onClick={() => setCurrentQuestion(i)}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-xl font-semibold text-foreground mb-6">
                {questions[currentQuestion]?.question_text}
              </h2>

              <div className="space-y-3">
                {(questions[currentQuestion]?.options as string[] || []).map((option: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: idx })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      answers[questions[currentQuestion].id] === idx
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <span className="font-mono text-sm text-muted-foreground mr-3">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="border-border"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {Object.keys(answers).length} / {questions.length} answered
          </span>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="gradient-primary text-primary-foreground"
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => submitExam('completed')}
              className="gradient-primary text-primary-foreground"
            >
              <Send className="w-4 h-4 mr-2" /> Submit Exam
            </Button>
          )}
        </div>
      </div>

      {/* Warning Modal */}
      <ViolationWarningModal
        open={showWarning}
        message={warningMessage}
        onClose={() => setShowWarning(false)}
        violationCount={violationCounter}
      />
    </div>
  );
};

export default SecureExamPage;
