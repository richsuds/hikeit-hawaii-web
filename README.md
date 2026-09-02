# HikeIt Hawaii website

Public website client for [hikeithawaii.com](https://hikeithawaii.com). The proprietary trail-intelligence engine, credentials, database migrations, and ingestion services are maintained in a separate private repository.

## Local development

Copy `.env.example` to `.env`, set the public API URL, then run `npm install` and `npm run dev`.

No service-role keys, weather-provider secrets, Firebase service accounts, signing credentials, or calculation logic belong in this repository.
