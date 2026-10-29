# Architecture rules

- Reuse the existing anamnesis review and PDF-generation flow for completed-anamnesis edits and later prescription additions; this preserves the current clinical permissions and storage behavior.
- Keep required-answer validation shared between review readiness and submission so an empty multi-selection cannot bypass completion checks.
- Keep inactivity exemptions and timeout in the shared session policy consumed by AuthContext so every application screen follows the same logout rule.
- Invex Rotina is a personal product isolated from Invex Gestor: own routine_* tables with per-user RLS, Premium/limits decided in the database, and accounts without a user_roles row are redirected away from Gestor routes; this keeps self-signup users out of company data.
