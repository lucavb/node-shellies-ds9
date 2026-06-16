import { component, Device } from './base';
import { BluetoothLowEnergy, Cloud, Mqtt, OutboundWebSocket, Script, Switch, WiFi } from '../components';

export class ShellyPlusPlugUs extends Device {
    static readonly model: string = 'SNPL-00116US';
    static readonly modelName: string = 'Shelly Plus Plug US';

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
    static readonly model: string = 'SNPL-00112EU';
    static readonly modelName: string = 'Shelly Plus Plug EU';
}

Device.registerClass(ShellyPlusPlugEu);

export class ShellyPlusPlugUk extends ShellyPlusPlugUs {
    static readonly model: string = 'SNPL-00112UK';
    static readonly modelName: string = 'Shelly Plus Plug UK';
}

Device.registerClass(ShellyPlusPlugUk);

export class ShellyPlusPlugIt extends ShellyPlusPlugUs {
    static readonly model: string = 'SNPL-00110IT';
    static readonly modelName: string = 'Shelly Plus Plug IT';
}

Device.registerClass(ShellyPlusPlugIt);

export class ShellyPlugSG3Eu extends ShellyPlusPlugUs {
    static readonly model: string = 'S3PL-00112EU';
    static readonly modelName: string = 'Shelly Plug S Gen3';
}

Device.registerClass(ShellyPlugSG3Eu);

export class ShellyPlugAzG3Eu extends ShellyPlugSG3Eu {
    static readonly model: string = 'S3PL-10112EU';
    static readonly modelName: string = 'Shelly AZ Plug Gen3';
}

Device.registerClass(ShellyPlugAzG3Eu);

export class ShellyOutdoorPlugSG3Eu extends ShellyPlugSG3Eu {
    static readonly model: string = 'S3PL-20112EU';
    static readonly modelName: string = 'Shelly Outdoor Plug S Gen3';
}

Device.registerClass(ShellyOutdoorPlugSG3Eu);

export class ShellyPlugMG3Eu extends ShellyPlugSG3Eu {
    static readonly model: string = 'S3PL-30110EU';
    static readonly modelName: string = 'Shelly Plug M Gen3';
}

Device.registerClass(ShellyPlugMG3Eu);

export class ShellyPlugPmG3Eu extends ShellyPlugSG3Eu {
    static readonly model: string = 'S3PL-30116EU';
    static readonly modelName: string = 'Shelly Plug PM Gen3';
}

Device.registerClass(ShellyPlugPmG3Eu);

export class ShellyPlugUsG4 extends ShellyPlusPlugUs {
    static readonly model: string = 'S4PL-00116US';
    static readonly modelName: string = 'Shelly Plug US Gen4';
}

Device.registerClass(ShellyPlugUsG4);
