import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Auth from '@/pages/Auth';
import { I18nProvider } from '@/lib/i18n';

afterEach(cleanup);
beforeEach(() => localStorage.setItem('gold-lang', 'en'));

describe('Auth', () => {
  it('shows registration-specific copy when switching from sign-in to sign-up', () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <Auth />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sign in to sync your trades and real-time assets')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sign up now/i }));

    expect(screen.getByText('Create an account to sync your trades and real-time assets')).toBeInTheDocument();
  });
});
