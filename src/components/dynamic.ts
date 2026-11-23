import equal from 'fast-deep-equal';
import EventEmitter from 'eventemitter3';

import { Device } from '../devices/base';
import { RpcEvent, RpcParams } from '../rpc';
import { DefaultConfigResponse } from './base';
import { ParsedComponentKey } from './key-mapping';

/**
 * A runtime-discovered component with dynamic status fields and RPC access.
 */
export class DynamicComponent extends EventEmitter {
    readonly name: string;
    readonly key: string;
    readonly device: Device;

    private _status: Record<string, unknown> = {};
    private _config: Record<string, unknown> | undefined;
    private _attrs: Record<string, unknown> | undefined;
    private _updateDepth = 0;
    private _updateRevision = 0;
    private _pendingUpdateRevision = 0;
    private _pendingUpdate: Record<string, unknown> | undefined;

    constructor(device: Device, parsed: ParsedComponentKey) {
        super();

        this.device = device;
        this.key = parsed.key;
        this.name = parsed.rpcName;
        this._parsed = parsed;
    }

    private readonly _parsed: ParsedComponentKey;

    /**
     * The current status fields for this component.
     */
    get status(): Readonly<Record<string, unknown>> {
        return this._status;
    }

    /**
     * The current configuration for this component, if loaded.
     */
    get config(): Readonly<Record<string, unknown>> | undefined {
        return this._config;
    }

    /**
     * Metadata reported for this component by Shelly.GetComponents, if present.
     */
    get attrs(): Readonly<Record<string, unknown>> | undefined {
        return this._attrs;
    }

    /**
     * Number of {@link update} calls currently on the stack.
     *
     * This is `0` outside of an update and non-zero inside change listeners,
     * including while a nested/reentrant update is in progress. Consumers use
     * it to defer work that must only run once a whole update has settled.
     */
    get updateDepth(): number {
        return this._updateDepth;
    }

    /**
     * The status payload of the update most recently started in the current
     * synchronous turn, or `undefined`.
     *
     * Shelly.GetComponents delivers a component's status and config in one
     * synchronous step: `update(status)` followed by `config = entry.config`.
     * While that turn is running this getter returns the status payload, allowing a
     * `change:config` listener to correlate the config change with the status
     * update it arrived with. The value is cleared on a microtask, so later
     * config assignments (for example `Device.loadConfig()`) report no
     * accompanying update.
     */
    get pendingUpdate(): Readonly<Record<string, unknown>> | undefined {
        return this._pendingUpdate;
    }

    /**
     * Updates component metadata when a discovery response includes valid attrs.
     * Missing or malformed attrs are ignored, so partial inventories do not
     * erase metadata already known for a component.
     */
    updateAttrs(value: unknown) {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            return;
        }

        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
            return;
        }

        this._attrs = value as Record<string, unknown>;
    }

    set config(value: Record<string, unknown> | undefined) {
        const previous = this._config;
        if (equal(previous, value)) {
            return;
        }

        this._config = value;

        // Emitted synchronously, in the same style as `change:<field>` for
        // status characteristics, so listener context binding and reentrancy
        // behave identically. `pendingUpdate` is passed as the third argument
        // so a config change that arrived with a status update can be
        // correlated without any per-consumer bookkeeping.
        this.emit('change:config', value, previous, this._pendingUpdate);
    }

    /**
     * Updates status fields and emits change events for modified values.
     *
     * Top-level arrays are complete values and replace the previous array, the
     * same way `ComponentBase.update()` treats array characteristics. Object
     * values keep merging field-by-field so partial notifications do not erase
     * unrelated fields.
     */
    update(data: Record<string | number | symbol, unknown>) {
        const revision = ++this._updateRevision;
        this._pendingUpdateRevision = revision;
        this._pendingUpdate = { ...data };
        queueMicrotask(() => {
            // Only the most recent update owns the pending payload. A nested
            // update therefore neither clears its parent's correlation early
            // nor gets cleared by the parent's queued microtask.
            if (this._pendingUpdateRevision === revision) {
                this._pendingUpdateRevision = 0;
                this._pendingUpdate = undefined;
            }
        });

        this._updateDepth++;
        try {
            const changed = new Set<string>();

            for (const field of Object.keys(data)) {
                const next = data[field];
                const current = this._status[field];

                if (typeof next === 'object' && next !== null && typeof current === 'object' && current !== null) {
                    if (equal(next, current)) {
                        continue;
                    }

                    if (Array.isArray(next) || Array.isArray(current)) {
                        // Arrays are complete values; never merge their
                        // elements into the previous array.
                        this._status[field] = next;
                    } else {
                        this._status[field] = {
                            ...(current as Record<string, unknown>),
                            ...(next as Record<string, unknown>),
                        };
                    }
                } else {
                    if (equal(next, current)) {
                        continue;
                    }

                    this._status[field] = next;
                }

                changed.add(field);
            }

            for (const field of changed) {
                const value = this._status[field];
                this.emit('change', field, value);
                this.emit(`change:${field}`, value);
            }
        } finally {
            this._updateDepth--;
        }
    }

    /**
     * Handles events received from the device RPC handler.
     */
    handleEvent(event: RpcEvent) {
        if (event.event === 'config_changed') {
            this.emit('configChange', event.cfg_rev as number, event.restart_required as boolean);
            return;
        }

        this.emit('event', event);
    }

    /**
     * Retrieves the status of this component.
     */
    getStatus<T = Record<string, unknown>>(): PromiseLike<T> {
        return this.call<T>('GetStatus', this.idParams);
    }

    /**
     * Retrieves the configuration of this component.
     */
    getConfig<T = Record<string, unknown>>(): PromiseLike<T> {
        return this.call<T>('GetConfig', this.idParams);
    }

    /**
     * Requests changes in the configuration of this component.
     */
    setConfig<T = DefaultConfigResponse>(config: Record<string, unknown>): PromiseLike<T> {
        return this.call<T>('SetConfig', {
            ...this.idParams,
            config,
        });
    }

    /**
     * Invokes an RPC method on this component.
     */
    call<T>(method: string, params?: RpcParams): PromiseLike<T> {
        return this.device.rpcHandler.request<T>(`${this.name}.${method}`, params);
    }

    private get idParams(): RpcParams | undefined {
        if (this._parsed.kind === 'functional') {
            return { id: this._parsed.id };
        }

        if (this._parsed.kind === 'unknown' && this._parsed.id !== undefined) {
            return { id: this._parsed.id };
        }

        return undefined;
    }
}
