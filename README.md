# Image2Local

Save online images, base64 data, and bare image URLs in your Obsidian notes to local storage, and replace them with markdown references automatically.

**Languages:** [English](README.md) | [中文](README.zh-CN.md)

## Features

- **Auto-save** — Detect and save remote images and base64 data when you paste or save a note
- **Flexible storage paths** — Relative to note, relative to vault root, vault absolute path, or system absolute path (outside vault)
- **Markdown references** — Replace sources with `![alt](path)` after saving
- **Right-click menu** — Save a single image or batch-save all saveable images in the current note
- **Batch conversion** — Detect markdown images, HTML `<img>` tags, and bare image URLs
- **Base64 support** — Save base64 images via right-click, batch mode, or auto-save
- **i18n** — Chinese and English settings UI
- **Built-in User-Agents** — 10 browser user-agents with optional random rotation for downloads

## Installation

### From Obsidian Community Plugins

1. Open **Settings → Community plugins**
2. Turn off **Restricted mode** if needed
3. Click **Browse**, search for **Image2Local**, and install
4. Enable the plugin

### Manual installation

1. Copy this folder to `<vault>/.obsidian/plugins/image-to-local/`
2. Run `npm install && npm run build` to generate `main.js`
3. Enable **Image2Local** under **Settings → Community plugins**

## Usage

### Auto-save

1. Open **Settings → Image2Local**
2. Enable **Enable auto-save**
3. Paste or save notes containing remote images or base64 data

### Manual save

- **Right-click on an image** (Live Preview / Reading mode) → **Save image to local**
- **Right-click in editor** → **Batch save all images in note**
- **Command palette** → **Batch save images in current note**

### Storage path modes

| Mode | Description |
|------|-------------|
| Relative to note | Default: `<note-folder>/image_files/` |
| Relative to vault root | e.g. `image_files/` at vault root |
| Absolute (within vault) | e.g. `attachments/images/` |
| System absolute path | e.g. `/Users/you/Pictures/image_files` (desktop only) |

When using a system path outside the vault, markdown references use `file://` URLs.

## Supported sources

- Markdown: `![alt](https://example.com/image.png)`
- Base64: `![alt](data:image/png;base64,...)`
- HTML: `<img src="https://example.com/image.png">`
- Bare URLs: `https://example.com/image.png`

## Network use

This plugin downloads images from URLs that **you** put in your notes. It uses Obsidian's `requestUrl` API to fetch remote images when saving.

- No telemetry or analytics is collected
- No data is sent to third parties except the image hosts you choose
- User-Agent headers are used only to improve download compatibility

## Platform notes

- **Desktop**: Full feature set, including system absolute paths (uses Node.js `fs`)
- **Mobile**: Not supported (`isDesktopOnly: true`) because the plugin uses Node.js file system APIs for external storage

## Documentation

- [Usage guide (English)](docs/usage.md)
- [使用说明 (中文)](docs/使用说明.md)
- [Publishing guide (中文)](docs/社区插件上架指南.md)

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## Release

```bash
npm run build
git tag 1.0.0
git push origin 1.0.0
```

If GitHub Actions is configured, pushing a tag creates a release with `main.js` and `manifest.json` attached.

## License

MIT — see [LICENSE](LICENSE)
