# Order Radar

![Order Radar preview](public/og.png)

Order Radar is a cost calculator and road-safety companion for delivery couriers in Taiwan, including riders working with Uber Eats and foodpanda. It estimates the real value of an order, displays live speed, and warns about fixed speed cameras and automated traffic-enforcement locations published by government sources.

## Core features

1. **Order profitability and effective hourly rate** — Enter the delivery fee, distance, and estimated duration. The calculator subtracts fuel, oil, tires, maintenance, and vehicle depreciation, then returns a green, yellow, or red recommendation.
2. **Fixed-camera and automated-enforcement alerts** — More than 1,800 government-published locations support live speed display and advance voice or vibration warnings.
3. **Privacy-first location processing** — Radar matching runs locally on the device. Live GPS routes are neither stored nor uploaded. Optional market data is anonymized into approximately two-kilometre areas before leaving the phone.
4. **Web and native mobile experiences** — The web application provides quick calculations and API services, while the Expo application adds offline enforcement data, Apple Maps, background location, and local notifications.

## Architecture

| Platform | Technology | Purpose |
| :--- | :--- | :--- |
| **Web application and API** | Next.js 16, React 19, vinext, Tailwind CSS 4, Cloudflare Workers, and D1 | Web order calculator, APIs, support pages, privacy policy, and terms |
| **Mobile application** | Expo SDK 57, React Native 0.86, and Apple Maps | Native iOS experience with offline data, background location, and voice alerts |

## Requirements

- Node.js `>= 22.13.0`
- npm, included with Node.js

## Quick start

### Web application

```bash
npm install
npm run dev
```

Open <http://localhost:3000/>. The development-only diagnostic page is available at <http://localhost:3000/__debug>.

### Mobile web preview

```bash
cd mobile
npm install
npx expo start --web
```

Open <http://localhost:8081>. To preview the mobile layout in a desktop browser, open the browser developer tools and switch device emulation to an iPhone 14 Pro or 15 Pro.

Native maps, background location, and some device services require an Expo development build on a physical device; they are not fully available in the browser preview.

## Common commands

### Project root

- `npm run dev` — Start the local web development server
- `npm run build` — Build and validate the vinext web output
- `npm test` — Run the web build and server-rendered page tests
- `npm run db:generate` — Generate Drizzle ORM database migrations
- `npm run data:mobile` — Refresh the mobile enforcement-location snapshot from the local API

### Mobile application

- `npx expo start --web` — Start the React Native Web preview
- `npm start` — Start Expo Metro for Expo Go or an EAS development build
- `npm test` — Run the Vitest unit tests
- `npm run validate` — Run TypeScript checks, unit tests, and an iOS JavaScript bundle export
- `npm run build:ios:dev` — Create a cloud-hosted development build through EAS

## Project structure

```text
order-radar/
├── app/                        # Next.js pages and API routes
│   ├── OrderCalculator.tsx     # Delivery cost and net-income calculator
│   ├── NavigationPanel.tsx     # Web enforcement map and location list
│   ├── api/                    # Orders, enforcement data, feedback, and optional data program
│   ├── privacy/ and terms/     # App Store-compatible policy pages
│   └── chatgpt-auth.ts         # Sign in with ChatGPT authentication helper
├── mobile/                     # Expo and React Native iOS application
│   ├── App.tsx                 # Application entry point and tab navigation
│   ├── src/
│   │   ├── components/         # Cross-platform map and input components
│   │   ├── screens/            # Calculator, radar, history, settings, and onboarding
│   │   ├── order-engine.ts     # Cost and hourly-rate calculation engine
│   │   ├── enforcement.ts      # Offline enforcement-distance matching and cache
│   │   └── background-location.ts
│   └── store/                  # App Store review metadata and privacy labels
├── db/                         # Cloudflare D1 schema and migrations
├── worker/                     # Cloudflare Workers entry point
├── scripts/                    # Government-data synchronization tools
└── tests/                      # Web rendering tests
```

## Privacy and safety

- Live location matching happens on the user's device.
- Raw location history and complete routes are not uploaded.
- Optional market-data contributions are anonymized on the phone and can be withdrawn.
- Enforcement locations come from Taiwan government open-data sources and are provided only as a road-safety aid.
- Drivers remain responsible for observing road conditions, traffic laws, and posted speed limits.

## License

No open-source license is currently granted for the project as a whole. The source code is publicly viewable for portfolio and evaluation purposes; all rights are reserved unless stated otherwise. Third-party components remain subject to their respective licenses.
