import { Stack } from 'expo-router';
import { colors } from '@masahepinas/ui/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundMain },
      }}
    />
  );
}
