import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else if (mode === 'signup') {
      // 이메일 확인이 켜져 있으면 세션이 바로 생기지 않을 수 있음
      setNotice('가입 완료. 이메일 확인이 필요할 수 있어요. 로그인해 주세요.');
      setMode('signin');
    }
    setBusy(false);
  }

  return (
    <form className="auth" onSubmit={handleSubmit}>
      <h1>할 일</h1>
      <p className="auth-sub">{mode === 'signin' ? '로그인' : '회원가입'}</p>

      <input
        type="email"
        placeholder="이메일"
        value={email}
        autoComplete="email"
        required
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        required
        minLength={6}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="msg error">{error}</p>}
      {notice && <p className="msg notice">{notice}</p>}

      <button type="submit" disabled={busy}>
        {busy ? '처리 중…' : mode === 'signin' ? '로그인' : '회원가입'}
      </button>

      <button
        type="button"
        className="link"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError(null);
          setNotice(null);
        }}
      >
        {mode === 'signin' ? '계정이 없나요? 회원가입' : '이미 계정이 있나요? 로그인'}
      </button>
    </form>
  );
}
