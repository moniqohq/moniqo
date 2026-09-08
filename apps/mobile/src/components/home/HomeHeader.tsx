import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';
import type { User } from '@/types/domain';

interface HomeHeaderProps {
  user: User | null;
  hasUnreadNotifications?: boolean;
  onPressNotifications?: () => void;
  onPressAvatar?: () => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function HomeHeader({ user, hasUnreadNotifications, onPressNotifications, onPressAvatar }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <View>
          <Text style={styles.brandName}>Moniqo</Text>
          <Text style={styles.tagline}>Budget today. A brighter tomorrow.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onPressNotifications}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={10}
          style={styles.iconButton}
        >
          <Bell size={22} color={colors.foreground} />
          {hasUnreadNotifications ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable
          onPress={onPressAvatar}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={10}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{user ? getInitials(user.name) : ''}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.primaryForeground,
    fontSize: 18,
    fontWeight: '700',
  },
  brandName: {
    ...typography.title,
    color: colors.foreground,
  },
  tagline: {
    ...typography.caption,
    color: colors.mutedForeground,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.label,
    color: colors.foreground,
  },
});
