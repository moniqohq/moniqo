import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export function RowListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.row, index < rows - 1 && styles.divider]}>
          <Skeleton width={40} height={40} borderRadius={radius.md} />
          <View style={styles.info}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={11} style={styles.gapTop} />
          </View>
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </View>
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
    gap: spacing.xs,
  },
  gapTop: {
    marginTop: 2,
  },
});
