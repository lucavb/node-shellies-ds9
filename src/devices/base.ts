import EventEmitter from 'eventemitter3';

import { Component, ComponentLike, System } from '../components';
import { collectAddonSensorKeys, isAddonSensorKey } from '../components/addon-sensors';
import { createComponent } from '../components/factory';
import { HttpService, KvsService, ScheduleService, ShellyService, WebhookService } from '../services';
import { RpcEventNotification, RpcHandler, RpcParams, RpcStatusNotification } from '../rpc';

export type DeviceId = string;

/**
 * Information about a device.
 */
export interface DeviceInfo {
    /**
     * The device ID.
     */
    id: DeviceId;
    /**
     * The MAC address of the device.
     */
    mac: string;
    /**
     * The model designation of the device.
     */
    model?: string;
    /**
     * Current firmware ID.
     */
    fw_id?: string;
    /**
     * Current firmware version.
     */
    ver?: string;
    /**
     * Current device profile.
     */
    profile?: string;
}

/**
 * Information about the firmware that a device is running.
 */
export interface DeviceFirmwareInfo {
    /**
     * The firmware ID.
     */
    id?: string;
    /**
     * The firmware version.
     */
    version?: string;
}

/**
 * Describes a device class and its static properties.
 */
export interface DeviceClass {
    new (info: DeviceInfo, rpcHandler: RpcHandler): Device;

    /**
     * The model designation of the device.
     */
    model: string;
    /**
     * A human-friendly name of the device model.
     */
    modelName: string;
}

/**
 * Property decorator used to label properties as components.
 * @param target - The prototype of the device class that the property belongs to.
 * @param propertyName - The name of the property.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const component = (target: any, propertyName: string) => {
    // make sure the given prototype has an array of properties
    if (!Object.prototype.hasOwnProperty.call(target, '_componentProps')) {
        target._componentProps = new Array<string>();
    }

    // get the array of properties
    const props: string[] = target._componentProps;

    // add this property to the array
    props.push(propertyName);
};

/**
 * Base class for all devices.
 */
export abstract class Device extends EventEmitter {
    /**
     * Holds all registered subclasses.
     */
    private static readonly subclasses = new Map<string, DeviceClass>();

    /**
     * Registers a device class, so that it can later be found based on its device model
     * using the `Device.getClass()` method.
     * @param cls - A subclass of `Device`.
     */
    static registerClass(cls: DeviceClass) {
        const model = cls.model.toUpperCase();
        // make sure it's not already registered
        if (Device.subclasses.has(model)) {
            throw new Error(`A device class for ${model} has already been registered`);
        }

        // add it to the list
        Device.subclasses.set(model, cls);
    }

    /**
     * Returns the device class for the given device model, if one has been registered.
     * @param model - The model designation to lookup.
     */
    static getClass(model: string): DeviceClass | undefined {
        return Device.subclasses.get(model.toUpperCase());
    }

    /**
     * The ID of this device.
     */
    readonly id: DeviceId;

    /**
     * The MAC address of this device.
     */
    readonly macAddress: string;

    /**
     * Information about the firmware that the device is running.
     */
    readonly firmware: DeviceFirmwareInfo;

    /**
     * This device's Shelly service.
     */
    readonly shelly = new ShellyService(this);

    /**
     * This device's Schedule service.
     */
    readonly schedule = new ScheduleService(this);

    /**
     * This device's Webhook service.
     */
    readonly webhook = new WebhookService(this);

    /**
     * This device's HTTP service.
     */
    readonly http = new HttpService(this);

    /**
     * This device's KVS service.
     */
    readonly kvs = new KvsService(this);

    @component
    readonly system = new System(this);

    /**
     * @param info - Information about this device.
     * @param rpcHandler - Used to make remote procedure calls.
     */
    constructor(
        info: DeviceInfo,
        readonly rpcHandler: RpcHandler,
    ) {
        super();

        this.id = info.id;
        this.macAddress = info.mac;
        this.firmware = {
            id: info.fw_id,
            version: info.ver,
        };
        this._model = info.model;

        // handle status updates
        rpcHandler.on('statusUpdate', this.statusUpdateHandler, this);

        // handle events
        rpcHandler.on('event', this.eventHandler, this);
    }

    private readonly _model: string | undefined;

    /**
     * The model designation of this device.
     */
    get model(): string {
        return this._model || (this.constructor as DeviceClass).model;
    }

    /**
     * A human-friendly name of the device model.
     */
    get modelName(): string {
        return (this.constructor as DeviceClass).modelName;
    }

    private _components: Map<string, string> | null = null;

    private readonly _addonComponents = new Map<string, ComponentLike>();

    /**
     * Maps component keys to property names.
     */
    protected get components(): Map<string, string> {
        if (this._components === null) {
            this._components = new Map();

            // construct an array of properties stored by the @component property decorator
            const props = new Array<string>();
            let proto = Object.getPrototypeOf(this);

            // traverse the prototype chain and collect all properties
            while (proto !== null) {
                if (Object.prototype.hasOwnProperty.call(proto, '_componentProps')) {
                    props.push(...proto._componentProps);
                }

                proto = Object.getPrototypeOf(proto);
            }

            // map each component's key to its property name
            for (const p of props) {
                const cmpnt: ComponentLike = this[p];
                if (!cmpnt) {
                    continue;
                }

                this._components.set(cmpnt.key, p);
            }
        }

        return this._components;
    }

    /**
     * Determines whether this device has a component with a given key.
     * @param key - The component key.
     */
    hasComponent(key: string): boolean {
        return this.components.has(key) || this._addonComponents.has(key);
    }

    /**
     * Returns the component with the given key.
     * @param key - The component key.
     */
    getComponent(key: string): ComponentLike | undefined {
        const prop = this.components.get(key);
        if (prop) {
            return this[prop];
        }

        return this._addonComponents.get(key);
    }

    /**
     * Registers add-on temperature/humidity components (ID >= 100) from status and config payloads.
     */
    protected ensureAddonComponent(
        key: string,
        status?: Record<string, unknown>,
        config?: Record<string, unknown>,
    ): ComponentLike | undefined {
        if (!isAddonSensorKey(key) || this.hasComponent(key)) {
            return this.getComponent(key);
        }

        const component = createComponent(this, { key, status, config });
        this._addonComponents.set(key, component);
        return component;
    }

    /**
     * Discovers add-on temperature and humidity components from the device status and config.
     */
    async discoverAddonComponents(seedStatus?: RpcStatusNotification): Promise<void> {
        const status = seedStatus ?? (await this.shelly.getStatus());
        let config: Record<string, unknown> = {};

        try {
            config = (await this.shelly.getConfig()) as Record<string, unknown>;
        } catch {
            // Config is optional for discovery.
        }

        const keys = collectAddonSensorKeys(status as Record<string, unknown>, config);

        for (const key of keys) {
            this.ensureAddonComponent(
                key,
                status[key] as Record<string, unknown> | undefined,
                config[key] as Record<string, unknown> | undefined,
            );
        }
    }

    /**
     * Returns a new Iterator object that contains each of the device's
     * components.
     */
    *[Symbol.iterator](): IterableIterator<[string, ComponentLike]> {
        for (const [key, prop] of this.components.entries()) {
            yield [key, this[prop]];
        }

        for (const [key, component] of this._addonComponents.entries()) {
            yield [key, component];
        }
    }

    /**
     * Invokes an RPC method on the device.
     * @param method - The full RPC method name (e.g. `Switch.Set`).
     * @param params - Optional parameters for the RPC call.
     */
    call<T = unknown>(method: string, params?: RpcParams): PromiseLike<T> {
        return this.rpcHandler.request<T>(method, params);
    }

    /**
     * Loads the status for all of the device's components and populates their characteristics.
     */
    async loadStatus() {
        // retrieve the status
        const status = await this.shelly.getStatus();

        // update the components
        for (const cmpnt in status) {
            if (
                Object.prototype.hasOwnProperty.call(status, cmpnt) &&
                status[cmpnt] !== null &&
                typeof status[cmpnt] === 'object'
            ) {
                if (isAddonSensorKey(cmpnt) && !this.hasComponent(cmpnt)) {
                    this.ensureAddonComponent(cmpnt, status[cmpnt] as Record<string, unknown>);
                }

                this.getComponent(cmpnt)?.update(status[cmpnt] as Record<string, unknown>);
            }
        }
    }

    /**
     * Loads the condiguration for all of the device's components and populates their `config` properties.
     */
    async loadConfig() {
        // retrieve the config
        const config = await this.shelly.getConfig();

        // update the components
        for (const cmpnt in config) {
            if (Object.prototype.hasOwnProperty.call(config, cmpnt) && typeof config[cmpnt] === 'object') {
                const c = this.getComponent(cmpnt);
                if (c && c instanceof Component) {
                    c.config = config[cmpnt];
                }
            }
        }
    }

    /**
     * Handles 'statusUpdate' events from our RPC handler.
     */
    protected statusUpdateHandler(update: RpcStatusNotification) {
        // update each components
        for (const cmpnt in update) {
            if (
                cmpnt !== 'ts' &&
                Object.prototype.hasOwnProperty.call(update, cmpnt) &&
                update[cmpnt] !== null &&
                typeof update[cmpnt] === 'object'
            ) {
                if (isAddonSensorKey(cmpnt) && !this.hasComponent(cmpnt)) {
                    this.ensureAddonComponent(cmpnt, update[cmpnt] as Record<string, unknown>);
                }

                this.getComponent(cmpnt)?.update(update[cmpnt] as Record<string, unknown>);
            }
        }
    }

    /**
     * Handles 'event' events from our RPC handler.
     */
    protected eventHandler(events: RpcEventNotification) {
        // pass each event on to its corresponding component
        for (const event of events.events) {
            this.getComponent(event.component)?.handleEvent(event);
        }
    }
}

/**
 * Base class for devices that have multiple profiles.
 */
export abstract class MultiProfileDevice extends Device {
    /**
     * The current device profile.
     */
    readonly profile: string;

    /**
     * @param info - Information about this device.
     * @param rpcHandler - Used to make remote procedure calls.
     */
    constructor(
        info: DeviceInfo,
        readonly rpcHandler: RpcHandler,
    ) {
        super(info, rpcHandler);

        this.profile = info.profile ?? '';
    }
}
