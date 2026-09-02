# Security policy

Report suspected vulnerabilities privately to hikeithawaii@gmail.com. Do not open a public issue containing credentials, exploit details, personal data, or an unpatched vulnerability.

HikeIt Hawaii does not authorize security testing that disrupts service, accesses other users' data, bypasses controls, or extracts data in bulk. Good-faith reports should include the affected URL or component, reproducible steps, impact, and suggested remediation.

## Repository and deployment rules

- Never commit `.env` files, Supabase service-role keys, Firebase service accounts, OpenAI/OpenWeather keys, signing credentials, or ingestion secrets.
- Only `EXPO_PUBLIC_*` values intended for inclusion in a mobile binary may be placed in Expo public variables.
- Rotate a credential immediately if it appears in a commit, build log, issue, screenshot, or client bundle; deleting it from the latest commit is not sufficient.
- Require multi-factor authentication for GitHub, Supabase, Render, Expo, Firebase, Apple, and Google accounts.
- Protect the production branch with pull-request review and passing CI; enable GitHub secret scanning, push protection, Dependabot alerts, and private vulnerability reporting.
