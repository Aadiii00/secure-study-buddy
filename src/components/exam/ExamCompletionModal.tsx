import { CheckCircle, Trophy, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  open: boolean;
  examTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  onViewResults: () => void;
}

const ExamCompletionModal = ({ 
  open, 
  examTitle, 
  score, 
  totalQuestions, 
  correctAnswers, 
  onViewResults 
}: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="border border-border rounded-lg p-8 max-w-md w-full mx-4 bg-background shadow-lg"
          >
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center"
              >
                <CheckCircle className="w-8 h-8 text-success" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Exam Completed!</h3>
              <p className="text-muted-foreground mb-4">
                Congratulations! You have successfully completed the exam.
              </p>
              
              {/* Exam Info */}
              <div className="bg-muted/30 rounded-lg p-4 mb-4">
                <p className="font-medium text-sm mb-1">{examTitle}</p>
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="block font-medium text-foreground">{score}%</span>
                    <span>Your Score</span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">{correctAnswers}/{totalQuestions}</span>
                    <span>Correct Answers</span>
                  </div>
                </div>
              </div>

              {/* Achievement Badge */}
              {score >= 80 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-medium"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Excellent Performance!
                </motion.div>
              )}
            </div>

            {/* Action Button */}
            <Button 
              onClick={onViewResults} 
              className="w-full"
              size="sm"
            >
              View Detailed Results <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExamCompletionModal;
