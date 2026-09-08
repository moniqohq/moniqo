import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  text: {
    ...typography.body,
    color: colors.mutedForeground,
  },
});
