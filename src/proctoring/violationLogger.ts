import { supabase } from '@/integrations/supabase/client';
import { ViolationType } from '@/types/exam';

/**
 * Log a violation event to the backend.
 */
export async function logViolation(
  attemptId: string,
  type: ViolationType,
  details: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
) {
  try {
    await supabase.from('violations').insert({
      attempt_id: attemptId,
      type,
      details,
      severity,
    });
  } catch (err) {
    console.warn('Failed to log violation:', err);
  }
}
