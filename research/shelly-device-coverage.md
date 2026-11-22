# Shelly device coverage opportunities

Research date: 2026-11-22. This is a shortlist, not an exhaustive product inventory; official API documentation does not establish retail availability in every market. The initial coverage comparison preceded the implementation below.

## Candidates

- **Shelly Pro 3EM** (`SPEM-003CEBEU`): [Shelly's device documentation](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro3EM/) describes three-phase `em:0` and `emdata:0` components, or `em1` and `em1data` components in the monophase profile. This is a different model from the registered Pro 3 relay.
- **Shelly 3EM-63 Gen3** (`S3EM-003CXCEU63`): [Shelly's device documentation](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/Shelly3EM63G3/) describes the same two metering profiles, making it a candidate for the same component work.
- **Shelly BLU Gateway Gen3** (`S3GW-1DBT001`): [Shelly's device documentation](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyBluGatewayG3/) describes gateway and BLU TRV components. Supporting the gateway meaningfully would require more than registering its model, particularly for bridged devices.

These models were not explicitly registered when the initial comparison was made; they are now listed in the [README](../README.md#supported-devices). Generic Gen2+ device discovery is also available, but does not by itself imply hardware-verified support; see [GenericDevice](../src/devices/generic.ts) and the [factory](../src/internal/create-device.ts).

## Already registered

Shelly 1 Mini Gen3 (`S3SW-001X8EU`) and 1PM Mini Gen3 (`S3SW-001P8EU`) are registered under Plus Mini V3 class names in [shelly-plus-1.ts](../src/devices/shelly-plus-1.ts) and [shelly-plus-1-pm.ts](../src/devices/shelly-plus-1-pm.ts), respectively. They should not be counted as missing solely because of the naming difference.

Gen1 is a separate scope: [Shelly's Gen1 API](https://shelly-api-docs.shelly.cloud/gen1/) differs from the [Gen2+ RPC protocol](https://shelly-api-docs.shelly.cloud/gen2/General/RPCProtocol/), and the generic factory accepts only generation 2 or newer.

## Implementation validation

This section records the implementation guidance from before the changes, comparing the earlier code with Shelly's indexed API documentation and the source of Home Assistant's Shelly integration and `aioshelly`. The external code links are pinned to commits. Direct fetches of the Shelly documentation were denied in this environment, so documentation details were checked via indexed search results rather than direct page reads. No physical device or firmware was tested.

### Energy meters

1. Register and export distinct classes for `SPEM-003CEBEU` and `S3EM-003CXCEU63`; the existing [Pro 3](../src/devices/shelly-pro-3.ts) is a relay, not a meter. Registration occurs via module import and `Device.registerClass` ([registry](../src/devices/base.ts), [exports](../src/devices/index.ts)).
2. Implement reusable typed `EM`, `EM1`, `EMData`, and `EM1Data` components. Keep instantaneous power/current/voltage distinct from accumulated energy and historical data. The [Pro 3EM](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen2/ShellyPro3EM/) and [3EM-63 Gen3](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/Shelly3EM63G3/) documentation describes `em:0`/`emdata:0` in the triphase profile and `em1:0..2`/`em1data:0..2` in the monophase profile. [Home Assistant's sensor definitions](https://github.com/home-assistant/core/blob/45ecc11298475cf802cde38c2b8264bf1c0ff549/homeassistant/components/shelly/sensor.py) independently distinguish live `act_power` and separate energy-data component fields.
3. Build component lookup from the actual profile/inventory, not the model name alone. `MultiProfileDevice` currently stores only the initial profile; it does not construct a profile-specific topology or refresh it on reconnect ([base.ts](../src/devices/base.ts)). The factory discovers only add-on temperature/humidity components for registered devices ([create-device.ts](../src/internal/create-device.ts)). Choose and document how to rebuild after a profile change and reconnect. The Pro 3EM's optional switch add-on must not be assumed present.
4. Add exact namespace mappings and tests. The earlier key mapping handled `emdata` and `em1data` correctly, but its fallback transformed `em` to `Em` and `em1` to `Em1`, not the documented `EM` and `EM1`. It likewise derived `Blutrv` from `blutrv`; explicit mappings or typed classes were needed rather than assuming generic calls used the documented spelling. The generic [dynamic component](../src/components/dynamic.ts) forms RPC names using that mapping. Raw `Device.call` can specify an exact namespace.
5. Follow the documented fields, nullability, errors and method parameters; avoid assuming every firmware or profile reports every field. Test initial status/config, incremental notifications, phase IDs, counters, unavailable readings and correct RPC names/IDs. Historical data methods and counter resets should be explicitly scoped rather than assumed to work merely because status is exposed.

### BLU Gateway Gen3

The [gateway API](https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen3/ShellyBluGatewayG3/) identifies `S3GW-1DBT001`. Registration alone is insufficient: paired peripherals are dynamic components on the gateway, not separately discovered Wi-Fi devices. `aioshelly`'s [gateway fixture](https://github.com/home-assistant-libs/aioshelly/blob/3750d1df9c5fa1469a10a51d451b389f18e6805b/tests/rpc_device/fixtures/shellyblugatewaygen3/Shelly.GetComponents) and [RPC implementation](https://github.com/home-assistant-libs/aioshelly/blob/3750d1df9c5fa1469a10a51d451b389f18e6805b/aioshelly/rpc_device/device.py) demonstrate `blutrv:<id>` discovery and gateway-proxied TRV operations.

- Preserve runtime-discovered components when a model is registered: reconcile paginated `Shelly.GetComponents` results, seed status/config, and route status/events to the same objects. Support rediscovery after pairing, removal and reconnect without assuming ID 200 or a fixed count. Before implementation, `GenericDevice` discovered components only once and normal registered-device discovery did not discover BLU components.
- Add typed gateway and BLU TRV functionality incrementally. `aioshelly` proxies TRV operations with an outer gateway component ID and an inner TRV RPC and ID. Its code uses `BluTRV.Call` while indexed official documentation describes `BluTrv.Call`; verify spelling and accepted parameters against the actual target firmware before choosing a wire contract. Account for delayed BLE responses and distinguish cached gateway status from remote operations.
- Keep non-TRV BTHome and other BLU devices out of the support claim until their component types, payloads, lifecycle and tests are established. Do not assume all BLE sensors use `blutrv`.

### Verification before claiming support

- Unit/integration fixtures for both meter models in both profiles, optional Pro add-on presence/absence, exact model registration, RPC casing and IDs, incremental updates, null/absent values, profile changes and reconnect.
- Gateway fixtures with zero, one and multiple TRVs, paginated discovery, added/removed components, reconnect, cached status and proxied requests/timeouts. Test generic mode separately so registering the gateway cannot silently reduce existing generic behavior.
- Exercise representative physical devices and firmware versions, including older firmware or missing `GetComponents`/methods, before claiming hardware compatibility. Define graceful capability detection and failure behavior. The original `getAllComponents` pagination had no zero-progress guard; a malformed or changing response could loop, so the implementation added a guard and test.

The initial investigation could not run the local test suite because `vitest` was not installed at the time. These recommendations were source-based, not hardware validation.

## Comparison with other implementations

This comparison was made after the initial implementation. The referenced fixtures are test fixtures, not independent proof of hardware behavior. No device was exercised for this comparison.

### Differences found and addressed

1. **Built-in meter temperature.** [aioshelly's Pro 3EM fixture](https://github.com/home-assistant-libs/aioshelly/blob/3750d1df9c5fa1469a10a51d451b389f18e6805b/fixtures/gen2_Shelly%20Pro%203EM_SPEM-003CEBEU_20231219-134001-1.1.0-g34b5d4f.json) and [matterbridge-shelly's 3EM-63 fixture](https://github.com/Luligu/matterbridge-shelly/blob/482e705a82017eb0290d9c715b2e274fc9548fdc/src/mock/shelly3em63g3-84FCE6367400.json) include `temperature:0`. Both [meter classes](../src/devices/shelly-energy-meter.ts) now expose it; previously only add-on sensor IDs of 100 or higher were discovered.
2. **RGB/RGBW RPC result types.** [shelly-go's RGB](https://github.com/tj-smith47/shelly-go/blob/df93937c4a4f3f41f24c16a2031b1adcfe37b765/gen2/components/rgb.go) and [RGBW](https://github.com/tj-smith47/shelly-go/blob/df93937c4a4f3f41f24c16a2031b1adcfe37b765/gen2/components/rgbw.go) implementations model set/toggle results as an object containing `was_on`. Our [RGB and RGBW types](../src/components/rgb.ts) now reflect that instead of promising `null`.
3. **Dynamic component metadata.** [aioshelly's gateway fixture](https://github.com/home-assistant-libs/aioshelly/blob/3750d1df9c5fa1469a10a51d451b389f18e6805b/tests/rpc_device/fixtures/shellyblugatewaygen3/Shelly.GetComponents) includes `attrs.model_id` on `blutrv` and `bthomedevice` entries. [aioshelly uses that metadata](https://github.com/home-assistant-libs/aioshelly/blob/3750d1df9c5fa1469a10a51d451b389f18e6805b/aioshelly/rpc_device/device.py) when building TRV configuration. Our [dynamic components](../src/components/dynamic.ts) now expose and refresh valid `attrs` metadata alongside status and config.
4. **Meter-data config typing.** The aioshelly Pro 3EM fixture above reports `emdata:0` configuration as `{}`. [EMDataConfig](../src/components/energy-meter.ts) now models an empty configuration rather than requiring `id`. The [Homey EM1Data implementation](https://github.com/drenso/cloud.shelly.control/blob/main/lib/component/components/EM1Data.ts) likewise models that component's config as empty; that link tracks its default branch rather than a pinned revision.

### Matching behavior and open questions

- [matterbridge-shelly's RGB fixture](https://github.com/Luligu/matterbridge-shelly/blob/482e705a82017eb0290d9c715b2e274fc9548fdc/src/mock/shellyplusrgbwpm-A0A3B35C7024.json) contains four inputs and `rgb:0`; its [light-profile fixture](https://github.com/Luligu/matterbridge-shelly/blob/482e705a82017eb0290d9c715b2e274fc9548fdc/src/mock/shellyplusrgbwpm-ECC9FF4CEAF0.json) contains four inputs and four light outputs. Both agree with the implemented RGBW PM topology. The RGBW-profile fixture and physical devices still need validation.
- The Pro 3EM fixture agrees with the `SPEM-003CEBEU` registration, triphase `em:0`/`emdata:0` topology, and the checked phase and cumulative-energy fields. It does not independently verify the requester’s specific Pro 3EM V2 unit.
- [aioshelly](https://github.com/home-assistant-libs/aioshelly/blob/3750d1df9c5fa1469a10a51d451b389f18e6805b/aioshelly/rpc_device/device.py) additionally retrieves remote TRV configuration. This library provides a pass-through RPC but no corresponding typed convenience API; that is a feature gap rather than proof that current status reporting is wrong.
- A community [EU Gen4 dimmer sample](https://github.com/markus7017/myfiles/blob/6ad011473515fe39b4006102c4af5cd25a7d4b96/shelly/DEVNOTES%20-%20Gen4%20API%20JSON%20Samples.md#shelly-dimmer-g4) contains inputs and `light:0`, but no `eth` or `ui`; the EU class now reflects that sample. This is one firmware sample, not proof of every firmware's inventory. The US class remains unchanged because no equivalent US fixture was verified.
