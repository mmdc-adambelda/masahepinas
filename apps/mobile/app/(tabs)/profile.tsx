import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{session?.profile?.displayName ?? 'Your profile'}</Text>
      <Text style={styles.subtitle}>{session?.email}</Text>

      <View style={styles.rolesRow}>
        {(session?.roles.length ? session.roles : ['customer']).map((role) => (
          <View key={role} style={styles.rolePill}>
            <Text style={styles.roleText}>{role.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Saved spas, review history, badges, and settings land in later phases (see
        docs/development-roadmap.md).
      </Text>

      <Pressable style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundMain,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: colors.textMain,
    fontSize: typography.size.xl,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rolePill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  roleText: {
    color: colors.accentGreen,
    fontSize: typography.size.xs,
    textTransform: 'capitalize',
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: typography.size.base,
  },
});
