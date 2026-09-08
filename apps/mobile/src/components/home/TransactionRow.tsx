import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconChip } from '@/components/ui';
import { getCategoryIcon } from '@/constants/icons';
import { colors, spacing, typography } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Transaction } from '@/types/domain';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  isLast?: boolean;
}

export function TransactionRow({ transaction, onPress, isLast }: TransactionRowProps) {
  const isPositive = transaction.amount > 0;

  return (
    <Pressable
      onPress={() => onPress?.(transaction)}
      style={[styles.row, !isLast && styles.divider]}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.description}, ${formatDate(transaction.date)}, ${transaction.category_label}, ${formatCurrency(transaction.amount, { signed: true })}`}
    >
      <IconChip spec={getCategoryIcon(transaction.category_label)} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {formatDate(transaction.date)} • {transaction.category_label}
        </Text>
      </View>
      <Text style={[styles.amount, isPositive ? styles.positive : styles.negative]}>
        {formatCurrency(transaction.amount, { signed: true })}
      </Text>
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
  amount: {
    ...typography.amountSmall,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.foreground,
  },
});
