# Gemini Key Compatibility — 2026-08-27

Nightfall accepts Google Gemini credentials only through server-side encrypted storage or deployment secrets. Google’s Gemini API documentation states that the API supports both **standard API keys** and newer **authorization (auth) keys**, and recommends the `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable for server-side configuration.[1]

The Google AI Developers Forum records that AI Studio is moving from AIza-prefixed traffic keys to AQ-prefixed authentication keys; it explicitly describes `AQ.` keys as Gemini API auth keys rather than a distinct non-Gemini provider credential.[2]

Accordingly, Nightfall’s Gemini key validation must accept both non-empty AIza and AQ formats as Gemini credentials, while preserving all existing encryption, ownership, server-only use, and no-client-exposure boundaries. The application must still fail closed when the provider reports an invalid, unavailable, or unauthorized key.

## References

[1] [Using Gemini API keys — Google AI for Developers](https://ai.google.dev/gemini-api/docs/api-key)

[2] [Gemini API key start from AQ — Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-api-key-start-from-aq/171575)
