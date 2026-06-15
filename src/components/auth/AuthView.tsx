import React, { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { assertSupabaseConfigured } from '../../lib/supabase/supabaseClient';
import { AxisFinLogo } from '../shared/AxisFinLogo';

interface AuthViewProps {
  onAuthenticated: () => void;
}

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const client = assertSupabaseConfigured();

      if (mode === 'signup') {
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
        setMessage('Cadastro criado. Se o Supabase pedir confirmação por email, confirme antes de entrar.');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthenticated();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível autenticar agora.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050608] px-5 py-8 text-white md:flex md:items-center md:justify-center">
      <section className="cosmic-bg mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center rounded-none md:min-h-[760px] md:rounded-[34px] md:border md:border-[#15171C] md:px-2">
        <div className="px-5">
          <div className="mb-8 flex items-center gap-3">
            <AxisFinLogo />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">AxisFin</p>
              <h1 className="font-display text-2xl font-bold">Entrar no app</h1>
            </div>
          </div>

          <div className="cosmic-card rounded-3xl p-5">
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-[#050608] p-1">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`h-11 rounded-xl text-sm font-bold transition ${mode === 'signin' ? 'bg-[#1A1C22] text-[#3B82F6]' : 'text-gray-500'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`h-11 rounded-xl text-sm font-bold transition ${mode === 'signup' ? 'bg-[#1A1C22] text-[#3B82F6]' : 'text-gray-500'}`}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <label className="block text-xs font-semibold text-gray-400">
                Email
                <div className="mt-1 flex h-12 items-center gap-3 rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 focus-within:border-[#3B82F6]">
                  <Mail size={17} className="text-gray-500" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    className="w-full bg-transparent text-sm text-white outline-none"
                    placeholder="voce@email.com"
                  />
                </div>
              </label>

              <label className="block text-xs font-semibold text-gray-400">
                Senha
                <div className="mt-1 flex h-12 items-center gap-3 rounded-2xl border border-[#1A1C22] bg-[#0A0B0E] px-4 focus-within:border-[#3B82F6]">
                  <LockKeyhole size={17} className="text-gray-500" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    required
                    minLength={6}
                    className="w-full bg-transparent text-sm text-white outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </label>

              {message ? (
                <div className="rounded-2xl border border-[#1A1C22] bg-[#050608] p-3 text-xs leading-relaxed text-gray-300">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-sm font-bold text-white shadow-lg shadow-[#3B82F6]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Processando...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
