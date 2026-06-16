import { Editor, Notice, Plugin, TFile } from 'obsidian';
import { registerImageContextMenu } from './contextMenu';
import { t } from './i18n';
import {
	getImageUrlNearCursor,
	isRemoteImageUrl,
	processNoteContent,
	saveImageSource,
	saveSingleImageInFile,
} from './imageProcessor';
import { DEFAULT_SETTINGS, Image2LocalSettings } from './settings';
import { Image2LocalSettingTab } from './settingTab';

export default class Image2LocalPlugin extends Plugin {
	settings: Image2LocalSettings = DEFAULT_SETTINGS;
	private processingFiles = new Set<string>();

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new Image2LocalSettingTab(this.app, this));

		this.addCommand({
			id: 'save-all-images-in-note',
			name: t(this.settings.language, 'commandSaveAll'),
			callback: () => this.saveAllImagesInActiveNote(),
		});

		registerImageContextMenu(this);

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				this.registerEditorMenu(menu, editor, view.file);
			}),
		);

		this.registerEvent(
			this.app.workspace.on('editor-paste', (_evt, _editor, view) => {
				if (!this.settings.enabled || !view.file) return;
				window.setTimeout(() => {
					void this.processActiveFile(view.file!);
				}, 100);
			}),
		);

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (!this.settings.enabled || !(file instanceof TFile)) return;
				if (file.extension !== 'md') return;
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile || activeFile.path !== file.path) return;
				void this.processActiveFile(file);
			}),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	translate(key: Parameters<typeof t>[1], vars?: Record<string, string | number>): string {
		return t(this.settings.language, key, vars);
	}

	private registerEditorMenu(
		menu: import('obsidian').Menu,
		editor: Editor,
		file: TFile | null,
	) {
		if (!file) return;

		const imageUrl = getImageUrlNearCursor(editor);

		if (imageUrl) {
			menu.addItem((item) => {
				item
					.setTitle(this.translate('saveImageToLocal'))
					.setIcon('download')
					.onClick(() => void this.saveImageAtCursor(editor, file, imageUrl));
			});
		}

		menu.addItem((item) => {
			item
				.setTitle(this.translate('batchSaveAll'))
				.setIcon('images')
				.onClick(() => void this.saveAllImagesInFile(file));
		});
	}

	async saveImageInFile(file: TFile, imageUrl: string, matchIndex = -1) {
		new Notice(this.translate('processing'));
		try {
			const saved = await saveSingleImageInFile(this, file, imageUrl, matchIndex);
			if (saved) {
				new Notice(this.translate('success'));
			} else {
				new Notice(this.translate('noImagesFound'));
			}
		} catch (error) {
			console.error('Image2Local:', error);
			const message =
				error instanceof Error && error.message.includes('desktop')
					? this.translate('systemPathDesktopOnly')
					: this.translate('failed');
			new Notice(message);
		}
	}

	private async saveImageAtCursor(editor: Editor, file: TFile, imageUrl: string) {
		new Notice(this.translate('processing'));
		try {
			const saved = await saveSingleImageInFile(this, file, imageUrl);
			if (saved) {
				new Notice(this.translate('success'));
				return;
			}

			const localPath = await saveImageSource(this, file, imageUrl);
			const cursor = editor.getCursor();
			const line = editor.getLine(cursor.line);
			const newLine = line.includes(imageUrl)
				? line.replace(imageUrl, localPath)
				: line;
			if (newLine !== line) {
				editor.setLine(cursor.line, newLine);
			}
			new Notice(this.translate('success'));
		} catch (error) {
			console.error('Image2Local:', error);
			const message =
				error instanceof Error && error.message.includes('desktop')
					? this.translate('systemPathDesktopOnly')
					: this.translate('failed');
			new Notice(message);
		}
	}

	private async saveAllImagesInActiveNote() {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			new Notice(this.translate('noActiveFile'));
			return;
		}
		await this.saveAllImagesInFile(file);
	}

	async saveAllImagesInFile(file: TFile) {
		new Notice(this.translate('processing'));
		const content = await this.app.vault.read(file);
		const { content: newContent, savedCount } = await processNoteContent(this, file, content);

		if (savedCount === 0) {
			new Notice(this.translate('noImagesFound'));
			return;
		}

		if (newContent !== content) {
			await this.app.vault.modify(file, newContent);
		}
		new Notice(this.translate('successCount', { count: savedCount }));
	}

	private async processActiveFile(file: TFile) {
		if (this.processingFiles.has(file.path)) return;
		this.processingFiles.add(file.path);

		try {
			const content = await this.app.vault.read(file);
			const { content: newContent, savedCount } = await processNoteContent(
				this,
				file,
				content,
				(src) => isRemoteImageUrl(src) || src.startsWith('data:image/'),
			);

			if (savedCount > 0 && newContent !== content) {
				await this.app.vault.modify(file, newContent);
			}
		} catch (error) {
			console.error('Image2Local auto-process error:', error);
		} finally {
			this.processingFiles.delete(file.path);
		}
	}
}
