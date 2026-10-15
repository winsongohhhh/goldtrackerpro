import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddTradeForm } from '@/components/AddTradeForm';
import { I18nProvider } from '@/lib/i18n';
import { OZ_TO_GRAM } from '@/lib/gold-types';

const baseProps = {
  currentPrice: 100,
  convert: (usd: number) => usd,
  displayCurrency: 'USD' as const,
  unit: 'g' as const,
};

afterEach(cleanup);

beforeEach(() => {
  localStorage.setItem('gold-lang', 'en');
});

describe('AddTradeForm', () => {
  it('renders an accessible Add Trade form and submits the entered holding', async () => {
    const onAdd = vi.fn().mockResolvedValue({ success: true });

    render(
      <I18nProvider>
        <AddTradeForm {...baseProps} onAdd={onAdd} />
      </I18nProvider>,
    );

    expect(screen.getByRole('form', { name: 'Add Trade' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buy Price (USD/g)'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Quantity (g)'), { target: { value: '2' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add Trade' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Trade added.'));
    expect(onAdd).toHaveBeenCalledWith({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      price: 500,
      quantity: 2,
      currency: 'USD',
    });
  });

  it('saves the Malaysia-local date for trades entered after local midnight', async () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'Asia/Kuala_Lumpur';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T18:30:00.000Z'));
    const onAdd = vi.fn().mockResolvedValue({ success: true });

    try {
      render(
        <I18nProvider>
          <AddTradeForm {...baseProps} onAdd={onAdd} />
        </I18nProvider>,
      );
      fireEvent.change(screen.getByLabelText('Buy Price (USD/g)'), { target: { value: '500' } });
      fireEvent.change(screen.getByLabelText('Quantity (g)'), { target: { value: '2' } });
      fireEvent.submit(screen.getByRole('form', { name: 'Add Trade' }));

      await act(async () => { await Promise.resolve(); });
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-02-03' }));
    } finally {
      vi.useRealTimers();
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it('preserves ounce conversion precision so a one-ounce purchase retains its full cost', async () => {
    const onAdd = vi.fn().mockResolvedValue({ success: true });

    render(
      <I18nProvider>
        <AddTradeForm {...baseProps} unit="oz" onAdd={onAdd} />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByLabelText('Buy Price (USD/oz)'), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('Quantity (oz)'), { target: { value: '1' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Add Trade' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    const trade = onAdd.mock.calls[0][0];
    expect(trade).toMatchObject({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      currency: 'USD',
    });
    expect(trade.price).toBeCloseTo(3000 / OZ_TO_GRAM, 12);
    expect(trade.quantity).toBeCloseTo(OZ_TO_GRAM, 12);
    expect(trade.price * trade.quantity).toBeCloseTo(3000, 10);
  });

  it('keeps the Add Trade form name localized in Chinese', () => {
    localStorage.setItem('gold-lang', 'cn');
    render(
      <I18nProvider>
        <AddTradeForm {...baseProps} onAdd={vi.fn().mockResolvedValue({ success: true })} />
      </I18nProvider>,
    );

    expect(screen.getByRole('form', { name: '添加交易' })).toBeInTheDocument();
    expect(screen.queryByText('Add Value')).not.toBeInTheDocument();
  });
});
