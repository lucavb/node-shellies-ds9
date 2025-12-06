import { component, Device, MultiProfileDevice } from './base';
import {
  BluetoothLowEnergy,
  Cloud,
  Cover,
  Input,
  Mqtt,
  OutboundWebSocket,
  Script,
  Switch,
  WiFi,
} from '../components';

export class ShellyGen4Mini extends MultiProfileDevice {
  static readonly model: string = "S4SW-001P8EU";
  static readonly modelName: string = "Shelly 1PM Gen4 Mini";

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
  readonly input = new Input(this, 0);

  @component
  readonly switch = new Switch(this, 0);

  @component
  readonly script = new Script(this);
}

Device.registerClass(ShellyGen4Mini);
