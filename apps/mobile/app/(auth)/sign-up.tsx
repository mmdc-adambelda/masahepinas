import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Link } from 'expo-router';
import { customerSignUpSchema } from '@masahepinas/validation';
import { colors, radius, spacing, typography } from '@masahepinas/ui/tokens';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedAll, setAgreedAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const parsed = customerSignUpSchema.safeParse({
      displayName,
      email,
      password,
      acceptedTermsOfService: agreedAll,
      acceptedPrivacyPolicy: agreedAll,
      confirmedTruthfulReviews: agreedAll,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form submission');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName } },
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to {email}. Confirm your email, then sign in.
        </Text>
        <Link href="/(auth)/sign-in" style={styles.link}>
          Back to sign in
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>
        Join the Masahe Pinas community to save spas, follow reviewers, and leave your own
        reviews.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.agreeRow}>
        <Switch value={agreedAll} onValueChange={setAgreedAll} />
        <Text style={styles.agreeText}>
          I agree to the Terms of Service and Privacy Policy, and confirm any reviews I
          submit will be truthful.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.backgroundMain} />
        ) : (
          <Text style={styles.buttonText}>Create account</Text>
        )}
      </Pressable>

      <Link href="/(auth)/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.backgroundMain,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.size['2xl'],
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: colors.textMain,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.size.base,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  agreeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
  error: {
    color: colors.error,
    fontSize: typography.size.sm,
  },
  button: {
    backgroundColor: colors.primaryGreen,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.backgroundMain,
    fontWeight: '600',
    fontSize: typography.size.base,
  },
  link: {
    color: colors.accentGreen,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
