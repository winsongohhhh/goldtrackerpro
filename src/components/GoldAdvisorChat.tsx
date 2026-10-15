import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquareText, X, Send, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAIProviderStatus } from '@/hooks/use-ai-provider-status';
import { AI_PROVIDER_OPTIONS } from '@/lib/ai-providers';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gold-advisor-chat`;

function solveUnderdampedSpring(
  t: number,
  initialPos: number,
  initialVel: number,
  targetPos: number,
  damping: number = 0.8,
  response: number = 0.3
) {
  const omegaN = (2 * Math.PI) / response;
  const decay = damping * omegaN;
  const omegaD = omegaN * Math.sqrt(1 - damping * damping);
  const x0 = initialPos - targetPos;
  const c1 = x0;
  const c2 = (initialVel + decay * x0) / omegaD;

  const expTerm = Math.exp(-decay * t);
  const pos = targetPos + expTerm * (c1 * Math.cos(omegaD * t) + c2 * Math.sin(omegaD * t));
  const vel =
    expTerm *
    (-decay * (c1 * Math.cos(omegaD * t) + c2 * Math.sin(omegaD * t)) +
      omegaD * (-c1 * Math.sin(omegaD * t) + c2 * Math.cos(omegaD * t)));

  return { pos, vel };
}

function projectMomentum(initialVelocity: number, decelerationRate: number = 0.998): number {
  return (initialVelocity / 1000) * (decelerationRate / (1 - decelerationRate));
}

function rubberband(overshoot: number, dimension: number = 400, constant: number = 0.45): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

interface GoldAdvisorChatProps {
  currentPrice?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GoldAdvisorChat({
  currentPrice,
  open: externalOpen,
  onOpenChange,
}: GoldAdvisorChatProps) {
  const { lang, t } = useI18n();
  const { status: aiProviderStatus, loading: aiProviderStatusLoading } = useAIProviderStatus();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;
  const advisorEnabled = aiProviderStatus.configured && aiProviderStatus.provider !== null;

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(nextOpen);
      } else {
        setInternalOpen(nextOpen);
      }
    },
    [isControlled, onOpenChange]
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [announcement, setAnnouncement] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [viewportMetrics, setViewportMetrics] = useState(() => {
    const height = typeof window === 'undefined' ? 800 : window.visualViewport?.height ?? window.innerHeight;
    return {
      height,
      offsetTop: typeof window === 'undefined' ? 0 : window.visualViewport?.offsetTop ?? 0,
      keyboardOpen: false,
    };
  });
  const [messageScrollInfo, setMessageScrollInfo] = useState({
    hasOverflow: false,
    progress: 1,
    thumbSize: 100,
  });
  const messagePaneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const grabOffsetYRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const velocityHistoryRef = useRef<Array<{ y: number; time: number }>>([]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(query.matches);
    updatePreference();
    query.addEventListener('change', updatePreference);
    return () => query.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      const visualViewport = window.visualViewport;
      const height = visualViewport?.height ?? window.innerHeight;
      const offsetTop = visualViewport?.offsetTop ?? 0;
      const composerFocused = inputRef.current !== null && document.activeElement === inputRef.current;
      const isPageZoomed = (visualViewport?.scale ?? 1) > 1.01;
      const keyboardOpen = composerFocused && !isPageZoomed && height < window.innerHeight - 120;
      setViewportMetrics((previous) =>
        previous.height === height && previous.offsetTop === offsetTop && previous.keyboardOpen === keyboardOpen
          ? previous
          : { height, offsetTop, keyboardOpen }
      );
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const root = document.documentElement;
    const body = document.body;
    const dashboardMain = document.querySelector<HTMLElement>('.dashboard-viewport > main');
    const previousStyles = {
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
      rootLockedViewportHeight: root.style.getPropertyValue('--advisor-locked-viewport-height'),
      rootLockedViewportHeightPriority: root.style.getPropertyPriority('--advisor-locked-viewport-height'),
      rootHadLockedViewportHeight: Array.from(root.style).includes('--advisor-locked-viewport-height'),
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      dashboardMainOverflowY: dashboardMain?.style.overflowY ?? '',
      dashboardMainOverscrollBehaviorY: dashboardMain?.style.overscrollBehaviorY ?? '',
      rootHadLockClass: root.classList.contains('advisor-scroll-locked'),
      bodyHadLockClass: body.classList.contains('advisor-scroll-locked'),
    };

    root.classList.add('advisor-scroll-locked');
    body.classList.add('advisor-scroll-locked');
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const updateLockedViewportHeight = () => {
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--advisor-locked-viewport-height', `${visibleHeight}px`);
    };
    updateLockedViewportHeight();
    window.addEventListener('resize', updateLockedViewportHeight);
    window.visualViewport?.addEventListener('resize', updateLockedViewportHeight);

    if (dashboardMain) {
      dashboardMain.style.overflowY = 'hidden';
      dashboardMain.style.overscrollBehaviorY = 'none';
    }

    const touchY = new Map<number, number>();
    const rememberTouches = (event: TouchEvent) => {
      Array.from(event.changedTouches).forEach((touch) => touchY.set(touch.identifier, touch.clientY));
    };
    const preventBackgroundTouchScroll = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const pane = target?.closest<HTMLElement>('.advisor-message-list') ?? null;
      const touch = event.changedTouches[0];
      if (!touch) return;

      const previousY = touchY.get(touch.identifier) ?? touch.clientY;
      const deltaY = touch.clientY - previousY;
      touchY.set(touch.identifier, touch.clientY);
      if (!pane) {
        if (target?.closest('input, textarea, [contenteditable="true"]')) return;
        event.preventDefault();
        return;
      }
      if (event.touches.length > 1) return;

      const maxScroll = pane.scrollHeight - pane.clientHeight;
      const atTop = pane.scrollTop <= 0;
      const atBottom = pane.scrollTop >= maxScroll - 1;
      if (maxScroll <= 1 || (atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };
    const preventBackgroundWheelScroll = (event: WheelEvent) => {
      const pane = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.advisor-message-list')
        : null;
      if (!pane) event.preventDefault();
    };
    const clearTouches = (event: TouchEvent) => {
      Array.from(event.changedTouches).forEach((touch) => touchY.delete(touch.identifier));
    };

    document.addEventListener('touchstart', rememberTouches, { capture: true, passive: true });
    document.addEventListener('touchmove', preventBackgroundTouchScroll, { capture: true, passive: false });
    document.addEventListener('touchend', clearTouches, { capture: true, passive: true });
    document.addEventListener('touchcancel', clearTouches, { capture: true, passive: true });
    document.addEventListener('wheel', preventBackgroundWheelScroll, { capture: true, passive: false });

    return () => {
      window.removeEventListener('resize', updateLockedViewportHeight);
      window.visualViewport?.removeEventListener('resize', updateLockedViewportHeight);
      document.removeEventListener('touchstart', rememberTouches, true);
      document.removeEventListener('touchmove', preventBackgroundTouchScroll, true);
      document.removeEventListener('touchend', clearTouches, true);
      document.removeEventListener('touchcancel', clearTouches, true);
      document.removeEventListener('wheel', preventBackgroundWheelScroll, true);

      root.style.overflow = previousStyles.rootOverflow;
      root.style.overscrollBehavior = previousStyles.rootOverscrollBehavior;
      if (previousStyles.rootHadLockedViewportHeight) {
        root.style.setProperty(
          '--advisor-locked-viewport-height',
          previousStyles.rootLockedViewportHeight,
          previousStyles.rootLockedViewportHeightPriority
        );
      } else {
        root.style.removeProperty('--advisor-locked-viewport-height');
      }
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
      body.style.position = previousStyles.bodyPosition;
      body.style.top = previousStyles.bodyTop;
      body.style.left = previousStyles.bodyLeft;
      body.style.right = previousStyles.bodyRight;
      body.style.width = previousStyles.bodyWidth;
      if (dashboardMain) {
        dashboardMain.style.overflowY = previousStyles.dashboardMainOverflowY;
        dashboardMain.style.overscrollBehaviorY = previousStyles.dashboardMainOverscrollBehaviorY;
      }
      if (!previousStyles.rootHadLockClass) root.classList.remove('advisor-scroll-locked');
      if (!previousStyles.bodyHadLockClass) body.classList.remove('advisor-scroll-locked');
      if (scrollY > 0) window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content:
          lang === 'cn'
            ? '你好！我是你的黄金分析顾问。关于黄金市场的任何问题，都可以问我。📊'
            : "Hello! I'm your Gold Analyst Advisor. Feel free to ask me anything about the gold market. 📊",
      },
    ]);
  }, [lang]);

  useEffect(() => {
    const messagePane = messagePaneRef.current;
    if (!messagePane) return;
    messagePane.scrollTo({
      top: messagePane.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, prefersReducedMotion]);

  useEffect(() => {
    const messagePane = messagePaneRef.current;
    if (!messagePane) return;

    const updateScrollIndicator = () => {
      const maxScroll = Math.max(0, messagePane.scrollHeight - messagePane.clientHeight);
      const thumbSize = messagePane.scrollHeight > 0
        ? Math.min(100, Math.max(12, (messagePane.clientHeight / messagePane.scrollHeight) * 100))
        : 100;
      const next = {
        hasOverflow: maxScroll > 1,
        progress: maxScroll > 0 ? messagePane.scrollTop / maxScroll : 1,
        thumbSize,
      };
      setMessageScrollInfo((previous) =>
        previous.hasOverflow === next.hasOverflow &&
        Math.abs(previous.progress - next.progress) < 0.005 &&
        Math.abs(previous.thumbSize - next.thumbSize) < 0.1
          ? previous
          : next
      );
    };

    updateScrollIndicator();
    messagePane.addEventListener('scroll', updateScrollIndicator, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollIndicator);
    resizeObserver?.observe(messagePane);
    Array.from(messagePane.children).forEach((child) => resizeObserver?.observe(child));
    const mutationObserver = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(updateScrollIndicator);
    mutationObserver?.observe(messagePane, { childList: true, subtree: true, characterData: true });

    return () => {
      messagePane.removeEventListener('scroll', updateScrollIndicator);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [isOpen]);

  const updateSheetDOM = useCallback((y: number) => {
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    const boundedY = Math.max(-48, Math.min(visibleHeight, y));
    sheetYRef.current = boundedY;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translate3d(0, ${boundedY}px, 0)`;
    }
  }, []);

  const animateSpringTo = useCallback(
    (targetY: number, initialVelocity: number = 0, onComplete?: () => void) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (prefersReducedMotion) {
        updateSheetDOM(targetY);
        onComplete?.();
        return;
      }

      const startPos = sheetYRef.current;
      const startTime = performance.now();
      const damping = 0.8;
      const response = 0.3;

      const tick = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        const { pos, vel } = solveUnderdampedSpring(
          elapsed,
          startPos,
          initialVelocity,
          targetY,
          damping,
          response
        );

        updateSheetDOM(pos);

        if (elapsed > 0.1 && Math.abs(pos - targetY) < 0.5 && Math.abs(vel) < 5) {
          updateSheetDOM(targetY);
          onComplete?.();
          return;
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [updateSheetDOM, prefersReducedMotion]
  );

  useEffect(() => {
    if (isOpen) {
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      updateSheetDOM(visibleHeight);
      requestAnimationFrame(() => {
        animateSpringTo(0, -600, () => {
          const dialog = sheetRef.current;
          if (dialog && !dialog.contains(document.activeElement)) {
            dialog.focus({ preventScroll: true });
          }
        });
      });
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  }, [isOpen, animateSpringTo, updateSheetDOM]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const currentY = sheetYRef.current;
    grabOffsetYRef.current = e.clientY - currentY;
    isDraggingRef.current = true;
    velocityHistoryRef.current = [{ y: e.clientY, time: performance.now() }];

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const rawY = e.clientY - grabOffsetYRef.current;
    let nextY = rawY;

    if (rawY < 0) {
      nextY = rubberband(rawY, window.innerHeight, 0.45);
    }

    updateSheetDOM(nextY);

    const now = performance.now();
    velocityHistoryRef.current.push({ y: e.clientY, time: now });
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const history = velocityHistoryRef.current;
    let releaseVelocity = 0;
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = (last.time - first.time) / 1000;
      if (dt > 0.005) {
        releaseVelocity = (last.y - first.y) / dt;
      }
    }

    const currentY = sheetYRef.current;
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    const projectedLanding = currentY + projectMomentum(releaseVelocity, 0.998);

    if (projectedLanding > 280 || currentY > visibleHeight * 0.35 || releaseVelocity > 800) {
      animateSpringTo(visibleHeight, releaseVelocity, () => {
        setOpenState(false);
      });
    } else {
      animateSpringTo(0, releaseVelocity);
    }
  };

  const handleCloseClick = useCallback(() => {
    const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
    animateSpringTo(visibleHeight, 500, () => setOpenState(false));
  }, [animateSpringTo, setOpenState]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseClick();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = sheetRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    if (isOpen || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    const frame = requestAnimationFrame(() => launcherRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const openAdvisor = () => {
    shouldRestoreFocusRef.current = true;
    setOpenState(true);
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !advisorEnabled) return;

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setConnectionStatus('idle');
    setAnnouncement(t.chatThinking);

    let assistantSoFar = '';

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error('Authentication required');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: newMessages, lang, currentPrice }),
      });

      if (!resp.ok || !resp.body) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t.chatRequestError },
        ]);
        setConnectionStatus('disconnected');
        setAnnouncement(t.chatErrorAnnouncement);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const snap = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && prev.length > newMessages.length) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: snap } : m
                  );
                }
                return [...prev, { role: 'assistant', content: snap }];
              });
            }
          } catch {
            /* partial parse */
          }
        }
      }

      if (!assistantSoFar.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: t.chatEmptyResponse },
        ]);
        setConnectionStatus('disconnected');
        setAnnouncement(t.chatErrorAnnouncement);
        return;
      }

      setConnectionStatus('connected');
      setAnnouncement(t.chatResponseReady);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t.chatNetworkError },
      ]);
      setConnectionStatus('disconnected');
      setAnnouncement(t.chatErrorAnnouncement);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, lang, t, currentPrice, advisorEnabled]);

  const sheetHeight = Math.min(760, Math.max(240, viewportMetrics.height * 0.88));
  const activeProviderLabel = advisorEnabled && aiProviderStatus.provider
    ? `${AI_PROVIDER_OPTIONS[aiProviderStatus.provider].label} · ${aiProviderStatus.model}`
    : aiProviderStatusLoading
      ? t.aiProviderLoading
      : t.aiProviderNotConfigured;

  return (
    <>
      {/* ── Floating advisor control: available on desktop and mobile ── */}
      {!isOpen && (
        <button
          ref={launcherRef}
          onClick={openAdvisor}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 z-40 flex w-12 h-12 rounded-full items-center justify-center text-[#F0B94C] hover:text-[#FFD77A] hover:scale-[1.03] active:scale-95 transition-all shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E5A93C]"
          style={{
            background: 'rgba(28, 28, 30, 0.82)',
            backdropFilter: 'blur(18px) saturate(180%)',
            WebkitBackdropFilter: 'blur(18px) saturate(180%)',
            border: '0.5px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          }}
          aria-label={lang === 'cn' ? '打开黄金顾问' : 'Open Gold Advisor'}
          title={lang === 'cn' ? '黄金顾问' : 'Gold Advisor'}
        >
          <MessageSquareText className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
        </button>
      )}

      {/* ── Modal Sheet Container (§3, §12) ───────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-x-0 z-[1000] flex flex-col justify-end pointer-events-auto"
          style={{
            // The visual viewport offset is applied once here; the sheet itself stays bottom-anchored.
            top: `${viewportMetrics.offsetTop}px`,
            height: `${viewportMetrics.height}px`,
            overscrollBehavior: 'none',
          }}
        >
          {/* Backdrop Scrim */}
          <div
            onClick={handleCloseClick}
            aria-hidden="true"
            className="advisor-scroll-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Interactive Modal Sheet Container */}
          <div
            ref={sheetRef}
            className="relative w-full max-w-xl mx-auto max-h-[760px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border-t border-white/20 will-change-transform"
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'cn' ? '黄金顾问' : 'Gold Advisor'}
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            style={{
              height: `${sheetHeight}px`,
              maxHeight: `${viewportMetrics.height}px`,
              background: 'rgba(18, 20, 24, 0.92)',
              backdropFilter: 'blur(30px) saturate(200%)',
              WebkitBackdropFilter: 'blur(30px) saturate(200%)',
            }}
          >
            {/* Grab Handle */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full pt-3 pb-2 cursor-grab active:cursor-grabbing flex flex-col items-center select-none"
              style={{ touchAction: 'none' }}
            >
              <div className="w-[36px] h-[5px] rounded-full bg-white/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E5A93C]/15 border border-[#E5A93C]/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#E5A93C]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    {t.goldAdvisorHelp}
                  </div>
                  <div className="max-w-[210px] truncate text-[10px] text-white/55" title={activeProviderLabel}>
                    {activeProviderLabel}
                  </div>
                  <div className={`text-[10px] ${!aiProviderStatusLoading && !advisorEnabled ? 'text-amber-200' : connectionStatus === 'connected' ? 'text-emerald-300' : connectionStatus === 'disconnected' ? 'text-amber-200' : 'text-muted-foreground'}`}>
                    {aiProviderStatusLoading
                      ? t.aiProviderLoading
                      : !advisorEnabled
                        ? t.aiProviderNoDefaultFallback
                        : isLoading
                          ? t.chatConnecting
                          : connectionStatus === 'connected'
                            ? t.chatConnected
                            : connectionStatus === 'disconnected'
                              ? t.chatDisconnected
                              : t.chatReady}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full bg-white/[0.06] text-muted-foreground hover:text-white"
                onClick={handleCloseClick}
                aria-label={lang === 'cn' ? '关闭顾问' : 'Close advisor'}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>

            {/* Scrollable Message List */}
            <div className="advisor-message-region relative min-h-0 flex-1">
              <div
                ref={messagePaneRef}
                className="advisor-message-list absolute inset-0 min-h-0 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain"
                role="region"
                aria-label={lang === 'cn' ? '顾问对话消息' : 'Conversation messages'}
                aria-live="off"
                aria-busy={isLoading}
                tabIndex={0}
                style={{
                  minHeight: 0,
                  overflowY: 'auto',
                  overscrollBehaviorY: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y pinch-zoom',
                }}
              >
                {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-end gap-2',
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mb-0.5">
                      <Bot className="w-3.5 h-3.5 text-[#E5A93C]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap transition-all shadow-sm',
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-[#E8AF44] to-[#D89A2B] text-black font-medium rounded-[18px] rounded-br-[4px]'
                        : 'bg-white/[0.08] text-white rounded-[18px] rounded-bl-[4px] border border-white/[0.08]'
                    )}
                  >
                    <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:my-1 [&>li]:my-0 [&>ul]:pl-4 [&>ol]:pl-4">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#E5A93C]" />
                  </div>
                  <div className="bg-white/[0.08] rounded-[18px] rounded-bl-[4px] px-4 py-2.5 border border-white/[0.08]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#E5A93C]" aria-hidden="true" />
                  </div>
                  </div>
                )}
              </div>
              {messageScrollInfo.hasOverflow && (
                <div className="advisor-scroll-indicator" aria-hidden="true">
                  <div className="advisor-scroll-indicator-track" />
                  <div
                    className="advisor-scroll-indicator-thumb"
                    style={{
                      height: `${messageScrollInfo.thumbSize}%`,
                      top: `${messageScrollInfo.progress * (100 - messageScrollInfo.thumbSize)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── High-Tech Conic Gradient Input Bar (§6: #poda, .glow, .darkBorderBg) ── */}
            <div
              className={cn(
                'shrink-0 px-4 py-3 border-t border-white/[0.08] bg-[#14161B]/95',
                viewportMetrics.keyboardOpen
                  ? 'pb-3'
                  : 'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]'
              )}
              style={{ touchAction: 'pan-y' }}
            >
              <div id="poda" className="w-full">
                <div className="glow" />
                <div className="darkBorderBg flex items-center gap-2 px-4 py-1.5 border border-white/20">
                  <input
                    ref={inputRef}
                    aria-label={lang === 'cn' ? '发送消息给黄金顾问' : 'Message the Gold Advisor'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder={
                      !aiProviderStatusLoading && !advisorEnabled
                        ? t.aiProviderEnableAdvisor
                        : lang === 'cn'
                        ? '咨询黄金行情走势、买卖建议...'
                        : 'Ask about gold market, outlook, or allocation...'
                    }
                    className="min-w-0 flex-1 text-ellipsis bg-transparent text-base text-white placeholder:text-muted-foreground outline-none py-1.5"
                    disabled={isLoading || aiProviderStatusLoading || !advisorEnabled}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.sendMessage}
                    className="h-11 w-11 bg-[#E5A93C] hover:bg-[#F5D285] text-black rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:bg-white/10 disabled:text-white/40"
                    onClick={send}
                    disabled={isLoading || aiProviderStatusLoading || !advisorEnabled || !input.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
