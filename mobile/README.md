# Order Radar iOS App

This directory contains the Expo and React Native mobile version of Order Radar, built with Expo SDK 57. Routine development, cloud builds, and App Store submissions can be completed from Windows without a local Mac.

## Implemented features

- Native Apple Maps view with destination markers
- GPS speed display with foreground voice and vibration alerts
- Background location and local notifications after explicit user consent
- Offline snapshot of 1,849 government-published fixed-enforcement locations
- Delivery profitability model for a Yamaha Cygnus Gryphus 125 ABS using 92-octane fuel
- Local order history, cost settings, and one-tap data deletion
- Separate onboarding consent for the Terms of Service and optional anonymous data program
- On-device location anonymization, per-record withdrawal, and no upload of raw routes
- 1024×1024 RGB App Store icon, branded launch screen, permission copy, and EAS configuration
- App Store privacy, support, and review documents

## Development on Windows

```powershell
cd mobile
npm install
npm start
```

Foreground location and map behaviour can initially be tested with Expo Go. Background location is unavailable in Expo Go and requires an EAS development build installed on a physical iPhone.

## Validation

```powershell
npm run validate
```

This command runs TypeScript checking, core calculation tests, and an iOS JavaScript bundle export.

## Refreshing the enforcement-location snapshot

Start the website API from the project root, then run the synchronization command:

```powershell
npm run dev
npm run data:mobile
```

## Building for iOS without a Mac

1. Join the Apple Developer Program and create an Expo account.
2. Run `npx eas-cli@latest login` in the `mobile` directory.
3. Run `npx eas-cli@latest init` so Expo can write a valid `projectId`.
4. Confirm that the `ios.bundleIdentifier` in `app.json` belongs to your Apple account.
5. Run `npm run build:ios:dev` and install the build on an iPhone for background-location road testing.
6. After testing, run `npm run build:ios` followed by `npm run submit:ios`.

Never commit Apple or Expo credentials, passwords, `.p8` or `.p12` files, or provisioning profiles.

Before submission, complete every item in [APP_STORE_CHECKLIST.md](./APP_STORE_CHECKLIST.md).
