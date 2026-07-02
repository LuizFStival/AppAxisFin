import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import {
  assertSupabaseConfigured,
  getAuthPersistencePreference,
  setAuthPersistencePreference,
} from '../../lib/supabase/supabaseClient';
import { getUserFriendlyError } from '../../lib/utils/userFriendlyError';
import { AxisFinLogo } from '../shared/AxisFinLogo';

interface AuthViewProps {
  onAuthenticated: () => void;
  isPasswordRecovery?: boolean;
  onPasswordRecovered?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'recover';

export function AuthView({ onAuthenticated, isPasswordRecovery = false, onPasswordRecovered }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isRecoveryCodeSent, setIsRecoveryCodeSent] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepConnected, setKeepConnected] = useState(getAuthPersistencePreference);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const client = assertSupabaseConfigured();

      if (isPasswordRecovery) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setPassword('');
        setMessage('Senha atualizada. Você já pode continuar no app.');
        onPasswordRecovered?.();
        return;
      }

      if (mode === 'recover') {
        if (isRecoveryCodeSent) {
          if (password !== confirmPassword) {
            throw new Error('As senhas não conferem.');
          }

          const { error: verifyError } = await client.auth.verifyOtp({
            email,
            token: recoveryCode,
            type: 'recovery',
          });
          if (verifyError) throw verifyError;

          const { error: updateError } = await client.auth.updateUser({ password });
          if (updateError) throw updateError;

          setPassword('');
          setConfirmPassword('');
          setRecoveryCode('');
          setMessage('Senha atualizada. Você já pode continuar no app.');
          onPasswordRecovered?.();
          return;
        }

        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });

        if (error) throw error;
        setIsRecoveryCodeSent(true);
        setMessage('Enviamos um código de recuperação para o seu e-mail.');
        return;
      }

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('As senhas não conferem.');
        }

        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name || email,
            },
          },
        });

        if (error) throw error;
        setMessage('Cadastro criado. Se o Supabase pedir confirmação por e-mail, confirme antes de entrar.');
      } else {
        setAuthPersistencePreference(keepConnected);
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthenticated();
      }
    } catch (error) {
      setMessage(getUserFriendlyError(error, 'Não foi possível concluir esta ação agora. Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  }

  const title = isPasswordRecovery || (mode === 'recover' && isRecoveryCodeSent)
    ? 'Criar nova senha'
    : mode === 'recover'
      ? 'Recuperar senha'
      : 'Entrar no app';
  const submitLabel = isPasswordRecovery
    ? 'Salvar nova senha'
    : mode === 'recover'
      ? isRecoveryCodeSent
        ? 'Salvar nova senha'
        : 'Enviar email'
      : mode === 'signin'
        ? 'Entrar'
        : 'Criar conta';

  return (
    <main className="min-h-screen bg-[#050608] px-5 py-8 text-white md:flex md:items-center md:justify-center">
      <section className="cosmic-bg mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center rounded-none md:min-h-[760px] md:rounded-[34px] md:border md:border-[#15171C] md:px-2">
        <div className="px-5">
          <div className="mb-8 flex items-center gap-3">
            <AxisFinLogo />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">AxisFin</p>
              <h1 className="font-display text-2xl font-bold">{title}</h1>
            </div>
          </div>

          <div className="cosmic-card rounded-3xl p-5">
            {!isPasswordRecovery ? (
              <div className="mb-4 grid grid-cols-2 rounded-2xl bg-[#050608] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMessage('');
                    setIsRecoveryCodeSent(false);
                    setMode('signin');
                  }}
                  className={`h-11 rounded-xl text-sm font-bold transition ${mode === 'signin' ? 'bg-[#1A1C22] text-[#3B82F6]' : 'text-gray-400'}`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessage('');
                    setIsRecoveryCodeSent(false);
                    setMode('signup');
                  }}
                  className={`h-11 rounded-xl text-sm font-bold transition ${mode === 'signup' ? 'bg-[#1A1C22] text-[#3B82F6]' : 'text-gray-400'}`}
                >
                  Criar conta
                </button>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'signup' ? (
                <label className="block text-xs font-semibold text-gray-400">
                  Nome
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 h-12 w-full rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 text-sm text-white outline-none focus:border-[#3B82F6]"
                    placeholder="Seu nome"
                  />
                </label>
              ) : null}

              {!isPasswordRecovery ? (
                <label className="block text-xs font-semibold text-gray-400">
                  Email
                  <div className="mt-1 flex h-12 items-center gap-3 rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 focus-within:border-[#3B82F6]">
                    <Mail size={17} className="shrink-0 text-gray-500" />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      required
                      className="w-full min-w-0 bg-transparent text-sm text-white outline-none"
                      placeholder="seuemail@gmail.com"
                    />
                  </div>
                </label>
              ) : null}

              {!isPasswordRecovery && mode === 'recover' && isRecoveryCodeSent ? (
                <label className="block text-xs font-semibold text-gray-400">
                  Código recebido
                  <input
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value.trim())}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="mt-1 h-12 w-full rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 text-sm text-white outline-none focus:border-[#3B82F6]"
                    placeholder="Digite o código"
                  />
                </label>
              ) : null}

              {mode !== 'recover' || isPasswordRecovery || isRecoveryCodeSent ? (
                <label className="block text-xs font-semibold text-gray-400">
                  {isPasswordRecovery || mode === 'recover' ? 'Nova senha' : 'Senha'}
                  <div className="mt-1 flex h-12 items-center gap-3 rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 focus-within:border-[#3B82F6]">
                    <LockKeyhole size={17} className="shrink-0 text-gray-500" />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="w-full min-w-0 bg-transparent text-sm text-white outline-none"
                      placeholder="Minimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-[#1A1C22] hover:text-white"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
              ) : null}

              {!isPasswordRecovery && (mode === 'signup' || (mode === 'recover' && isRecoveryCodeSent)) ? (
                <label className="block text-xs font-semibold text-gray-400">
                  Confirmar senha
                  <div className="mt-1 flex h-12 items-center gap-3 rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 focus-within:border-[#3B82F6]">
                    <LockKeyhole size={17} className="shrink-0 text-gray-500" />
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      className="w-full min-w-0 bg-transparent text-sm text-white outline-none"
                      placeholder="Repita a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-[#1A1C22] hover:text-white"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
              ) : null}

              {!isPasswordRecovery && mode === 'signin' ? (
                <div className="-mt-2 flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-gray-400">
                    <input
                      type="checkbox"
                      checked={keepConnected}
                      onChange={(event) => setKeepConnected(event.target.checked)}
                      className="size-4 accent-[#3B82F6]"
                    />
                    Manter conectado
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMessage('');
                      setPassword('');
                      setConfirmPassword('');
                      setRecoveryCode('');
                      setIsRecoveryCodeSent(false);
                      setMode('recover');
                    }}
                    className="pr-1 text-[11px] font-semibold leading-none text-gray-400 transition hover:text-[#3B82F6]"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-[#1A1C22] bg-[#050608] p-3 text-xs leading-relaxed text-gray-300">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 h-12 w-full rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-sm font-bold text-white shadow-lg shadow-[#3B82F6]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Processando...' : submitLabel}
              </button>

              {!isPasswordRecovery && mode === 'recover' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMessage('');
                    setPassword('');
                    setConfirmPassword('');
                    setRecoveryCode('');
                    setIsRecoveryCodeSent(false);
                    setMode('signin');
                  }}
                  className="h-10 w-full text-xs font-bold text-gray-500 transition hover:text-white"
                >
                  Voltar para entrar
                </button>
              ) : null}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
