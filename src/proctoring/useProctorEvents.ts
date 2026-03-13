import { useCallback, useEffect, useRef, useState } from 'react';
import { ViolationType } from '@/types/exam';
import { logViolation } from './violationLogger';

interface UseProctorEventsOptions {
  attemptId: string;
  onViolation?: (type: ViolationType, details: string) => void;
  onAutoSubmit?: () => void;
  maxTabSwitches?: number;
  maxCriticalViolations?: number;
}

/**
 * Proctoring events hook — monitors tab switches, keyboard, fullscreen, etc.
 */
export function useProctorEvents({
  attemptId,
  onViolation,
  onAutoSubmit,
  maxTabSwitches = 5,
  maxCriticalViolations = 3,
}: UseProctorEventsOptions) {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [timeOutside, setTimeOutside] = useState(0);
  const blurStartRef = useRef<number | null>(null);
  const criticalCountRef = useRef(0);

  const handleViolation = useCallback(
    async (type: ViolationType, details: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
      onViolation?.(type, details);

      if (severity === 'critical') {
        criticalCountRef.current += 1;
        if (criticalCountRef.current >= maxCriticalViolations) {
          onAutoSubmit?.();
        }
      }

      await logViolation(attemptId, type, details, severity);
    },
    [attemptId, onViolation, onAutoSubmit, maxCriticalViolations]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        blurStartRef.current = Date.now();
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          handleViolation('tab_switch', `Tab switch #${next}`, next >= maxTabSwitches ? 'critical' : 'high');
          return next;
        });
      } else if (blurStartRef.current) {
        const elapsed = Math.round((Date.now() - blurStartRef.current) / 1000);
        setTimeOutside((prev) => prev + elapsed);
        blurStartRef.current = null;
      }
    };

    const handleBlur = () => {
      handleViolation('window_blur', 'Window lost focus', 'medium');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') { e.preventDefault(); handleViolation('copy_attempt', 'Ctrl+C', 'high'); }
        else if (e.key === 'v') { e.preventDefault(); handleViolation('paste_attempt', 'Ctrl+V', 'high'); }
        else if (e.key === 'x') { e.preventDefault(); handleViolation('cut_attempt', 'Ctrl+X', 'high'); }
        else if (e.key === 'Tab') { e.preventDefault(); handleViolation('keyboard_shortcut', 'Ctrl+Tab', 'high'); }
      }
      if (e.key === 'PrintScreen') { e.preventDefault(); handleViolation('print_screen', 'PrintScreen', 'critical'); }
      if (e.key === 'F12') { e.preventDefault(); handleViolation('devtools_open', 'F12', 'critical'); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') { e.preventDefault(); handleViolation('devtools_open', 'Ctrl+Shift+I', 'critical'); }
    };

    let inactivityTimer: NodeJS.Timeout;
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleViolation('keyboard_inactivity', 'No keyboard or mouse activity for 30 seconds', 'high');
      }, 30000);
    };

    const handleActivity = () => {
      resetInactivityTimer();
    };

    const handleOffline = () => {
      handleViolation('internet_disconnect', 'Internet connection lost', 'critical');
    };

    const handleContextMenu = (e: Event) => { e.preventDefault(); handleViolation('right_click', 'Right-click', 'low'); };
    const handleSelectStart = (e: Event) => { e.preventDefault(); };
    const handleCopy = (e: Event) => { e.preventDefault(); handleViolation('copy_attempt', 'Copy event', 'high'); };
    const handlePaste = (e: Event) => { e.preventDefault(); handleViolation('paste_attempt', 'Paste event', 'high'); };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) handleViolation('fullscreen_exit', 'Exited fullscreen', 'critical');
    };
    const handleResize = () => {
      handleViolation('window_resize', `${window.innerWidth}x${window.innerHeight}`, 'medium');
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are in a secure exam.';
    };

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

    window.addEventListener('offline', handleOffline);
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('scroll', handleActivity);
    
    resetInactivityTimer();

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

      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      clearTimeout(inactivityTimer);
    };
  }, [handleViolation, maxTabSwitches]);

  return { tabSwitchCount, timeOutside };
}
