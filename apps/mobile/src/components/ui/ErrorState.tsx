import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message = "Couldn't load this section.", onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <TriangleAlert size={20} color={colors.destructive} />
      <Text style={styles.text}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={styles.retryButton}
        accessibilityRole="button"
        accessibilityLabel="Retry loading"
        hitSlop={8}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    ...typography.label,
    color: colors.primaryLight,
  },
});
