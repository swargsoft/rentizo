# Rentizo — Product Requirements Document (PRD)
**Version:** 1.0.0  
**Status:** MVP Planning  
**Last Updated:** March 2026  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Vision & Goals](#2-vision--goals)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Nostr Protocol Design](#5-nostr-protocol-design)
6. [Data Models](#6-data-models)
7. [User Roles & Auth](#7-user-roles--auth)
8. [Feature Specifications](#8-feature-specifications)
   - 8.1 [Authentication & Onboarding](#81-authentication--onboarding)
   - 8.2 [Owner Profile](#82-owner-profile)
   - 8.3 [Branch Management](#83-branch-management)
   - 8.4 [Vehicle Listing](#84-vehicle-listing)
   - 8.5 [Rider Profile](#85-rider-profile)
   - 8.6 [Discovery & Search](#86-discovery--search)
   - 8.7 [Booking Flow](#87-booking-flow)
   - 8.8 [QR Payment Verification](#88-qr-payment-verification)
   - 8.9 [Reviews & Ratings](#89-reviews--ratings)
9. [Multi-Device Sync](#9-multi-device-sync)
10. [Offline & PWA Behavior](#10-offline--pwa-behavior)
11. [Storage Architecture](#11-storage-architecture)
12. [Image & File Handling](#12-image--file-handling)
13. [Notifications](#13-notifications)
14. [Security Considerations](#14-security-considerations)
15. [Capacitor / Native Build](#15-capacitor--native-build)
16. [Project Structure](#16-project-structure)
17. [Nostr Event Kind Reference](#17-nostr-event-kind-reference)
18. [User Scenarios (End-to-End Flows)](#18-user-scenarios-end-to-end-flows)
19. [MVP Scope vs. Future Roadmap](#19-mvp-scope-vs-future-roadmap)
20. [Open Questions & Decisions](#20-open-questions--decisions)

---

## 1. Product Overview

**Rentizo** is a decentralized, peer-to-peer vehicle rental platform built on the [Nostr](https://nostr.com) protocol. It allows vehicle **Owners** to list bikes, scooters, cycles, or cars for rent from one or more physical branches, and allows **Riders** to discover and book those vehicles based on real-time geolocation — all without a central server, intermediary, or custodian.

The app is a **Progressive Web App (PWA)** built with React + Vite, designed to be installable on Android (via Capacitor) and iOS (via Capacitor), and fully usable in any modern browser. All identity, profile data, and listings are cryptographically owned by users through their Nostr keypairs. Payments are coordinated out-of-band via UPI QR codes.

---

## 2. Vision & Goals

| Goal | Description |
|------|-------------|
| **Decentralization** | No single company owns the data. All profiles, listings, and bookings live on Nostr relays. |
| **Permissionless** | Anyone with a Nostr keypair can become an Owner or Rider. No sign-up forms, no KYC for MVP. |
| **Multi-device** | A user can log in on any device with their private key and instantly see all their data. |
| **Offline-first** | The app should be usable to browse cached data even without internet. |
| **Privacy-respecting** | Only the minimum data (phone, UPI) needed to coordinate rentals is shared; it's encrypted or disclosed intentionally. |
| **Open protocol** | Listings and profiles follow open Nostr event kinds so third-party clients can interop. |

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | UI framework |
| **Vite** | 5.x | Build tool, dev server, PWA plugin |
| **MUI (Material UI)** | 5.x | Component library, theming |
| **React Router** | 6.x | Client-side routing |
| **Zustand** | 4.x | Lightweight global state management |
| **React Query (TanStack)** | 5.x | Async data fetching, caching, sync |

### Nostr
| Technology | Purpose |
|-----------|---------|
| **nostr-tools** | Key generation, event signing, relay pool management |
| **@nostr-dev-kit/ndk** | Higher-level Nostr SDK — handles relay connections, subscriptions, NIP-04 DMs |

### Local Storage
| Technology | Purpose |
|-----------|---------|
| **Dexie.js** | IndexedDB ORM — stores profiles, listings, bookings, relay data |
| **Cache API (browser native)** | Stores binary files: vehicle images, profile pictures (via `caches.open()`) |
| **idb-keyval** | Simple key-value wrapper over IndexedDB for small config/settings |

> **Why Cache API for images?** The Cache API is purpose-built for storing request/response pairs including binary blobs. Dexie handles structured JSON data; Cache API handles raw files. Together they cover all storage needs without a large extra library.

### Maps & Geo
| Technology | Purpose |
|-----------|---------|
| **Leaflet + react-leaflet** | Map rendering (open source, no API key needed) |
| **OpenStreetMap tiles** | Free map tiles |
| **Browser Geolocation API** | Current location of rider |

### PWA & Native
| Technology | Purpose |
|-----------|---------|
| **vite-plugin-pwa** | Service worker, web manifest, offline support |
| **Workbox** | Service worker strategies (cache-first for assets, network-first for relay data) |
| **Capacitor** | Wraps PWA into native Android/iOS app |
| **@capacitor/geolocation** | Native GPS access (more reliable than browser API on mobile) |
| **@capacitor/camera** | Native camera for vehicle photo capture |
| **@capacitor/share** | Share booking QR / listing links |

### QR Codes
| Technology | Purpose |
|-----------|---------|
| **qrcode.react** | Renders QR codes for UPI payment links |
| **html5-qrcode** | Scans QR codes via camera (owner-side verification) |

---

## 4. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Rentizo PWA                      │
│                                                      │
│  ┌─────────────┐   ┌──────────────┐  ┌───────────┐  │
│  │  React UI   │   │  Zustand     │  │  React    │  │
│  │  + MUI      │◄──│  State Store │  │  Query    │  │
│  └──────┬──────┘   └──────┬───────┘  └─────┬─────┘  │
│         │                 │                │         │
│  ┌──────▼─────────────────▼────────────────▼──────┐  │
│  │              Nostr Service Layer                │  │
│  │  (NDK / nostr-tools — sign, publish, subscribe) │  │
│  └──────────────────┬──────────────────────────────┘  │
│                     │                                │
│  ┌──────────────────▼──────────────────────────────┐  │
│  │             Local Storage Layer                 │  │
│  │   Dexie (IndexedDB) │ Cache API (images/files)  │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────┘
                        │ WebSocket
          ┌─────────────▼──────────────┐
          │       Nostr Relays         │
          │  wss://relay.damus.io      │
          │  wss://nos.lol             │
          │  wss://relay.nostr.band    │
          │  + user-configurable       │
          └────────────────────────────┘
```

**Key principle:** The app is a relay client. There is no Rentizo backend server. All data is stored on public Nostr relays and locally on device. Identity = keypair.

---

## 5. Nostr Protocol Design

### Identity
- Every user (Owner or Rider) has a **Nostr keypair** (`nsec` / `npub`).
- The `npub` (public key) is the universal user ID across all devices and clients.
- Users can optionally use a **NIP-07 browser extension** (Alby, nos2x) or enter their `nsec` directly.

### Event Publishing Strategy
- All **public data** (listings, branch info, public profile) is published as **regular Nostr events** to public relays — discoverable by anyone.
- **Booking requests** are sent as **NIP-04 encrypted direct messages** between Rider and Owner — private, end-to-end encrypted.
- **Profile data** follows **NIP-01** (kind 0 metadata event).

### Relay Configuration
- Default relay list hardcoded for MVP (can be user-configured in settings).
- NDK handles connection pooling, reconnection, and deduplication.
- All published events are sent to **all connected relays** for redundancy.
- On login, the app **subscribes** to the user's own events to hydrate local state.

---

## 6. Data Models

### 6.1 User / Identity

```typescript
interface NostrIdentity {
  pubkey: string;          // hex public key
  privkey?: string;        // hex private key (stored encrypted in IndexedDB, never in memory longer than session)
  role: 'owner' | 'rider' | 'both';
}
```

### 6.2 Owner Profile (Nostr Kind: 30100)

```typescript
interface OwnerProfile {
  pubkey: string;
  name: string;
  phone: string;           // E.164 format e.g. +919876543210
  upiId: string;           // e.g. owner@upi
  profilePicture?: string; // bech32 nostr address to cached image, or NIP-94 image event id
  createdAt: number;       // unix timestamp
  updatedAt: number;
}
```

> Published as Nostr **kind 0** (NIP-01 metadata) for name/picture, and **kind 30100** (parameterized replaceable) for Rentizo-specific fields (phone, upiId).

### 6.3 Branch (Nostr Kind: 30101)

```typescript
interface Branch {
  id: string;              // Nostr event id
  ownerPubkey: string;
  branchName: string;
  address: string;         // Human-readable address
  latitude: number;
  longitude: number;
  phone?: string;          // Branch-specific contact (optional, falls back to owner)
  rating: number;          // Computed from reviews, NOT stored in event
  reviewCount: number;     // Computed
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

> Published as **kind 30101** (parameterized replaceable event, `d` tag = branchId).

### 6.4 Vehicle Listing (Nostr Kind: 30102)

```typescript
interface VehicleListing {
  id: string;              // Nostr event id
  ownerPubkey: string;
  branchId: string;        // References Branch.id
  vehicleName: string;     // e.g. "Honda Activa 6G"
  vehicleNumber: string;   // e.g. "MH12AB1234"
  vehicleType: 'bike' | 'scooter' | 'cycle' | 'car' | 'other';
  pricePerDay: number;     // INR
  securityAmount: number;  // INR
  quantity: number;        // How many of this vehicle available
  availableQuantity: number; // quantity - bookedCount (computed)
  images: string[];        // Array of NIP-94 file event IDs or base64 data URLs (max 5)
  isBooked: boolean;       // True if all units are booked
  isPublished: boolean;    // Draft vs Live
  description?: string;
  createdAt: number;
  updatedAt: number;
}
```

> Published as **kind 30102** (parameterized replaceable, `d` tag = listingId).  
> Images are stored in Cache API locally; on publish, encoded to base64 and embedded in the event content or via **NIP-94 file metadata events**.

### 6.5 Rider Profile (Nostr Kind: 30103)

```typescript
interface RiderProfile {
  pubkey: string;
  name: string;
  phone: string;
  profilePicture?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 6.6 Booking Request (Nostr Kind: 4 — NIP-04 Encrypted DM)

```typescript
interface BookingRequest {
  id: string;              // local UUID, also used as booking reference
  riderPubkey: string;
  ownerPubkey: string;
  branchId: string;
  items: BookingItem[];
  riderName: string;       // Snapshot at time of booking
  riderPhone: string;
  totalAmount: number;     // sum of pricePerDay * days * quantity
  securityAmount: number;
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  durationDays: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  qrPayload?: string;      // UPI deep link for payment QR
  createdAt: number;
}

interface BookingItem {
  listingId: string;
  vehicleName: string;
  vehicleNumber: string;
  quantity: number;
  pricePerDay: number;
}
```

> Sent as **kind 4** NIP-04 DM — encrypted with owner's public key. The content is a JSON string of `BookingRequest`.

### 6.7 Branch Review (Nostr Kind: 30104)

```typescript
interface BranchReview {
  id: string;
  reviewerPubkey: string;
  branchId: string;
  ownerPubkey: string;
  rating: number;          // 1-5
  comment: string;
  bookingId: string;       // Must reference a completed booking
  createdAt: number;
}
```

---

## 7. User Roles & Auth

### Roles
| Role | Description |
|------|-------------|
| **Owner** | Lists vehicles, manages branches, receives booking requests, confirms rentals |
| **Rider** | Discovers vehicles, submits booking requests, pays via UPI QR |
| **Both** | A user can be both Owner and Rider using the same keypair |

### Authentication Flow
1. **New user** → Generate keypair in-app (`generatePrivateKey()` from nostr-tools) → Choose role.
2. **Returning user** → Enter `nsec` (private key) or use NIP-07 extension → App derives `npub`, fetches profile from relays, hydrates IndexedDB.
3. **Private key storage** → The `nsec` is encrypted with a user-chosen PIN using **AES-256-GCM** and stored in IndexedDB. It is never stored in plaintext localStorage.
4. **Session** → Decrypted key held in memory (Zustand store) for the session; cleared on logout or app close.

### Key Security Rules
- **Never expose nsec** in any URL, log, or network request.
- Offer users the ability to **export their nsec** as a backup (shown only once, with strong warnings).
- On new device login, the app re-fetches all Nostr events for that pubkey to reconstruct state — no server migration needed.

---

## 8. Feature Specifications

### 8.1 Authentication & Onboarding

**Screens:**
- **Splash / Landing** — Logo, tagline, "Get Started" CTA.
- **Login Screen** — Two options:
  - "I have a Nostr key" → paste/scan `nsec` or use NIP-07 extension
  - "Create new account" → generate keypair, download backup
- **Role Selection** — After first login: "I want to rent out vehicles" (Owner) | "I want to rent a vehicle" (Rider) | "Both"
- **PIN Setup** — Set a 6-digit PIN to encrypt the local key

**Validations:**
- `nsec` must be valid bech32 Nostr private key.
- PIN must be 6 digits.
- Warn user to save their `nsec` before proceeding.

---

### 8.2 Owner Profile

**Screen:** `/owner/profile`

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | Max 50 chars |
| Phone Number | Tel | Yes | E.164 format, validated |
| UPI ID | Text | Yes | Validated format (user@bank) |
| Profile Picture | Image | No | Stored in Cache API, compressed to max 200KB |

**Behavior:**
- On save → publish **kind 0** (NIP-01) event with name/picture + **kind 30100** event with phone/UPI.
- Profile is replicated to all configured relays.
- Fetched on any device login by subscribing to `kind 0` and `kind 30100` for the user's pubkey.

---

### 8.3 Branch Management

**Screen:** `/owner/branches`

**Branch List View:**
- Shows all branches owned by the logged-in Owner.
- Each branch card shows: name, address, rating stars, active/inactive badge, vehicle count.
- FAB "+" to add new branch.

**Add / Edit Branch Screen:** `/owner/branches/new` or `/owner/branches/:branchId/edit`

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Branch Name | Text | Yes | e.g. "Bandra West Branch" |
| Address | Textarea | Yes | Full street address |
| Latitude | Number | Yes | Auto-filled from map pin or GPS |
| Longitude | Number | Yes | Auto-filled from map pin or GPS |
| Phone | Tel | No | Branch-specific phone |
| Is Active | Toggle | Yes | Default true |

**Map Picker:**
- Embedded Leaflet map.
- User can drag a pin to set lat/lng.
- "Use my current location" button fills in coordinates automatically.
- Reverse geocoding via [Nominatim (OSM)](https://nominatim.openstreetmap.org) to fill address field.

**Behavior:**
- Publish/update **kind 30101** event on save with `d` tag = branchId.
- Branch becomes discoverable on the Rider's map immediately after relay confirmation.

---

### 8.4 Vehicle Listing

**Screen:** `/owner/branches/:branchId/listings`

**Listing List View:**
- List of vehicles for the selected branch.
- Each card shows: vehicle name, number, price/day, stock count, Published/Draft badge, Booked/Available badge.
- Edit and Delete actions per card.

**Add / Edit Listing Screen:** `/owner/listings/new?branchId=xxx` or `/owner/listings/:listingId/edit`

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Vehicle Name | Text | Yes | e.g. "Honda Activa 6G" |
| Vehicle Number | Text | Yes | Registration plate |
| Vehicle Type | Select | Yes | Bike / Scooter / Cycle / Car / Other |
| Price Per Day | Number | Yes | INR, min ₹1 |
| Security Amount | Number | Yes | INR, min ₹0 |
| Quantity | Number | Yes | How many units of this vehicle |
| Images | Multi-image upload | No | Max 5, max 2MB each before compression |
| Description | Textarea | No | Max 500 chars |
| Is Published | Toggle | Yes | Draft (only Owner sees) vs Published (public) |

**Image Handling:**
- Images selected via file picker or Capacitor camera.
- Compressed client-side to max 500KB using `browser-image-compression`.
- Stored in **Cache API** under key `Rentizo-images/{listingId}/{index}`.
- On publish, images are base64-encoded and embedded in the Nostr event content (for MVP simplicity). Future: NIP-94 file upload to a media server.

**Behavior:**
- Draft listings (isPublished = false) are published to relays with `isPublished: false` in content — they appear in owner's dashboard but are filtered out by Rider-side queries.
- On delete → publish a **kind 5** deletion event referencing the listing event ID.
- `isBooked` is automatically computed: true when `availableQuantity <= 0` based on confirmed bookings.

---

### 8.5 Rider Profile

**Screen:** `/rider/profile`

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | Max 50 chars |
| Phone Number | Tel | Yes | Shared with Owner at booking time |
| Profile Picture | Image | No | Max 200KB |

**Behavior:**
- Published as **kind 0** + **kind 30103** event.
- On new device login, re-fetched from relays using pubkey subscription.
- Multi-device sync: since profile is a replaceable event on Nostr, the latest version is always the authoritative one.

---

### 8.6 Discovery & Search

**Screen:** `/discover` (default landing for Riders after login)

**Map View:**
- Full-screen Leaflet map centered on rider's current location (or last known location from IndexedDB).
- Branch markers shown as custom pins.
- Marker cluster for dense areas.
- Bottom sheet / drawer shows nearby branch cards.
- Filter chips: Vehicle Type, Max Price/Day, Available Now.

**List View:** (toggle)
- Sorted by distance from current location.
- Each card shows: Branch name, address, distance, rating, top vehicle types, price range.

**Search Bar:**
- Text search across branch name and vehicle name (client-side, against cached IndexedDB data).
- Location search: type a city/locality → geocode via Nominatim → re-center map.

**Discovery Mechanics (Nostr Queries):**
- On app load, subscribe to `kind 30101` (branches) and `kind 30102` (listings) events from all relays.
- Filter by `isPublished: true` in listing content.
- Store results in Dexie `branches` and `listings` tables for offline browsing.
- Geo-filtering: done client-side using Haversine formula against stored lat/lng.
- Default radius: 10km from current location. User can adjust via slider.

**Branch Detail Page:** `/branches/:branchId`
- Branch info (name, address, phone, rating/reviews).
- Vehicle listing cards: image carousel, name, price/day, security, available units, "Add to Cart" button.
- Disabled state if `isBooked: true`.

---

### 8.7 Booking Flow

**Cart:**
- Rider can add multiple vehicles from the **same branch** to a cart.
- Cart is stored in Zustand (in-memory) and persisted to Dexie for session recovery.
- Cart shows: vehicle name, quantity selector (max = available quantity), price/day, subtotal.
- Branch-locked: adding from a different branch clears current cart with a confirmation dialog.

**Booking Form:** `/booking/checkout`

**Fields:**
| Field | Type | Notes |
|-------|------|-------|
| Rider Name | Text | Pre-filled from Rider profile, editable |
| Rider Phone | Tel | Pre-filled from Rider profile, editable |
| Start Date | Date Picker | Min = today |
| End Date | Date Picker | Min = start date + 1 day |
| Duration | Auto-computed | In days |
| Vehicles | Read-only summary | From cart |
| Total Rental Amount | Auto-computed | pricePerDay × days × quantity per item |
| Security Amount | Auto-computed | Sum of security per item × quantity |
| Grand Total | Auto-computed | Total rental + security |

**On Submit:**
- Create `BookingRequest` object.
- Encrypt with Owner's pubkey via NIP-04.
- Publish as **kind 4** DM to relays.
- Save booking to Dexie `bookings` table with status `pending`.
- Navigate to **Booking Confirmation Screen**.

**Booking Confirmation Screen:** `/booking/:bookingId/confirm`
- Summary of booking.
- Status: "Pending — waiting for owner to confirm".
- QR Code section: shows UPI payment QR for the **security amount** (paid upfront before pickup).
- Instructions: "Show this QR to the owner when you pick up your vehicle. Pay the full rental amount as agreed."
- "Share Booking" button (Capacitor share / Web Share API).

---

### 8.8 QR Payment Verification

**UPI QR Generation (Rider side):**

The QR encodes a standard UPI deep link:
```
upi://pay?pa={ownerUpiId}&pn={ownerName}&am={securityAmount}&cu=INR&tn=Rentizo+Booking+{bookingId}
```

This QR can be scanned by any UPI app (GPay, PhonePe, Paytm, etc.).

**Owner Side — Booking Management:** `/owner/bookings`

- List of all incoming `kind 4` DMs that are parsed as `BookingRequest`.
- Tabs: Pending | Confirmed | Completed | Rejected.
- Each booking card shows: rider name, phone, vehicle(s), dates, amounts, status.

**Booking Actions (Owner):**
- **Confirm** → publishes a **kind 4** reply DM to rider with status `confirmed`.
- **Reject** → publishes a **kind 4** reply DM with status `rejected` and optional reason.

**QR Scanner (Owner):**
- After verbal/call confirmation with rider, owner can optionally scan the UPI receipt QR from the rider's payment app to record payment confirmation.
- Or simply mark booking as `confirmed` manually after verifying UPI payment notification.

**Pickup Flow:**
1. Rider arrives at branch.
2. Rider shows booking QR (the UPI payment QR from the app) to Owner.
3. Owner verifies payment via their UPI app notification.
4. Owner taps "Confirm" in the app → booking moves to `confirmed`.
5. Rider departs with vehicle.

**Return Flow:**
1. Rider returns vehicle.
2. Owner taps "Mark Completed" → booking moves to `completed`.
3. Rider is prompted to leave a branch review.

---

### 8.9 Reviews & Ratings

- Only Riders with a `completed` booking for a branch can submit a review.
- Review consists of: 1–5 star rating + optional text comment (max 280 chars).
- Published as **kind 30104** Nostr event with reference tags to branchId and bookingId.
- Branch rating displayed = simple average of all kind 30104 events for that branch.
- Ratings computed client-side from fetched review events; not stored on any central server.

---

## 9. Multi-Device Sync

**The core sync mechanism is Nostr itself.** Because all mutable data (profile, branches, listings, booking DMs) is published to public/private relays, any device that logs in with the same keypair can reconstruct full state by querying relays.

### Sync Strategy by Data Type

| Data | Nostr Event Kind | Sync Mechanism |
|------|-----------------|----------------|
| Owner Profile | kind 0 + kind 30100 | Replaceable events; latest wins |
| Rider Profile | kind 0 + kind 30103 | Replaceable events; latest wins |
| Branches | kind 30101 | Parameterized replaceable; `d` tag = branchId |
| Listings | kind 30102 | Parameterized replaceable; `d` tag = listingId |
| Booking Requests | kind 4 (DM) | Fetched on each login; stored in Dexie |
| Reviews | kind 30104 | Append-only; fetched fresh on branch detail view |
| Deleted items | kind 5 | Deletion events respected on all devices |

### On New Device Login Sequence
1. User enters `nsec` / uses NIP-07.
2. App derives `npub`.
3. App queries all relays for:
   - `{kinds: [0, 30100], authors: [pubkey]}` → profile
   - `{kinds: [30101], authors: [pubkey]}` → branches
   - `{kinds: [30102], authors: [pubkey]}` → listings
   - `{kinds: [4], '#p': [pubkey]}` → received DMs (bookings)
   - `{kinds: [4], authors: [pubkey]}` → sent DMs (booking requests sent by rider)
4. All results written to Dexie tables.
5. Images referenced in listing events are fetched and cached in Cache API.
6. App is fully functional within seconds of relay response.

### Conflict Resolution
- Nostr replaceable events (`kind 0`, `kind 30100`–`30104`) are resolved by **highest `created_at`** timestamp.
- Dexie `put()` with the event's `created_at` as the update guard prevents stale overwrites.
- Append-only events (kind 4 DMs, kind 30104 reviews) are deduplicated by event ID in Dexie.

---

## 10. Offline & PWA Behavior

### Service Worker Strategies (Workbox)

| Resource | Strategy | TTL |
|----------|-----------|-----|
| App shell (HTML/JS/CSS) | Cache First | App version |
| MUI fonts, icons | Cache First | 30 days |
| OpenStreetMap tiles | Stale While Revalidate | 7 days |
| Vehicle images | Cache First (Cache API) | Until listing deleted |
| Nostr relay data | Network First with IndexedDB fallback | Real-time |

### Offline Capabilities
- **Browse** previously fetched listings and branches ✅
- **View** saved branch details and vehicle info ✅
- **Prepare** a booking (form filled, queued) ✅
- **Submit** booking — queued in Dexie, published when back online ✅
- **Publish** new listing — queued, published on reconnect ✅
- **Real-time relay subscription** — ❌ requires network

### Background Sync
- Use **Workbox Background Sync** to queue failed Nostr event publishes.
- On reconnect, queued events are replayed automatically.

### PWA Install Prompt
- Show install banner after 2nd visit or first listing browse.
- Custom install UI (not browser default) using `beforeinstallprompt` event.

---

## 11. Storage Architecture

```
IndexedDB (Dexie)
├── identities        { pubkey, encryptedPrivkey, role, createdAt }
├── ownerProfiles     { pubkey, name, phone, upiId, profilePicture, nostrEventId, updatedAt }
├── riderProfiles     { pubkey, name, phone, profilePicture, nostrEventId, updatedAt }
├── branches          { id, ownerPubkey, branchName, address, lat, lng, isActive, nostrEventId, updatedAt }
├── listings          { id, branchId, ownerPubkey, vehicleName, vehicleNumber, pricePerDay, ... }
├── bookings          { id, riderPubkey, ownerPubkey, status, items, amounts, dates, ... }
├── reviews           { id, branchId, reviewerPubkey, rating, comment, nostrEventId }
├── cart              { id, branchId, items: [{listingId, quantity}] }
├── pendingPublish    { id, eventJson, retryCount, createdAt }  ← offline queue
└── settings          { relays: [], defaultRadius: 10, theme: 'light' }

Cache API (browser)
├── Rentizo-images
│   ├── listing/{listingId}/0   ← Blob
│   ├── listing/{listingId}/1
│   ├── profile/{pubkey}
│   └── ...
└── rentizo-tiles              ← OSM map tile cache (managed by Workbox)
```

### Dexie Schema Example

```typescript
const db = new Dexie('RentizoDB');
db.version(1).stores({
  identities:    '&pubkey, role',
  ownerProfiles: '&pubkey, updatedAt',
  riderProfiles: '&pubkey, updatedAt',
  branches:      '&id, ownerPubkey, lat, lng, isActive, updatedAt',
  listings:      '&id, branchId, ownerPubkey, isPublished, vehicleType, updatedAt',
  bookings:      '&id, riderPubkey, ownerPubkey, status, createdAt',
  reviews:       '&id, branchId, reviewerPubkey, rating',
  cart:          '&id, branchId',
  pendingPublish:'&id, retryCount, createdAt',
  settings:      '&key',
});
```

---

## 12. Image & File Handling

### Upload Flow (Owner)
1. Owner selects images via file picker (`<input type="file" multiple accept="image/*">`) or Capacitor Camera.
2. Images are compressed client-side using `browser-image-compression`:
   - Max width: 1200px
   - Max file size: 500KB
   - Format: JPEG
3. Compressed blob stored in **Cache API** under `rentizo-images/listing/{listingId}/{index}`.
4. A local URL (`URL.createObjectURL(blob)`) is used for preview in the UI.
5. When publishing the listing event to Nostr:
   - **MVP approach:** Convert image to base64 and embed in event `content` JSON. (Simple but increases event size — suitable for small images ≤ 500KB each.)
   - **Future:** Upload to a NIP-94 compatible media server (e.g. nostr.build, void.cat) and store the returned URL in the event.

### Image Display Flow (Rider)
1. Rider browses listings → app checks Cache API for listing images.
2. If not cached → decode base64 from Nostr event content → store to Cache API.
3. Display from Cache API blob URL.
4. Placeholder skeleton shown while loading.

---

## 13. Notifications

### In-App Notifications
- **Owner:** Badge/count on Bookings tab when new kind 4 DMs arrive.
- **Rider:** Status updates when booking is confirmed/rejected (detected by polling kind 4 DMs).

### Push Notifications (Capacitor only — future)
- Use **@capacitor/push-notifications** + a minimal relay-watching server (or a NIP-65 relay that supports push).
- MVP: no push notifications; rely on in-app polling while app is open.

### Polling Strategy
- While app is in foreground: maintain live WebSocket subscription via NDK.
- While app is backgrounded (PWA): rely on service worker Background Sync for pending outbox.

---

## 14. Security Considerations

| Threat | Mitigation |
|--------|-----------|
| Private key theft | AES-256-GCM encryption with PIN; never stored in localStorage; cleared on logout |
| Fake listings | All events signed with keypair; fake listings require a fake identity; reputation via reviews |
| Spam bookings | DMs are NIP-04 encrypted; spam can be muted by pubkey in future |
| Phone/UPI exposure | Only shared in NIP-04 encrypted DMs between rider and owner; not in public events |
| Image hosting | Base64 in events — no external upload server in MVP; no SSRF risk |
| Relay censorship | App connects to multiple relays; user can add custom relays |
| Replay attacks | Nostr events have unique IDs (SHA-256 of content); relays deduplicate |
| Man-in-the-middle | All relay connections over WSS (TLS); Nostr events cryptographically signed |

### Private Key PIN Encryption

```typescript
// Encryption
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']),
  { name: 'AES-GCM', length: 256 },
  false, ['encrypt', 'decrypt']
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, privkeyBytes);
// Store: { salt, iv, encrypted } in Dexie identities table
```

---

## 15. Capacitor / Native Build

### Setup

```bash
npm install @capacitor/core @capacitor/cli
npx cap init Rentizo com.rentizo.app
npm install @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

### Capacitor Plugins Used

| Plugin | Reason |
|--------|--------|
| `@capacitor/geolocation` | Native GPS (more accurate than browser API) |
| `@capacitor/camera` | Native camera for listing photos |
| `@capacitor/share` | Share booking QR code |
| `@capacitor/app` | Handle back button on Android |
| `@capacitor/splash-screen` | Custom splash screen |
| `@capacitor/status-bar` | Style status bar on Android/iOS |

### Build Targets

| Platform | Command | Output |
|----------|---------|--------|
| Android APK | `npx cap open android` + Android Studio build | `.apk` / `.aab` |
| iOS | `npx cap open ios` + Xcode build | `.ipa` |
| PWA (browser) | `npm run build` → deploy `dist/` to any static host | Hosted PWA |

---

## 16. Project Structure

```
rentizo/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/                 # App icons (all sizes)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── theme.js               # MUI theme config
│   │
│   ├── nostr/
│   │   ├── client.js          # NDK setup, relay config
│   │   ├── publish.js         # Event publishing helpers
│   │   ├── subscribe.js       # Subscription helpers
│   │   ├── encrypt.js         # NIP-04 DM helpers
│   │   └── eventKinds.js      # Kind constants
│   │
│   ├── db/
│   │   ├── index.js           # Dexie instance
│   │   ├── schema.js          # Table definitions
│   │   └── cache.js           # Cache API helpers for images
│   │
│   ├── store/
│   │   ├── authStore.js       # Zustand: identity, keypair session
│   │   ├── cartStore.js       # Zustand: cart state
│   │   └── uiStore.js         # Zustand: drawer, snackbar, loading
│   │
│   ├── hooks/
│   │   ├── useNostrProfile.js
│   │   ├── useBranches.js
│   │   ├── useListings.js
│   │   ├── useBookings.js
│   │   ├── useGeolocation.js
│   │   └── useImageCache.js
│   │
│   ├── pages/
│   │   ├── Auth/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   └── RoleSelect.jsx
│   │   ├── Owner/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Branches.jsx
│   │   │   ├── BranchForm.jsx
│   │   │   ├── Listings.jsx
│   │   │   ├── ListingForm.jsx
│   │   │   └── BookingManagement.jsx
│   │   ├── Rider/
│   │   │   ├── Discover.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── BranchDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── BookingConfirm.jsx
│   │   │   └── MyBookings.jsx
│   │   └── Shared/
│   │       ├── Settings.jsx
│   │       └── NotFound.jsx
│   │
│   ├── components/
│   │   ├── Map/
│   │   │   ├── RiderMap.jsx
│   │   │   └── BranchPinMap.jsx
│   │   ├── Listing/
│   │   │   ├── ListingCard.jsx
│   │   │   └── ImageCarousel.jsx
│   │   ├── Booking/
│   │   │   ├── BookingCard.jsx
│   │   │   └── UPIQRCode.jsx
│   │   ├── Branch/
│   │   │   ├── BranchCard.jsx
│   │   │   └── ReviewList.jsx
│   │   └── Common/
│   │       ├── KeypairDisplay.jsx
│   │       ├── LoadingSkeleton.jsx
│   │       └── OfflineBanner.jsx
│   │
│   └── utils/
│       ├── geo.js             # Haversine, reverse geocode
│       ├── upi.js             # UPI deep link builder
│       ├── imageCompression.js
│       ├── keyEncryption.js   # AES-GCM PIN encryption
│       └── nostrValidation.js # nsec/npub validation
│
├── capacitor.config.ts
├── vite.config.js             # includes vite-plugin-pwa
├── index.html
└── package.json
```

---

## 17. Nostr Event Kind Reference

| Kind | Type | Name | Used For |
|------|------|------|----------|
| 0 | Replaceable | Metadata | Name, profile picture (NIP-01) |
| 4 | Regular | Encrypted DM | Booking requests, booking status updates (NIP-04) |
| 5 | Regular | Deletion | Delete a listing or branch event (NIP-09) |
| 30100 | Param. Replaceable | Owner Extended Profile | Phone, UPI ID |
| 30101 | Param. Replaceable | Branch | Branch info, location |
| 30102 | Param. Replaceable | Vehicle Listing | Vehicle details, images, pricing |
| 30103 | Param. Replaceable | Rider Profile | Rider phone, preferences |
| 30104 | Param. Replaceable | Branch Review | Rating + comment for a branch |

All custom kinds (30100–30104) use the `d` tag as the unique identifier per user per record, enabling parameterized replaceability.

---

## 18. User Scenarios (End-to-End Flows)

### Scenario A: Owner Sets Up Shop

1. Rani downloads Rentizo app on her Android phone.
2. She taps "Create new account" → app generates her keypair → she saves her `nsec`.
3. She selects "Owner" role.
4. She fills in her profile: Name = "Rani Bikes", Phone = +91-98xxx, UPI = ranibikes@okaxis.
5. She taps "Add Branch" → enters "Bandra West Branch" → taps "Use Current Location" → saves.
6. She opens the branch → taps "+ Add Vehicle" → fills in: "Honda Activa 6G", MH12AB1234, ₹300/day, ₹1000 security, qty 3, uploads 4 photos.
7. She toggles "Published" → listing is live on Nostr relays within seconds.

### Scenario B: Rider Discovers and Books

1. Arjun opens Rentizo in his browser on his iPhone.
2. He logs in with his existing `nsec`.
3. He's on the Discover map — sees Rani's branch pin 2.3km away.
4. He taps the pin → sees branch detail → sees Activa 6G for ₹300/day.
5. He taps "Add to Cart" → quantity 1.
6. He taps "Proceed to Book" → fills in dates: 1st–3rd April (3 days).
7. Summary shows: Rental ₹900 + Security ₹1000 = ₹1900 total.
8. He taps "Submit Booking Request" → app sends encrypted DM to Rani's pubkey.
9. App shows booking confirmation screen with UPI QR for ₹1000 (security amount).
10. App shows: "Wait for the owner to confirm. Then show this QR at pickup."

### Scenario C: Owner Processes Booking

1. Rani opens app → sees red badge "1 New Booking" on bookings tab.
2. She opens it: Arjun wants Activa 6G for April 1–3. Rental ₹900, Security ₹1000.
3. She taps "Confirm" → app sends encrypted reply DM to Arjun.
4. Arjun's app updates: "Booking Confirmed! ✅"

### Scenario D: Pickup & Return

1. April 1st: Arjun arrives at Bandra West Branch.
2. He shows Rani the UPI QR from the app.
3. Rani opens her UPI app, scans the QR, confirms ₹1000 security receipt.
4. Arjun pays ₹900 rental separately via any UPI.
5. Rani hands over the scooter.
6. April 3rd: Arjun returns the scooter. Rani taps "Mark Completed" in the app.
7. Arjun gets a prompt: "Leave a review for Bandra West Branch?"
8. Arjun rates 5 stars + "Very smooth experience."

### Scenario E: Multi-Device Sync

1. Rani was using the app on her Android phone.
2. She gets a new phone. Installs Rentizo, enters her `nsec`.
3. App queries relays for all events by her pubkey.
4. Within 5 seconds: all her branches, listings, and booking history are back.
5. She continues managing her business without any data loss.

---

## 19. MVP Scope vs. Future Roadmap

### ✅ MVP (v1.0)

- Nostr keypair auth (nsec entry + key generation)
- Owner: profile, branches (CRUD), listings (CRUD, 5 images, publish/draft)
- Rider: profile, map discovery, branch detail, cart, checkout, booking request
- Booking flow: NIP-04 DM, status updates (pending → confirmed/rejected → completed)
- UPI QR code generation at checkout
- Multi-device sync via Nostr relays
- PWA (installable, offline browse)
- Android + iOS build via Capacitor
- Branch reviews after completed booking

### 🔮 Future (v2.0+)

| Feature | Notes |
|---------|-------|
| NIP-07 browser extension login | Alby, nos2x |
| Real-time chat between rider & owner | kind 4 chat thread |
| In-app UPI payment verification | Webhooks via UPI-aware relay or callback service |
| Push notifications | Capacitor push + relay bridge |
| NIP-94 media server image upload | Remove base64 bloat from events |
| Lightning Network micropayments | Pay deposits via Lightning; NIP-57 zaps |
| Vehicle availability calendar | Block dates on listing |
| Rider wallet / booking history | Aggregated across all branches |
| Owner analytics dashboard | Revenue, booking counts, utilization |
| Nostr relay self-hosting guide | For privacy-focused users |
| Ride-sharing / carpooling listings | Extend vehicle types |
| KYC-optional trust badges | NIP-39 identity verifications |

---

## 20. Open Questions & Decisions

| # | Question | Current Decision | Owner |
|---|----------|-----------------|-------|
| 1 | Where to host images in v1? | Base64 in Nostr event (≤500KB/image × 5 = 2.5MB max per listing) | Revisit in v2 |
| 2 | How to handle relay downtime? | Ship with 5+ hardcoded relays + user can add custom | Acceptable for MVP |
| 3 | Should booking requests be public or private? | NIP-04 encrypted DMs — private | Final |
| 4 | Should phone numbers be visible publicly? | No — only in encrypted DMs | Final |
| 5 | How to prevent duplicate booking (same vehicle booked twice)? | Optimistic: owner confirms only one; future: on-chain availability locking | MVP: manual |
| 6 | Login via NIP-07 extension for MVP? | Out of scope MVP — only nsec input | v2 |
| 7 | Multi-language / i18n? | English only for MVP | v2 |
| 8 | KYC / identity verification? | Out of scope — permissionless MVP | v3 |

---

## Appendix: Default Nostr Relays

```javascript
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
  'wss://relay.snort.social',
];
```

---

## Appendix: UPI Deep Link Format

```
upi://pay?pa={upiId}&pn={payeeName}&am={amount}&cu=INR&tn={note}
```

Example:
```
upi://pay?pa=ranibikes@okaxis&pn=Rani+Bikes&am=1000&cu=INR&tn=Rentizo+Security+BK-20240401-001
```

This link, when encoded as a QR, can be scanned by any UPI app in India.

---

*This document is the single source of truth for Rentizo MVP development. All feature decisions, data models, and architectural choices should be validated against this PRD before implementation.*