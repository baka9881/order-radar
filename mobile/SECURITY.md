# Security notes

The mobile app intentionally avoids ads, cross-app tracking, remote precise-location storage, and account SDKs in version 1. Radar location matching, complete order history, and settings stay on device.

The optional market data program is off until the user makes a separate choice. On each explicit order save, exact values are bucketed on-device and any last-known coordinate is reduced to a roughly 2 km grid before transmission. Contributions contain no account, email, device identifier, raw route, order identifier, or screenshot. Each row has a random receipt used only for user-requested deletion and expires after 180 days. Never expose raw contribution rows to buyers; only release aggregates that meet the documented minimum cohort threshold.

`npm audit` currently reports advisories in Expo's build toolchain through Metro `image-size@1.2.1` and Xcode project tooling `uuid@7.0.3`. Expo Doctor passes all SDK compatibility checks, and these packages are build-time dependencies rather than application network services. `npm audit fix --force` proposes downgrading Expo across major SDK versions and must not be used. Re-check after Expo SDK updates and adopt the upstream patched dependency graph when available.

Never commit Apple certificates, provisioning profiles, App Store Connect `.p8` keys, passwords, EAS tokens, or local environment files.
