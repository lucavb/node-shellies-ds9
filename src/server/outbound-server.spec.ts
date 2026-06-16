import '../devices';
import WebSocket, { WebSocketServer } from 'ws';

import { bootstrapOutboundConnection } from './connection';
import { ShellyOutboundServer } from './outbound-server';

const DEVICE_ID = 'shellyplus1-abc123';
const DEVICE_INFO = {
    id: DEVICE_ID,
    mac: 'ABC123',
    model: 'SNSW-001X16EU',
    gen: 2,
    fw_id: 'test-fw',
    ver: '1.0.0',
    app: 'Plus1',
    auth_en: false,
    auth_domain: null,
    discoverable: true,
};

function sendNotifyFullStatus(socket: WebSocket, clientId = 'server-client'): void {
    socket.send(
        JSON.stringify({
            src: DEVICE_ID,
            dst: clientId,
            method: 'NotifyFullStatus',
            params: {
                ts: 1,
                sys: { mac: 'ABC123', uptime: 5 },
                'switch:0': { id: 0, output: false },
            },
        }),
    );
}

function mockDeviceResponses(socket: WebSocket, clientId: string): void {
    socket.on('message', (data) => {
        const frame = JSON.parse(data.toString());

        if (frame.method === 'Shelly.GetDeviceInfo') {
            socket.send(
                JSON.stringify({
                    id: frame.id,
                    src: DEVICE_ID,
                    dst: clientId,
                    result: DEVICE_INFO,
                }),
            );
        }
    });
}

describe('bootstrapOutboundConnection', () => {
    it('bootstraps a device from NotifyFullStatus and GetDeviceInfo', async () => {
        const wss = new WebSocketServer({ port: 0 });
        await new Promise<void>((resolve) => wss.once('listening', resolve));
        const address = wss.address();
        const port = typeof address === 'object' && address ? address.port : 0;

        const bootstrapPromise = new Promise<Awaited<ReturnType<typeof bootstrapOutboundConnection>>>(
            (resolve, reject) => {
                wss.once('connection', (serverSocket) => {
                    bootstrapOutboundConnection(serverSocket, {
                        rpc: { clientId: 'server-client', requestTimeout: 2, pingInterval: 0 },
                        genericDevices: false,
                    })
                        .then(resolve)
                        .catch(reject);
                });
            },
        );

        const client = new WebSocket(`ws://127.0.0.1:${port}`);
        await new Promise<void>((resolve) => client.once('open', resolve));

        mockDeviceResponses(client, 'server-client');
        sendNotifyFullStatus(client);

        const { device, handler } = await bootstrapPromise;

        expect(device.id).toBe(DEVICE_ID);
        expect(device.model).toBe('SNSW-001X16EU');
        expect(handler.connected).toBe(true);

        await handler.destroy();
        client.close();
        await new Promise<void>((resolve) => wss.close(() => resolve()));
    });

    it('seeds component status from NotifyFullStatus', async () => {
        const wss = new WebSocketServer({ port: 0 });
        await new Promise<void>((resolve) => wss.once('listening', resolve));
        const address = wss.address();
        const port = typeof address === 'object' && address ? address.port : 0;

        const bootstrapPromise = new Promise<Awaited<ReturnType<typeof bootstrapOutboundConnection>>>(
            (resolve, reject) => {
                wss.once('connection', (serverSocket) => {
                    bootstrapOutboundConnection(serverSocket, {
                        rpc: { clientId: 'server-client', requestTimeout: 2, pingInterval: 0 },
                        genericDevices: false,
                    })
                        .then(resolve)
                        .catch(reject);
                });
            },
        );

        const client = new WebSocket(`ws://127.0.0.1:${port}`);
        await new Promise<void>((resolve) => client.once('open', resolve));

        mockDeviceResponses(client, 'server-client');
        sendNotifyFullStatus(client);

        const { device, handler } = await bootstrapPromise;

        expect(device.switch0.output).toBe(false);

        await handler.destroy();
        client.close();
        await new Promise<void>((resolve) => wss.close(() => resolve()));
    });
});

describe('ShellyOutboundServer', () => {
    let server: ShellyOutboundServer;

    afterEach(async () => {
        if (server?.listening) {
            await server.close();
        }
    });

    it('emits device when a Shelly connects', async () => {
        server = new ShellyOutboundServer({
            port: 0,
            path: '/rpc',
            genericDevices: false,
            rpc: { clientId: 'server-client', requestTimeout: 2, pingInterval: 0 },
        });
        await server.listen();

        const address = (server as unknown as { httpServer: { address: () => { port: number } } }).httpServer.address();
        const port = address.port;

        const devicePromise = new Promise((resolve) => {
            server.once('device', resolve);
        });

        const client = new WebSocket(`ws://127.0.0.1:${port}/rpc`, 'json-rpc');
        await new Promise<void>((resolve) => client.once('open', resolve));

        mockDeviceResponses(client, 'server-client');
        sendNotifyFullStatus(client, 'server-client');

        const device = await devicePromise;
        expect(device).toBeDefined();
        expect(server.size).toBe(1);

        client.close();
    });

    it('filters connections by path', async () => {
        server = new ShellyOutboundServer({ port: 0, path: '/shelly' });
        await server.listen();

        const address = (server as unknown as { httpServer: { address: () => { port: number } } }).httpServer.address();
        const port = address.port;

        const deviceHandler = vi.fn();
        server.on('device', deviceHandler);

        await expect(
            new Promise<void>((resolve, reject) => {
                const wrongPath = new WebSocket(`ws://127.0.0.1:${port}/rpc`, 'json-rpc');
                wrongPath.once('error', () => resolve());
                wrongPath.once('open', () => reject(new Error('Unexpected connection on wrong path')));
            }),
        ).resolves.toBeUndefined();

        expect(deviceHandler).not.toHaveBeenCalled();
    });

    it('returns the same promise for concurrent listen calls', async () => {
        server = new ShellyOutboundServer({ port: 0, path: '/rpc' });

        const first = server.listen();
        const second = server.listen();

        expect(first).toBe(second);

        await first;
        expect(server.listening).toBe(true);
    });

    it('does not emit spurious disconnect for superseded in-flight bootstraps', async () => {
        server = new ShellyOutboundServer({
            port: 0,
            path: '/rpc',
            genericDevices: false,
            rpc: { clientId: 'server-client', requestTimeout: 2, pingInterval: 0 },
        });
        await server.listen();

        const address = (server as unknown as { httpServer: { address: () => { port: number } } }).httpServer.address();
        const port = address.port;

        const disconnectHandler = vi.fn();
        server.on('disconnect', disconnectHandler);

        const client1 = new WebSocket(`ws://127.0.0.1:${port}/rpc`, 'json-rpc');
        await new Promise<void>((resolve) => client1.once('open', resolve));

        client1.on('message', (data) => {
            const frame = JSON.parse(data.toString());
            if (frame.method === 'Shelly.GetDeviceInfo') {
                setTimeout(() => {
                    client1.send(
                        JSON.stringify({
                            id: frame.id,
                            src: DEVICE_ID,
                            dst: 'server-client',
                            result: DEVICE_INFO,
                        }),
                    );
                }, 100);
            }
        });

        sendNotifyFullStatus(client1, 'server-client');

        const client2 = new WebSocket(`ws://127.0.0.1:${port}/rpc`, 'json-rpc');
        await new Promise<void>((resolve) => client2.once('open', resolve));
        mockDeviceResponses(client2, 'server-client');
        sendNotifyFullStatus(client2, 'server-client');

        const device = await new Promise((resolve) => server.once('device', resolve));
        expect(device).toBeDefined();
        expect(server.size).toBe(1);
        expect(disconnectHandler).not.toHaveBeenCalled();

        client1.close();
        client2.close();
    });

    it('emits disconnect when a device reconnects', async () => {
        server = new ShellyOutboundServer({
            port: 0,
            path: '/rpc',
            genericDevices: false,
            rpc: { clientId: 'server-client', requestTimeout: 2, pingInterval: 0 },
        });
        await server.listen();

        const address = (server as unknown as { httpServer: { address: () => { port: number } } }).httpServer.address();
        const port = address.port;

        const connectDevice = async () => {
            const client = new WebSocket(`ws://127.0.0.1:${port}/rpc`, 'json-rpc');
            await new Promise<void>((resolve) => client.once('open', resolve));
            mockDeviceResponses(client, 'server-client');
            sendNotifyFullStatus(client, 'server-client');
            return client;
        };

        const firstDevicePromise = new Promise((resolve) => server.once('device', resolve));
        const client1 = await connectDevice();
        await firstDevicePromise;

        const disconnectPromise = new Promise<[string, number, string]>((resolve) => {
            server.once('disconnect', (id, code, reason) => resolve([id, code, reason]));
        });

        const secondDevicePromise = new Promise((resolve) => server.once('device', resolve));
        const client2 = await connectDevice();
        await secondDevicePromise;

        const [deviceId, code] = await disconnectPromise;
        expect(deviceId).toBe(DEVICE_ID);
        expect(code).toBe(1000);
        expect(server.size).toBe(1);

        client1.close();
        client2.close();
    });
});
