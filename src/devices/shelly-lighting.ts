import { component, Device, MultiProfileDevice } from './base';
import { BluetoothLowEnergy, Cloud, Input, Light, Mqtt, OutboundWebSocket, Script, Ui, WiFi } from '../components';
import { RGB, RGBW } from '../components/rgb';
import { ShellyPlusPMDimmer } from './shelly-plus-dimmer-pm';
import { RpcStatusNotification } from '../rpc';

/**
 * Shelly Dimmer Gen4 (EU). Its component inventory follows the S4DM-0A101WWL
 * API sample, which is firmware-specific and may not represent every firmware:
 * https://github.com/markus7017/myfiles/blob/6ad011473515fe39b4006102c4af5cd25a7d4b96/shelly/DEVNOTES%20-%20Gen4%20API%20JSON%20Samples.md#shelly-dimmer-g4
 */
export class ShellyDimmerGen4 extends Device {
    static readonly model: string = 'S4DM-0A101WWL';
    static readonly modelName: string = 'Shelly Dimmer Gen4';

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
    readonly light0 = new Light(this, 0);

    // Scripts are a device service and need not be present in GetStatus output.
    @component
    readonly script = new Script(this);
}

Device.registerClass(ShellyDimmerGen4);

/** North American hardware variant retains the prior Plus PM component layout. */
export class ShellyDimmerGen4US extends ShellyPlusPMDimmer {
    static readonly model: string = 'S4DM-0A102US';
    static readonly modelName: string = 'Shelly Dimmer Gen4 US';
}

Device.registerClass(ShellyDimmerGen4US);

/**
 * Shelly Plus RGBW PM with profile-specific RGBW, RGB, or four-channel Light topology.
 * The inherited `profile` remains the value supplied in initial device info;
 * runtime topology is tracked separately and can follow firmware profile changes.
 */
export class ShellyPlusRGBWPM extends MultiProfileDevice {
    static readonly model = 'SNDC-0D4P10WW';
    static readonly modelName = 'Shelly Plus RGBW PM';

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
    rgbw: RGBW | undefined;

    @component
    rgb: RGB | undefined;

    @component
    light0: Light | undefined;

    @component
    light1: Light | undefined;

    @component
    light2: Light | undefined;

    @component
    light3: Light | undefined;

    @component
    readonly script = new Script(this);

    @component
    readonly ui = new Ui(this);

    private activeLightingProfile: 'rgbw' | 'rgb' | 'light' | null = null;

    constructor(info: import('./base').DeviceInfo, rpcHandler: import('../rpc').RpcHandler) {
        super(info, rpcHandler);
        this.activateLightingProfile(this.profile);
    }

    /**
     * Shelly firmware normally includes `profile` in device info. If it is
     * absent, infer the active profile from actual status component keys.
     */
    private inferLightingProfile(status: Record<string, unknown>) {
        const keys = Object.keys(status).filter((key) => {
            const value = status[key];
            return value !== null && typeof value === 'object';
        });

        const profiles = new Set<'rgbw' | 'rgb' | 'light'>();
        if (keys.includes('rgbw:0')) {
            profiles.add('rgbw');
        }
        if (keys.includes('rgb:0')) {
            profiles.add('rgb');
        }
        if (keys.some((key) => /^light:[0-3]$/.test(key))) {
            profiles.add('light');
        }

        // Mixed keys can be stale status from a reboot/profile change. Wait for
        // an unambiguous notification instead of replacing a live topology.
        if (profiles.size === 1) {
            const [profile] = profiles;
            if (profile) {
                this.activateLightingProfile(profile);
            }
        }
    }

    private activateLightingProfile(profile: string) {
        if (profile !== 'rgbw' && profile !== 'rgb' && profile !== 'light') {
            return;
        }

        if (this.activeLightingProfile === profile) {
            return;
        }

        this.removeActiveLightingComponents();

        if (profile === 'rgbw') {
            this.rgbw = new RGBW(this, 0);
            this.activeLightingProfile = 'rgbw';
            this.components.set(this.rgbw.key, 'rgbw');
        } else if (profile === 'rgb') {
            this.rgb = new RGB(this, 0);
            this.activeLightingProfile = 'rgb';
            this.components.set(this.rgb.key, 'rgb');
        } else if (profile === 'light') {
            this.light0 = new Light(this, 0);
            this.light1 = new Light(this, 1);
            this.light2 = new Light(this, 2);
            this.light3 = new Light(this, 3);
            this.activeLightingProfile = 'light';
            for (const light of [this.light0, this.light1, this.light2, this.light3]) {
                this.components.set(light.key, `light${light.id}`);
            }
        }
    }

    private removeActiveLightingComponents() {
        switch (this.activeLightingProfile) {
            case 'rgbw':
                this.components.delete('rgbw:0');
                this.rgbw = undefined;
                break;
            case 'rgb':
                this.components.delete('rgb:0');
                this.rgb = undefined;
                break;
            case 'light':
                for (const id of [0, 1, 2, 3]) {
                    this.components.delete(`light:${id}`);
                }
                this.light0 = undefined;
                this.light1 = undefined;
                this.light2 = undefined;
                this.light3 = undefined;
                break;
        }
        this.activeLightingProfile = null;
    }

    protected statusUpdateHandler(update: RpcStatusNotification) {
        this.inferLightingProfile(update);
        super.statusUpdateHandler(update);
    }

    /** Loads status once, infers the profile from that seed, then applies it. */
    async loadStatus() {
        const status = await this.shelly.getStatus();
        this.statusUpdateHandler(status as RpcStatusNotification);
    }
}

Device.registerClass(ShellyPlusRGBWPM);
