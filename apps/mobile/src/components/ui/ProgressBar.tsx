import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme';

interface ProgressBarProps {
  progress: number;
  accessibilityLabel: string;
}

export function ProgressBar({ progress, accessibilityLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
