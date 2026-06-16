import { component, Device, MultiProfileDevice } from './base';
import { BluetoothLowEnergy, Cloud, Input, Mqtt, OutboundWebSocket, Script, Switch, WiFi } from '../components';
import { ShellyPlus1, ShellyPlus1Mini } from './shelly-plus-1';
import { ShellyPlus1Pm } from './shelly-plus-1-pm';

export class ShellyGen4One extends ShellyPlus1 {
    static readonly model: string = 'S4SW-001X16EU';
    static readonly modelName: string = 'Shelly 1 Gen4';
}

Device.registerClass(ShellyGen4One);

export class ShellyGen4OnePm extends ShellyPlus1Pm {
    static readonly model: string = 'S4SW-001P16EU';
    static readonly modelName: string = 'Shelly 1PM Gen4';
}

Device.registerClass(ShellyGen4OnePm);

export class ShellyGen4OneMini extends ShellyPlus1Mini {
    static readonly model: string = 'S4SW-001X8EU';
    static readonly modelName: string = 'Shelly 1 Mini Gen4';
}

Device.registerClass(ShellyGen4OneMini);

export class ShellyGen4Mini extends MultiProfileDevice {
    static readonly model: string = 'S4SW-001P8EU';
    static readonly modelName: string = 'Shelly 1PM Gen4 Mini';

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

export class ShellyGen4OneAnz extends ShellyGen4One {
    static readonly model: string = 'S4SW-001X16ANZ';
    static readonly modelName: string = 'Shelly 1 Gen4 ANZ';
}

Device.registerClass(ShellyGen4OneAnz);

export class ShellyGen4OnePmAnz extends ShellyGen4OnePm {
    static readonly model: string = 'S4SW-001P16ANZ';
    static readonly modelName: string = 'Shelly 1PM Gen4 ANZ';
}

Device.registerClass(ShellyGen4OnePmAnz);
