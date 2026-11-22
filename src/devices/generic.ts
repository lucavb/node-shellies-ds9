import { Component, ComponentLike, DynamicComponent } from '../components';
import { createComponent } from '../components/factory';
import { FunctionalComponentKey, isFunctionalComponentKey, TypedComponentMap } from '../components/keys';
import { RpcHandler } from '../rpc';
import { Device, DeviceInfo } from './base';

/**
 * Thrown when a component key is not present on a generic device.
 */
export class ComponentNotFoundError extends Error {
    constructor(readonly key: string) {
        super(`Component not found: ${key}`);
        this.name = 'ComponentNotFoundError';
    }
}

/**
 * A device whose components are discovered at runtime via Shelly.GetComponents.
 */
export class GenericDevice extends Device {
    static readonly model: string = '';
    static readonly modelName: string = 'Shelly Device';

    private readonly _dynamicComponents = new Map<string, ComponentLike>();
    private _discoveryPromise: Promise<void> | null = null;

    protected get isDiscoveringComponents(): boolean {
        return this._discoveryPromise !== null;
    }

    /**
     * Skips the first {@link loadStatus} / {@link loadConfig} after initial
     * discovery, since {@link discoverComponents} already seeded data from
     * Shelly.GetComponents. Later rediscovery must not suppress explicit refreshes.
     */
    private _skipInitialLoad = {
        status: false,
        config: false,
    };
    private _hasCompletedInitialDiscovery = false;

    /**
     * Creates a generic device and discovers its components from the device firmware.
     */
    static async create<T extends GenericDevice>(
        this: new (info: DeviceInfo, rpcHandler: RpcHandler) => T,
        info: DeviceInfo,
        rpcHandler: RpcHandler,
    ): Promise<T> {
        const device = new this(info, rpcHandler);
        await device.rediscoverComponents();
        return device;
    }

    /**
     * A human-friendly name of the device model.
     */
    get modelName(): string {
        return this.model ? `Shelly ${this.model}` : 'Shelly Device';
    }

    /** Returns a component with a known typed key and a narrowed type. */
    get<K extends keyof TypedComponentMap>(key: K): TypedComponentMap[K];

    /**
     * Returns a component by key.
     */
    get(key: string): ComponentLike;

    get(key: string): ComponentLike {
        const component = this.getComponent(key);
        if (!component) {
            throw new ComponentNotFoundError(key);
        }

        return component;
    }

    /**
     * Determines whether this device has a component with a given key.
     */
    override hasComponent(key: string): boolean {
        if (key === 'sys') {
            return true;
        }

        return this._dynamicComponents.has(key);
    }

    /**
     * Returns the component with the given key.
     */
    override getComponent(key: string): ComponentLike | undefined {
        if (key === 'sys') {
            return this.system;
        }

        return this._dynamicComponents.get(key);
    }

    /**
     * Returns a new Iterator object that contains each of the device's components.
     */
    override *[Symbol.iterator](): IterableIterator<[string, ComponentLike]> {
        yield ['sys', this.system];

        for (const [key, component] of this._dynamicComponents.entries()) {
            yield [key, component];
        }
    }

    /**
     * Loads the status for all of the device's components.
     * The first call after discovery is skipped because status was seeded from GetComponents.
     */
    override async loadStatus() {
        if (this._skipInitialLoad.status) {
            this._skipInitialLoad.status = false;
            return;
        }

        return super.loadStatus();
    }

    /**
     * Loads the configuration for all of the device's components.
     * The first call after discovery is skipped because config was seeded from GetComponents.
     */
    override async loadConfig() {
        if (this._skipInitialLoad.config) {
            this._skipInitialLoad.config = false;
            return;
        }

        const config = await this.shelly.getConfig();

        for (const cmpnt in config) {
            if (Object.prototype.hasOwnProperty.call(config, cmpnt) && typeof config[cmpnt] === 'object') {
                const c = this.getComponent(cmpnt);
                if (c instanceof Component) {
                    c.config = config[cmpnt];
                } else if (c instanceof DynamicComponent) {
                    c.config = config[cmpnt] as Record<string, unknown>;
                }
            }
        }
    }

    /**
     * Refreshes the runtime component inventory. Existing component objects are
     * retained for keys that remain present so listeners and references survive
     * pairing changes and reconnects.
     */
    rediscoverComponents(): Promise<void> {
        if (this._discoveryPromise) {
            return this._discoveryPromise;
        }

        const discovery = this.discoverComponents().finally(() => {
            if (this._discoveryPromise === discovery) {
                this._discoveryPromise = null;
            }
        });
        this._discoveryPromise = discovery;
        return discovery;
    }

    /**
     * Refreshes this runtime-discovered device's complete component inventory,
     * including BTHome components.
     */
    override refreshBTHomeComponents(): Promise<void> {
        return this.rediscoverComponents();
    }

    private async discoverComponents(): Promise<void> {
        const entries = await this.shelly.getAllComponents(['status', 'config']);

        const discoveredKeys = new Set<string>();

        for (const entry of entries) {
            if (entry.key === 'sys') {
                if (entry.status) {
                    this.system.update(entry.status);
                }
                if (entry.config) {
                    this.system.config = entry.config as unknown as typeof this.system.config;
                }
                continue;
            }

            discoveredKeys.add(entry.key);
            let component = this._dynamicComponents.get(entry.key);
            if (!component) {
                component = createComponent(this, entry);
                this._dynamicComponents.set(entry.key, component);
            } else {
                if (component instanceof DynamicComponent && entry.attrs !== undefined) {
                    component.updateAttrs(entry.attrs);
                }

                if (entry.status) {
                    component.update(entry.status);
                }
                if (entry.config) {
                    if (component instanceof Component) {
                        component.config = entry.config;
                    } else if (component instanceof DynamicComponent) {
                        component.config = entry.config;
                    }
                }
            }
        }

        for (const key of this._dynamicComponents.keys()) {
            if (!discoveredKeys.has(key)) {
                this._dynamicComponents.delete(key);
            }
        }

        if (!this._hasCompletedInitialDiscovery) {
            this._skipInitialLoad = {
                status: true,
                config: true,
            };
            this._hasCompletedInitialDiscovery = true;
        }
    }
}

/**
 * Determines whether a device is a generic runtime-discovered device.
 */
export function isGenericDevice(device: Device): device is GenericDevice {
    return device instanceof GenericDevice;
}

/**
 * Narrows a component key to a functional key when valid.
 */
export function asFunctionalComponentKey(key: string): FunctionalComponentKey | undefined {
    return isFunctionalComponentKey(key) ? key : undefined;
}
