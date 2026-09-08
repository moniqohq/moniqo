import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { IconChip } from '@/components/ui';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/constants/icons';
import { colors, spacing, typography } from '@/theme';
import { formatCurrency } from '@/utils/format';
import type { Account } from '@/types/domain';

interface AccountRowProps {
  account: Account;
  onPress?: (account: Account) => void;
  isLast?: boolean;
}

export function AccountRow({ account, onPress, isLast }: AccountRowProps) {
  const isNegative = account.balance < 0;

  return (
    <Pressable
      onPress={() => onPress?.(account)}
      style={[styles.row, !isLast && styles.divider]}
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${account.institution ?? ''}, balance ${formatCurrency(account.balance)}`}
    >
      <IconChip spec={ACCOUNT_TYPE_ICONS[account.type]} />
      <View style={styles.info}>
        <Text style={styles.name}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
        {account.institution ? <Text style={styles.subtitle}>{account.institution}</Text> : null}
      </View>
      <Text style={[styles.balance, isNegative && styles.negative]}>{formatCurrency(account.balance)}</Text>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
  balance: {
    ...typography.amountSmall,
    color: colors.foreground,
  },
  negative: {
    color: colors.destructive,
  },
});
