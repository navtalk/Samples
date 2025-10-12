# NavTalk Expo Demo

This Expo application recreates the conversational experience demonstrated in the native iOS sample. The layout mirrors the
original UIKit implementation with a full-screen background image, gradient-masked transcript list, and contextual call
controls that transition between **Call**, **Connecting**, and **Hang Up** states.

Key touches carried over from the iOS build include:

- Loading the Leo character background from the same NavTalk CDN with automatic fallback to an on-device gradient when the
  network is unavailable.
- A gradient mask on the transcript list so recent messages fade into the background just like the UITableView mask.
- Distinct call controls for each NavTalk status, complete with iconography and the translucent connecting state.
- A scripted question/answer exchange that echoes the flow you see in the native project.

## Getting started

```bash
cd ExpoNavTalk
npm install
npm start
```

When you press **Call**, the demo simulates a WebRTC session. After a brief connecting state the scripted conversation flows in
real time, alternating between question and answer bubbles exactly as it does in the UIKit experience.
