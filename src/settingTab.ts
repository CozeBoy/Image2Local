import { App, PluginSettingTab, Setting } from 'obsidian';
import type Image2LocalPlugin from './main';
import { t } from './i18n';
import type { Language, StorageMode } from './settings';
import { USER_AGENTS } from './userAgents';

function getStoragePathDesc(mode: StorageMode, tr: (key: Parameters<typeof t>[1]) => string): string {
	switch (mode) {
		case 'relative-to-note':
			return tr('storagePathDesc');
		case 'relative-to-vault':
		case 'absolute':
			return tr('storagePathDescVault');
		case 'system-absolute':
			return tr('storagePathDescSystem');
	}
}

function getStoragePathPlaceholder(
	mode: StorageMode,
	tr: (key: Parameters<typeof t>[1]) => string,
): string {
	return mode === 'system-absolute'
		? tr('storagePathPlaceholderSystem')
		: tr('storagePathPlaceholder');
}

export class Image2LocalSettingTab extends PluginSettingTab {
	plugin: Image2LocalPlugin;

	constructor(app: App, plugin: Image2LocalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const lang = this.plugin.settings.language;
		const tr = (key: Parameters<typeof t>[1]) => t(lang, key);
		const mode = this.plugin.settings.storageMode;

		new Setting(containerEl)
			.setName(tr('enableAutoSave'))
			.setDesc(tr('enableAutoSaveDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(tr('showRibbonIcon'))
			.setDesc(tr('showRibbonIconDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showRibbonIcon).onChange(async (value) => {
					this.plugin.settings.showRibbonIcon = value;
					await this.plugin.saveSettings();
					this.plugin.refreshRibbonIcon();
				}),
			);

		new Setting(containerEl)
			.setName(tr('storageMode'))
			.addDropdown((dropdown) => {
				dropdown
					.addOption('relative-to-note', tr('storageModeNote'))
					.addOption('relative-to-vault', tr('storageModeVault'))
					.addOption('absolute', tr('storageModeAbsolute'))
					.addOption('system-absolute', tr('storageModeSystemAbsolute'))
					.setValue(this.plugin.settings.storageMode)
					.onChange(async (value) => {
						this.plugin.settings.storageMode = value as StorageMode;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName(tr('storagePath'))
			.setDesc(getStoragePathDesc(mode, tr))
			.addText((text) =>
				text
					.setPlaceholder(getStoragePathPlaceholder(mode, tr))
					.setValue(this.plugin.settings.storagePath)
					.onChange(async (value) => {
						this.plugin.settings.storagePath = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(tr('language'))
			.addDropdown((dropdown) => {
				dropdown
					.addOption('zh', tr('languageZh'))
					.addOption('en', tr('languageEn'))
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as Language;
						await this.plugin.saveSettings();
						this.plugin.refreshRibbonIcon();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName(tr('rotateUserAgent'))
			.setDesc(tr('rotateUserAgentDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.rotateUserAgent).onChange(async (value) => {
					this.plugin.settings.rotateUserAgent = value;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		if (!this.plugin.settings.rotateUserAgent) {
			new Setting(containerEl)
				.setName(tr('userAgentIndex'))
				.setDesc(tr('userAgentDesc'))
				.addDropdown((dropdown) => {
					for (let i = 0; i < USER_AGENTS.length; i++) {
						const ua = USER_AGENTS[i] ?? '';
						const short = ua.length > 60 ? ua.slice(0, 57) + '...' : ua;
						dropdown.addOption(String(i), `#${i + 1}: ${short}`);
					}
					dropdown
						.setValue(String(this.plugin.settings.userAgentIndex))
						.onChange(async (value) => {
							this.plugin.settings.userAgentIndex = Number(value);
							await this.plugin.saveSettings();
						});
				});
		}
	}
}
