import { requireOptionalNativeModule } from "expo-modules-core";

type NativeLocalVpnModule = {
  isVpnRunning(): boolean;
  startVpn(domains: string[]): Promise<boolean>;
  stopVpn(): void;
};

export type LocalVpnModuleType = {
  /** true si el servicio de VPN local está activo en este celular. */
  isVpnRunning(): boolean;
  /**
   * Pide el permiso de VPN (si hace falta) y arranca el filtrado DNS.
   * `domains` es la lista de dominios a bloquear (también bloquea sus subdominios).
   * Si se llama con la VPN activa, solo actualiza la lista. Con una lista vacía,
   * el servicio usa la lista de respaldo incluida en la app.
   * Devuelve false si la persona no aceptó el permiso de VPN.
   */
  startVpn(domains?: string[]): Promise<boolean>;
  stopVpn(): void;
};

// Opcional: en iOS o en Expo Go el módulo nativo no existe y la app no debe romperse.
const native = requireOptionalNativeModule<NativeLocalVpnModule>("LocalVpn");

const LocalVpnModule: LocalVpnModuleType = {
  isVpnRunning: () => native?.isVpnRunning() ?? false,
  startVpn: async (domains = []) => {
    if (!native) {
      throw new Error(
        "La protección necesita la app de BA Protege+ para Android instalada en este celular.",
      );
    }
    return native.startVpn(domains);
  },
  stopVpn: () => native?.stopVpn(),
};

export default LocalVpnModule;
