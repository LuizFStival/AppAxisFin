import { lazy } from 'react';

export const DashboardView = lazy(() => import('../dashboard/DashboardView').then((module) => ({ default: module.DashboardView })));
export const AccountsView = lazy(() => import('../accounts/AccountsView').then((module) => ({ default: module.AccountsView })));
export const CardsView = lazy(() => import('../cards/CardsView').then((module) => ({ default: module.CardsView })));
export const TransactionsView = lazy(() => import('../transactions/TransactionsView').then((module) => ({ default: module.TransactionsView })));
export const ReimbursementsView = lazy(() => import('../reimbursements/ReimbursementsView').then((module) => ({ default: module.ReimbursementsView })));
export const ReportsView = lazy(() => import('../reports/ReportsView').then((module) => ({ default: module.ReportsView })));
export const NotificationsView = lazy(() => import('../notifications/NotificationsView').then((module) => ({ default: module.NotificationsView })));
export const GoalsView = lazy(() => import('../goals/GoalsView').then((module) => ({ default: module.GoalsView })));
export const ProfileView = lazy(() => import('../profile/ProfileView').then((module) => ({ default: module.ProfileView })));
export const AddEntryModal = lazy(() => import('../transactions/AddEntryModal').then((module) => ({ default: module.AddEntryModal })));
export const AddAccountModal = lazy(() => import('../accounts/AddAccountModal').then((module) => ({ default: module.AddAccountModal })));
export const AddCardModal = lazy(() => import('../cards/AddCardModal').then((module) => ({ default: module.AddCardModal })));
export const AddCategoryModal = lazy(() => import('../categories/AddCategoryModal').then((module) => ({ default: module.AddCategoryModal })));

export function ViewLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 text-sm font-semibold text-slate-500">
      Carregando tela...
    </div>
  );
}

export function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 text-sm font-semibold text-slate-300 backdrop-blur-sm" role="status">
      Carregando formulário...
    </div>
  );
}
