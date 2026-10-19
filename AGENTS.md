# Architecture rules

- Reuse the existing anamnesis review and PDF-generation flow for completed-anamnesis edits and later prescription additions; this preserves the current clinical permissions and storage behavior.
- Keep required-answer validation shared between review readiness and submission so an empty multi-selection cannot bypass completion checks.