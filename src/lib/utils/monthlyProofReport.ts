import { Account, Card, Category, ReimbursementPerson, ReserveBox, Transaction } from '../../types';
import { getCardInvoiceInfoForClosingMonth } from './cardInvoices';
import { formatDatePtBr } from './date';
import { summarizeExpenseBreakdown } from './expenseBreakdown';
import {
  expensesByCategory,
  formatMonthLabel,
  getCardInvoiceTransactions,
  getExpenseSignedAmount,
  getFinancialMonthKey,
  getPaymentSource,
  getPersonalExpenseSignedAmount,
  getTransactionCompetenceMonth,
  getTransactionReimbursementAmount,
  getTransactionReimbursementBaseAmount,
  getTransactionReimbursementReceivedAmount,
  isCardInvoicePaid,
  isInvoiceCredit,
  isInvoicePayment,
  isThirdPartyExpense,
  roundMoney,
  summarizeMonthlyResult,
} from './finance';
import { getReimbursementMonthKey } from './reimbursements';
import { readTransactionMeta } from './transactionMeta';

type CsvValue = string | number;
export type MonthlyProofReportRow = CsvValue[];

const HEADER = [
  'Bloco',
  'Grupo',
  'Data',
  'Competencia',
  'Origem',
  'Categoria',
  'Pessoa',
  'Descricao',
  'Status',
  'Valor',
  'Meu valor',
  'Terceiros',
  'Observacao',
];

function money(value: number) {
  return roundMoney(value).toFixed(2).replace('.', ',');
}

function percent(value: number) {
  return value.toFixed(2).replace('.', ',');
}

function categoryName(categories: Category[], categoryId?: string) {
  return categoryId ? categories.find((category) => category.id === categoryId)?.name ?? 'Categoria removida' : '';
}

function personName(people: ReimbursementPerson[], personId?: string) {
  return personId ? people.find((person) => person.id === personId)?.name ?? 'Pessoa removida' : '';
}

function entryModeLabel(transaction: Transaction) {
  const meta = readTransactionMeta(transaction.notes);
  const mode = meta.entryMode ?? 'variable';
  if (mode === 'fixed') return 'Fixa';
  if (mode === 'installment') {
    return meta.installmentNumber && meta.totalInstallments
      ? `Parcelada ${meta.installmentNumber}/${meta.totalInstallments}`
      : 'Parcelada';
  }
  return 'Variavel';
}

function csvRow(
  block: string,
  group: string,
  data: Partial<Record<(typeof HEADER)[number], CsvValue>>,
): MonthlyProofReportRow {
  return HEADER.map((key) => data[key] ?? (key === 'Bloco' ? block : key === 'Grupo' ? group : ''));
}

export function buildMonthlyProofReportRows(input: {
  month: string;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  reserveBoxes: ReserveBox[];
  reimbursementPeople: ReimbursementPerson[];
  reimbursementsEnabled: boolean;
  visualScopeLabel?: string;
}): MonthlyProofReportRow[] {
  const {
    month,
    transactions,
    categories,
    accounts,
    cards,
    reserveBoxes,
    reimbursementPeople,
    reimbursementsEnabled,
    visualScopeLabel = 'Todos os valores do mes',
  } = input;
  const rows: MonthlyProofReportRow[] = [HEADER];
  const monthLabel = formatMonthLabel(month);
  const monthlyResult = summarizeMonthlyResult(transactions, month, cards, { includeReimbursements: reimbursementsEnabled });
  const monthTransactions = transactions.filter((transaction) => getTransactionCompetenceMonth(transaction, cards) === month);
  const personalExpenseTransactions = monthTransactions.filter((transaction) =>
    transaction.flow === 'expense'
    && !isInvoicePayment(transaction)
  );
  const cashTransactions = transactions.filter((transaction) => getFinancialMonthKey(transaction) === month);
  const accountExpenses = cashTransactions.filter((transaction) =>
    transaction.flow === 'expense'
    && Boolean(transaction.accountId)
    && !isInvoicePayment(transaction)
  );
  const invoicePayments = transactions.filter((transaction) =>
    isInvoicePayment(transaction)
    && readTransactionMeta(transaction.notes).invoicePaymentPeriod === month
  );
  const incomeTransactions = cashTransactions.filter((transaction) => transaction.flow === 'income');
  const reimbursementTransactions = transactions
    .filter(isThirdPartyExpense)
    .filter((transaction) => reimbursementsEnabled && getReimbursementMonthKey(transaction, cards) === month);
  const cardInvoiceRows = cards
    .map((card) => {
      const invoiceInfo = getCardInvoiceInfoForClosingMonth(card, month);
      const invoiceTransactions = getCardInvoiceTransactions(card, transactions, month)
        .filter((transaction) => !isInvoicePayment(transaction));
      const total = roundMoney(invoiceTransactions.reduce((sum, transaction) => sum + getExpenseSignedAmount(transaction), 0));
      const personal = roundMoney(invoiceTransactions.reduce((sum, transaction) => sum + getPersonalExpenseSignedAmount(transaction), 0));
      const thirdParty = roundMoney(invoiceTransactions.reduce((sum, transaction) => sum + getTransactionReimbursementAmount(transaction), 0));
      const credits = roundMoney(invoiceTransactions.filter(isInvoiceCredit).reduce((sum, transaction) => sum + transaction.amount, 0));
      return { card, invoiceInfo, invoiceTransactions, total, personal, thirdParty, credits };
    })
    .filter((item) => item.invoiceTransactions.length > 0 || invoicePayments.some((payment) => readTransactionMeta(payment.notes).invoicePaymentCardId === item.card.id));
  const expenseBreakdown = summarizeExpenseBreakdown(personalExpenseTransactions, getPersonalExpenseSignedAmount);
  const categoryRows = expensesByCategory(transactions, categories, month, cards);
  const currentAccountsBalance = roundMoney(accounts.filter((account) => account.isActive).reduce((sum, account) => sum + account.balance, 0));
  const currentReserveBalance = roundMoney(reserveBoxes.filter((box) => box.isActive).reduce((sum, box) => sum + box.currentBalance, 0));
  const savingsRate = monthlyResult.totalInflows > 0
    ? Math.max(0, monthlyResult.result / monthlyResult.totalInflows * 100)
    : 0;

  rows.push(csvRow('Resumo do mes', 'Identificacao', {
    Competencia: month,
    Descricao: monthLabel,
    Observacao: visualScopeLabel,
  }));
  rows.push(csvRow('Resumo do mes', 'Metricas principais', {
    Descricao: 'Entradas totais',
    Valor: money(monthlyResult.totalInflows),
    Observacao: 'Receitas + reembolsos esperados quando habilitados.',
  }));
  rows.push(csvRow('Resumo do mes', 'Metricas principais', {
    Descricao: 'Saidas totais',
    Valor: money(-monthlyResult.totalOutflows),
    'Meu valor': money(-monthlyResult.personalExpenses),
    Terceiros: money(-monthlyResult.thirdPartyExpenses),
    Observacao: 'Nao inclui pagamento de fatura para evitar dupla contagem com compras do cartao.',
  }));
  rows.push(csvRow('Resumo do mes', 'Metricas principais', {
    Descricao: 'Resultado',
    Valor: money(monthlyResult.result),
    Observacao: monthlyResult.result >= 0 ? 'Sobra do mes.' : 'Deficit do mes.',
  }));
  rows.push(csvRow('Resumo do mes', 'Metricas principais', {
    Descricao: 'Taxa de economia',
    Valor: percent(savingsRate),
    Observacao: 'Percentual do resultado sobre entradas totais.',
  }));
  rows.push(csvRow('Resumo do mes', 'Reembolsos', {
    Descricao: 'Reembolsos esperados',
    Valor: money(monthlyResult.reimbursementsExpected),
    Observacao: reimbursementsEnabled ? 'Valores de terceiros vinculados ao mes.' : 'Fluxo de reembolso desabilitado.',
  }));

  categoryRows.forEach((item) => {
    rows.push(csvRow('Despesas por categoria', 'Categoria', {
      Categoria: item.name,
      Valor: money(-item.value),
      'Meu valor': money(-item.value),
    }));
  });

  expenseBreakdown.forEach((item) => {
    rows.push(csvRow('Despesas por tipo', item.label, {
      Descricao: `${item.count} lancamento${item.count === 1 ? '' : 's'}`,
      Valor: money(-item.total),
      'Meu valor': money(-item.total),
    }));
  });

  cardInvoiceRows.forEach(({ card, invoiceInfo, invoiceTransactions, total, personal, thirdParty, credits }) => {
    rows.push(csvRow('Faturas do mes', card.name, {
      Data: invoiceInfo.dueDate,
      Competencia: invoiceInfo.period,
      Origem: card.name,
      Descricao: invoiceInfo.label,
      Status: isCardInvoicePaid(invoiceTransactions) ? 'Paga' : invoiceInfo.status,
      Valor: money(-total),
      'Meu valor': money(-personal),
      Terceiros: money(-thirdParty),
      Observacao: `${invoiceTransactions.length} lancamento${invoiceTransactions.length === 1 ? '' : 's'}; creditos ${money(credits)}; vencimento ${formatDatePtBr(invoiceInfo.dueDate)}.`,
    }));

    invoiceTransactions
      .slice()
      .sort((left, right) => left.date.localeCompare(right.date) || left.description.localeCompare(right.description, 'pt-BR'))
      .forEach((transaction) => {
        rows.push(csvRow('Itens de fatura', card.name, {
          Data: transaction.date,
          Competencia: getTransactionCompetenceMonth(transaction, cards),
          Origem: card.name,
          Categoria: categoryName(categories, transaction.categoryId),
          Pessoa: personName(reimbursementPeople, transaction.reimbursementPersonId),
          Descricao: transaction.description,
          Status: readTransactionMeta(transaction.notes).paidAt ? 'Fatura paga' : transaction.status,
          Valor: money(-getExpenseSignedAmount(transaction)),
          'Meu valor': money(-getPersonalExpenseSignedAmount(transaction)),
          Terceiros: money(-getTransactionReimbursementAmount(transaction)),
          Observacao: `${entryModeLabel(transaction)}${isInvoiceCredit(transaction) ? '; credito/estorno' : ''}`,
        }));
      });
  });

  incomeTransactions
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((transaction) => {
      rows.push(csvRow('Entradas', 'Receita', {
        Data: transaction.date,
        Competencia: getFinancialMonthKey(transaction),
        Origem: getPaymentSource(accounts, cards, transaction),
        Categoria: categoryName(categories, transaction.categoryId),
        Descricao: transaction.description,
        Status: transaction.status,
        Valor: money(transaction.amount),
        Observacao: 'Entrada financeira do mes.',
      }));
    });

  accountExpenses
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((transaction) => {
      rows.push(csvRow('Debitos da conta', transaction.status === 'paid' ? 'Pago' : 'Pendente', {
        Data: transaction.date,
        Competencia: getFinancialMonthKey(transaction),
        Origem: getPaymentSource(accounts, cards, transaction),
        Categoria: categoryName(categories, transaction.categoryId),
        Pessoa: personName(reimbursementPeople, transaction.reimbursementPersonId),
        Descricao: transaction.description,
        Status: transaction.status,
        Valor: money(-transaction.amount),
        'Meu valor': money(-getPersonalExpenseSignedAmount(transaction)),
        Terceiros: money(-getTransactionReimbursementAmount(transaction)),
        Observacao: entryModeLabel(transaction),
      }));
    });

  invoicePayments
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((transaction) => {
      const meta = readTransactionMeta(transaction.notes);
      const card = cards.find((candidate) => candidate.id === meta.invoicePaymentCardId);
      rows.push(csvRow('Pagamentos de fatura', card?.name ?? 'Cartao removido', {
        Data: transaction.date,
        Competencia: meta.invoicePaymentPeriod ?? getFinancialMonthKey(transaction),
        Origem: getPaymentSource(accounts, cards, transaction),
        Descricao: transaction.description,
        Status: transaction.status,
        Valor: money(-transaction.amount),
        Observacao: 'Baixa de caixa. Nao conta como novo gasto de competencia.',
      }));
    });

  reimbursementTransactions
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((transaction) => {
      const received = getTransactionReimbursementReceivedAmount(transaction);
      const pending = Math.max(0, getTransactionReimbursementBaseAmount(transaction) - received);
      rows.push(csvRow('Reembolsos', transaction.reimbursementStatus === 'received' ? 'Recebido' : 'Pendente', {
        Data: transaction.reimbursementReceivedAt ?? transaction.date,
        Competencia: getReimbursementMonthKey(transaction, cards),
        Origem: getPaymentSource(accounts, cards, transaction),
        Categoria: categoryName(categories, transaction.categoryId),
        Pessoa: personName(reimbursementPeople, transaction.reimbursementPersonId),
        Descricao: transaction.description,
        Status: transaction.reimbursementStatus ?? 'pending',
        Valor: money(getTransactionReimbursementBaseAmount(transaction)),
        Terceiros: money(getTransactionReimbursementAmount(transaction)),
        Observacao: `Recebido ${money(received)}; pendente ${money(pending)}.`,
      }));
    });

  accounts
    .filter((account) => account.isActive)
    .forEach((account) => {
      rows.push(csvRow('Patrimonio atual', 'Conta', {
        Origem: account.name,
        Descricao: account.institution,
        Valor: money(account.balance),
        Observacao: `Saldo atual no app; conferido em ${formatDatePtBr(account.lastBalanceUpdate)}.`,
      }));
    });

  reserveBoxes
    .filter((box) => box.isActive)
    .forEach((box) => {
      rows.push(csvRow('Patrimonio atual', 'Caixinha', {
        Origem: box.name,
        Descricao: box.institution,
        Valor: money(box.currentBalance),
        Observacao: `CDI ${box.cdiPercent}%; atualizado em ${formatDatePtBr(box.lastBalanceUpdate)}.`,
      }));
    });

  rows.push(csvRow('Patrimonio atual', 'Total', {
    Descricao: 'Contas + caixinhas',
    Valor: money(roundMoney(currentAccountsBalance + currentReserveBalance)),
    Observacao: `Valores atuais do app no momento do download. Contas ${money(currentAccountsBalance)}; caixinhas ${money(currentReserveBalance)}.`,
  }));

  return rows;
}

export function buildMonthlyProofReportCsv(input: Parameters<typeof buildMonthlyProofReportRows>[0]) {
  const rows = buildMonthlyProofReportRows(input);
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n')}`;
}

export function escapeCsvCell(value: CsvValue) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
