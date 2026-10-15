# Verified Iraqi month starts

The current Umm al-Qura date is preserved until a verified Ramadan 1448 or later announcement. After that, Ramadan/Shawwal/Dhul-Hijjah anchors carry a calculated offset until the next verified announcement. Offline clients keep their last anchors. No fixed sect offset is used.

Supabase project ytdvhiijxxaqofduorwm runs hijri-sync every five minutes via pg_cron/pg_net. Public GET returns read-only anchors; POST requires a private database secret. Tables use RLS. Never put the service-role key or sync secret in client code.

Deploy server/hijri-sync.js as index.js, js/hijri-calendar-core.js as hijri-core.js and server/hijri-announcement-parser.js as announcement-parser.js with deno.json {"imports":{}}. Keep the deployed shared core synchronized. docs/hijri-sync-schema.sql records the applied schema/schedule, not a repeatable migration.

Sources currently attempted: official dws.gov.iq RSS and INA RSS quoting the Sunni Waqf. The parser requires fresh, explicit month-start announcements and rejects ambiguity/conflicts. On 2026-10-15 DWS could not connect and INA RSS was stale; no confirmed anchors were inserted. The supplied Facebook share URL could not be fetched programmatically. Official Facebook posts are visible in web search, but no supported automatic Facebook feed has been connected. Do not claim live official synchronization is verified. A reachable official machine feed or authorized Facebook API integration remains necessary for dependable ingestion. Do not populate calculated dates as official announcements.

Tests cover per-occasion posters, date boundaries, Eid exclusions, parser validation, opt-in defaults and offline date persistence.
