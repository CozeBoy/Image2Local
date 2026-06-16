import { normalizePath, TFile } from 'obsidian';
import { isSystemAbsolutePath, normalizeSystemPath } from './fileSystem';
import type { Image2LocalSettings } from './settings';

export type StorageTarget =
	| { type: 'vault'; folder: string }
	| { type: 'system'; folder: string };

export function resolveStorageTarget(
	noteFile: TFile,
	settings: Image2LocalSettings,
): StorageTarget {
	const folderName = settings.storagePath.trim() || 'image_files';

	switch (settings.storageMode) {
		case 'relative-to-note': {
			const parent = noteFile.parent?.path ?? '';
			const folder = parent ? `${parent}/${folderName}` : folderName;
			return { type: 'vault', folder };
		}
		case 'relative-to-vault':
			return { type: 'vault', folder: folderName };
		case 'absolute':
			if (isSystemAbsolutePath(folderName)) {
				return { type: 'system', folder: normalizeSystemPath(folderName) };
			}
			return { type: 'vault', folder: folderName.replace(/^\/+/, '') };
		case 'system-absolute':
			return { type: 'system', folder: normalizeSystemPath(folderName) };
	}
}

export function getRelativeResourcePath(fromFile: TFile, targetPath: string): string {
	const fromDir = fromFile.parent?.path ?? '';
	const normalizedTarget = normalizePath(targetPath);

	if (!fromDir) {
		return normalizedTarget;
	}

	const fromParts = fromDir.split('/');
	const toParts = normalizedTarget.split('/');

	let common = 0;
	while (
		common < fromParts.length &&
		common < toParts.length &&
		fromParts[common] === toParts[common]
	) {
		common++;
	}

	const up = fromParts.length - common;
	const relParts = [...Array<string>(up).fill('..'), ...toParts.slice(common)];
	const rel = relParts.join('/');
	const lastPart = toParts[toParts.length - 1];

	return rel || (lastPart ? `./${lastPart}` : rel);
}

export function encodeMarkdownPath(pathValue: string): string {
	return pathValue.replace(/ /g, '%20');
}
