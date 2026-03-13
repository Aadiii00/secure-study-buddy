import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ViolationType } from '@/types/exam';
import { useWebcam } from '@/proctoring/useWebcam';
import { useFaceDetection } from '@/proctoring/useFaceDetection';
import { useProctorEvents } from '@/proctoring/useProctorEvents';
import { captureEvidence } from '@/proctoring/evidenceCapture';
import {
  AlertTriangle, Camera, Clock, ChevronLeft, ChevronRight, Send, Lock,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, CheckCircle2,
  Circle, User, Eye, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import ViolationWarningModal from '@/components/exam/ViolationWarningModal';
import ExamCompletionModal from '@/components/exam/ExamCompletionModal';

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
  const [examStarted, setExamStarted] = useState(false);
  const [examPaused, setExamPaused] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'status' | 'warnings' | 'info'>('status');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    score: number;
    correctAnswers: number;
  } | null>(null);

  // Webcam
  const { videoRef, cameraActive, startCamera } = useWebcam();

  // Face detection with 5s grace period
  const handleFaceAnomaly = useCallback((type: 'no_face' | 'multiple_faces' | 'face_not_centered') => {
    setViolationCounter((prev) => prev + 1);
    const messages = {
      no_face: 'Leaving camera view detected.',
      multiple_faces: 'Multiple faces detected in camera view.',
      face_not_centered: 'Camera obstruction or face not centered detected.',
    };
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
    // Track all violations
    setViolationCounter((prev) => prev + 1);

    // Map to the categories you mentioned
    const isLeavingCameraView = ['no_face', 'multiple_faces', 'face_not_centered', 'camera_disabled'].includes(type);
    const isWindowFocusChange = ['tab_switch', 'window_blur', 'fullscreen_exit', 'window_resize'].includes(type);
    const isKeyboardActivity = ['copy_attempt', 'paste_attempt', 'cut_attempt', 'keyboard_shortcut', 'devtools_open', 'print_screen', 'right_click'].includes(type);

    const baseMessage =
      isLeavingCameraView
        ? 'Leaving camera view or camera obstruction detected.'
        : isWindowFocusChange
        ? 'Window focus or screen change detected.'
        : isKeyboardActivity
        ? 'Restricted keyboard or mouse interaction detected.'
        : 'Proctoring rule violation detected.';

    setWarningMessage(`⚠️ ${baseMessage}\n${details}`);
    setShowWarning(true);
  }, []);

  // Proctor events
  const { tabSwitchCount, timeOutside } = useProctorEvents({
    attemptId,
    onViolation: handleViolation,
    maxTabSwitches: 3,
    maxCriticalViolations: 3,
  });

  // Initialize exam
  useEffect(() => {
    if (!examId || !user) return;
    const initExam = async () => {
      const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (!exam) { navigate('/dashboard'); return; }

      // Check if user already completed this exam; if so, redirect to results instead of allowing re-entry
      const { data: existingAttempts } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestAttempt = existingAttempts?.[0];
      if (latestAttempt && (latestAttempt.status === 'completed' || latestAttempt.status === 'auto_submitted')) {
        navigate(`/results/${latestAttempt.id}`);
        return;
      }

      setExamTitle(exam.title);
      setTimeLeft(exam.duration_minutes * 60);
      const { data: qs } = await supabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
      setQuestions(qs || []);

      // Create a new attempt (or reuse in-progress one in future if desired)
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .insert({ exam_id: examId, user_id: user.id })
        .select()
        .single();

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
    }, 5000);
    return () => { clearTimeout(initialTimeout); clearInterval(interval); };
  }, [examReady, cameraActive, modelsLoaded, attemptId, detectFaces]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || submitted || !examReady || !examStarted || examPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { submitExam('completed'); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, examReady, examStarted, examPaused]);

  // Global auto-submit after three violations
  useEffect(() => {
    if (submitted) return;
    if (violationCounter >= 3) {
      toast.error('Exam auto-submitted after 3 violations.');
      submitExam('auto_submitted');
    }
  }, [violationCounter, submitted]);

  // Start/pause exam based on face detection
  useEffect(() => {
    if (!examReady || submitted) return;
    if (faceCount === 1) {
      if (!examStarted) {
        setExamStarted(true);
      }
      if (examPaused) {
        setExamPaused(false);
      }
    } else if (examStarted && !examPaused) {
      setExamPaused(true);
    }
  }, [faceCount, examReady, submitted, examStarted, examPaused]);

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
    
    // Set completion data and show modal
    setCompletionData({ score, correctAnswers: correct });
    setShowCompletionModal(true);
    toast.success(`Exam completed! Score: ${score}%`);
  };

  const handleViewResults = () => {
    setShowCompletionModal(false);
    navigate(`/results/${attemptId}`);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isUrgent = timeLeft < 300;
  const answeredCount = Object.keys(answers).length;

  if (submitted && !showCompletionModal) return null;

  const proctorStatus = violationCounter === 0 ? 'normal' : violationCounter <= 2 ? 'warning' : 'violation';

  return (
    <div className="h-screen flex flex-col bg-background select-none overflow-hidden" onContextMenu={(e) => e.preventDefault()} style={{ userSelect: 'none' }}>
      {/* ─── TOP NAVIGATION BAR ─── */}
      <header className="h-14 flex-shrink-0 bg-background border-b border-border flex items-center px-4 z-50">
        {/* Left: Logo + Exam Title */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground hidden lg:block">Tracxn<span className="text-red-500">Labs</span></span>
          </div>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground truncate max-w-[160px]">{examTitle}</span>
        </div>

        {/* Center: Current Problem */}
        <div className="flex-1 flex justify-center">
          <span className="text-sm font-medium text-foreground truncate max-w-[300px]">
            Q{currentQuestion + 1}: {questions[currentQuestion]?.question_text?.slice(0, 50)}{(questions[currentQuestion]?.question_text?.length || 0) > 50 ? '…' : ''}
          </span>
        </div>

        {/* Right: Proctoring + Timer + Submit + Avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Proctoring indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card border border-border">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-success' : 'bg-danger'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`w-2 h-2 rounded-full ${faceCount === 1 ? 'bg-success' : faceCount === 0 ? 'bg-warning' : 'bg-danger'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`w-2 h-2 rounded-full ${proctorStatus === 'normal' ? 'bg-success' : proctorStatus === 'warning' ? 'bg-warning' : 'bg-danger'}`} />
              {violationCounter > 0 && (
                <span className="text-[10px] font-medium text-danger">{violationCounter}</span>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-sm font-semibold ${
            isUrgent ? 'bg-danger/10 text-danger' : 'bg-card border border-border text-foreground'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>

          {/* Submit */}
          <Button
            size="sm"
            onClick={() => submitExam('completed')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            disabled={!examStarted || examPaused}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Submit
          </Button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT SIDEBAR: Problem Navigation ─── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-r border-border bg-card overflow-hidden"
            >
              <div className="w-[220px] h-full flex flex-col">
                <div className="px-3 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Problems</span>
                  <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                  {questions.map((q, i) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isCurrent = i === currentQuestion;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestion(i)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          isCurrent
                            ? 'bg-primary/10 text-primary border-l-2 border-primary'
                            : 'hover:bg-muted border-l-2 border-transparent'
                        }`}
                      >
                        {isAnswered ? (
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                          <Circle className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                        <span className="truncate">
                          <span className="font-medium">{i + 1}.</span>{' '}
                          <span className={isCurrent ? 'text-foreground' : 'text-muted-foreground'}>
                            {q.question_text?.slice(0, 25)}{(q.question_text?.length || 0) > 25 ? '…' : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ─── MAIN CONTENT AREA ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-10 flex-shrink-0 bg-card border-b border-border flex items-center px-3 gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded hover:bg-muted transition-colors"
              title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4 text-muted-foreground" /> : <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                disabled={currentQuestion === questions.length - 1}
              >
                Next <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </div>

          {/* Split: Question Description (left) + Answer Area (right) */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left panel: Problem description */}
            <div className="w-[40%] min-w-[300px] border-r border-border overflow-y-auto">
              {questions.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold text-foreground">
                        Question {currentQuestion + 1}
                      </h2>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        answers[questions[currentQuestion]?.id] !== undefined
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {answers[questions[currentQuestion]?.id] !== undefined ? 'Answered' : 'Unanswered'}
                      </span>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm leading-relaxed text-foreground">
                        {questions[currentQuestion]?.question_text}
                      </p>
                    </div>

                    {/* Constraints / Info section */}
                    <div className="mt-6 p-4 rounded-md bg-card border border-border">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Instructions</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Select the most appropriate answer</li>
                        <li>• You can change your answer before submission</li>
                        <li>• All questions carry equal marks</li>
                      </ul>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Right panel: Answer options */}
            <div className="flex-1 overflow-y-auto bg-card">
              {questions.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">Select your answer</h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        {(questions[currentQuestion]?.options as string[] || []).length} options
                      </span>
                    </div>

                    {(examPaused || !examStarted) && (
                      <div className="mb-4 p-3 rounded-md border border-warning/40 bg-warning/10 text-xs text-warning flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>
                          {examPaused
                            ? 'Exam paused — ensure exactly one face is clearly visible to resume.'
                            : 'Align your face with the camera to start the exam.'}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {(questions[currentQuestion]?.options as string[] || []).map((option: string, idx: number) => {
                        const isSelected = answers[questions[currentQuestion].id] === idx;
                        return (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            onClick={() => {
                              if (!examStarted || examPaused) return;
                              setAnswers({ ...answers, [questions[currentQuestion].id]: idx });
                            }}
                            className={`w-full text-left p-4 rounded-lg border text-sm transition-all duration-150 flex items-start gap-3 ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/50'
                            }`}
                          >
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold flex-shrink-0 mt-px ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className={`leading-relaxed ${isSelected ? 'text-foreground font-medium' : 'text-foreground'}`}>
                              {option}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Quick nav at bottom */}
                    <div className="mt-8 flex items-center justify-between pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                        disabled={currentQuestion === 0}
                        className="text-muted-foreground"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      {currentQuestion < questions.length - 1 ? (
                        <Button
                          size="sm"
                          onClick={() => setCurrentQuestion(currentQuestion + 1)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => submitExam('completed')}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          disabled={!examStarted || examPaused}
                        >
                          <Send className="w-4 h-4 mr-1" /> Submit Exam
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* ─── BOTTOM CONSOLE PANEL ─── */}
          <div className="flex-shrink-0 border-t border-border bg-background">
            {/* Console header */}
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="w-full h-8 flex items-center px-3 gap-2 hover:bg-muted/50 transition-colors"
            >
              {consoleOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="text-xs font-medium text-muted-foreground">Console</span>
              <div className="flex-1" />
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Answered: {answeredCount}/{questions.length}</span>
                <span>|</span>
                <span className={violationCounter > 0 ? 'text-danger' : ''}>Warnings: {violationCounter}</span>
                <span>|</span>
                <span>Tab switches: {tabSwitchCount}</span>
              </div>
            </button>

            <AnimatePresence>
              {consoleOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 160 }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-border"
                >
                  {/* Tabs */}
                  <div className="flex items-center gap-0 border-b border-border bg-card">
                    {(['status', 'warnings', 'info'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setConsoleTab(tab)}
                        className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                          consoleTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab === 'status' ? 'Status' : tab === 'warnings' ? 'Warnings' : 'Info'}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 h-[120px] overflow-y-auto font-mono text-xs">
                    {consoleTab === 'status' && (
                      <div className="space-y-1.5 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-success' : 'bg-danger'}`} />
                          Camera: {cameraActive ? 'Active' : 'Inactive'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-success' : 'bg-warning'}`} />
                          Face Detection: {modelsLoaded ? 'Loaded' : 'Loading…'}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${faceCount === 1 ? 'bg-success' : 'bg-warning'}`} />
                          Faces Detected: {faceCount}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${document.fullscreenElement ? 'bg-success' : 'bg-danger'}`} />
                          Fullscreen: {document.fullscreenElement ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    )}
                    {consoleTab === 'warnings' && (
                      <div className="text-muted-foreground">
                        {violationCounter === 0 ? (
                          <span className="text-success">No violations recorded. Keep it up!</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-danger">Total violations: {violationCounter}</span>
                            <div>Tab switches: {tabSwitchCount}</div>
                            <div>Time outside: {Math.round(timeOutside / 1000)}s</div>
                            <div className="text-danger text-[10px] mt-2">Excessive violations may result in auto-submission.</div>
                          </div>
                        )}
                      </div>
                    )}
                    {consoleTab === 'info' && (
                      <div className="space-y-1 text-muted-foreground">
                        <div>Exam: {examTitle}</div>
                        <div>Questions: {questions.length}</div>
                        <div>Time Remaining: {formatTime(timeLeft)}</div>
                        <div>Progress: {answeredCount}/{questions.length} answered</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Webcam preview (small floating) */}
      <div className="fixed bottom-12 right-4 z-40">
        <div className="w-28 h-20 rounded-md border border-border overflow-hidden bg-muted shadow-sm">
          <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <span className={`absolute bottom-0.5 left-0.5 text-[9px] px-1 rounded font-medium ${
            faceCount === 1 ? 'bg-success/90 text-success-foreground' : 'bg-danger/90 text-danger-foreground'
          }`}>
            {faceCount === 0 ? 'No Face' : faceCount === 1 ? '✓ Face OK' : `${faceCount} Faces`}
          </span>
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
        </div>
      </div>

      <ViolationWarningModal open={showWarning} message={warningMessage} onClose={() => setShowWarning(false)} violationCount={violationCounter} />
      
      {completionData && (
        <ExamCompletionModal
          open={showCompletionModal}
          examTitle={examTitle}
          score={completionData.score}
          totalQuestions={questions.length}
          correctAnswers={completionData.correctAnswers}
          onViewResults={handleViewResults}
        />
      )}
    </div>
  );
};

export default SecureExamPage;
