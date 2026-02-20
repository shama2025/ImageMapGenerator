# Contributing to Image Map Generator

Thank you for your interest in contributing!  
This guide explains how to set up the project and how to make changes safely.

---

## Who This Is For

This document is for anyone who wants to:

- Fix bugs
- Improve features
- Clean up or refactor code
- Help maintain the project

---

## Setup

You can refer to the [README](./README.md) for general instructions.  
The setup steps are also listed here for convenience.

### Prerequisites

- Node.js (see `.nvmrc` if present)
- npm
- (Optional) `make`
- Android Studio (Compatible with Mac and Windows)
- XCode (Compatible with Mac only)

### Installation

```bash
git clone https://github.com/shama2025/ImageMapGenerator.git
cd ImageMapGenerator
npm install

npm run dev

# If make is installed
make build

# Otherwise
npm run build
```

The Makefile contains helper commands for syncing changes with the mobile (Capacitor) side of the project.  
If you do not have make installed, you can review the commands directly in the Makefile.

---

### Mobile Setup

```bash
# Assuming you already cloned it

make sync

#Android
make build-android

#iOS
make build-ios

#Open up the respective ide and run

# Refer to documentation for each ide
# Android Studio: https://developer.android.com/studio/run/device
# XCode: https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device
```

## How to Make Changes

### External Contributors (Recommended)

If you do not have write access to the repository:

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your changes
4. Push your branch to your fork
5. Open a Pull Request

GitHub’s official guide:  
➡ [Fork a repo](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)

### Maintainers

If you have write access to the repository:

1. Create a new branch directly in the main repository
2. Avoid committing directly to `main`
3. Open a Pull Request for review when possible

---

## Testing

There are currently no automated tests in this project.

If you would like to add tests, they should ideally cover:

- Web browsers
- iOS
- Android

Manual testing is currently required before submitting changes.

---

## What to Watch Out For

- File export and ZIP generation logic
- Mobile-specific code related to Capacitor
- Differences between web and mobile behavior
- How the annotation object is saved
- Due to mobile security restrictions, the app requires a local server to access the files [Android App](https://play.google.com/store/apps/details?id=com.phlox.simpleserver&hl=en_US&pli=1) since I do not have an IPhone I could not find an app that can run a local host without internet

---

## Reporting Bugs

Please report bugs by opening a GitHub Issue and include:

- What you expected to happen
- What actually happened
- Steps to reproduce the issue
