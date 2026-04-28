"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.callback = callback;
exports.getHostComponent = getHostComponent;
var _reactNative = require("react-native");
var NativeComponentRegistry = _interopRequireWildcard(require("react-native/Libraries/NativeComponent/NativeComponentRegistry"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
// TODO: Migrate to the official export of `NativeComponentRegistry` from `react-native` once react-native 0.83.0 becomes more established as this is deprecated
// eslint-disable-next-line @react-native/no-deep-imports

function typesafe(config) {
  // TODO: Remove this unsafe cast and make it safe
  return config;
}

/**
 * Represents all default props a Nitro HybridView has.
 */

/**
 * Wraps a callback function in a Nitro-compatible object format.
 *
 * @note Due to a React limitation, functions cannot be passed to native directly
 * because RN converts them to booleans (`true`). As a workaround,
 * Nitro requires you to wrap each function using `callback(...)`,
 * which bypasses React Native's conversion.
 * Please see the [Callbacks have to be wrapped](https://nitro.margelo.com/docs/guides/view-components#callbacks-have-to-be-wrapped) section for more information.
 *
 * @type {Object} NitroViewWrappedCallback
 * @property {T} f - The wrapped callback function
 */

// Due to a React limitation, functions cannot be passed to native directly
// because RN converts them to booleans (`true`). Nitro knows this and just
// wraps functions as objects - the original function is stored in `f`.

/**
 * Represents a React Native view, implemented as a Nitro View, with the given props and methods.
 *
 * @note Every React Native view has a {@linkcode DefaultHybridViewProps.hybridRef hybridRef} which can be used to gain access
 *       to the underlying Nitro {@linkcode HybridView}.
 * @note Every function/callback is wrapped as a `{ f: … }` object. Use {@linkcode callback | callback(...)} for this.
 * @note Every method can be called on the Ref. Including setting properties directly.
 */

/**
 * Wraps all valid attributes of {@linkcode TProps} using Nitro's
 * default `diff` and `process` functions.
 */
function wrapValidAttributes(attributes) {
  const keys = Object.keys(attributes);
  for (const key of keys) {
    attributes[key] = {
      diff: (a, b) => a !== b,
      process: i => i
    };
  }
  return attributes;
}

/**
 * Finds and returns a native view (aka "HostComponent") via the given {@linkcode name}.
 *
 * The view is bridged to a native Hybrid Object using Nitro Views.
 */
function getHostComponent(name, getViewConfig) {
  if (NativeComponentRegistry == null) {
    throw new Error(`NativeComponentRegistry is not available on ${_reactNative.Platform.OS}!`);
  }
  return NativeComponentRegistry.get(name, () => {
    const config = getViewConfig();
    config.validAttributes = wrapValidAttributes(config.validAttributes);
    return typesafe(config);
  });
}

/**
 * Wrap the given {@linkcode func} in a Nitro callback.
 * - For older versions of react-native, this wraps the callback in a `{ f: T }` object.
 * - For newer versions of react-native, this just returns the function as-is.
 */

function callback(func) {
  if (typeof func === 'function') {
    return {
      f: func
    };
  }
  return func;
}
//# sourceMappingURL=getHostComponent.js.map