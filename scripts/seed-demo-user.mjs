import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envFiles = ['.env.local', '.env'];

for (const envFile of envFiles) {
  if (!existsSync(envFile)) continue;
  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
const demoEmail = process.env.DEMO_EMAIL ?? 'demo@gmail.com';
const demoPassword = process.env.DEMO_PASSWORD ?? 'demo123';
const demoName = process.env.DEMO_NAME ?? 'Cliente Demo';

if (!supabaseUrl || !anonKey) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local ou no ambiente.');
}

function createSupabaseClient(key) {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateFromParts(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function monthDate(day, offset = 0) {
  const base = new Date(`${todayDate()}T00:00:00.000Z`);
  return dateFromParts(base.getUTCFullYear(), base.getUTCMonth() + offset, day);
}

function monthKey(offset = 0) {
  return monthDate(1, offset).slice(0, 7);
}

function meta(input) {
  const encoded = Buffer.from(JSON.stringify(input), 'utf8').toString('base64');
  return `[axisfin-meta:${encoded}]`;
}

async function findUserIdByEmail(adminClient, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 100) return null;
  }

  return null;
}

async function resolveDemoUser() {
  if (serviceRoleKey) {
    const adminClient = createSupabaseClient(serviceRoleKey);
    let userId = await findUserIdByEmail(adminClient, demoEmail);

    if (!userId) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: demoName },
      });
      if (error) throw error;
      userId = data.user.id;
    } else {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: demoName },
      });
      if (error) throw error;
    }

    return { client: adminClient, userId, mode: 'service_role' };
  }

  const client = createSupabaseClient(anonKey);
  const signUpResult = await client.auth.signUp({
    email: demoEmail,
    password: demoPassword,
    options: { data: { full_name: demoName } },
  });

  if (signUpResult.error && !/already|registered|exists/i.test(signUpResult.error.message)) {
    throw signUpResult.error;
  }

  let session = signUpResult.data.session;
  if (!session) {
    const { data, error } = await client.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });
    if (error) {
      throw new Error(
        `Nao foi possivel entrar no usuario demo. Se o Supabase exigir confirmacao de email, use SUPABASE_SERVICE_ROLE_KEY neste script ou confirme ${demoEmail}. Detalhe: ${error.message}`,
      );
    }
    session = data.session;
  }

  return { client, userId: session.user.id, mode: 'authenticated' };
}

async function deleteFrom(client, table, userId) {
  const { error } = await client.from(table).delete().eq('user_id', userId);
  if (error) throw error;
}

async function resetDemoData(client, userId) {
  const tables = [
    'notifications',
    'budgets',
    'installments',
    'invoices',
    'transactions',
    'recurring_transactions',
    'goals',
    'cards',
    'accounts',
    'reimbursement_people',
    'categories',
  ];

  for (const table of tables) {
    await deleteFrom(client, table, userId);
  }
}

async function insertRows(client, table, rows, select = '*') {
  const { data, error } = await client.from(table).insert(rows).select(select);
  if (error) throw error;
  return data ?? [];
}

function byName(rows) {
  return Object.fromEntries(rows.map((row) => [row.name, row]));
}

async function seedDemoData(client, userId) {
  await client.from('profiles').upsert({
    id: userId,
    full_name: demoName,
    currency: 'BRL',
    reimbursements_enabled: true,
  });

  const categories = await insertRows(client, 'categories', [
    { user_id: userId, name: 'Salario', flow: 'income', icon: 'Briefcase', color: '#10B981', is_system: true },
    { user_id: userId, name: 'Freelance', flow: 'income', icon: 'Laptop', color: '#3882F6', is_system: true },
    { user_id: userId, name: 'Mercado', flow: 'expense', icon: 'ShoppingCart', color: '#F43F5E', is_system: true },
    { user_id: userId, name: 'Moradia', flow: 'expense', icon: 'Home', color: '#8B5CF6', is_system: true },
    { user_id: userId, name: 'Transporte', flow: 'expense', icon: 'Car', color: '#EC4899', is_system: true },
    { user_id: userId, name: 'Assinaturas', flow: 'expense', icon: 'ReceiptText', color: '#F59E0B', is_system: true },
    { user_id: userId, name: 'Lazer', flow: 'expense', icon: 'Compass', color: '#22C55E', is_system: true },
    { user_id: userId, name: 'Saude', flow: 'expense', icon: 'HeartPulse', color: '#06B6D4', is_system: true },
    { user_id: userId, name: 'Reembolsos', flow: 'expense', icon: 'HandCoins', color: '#F59E0B', is_system: true },
  ]);
  const category = byName(categories);

  const accounts = await insertRows(client, 'accounts', [
    { user_id: userId, name: 'Conta Principal', type: 'checking', institution: 'Banco Demo', balance: 4200, color: '#3B82F6' },
    { user_id: userId, name: 'Reserva', type: 'savings', institution: 'Banco Demo', balance: 12500, color: '#10B981' },
    { user_id: userId, name: 'Carteira', type: 'cash', institution: 'Dinheiro', balance: 320, color: '#F59E0B' },
  ]);
  const account = byName(accounts);

  const cards = await insertRows(client, 'cards', [
    {
      user_id: userId,
      name: 'Visa Demo',
      account_id: account['Conta Principal'].id,
      network: 'visa',
      credit_limit: 8000,
      closing_day: 25,
      due_day: 5,
      color: '#2563EB',
    },
    {
      user_id: userId,
      name: 'Black Demo',
      account_id: account['Conta Principal'].id,
      network: 'mastercard',
      credit_limit: 12000,
      closing_day: 18,
      due_day: 28,
      color: '#111827',
    },
  ]);
  const card = byName(cards);

  const people = await insertRows(client, 'reimbursement_people', [
    { user_id: userId, name: 'Ana Demo', phone: '(11) 99999-0101', notes: 'Colega usada para demonstrar reembolsos.' },
    { user_id: userId, name: 'Bruno Demo', phone: '(11) 98888-0202', notes: 'Cliente ficticio para despesas reembolsaveis.' },
  ]);
  const person = byName(people);

  const transactions = [
    {
      user_id: userId,
      description: 'Salario mensal',
      amount: 8500,
      flow: 'income',
      status: 'paid',
      transaction_date: monthDate(5),
      category_id: category.Salario.id,
      account_id: account['Conta Principal'].id,
      notes: 'Receita principal ficticia para demonstracao.',
    },
    {
      user_id: userId,
      description: 'Projeto freelance',
      amount: 1800,
      flow: 'income',
      status: 'pending',
      transaction_date: addDays(todayDate(), 6),
      category_id: category.Freelance.id,
      account_id: account['Conta Principal'].id,
      notes: 'Receita prevista para mostrar valores pendentes.',
    },
    {
      user_id: userId,
      description: 'Mercado da semana',
      amount: 426.8,
      flow: 'expense',
      status: 'paid',
      transaction_date: monthDate(8),
      category_id: category.Mercado.id,
      account_id: account['Conta Principal'].id,
      notes: meta({ expenseNeed: 'essential', entryMode: 'variable' }),
    },
    {
      user_id: userId,
      description: 'Uber reuniao externa',
      amount: 74.5,
      flow: 'expense',
      status: 'paid',
      transaction_date: monthDate(12),
      category_id: category.Transporte.id,
      card_id: card['Visa Demo'].id,
      is_reimbursable: true,
      reimbursement_person_id: person['Ana Demo'].id,
      reimbursement_status: 'received',
      reimbursement_received_at: monthDate(15),
      reimbursement_received_account_id: account['Conta Principal'].id,
      notes: 'Despesa reembolsavel ja recebida.',
    },
    {
      user_id: userId,
      description: 'Jantar com cliente',
      amount: 286.4,
      flow: 'expense',
      status: 'paid',
      transaction_date: monthDate(18),
      category_id: category.Reembolsos.id,
      card_id: card['Black Demo'].id,
      is_reimbursable: true,
      reimbursement_person_id: person['Bruno Demo'].id,
      reimbursement_status: 'pending',
      notes: 'Despesa aparece na fatura, mas fica separada como reembolso pendente.',
    },
    {
      user_id: userId,
      description: 'Cinema e pizza',
      amount: 168.9,
      flow: 'expense',
      status: 'paid',
      transaction_date: monthDate(20),
      category_id: category.Lazer.id,
      card_id: card['Visa Demo'].id,
      notes: meta({ expenseNeed: 'superfluous', entryMode: 'variable' }),
    },
    {
      user_id: userId,
      description: 'Consulta medica',
      amount: 320,
      flow: 'expense',
      status: 'pending',
      transaction_date: addDays(todayDate(), 3),
      category_id: category.Saude.id,
      account_id: account['Conta Principal'].id,
      notes: 'Pendente para demonstrar alerta operacional.',
    },
    {
      user_id: userId,
      description: 'Transferencia para reserva',
      amount: 900,
      flow: 'transfer',
      status: 'paid',
      transaction_date: monthDate(10),
      from_account_id: account['Conta Principal'].id,
      to_account_id: account.Reserva.id,
      notes: 'Movimento entre contas ficticias.',
    },
    {
      user_id: userId,
      description: 'Compra parcelada - notebook',
      amount: 620,
      flow: 'expense',
      status: 'paid',
      transaction_date: monthDate(22, -1),
      category_id: category.Assinaturas.id,
      card_id: card['Black Demo'].id,
      notes: meta({ entryMode: 'installment', installmentNumber: 2, totalInstallments: 6, seriesId: 'demo-notebook' }),
    },
    {
      user_id: userId,
      description: 'Compra parcelada - notebook',
      amount: 620,
      flow: 'expense',
      status: 'pending',
      transaction_date: monthDate(22),
      category_id: category.Assinaturas.id,
      card_id: card['Black Demo'].id,
      notes: meta({ entryMode: 'installment', installmentNumber: 3, totalInstallments: 6, seriesId: 'demo-notebook' }),
    },
  ];

  await insertRows(client, 'transactions', transactions.map((transaction) => ({
    is_reimbursable: false,
    ...transaction,
  })));

  await insertRows(client, 'recurring_transactions', [
    {
      user_id: userId,
      description: 'Aluguel',
      amount: 2450,
      flow: 'expense',
      status: 'pending',
      start_date: monthDate(7, -2),
      interval_months: 1,
      category_id: category.Moradia.id,
      account_id: account['Conta Principal'].id,
      notes: meta({ entryMode: 'fixed' }),
      is_active: true,
    },
    {
      user_id: userId,
      description: 'Streaming e apps',
      amount: 89.9,
      flow: 'expense',
      status: 'pending',
      start_date: monthDate(14, -3),
      interval_months: 1,
      category_id: category.Assinaturas.id,
      card_id: card['Visa Demo'].id,
      notes: meta({ entryMode: 'fixed', expenseNeed: 'superfluous' }),
      is_active: true,
    },
  ].map((transaction) => ({
    is_reimbursable: false,
    ...transaction,
  })));

  await insertRows(client, 'goals', [
    {
      user_id: userId,
      name: 'Viagem de ferias',
      target_amount: 9000,
      current_amount: 2800,
      target_date: monthDate(20, 5),
      color: '#06B6D4',
      status: 'active',
    },
    {
      user_id: userId,
      name: 'Reserva de emergencia',
      target_amount: 30000,
      current_amount: 12500,
      target_date: monthDate(1, 10),
      color: '#10B981',
      status: 'active',
    },
  ]);

  await insertRows(client, 'budgets', [
    { user_id: userId, category_id: category.Mercado.id, period: monthKey(), limit_amount: 1600, alert_percent: 70 },
    { user_id: userId, category_id: category.Transporte.id, period: monthKey(), limit_amount: 700, alert_percent: 70 },
    { user_id: userId, category_id: category.Lazer.id, period: monthKey(), limit_amount: 900, alert_percent: 70 },
    { user_id: userId, category_id: category.Assinaturas.id, period: monthKey(), limit_amount: 500, alert_percent: 70 },
  ]);

  await insertRows(client, 'notifications', [
    {
      user_id: userId,
      title: 'Reembolso pendente',
      body: 'Bruno Demo ainda deve R$ 286,40 do jantar com cliente.',
      type: 'warning',
      source_key: 'demo-reimbursement-pending',
      action_view: 'reimbursements',
    },
    {
      user_id: userId,
      title: 'Fatura chegando',
      body: 'A fatura Visa Demo vence nos proximos dias.',
      type: 'info',
      scheduled_for: `${addDays(todayDate(), 2)}T09:00:00.000Z`,
      source_key: 'demo-invoice-due',
      action_view: 'cards',
    },
  ]);
}

const { client, userId, mode } = await resolveDemoUser();
await resetDemoData(client, userId);
await seedDemoData(client, userId);

console.log('Usuario demo pronto.');
console.log(`Email: ${demoEmail}`);
console.log(`Senha: ${demoPassword}`);
console.log(`Nome: ${demoName}`);
console.log(`User ID: ${userId}`);
console.log(`Modo: ${mode}`);
