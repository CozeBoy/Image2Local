# Image2Local Usage Guide

**Languages:** [English](usage.md) | [中文](使用说明.md)

## Overview

Image2Local is an Obsidian community plugin that saves **online images**, **base64-encoded images**, and **bare image URLs** in your notes to local storage, and updates them to markdown image references automatically.

## Feature checklist

| Requirement | Implementation |
|-------------|----------------|
| Auto-save online images | Enabled via auto-save when pasting or saving notes |
| Links and Base64 | Detects `![alt](https://...)` and `![alt](data:image/...;base64,...)` |
| Markdown references | Replaced with `![alt](relative-path)` after saving |
| Configurable storage directory | Settings page; default folder name `image_files` |
| Absolute / relative paths | Four modes: relative to note, vault root, vault absolute, system absolute |
| Chinese / English UI | Settings → Language |
| Right-click save | Image right-click (including Base64) and editor context menu |
| Batch save | Markdown images, HTML `<img>`, bare URLs, Base64 |
| 10 built-in User-Agents | Fixed selection or random rotation in settings |

## Settings

### Enable auto-save

When enabled, the plugin automatically processes remote images and base64 data when you:

- **Paste** content containing images in the editor
- **Save** the Markdown note you are currently editing

> Auto-save only affects the **active note** being edited. Other files in the vault are not modified.

### Storage path modes

#### 1. Relative to note (default)

Images are saved in a subfolder next to the current note.

```
my-notes/
├── article.md
└── image_files/
    └── image_1234567890_abc123.png
```

Reference in note: `![example](./image_files/image_1234567890_abc123.png)`

#### 2. Relative to vault root

Images are saved under a folder at the vault root (default: `image_files`).

```
vault/
├── image_files/
│   └── image_1234567890_abc123.png
└── folder/
    └── article.md
```

Markdown references are computed relative to each note.

#### 3. Absolute path (within vault)

Images are saved at a fixed path inside the vault, e.g. `attachments/images`.

```
vault/
├── attachments/
│   └── images/
│       └── image_1234567890_abc123.png
└── note.md
```

#### 4. System absolute path (outside vault, desktop only)

Images are saved to any directory on your file system, e.g. `/Users/you/Pictures/image_files`.

```
/Users/you/Pictures/image_files/
└── image_1234567890_abc123.png
```

References use `file://` URLs so Obsidian can preview images outside the vault.

### User-Agent settings

Some websites block downloads without a browser User-Agent. The plugin includes 10 common user-agents:

1. Chrome (Windows)
2. Chrome (macOS)
3. Chrome (Linux)
4. Firefox (Windows)
5. Firefox (macOS)
6. Safari (macOS)
7. Edge (Windows)
8. Safari (iPhone)
9. Chrome (Android)
10. Safari (iPad)

- **Random rotation** — Pick a random entry on each download (recommended)
- **Fixed selection** — Disable rotation and choose a specific entry

## How to use

### Method 1: Auto-save (recommended)

1. Enable **Enable auto-save** in settings
2. Paste images or image links into your note
3. Wait for processing, or save the note manually (Ctrl/Cmd + S)

### Method 2: Right-click menu

**Live Preview / Reading mode:**

1. Right-click on an online or base64 image
2. Select **Save image to local**

**Editor / Source mode:**

1. Place the cursor on an image link or base64 data
2. Right-click → **Save image to local**

**Batch save:** Right-click → **Save all images in note (N)** or **Batch save all images in note**

### Method 3: Command palette

1. Press `Ctrl/Cmd + P`
2. Search for **Batch save images in current note**
3. Press Enter

## Supported image sources

### Online links

```markdown
![example](https://example.com/image.png)
![example](https://example.com/photo.jpg?size=large)
```

### Base64 data

```markdown
![example](data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...)
```

### HTML image tags

```html
<img src="https://example.com/image.png" alt="example">
```

### Bare image URLs

```markdown
https://example.com/image.png
```

## Network and privacy

- The plugin only downloads image URLs that appear in your notes
- No telemetry or analytics is collected
- User-Agent headers are used only to improve download success rates

## Platform notes

- **Desktop**: Full feature set, including system absolute paths
- **Mobile**: Not supported (plugin uses Node.js file system APIs)

## FAQ

### Image download failed?

- Check your network connection
- Try enabling **Rotate User-Agent randomly**
- Some sites use hotlink protection and may block downloads

### Wrong path after saving?

- Verify the **Storage path mode** in settings
- Relative paths are computed from the **current note file**

### Auto-save did not trigger?

- Confirm **Enable auto-save** is on
- Confirm you are editing a Markdown note
- Wait a moment after pasting, or save the note manually

## Technical notes

- Remote images are downloaded via Obsidian's `requestUrl` API
- System absolute paths are written using Node.js `fs`
- File names are generated from URLs or timestamps to avoid collisions
- Re-entry protection prevents infinite save loops

## Related docs

- [README (English)](../README.md)
- [README (中文)](../README.zh-CN.md)
- [使用说明 (中文)](使用说明.md)
- [Publishing guide (中文)](社区插件上架指南.md)
