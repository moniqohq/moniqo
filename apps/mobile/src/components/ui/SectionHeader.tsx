import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';

interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
}

export function SectionHeader({ title, onViewAll }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          style={styles.viewAll}
          accessibilityRole="button"
          accessibilityLabel={`View all ${title.toLowerCase()}`}
          hitSlop={8}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={16} color={colors.primaryLight} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.primaryLight,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...typography.label,
    color: colors.primaryLight,
  },
});
