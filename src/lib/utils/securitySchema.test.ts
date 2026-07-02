import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync('supabase/schema.sql', 'utf8').toLowerCase();
const userTables = [
  'profiles',
  'accounts',
  'cards',
  'categories',
  'reimbursement_people',
  'transactions',
  'recurring_transactions',
  'invoices',
  'installments',
  'goals',
  'goal_movements',
  'budgets',
  'notifications',
];

for (const table of userTables) {
  assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security;`), `${table} precisa ter RLS`);
}

assert.match(schema, /revoke all privileges on table public\.%i from anon/);
assert.match(schema, /revoke all privileges on table public\.%i from authenticated/);
assert.match(schema, /grant select, insert on table public\.goal_movements to authenticated/);
assert.match(schema, /grant select, update on table public\.profiles to authenticated/);
assert.match(schema, /revoke execute on function public\.create_profile_for_new_user\(\) from public, anon, authenticated/);
assert.doesNotMatch(schema, /create policy[\s\S]{0,200}auth\.role\(\)/);
assert.match(schema, /create or replace function public\.reset_my_finance_data\(\)[\s\S]*?security invoker[\s\S]*?current_user_id uuid := \(select auth\.uid\(\)\)/);
assert.match(schema, /revoke execute on function public\.reset_my_finance_data\(\) from public, anon/);
assert.match(schema, /grant execute on function public\.reset_my_finance_data\(\) to authenticated/);

const updatePolicies = [...schema.matchAll(/create policy\s+\w+_update_own on public\.\w+[\s\S]*?;/g)];
assert.ok(updatePolicies.length >= 10, 'As tabelas editáveis precisam de policies de update');
for (const [policy] of updatePolicies) {
  assert.match(policy, /using\s*\(\(select auth\.uid\(\)\)\s*=\s*(?:id|user_id)\)/);
  assert.match(policy, /with check\s*\(\(select auth\.uid\(\)\)\s*=\s*(?:id|user_id)\)/);
}

console.log('schema security tests passed');
