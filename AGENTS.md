# Architecture rules

- Scope Rotina palette and accent styles under `.rotina-theme` so visual changes cannot recolor Invex Gestor.

- Keep payment policies and Rotina pricing on unauthenticated routes with a shared public footer; this lets buyers review purchase conditions without granting access to company data.

- Reuse the existing anamnesis review and PDF-generation flow for completed-anamnesis edits and later prescription additions; this preserves the current clinical permissions and storage behavior.
- Keep required-answer validation shared between review readiness and submission so an empty multi-selection cannot bypass completion checks.
- Keep inactivity exemptions and timeout in the shared session policy consumed by AuthContext so every application screen follows the same logout rule.
- Invex Rotina is a personal product isolated from Invex Gestor: own routine_* tables with per-user RLS, Premium/limits decided in the database, and accounts without a user_roles row are redirected away from Gestor routes; this keeps self-signup users out of company data.
- Premium is decided per product in the database: routine_is_premium (rotina_premium), fitness_is_premium (fitness_premium) and financas_is_premium (financas_premium) each combine an admin grant with an active subscription of their own product, and the payments webhook is the only writer of subscriptions; this keeps paid access server-decided and stops one product unlocking the other.
- Invex Finanças (/financeiro/pessoal) is a personal product with its own login: personal_* tables with per-user RLS, read-only sharing by e-mail, and its palette scoped under `.financas-theme`; this keeps personal money data apart from company finance.
