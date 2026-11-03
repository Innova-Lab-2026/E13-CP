import { Redirect } from 'expo-router';

export default function Index() {
  // Redirige automáticamente al onboarding al abrir la app
  return <Redirect href="/(public)/onboarding" />;
}