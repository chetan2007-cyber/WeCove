# 1. Complete Platform Inventory Report: CampZen Migration

**Product Identity**: CampZen  
**Company Identity**: WeCove.in (`https://wecove.in`)  
**Target Package ID**: `in.wecove.campzen`  
**Date**: November 25, 2026  

---

## Executive Summary
This document provides a comprehensive inventory of all 12 platform components across the technical ecosystem undergoing the official rebranding from the legacy Kami identity to **CampZen**, operated exclusively by **WeCove.in**.

---

## Component Inventory

### 1. Student Mobile Application
- **Framework**: React Native 0.81.5, Expo SDK 54, React 19, TypeScript
- **Package ID**: Migrated from `com.kamimobile` to `in.wecove.campzen`
- **Application Label**: `CampZen`
- **Icons & Splash**: Updated with official CampZen squircle graduation-cap logo and branding palette (`#6F4E37`, `#FAF9F6`)
- **Key Modules**: Authentication (`src/features/auth`), Orders (`src/features/orders`), Document Viewer, Campus Selector, Stationery Store

### 2. Vendor Mobile Application
- **Framework**: React Native, Expo, TypeScript
- **Target Audience**: Campus print-shop operators and staff
- **Branding**: Rebranded in source code to CampZen Vendor.
- **Distribution Scope**: **Strictly excluded** from public website APK download; maintained for authorized internal operator release.

### 3. Backend API Service
- **Runtime**: Node.js v24 LTS, Express.js
- **Hosting**: Render Cloud Web Service (`campzen-server.onrender.com`)
- **Custom Domain**: `api.wecove.in` (HTTPS with Cloudflare / Render SSL)
- **Database Connection**: MongoDB Atlas production cluster pointing to `campzen_production`

### 4. Database Layer
- **Engine**: MongoDB Atlas (Replica Set `atlas-10m6n7-shard-0`)
- **Legacy Database**: `test` (19 collections preserved untouched as cold archive)
- **Production Database**: `campzen_production` (100% data fidelity, indexes verified)

### 5. Admin & Operator Interfaces
- **Capabilities**: Campus rate card administration, order lifecycle oversight, vendor onboarding, print job queue monitoring.

### 6. Print Agent & Windows Spooler Bridge
- **Script**: `campzen-win-print.ps1` (with fallback compatibility bridge to legacy script name)
- **Adapter**: Windows Spooler Native GDI & virtual test spooler adapters in `printer.service.js`.

### 7. Email Notification System
- **Provider**: Resend HTTPS REST API (bypassing Render free-tier SMTP port 465/587 blocks)
- **Verified Sender**: `CampZen by WeCove.in <otp@wecove.in>`
- **Email Types**: 6-digit registration OTP, password reset OTP, order pickup notifications.

### 8. Push Notifications & SMS
- **Services**: Expo Push Notification tokens, SMS gateway adapter configurations.

### 9. PDF & Creative Generation System
- **Engine**: `pdf-lib` + custom font embedding
- **Templates**: CampZen Order Information Sheets, Campus Pickup Passes, Customer Receipts.

### 10. Web Platform (WeCove.in)
- **Framework**: React 18, Webpack 5, TailwindCSS, Framer Motion
- **Hosting**: Render Static Site (`wecove-1.onrender.com`)
- **Domains**: `wecove.in`, `www.wecove.in`
- **Download Route**: `/download/campzen` with direct APK download at `/downloads/campzen-v1.0.0.apk`

### 11. EAS Build & Native Android Release
- **Build System**: Local Gradle 9.4.1 / Android SDK 35 & 36
- **Signing**: Production Keystore (`campzen-release-key.jks`)
- **Signer DN**: `CN=CampZen Release, OU=Engineering, O=WeCove.in, L=Bengaluru, ST=Karnataka, C=IN`

### 12. Environment & DevOps Configuration
- **Repositories**: `D:\kami` (development codebase) & `D:\wecove-live` (production deployment repo connected to `chetan2007-cyber/WeCove.git`)
- **CI/CD**: Auto-deployment on Git push to `main` branch.
