export type StorageMode =
	| 'relative-to-note'
	| 'relative-to-vault'
	| 'absolute'
	| 'system-absolute';
export type Language = 'zh' | 'en';

export interface Image2LocalSettings {
	enabled: boolean;
	storageMode: StorageMode;
	storagePath: string;
	language: Language;
	userAgentIndex: number;
	rotateUserAgent: boolean;
}

export const DEFAULT_SETTINGS: Image2LocalSettings = {
	enabled: true,
	storageMode: 'relative-to-note',
	storagePath: 'image_files',
	language: 'zh',
	userAgentIndex: 0,
	rotateUserAgent: true,
};
