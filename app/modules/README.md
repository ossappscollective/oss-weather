# Modules

A module is a folder `modules/<category>/<id>/` with a `module.ts` default-exporting a `ModuleDefinition` (see `registry.ts`).
Modules are registered by hand in `main.ts`: **remove its import and entry there (and delete the folder) to remove a module**.

- `id` is also the provider key stored in settings/favorites and used in i18n keys (`provider.<id>`, `provider_aqi.<id>`, `provider_marine.<id>`).
- A module offers `weather`, `aqi` and/or `marine` provider classes, plus optional `locationActions` (entries of the location menus).
- `order` sets the position per kind; unordered modules come last, then by id.
- A removed module a setting still points to falls back to the default provider (`resolveProviderKey`).
- `openmeteo` is required (`assertModulesPresent` in `main.ts`): it is the default provider and its weather codes feed the METAR overlay.

Add a provider: create `modules/providers/<id>/` with the provider class and a `module.ts`, register it in `main.ts`, add the `provider.<id>` strings in `i18n/`.
