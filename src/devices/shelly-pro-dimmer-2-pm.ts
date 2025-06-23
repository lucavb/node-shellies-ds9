import { component, Device } from './base';
import {
    BluetoothLowEnergy,
    Cloud,
    Ethernet,
    Input,
    Mqtt,
    OutboundWebSocket,
    Script,
    Light,
    Ui,
    WiFi,
} from '../components';

export class ShellyProDimmer2Pm extends Device {
    static readonly model: string = 'SPDM-002PE01EU';
    static readonly modelName: string = 'Shelly Pro Dimmer 2PM';

    @component
    readonly wifi = new WiFi(this);

    @component
    readonly ethernet = new Ethernet(this);

    @component
    readonly bluetoothLowEnergy = new BluetoothLowEnergy(this);

    @component
    readonly cloud = new Cloud(this);

    @component
    readonly mqtt = new Mqtt(this);

    @component
    readonly outboundWebSocket = new OutboundWebSocket(this);

    @component
    readonly input0 = new Input(this, 0);

    @component
    readonly input1 = new Input(this, 1);

    @component
    readonly input2 = new Input(this, 2);

    @component
    readonly input3 = new Input(this, 3);

    @component
    readonly light0 = new Light(this, 0);

    @component
    readonly light1 = new Light(this, 1);

    @component
    readonly script = new Script(this);

    @component
    readonly ui = new Ui(this);
}

Device.registerClass(ShellyProDimmer2Pm);
