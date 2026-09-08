import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AccountsSection,
  BudgetEnvelopesSection,
  BudgetSummarySection,
  GreetingSection,
  HomeHeader,
  RecentTransactionsSection,
} from '@/components/home';
import { useHomeDashboard } from '@/hooks/useHomeDashboard';
import { colors, spacing } from '@/theme';

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, summary, stats, accounts, transactions, envelopes } = useHomeDashboard();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primaryTint, 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          user={user}
          hasUnreadNotifications
          onPressNotifications={() => router.push('/more')}
          onPressAvatar={() => router.push('/more')}
        />
        <GreetingSection name={user?.name ?? null} />
        <BudgetSummarySection accounts={accounts} stats={stats} summary={summary} />

        <AccountsSection
          data={accounts.data}
          loading={accounts.loading}
          error={accounts.error}
          onRetry={accounts.refetch}
          onViewAll={() => router.push('/accounts')}
        />

        <RecentTransactionsSection
          data={transactions.data}
          loading={transactions.loading}
          error={transactions.error}
          onRetry={transactions.refetch}
          onViewAll={() => router.push('/transactions')}
        />

        <BudgetEnvelopesSection
          data={envelopes.data}
          loading={envelopes.loading}
          error={envelopes.error}
          onRetry={envelopes.refetch}
          onViewAll={() => router.push('/budgets')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
});
