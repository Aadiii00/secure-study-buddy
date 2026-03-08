import { useState } from 'react';
import { Shield, Camera, Monitor, AlertTriangle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [checkingCamera, setCheckingCamera] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const checkCamera = async () => {
    setCheckingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
    }
    setCheckingCamera(false);
  };

  const canStart = cameraGranted && agreed;

  const rules = [
    'Fullscreen mode will be activated — exiting triggers a violation',
    'Your webcam will capture snapshots every 15 seconds',
    'Tab switching, copy/paste, and right-click are disabled',
    'DevTools, PrintScreen, and keyboard shortcuts are blocked',
    'Multiple serious violations will auto-submit your exam',
    'A credibility score will be generated based on your behavior',
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card p-8 max-w-lg w-full mx-4 border-2 border-primary/30"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg gradient-primary">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Secure Exam Mode</h3>
                <p className="text-sm text-muted-foreground">{examTitle}</p>
              </div>
            </div>

            {/* Exam info */}
            <div className="flex gap-4 mb-6 text-sm">
              <div className="glass-card px-4 py-2 flex-1 text-center">
                <p className="text-muted-foreground">Duration</p>
                <p className="font-bold text-foreground">{duration} min</p>
              </div>
              <div className="glass-card px-4 py-2 flex-1 text-center">
                <p className="text-muted-foreground">Questions</p>
                <p className="font-bold text-foreground">{totalQuestions}</p>
              </div>
            </div>

            {/* Rules */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Exam Rules
              </h4>
              <ul className="space-y-2">
                {rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Camera check */}
            <div className="mb-4">
              <Button
                variant="outline"
                className={`w-full justify-start gap-3 h-12 ${cameraGranted ? 'border-success/50 bg-success/5' : 'border-border'}`}
                onClick={checkCamera}
                disabled={checkingCamera || cameraGranted}
              >
                {checkingCamera ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : cameraGranted ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <Camera className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={cameraGranted ? 'text-success' : 'text-foreground'}>
                  {cameraGranted ? 'Camera access granted' : 'Grant camera access'}
                </span>
              </Button>
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                I understand the rules and agree to be monitored during this exam. I acknowledge that violations will be recorded and affect my credibility score.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1 border-border">
                Cancel
              </Button>
              <Button
                onClick={onStart}
                disabled={!canStart}
                className="flex-1 gradient-primary text-primary-foreground glow-primary disabled:opacity-50"
              >
                Enter Secure Mode <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExamStartModal;
