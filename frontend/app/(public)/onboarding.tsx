import { router } from "expo-router";
import OnboardingSlide from "../../src/components/OnboardingSlide";

export default function OnboardingScreen() {
  return (
    <OnboardingSlide
      background={require("../../assets/onboarding-bg-00.png")}
      title="Protegé a tu familia de las apuestas online"
      description="En esta aplicación podés bloquear páginas de apuestas online en el dispositivo para acompañar y proteger a tu familia en el mundo digital."
      step={0}
      total={3}
      onSkip={() => router.replace("/login")}
      onContinue={() => router.push("/onboarding2")}
    />
  );
}
