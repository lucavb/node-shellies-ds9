import WebSocket, { WebSocketServer } from 'ws';

import { OutboundWebSocketRpcHandler, DEFAULT_OUTBOUND_WEBSOCKET_RPC_HANDLER_OPTIONS } from './outbound-websocket';

const DEVICE_ID = 'shellyplus1-abc123';
const CLIENT_ID = 'test-server-client';

function createPair(): Promise<{ serverSocket: WebSocket; clientSocket: WebSocket; wss: WebSocketServer }> {
    return new Promise((resolve, reject) => {
        const wss = new WebSocketServer({
            port: 0,
            handleProtocols: (protocols) => (protocols.has('json-rpc') ? 'json-rpc' : false),
        });

        wss.on('listening', () => {
            const address = wss.address();
            const port = typeof address === 'object' && address ? address.port : 0;

            const clientSocket = new WebSocket(`ws://127.0.0.1:${port}`, 'json-rpc');

            wss.once('connection', (serverSocket) => {
                resolve({ serverSocket, clientSocket, wss });
            });

            clientSocket.once('error', reject);
        });

        wss.on('error', reject);
    });
}

describe('OutboundWebSocketRpcHandler', () => {
    let wss: WebSocketServer;
    let serverSocket: WebSocket;
    let clientSocket: WebSocket;
    let handler: OutboundWebSocketRpcHandler;

    beforeEach(async () => {
        ({ serverSocket, clientSocket, wss } = await createPair());
        await new Promise<void>((resolve) => clientSocket.once('open', resolve));

        handler = new OutboundWebSocketRpcHandler(serverSocket, DEVICE_ID, {
            ...DEFAULT_OUTBOUND_WEBSOCKET_RPC_HANDLER_OPTIONS,
            clientId: CLIENT_ID,
            requestTimeout: 2,
            pingInterval: 0,
        });
    });

    afterEach(async () => {
        await handler.destroy();
        clientSocket.close();
        await new Promise<void>((resolve) => wss.close(() => resolve()));
    });

    it('is connected when the socket is open', () => {
        expect(handler.connected).toBe(true);
    });

    it('sends requests with src and dst', async () => {
        let sentFrame: Record<string, unknown> | undefined;

        clientSocket.on('message', (data) => {
            const frame = JSON.parse(data.toString()) as Record<string, unknown>;
            sentFrame = frame;

            if (frame.method === 'Switch.GetStatus') {
                clientSocket.send(
                    JSON.stringify({
                        id: frame.id,
                        src: DEVICE_ID,
                        dst: CLIENT_ID,
                        result: { output: true },
                    }),
                );
            }
        });

        const result = await handler.request<{ output: boolean }>('Switch.GetStatus', { id: 0 });

        expect(sentFrame?.src).toBe(CLIENT_ID);
        expect(sentFrame?.dst).toBe(DEVICE_ID);
        expect(sentFrame?.method).toBe('Switch.GetStatus');
        expect(result.output).toBe(true);
    });

    it('emits statusUpdate for NotifyStatus notifications', async () => {
        const statusUpdate = vi.fn();
        handler.on('statusUpdate', statusUpdate);

        clientSocket.send(
            JSON.stringify({
                src: DEVICE_ID,
                dst: CLIENT_ID,
                method: 'NotifyStatus',
                params: { ts: 1, 'switch:0': { id: 0, output: true } },
            }),
        );

        await vi.waitFor(() => {
            expect(statusUpdate).toHaveBeenCalledWith({ ts: 1, 'switch:0': { id: 0, output: true } });
        });
    });

    it('emits statusUpdate for NotifyFullStatus notifications', async () => {
        const statusUpdate = vi.fn();
        handler.on('statusUpdate', statusUpdate);

        clientSocket.send(
            JSON.stringify({
                src: DEVICE_ID,
                dst: CLIENT_ID,
                method: 'NotifyFullStatus',
                params: { ts: 1, sys: { uptime: 10 } },
            }),
        );

        await vi.waitFor(() => {
            expect(statusUpdate).toHaveBeenCalledWith({ ts: 1, sys: { uptime: 10 } });
        });
    });

    it('emits event for NotifyEvent notifications', async () => {
        const eventHandler = vi.fn();
        handler.on('event', eventHandler);

        clientSocket.send(
            JSON.stringify({
                src: DEVICE_ID,
                dst: CLIENT_ID,
                method: 'NotifyEvent',
                params: {
                    ts: 1,
                    events: [{ component: 'input:0', id: 0, event: 'single_push', ts: 1 }],
                },
            }),
        );

        await vi.waitFor(() => {
            expect(eventHandler).toHaveBeenCalled();
        });
    });

    it('responds with not implemented for device-initiated RPC requests', async () => {
        const response = new Promise<Record<string, unknown>>((resolve) => {
            clientSocket.once('message', (data) => {
                resolve(JSON.parse(data.toString()));
            });
        });

        clientSocket.send(
            JSON.stringify({
                id: 99,
                src: DEVICE_ID,
                dst: CLIENT_ID,
                method: 'Server.DoSomething',
                params: {},
            }),
        );

        const frame = await response;
        expect(frame.error).toEqual({ code: -32601, message: 'Method not found' });
        expect(frame.dst).toBe(DEVICE_ID);
        expect(frame.src).toBe(CLIENT_ID);
    });

    it('destroy resolves after the socket is closed', async () => {
        const closed = vi.fn();
        serverSocket.once('close', closed);

        const destroyPromise = handler.destroy();

        expect(serverSocket.readyState).not.toBe(WebSocket.CLOSED);

        await destroyPromise;

        expect(closed).toHaveBeenCalled();
        expect(serverSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it('emits disconnect when the socket closes', async () => {
        const disconnect = vi.fn();
        handler.on('disconnect', disconnect);

        clientSocket.close();

        await vi.waitFor(() => {
            expect(disconnect).toHaveBeenCalled();
        });
    });
});

describe('WebSocketServer json-rpc subprotocol', () => {
    it('accepts connections with the json-rpc subprotocol', async () => {
        const { clientSocket, wss } = await createPair();
        await new Promise<void>((resolve) => clientSocket.once('open', resolve));

        expect(clientSocket.protocol).toBe('json-rpc');

        clientSocket.close();
        await new Promise<void>((resolve) => wss.close(() => resolve()));
    });
});
