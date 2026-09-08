import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';

interface PlaceholderScreenProps {
  title: string;
  message?: string;
}

/** Used for tabs/routes that don't have a real screen built yet. */
export function PlaceholderScreen({ title, message = 'Coming soon.' }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: {
    ...typography.heading,
    color: colors.foreground,
  },
  message: {
    ...typography.body,
    color: colors.mutedForeground,
  },
});
