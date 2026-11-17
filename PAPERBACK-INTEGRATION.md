# Paperback 0.9 integration checklist

## Current status

This repository is not yet an installable Paperback extension. The exact 0.9 SDK surface must be verified before writing a host adapter. The TypeScript code here is application/domain logic only.

## Verify against official 0.9 SDK documentation and a real app build

- [ ] Extension manifest format, required identifiers, and packaging process.
- [ ] Custom catalog/list/detail UI support for guide browsing.
- [ ] Supported persistent storage API, quotas, and migration behavior.
- [ ] Whether an extension can enumerate other installed source IDs.
- [ ] Whether it can search another source's series and chapters programmatically.
- [ ] Whether a documented action/deep link can open a chapter owned by another source.
- [ ] Whether another source's chapter read state can be queried or changed.
- [ ] Whether any of the above require user consent or source-specific capabilities.

## Implementation rules

1. Do not call undocumented globals or invent URL schemes.
2. Do not claim cross-source synchronization until it is documented and tested.
3. Treat multiple matching chapters as ambiguous and ask the user to choose.
4. Do not persist provider IDs or open URLs unless they came from a supported API.
5. Keep guide progress separate from provider read state unless the SDK explicitly supports synchronization.

## Fallback if cross-source APIs are unavailable

Ship a companion guide catalog that displays reading orders and tracks progress in its own storage. An "Open in Paperback" action should appear only when a real, verified route exists. Otherwise show the series/issue details for manual search.
