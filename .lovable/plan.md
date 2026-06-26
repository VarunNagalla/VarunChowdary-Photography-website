## Goal
Rewrite the public site copy in a personal, honest tone and drop the Studio block from the Contact section. All editable copy lives in the `site_content` table, so this is mostly a data update plus one small frontend change.

## Changes

### 1. Update `site_content` rows (SQL update, no schema change)
Overwrite the `content` JSON for these sections:

- **hero**
  - eyebrow: `Personal photography`
  - title: `Moments I captured,`
  - italic_title: `the way I saw them.`
  - description: `This is a personal collection of photos I've taken through my lens. Each image is a moment, place, or detail I wanted to remember and share.`
  - cta_text: `View My Work`
  - cta_link: `#work`

- **work**
  - eyebrow: `Favorite frames`
  - title: `Photos I personally`
  - italic_title: `captured and love.`
  - description: `A small selection of frames I keep coming back to — moments of light, place, and memory caught through my lens.`

- **about**
  - eyebrow: `About — Varun`
  - title: `I'm Varun,`
  - italic_title: `a passionate photographer.`
  - paragraph_1: `I'm Varun, a passionate photographer who enjoys capturing moments, places, people, light, and small details that usually go unnoticed. Photography is something I do because I genuinely love seeing the world through a camera.`
  - paragraph_2: `This website is a personal space for the images I've taken. Every photo here is part of my journey, my perspective, and the way I choose to remember a moment.`
  - stats: removed (set to empty array) — stats imply professional metrics, which conflicts with the personal tone.

- **contact**
  - eyebrow: `Let's connect`
  - title: `Like my photos?`
  - italic_title: `Let's connect.`
  - email_label: `Write`, email kept (or you can tell me the address you want here — defaults to current `hello@varunnagalla.com`)
  - instagram_label: `Instagram`, instagram + instagram_link kept
  - studio fields removed (no longer rendered)

- **footer**
  - brand_name: `VC Photography`
  - copyright_text: `VC Photography. All rights reserved.`
  - protection_text: `All photos shown here are captured and shared as part of my personal photography portfolio.`
  - commission_text: `Connect` (replaces "Commission" CTA in header)

### 2. Frontend: remove the Studio block from Contact (`src/routes/index.tsx`)
- Delete the third `<ContactBlock />` (Studio) inside the `Contact` component.
- Change the contact grid from `md:grid-cols-3` → `md:grid-cols-2` so the two remaining blocks (Write / Instagram) lay out cleanly.
- No other components touched. Header, Hero, Work, About, Footer remain wired to Supabase content as today.

### 3. Admin dashboard
No code changes needed — the `/admin` Website Content editor already exposes every field above, so once the seed is updated you can keep editing each field freely from `/admin`.

### Out of scope
- The earlier admin "page didn't load" issue (RLS / `has_role` permission) and the "restrict admin to one user" request are not part of this turn. Say the word and I'll do them next.
