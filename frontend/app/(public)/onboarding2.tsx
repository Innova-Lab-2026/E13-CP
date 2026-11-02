import { router } from "expo-router";
import OnboardingSlide from "../../src/components/OnboardingSlide";

export default function OnboardingSecondScreen() {
  return (
    <OnboardingSlide
      background={require("../../assets/onboarding-bg-01.png")}
      title="Las apuestas online no son un juego"
      description="Apostar por internet implica arriesgar dinero y puede generar pérdidas. BA Protege+ bloquea las páginas del listado oficial de LOTBA para ayudarte a evitar esos riesgos."
      step={1}
      total={2}
      onSkip={() => router.replace("/login")}
      onContinue={() => router.replace("/login")}
    />
  );
}
