import { router } from "expo-router";
import OnboardingSlide from "../../src/components/OnboardingSlide";

export default function OnboardingSecondScreen() {
  return (
    <OnboardingSlide
      background={require("../../assets/onboarding-bg-01.png")}
      title="Las apuestas online no son un juego"
      description={[
        "Apostar por internet implica arriesgar dinero y puede generar pérdidas. BA Protege+ bloquea estas páginas para ayudarte a evitar esos riesgos.",
        "Si tenés dudas sobre las apuestas online, conversalo con tu adulto responsable.",
      ]}
      step={1}
      total={2}
      onSkip={() => router.replace("/login")}
      onContinue={() => router.replace("/login")}
    />
  );
}
