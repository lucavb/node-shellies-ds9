import * as api from '../index';
import { createDeviceFromInfo } from '../internal/create-device';

class TestRpcHandler extends api.RpcHandler {
    connected = true;
    request = vi.fn().mockImplementation((method: string) => {
        if (method === 'Shelly.GetComponents') {
            return Promise.resolve({
                components: [{ key: 'blugw', status: { connected: true } }],
                cfg_rev: 1,
                offset: 0,
                total: 1,
            });
        }
        return Promise.resolve({});
    });
    destroy = vi.fn().mockResolvedValue(undefined);

    constructor() {
        super('test');
    }
}

const info = (model: string, profile?: string) => ({
    id: `test-${model}`,
    mac: '00:00:00:00:00:01',
    model,
    gen: model === 'S4DM-0A101WWL' || model === 'S4DM-0A102US' ? 4 : 3,
    fw_id: 'test-firmware',
    ver: '1.0.0',
    app: 'test',
    ...(profile === undefined ? {} : { profile }),
    auth_en: false,
    auth_domain: null,
    discoverable: true,
});

describe('public device registration and seeded initialization', () => {
    test.each([
        ['S3GW-1DBT001', api.ShellyBluGatewayGen3],
        ['SPEM-003CEBEU', api.ShellyPro3EM],
        ['S3EM-003CXCEU63', api.Shelly3EM63Gen3],
        ['S4DM-0A101WWL', api.ShellyDimmerGen4],
        ['S4DM-0A102US', api.ShellyDimmerGen4US],
        ['SNDC-0D4P10WW', api.ShellyPlusRGBWPM],
        ['SPSW-202XE12UL', api.ShellyPro2Rev2Ul],
    ])('public entry registers %s', (model, expectedClass) => {
        expect(api.Device.getClass(model)).toBe(expectedClass);
    });

    test('creates a no-profile Pro 3EM from seeded measurements and discovers its optional switch', async () => {
        const handler = new TestRpcHandler();
        const meter = await createDeviceFromInfo(info('SPEM-003CEBEU'), handler, {
            genericDevices: false,
            seedStatus: {
                ts: 1,
                'em:0': { id: 0, a_voltage: 230.4, total_act_power: 42.5 },
                'emdata:0': { id: 0, total_act: 1234.5 },
                'switch:0': { id: 0, output: true },
            },
        });

        expect(meter).toBeInstanceOf(api.ShellyPro3EM);
        expect(meter?.profile).toBe('');
        expect(meter?.getComponent('em:0')).toBeInstanceOf(api.EM);
        expect(meter?.getComponent('emdata:0')).toBeInstanceOf(api.EMData);
        expect((meter?.getComponent('em:0') as api.EM).a_voltage).toBe(230.4);
        expect((meter?.getComponent('em:0') as api.EM).total_act_power).toBe(42.5);
        expect((meter?.getComponent('emdata:0') as api.EMData).total_act).toBe(1234.5);
        expect((meter?.getComponent('switch:0') as api.Switch).output).toBe(true);
    });

    test('does not surface the Pro 3EM switch unless seeded status reports it', async () => {
        const meter = await createDeviceFromInfo(info('SPEM-003CEBEU'), new TestRpcHandler(), {
            genericDevices: false,
            seedStatus: { ts: 2, 'em:0': { id: 0, a_voltage: 229.8 } },
        });

        expect(meter?.getComponent('em:0')).toBeInstanceOf(api.EM);
        expect(meter?.hasComponent('switch:0')).toBe(false);
        expect(meter?.getComponent('switch:0')).toBeUndefined();
    });

    test('creates no-profile RGBW PM from seeded RGB status and surfaces measurements and inputs', async () => {
        const rgbw = await createDeviceFromInfo(info('SNDC-0D4P10WW'), new TestRpcHandler(), {
            genericDevices: false,
            seedStatus: {
                ts: 3,
                'input:3': { id: 3, state: false },
                'rgb:0': {
                    id: 0,
                    output: true,
                    rgb: [54, 97, 255],
                    brightness: 62,
                    temperature: { tC: 54.8, tF: 130.6 },
                    aenergy: { total: 86.182, by_minute: [0, 0, 0], minute_ts: 1779361440 },
                    apower: 0,
                    current: 0,
                    voltage: 12.6,
                },
            },
        });

        expect(rgbw).toBeInstanceOf(api.ShellyPlusRGBWPM);
        expect(rgbw?.profile).toBe('');
        expect(rgbw?.getComponent('rgb:0')).toBeInstanceOf(api.RGB);
        const rgb = rgbw?.getComponent('rgb:0') as api.RGB;
        expect(rgb.rgb).toEqual([54, 97, 255]);
        expect(rgb.brightness).toBe(62);
        expect(rgb.temperature).toEqual({ tC: 54.8, tF: 130.6 });
        expect(rgb.aenergy?.total).toBe(86.182);
        expect(rgb.apower).toBe(0);
        expect(rgb.current).toBe(0);
        expect(rgb.voltage).toBe(12.6);
        expect((rgbw?.getComponent('input:3') as api.Input).state).toBe(false);
    });

    test('initializes a registered gateway with generic fallback disabled and fetches its component inventory', async () => {
        const handler = new TestRpcHandler();
        const gateway = await createDeviceFromInfo(info('S3GW-1DBT001'), handler, {
            genericDevices: false,
            autoLoadStatus: false,
        });

        expect(gateway).toBeInstanceOf(api.ShellyBluGatewayGen3);
        expect(gateway?.hasComponent('blugw')).toBe(true);
        expect(handler.request).toHaveBeenCalledWith('Shelly.GetComponents', {
            offset: 0,
            include: ['status', 'config'],
        });
    });
});
