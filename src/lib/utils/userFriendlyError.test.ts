import assert from 'node:assert/strict';
import { getUserFriendlyError } from './userFriendlyError';

assert.equal(
  getUserFriendlyError(new TypeError('Failed to fetch'), 'Falha genérica.'),
  'Sem conexão com a internet. Verifique sua rede e tente novamente.',
);

assert.equal(
  getUserFriendlyError({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'Falha genérica.'),
  'Email ou senha incorretos. Confira os dados e tente novamente.',
);

assert.equal(
  getUserFriendlyError({ code: 'email_not_confirmed' }, 'Falha genérica.'),
  'Seu email ainda não foi confirmado. Abra a mensagem de confirmação enviada para você.',
);

assert.equal(
  getUserFriendlyError({ code: 'PGRST001', status: 503 }, 'Falha genérica.'),
  'Não foi possível conectar ao serviço agora. Aguarde um momento e tente novamente.',
);

assert.equal(
  getUserFriendlyError({ code: '42501' }, 'Falha genérica.'),
  'Você não tem permissão para realizar esta ação. Entre novamente e tente de novo.',
);

assert.equal(
  getUserFriendlyError(new Error('Technical detail that must not leak'), 'Mensagem segura.'),
  'Mensagem segura.',
);

console.log('userFriendlyError tests passed');
