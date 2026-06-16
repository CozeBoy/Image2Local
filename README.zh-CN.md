# Image2Local

将 Obsidian 笔记中的在线图片、Base64 数据和裸链接自动转存到本地，并替换为 Markdown 引用。

**语言：** [English](README.md) | [中文](README.zh-CN.md)

## 功能

- **自动转存** — 粘贴或保存笔记时自动检测并转存在线图片和 Base64 数据
- **灵活存储路径** — 相对文档路径、相对仓库根路径、仓库内绝对路径、系统绝对路径（仓库外）
- **Markdown 引用** — 转存后自动替换为 `![alt](path)` 格式
- **右键菜单** — 单张转存或批量转存当前笔记中所有可转存图片
- **批量转存** — 识别 Markdown 图片、HTML `<img>` 标签、裸 URL
- **Base64 支持** — 支持右键、批量、自动转存 Base64 图片
- **中英文界面** — 设置页可切换中文 / English
- **内置 10 个 User-Agent** — 可固定选择或随机轮换，提高下载成功率

## 安装

### 从 Obsidian 社区插件安装

1. 打开 **设置 → 社区插件**
2. 如有需要，关闭 **安全模式**
3. 点击 **浏览**，搜索 **Image2Local** 并安装
4. 启用插件

### 手动安装

1. 将本文件夹复制到 `<仓库>/.obsidian/plugins/image2local/`
2. 运行 `npm install && npm run build` 生成 `main.js`
3. 在 **设置 → 社区插件** 中启用 **Image2Local**

## 使用

### 自动转存

1. 打开 **设置 → Image2Local**
2. 开启 **自动转存**
3. 粘贴或保存含在线图片 / Base64 的笔记

### 手动转存

- **在图片上右键**（Live Preview / 阅读模式）→ **转存图片到本地**
- **编辑器内右键** → **批量转存笔记内全部图片**
- **命令面板** → **批量转存当前笔记中的图片**

### 存储路径模式

| 模式 | 说明 |
|------|------|
| 相对文档路径 | 默认：`<笔记目录>/image_files/` |
| 相对仓库根路径 | 如仓库根目录下的 `image_files/` |
| 绝对路径（仓库内） | 如 `attachments/images/` |
| 系统绝对路径 | 如 `/Users/你/Pictures/image_files`（仅桌面端） |

使用仓库外的系统路径时，Markdown 引用会使用 `file://` 格式。

## 支持的图片源

- Markdown：`![alt](https://example.com/image.png)`
- Base64：`![alt](data:image/png;base64,...)`
- HTML：`<img src="https://example.com/image.png">`
- 裸链接：`https://example.com/image.png`

## 网络说明

本插件仅会下载**您**笔记中出现的图片 URL，使用 Obsidian 的 `requestUrl` API 获取远程图片。

- 不收集遥测或分析数据
- 不向第三方发送除您指定的图片服务器以外的请求
- User-Agent 仅用于提高图片下载兼容性

## 平台说明

- **桌面端**：完整功能，含系统绝对路径（使用 Node.js `fs`）
- **移动端**：不支持（`isDesktopOnly: true`，插件使用 Node.js 文件系统 API）

## 文档

- [使用说明 (中文)](docs/使用说明.md)
- [Usage guide (English)](docs/usage.md)
- [社区插件上架指南](docs/社区插件上架指南.md)

## 开发

```bash
npm install
npm run dev    # 监听模式
npm run build  # 生产构建
```

## 发布

```bash
npm run build
git tag 1.0.0
git push origin 1.0.0
```

若已配置 GitHub Actions，推送 tag 后会自动创建 Release 并上传 `main.js` 和 `manifest.json`。

## 许可证

MIT — 见 [LICENSE](LICENSE)
