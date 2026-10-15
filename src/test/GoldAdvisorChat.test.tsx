import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn() }, functions: { invoke: vi.fn() } },
}));
import { GoldAdvisorChat } from '@/components/GoldAdvisorChat';
import { I18nProvider } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

let providerConfigured = false;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  providerConfigured = false;
  vi.mocked(supabase.auth.getSession).mockReset();
  vi.mocked(supabase.functions.invoke).mockReset();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'test-user-access-token' } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] },
    error: null,
  });
  vi.mocked(supabase.functions.invoke).mockImplementation(async () => ({
    data: providerConfigured
      ? { configured: true, provider: 'anthropic', model: 'claude-sonnet-5-5', baseUrl: null }
      : { configured: false, provider: null, model: null, baseUrl: null },
    error: null,
  } as never));
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
});

function renderChat(language: 'en' | 'cn' = 'en') {
  localStorage.setItem('gold-lang', language);
  render(
    <I18nProvider>
      <div className="dashboard-viewport">
        <main className="dashboard-test-scroll-region" style={{ overflowY: 'auto', overscrollBehaviorY: 'contain' }} />
        <GoldAdvisorChat />
      </div>
    </I18nProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: language === 'cn' ? '打开黄金顾问' : 'Open Gold Advisor' }));
}

describe('GoldAdvisorChat feedback', () => {
  it('clearly blocks Advisor messaging when no provider is configured', async () => {
    renderChat();

    const dialog = await screen.findByRole('dialog', { name: 'Gold Advisor' });
    expect(await within(dialog).findByText('AI provider not configured')).toBeInTheDocument();
    expect(within(dialog).getByText('No default provider fallback is available.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Message the Gold Advisor')).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('keeps the mobile message pane vertically scrollable while limiting drag touch-action to the handle', async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

    try {
      renderChat();

      const dialog = await screen.findByRole('dialog', { name: 'Gold Advisor' });
      const messagePane = dialog.querySelector<HTMLElement>('[aria-live="off"]');
      const grabHandle = dialog.querySelector<HTMLElement>('.cursor-grab');
      const fullScreenWrapper = dialog.parentElement;

      expect(messagePane).not.toBeNull();
      expect(grabHandle).not.toBeNull();
      expect(fullScreenWrapper).not.toBeNull();
      expect(messagePane?.style.touchAction).toBe('pan-y pinch-zoom');
      expect(messagePane?.style.overflowY).toBe('auto');
      expect(messagePane?.style.overscrollBehaviorY).toBe('contain');
      expect(messagePane).toHaveClass('advisor-message-list');
      expect(messagePane).toHaveAttribute('role', 'region');
      expect(messagePane).toHaveAttribute('aria-label', 'Conversation messages');
      expect(messagePane).toHaveAttribute('tabindex', '0');
      expect(grabHandle?.style.touchAction).toBe('none');
      expect(fullScreenWrapper?.style.touchAction).not.toBe('none');
      expect(fullScreenWrapper?.style.overscrollBehavior).toBe('none');
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.position).toBe('fixed');
      expect(document.documentElement).toHaveClass('advisor-scroll-locked');
      expect(document.body).toHaveClass('advisor-scroll-locked');
      expect(getComputedStyle(document.body).position).toBe('fixed');
      expect(document.querySelector<HTMLElement>('.dashboard-test-scroll-region')?.style.overflowY).toBe('hidden');
      expect(document.querySelector<HTMLElement>('.dashboard-test-scroll-region')?.style.overscrollBehaviorY).toBe('none');

      const input = within(dialog).getByLabelText('Message the Gold Advisor');
      expect(input).toHaveClass('text-base');
      expect(input).not.toHaveClass('sm:text-sm');
      expect(input).toHaveClass('min-w-0', 'text-ellipsis');

      Object.defineProperties(messagePane!, {
        clientHeight: { configurable: true, value: 360 },
        scrollHeight: { configurable: true, value: 900 },
        scrollTop: { configurable: true, writable: true, value: 0 },
      });
      fireEvent.scroll(messagePane!);
      await waitFor(() => expect(dialog.querySelector('.advisor-scroll-indicator')).toBeInTheDocument());
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });

  it('keeps the composer on the 16px base text utility at mobile and tablet breakpoints', async () => {
    const originalInnerWidth = window.innerWidth;
    renderChat();

    try {
      const dialog = await screen.findByRole('dialog', { name: 'Gold Advisor' });
      const input = within(dialog).getByLabelText('Message the Gold Advisor');

      for (const viewportWidth of [390, 640, 768]) {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewportWidth });
        expect(input).toHaveClass('text-base');
        expect(input.className.split(' ')).not.toContain('sm:text-sm');
      }
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });

  it('keeps the sheet anchored to the visible viewport when the mobile keyboard resizes it', async () => {
    providerConfigured = true;
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    const visualViewport = new EventTarget() as VisualViewport;
    let visibleHeight = 844;
    let offsetTop = 0;
    let viewportScale = 1;
    Object.defineProperties(visualViewport, {
      height: { configurable: true, get: () => visibleHeight },
      offsetTop: { configurable: true, get: () => offsetTop },
      scale: { configurable: true, get: () => viewportScale },
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport });

    try {
      renderChat();

      const dialog = await screen.findByRole('dialog', { name: 'Gold Advisor' });
      const viewportWrapper = dialog.parentElement;
      const input = within(dialog).getByLabelText('Message the Gold Advisor');
      const dashboardMain = document.querySelector<HTMLElement>('.dashboard-test-scroll-region');
      const messagePane = dialog.querySelector<HTMLElement>('[aria-live="off"]');
      expect(viewportWrapper?.style.top).toBe('0px');
      expect(viewportWrapper?.style.height).toBe('844px');
      expect(input).not.toHaveFocus();
      expect(document.body).toHaveClass('advisor-scroll-locked');
      expect(document.documentElement.style.getPropertyValue('--advisor-locked-viewport-height')).toBe('844px');
      expect(dashboardMain?.style.overflowY).toBe('hidden');
      expect(messagePane?.style.overflowY).toBe('auto');

      act(() => input.focus());
      expect(input).toHaveFocus();
      visibleHeight = 420;
      offsetTop = 16;
      act(() => visualViewport.dispatchEvent(new Event('resize')));

      await waitFor(() => {
        expect(viewportWrapper?.style.top).toBe('16px');
        expect(viewportWrapper?.style.height).toBe('420px');
        expect(Number.parseFloat(dialog.style.height)).toBeCloseTo(369.6);
        expect(dialog.style.marginBottom).toBe('');
        expect(within(dialog).getByLabelText('Message the Gold Advisor').closest<HTMLElement>('.shrink-0')).toHaveClass('pb-3');
        expect(document.body).toHaveClass('advisor-scroll-locked');
        expect(document.documentElement.style.getPropertyValue('--advisor-locked-viewport-height')).toBe('420px');
        expect(dashboardMain?.style.overflowY).toBe('hidden');
        expect(messagePane?.style.overflowY).toBe('auto');
        expect(messagePane?.style.touchAction).toBe('pan-y pinch-zoom');
      });

      visibleHeight = 844;
      offsetTop = 0;
      act(() => visualViewport.dispatchEvent(new Event('resize')));
      await waitFor(() => {
        expect(viewportWrapper?.style.top).toBe('0px');
        expect(viewportWrapper?.style.height).toBe('844px');
        expect(within(dialog).getByLabelText('Message the Gold Advisor').closest<HTMLElement>('.shrink-0')?.className).toContain('pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]');
      });

      visibleHeight = 620;
      viewportScale = 1.2;
      act(() => visualViewport.dispatchEvent(new Event('resize')));
      await waitFor(() => {
        const composer = within(dialog).getByLabelText('Message the Gold Advisor').closest<HTMLElement>('.shrink-0');
        expect(viewportWrapper?.style.height).toBe('620px');
        expect(composer?.className).not.toContain('pb-3');
        expect(composer?.className).toContain('pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]');
      });
    } finally {
      matchMedia.mockRestore();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
      if (originalVisualViewport) {
        Object.defineProperty(window, 'visualViewport', originalVisualViewport);
      } else {
        delete (window as Window & { visualViewport?: VisualViewport }).visualViewport;
      }
    }
  });

  it('restores the page scroll styles when the Advisor closes', async () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    document.documentElement.style.overflow = 'auto';
    document.body.style.position = 'relative';
    try {
      renderChat();

      const dialog = await screen.findByRole('dialog', { name: 'Gold Advisor' });
      const dashboardMain = document.querySelector<HTMLElement>('.dashboard-test-scroll-region');
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.body.style.position).toBe('fixed');
      expect(dashboardMain?.style.overflowY).toBe('hidden');

      fireEvent.click(within(dialog).getByRole('button', { name: 'Close advisor' }));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Gold Advisor' })).not.toBeInTheDocument());
      expect(document.documentElement.style.overflow).toBe('auto');
      expect(document.documentElement.style.getPropertyValue('--advisor-locked-viewport-height')).toBe('');
      expect(document.body.style.position).toBe('relative');
      expect(dashboardMain?.style.overflowY).toBe('auto');
      expect(dashboardMain?.style.overscrollBehaviorY).toBe('contain');
      expect(document.documentElement).not.toHaveClass('advisor-scroll-locked');
      expect(document.body).not.toHaveClass('advisor-scroll-locked');
    } finally {
      matchMedia.mockRestore();
    }
  });

  it('blocks background touch and wheel scrolling while preserving scroll inside the message pane', async () => {
    renderChat();
    const messagePane = document.querySelector<HTMLElement>('.advisor-message-list');
    expect(messagePane).not.toBeNull();
    Object.defineProperties(messagePane!, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 300 },
      scrollTop: { configurable: true, writable: true, value: 50 },
    });

    const touchEvent = (type: string, clientY: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const touch = { identifier: 1, clientY } as Touch;
      Object.defineProperties(event, {
        touches: { configurable: true, value: [touch] },
        changedTouches: { configurable: true, value: [touch] },
      });
      return event;
    };

    document.body.dispatchEvent(touchEvent('touchstart', 100));
    const backgroundTouch = touchEvent('touchmove', 80);
    document.body.dispatchEvent(backgroundTouch);
    expect(backgroundTouch.defaultPrevented).toBe(true);

    messagePane!.dispatchEvent(touchEvent('touchstart', 100));
    const chatTouch = touchEvent('touchmove', 80);
    messagePane!.dispatchEvent(chatTouch);
    expect(chatTouch.defaultPrevented).toBe(false);

    const composer = screen.getByRole('textbox', { name: 'Message the Gold Advisor' });
    composer.dispatchEvent(touchEvent('touchstart', 100));
    const composerTouch = touchEvent('touchmove', 80);
    composer.dispatchEvent(composerTouch);
    expect(composerTouch.defaultPrevented).toBe(false);

    const backgroundWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    document.body.dispatchEvent(backgroundWheel);
    expect(backgroundWheel.defaultPrevented).toBe(true);
    const chatWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    messagePane!.dispatchEvent(chatWheel);
    expect(chatWheel.defaultPrevented).toBe(false);
  });

  it('announces loading and one completed response without live-announcing streamed tokens', async () => {
    providerConfigured = true;
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn(() => new Promise(resolve => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    renderChat();

    const dialog = await screen.findByRole('dialog', { name: 'Gold Advisor' });
    fireEvent.change(within(dialog).getByLabelText('Message the Gold Advisor'), { target: { value: 'Gold outlook?' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));

    expect(within(dialog).getByText('Gold Advisor is responding.')).toBeInTheDocument();
    expect(within(dialog).getByText('Connecting…')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const chunks = [
      new TextEncoder().encode('data: {"choices":[{"delta":{"content":"A careful outlook."}}]}\n\n'),
      new TextEncoder().encode('data: [DONE]\n\n'),
    ];
    const body = {
      getReader: () => ({
        read: vi.fn(async () => chunks.length ? { done: false, value: chunks.shift() } : { done: true, value: undefined }),
      }),
    };
    resolveFetch({ ok: true, body });

    expect(await within(dialog).findByText('Connected')).toBeInTheDocument();
    expect(within(dialog).getByText('Gold Advisor response received.')).toBeInTheDocument();
    expect(within(dialog).getByText('A careful outlook.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-user-access-token' }),
    }));
    const messageList = dialog.querySelector('[aria-live="off"]');
    expect(messageList).toHaveAttribute('aria-busy', 'false');
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
  });

  it('shows a localized Chinese error and disconnected state after an unsuccessful request', async () => {
    providerConfigured = true;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, body: null }));
    renderChat('cn');

    const dialog = await screen.findByRole('dialog', { name: '黄金顾问' });
    fireEvent.change(within(dialog).getByLabelText('发送消息给黄金顾问'), { target: { value: '行情如何？' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '发送消息' }));

    expect(await within(dialog).findByText('顾问暂时无法完成此请求，请重试。')).toBeInTheDocument();
    expect(within(dialog).getByText('已断开')).toBeInTheDocument();
    expect(within(dialog).getByText('黄金顾问暂时无法回复。')).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
