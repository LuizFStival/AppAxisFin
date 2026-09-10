import { Category, ReserveBox, UserProfile } from '../types';

export const mockUser: UserProfile = {
  id: 'usr-local-placeholder',
  name: 'Usuário',
  email: '',
  plan: 'AxisFin',
  reimbursementsEnabled: true,
  savingsGoalMode: 'salary_percentage',
  savingsGoalAmount: 0,
  savingsGoalPercentage: 20,
  includePendingSalary: true,
  reportWidgets: ['income', 'expenses', 'savings_rate', 'average_expenses'],
};

export const mockCategories: Category[] = [
  { id: 'cat-salary', name: 'Salário', flow: 'income', color: '#10B981', icon: 'Briefcase' },
  { id: 'cat-freela', name: 'Freelance', flow: 'income', color: '#3882F6', icon: 'Laptop' },
  { id: 'cat-food', name: 'Alimentação', flow: 'expense', color: '#F43F5E', icon: 'Utensils' },
  { id: 'cat-home', name: 'Moradia', flow: 'expense', color: '#8B5CF6', icon: 'Home' },
  { id: 'cat-transport', name: 'Transporte', flow: 'expense', color: '#EC4899', icon: 'Car' },
  { id: 'cat-leisure', name: 'Lazer', flow: 'expense', color: '#8B5CF6', icon: 'Compass' },
  { id: 'cat-services', name: 'Serviços', flow: 'expense', color: '#F59E0B', icon: 'Settings' },
  { id: 'cat-reimbursements', name: 'Reembolsos', flow: 'expense', color: '#F59E0B', icon: 'HandCoins' },
];

export const mockReserveBoxes: Array<Omit<ReserveBox, 'id' | 'createdOn' | 'lastBalanceUpdate' | 'isActive'>> = [
  { name: 'Turbo Ultravioleta', institution: 'Nubank', cdiPercent: 120, initialBalance: 10093.39, currentBalance: 10093.39, goal: 'Reserva de alto rendimento', color: '#8A05BE', icon: 'Zap' },
  { name: 'FGTS', institution: 'Nubank', cdiPercent: 100, initialBalance: 2623.15, currentBalance: 2623.15, goal: 'Reserva trabalhista', color: '#8B5CF6', icon: 'Shield' },
  { name: 'Viagem', institution: 'Nubank', cdiPercent: 100, initialBalance: 2038.48, currentBalance: 2038.48, goal: 'Viagem Europa', color: '#38BDF8', icon: 'Plane' },
  { name: 'Moradia', institution: 'Nubank', cdiPercent: 100, initialBalance: 507.36, currentBalance: 507.36, goal: 'Moradia', color: '#10B981', icon: 'Home' },
  { name: 'Dólar', institution: 'Nubank', cdiPercent: 100, initialBalance: 114.96, currentBalance: 114.96, goal: 'Proteção cambial', color: '#22C55E', icon: 'DollarSign' },
  { name: 'Renda Passiva', institution: 'Nubank', cdiPercent: 100, initialBalance: 35.31, currentBalance: 35.31, goal: 'Renda passiva', color: '#F59E0B', icon: 'TrendingUp' },
  { name: 'Cofrinhos', institution: 'Mercado Pago', cdiPercent: 115, initialBalance: 5027.70, currentBalance: 5027.70, goal: 'Cofrinhos Mercado Pago', color: '#009EE3', icon: 'PiggyBank' },
];
