import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListChecks, MoreHorizontal, PieChart, Plus, House as Home } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';

const TAB_ICONS: Record<string, typeof Home> = {
  index: Home,
  budgets: PieChart,
  transactions: ListChecks,
  more: MoreHorizontal,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home',
  budgets: 'Budgets',
  transactions: 'Transactions',
  more: 'More',
};

interface TabRoute {
  key: string;
  name: string;
}

interface TabBarNavigation {
  emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  navigate: (name: string) => void;
}

interface HomeBottomNavigationProps {
  state: { index: number; routes: TabRoute[] };
  navigation: TabBarNavigation;
}

export function HomeBottomNavigation({ state, navigation }: HomeBottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const routes = state.routes;
  const midpoint = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, midpoint);
  const rightRoutes = routes.slice(midpoint);

  const renderTab = (route: (typeof routes)[number], index: number) => {
    const isFocused = state.index === index;
    const Icon = TAB_ICONS[route.name] ?? Home;
    const label = TAB_LABELS[route.name] ?? route.name;
    const color = isFocused ? colors.primaryLight : colors.mutedForeground;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={label}
      >
        <Icon size={22} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {leftRoutes.map((route, index) => renderTab(route, index))}

      <Pressable
        onPress={() => router.push('/add-transaction')}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
      >
        <Plus size={26} color={colors.primaryForeground} />
      </Pressable>

      {rightRoutes.map((route, index) => renderTab(route, index + midpoint))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
});
