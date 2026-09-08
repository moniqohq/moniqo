import {
  ArrowLeftRight,
  Briefcase,
  CreditCard,
  Home,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import type { AccountType } from '@/types/domain';

export interface IconSpec {
  Icon: LucideIcon;
  background: string;
}

const DEFAULT_CATEGORY_ICON: IconSpec = { Icon: Receipt, background: '#3f3f6e' };

export const ACCOUNT_TYPE_ICONS: Record<AccountType, IconSpec> = {
  CHECKING: { Icon: Landmark, background: '#2f5fdb' },
  SAVINGS: { Icon: PiggyBank, background: '#16a34a' },
  CREDIT_CARD: { Icon: CreditCard, background: '#9333ea' },
  CASH: { Icon: Wallet, background: '#d97706' },
  LOAN: { Icon: Landmark, background: '#64748b' },
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit Card',
  CASH: 'Cash',
  LOAN: 'Loan',
};

const CATEGORY_ICONS: Record<string, IconSpec> = {
  Groceries: { Icon: ShoppingCart, background: '#16a34a' },
  'Dining Out': { Icon: UtensilsCrossed, background: '#9f1239' },
  Transfer: { Icon: ArrowLeftRight, background: '#4338ca' },
  Income: { Icon: Briefcase, background: '#15803d' },
  Housing: { Icon: Home, background: '#7c3aed' },
};

export function getCategoryIcon(label: string): IconSpec {
  return CATEGORY_ICONS[label] ?? DEFAULT_CATEGORY_ICON;
}
