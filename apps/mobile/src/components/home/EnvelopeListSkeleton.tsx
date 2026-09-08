import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export function EnvelopeListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.item, index < rows - 1 && styles.divider]}>
          <View style={styles.header}>
            <Skeleton width={36} height={36} borderRadius={radius.md} />
            <View style={styles.info}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="35%" height={11} style={styles.gapTop} />
            </View>
          </View>
          <Skeleton width="100%" height={8} borderRadius={radius.full} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  gapTop: {
    marginTop: 2,
  },
});
