import {
	App,
	PluginSettingTab,
	type SettingDefinitionItem,
	type SettingDropdownControl,
} from 'obsidian';
import type Image2LocalPlugin from './main';
import { t } from './i18n';
import type { Language, StorageMode } from './settings';
import { USER_AGENTS } from './userAgents';

type SettingsKey = keyof Image2LocalPlugin['settings'];

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

function isStorageMode(value: string): value is StorageMode {
	return (
		value === 'relative-to-note' ||
		value === 'relative-to-vault' ||
		value === 'absolute' ||
		value === 'system-absolute'
	);
}

function isLanguage(value: string): value is Language {
	return value === 'zh' || value === 'en';
}

export class Image2LocalSettingTab extends PluginSettingTab {
	plugin: Image2LocalPlugin;

	constructor(app: App, plugin: Image2LocalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as SettingsKey];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		switch (key) {
			case 'enabled':
				this.plugin.settings.enabled = Boolean(value);
				break;
			case 'storageMode': {
				const mode = String(value);
				if (isStorageMode(mode)) {
					this.plugin.settings.storageMode = mode;
				}
				break;
			}
			case 'storagePath':
				this.plugin.settings.storagePath = String(value);
				break;
			case 'language': {
				const language = String(value);
				if (isLanguage(language)) {
					this.plugin.settings.language = language;
				}
				break;
			}
			case 'rotateUserAgent':
				this.plugin.settings.rotateUserAgent = Boolean(value);
				break;
			case 'userAgentIndex':
				this.plugin.settings.userAgentIndex = Number(value);
				break;
		}
		await this.plugin.saveSettings();
		if (key === 'language' || key === 'storageMode' || key === 'rotateUserAgent') {
			this.update();
		}
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const lang = this.plugin.settings.language;
		const tr = (key: Parameters<typeof t>[1]) => t(lang, key);
		const mode = this.plugin.settings.storageMode;

		const storageModeOptions: SettingDropdownControl['options'] = {
			'relative-to-note': tr('storageModeNote'),
			'relative-to-vault': tr('storageModeVault'),
			absolute: tr('storageModeAbsolute'),
			'system-absolute': tr('storageModeSystemAbsolute'),
		};

		const userAgentOptions: SettingDropdownControl['options'] = {};
		for (let i = 0; i < USER_AGENTS.length; i++) {
			const ua = USER_AGENTS[i] ?? '';
			const short = ua.length > 60 ? ua.slice(0, 57) + '...' : ua;
			userAgentOptions[String(i)] = `#${i + 1}: ${short}`;
		}

		return [
			{
				type: 'group',
				heading: tr('settingsTitle'),
				items: [
					{
						name: tr('enableAutoSave'),
						desc: tr('enableAutoSaveDesc'),
						control: { type: 'toggle', key: 'enabled' },
					},
					{
						name: tr('storageMode'),
						control: {
							type: 'dropdown',
							key: 'storageMode',
							options: storageModeOptions,
						},
					},
					{
						name: tr('storagePath'),
						desc: getStoragePathDesc(mode, tr),
						control: {
							type: 'text',
							key: 'storagePath',
							placeholder: getStoragePathPlaceholder(mode, tr),
						},
					},
					{
						name: tr('language'),
						control: {
							type: 'dropdown',
							key: 'language',
							options: {
								zh: tr('languageZh'),
								en: tr('languageEn'),
							},
						},
					},
					{
						name: tr('rotateUserAgent'),
						desc: tr('rotateUserAgentDesc'),
						control: { type: 'toggle', key: 'rotateUserAgent' },
					},
					{
						name: tr('userAgentIndex'),
						desc: tr('userAgentDesc'),
						visible: () => !this.plugin.settings.rotateUserAgent,
						control: {
							type: 'dropdown',
							key: 'userAgentIndex',
							options: userAgentOptions,
						},
					},
				],
			},
		];
	}
}
