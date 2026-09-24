# N CRACKERS — REALTIME & LIVE GPS TRACKING ARCHITECTURE

## 1. Realtime Communication Strategy
* **Primary Protocol**: WebSocket / Server-Sent Events (SSE) for low-latency live location streaming and order status broadcast.
* **Fallback Protocol**: Exponential backoff HTTP polling (every 5-10 seconds) if WebSocket connection drops on mobile 4G/5G networks.

---

## 2. Tracking Session Lifecycle
```
[ Order Marked READY_FOR_DELIVERY ]
                 │
                 ▼
[ Admin/Algorithm Assigns Delivery Agent ]
                 │
                 ▼
[ Agent Clicks "Start Delivery" in PWA ]
                 │
                 ├──► 1. Creates `TrackingSession` (isActive = true)
                 ├──► 2. Triggers Background GPS Watch (`navigator.geolocation.watchPosition`)
                 ├──► 3. Streams GPS Pings to Backend every 5 seconds
                 │
                 ▼
[ Customer & Admin Live Map Views Subscribe to Session ]
                 │
                 ▼
[ Agent Arrives & Verifies Customer Delivery OTP ]
                 │
                 ├──► 1. Order transitioned to `DELIVERED`
                 ├──► 2. `TrackingSession` terminated (isActive = false, endedAt = now)
                 └──► 3. Background GPS Watch immediately ceases
```

---

## 3. Privacy & Battery Safeguards
* **No Continuous Off-Duty Tracking**: Agents are strictly **never** tracked while `OFFLINE`, `ON_BREAK`, or idle without an active delivery assignment.
* **Throttled Pings**: Location pings are throttled to 5-second intervals with distance filters (e.g. minimum 10-meter displacement) to conserve mobile device battery and minimize server bandwidth.
* **Zero Fake GPS Movement**: The system relies purely on real browser Geolocation API signals (`latitude`, `longitude`, `speed`, `heading`, `accuracy`) and will never synthesize synthetic paths.
