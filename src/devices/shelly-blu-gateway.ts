import { RpcEventNotification, RpcParams, RpcStatusNotification } from '../rpc';
import { Device } from './base';
import { GenericDevice } from './generic';

/**
 * Shelly BLU Gateway Gen3. Paired BLU peripherals are runtime components, so
 * their inventory is loaded and reconciled from Shelly.GetComponents.
 */
export class ShellyBluGatewayGen3 extends GenericDevice {
    static readonly model = 'S3GW-1DBT001';
    static readonly modelName = 'Shelly BLU Gateway Gen3';

    private _rediscoveryTask: Promise<void> | null = null;
    private _rediscoveryRequested = false;

    override get modelName(): string {
        return ShellyBluGatewayGen3.modelName;
    }

    constructor(...args: ConstructorParameters<typeof GenericDevice>) {
        super(...args);
        this.rpcHandler.on('connect', this.handleReconnect, this);
    }

    /** Invoke a caller-specified RPC method verbatim. */
    callRawRpc<T = unknown>(method: string, params?: Record<string, unknown>): PromiseLike<T> {
        return this.call<T>(method, params);
    }

    /**
     * Invoke an RPC on a paired TRV through the gateway. The inner method and
     * params are forwarded unchanged by the gateway's `BluTrv.Call` endpoint.
     */
    callTrv<T = unknown>(id: number, method: string, params?: RpcParams): PromiseLike<T> {
        return this.callRawRpc<T>('BluTrv.Call', { id, method, params });
    }

    protected override statusUpdateHandler(update: RpcStatusNotification): void {
        super.statusUpdateHandler(update);

        // GetComponents is authoritative. Do not replay this possibly older
        // notification after discovery; if it arrives during a scan, request one
        // coalesced follow-up scan to capture the new component topology.
        for (const [key, value] of Object.entries(update)) {
            if (key !== 'ts' && value !== null && typeof value === 'object' && !this.hasComponent(key)) {
                this.scheduleRediscovery();
                return;
            }
        }
    }

    protected override eventHandler(notification: RpcEventNotification): void {
        super.eventHandler(notification);

        // Config changes can alter the paired-component inventory. Ordinary
        // BLU component events are status/activity events and must not trigger
        // an inventory scan; unknown status keys and reconnects are handled
        // separately, and callers can request rediscovery explicitly.
        if (notification.events.some((event) => event.event === 'config_changed')) {
            this.scheduleRediscovery();
        }
    }

    private readonly handleReconnect = () => this.scheduleRediscovery();

    private scheduleRediscovery(): void {
        if (this._rediscoveryTask) {
            this._rediscoveryRequested = true;
            return;
        }

        // A caller may have started GenericDevice.rediscoverComponents()
        // directly. Joining that coalesced promise alone could leave a newly
        // observed component absent if the older scan's snapshot predates it.
        const waitForExistingDiscovery = this.isDiscoveringComponents;
        const task = this.rediscoverUntilSettled(waitForExistingDiscovery)
            .catch((error: unknown) => {
                this._rediscoveryRequested = false;
                this.emit('componentDiscoveryError', error);
            })
            .finally(() => {
                if (this._rediscoveryTask === task) {
                    this._rediscoveryTask = null;
                }
            });
        this._rediscoveryTask = task;
    }

    private async rediscoverUntilSettled(waitForExistingDiscovery: boolean): Promise<void> {
        if (waitForExistingDiscovery) {
            // Join the scan already in progress, then guarantee a trailing scan
            // for the notification that requested this refresh.
            try {
                await this.rediscoverComponents();
            } catch (error) {
                this.emit('componentDiscoveryError', error);
            }
        }

        do {
            this._rediscoveryRequested = false;
            await this.rediscoverComponents();
        } while (this._rediscoveryRequested);
    }
}

Device.registerClass(ShellyBluGatewayGen3);
