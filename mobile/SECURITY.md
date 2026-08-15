# Security notes

The mobile app intentionally avoids ads, analytics, remote location storage, and account SDKs in version 1. Location matching, order history, and settings stay on device.

`npm audit` currently reports advisories in Expo's build toolchain through Metro `image-size@1.2.1` and Xcode project tooling `uuid@7.0.3`. Expo Doctor passes all SDK compatibility checks, and these packages are build-time dependencies rather than application network services. `npm audit fix --force` proposes downgrading Expo across major SDK versions and must not be used. Re-check after Expo SDK updates and adopt the upstream patched dependency graph when available.

Never commit Apple certificates, provisioning profiles, App Store Connect `.p8` keys, passwords, EAS tokens, or local environment files.
