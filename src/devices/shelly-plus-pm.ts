import { component, Device } from './base';
import { BluetoothLowEnergy, Cloud, Mqtt, OutboundWebSocket, Script, WiFi, Pm1 } from '../components';

export class ShellyPlusPmMini extends Device {
    static readonly model: string = 'SNPM-001PCEU16';
    static readonly modelName: string = 'Shelly Plus PM Mini';

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
    readonly script = new Script(this);

    @component
    readonly pm1 = new Pm1(this);
}

Device.registerClass(ShellyPlusPmMini);

export class ShellyPlusPmMiniV3 extends ShellyPlusPmMini {
    static readonly model: string = 'S3PM-001PCEU16';
}

Device.registerClass(ShellyPlusPmMiniV3);
