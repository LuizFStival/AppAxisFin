import { Category, UserProfile } from '../types';

export const mockUser: UserProfile = {
  id: 'usr-local-placeholder',
  name: 'Usuario',
  email: '',
  plan: 'AxisFin',
};

export const mockCategories: Category[] = [
  { id: 'cat-salary', name: 'Salario', flow: 'income', color: '#10B981', icon: 'Briefcase' },
  { id: 'cat-freela', name: 'Freelance', flow: 'income', color: '#3882F6', icon: 'Laptop' },
  { id: 'cat-food', name: 'Alimentacao', flow: 'expense', color: '#F43F5E', icon: 'Utensils' },
  { id: 'cat-home', name: 'Moradia', flow: 'expense', color: '#8B5CF6', icon: 'Home' },
  { id: 'cat-transport', name: 'Transporte', flow: 'expense', color: '#EC4899', icon: 'Car' },
  { id: 'cat-leisure', name: 'Lazer', flow: 'expense', color: '#8B5CF6', icon: 'Compass' },
  { id: 'cat-services', name: 'Servicos', flow: 'expense', color: '#F59E0B', icon: 'Settings' },
];
