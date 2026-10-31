
import { requireNativeModule } from "expo-modules-core";

type LocalVpnModuleType = {
  isVpnRunning(): boolean;
  startVpn(): Promise<boolean>;
  stopVpn(): void;
};

export default requireNativeModule<LocalVpnModuleType>("LocalVpn");
