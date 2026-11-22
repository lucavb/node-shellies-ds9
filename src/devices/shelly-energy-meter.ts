import { BluetoothLowEnergy } from '../components/bluetooth-low-energy';
import { Cloud } from '../components/cloud';
import { EM, EM1, EM1Data, EMData } from '../components/energy-meter';
import { Ethernet } from '../components/ethernet';
import { Mqtt } from '../components/mqtt';
import { OutboundWebSocket } from '../components/outbound-websocket';
import { Switch } from '../components/switch';
import { Temperature } from '../components/temperature';
import { WiFi } from '../components/wifi';
import { RpcHandler, RpcStatusNotification } from '../rpc';
import { component, Device, DeviceInfo, MultiProfileDevice } from './base';

/**
 * Common connectivity and profile-dependent topology of Shelly 3-phase meters.
 * The inherited `profile` remains the value from initial device info;
 * `meterProfile` reflects the topology currently observed in status.
 */
abstract class ShellyEnergyMeter extends MultiProfileDevice {
    @component
    readonly wifi = new WiFi(this);
    @component
    readonly ethernet: Ethernet | undefined;
    @component
    readonly bluetoothLowEnergy = new BluetoothLowEnergy(this);
    @component
    readonly cloud = new Cloud(this);
    @component
    readonly mqtt = new Mqtt(this);
    @component
    readonly outboundWebSocket = new OutboundWebSocket(this);

    /** Built-in meter temperature sensor, present independently of meter profile. */
    @component
    readonly temperature0 = new Temperature(this, 0);

    /** Present only for a known triphase profile. */
    @component
    em: EM | undefined;
    /** Present only for a known triphase profile. */
    @component
    emdata: EMData | undefined;
    /** Present only for a known monophase profile. */
    @component
    em1_0: EM1 | undefined;
    @component
    em1_1: EM1 | undefined;
    @component
    em1_2: EM1 | undefined;
    /** Present only for a known monophase profile. */
    @component
    em1data_0: EM1Data | undefined;
    @component
    em1data_1: EM1Data | undefined;
    @component
    em1data_2: EM1Data | undefined;

    get em1(): readonly [EM1, EM1, EM1] | undefined {
        return this.em1_0 && this.em1_1 && this.em1_2 ? [this.em1_0, this.em1_1, this.em1_2] : undefined;
    }

    get em1data(): readonly [EM1Data, EM1Data, EM1Data] | undefined {
        return this.em1data_0 && this.em1data_1 && this.em1data_2
            ? [this.em1data_0, this.em1data_1, this.em1data_2]
            : undefined;
    }

    /**
     * The Pro 3EM may have an optional switch add-on. It is deliberately
     * undefined until `switch:0` actually appears in a status payload; the
     * 3EM-63 and units without the add-on therefore do not claim a relay.
     */
    @component
    switch0: Switch | undefined = undefined;

    private activeMeterProfile: 'triphase' | 'monophase' | undefined;

    /** The active meter topology, as indicated by device info or status. */
    get meterProfile(): 'triphase' | 'monophase' | undefined {
        return this.activeMeterProfile;
    }

    constructor(info: DeviceInfo, rpcHandler: RpcHandler, hasEthernet: boolean) {
        super(info, rpcHandler);

        if (hasEthernet) {
            this.ethernet = new Ethernet(this);
        }

        this.activateProfile(this.normalizeProfile(this.profile));
    }

    private normalizeProfile(profile: string): 'triphase' | 'monophase' | undefined {
        switch (profile.toLowerCase()) {
            case 'triphase':
                return 'triphase';
            case 'monophase':
                return 'monophase';
            default:
                return undefined;
        }
    }

    private activateProfile(profile: 'triphase' | 'monophase' | undefined) {
        if (!profile || profile === this.activeMeterProfile) {
            return;
        }

        if (this.activeMeterProfile === 'triphase') {
            this.components.delete('em:0');
            this.components.delete('emdata:0');
            this.em = undefined;
            this.emdata = undefined;
        } else if (this.activeMeterProfile === 'monophase') {
            for (const id of [0, 1, 2]) {
                this.components.delete(`em1:${id}`);
                this.components.delete(`em1data:${id}`);
            }
            this.em1_0 = undefined;
            this.em1_1 = undefined;
            this.em1_2 = undefined;
            this.em1data_0 = undefined;
            this.em1data_1 = undefined;
            this.em1data_2 = undefined;
        }

        this.activeMeterProfile = profile;

        if (profile === 'triphase') {
            this.em = new EM(this);
            this.emdata = new EMData(this);
            this.components.set(this.em.key, 'em');
            this.components.set(this.emdata.key, 'emdata');
        } else {
            this.em1_0 = new EM1(this, 0);
            this.em1_1 = new EM1(this, 1);
            this.em1_2 = new EM1(this, 2);
            this.em1data_0 = new EM1Data(this, 0);
            this.em1data_1 = new EM1Data(this, 1);
            this.em1data_2 = new EM1Data(this, 2);
            for (const component of [this.em1_0, this.em1_1, this.em1_2]) {
                this.components.set(component.key, `em1_${component.id}`);
            }
            for (const component of [this.em1data_0, this.em1data_1, this.em1data_2]) {
                this.components.set(component.key, `em1data_${component.id}`);
            }
        }
    }

    private inferProfile(update: Record<string, unknown>) {
        let hasTriphase = false;
        let hasMonophase = false;
        for (const key of Object.keys(update)) {
            if (!Object.prototype.hasOwnProperty.call(update, key) || !update[key] || typeof update[key] !== 'object') {
                continue;
            }
            if (key === 'em:0' || key === 'emdata:0') {
                hasTriphase = true;
            } else if (/^em1(?:data)?:[0-2]$/.test(key)) {
                hasMonophase = true;
            }
        }

        // A mixed payload is ambiguous; do not change an already-established
        // topology or guess one when the device info omitted its profile.
        if (hasTriphase !== hasMonophase) {
            this.activateProfile(hasTriphase ? 'triphase' : 'monophase');
        }
    }

    /** Construct the optional switch only after firmware reports it. */
    protected ensureOptionalSwitch() {
        if (!this.switch0) {
            this.switch0 = new Switch(this, 0);
            this.components.set(this.switch0.key, 'switch0');
        }
    }

    private processStatusUpdate(update: object): void {
        const status = update as Record<string, unknown>;
        this.inferProfile(status);
        const switchStatus = status['switch:0'];
        if (switchStatus && typeof switchStatus === 'object') {
            this.ensureOptionalSwitch();
        }
        super.statusUpdateHandler(status as RpcStatusNotification);
    }

    protected statusUpdateHandler(update: RpcStatusNotification) {
        this.processStatusUpdate(update);
    }

    /**
     * Seed the optional relay from a full status response if present, without
     * making a second RPC or assuming that the add-on is installed.
     */
    async loadStatus() {
        const status = await this.shelly.getStatus();
        this.processStatusUpdate(status);
    }
}

/** Shelly Pro 3EM (distinct from the Pro 3 relay). */
export class ShellyPro3EM extends ShellyEnergyMeter {
    static readonly model = 'SPEM-003CEBEU';
    static readonly modelName = 'Shelly Pro 3EM';

    constructor(info: DeviceInfo, rpcHandler: RpcHandler) {
        super(info, rpcHandler, true);
    }
}

/** Shelly 3EM-63 Gen3. */
export class Shelly3EM63Gen3 extends ShellyEnergyMeter {
    static readonly model = 'S3EM-003CXCEU63';
    static readonly modelName = 'Shelly 3EM-63 Gen3';

    constructor(info: DeviceInfo, rpcHandler: RpcHandler) {
        super(info, rpcHandler, false);
    }
}

Device.registerClass(ShellyPro3EM);
Device.registerClass(Shelly3EM63Gen3);
