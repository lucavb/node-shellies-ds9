import { component, Device, MultiProfileDevice } from './base';
import {
    BluetoothLowEnergy,
    Cloud,
    Input,
    Light,
    Mqtt,
    OutboundWebSocket,
    Rgb,
    Rgbw,
    Script,
    Ui,
    WiFi,
} from '../components';

export class ShellyPlusRgbwPm extends MultiProfileDevice {
    static readonly model: string = 'SNDC-0D4P10WW';
    static readonly modelName: string = 'Shelly Plus RGBW PM';

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
    readonly light2 = new Light(this, 2);

    @component
    readonly light3 = new Light(this, 3);

    @component
    readonly rgb0 = new Rgb(this, 0);

    @component
    readonly rgbw0 = new Rgbw(this, 0);

    @component
    readonly script = new Script(this);

    @component
    readonly ui = new Ui(this);
}

Device.registerClass(ShellyPlusRgbwPm);
