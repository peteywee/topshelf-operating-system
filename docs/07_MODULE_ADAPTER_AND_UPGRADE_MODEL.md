# Module, Adapter, and Upgrade Model

Modules are selected from project facts, not preference. Each module declares provides, requires, recommends, conflicts, activation rules, contracts, checks, migrations, and removal requirements.

Adapters implement agnostic capabilities for providers such as GitHub, Vercel, Supabase, Cloudflare, Docker, PostgreSQL, Gmail, and Google Calendar. Provider details do not enter the kernel contract.

Every generated project records its TOS version and active modules. Upgrades use three-way ownership rules: unchanged TOS-owned files may update automatically; modified TOS-owned files require merge; project-owned files are not overwritten. Skipped changes require an upgrade decision.
