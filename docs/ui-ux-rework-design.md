# Nightfall UI/UX Rework — Design Direction

## Experience Positioning

The redesigned interface will present Nightfall as a **calm, source-aware study-abroad companion**, not as a dense technical control room. The new experience will retain the product’s essential darkness but move from flat graphite monochrome to a more human, navigable **midnight-indigo atlas**: layered navy surfaces, soft moonlit neutrals, aurora mint for progress and confirmation, and restrained amber for time-sensitive attention. Space Grotesk remains the expressive display and interface face, IBM Plex Mono continues to signal evidence and system metadata, and IBM Plex Sans Arabic remains the RTL-safe Arabic choice.

| Design concern | Current tendency | Rework direction |
| --- | --- | --- |
| Visual hierarchy | Similar-looking panels compete for attention | Establish a clear page title, an obvious next action, then grouped supporting content |
| Color | Nearly monochrome, low semantic contrast | Use indigo depth with semantic mint, amber, rose, and sky states while preserving a dark Nightfall identity |
| Navigation | Tool navigation is split across headers, query state, and page sections | Give student tools a persistent, responsive navigation rail and a concise mobile tool bar |
| Information density | Dense borders and very small labels | Use quieter surfaces, predictable card padding, readable metadata, and responsive action placement |
| Interaction feedback | Many actions are technically available but visually subdued | Improve hover, active, focus-visible, selected, disabled, loading, and empty-state affordances |
| Trust language | Safety boundaries are present but visually secondary | Make review-first, source-linked, and private-data boundaries easy to spot without becoming alarming |

## Visual System

| Token family | Intended use |
| --- | --- |
| Midnight base | `#080B1A` backgrounds, ambient gradients, page shell |
| Elevated indigo | `#101936` primary panels and workspace surfaces |
| Glass blue | `rgba(22, 34, 70, .72)` header and overlay layers |
| Moonlight | `#F6F7FB` primary foreground and primary-action fill contrast |
| Mist | `#B9C4DD` supporting copy and data labels |
| Aurora mint | `#68E1BD` positive state, active navigation, completed flow, focus ring |
| Solar amber | `#F7C76C` pending, deadline, and attention state |
| Rose signal | `#FF8F9B` destructive/error state |
| Iris | `#A9A7FF` discovery, research, and generative-assistance accents |

Shared components will use one 14px visual radius, elevated panel shadows, a fine blue-white border, a faint star-map grid, and gradient edge illumination. Motion will remain brief and optional, with existing `prefers-reduced-motion` behavior respected.

## Screen-Level Improvements

The public landing page will retain its existing content and interactions while tightening the story into a high-contrast editorial sequence, with a richer hero atmosphere and more actionable product previews. Authentication and onboarding will become a clear two-column “journey checkpoint” experience that better communicates privacy, progress, and what happens next.

The student journey will gain a consistent application shell. The home state will foreground the user’s next meaningful step, while the tool workspace will use a tab rail and clear contextual headers. Discovery, comparison, calendar, communications, source watch, and documents will retain their logic but be surfaced through more legible control groups and responsive content areas.

Operations will remain a data-forward workspace but inherit the same surface, status, spacing, and focus conventions. Its command palette, filters, drawers, and tables will be visually distinguished as operational controls rather than competing blocks.

## Preservation Checklist for Implementation

The implementation must keep the current Wouter paths, query-string semantics, tRPC procedure calls, fetch endpoints, local state, callback shapes, bilingual copy selection, and approval-first boundaries exactly as they are. The rework will be achieved through a shared global token layer and targeted JSX layout changes only; the server and domain logic will not be modified.
