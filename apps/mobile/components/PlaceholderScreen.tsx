import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@masahepinas/ui/tokens';

/**
 * Shared shell for tab screens that don't have real content yet (Phase 2+
 * builds directory/map/saved/community data on top of this). Keeps every
 * placeholder visually consistent instead of duplicating layout per screen.
 */
export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundMain,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.size.xl,
    fontWeight: '600',
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
});
