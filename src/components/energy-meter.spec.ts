import { Device } from '../devices/base';
import { RpcHandler } from '../rpc';
import { EM, EM1, EM1Data, EM1DataConfig, EMData, EMDataConfig } from './energy-meter';

class TestRpcHandler extends RpcHandler {
    connected = true;
    request = vi.fn().mockResolvedValue({});
    destroy = vi.fn().mockResolvedValue(undefined);

    constructor() {
        super('test');
    }
}

class TestDevice extends Device {
    constructor(readonly handler = new TestRpcHandler()) {
        super({ id: 'meter', mac: '00:00:00:00:00:01' }, handler);
    }
}

describe('energy meter components', () => {
    test('uses exact RPC namespaces and component IDs', async () => {
        const device = new TestDevice();
        const em = new EM(device, 2);
        const em1 = new EM1(device, 1);
        const emdata = new EMData(device, 2);
        const em1data = new EM1Data(device, 1);
        const emdataConfig: EMDataConfig = await emdata.getConfig();
        const em1dataConfig: EM1DataConfig = await em1data.getConfig();

        await em.getStatus();
        await em.getConfig();
        await em1.getStatus();
        await emdata.getStatus();
        await em1data.getStatus();

        expect(emdataConfig).toEqual({});
        expect(em1dataConfig).toEqual({});
        expect(device.handler.request).toHaveBeenNthCalledWith(1, 'EMData.GetConfig', { id: 2 });
        expect(device.handler.request).toHaveBeenNthCalledWith(2, 'EM1Data.GetConfig', { id: 1 });
        expect(device.handler.request).toHaveBeenNthCalledWith(3, 'EM.GetStatus', { id: 2 });
        expect(device.handler.request).toHaveBeenNthCalledWith(4, 'EM.GetConfig', { id: 2 });
        expect(device.handler.request).toHaveBeenNthCalledWith(5, 'EM1.GetStatus', { id: 1 });
        expect(device.handler.request).toHaveBeenNthCalledWith(6, 'EMData.GetStatus', { id: 2 });
        expect(device.handler.request).toHaveBeenNthCalledWith(7, 'EM1Data.GetStatus', { id: 1 });
    });

    test('updates documented measurement and energy fields and emits changes', () => {
        const device = new TestDevice();
        const em = new EM(device);
        const em1 = new EM1(device, 2);
        const data = new EM1Data(device, 2);
        const changes = vi.fn();
        em.on('change', changes);

        em.update({ id: 0, a_voltage: 230.4, total_act_power: -26.2 });
        em.update({ a_voltage: null });
        em1.update({ id: 2, voltage: 231, act_power: 85, freq: null });
        data.update({ id: 2, total_act_energy: 12345.6, total_act_ret_energy: null });

        expect(em.a_voltage).toBeNull();
        expect(em.total_act_power).toBe(-26.2);
        expect(em1.act_power).toBe(85);
        expect(em1.freq).toBeNull();
        expect(data.total_act_energy).toBe(12345.6);
        expect(data.total_act_ret_energy).toBeNull();
        expect(changes).toHaveBeenCalledWith('a_voltage', 230.4);
        expect(changes).toHaveBeenCalledWith('a_voltage', null);
        expect(changes).toHaveBeenCalledWith('total_act_power', -26.2);
    });

    test('keeps imported and returned energy counters distinct', () => {
        const data = new EMData(new TestDevice());
        data.update({ id: 0, total_act: 500, total_act_ret: 23 });
        expect(data.total_act).toBe(500);
        expect(data.total_act_ret).toBe(23);
    });

    test('emits nullable scalar changes after all fields are updated', () => {
        const em = new EM(new TestDevice());
        em.update({ id: 0, a_voltage: 230, b_voltage: 220 });
        let voltageSeenByListener: number | null | undefined;
        em.on('change', (name) => {
            if (name === 'a_voltage') {
                voltageSeenByListener = em.b_voltage;
            }
        });

        em.update({ a_voltage: null, b_voltage: 231 });

        expect(em.a_voltage).toBeNull();
        expect(voltageSeenByListener).toBe(231);
    });

    test('replaces energy-meter array characteristics instead of merging stale entries', () => {
        const em = new EM(new TestDevice());
        const change = vi.fn();
        em.on('change:errors', change);

        em.update({ errors: ['voltage', 'current', 'power'] });
        em.update({ errors: ['current'] });
        expect(em.errors).toEqual(['current']);
        expect(change).toHaveBeenCalledTimes(2);

        em.update({ errors: ['current'] });
        expect(change).toHaveBeenCalledTimes(2);
    });
});
