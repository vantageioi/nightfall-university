# Visual Validation Notes

## Rendered Landing Page Check

A desktop preview was captured at 1440 × 1200 after correcting the JSX runtime configuration. The React application now mounts and renders the landing-page DOM successfully. The updated midnight-indigo background and Dotted Earth illustration render, and the hero visual retains its intended global-atlas atmosphere.

The first visual pass also exposed an issue that requires correction before delivery: the hero content and fixed navigation appear beneath or visually subdued by the Dotted Earth layer in the captured viewport. This is a stacking-context problem rather than a content or routing problem. The next implementation step will explicitly place the hero canvas behind the page content and strengthen the hero text layer so navigation and primary calls to action maintain their required contrast.

The initial blank headless preview was traced to the original project’s JSX setting (`preserve`) causing a `React is not defined` runtime error. The application now uses the automatic JSX runtime (`react-jsx`), which resolves the mount failure project-wide.

## Final Responsive Preview

After enabling Tailwind’s Vite integration in the middleware server, the complete utility stylesheet was emitted and the hero hierarchy rendered correctly. The final desktop preview shows a readable fixed navigation, high-contrast editorial headline, aurora primary action, properly layered Dotted Earth, and a complementary consulting example card.

The 390 × 844 mobile preview preserves the brand mark, language and sound controls, primary CTA, globe, eyebrow, headline, supporting copy, and scroll cue without horizontal overflow or illegible controls. The compact header hides lower-priority navigation as intended, while the primary action remains prominent.

## Monochrome Revision

The desktop landing-page preview was reviewed after the strict monochrome conversion. The rendered interface uses black, white, and neutral grayscale only: the header, globe, hero typography, consultant card, borders, and primary action now rely on tonal contrast rather than colored accents. The hero hierarchy, navigation readability, and Dotted Earth layering remain intact.

The 390 × 844 mobile render was also reviewed. The compact header keeps the brand mark, audio control, language selector, and primary action visible, while the grayscale globe, editorial headline, supporting copy, and scroll cue remain readable without horizontal overflow. The mobile composition contains no visible colored UI accent.
