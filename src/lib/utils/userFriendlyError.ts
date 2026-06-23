type ErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const SERVICE_MESSAGE = 'Não foi possível conectar ao serviço agora. Aguarde um momento e tente novamente.';

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? error as ErrorLike : {};
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isNetworkError(message: string, name: string): boolean {
  return (name === 'typeerror' && (
    message.includes('fetch')
    || message.includes('network')
    || message.includes('load failed')
  )) || [
    'failed to fetch',
    'fetch failed',
    'networkerror when attempting to fetch resource',
    'network request failed',
    'load failed',
  ].some((text) => message.includes(text));
}

function isServiceUnavailable(status: unknown, code: string, message: string): boolean {
  const numericStatus = typeof status === 'number' ? status : Number(status);
  return numericStatus >= 500
    || ['502', '503', '504', 'pgrst000', 'pgrst001', 'pgrst002'].includes(code)
    || message.includes('service unavailable')
    || message.includes('gateway timeout')
    || message.includes('connection refused')
    || message.includes('connection timeout');
}

function authMessage(code: string, message: string): string | null {
  if (
    ['invalid_credentials', 'invalid_grant', 'user_not_found'].includes(code)
    || message.includes('invalid login credentials')
  ) {
    return 'Email ou senha incorretos. Confira os dados e tente novamente.';
  }

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Seu email ainda não foi confirmado. Abra a mensagem de confirmação enviada para você.';
  }

  if (
    ['email_exists', 'user_already_exists'].includes(code)
    || message.includes('user already registered')
    || message.includes('email address is already registered')
  ) {
    return 'Já existe uma conta com este email. Tente entrar ou recuperar sua senha.';
  }

  if (code === 'signup_disabled') {
    return 'A criação de novas contas está temporariamente indisponível.';
  }

  if (code === 'weak_password' || message.includes('password should be')) {
    return 'A senha é muito fraca. Use pelo menos 6 caracteres e evite senhas fáceis de adivinhar.';
  }

  if (
    ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(code)
    || message.includes('rate limit')
    || message.includes('too many requests')
  ) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  if (['otp_expired', 'otp_disabled'].includes(code) || message.includes('token has expired')) {
    return 'Este código expirou ou não é mais válido. Solicite um novo código.';
  }

  if (code === 'same_password') {
    return 'A nova senha precisa ser diferente da senha atual.';
  }

  if (
    ['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt'].includes(code)
    || message.includes('invalid refresh token')
    || message.includes('jwt expired')
  ) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }

  return null;
}

function databaseMessage(code: string, status: unknown, message: string): string | null {
  if (code === '23503') {
    return 'Este item está sendo usado em outro cadastro e não pode ser alterado ou excluído agora.';
  }

  if (code === '23505') {
    return 'Já existe um cadastro com essas informações.';
  }

  if (code === '42501' || Number(status) === 401 || Number(status) === 403) {
    return 'Você não tem permissão para realizar esta ação. Entre novamente e tente de novo.';
  }

  if (code === 'pgrst116' || Number(status) === 404) {
    return 'Não encontramos o item solicitado. Atualize a tela e tente novamente.';
  }

  if (message.includes('row-level security')) {
    return 'Não foi possível acessar esses dados com a conta atual. Entre novamente e tente de novo.';
  }

  return null;
}

export function getUserFriendlyError(error: unknown, fallback: string): string {
  if (isOffline()) return NETWORK_MESSAGE;

  const errorLike = asErrorLike(error);
  const code = normalize(errorLike.code);
  const message = normalize(errorLike.message);
  const name = normalize(errorLike.name);

  if (['duplicatenameerror', 'userfacingerror'].includes(name) && typeof errorLike.message === 'string') {
    return errorLike.message;
  }

  if (message === 'as senhas nao conferem.' || message === 'as senhas não conferem.') {
    return 'As senhas não conferem.';
  }

  if (isNetworkError(message, name)) return NETWORK_MESSAGE;
  if (isServiceUnavailable(errorLike.status, code, message)) return SERVICE_MESSAGE;

  return authMessage(code, message)
    ?? databaseMessage(code, errorLike.status, message)
    ?? fallback;
}
