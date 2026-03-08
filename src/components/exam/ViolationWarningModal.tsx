import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  message: string;
  onClose: () => void;
  violationCount: number;
}

const ViolationWarningModal = ({ open, message, onClose, violationCount }: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card p-8 max-w-md w-full mx-4 border-2 border-danger/50 glow-danger"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-danger/20">
                  <AlertTriangle className="w-6 h-6 text-danger" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Security Alert</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-foreground mb-4">{message}</p>
            <div className="flex items-center justify-between bg-danger/10 rounded-lg p-3 border border-danger/20">
              <span className="text-sm text-danger">Total violations this session:</span>
              <span className="font-mono font-bold text-danger text-lg">{violationCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              All violations are logged and will affect your credibility score. Repeated violations may result in automatic exam submission.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 rounded-lg bg-danger text-danger-foreground font-semibold hover:bg-danger/90 transition-colors"
            >
              I Understand
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ViolationWarningModal;
