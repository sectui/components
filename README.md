# @sectui/components

Shared building blocks for sectui terminal tools ([OpenTUI](https://github.com/anomalyco/opentui) + React, Node.js 26.4+):

- **Config**: layered YAML config, merged and validated with [valibot](https://valibot.dev), errors that name the file at fault.
- **Theme**: one base24 palette, exposed as semantic roles (`theme.accent`, `theme.error`…) and raw colors (`theme.base.base0D`).
- **Focus**: three levels, window → tab → pane, with mouse support, focus memory per tab and directional pane navigation.
- **Commands and shortcuts** on top of [`@opentui/keymap`](https://opentui.com/docs/keymap/overview): commands are active only where the focus is, shortcuts come from the config, a hint bar and a command palette show what is usable now.
- **Widgets**: `AppShell`, `Tabs`, `Pane`, modal popups, `CommandPalette`, `Help`, `KeyHints`, `TabBar`.

## The main window

`<AppShell tabs title right />`:

- **Navbar**: `title` on the left ("Spilltea: client-x"), the tabs in the middle, `right` on the right (`{ full: "127.0.0.1:8080", compact: ":8080" }`). When the bar is short, room is given up in this order: the tabs other than the active one become `...` (its direct neighbours stay longest), `right` switches to `compact`, the title is cut then hidden, and `right` goes last. The active tab is always shown in full. Clicking `...` opens the nearest hidden tab.
- **Bottom bar**: the short help (commands registered with `hint: true`) and "? for help" on the right. A click on the bar toggles the help.
- **`?`** (`app.help`): a popup listing every shortcut available where the focus is. The same key closes it.
- **`ctrl+e`** (`editor.external`) opens the focused text area (or the one in the focused pane) in `$VISUAL` / `$EDITOR` (`vi` otherwise): the TUI is suspended, the text is replaced when the editor exits successfully. The temporary file is private (0700 directory, 0600 file) and removed afterwards. `<AppShell editorExtension=".http">` sets its extension for syntax highlighting.
- **Badge** (`<Badge label fg bg round surface />`): a pill, the label on a filled background with rounded ends (Nerd Font half circles `` ``). `round`: `"both"` (default), `"left"` or `"right"`; a side that is not rounded gets a space on the fill. `surface` is the color behind the rounded ends. With `nerdFonts: false`, both ends are spaces on the fill: same look without the curves, same width (`badgeWidth(label)` = label + 2). The navbar uses it for the title (rounded on the right), the active tab, and the right text (rounded on the left).
- **Notifications** (toasts): top right, below the navbar, above popups; they never take the focus, go away by themselves (4 s, warnings 6 s, errors 8 s) and a click dismisses one. In a component: `const notify = useNotify(); notify("Saved", { level: "success" })`. Outside React (a store, a background task): create them first and hand them to the UI:

  ```ts
  const notifications = createNotifications()
  notifications.notify("Upstream proxy unreachable", { level: "error", title: "Proxy", timeoutMs: null }) // null: stays until clicked
  await startApp(config, <App />, { notifications })
  ```

- **Popups** (`useSectui().modal.open()`): everything behind is dimmed (a semi-transparent layer: colors blend, text stays readable); `escape` or a click outside closes them, and that click reaches nothing behind. Long content belongs in a `<scrollbox>`: scrollbar, mouse wheel, and the `scroll.up` / `scroll.down` (`j` / `k`, arrows) / `scroll.page-up` / `scroll.page-down` keys in the help. A fixed `width` / `height` is kept while it fits and shrinks with a smaller terminal (back to it when the terminal grows); what does not fit is cut at the border. So that the rows that matter stay visible in a small frame: `flexShrink: 0` on them (a button row), `flexGrow: 1, flexBasis: 0` on the part that can give up room (a list in a `<scrollbox>`).

Nothing here is specific to one tool.

## Shared config

`~/.config/sectui/config.yaml` (honours `$XDG_CONFIG_HOME`) holds what every sectui tool shares. Every key and its default is in [config.default.yaml](config.default.yaml).

```yaml
borderStyle: rounded   # single | double | rounded | heavy
spacious: true         # empty line below the navbar and above the help bar
helpBar: true          # false: no bottom bar ("?" still opens the help)
transparentBackground: false  # true: the terminal background shows through the app
nerdFonts: false       # tools may draw Nerd Font glyphs
emoji: false           # tools may draw emoji
roundedBadges: true    # false: square badges (pills) instead of rounded ends
colors:                # base24, base00 … base17 (default: Catppuccin Mocha)
  base0D: "#89b4fa"
keys:                  # shortcuts of the shared commands
  pane.left: [ctrl+h, alt+h]
```

A tool loads its config with `loadAppConfig()`. Layers, later wins:

```
sectui defaults < tool defaults < ~/.config/sectui/config.yaml < tool config < project config < CLI
```

Objects merge key by key, lists are replaced, unknown keys are an error. A tool can override the shared keys too (a different theme for one project, for example).

## Using it in a tool

```tsx
import * as v from "valibot"
import { AppShell, loadAppConfig, Pane, sectuiEntries, startApp, usePaneCommands, yamlLayer } from "@sectui/components"
import toolDefaults from "./config.default.yaml" // esbuild: --loader:.yaml=text

const Schema = v.strictObject({ ...sectuiEntries, saveResponse: v.boolean() })
const config = await loadAppConfig(Schema, {
  toolDefaults: yamlLayer("config.default.yaml", toolDefaults),
  toolConfigPath: `${process.env.HOME}/.config/spilltea/config.yaml`,
})

function History() {
  usePaneCommands([{ name: "history.flag", title: "Flag", run: () => store.flagSelected() }])
  return <text>…</text>
}

await startApp(config, <AppShell tabs={[{ id: "history", title: "History", content: <Pane id="list" title="History"><History /></Pane> }]} />)
```

`startApp` returns `{ renderer, render, close }`. `render(config, element)` replaces what is shown, keeping the renderer, the keymap and the notifications: a startup screen can run with the user's config, then the main window with a project's own settings. `close()` gives the terminal back, to print a fatal error for example. `<AppShell navbar={false}>` hides the navbar, for a single-screen window.

`startApp(config, element, { minSize: { width: 80, height: 24 } })`: below that size a centered message ("Terminal too small", the minimum, the current size) replaces the UI. The UI stays mounted, only hidden, so nothing is lost when the terminal grows back. Keys still reach it.

Rules:

- **Shortcuts live in the config** (`keys:`), indexed by command name. `useCommands` / `usePaneCommands` never take a key.
- **`hint: true`** puts a command in the short help at the bottom. Keep it to the few commands that matter where they are; the `?` help lists everything.
- **Single-letter keys are normal-mode only**: while a text field has the focus, printable and editing keys go to the field. Modified keys (`ctrl+…`, `alt+…`) and keys like `escape`, `up`, `down` still work. `escape` leaves the field.
- **Commands must not read state captured at render time.** Several keys can arrive before the next render (`j j m`). Dispatch an action to a reducer or a store instead.
- **Inactive tabs are unmounted.** State that must survive a tab switch lives in a store.

## Shared commands

| Command | Default keys | Where |
|---|---|---|
| `app.quit` | `q` | everywhere |
| `app.palette` | `ctrl+p` | everywhere |
| `app.help` | `?` | everywhere (and closes the help) |
| `app.close` | `escape` | popup: close it · text field: leave it |
| `tab.next` / `tab.previous` | `]` / `[` | main window |
| `tab.goto.<id>` | none (palette, or add a key in the config) | main window, one per tab ("Go to History") |
| `pane.left` / `down` / `up` / `right` | `ctrl+h/j/k/l`, `alt+h/j/k/l` | inside a tab |
| `pane.next` / `pane.previous` | `tab` / `shift+tab` | inside a tab |
| `palette.up` / `palette.down` | `up`, `ctrl+k` / `down`, `ctrl+j` | command palette |
| `scroll.up` / `scroll.down` | `k`, `up`, `ctrl+k` / `j`, `down`, `ctrl+j` | help |
| `scroll.page-up` / `scroll.page-down` | `pageup` / `pagedown` | help |

`ctrl+h` and `ctrl+j` need a terminal with the Kitty keyboard protocol (enabled by `startApp`): elsewhere they arrive as backspace and linefeed. The `alt+` variants work everywhere.

## Development

```sh
nix develop          # Node.js 26
npm install
npm test             # config, key rules, pane navigation
npm run typecheck
npm run format       # prettier (format:check in CI)
npm run build        # dist/: JavaScript and .d.ts, run by npm pack / npm publish
npm run demo         # interactive demo of everything above
npm run spike        # headless checks of the @opentui/keymap behaviours this package relies on
```

The package ships compiled JavaScript in `dist/`, which is what tools use. The TypeScript sources are exported only under the `sectui-source` condition, for this repository's own tests and typecheck (`node --conditions=sectui-source`, `customConditions` in `tsconfig.json`): a tool that enables the common `source` condition no longer gets the raw `.tsx`, which its own JSX settings would compile wrongly. Releases: a `v*` tag runs `.github/workflows/release.yml` (checks, `npm pack`, attestation, npm publish, GitHub release).

`scripts/drive-demo.sh` drives the demo in a detached tmux and prints a screen capture after each step (`npm run build:demo` first).

During development, a tool depends on this package with `"@sectui/components": "file:../components"`. `react` and `@opentui/*` are peer dependencies: the tool provides them, so there is only one copy of React.
