import { useState } from 'react';
import { Shield, Camera, AlertTriangle, CheckCircle, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  open: boolean;
  examTitle: string;
  duration: number;
  totalQuestions: number;
  onStart: () => void;
  onCancel: () => void;
}

const ExamStartModal = ({ open, examTitle, duration, totalQuestions, onStart, onCancel }: Props) => {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [checkingCamera, setCheckingCamera] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const checkCamera = async () => {
    setCheckingCamera(true);
    setCameraDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
      setCameraDenied(true);
    }
    setCheckingCamera(false);
  };

  const canStart = cameraGranted && agreed;

  const rules = [
    'Fullscreen mode will be activated — exiting triggers a violation',
    'Your webcam will capture snapshots every 5 seconds',
    'No face detected for 5+ seconds triggers a violation',
    'Multiple faces in frame triggers a violation',
    'Tab switching, copy/paste, and right-click are disabled',
    'Multiple serious violations will auto-submit your exam',
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="border border-border rounded-lg p-6 max-w-lg w-full mx-4 bg-background">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Secure Exam</h3>
                <p className="text-sm text-muted-foreground">{examTitle}</p>
              </div>
            </div>

            <div className="flex gap-4 mb-5 text-sm">
              <div className="border border-border rounded px-4 py-2 flex-1 text-center">
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{duration} min</p>
              </div>
              <div className="border border-border rounded px-4 py-2 flex-1 text-center">
                <p className="text-muted-foreground">Questions</p>
                <p className="font-medium">{totalQuestions}</p>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Rules
              </h4>
              <ul className="space-y-1.5">
                {rules.map((rule, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Camera check */}
            <div className="mb-4">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={checkCamera} disabled={checkingCamera || cameraGranted}>
                {checkingCamera ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : cameraGranted ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : cameraDenied ? (
                  <XCircle className="w-4 h-4 text-danger" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {cameraGranted ? 'Camera access granted' : cameraDenied ? 'Camera denied — please allow access' : 'Grant camera access'}
              </Button>
              {cameraDenied && (
                <p className="text-xs text-danger mt-1">Camera is required. Please enable it in your browser settings and try again.</p>
              )}
            </div>

            <label className="flex items-start gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              <span className="text-sm text-muted-foreground">
                I agree to be monitored. Violations will affect my credibility score.
              </span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
              <Button onClick={onStart} disabled={!canStart} className="flex-1">
                Enter Exam <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExamStartModal;
