import { AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="border border-danger/30 rounded-lg p-6 max-w-md w-full mx-4 bg-background">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <h3 className="font-semibold">Security Alert</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm mb-4">{message}</p>
            <div className="flex items-center justify-between bg-destructive/5 rounded p-3 border border-danger/20 mb-4">
              <span className="text-xs text-danger">Violations this session</span>
              <span className="font-semibold text-danger">{violationCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              All violations are logged. Repeated violations may auto-submit your exam.
            </p>
            <Button onClick={onClose} variant="outline" className="w-full border-danger/30 text-danger hover:bg-destructive/5">
              I Understand
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ViolationWarningModal;
