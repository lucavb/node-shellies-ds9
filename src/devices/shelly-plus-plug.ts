import { component, Device } from "./base";
import {
  BluetoothLowEnergy,
  Cloud,
  Mqtt,
  OutboundWebSocket,
  Script,
  Switch,
  WiFi,
} from "../components";

export class ShellyPlusPlugUs extends Device {
  static readonly model: string = "SNPL-00116US";
  static readonly modelName: string = "Shelly Plus Plug US";

  @component
  readonly wifi = new WiFi(this);

  @component
  readonly bluetoothLowEnergy = new BluetoothLowEnergy(this);

  @component
  readonly cloud = new Cloud(this);

  @component
  readonly mqtt = new Mqtt(this);

  @component
  readonly outboundWebSocket = new OutboundWebSocket(this);

  @component
  readonly switch0 = new Switch(this, 0);

  @component
  readonly script = new Script(this);
}

Device.registerClass(ShellyPlusPlugUs);

export class ShellyPlusPlugEu extends ShellyPlusPlugUs {
  static readonly model: string = "SNPL-00112EU";
  static readonly modelName: string = "Shelly Plus Plug EU";
}

Device.registerClass(ShellyPlusPlugEu);

export class ShellyPlusPlugUk extends ShellyPlusPlugUs {
  static readonly model: string = "SNPL-00112UK";
  static readonly modelName: string = "Shelly Plus Plug UK";
}

Device.registerClass(ShellyPlusPlugUk);

export class ShellyPlusPlugIt extends ShellyPlusPlugUs {
  static readonly model: string = "SNPL-00110IT";
  static readonly modelName: string = "Shelly Plus Plug IT";
}

Device.registerClass(ShellyPlusPlugIt);

export class ShellyPlugSG3Eu extends ShellyPlusPlugUs {
  static readonly model: string = "S3PL-00112EU";
  static readonly modelName: string = "Shelly Plug S Gen3";
}

Device.registerClass(ShellyPlugSG3Eu);
