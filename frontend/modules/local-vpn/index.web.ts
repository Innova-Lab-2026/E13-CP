import type { LocalVpnModuleType } from "./index";

/** En web no hay VPN: el bloqueo en el navegador lo hace la app de Android. */
const LocalVpnModule: LocalVpnModuleType = {
  isVpnRunning: () => false,
  startVpn: async (_domains?: string[]) => {
    throw new Error("La VPN local solo está disponible en Android.");
  },
  stopVpn: () => {},
};

export default LocalVpnModule;
