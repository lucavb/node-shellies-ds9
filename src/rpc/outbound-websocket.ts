import { JSONRPCClient, JSONRPCResponse } from 'json-rpc-2.0';
import WebSocket from 'ws';

import { RpcHandler, RpcEventNotification, RpcParams, RpcStatusNotification } from './base';

/**
 * Options for the outbound WebSocket RPC handler.
 */
export interface OutboundWebSocketRpcHandlerOptions {
    /**
     * A unique ID used to identify this server when communicating with the Shelly device.
     */
    clientId: string;
    /**
     * The time, in seconds, to wait for a response before a request is aborted.
     */
    requestTimeout: number;
    /**
     * The interval, in seconds, at which ping requests should be made to verify that the connection is open.
     * Set to `0` to disable.
     */
    pingInterval: number;
}

/**
 * Default options for outbound WebSocket RPC handlers.
 */
export const DEFAULT_OUTBOUND_WEBSOCKET_RPC_HANDLER_OPTIONS: Readonly<OutboundWebSocketRpcHandlerOptions> = {
    clientId: 'node-shellies-ds9-server-' + Math.round(Math.random() * 1000000),
    requestTimeout: 10,
    pingInterval: 60,
};

/**
 * Handles JSON-RPC over an inbound WebSocket connection from a Shelly device (outbound WS channel).
 */
export class OutboundWebSocketRpcHandler extends RpcHandler {
    /**
     * Handles parsing of JSON RPC requests and responses.
     */
    protected readonly client: JSONRPCClient;

    /**
     * Timeout used to send periodic ping requests.
     */
    protected timeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Event handlers bound to `this`.
     */
    protected readonly messageHandler = this.handleMessage.bind(this);
    protected readonly closeHandler = this.handleClose.bind(this);
    protected readonly pongHandler = this.handlePong.bind(this);
    protected readonly errorHandler = this.handleError.bind(this);

    /**
     * @param socket - The inbound WebSocket connection from the device.
     * @param deviceSrc - The device ID (`src` field used by the device).
     * @param options - Configuration options for this handler.
     */
    constructor(
        protected readonly socket: WebSocket,
        readonly deviceSrc: string,
        readonly options: OutboundWebSocketRpcHandlerOptions,
    ) {
        super('outbound-websocket');

        this.client = new JSONRPCClient((req: RpcParams): Promise<void> => this.sendRequest(req));

        this.socket
            .on('message', this.messageHandler)
            .on('close', this.closeHandler)
            .on('pong', this.pongHandler)
            .on('error', this.errorHandler);

        this.schedulePing();
    }

    get connected(): boolean {
        return this.socket.readyState === WebSocket.OPEN;
    }

    request<T>(method: string, params?: RpcParams): PromiseLike<T> {
        this.emit('request', method, params);

        return this.client.timeout(this.options.requestTimeout * 1000).request(method, params);
    }

    destroy(): PromiseLike<void> {
        this.clearTimeout();
        this.client.rejectAllPendingRequests('Connection closed');

        this.socket
            .off('message', this.messageHandler)
            .off('close', this.closeHandler)
            .off('pong', this.pongHandler)
            .off('error', this.errorHandler);

        return this.disconnect();
    }

    /**
     * Closes the socket and waits until it is fully disconnected.
     */
    protected disconnect(): Promise<void> {
        switch (this.socket.readyState) {
            case WebSocket.OPEN:
            case WebSocket.CONNECTING:
                this.socket.close(1000, 'Server shutdown');
            // fall through

            case WebSocket.CLOSING:
                return this.awaitDisconnect();

            default:
                return Promise.resolve();
        }
    }

    /**
     * Returns a Promise that will be fulfilled once the socket is disconnected.
     */
    protected awaitDisconnect(): Promise<void> {
        const s = this.socket;

        if (s.readyState === WebSocket.CLOSED) {
            return Promise.resolve();
        } else if (s.readyState !== WebSocket.CLOSING) {
            return Promise.reject(new Error('WebSocket is not disconnecting'));
        }

        return new Promise((resolve) => {
            s.once('close', resolve);
        });
    }

    /**
     * Processes a JSON-RPC frame received from the device.
     * @param frame - The parsed JSON-RPC frame.
     */
    processFrame(frame: RpcParams): void {
        this.dispatchFrame(frame);
    }

    /**
     * Sends a request over the websocket.
     * @param payload - The request payload.
     */
    protected sendRequest(payload: RpcParams): Promise<void> {
        const data = { src: this.options.clientId, dst: this.deviceSrc, ...payload };

        return new Promise((resolve, reject) => {
            this.socket.send(JSON.stringify(data), (error?: Error) => {
                if (!error) {
                    resolve();
                } else {
                    reject(error);
                }
            });
        });
    }

    /**
     * Sends a JSON-RPC error response for device-initiated RPC requests.
     */
    protected sendNotImplementedResponse(frame: RpcParams): void {
        if (frame.id === undefined) {
            return;
        }

        const response = {
            id: frame.id,
            src: this.options.clientId,
            dst: this.deviceSrc,
            error: { code: -32601, message: 'Method not found' },
        };

        this.socket.send(JSON.stringify(response), (error?: Error) => {
            if (error) {
                this.emit('error', error);
            }
        });
    }

    /**
     * Schedules the next ping.
     */
    protected schedulePing(): void {
        if (this.options.pingInterval <= 0 || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.clearTimeout();
        this.timeout = setTimeout(() => this.sendPing(), this.options.pingInterval * 1000);
    }

    /**
     * Sends a ping over the websocket.
     */
    protected sendPing(): void {
        if (this.options.pingInterval <= 0 || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.clearTimeout();

        this.socket.ping((error?: Error) => {
            if (error) {
                this.emit('error', error);
            }
        });

        this.timeout = setTimeout(() => {
            this.socket.terminate();
        }, this.options.requestTimeout * 1000);
    }

    /**
     * Clears any currently pending timeout.
     */
    protected clearTimeout(): void {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    /**
     * Handles incoming messages.
     * @param data - The message data, as a JSON encoded string.
     */
    protected handleMessage(data: WebSocket.RawData): void {
        try {
            const frame = JSON.parse(data.toString()) as RpcParams;
            this.dispatchFrame(frame);
        } catch (e) {
            this.emit('error', e instanceof Error ? e : new Error(String(e)));
        }
    }

    /**
     * Dispatches a parsed JSON-RPC frame.
     */
    protected dispatchFrame(frame: RpcParams): void {
        const method = frame.method as string | undefined;

        if (method === 'NotifyStatus' || method === 'NotifyFullStatus') {
            this.emit('statusUpdate', frame.params as RpcStatusNotification);
            return;
        }

        if (method === 'NotifyEvent') {
            this.emit('event', frame.params as RpcEventNotification);
            return;
        }

        if (method !== undefined && frame.id !== undefined) {
            this.sendNotImplementedResponse(frame);
            return;
        }

        if (frame.id !== undefined) {
            this.client.receive(frame as unknown as JSONRPCResponse);
        }
    }

    /**
     * Handles 'close' events from the socket.
     */
    protected handleClose(code: number, reason: Buffer): void {
        this.clearTimeout();
        this.client.rejectAllPendingRequests('Connection closed');
        this.emit('disconnect', code, reason.toString(), null);
    }

    /**
     * Handles pongs received from the device.
     */
    protected handlePong(): void {
        this.clearTimeout();
        this.schedulePing();
    }

    /**
     * Handles errors from the websocket.
     */
    protected handleError(error: Error): void {
        this.emit('error', error);
    }
}
