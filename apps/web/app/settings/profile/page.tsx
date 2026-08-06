import { requireAuth } from '@/lib/auth';
import { getPublicProfile } from '@/lib/profiles';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Profile settings' };

export default async function ProfileSettingsPage() {
  const session = await requireAuth();
  const profile = await getPublicProfile(session.userId);

  if (!profile) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-foreground-secondary">Could not load your profile.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Profile settings</h1>
      <SettingsForm profile={profile} />
    </main>
  );
}
