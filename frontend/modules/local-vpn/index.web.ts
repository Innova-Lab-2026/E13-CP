type LocalVpnModuleType = {
  isVpnRunning(): boolean;
  startVpn(): Promise<boolean>;
  stopVpn(): void;
};

const LocalVpnModule: LocalVpnModuleType = {
  isVpnRunning: () => false,
  startVpn: async () => {
    throw new Error("La VPN local solo está disponible en Android.");
  },
  stopVpn: () => {},
};

export default LocalVpnModule;
