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

    set config(value: Record<string, unknown> | undefined) {
        this._config = value;
    }

    /**
     * Updates status fields and emits change events for modified values.
     */
    update(data: Record<string | number | symbol, unknown>) {
        const changed = new Set<string>();

        for (const field of Object.keys(data)) {
            const next = data[field];
            const current = this._status[field];

            if (typeof next === 'object' && next !== null && typeof current === 'object' && current !== null) {
                if (equal(next, current)) {
                    continue;
                }

                this._status[field] = { ...(current as Record<string, unknown>), ...(next as Record<string, unknown>) };
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
