import { StyleSheet, View } from 'react-native';
import { radius } from '@/theme';
import type { IconSpec } from '@/constants/icons';

interface IconChipProps {
  spec: IconSpec;
  size?: number;
}

export function IconChip({ spec: { Icon, background }, size = 40 }: IconChipProps) {
  return (
    <View style={[styles.chip, { width: size, height: size, backgroundColor: background }]}>
      <Icon size={size * 0.5} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
