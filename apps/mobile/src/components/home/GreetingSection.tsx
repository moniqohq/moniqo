import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { getTimeOfDayGreeting } from '@/utils/greeting';

interface GreetingSectionProps {
  name: string | null;
}

export function GreetingSection({ name }: GreetingSectionProps) {
  const greeting = getTimeOfDayGreeting();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting} accessibilityRole="header">
        {greeting}
        {name ? (
          <>
            , <Text style={styles.name}>{name}</Text>
          </>
        ) : null}
        {' 👋'}
      </Text>
      <Text style={styles.subtitle}>You&apos;re on track with your budget this month.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  greeting: {
    ...typography.heading,
    color: colors.foreground,
  },
  name: {
    color: colors.primaryLight,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedForeground,
  },
});
