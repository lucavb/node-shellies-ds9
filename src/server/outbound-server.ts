import EventEmitter from 'eventemitter3';
import http from 'http';
import https from 'https';
import WebSocket, { WebSocketServer } from 'ws';

import { Device, DeviceId } from '../devices';
import { bootstrapOutboundConnection, OutboundConnectionOptions } from './connection';
import { OutboundWebSocketRpcHandler, OutboundWebSocketRpcHandlerOptions } from '../rpc/outbound-websocket';

/**
 * TLS configuration for the outbound WebSocket server.
 */
export interface ShellyOutboundServerTlsOptions {
    cert: string | Buffer;
    key: string | Buffer;
    ca?: string | Buffer;
}

/**
 * Configuration options for {@link ShellyOutboundServer}.
 */
export interface ShellyOutboundServerOptions {
    /**
     * The TCP port to listen on.
     */
    port: number;
    /**
     * The host address to bind to.
     */
    host?: string;
    /**
     * The WebSocket path devices connect to.
     */
    path?: string;
    /**
     * TLS options. When set, the server listens for `wss://` connections.
     */
    tls?: ShellyOutboundServerTlsOptions;
    /**
     * Outbound RPC handler options.
     */
    rpc?: Partial<OutboundWebSocketRpcHandlerOptions>;
    /**
     * Whether the status should be loaded when no NotifyFullStatus was received.
     */
    autoLoadStatus?: boolean;
    /**
     * Whether the config should be loaded automatically for connected devices.
     */
    autoLoadConfig?: boolean;
    /**
     * Whether unrecognized Gen2+ models should be created as generic devices.
     */
    genericDevices?: boolean;
}

type ShellyOutboundServerEvents = {
    /**
     * Emitted when a device connection has been bootstrapped and is ready to use.
     */
    device: (device: Device) => void;
    /**
     * Emitted when a device disconnects.
     */
    disconnect: (deviceId: DeviceId, code: number, reason: string) => void;
    /**
     * Emitted when an error occurs.
     */
    error: (deviceId: DeviceId | null, error: Error) => void;
};

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PATH = '/rpc';

/**
 * WebSocket server that accepts outbound connections from Shelly Gen2+ devices.
 */
export class ShellyOutboundServer extends EventEmitter<ShellyOutboundServerEvents> {
    protected readonly options: Required<
        Pick<
            ShellyOutboundServerOptions,
            'port' | 'host' | 'path' | 'autoLoadStatus' | 'autoLoadConfig' | 'genericDevices'
        >
    > &
        ShellyOutboundServerOptions;

    protected httpServer: http.Server | https.Server | null = null;
    protected wss: WebSocketServer | null = null;
    protected readonly devices = new Map<DeviceId, Device>();
    protected readonly handlers = new Map<DeviceId, OutboundWebSocketRpcHandler>();
    protected readonly pendingBootstraps = new Map<DeviceId, WebSocket>();
    private _listenPromise: Promise<void> | null = null;

    constructor(opts: ShellyOutboundServerOptions) {
        super();

        this.options = {
            host: DEFAULT_HOST,
            path: DEFAULT_PATH,
            autoLoadStatus: true,
            autoLoadConfig: false,
            genericDevices: true,
            ...opts,
        };
    }

    /**
     * The number of connected devices.
     */
    get size(): number {
        return this.devices.size;
    }

    /**
     * Whether the server is listening for connections.
     */
    get listening(): boolean {
        return this.httpServer !== null && this.httpServer.listening;
    }

    /**
     * Returns the device with the given ID, or `undefined` if not connected.
     */
    get(deviceId: DeviceId): Device | undefined {
        return this.devices.get(deviceId);
    }

    /**
     * Determines whether a device is connected.
     */
    has(deviceOrId: Device | DeviceId): boolean {
        const id = deviceOrId instanceof Device ? deviceOrId.id : deviceOrId;
        return this.devices.has(id);
    }

    /**
     * Returns an iterator over connected devices.
     */
    [Symbol.iterator](): IterableIterator<Device> {
        return this.devices.values();
    }

    /**
     * Starts listening for device connections.
     */
    listen(): Promise<void> {
        if (this.listening) {
            return Promise.resolve();
        }

        if (this._listenPromise) {
            return this._listenPromise;
        }

        this._listenPromise = this.doListen().finally(() => {
            this._listenPromise = null;
        });

        return this._listenPromise;
    }

    /**
     * Creates the HTTP(S) server and WebSocket server, then begins listening.
     */
    protected doListen(): Promise<void> {
        if (this.options.tls) {
            this.httpServer = https.createServer({
                cert: this.options.tls.cert,
                key: this.options.tls.key,
                ca: this.options.tls.ca,
            });
        } else {
            this.httpServer = http.createServer();
        }

        const httpServer = this.httpServer;

        this.wss = new WebSocketServer({
            server: httpServer,
            path: this.options.path,
            handleProtocols: (protocols) => {
                if (protocols.has('json-rpc')) {
                    return 'json-rpc';
                }

                return false;
            },
        });

        this.wss.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        this.wss.on('error', (error) => {
            this.emit('error', null, error);
        });

        return new Promise((resolve, reject) => {
            httpServer.once('error', reject);
            httpServer.listen(this.options.port, this.options.host, () => {
                resolve();
            });
        });
    }

    /**
     * Stops the server and disconnects all devices.
     */
    async close(): Promise<void> {
        this.pendingBootstraps.clear();

        const closePromises: Promise<void>[] = [];

        for (const [, handler] of this.handlers) {
            closePromises.push(Promise.resolve(handler.destroy()));
        }

        this.handlers.clear();
        this.devices.clear();

        await Promise.all(closePromises);

        const wss = this.wss;
        if (wss) {
            await new Promise<void>((resolve) => {
                wss.close(() => resolve());
            });
            this.wss = null;
        }

        const httpServer = this.httpServer;
        if (httpServer) {
            await new Promise<void>((resolve, reject) => {
                httpServer.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            this.httpServer = null;
        }
    }

    /**
     * Handles a new WebSocket connection from a device.
     */
    protected handleConnection(socket: WebSocket): void {
        const connectionOptions: OutboundConnectionOptions = {
            rpc: this.options.rpc,
            autoLoadStatus: this.options.autoLoadStatus,
            autoLoadConfig: this.options.autoLoadConfig,
            genericDevices: this.options.genericDevices,
            onDeviceSrcKnown: (deviceId, currentSocket) => {
                const prior = this.pendingBootstraps.get(deviceId);
                if (prior && prior !== currentSocket) {
                    prior.close(1000, 'Replaced by new connection');
                }

                this.pendingBootstraps.set(deviceId, currentSocket);
            },
        };

        bootstrapOutboundConnection(socket, connectionOptions)
            .then(({ device, handler }) => {
                if (this.pendingBootstraps.get(device.id) !== socket) {
                    void handler.destroy();
                    return;
                }

                this.pendingBootstraps.delete(device.id);
                this.registerDevice(device, handler);
            })
            .catch((error: Error) => {
                this.emit('error', null, error);

                if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                    socket.close(1011, 'Bootstrap failed');
                }
            })
            .finally(() => {
                for (const [deviceId, pendingSocket] of this.pendingBootstraps) {
                    if (pendingSocket === socket) {
                        this.pendingBootstraps.delete(deviceId);
                    }
                }
            });
    }

    /**
     * Registers a bootstrapped device with this server.
     */
    protected registerDevice(device: Device, handler: OutboundWebSocketRpcHandler): void {
        const deviceId = device.id;

        if (this.devices.has(deviceId)) {
            this.removeDevice(deviceId, 1000, 'Replaced by new connection', true);
        }

        this.devices.set(deviceId, device);
        this.handlers.set(deviceId, handler);

        handler.on('disconnect', (code, reason) => {
            if (this.handlers.get(deviceId) === handler) {
                this.removeDevice(deviceId, code, reason, true);
            }
        });

        handler.on('error', (error) => {
            this.emit('error', deviceId, error);
        });

        this.emit('device', device);
    }

    /**
     * Removes a device from the registry.
     */
    protected removeDevice(deviceId: DeviceId, code: number, reason: string, emitDisconnect: boolean): void {
        const handler = this.handlers.get(deviceId);
        if (handler) {
            handler.removeAllListeners('disconnect');
            handler.removeAllListeners('error');
            this.handlers.delete(deviceId);
        }

        if (this.devices.delete(deviceId) && emitDisconnect) {
            this.emit('disconnect', deviceId, code, reason);
        }
    }
}
