import { Device } from '../devices';
import { GenericDevice, isGenericDevice } from '../devices/generic';
import { RpcHandler, RpcStatusNotification } from '../rpc';
import { ShellyDeviceInfo } from '../services';

/**
 * Options for {@link createDeviceFromInfo}.
 */
export interface CreateDeviceOptions {
    /**
     * Whether the status should be loaded automatically when no seed status is provided.
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
     * Initial status from a buffered NotifyFullStatus notification.
     */
    seedStatus?: RpcStatusNotification | null;
}

/**
 * Applies a status notification payload to a device's components.
 */
export function applyStatusNotification(device: Device, update: RpcStatusNotification): void {
    for (const cmpnt in update) {
        if (
            cmpnt !== 'ts' &&
            Object.prototype.hasOwnProperty.call(update, cmpnt) &&
            update[cmpnt] !== null &&
            typeof update[cmpnt] === 'object'
        ) {
            device.getComponent(cmpnt)?.update(update[cmpnt] as Record<string, unknown>);
        }
    }
}

/**
 * Creates a device instance from Shelly.GetDeviceInfo response data.
 * @returns The device, or `null` if the model is unknown and generic devices are disabled.
 */
export async function createDeviceFromInfo(
    info: ShellyDeviceInfo,
    rpcHandler: RpcHandler,
    options: CreateDeviceOptions = {},
): Promise<Device | null> {
    const cls = Device.getClass(info.model ?? '');
    let device: Device;

    if (cls !== undefined) {
        device = new cls(info, rpcHandler);
    } else if (options.genericDevices && info.gen >= 2) {
        device = await GenericDevice.create(info, rpcHandler);
    } else {
        return null;
    }

    if (!isGenericDevice(device)) {
        await device.discoverAddonComponents(options.seedStatus ?? undefined);
    }

    if (options.seedStatus) {
        applyStatusNotification(device, options.seedStatus);
    } else if (options.autoLoadStatus !== false) {
        await device.loadStatus();
    }

    if (options.autoLoadConfig === true) {
        await device.loadConfig();
    }

    return device;
}
