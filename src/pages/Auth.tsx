import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Globe, ArrowRight } from 'lucide-react';
import { GoldBarIcon } from '@/components/GoldBarIcon';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(lang === 'cn' ? '注册成功！请查收验证邮件。' : 'Signed up! Please check your email to verify.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-foreground flex flex-col justify-between p-4 sm:p-6 selection:bg-amber-500/30 selection:text-amber-200">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between max-w-7xl mx-auto w-full pt-1">
        {/* Left: Brand Mark with Gold Bullion Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <GoldBarIcon className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white leading-none">
            GoldTracker <span className="text-amber-400">Pro</span>
          </span>
        </div>

        {/* Right: Functional Language Switcher */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
          className="text-muted-foreground hover:text-white h-8 gap-1.5 text-xs px-3 rounded-full bg-[#13161B] border border-white/[0.06]"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'cn' ? '中文 (简体)' : 'English'}</span>
        </Button>
      </header>

      {/* ── Center Login Box ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center py-10 w-full max-w-md mx-auto">
        {/* Floating Gold Bullion Emblem */}
        <div className="w-12 h-12 rounded-2xl bg-[#13161B] border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5 mb-4">
          <GoldBarIcon className="w-6 h-6" />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-6 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Gold Tracker Pro
          </h1>
          <p className="text-xs text-muted-foreground">
            {t.loginSubtitle}
          </p>
        </div>

        {/* Card Container */}
        <div className="w-full bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
          {/* Working Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-11 rounded-xl bg-[#0E1115] hover:bg-white/[0.04] border border-white/[0.08] text-white text-xs font-medium flex items-center justify-center gap-2.5 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>{t.googleContinue}</span>
          </button>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#13161B] px-3 text-muted-foreground/60 tracking-wider">
                {t.orEmailPassword}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {/* Email Field */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-[#0E1115] border border-white/[0.08] rounded-xl h-11 pl-10 text-xs text-white placeholder:text-muted-foreground/40 focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-[#0E1115] border border-white/[0.08] rounded-xl h-11 pl-10 pr-10 text-xs text-white placeholder:text-muted-foreground/40 focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Solid Gold CTA Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#F3BA2F] hover:bg-[#F3BA2F]/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all mt-3 shadow-sm"
            >
              <span>
                {loading
                  ? '...'
                  : isLogin
                    ? t.loginAction
                    : t.registerAction}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Button>
          </form>

          {/* Toggle Login / Register */}
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              {isLogin ? t.noAccountYet : t.alreadyHaveAccount}{' '}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors"
            >
              {isLogin ? t.registerNow : t.signInNow} ›
            </button>
          </div>
        </div>
      </div>

      {/* ── Page Footer: Minimal & Accurate ───────────────────── */}
      <footer className="max-w-7xl mx-auto w-full pt-4 border-t border-white/[0.04] text-[11px] text-muted-foreground flex items-center justify-center">
        <span>© 2026 Gold Tracker Pro. {t.allRightsReserved}</span>
      </footer>
    </div>
  );
}
