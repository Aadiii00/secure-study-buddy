import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';
import { useProctoring } from '@/hooks/useProctoring';
import { supabase } from '@/integrations/supabase/client';
import { ViolationType } from '@/types/exam';
import { Shield, AlertTriangle, Camera, Clock, ChevronLeft, ChevronRight, Send, Lock } from 'lucide-react';
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
  const [examReady, setExamReady] = useState(false);

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
      const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (!exam) { navigate('/dashboard'); return; }
      setExamTitle(exam.title);
      setTimeLeft(exam.duration_minutes * 60);

      const { data: qs } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index');
      setQuestions(qs || []);

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
      setExamReady(true);
    };

    initExam();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [examId, user]);

  // =====================================================
  // ENHANCED SECURITY: Block ALL clipboard & drag events
  // =====================================================
  useEffect(() => {
    // Block clipboard write
    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Clear clipboard to prevent any data leakage
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
    };

    // Block drag events (prevents dragging text out)
    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Block printing
    const blockPrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
      }
      // Block Ctrl+S (save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      // Block Ctrl+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
      }
      // Block Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
      }
      // Block F5 refresh
      if (e.key === 'F5') {
        e.preventDefault();
      }
      // Block Ctrl+R refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);
    document.addEventListener('paste', blockClipboard, true);
    document.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('drop', blockDrag, true);
    document.addEventListener('keydown', blockPrint, true);

    // Disable text selection via CSS
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('copy', blockClipboard, true);
      document.removeEventListener('cut', blockClipboard, true);
      document.removeEventListener('paste', blockClipboard, true);
      document.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('drop', blockDrag, true);
      document.removeEventListener('keydown', blockPrint, true);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

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
    if (attemptId && !cameraActive && questions.length > 0 && examReady) {
      const timeout = setTimeout(() => {
        if (!cameraActive) {
          handleViolation('camera_disabled', 'Camera was disabled during exam');
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [cameraActive, attemptId, questions.length, examReady]);

  const submitExam = async (status: string) => {
    if (submitted) return;
    setSubmitted(true);

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

  const isUrgent = timeLeft < 300;

  if (submitted) return null;

  return (
    <div
      className="min-h-screen bg-background select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Security watermark overlay */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 100px, currentColor 100px, currentColor 101px)`,
        }}
      />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground text-sm md:text-base truncate max-w-[200px]">{examTitle}</span>
            <span className="hidden md:flex text-xs font-mono px-2 py-1 rounded bg-danger/10 text-danger items-center gap-1">
              <Lock className="w-3 h-3" /> SECURE
            </span>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-mono text-base md:text-lg font-bold ${
            isUrgent ? 'bg-danger/10 text-danger pulse-danger' : 'bg-secondary text-foreground'
          }`}>
            <Clock className="w-4 md:w-5 h-4 md:h-5" />
            {formatTime(timeLeft)}
          </div>

          {/* Violation counter + Camera */}
          <div className="flex items-center gap-2 md:gap-4">
            {violationCounter > 0 && (
              <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs md:text-sm animate-pulse">
                <AlertTriangle className="w-3 md:w-4 h-3 md:h-4" />
                <span>{violationCounter}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm ${
              cameraActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}>
              <Camera className="w-3 md:w-4 h-3 md:h-4" />
              <span className="hidden md:inline">{cameraActive ? 'Camera On' : 'Camera Off'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-20 pb-24 px-4 md:px-6 max-w-4xl mx-auto">
        {/* Camera preview */}
        <div className="fixed top-20 right-4 z-40">
          <div className="glass-card overflow-hidden w-36 h-28 md:w-48 md:h-36 rounded-xl border-2 border-border relative">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center px-2">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                faceCount === 1 ? 'bg-success/80 text-success-foreground' :
                faceCount === 0 ? 'bg-danger/80 text-danger-foreground' :
                'bg-warning/80 text-warning-foreground'
              }`}>
                {faceCount === 0 ? '⚠ No Face' : faceCount === 1 ? '✓ 1 Face' : `⚠ ${faceCount} Faces`}
              </span>
            </div>
            {/* Recording indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span className="text-[10px] font-mono text-danger">REC</span>
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mb-4 glass-card p-3 mr-40 md:mr-52">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono mr-2">Questions:</span>
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                  i === currentQuestion
                    ? 'gradient-primary text-primary-foreground glow-primary'
                    : answers[questions[i]?.id] !== undefined
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {i + 1}
              </button>
            ))}
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
              className="glass-card p-6 md:p-8 mr-0 md:mr-0"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-mono text-muted-foreground">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  answers[questions[currentQuestion]?.id] !== undefined
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning'
                }`}>
                  {answers[questions[currentQuestion]?.id] !== undefined ? 'Answered' : 'Unanswered'}
                </span>
              </div>

              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-6 leading-relaxed">
                {questions[currentQuestion]?.question_text}
              </h2>

              <div className="space-y-3">
                {(questions[currentQuestion]?.options as string[] || []).map((option: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: idx })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      answers[questions[currentQuestion].id] === idx
                        ? 'border-primary bg-primary/10 text-foreground glow-primary'
                        : 'border-border bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mr-3 text-sm font-bold ${
                      answers[questions[currentQuestion].id] === idx
                        ? 'gradient-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {String.fromCharCode(65 + idx)}
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
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="border-border"
          >
            <ChevronLeft className="w-4 h-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Previous</span>
          </Button>

          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
            <div className="w-32 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-300"
                style={{ width: `${questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="gradient-primary text-primary-foreground"
            >
              <span className="hidden md:inline">Next</span> <ChevronRight className="w-4 h-4 ml-1 md:ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => submitExam('completed')}
              className="gradient-primary text-primary-foreground glow-primary"
            >
              <Send className="w-4 h-4 mr-1 md:mr-2" /> Submit
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
