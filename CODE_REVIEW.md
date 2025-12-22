# Code Review: HtmlClient/demo.js

## 1. Unsafe JSON parsing of optional storage data
*Location: `HtmlClient/demo.js`, lines 29-40 and 405-414*

`JSON.parse` is called on values pulled from `localStorage` without checking whether the key exists. When the key is missing `localStorage.getItem` returns `null`, so calling `JSON.parse(null)` throws a `TypeError`, which will prevent the realtime button from initializing and the session update from running on a fresh install. Add null checks (e.g., `const data = value ? JSON.parse(value) : null`) before parsing.

## 2. Removing listeners with undefined handler references
*Location: `HtmlClient/demo.js`, lines 120-126*

`cleanupResources` calls `pc.removeEventListener` with handler references (`on_icecandidate`, `on_connectionstatechange`, `iceconnectionstatechange`, `signalingstatechange`) that are never defined. Accessing these names throws a `ReferenceError`, which breaks the cleanup path and leaks WebRTC resources. Either reference existing handler functions or guard the removals so they only run when the handler references exist.

## 3. Undeclared `events_maps` usage in `handleAnswer`
*Location: `HtmlClient/demo.js`, lines 333-349*

`handleAnswer` reads `events_maps` but that Map is never declared in the module. The first answer from the signaling server will therefore throw `ReferenceError: events_maps is not defined`, stopping WebRTC negotiation. Declare and populate the map (if it is meant to exist) or remove this lookup.

## 4. Vue-specific notification calls in plain JavaScript client
*Location: `HtmlClient/demo.js`, lines 602-608*

The HTML client uses plain DOM APIs, but the WebSocket handler calls `this.$message.error(...)`, which only exists in the Vue runtime. In a plain HTML page `this` is the `window`, so these calls throw and prevent error messages from being processed. Replace them with DOM-based notifications or guard against `this.$message` being undefined.
