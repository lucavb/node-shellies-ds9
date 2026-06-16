import WebSocket from 'ws';

import { createDeviceFromInfo } from '../internal/create-device';
import { Device, DeviceId } from '../devices';
import {
    DEFAULT_OUTBOUND_WEBSOCKET_RPC_HANDLER_OPTIONS,
    OutboundWebSocketRpcHandler,
    OutboundWebSocketRpcHandlerOptions,
} from '../rpc/outbound-websocket';
import { RpcStatusNotification } from '../rpc';
import { ShellyDeviceInfo } from '../services';

/**
 * Options for bootstrapping an outbound WebSocket connection.
 */
export interface OutboundConnectionOptions {
    /**
     * Outbound RPC handler options.
     */
    rpc?: Partial<OutboundWebSocketRpcHandlerOptions>;
    /**
     * Whether the status should be loaded when no NotifyFullStatus was received.
     */
    autoLoadStatus?: boolean;
    /**
     * Whether the config should be loaded automatically.
     */
    autoLoadConfig?: boolean;
    /**
     * Whether unrecognized Gen2+ models should be created as generic devices.
     */
    genericDevices?: boolean;
    /**
     * Maximum time in milliseconds to wait for the first JSON-RPC frame from the device.
     * Does not cover subsequent RPC calls during bootstrap (those use `rpc.requestTimeout`).
     */
    firstFrameTimeout?: number;
    /**
     * Called once the device ID is known from the first frame. Used to supersede
     * any prior in-flight bootstrap for the same device.
     */
    onDeviceSrcKnown?: (deviceId: DeviceId, socket: WebSocket) => void;
}

const DEFAULT_FIRST_FRAME_TIMEOUT = 30_000;

export interface OutboundConnectionResult {
    device: Device;
    handler: OutboundWebSocketRpcHandler;
}

interface ParsedFrame {
    src?: string;
    method?: string;
    params?: RpcStatusNotification;
    id?: number | string;
}

/**
 * Waits for the first JSON-RPC frame from a connected device socket.
 */
function waitForFirstFrame(socket: WebSocket, timeoutMs: number): Promise<ParsedFrame> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Timed out waiting for first message from device'));
        }, timeoutMs);

        const onMessage = (data: WebSocket.RawData) => {
            cleanup();
            try {
                resolve(JSON.parse(data.toString()) as ParsedFrame);
            } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        };

        const onClose = () => {
            cleanup();
            reject(new Error('Connection closed before first message'));
        };

        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };

        const cleanup = () => {
            clearTimeout(timer);
            socket.off('message', onMessage);
            socket.off('close', onClose);
            socket.off('error', onError);
        };

        socket.on('message', onMessage);
        socket.once('close', onClose);
        socket.once('error', onError);
    });
}

/**
 * Bootstraps a device connection: learns device ID, fetches device info, and creates a Device instance.
 */
export async function bootstrapOutboundConnection(
    socket: WebSocket,
    options: OutboundConnectionOptions = {},
): Promise<OutboundConnectionResult> {
    const timeoutMs = options.firstFrameTimeout ?? DEFAULT_FIRST_FRAME_TIMEOUT;
    const firstFrame = await waitForFirstFrame(socket, timeoutMs);

    const deviceSrc = firstFrame.src;
    if (!deviceSrc) {
        throw new Error('First message from device is missing src field');
    }

    options.onDeviceSrcKnown?.(deviceSrc, socket);

    const rpcOptions: OutboundWebSocketRpcHandlerOptions = {
        ...DEFAULT_OUTBOUND_WEBSOCKET_RPC_HANDLER_OPTIONS,
        ...(options.rpc || {}),
    };

    const handler = new OutboundWebSocketRpcHandler(socket, deviceSrc, rpcOptions);

    let seedStatus: RpcStatusNotification | null = null;
    if (firstFrame.method === 'NotifyFullStatus' && firstFrame.params) {
        seedStatus = firstFrame.params;
    }

    const info = await handler.request<ShellyDeviceInfo>('Shelly.GetDeviceInfo');

    if (info.id.toLowerCase() !== deviceSrc.toLowerCase()) {
        await handler.destroy();
        throw new Error(`Unexpected device ID (returned: ${info.id}, expected: ${deviceSrc})`);
    }

    const device = await createDeviceFromInfo(info, handler, {
        autoLoadStatus: seedStatus ? false : options.autoLoadStatus,
        autoLoadConfig: options.autoLoadConfig,
        genericDevices: options.genericDevices ?? true,
        seedStatus,
    });

    if (device === null) {
        await handler.destroy();
        throw new Error(`Unrecognized device model: ${info.model}`);
    }

    return { device, handler };
}
