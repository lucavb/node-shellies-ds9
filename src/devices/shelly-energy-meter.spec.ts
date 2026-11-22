import { Device } from './base';
import { RpcHandler } from '../rpc';
import { EM, EM1, EM1Data, EMData } from '../components/energy-meter';
import { Switch } from '../components/switch';
import { Temperature } from '../components/temperature';
import { Shelly3EM63Gen3, ShellyPro3EM } from './shelly-energy-meter';

class TestRpcHandler extends RpcHandler {
    connected = true;
    request = vi.fn().mockImplementation((method: string) => {
        if (method === 'Shelly.GetStatus') {
            return Promise.resolve({ 'em:0': { id: 0, a_voltage: 230 } });
        }
        if (method === 'Shelly.GetConfig') {
            return Promise.resolve({
                'temperature:0': { id: 0, name: 'Internal', report_thr_C: 1 },
            });
        }
        return Promise.resolve({});
    });
    destroy = vi.fn().mockResolvedValue(undefined);

    constructor() {
        super('test');
    }
}

const makeInfo = (profile?: string) => ({
    id: 'meter',
    mac: '00:00:00:00:00:01',
    ...(profile === undefined ? {} : { profile }),
});

describe('Shelly energy meter devices', () => {
    test('registers both precise model identifiers', () => {
        expect(Device.getClass('SPEM-003CEBEU')).toBe(ShellyPro3EM);
        expect(Device.getClass('S3EM-003CXCEU63')).toBe(Shelly3EM63Gen3);
        expect(ShellyPro3EM.modelName).toBe('Shelly Pro 3EM');
    });

    test.each([
        [ShellyPro3EM, 'triphase'],
        [ShellyPro3EM, 'monophase'],
        [Shelly3EM63Gen3, 'triphase'],
        [Shelly3EM63Gen3, 'monophase'],
    ] as const)('%s exposes built-in temperature in the %s profile', async (Meter, profile) => {
        const rpc = new TestRpcHandler();
        const meter = new Meter(makeInfo(profile), rpc);
        const profileStatus =
            profile === 'triphase'
                ? {
                      'em:0': { id: 0, a_voltage: 230.1, total_act_power: 42 },
                      'emdata:0': { id: 0, total_act: 1234.5 },
                  }
                : {
                      'em1:0': { id: 0, voltage: 230.1, act_power: 42 },
                      'em1data:0': { id: 0, total_act_energy: 1234.5 },
                  };

        // Fixture-like initial status includes the built-in temperature component
        // alongside each profile's documented meter components.
        meter.applyInitialStatus({
            ts: 10,
            ...profileStatus,
            'temperature:0': { id: 0, tC: 38.2, tF: 100.76 },
        });

        const temperature = meter.getComponent('temperature:0');
        expect(temperature).toBeInstanceOf(Temperature);
        expect(meter.temperature0).toBe(temperature);
        expect(meter.temperature0.tC).toBe(38.2);
        expect(meter.temperature0.tF).toBe(100.76);

        await meter.loadConfig();
        expect(meter.temperature0.config).toEqual({ id: 0, name: 'Internal', report_thr_C: 1 });

        rpc.emit('statusUpdate', {
            ts: 11,
            'temperature:0': { id: 0, tC: 39.1, tF: null },
        });
        expect(meter.temperature0.tC).toBe(39.1);
        expect(meter.temperature0.tF).toBeNull();
    });

    test.each([ShellyPro3EM, Shelly3EM63Gen3])('%s exposes only the triphase topology', (Meter) => {
        const meter = new Meter(makeInfo('triphase'), new TestRpcHandler());

        expect(meter.em).toBeInstanceOf(EM);
        expect(meter.emdata).toBeInstanceOf(EMData);
        expect(meter.getComponent('em:0')).toBe(meter.em);
        expect(meter.getComponent('emdata:0')).toBe(meter.emdata);
        expect(meter.em1).toBeUndefined();
        expect(meter.em1data).toBeUndefined();
        expect(meter.getComponent('em1:0')).toBeUndefined();
        expect(meter.switch0).toBeUndefined();
        expect(meter.hasComponent('switch:0')).toBe(false);
        if (Meter === Shelly3EM63Gen3) {
            expect(meter.ethernet).toBeUndefined();
            expect(meter.hasComponent('eth')).toBe(false);
        } else {
            expect(meter.ethernet).toBeDefined();
        }
    });

    test('builds the three monophase measurement and data channels', () => {
        const meter = new ShellyPro3EM(makeInfo('monophase'), new TestRpcHandler());

        expect(meter.em).toBeUndefined();
        expect(meter.emdata).toBeUndefined();
        expect(meter.em1?.map((component) => component.id)).toEqual([0, 1, 2]);
        expect(meter.em1data?.map((component) => component.id)).toEqual([0, 1, 2]);
        for (const id of [0, 1, 2]) {
            expect(meter.getComponent(`em1:${id}`)).toBeInstanceOf(EM1);
            expect(meter.getComponent(`em1data:${id}`)).toBeInstanceOf(EM1Data);
        }
        expect(meter.getComponent('em:0')).toBeUndefined();
    });

    test('does not invent a profile when the discovery info omits it', () => {
        const meter = new ShellyPro3EM(makeInfo(), new TestRpcHandler());
        expect(meter.profile).toBe('');
        expect(meter.em).toBeUndefined();
        expect(meter.emdata).toBeUndefined();
        expect(meter.em1).toBeUndefined();
        expect(meter.em1data).toBeUndefined();
    });

    test('infers monophase topology from live status when profile is missing or unknown', () => {
        for (const profile of [undefined, 'unrecognized']) {
            const rpc = new TestRpcHandler();
            const meter = new ShellyPro3EM(makeInfo(profile), rpc);

            rpc.emit('statusUpdate', {
                ts: 10,
                'em1:0': { id: 0, voltage: 229 },
                'em1:1': { id: 1, voltage: 230 },
                'em1data:2': { id: 2, total_act_energy: 456 },
            });

            expect(meter.getComponent('em1:0')).toBeInstanceOf(EM1);
            expect(meter.getComponent('em1:1')).toBeInstanceOf(EM1);
            expect(meter.getComponent('em1data:2')).toBeInstanceOf(EM1Data);
            expect(meter.em1?.[0].voltage).toBe(229);
            expect(meter.em1data?.[2].total_act_energy).toBe(456);
            expect(meter.getComponent('em:0')).toBeUndefined();
        }
    });

    test('discovers profile components and optional switch after component cache is built', () => {
        const meter = new ShellyPro3EM(makeInfo(), new TestRpcHandler());
        // Force the base component lookup map to be cached before discovery.
        expect(meter.hasComponent('em:0')).toBe(false);
        expect([...meter].some(([key]) => key === 'em:0')).toBe(false);

        meter.applyInitialStatus({
            ts: 10,
            'em:0': { id: 0, a_voltage: 231 },
            'emdata:0': { id: 0, total_act: 12 },
            'switch:0': { id: 0, output: true },
        });

        expect(meter.em?.a_voltage).toBe(231);
        expect(meter.emdata?.total_act).toBe(12);
        expect(meter.switch0?.output).toBe(true);
        expect(meter.getComponent('em:0')).toBe(meter.em);
        const keys = [...meter].map(([key]) => key);
        expect(keys.filter((key) => key === 'em:0')).toHaveLength(1);
        expect(keys.filter((key) => key === 'emdata:0')).toHaveLength(1);
        expect(keys.filter((key) => key === 'switch:0')).toHaveLength(1);
    });

    test('supports an optional Pro 3EM switch only after its status appears', async () => {
        const rpc = new TestRpcHandler();
        const meter = new ShellyPro3EM(makeInfo('triphase'), rpc);
        // A previous component lookup must not prevent later optional discovery.
        expect(meter.hasComponent('em:0')).toBe(true);
        expect(meter.hasComponent('switch:0')).toBe(false);

        rpc.emit('statusUpdate', { ts: 10, 'switch:0': { id: 0, output: true } });

        expect(meter.hasComponent('switch:0')).toBe(true);
        expect(meter.getComponent('switch:0')).toBeInstanceOf(Switch);
        expect((meter.getComponent('switch:0') as Switch).output).toBe(true);
        expect([...meter].filter(([key]) => key === 'switch:0')).toHaveLength(1);
    });

    test('switches topology on an unambiguous opposite-profile notification', () => {
        const rpc = new TestRpcHandler();
        const meter = new ShellyPro3EM(makeInfo('triphase'), rpc);
        const initialEm = meter.em;
        const mqtt = meter.mqtt;

        rpc.emit('statusUpdate', { ts: 1, 'switch:0': { id: 0, output: true } });
        const optionalSwitch = meter.switch0;
        rpc.emit('statusUpdate', { ts: 2, 'em1:2': { id: 2, voltage: 228 } });

        expect(meter.profile).toBe('triphase');
        expect(meter.meterProfile).toBe('monophase');
        expect(meter.em).toBeUndefined();
        expect(meter.emdata).toBeUndefined();
        expect(meter.hasComponent('em:0')).toBe(false);
        expect(meter.getComponent('em:0')).toBeUndefined();
        expect(initialEm).not.toBe(meter.em);
        expect(meter.em1?.[2].voltage).toBe(228);
        expect(meter.getComponent('em1:0')).toBeInstanceOf(EM1);
        expect(meter.switch0).toBe(optionalSwitch);
        expect(meter.mqtt).toBe(mqtt);

        const meterKeys = [...meter].map(([key]) => key).filter((key) => /^(?:em|emdata|em1|em1data):/.test(key));
        expect(meterKeys.sort()).toEqual(['em1:0', 'em1:1', 'em1:2', 'em1data:0', 'em1data:1', 'em1data:2']);

        const activeEm1 = meter.em1?.[2];
        rpc.emit('statusUpdate', { ts: 3, 'em1data:1': { id: 1, total_act_energy: 300 } });
        expect(meter.em1?.[2]).toBe(activeEm1);
        expect([...meter].filter(([key]) => key === 'em1:2')).toHaveLength(1);
    });

    test('does not switch topology on a mixed payload but seed status can switch it', () => {
        const meter = new ShellyPro3EM(makeInfo('triphase'), new TestRpcHandler());
        const initialEm = meter.em;

        meter.applyInitialStatus({
            ts: 1,
            'em:0': { id: 0, a_voltage: 230 },
            'em1:0': { id: 0, voltage: 230 },
        });
        expect(meter.meterProfile).toBe('triphase');
        expect(meter.em).toBe(initialEm);
        expect(meter.em1).toBeUndefined();

        meter.applyInitialStatus({ ts: 2, 'em1data:0': { id: 0, total_act_energy: 10 } });
        expect(meter.meterProfile).toBe('monophase');
        expect(meter.em).toBeUndefined();
        expect(meter.em1data?.[0].total_act_energy).toBe(10);
    });

    test('loads active profile components from status and routes exact component RPCs', async () => {
        const rpc = new TestRpcHandler();
        const meter = new ShellyPro3EM(makeInfo('triphase'), rpc);

        await meter.loadStatus();
        expect(meter.em?.a_voltage).toBe(230);
        await meter.em?.getStatus();
        expect(rpc.request).toHaveBeenCalledWith('Shelly.GetStatus', undefined);
        expect(rpc.request).toHaveBeenCalledWith('EM.GetStatus', { id: 0 });
    });
});
