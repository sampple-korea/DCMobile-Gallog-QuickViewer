# DCMobile Gallog QuickViewer

Mobile DCInside Gallog QuickViewer is a userscript that shows a quick profile panel on mobile DCInside board pages without opening the user's Gallog page in a separate navigation flow.

## Features

- Adds a compact quick-view panel to `m.dcinside.com` board and mini-board pages
- Fetches Gallog profile details with `GM_xmlhttpRequest`
- Caches lookups locally to reduce repeated requests
- Supports manual refresh when cached data is stale
- Includes light/dark styling that follows the page environment
- Keeps all logic inside a single userscript file

## Install

Install a userscript manager that supports the required grants, then import:

```text
DCMobile Gallog QuickViewer.userscript.js
```

Required userscript grants:

- `GM_xmlhttpRequest`
- `GM_setValue`
- `GM_getValue`
- `GM_deleteValue`

## Supported Pages

```text
https://m.dcinside.com/board/*
https://m.dcinside.com/mini/*
```

## Privacy

The script stores only short-lived cache entries through the userscript manager. It does not include an external server component.

## License

MIT
