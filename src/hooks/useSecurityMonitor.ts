import { useCallback, useEffect, useRef, useState } from 'react';
import { ViolationType } from '@/types/exam';
import { supabase } from '@/integrations/supabase/client';

interface UseSecurityMonitorOptions {
  attemptId: string;
  onViolation?: (type: ViolationType, details: string) => void;
  onAutoSubmit?: () => void;
  maxTabSwitches?: number;
  maxCriticalViolations?: number;
}

/**
 * Security monitoring hook for exam environment.
 * Tracks tab switches, keyboard shortcuts, fullscreen exits, DevTools, etc.
 * Logs all violations to the backend for credibility scoring.
 */
export function useSecurityMonitor({
  attemptId,
  onViolation,
  onAutoSubmit,
  maxTabSwitches = 5,
  maxCriticalViolations = 3,
}: UseSecurityMonitorOptions) {
  const [violations, setViolations] = useState<{ type: ViolationType; time: Date; details: string }[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [windowBlurCount, setWindowBlurCount] = useState(0);
  const [timeOutside, setTimeOutside] = useState(0);
  const blurStartRef = useRef<number | null>(null);
  const criticalCountRef = useRef(0);

  const logViolation = useCallback(
    async (type: ViolationType, details: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
      const violation = { type, time: new Date(), details };
      setViolations((prev) => [...prev, violation]);
      onViolation?.(type, details);

      if (severity === 'critical') {
        criticalCountRef.current += 1;
        if (criticalCountRef.current >= maxCriticalViolations) {
          onAutoSubmit?.();
        }
      }

      // Log to backend
      await supabase.from('violations').insert({
        attempt_id: attemptId,
        type,
        details,
        severity,
      });
    },
    [attemptId, onViolation, onAutoSubmit, maxCriticalViolations]
  );

  useEffect(() => {
    // --- VISIBILITY CHANGE (Tab switch detection) ---
    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurStartRef.current = Date.now();
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          logViolation('tab_switch', `Tab switch #${next}`, next >= maxTabSwitches ? 'critical' : 'high');
          return next;
        });
      } else if (blurStartRef.current) {
        const elapsed = Math.round((Date.now() - blurStartRef.current) / 1000);
        setTimeOutside((prev) => prev + elapsed);
        blurStartRef.current = null;
      }
    };

    // --- WINDOW BLUR ---
    const handleBlur = () => {
      setWindowBlurCount((prev) => prev + 1);
      logViolation('window_blur', 'Window lost focus', 'medium');
    };

    // --- KEYBOARD MONITORING ---
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          e.preventDefault();
          logViolation('copy_attempt', 'Ctrl+C pressed', 'high');
        } else if (e.key === 'v') {
          e.preventDefault();
          logViolation('paste_attempt', 'Ctrl+V pressed', 'high');
        } else if (e.key === 'x') {
          e.preventDefault();
          logViolation('cut_attempt', 'Ctrl+X pressed', 'high');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          logViolation('keyboard_shortcut', 'Ctrl+Tab pressed', 'high');
        }
      }
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logViolation('print_screen', 'PrintScreen key pressed', 'critical');
      }
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        logViolation('devtools_open', 'F12 pressed - DevTools attempt', 'critical');
      }
      // Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        logViolation('devtools_open', 'Ctrl+Shift+I pressed', 'critical');
      }
    };

    // --- RIGHT CLICK ---
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      logViolation('right_click', 'Right-click attempted', 'low');
    };

    // --- TEXT SELECTION ---
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    // --- COPY/PASTE via clipboard events ---
    const handleCopy = (e: Event) => {
      e.preventDefault();
      logViolation('copy_attempt', 'Copy event intercepted', 'high');
    };
    const handlePaste = (e: Event) => {
      e.preventDefault();
      logViolation('paste_attempt', 'Paste event intercepted', 'high');
    };

    // --- FULLSCREEN EXIT ---
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('fullscreen_exit', 'Exited fullscreen mode', 'critical');
      }
    };

    // --- WINDOW RESIZE ---
    const handleResize = () => {
      logViolation('window_resize', `Window resized to ${window.innerWidth}x${window.innerHeight}`, 'medium');
    };

    // --- BEFORE UNLOAD (prevent page refresh/close) ---
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are in a secure exam. Are you sure you want to leave?';
    };

    // Attach all listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [logViolation, maxTabSwitches]);

  return {
    violations,
    tabSwitchCount,
    windowBlurCount,
    timeOutside,
  };
}
