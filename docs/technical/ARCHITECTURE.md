# Architecture

> TODO: system design + project-level risks.
>
> See `docs/prds/draft/2026-05-23-ulm.md` §5 (How it works) and §6.5 (Future architecture: optional daemon mode) for the current architectural intent.
>
> Once the implementation language is chosen (REPL Shell SPEC §9 Q-01) and the first slice ships, expand this file with:
>
> - Process model (REPL → provider transport → subprocess CLI)
> - Transport abstraction (`ProviderTransport` interface, v1 direct-subprocess impl, v2 daemon-socket impl)
> - State layout (`~/.config/ulm/state.toml` + per-provider session IDs)
> - Threat model (subprocess invocation, no credential handling, no PII storage)
