import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';

export function isSystemAbsolutePath(input: string): boolean {
	const trimmed = input.trim();
	if (/^[A-Za-z]:[\\/]/.test(trimmed)) return true;
	if (trimmed.startsWith('/')) return true;
	return false;
}

export function normalizeSystemPath(input: string): string {
	return path.resolve(input.trim());
}

export async function ensureSystemFolder(folderPath: string): Promise<void> {
	await fs.mkdir(folderPath, { recursive: true });
}

export async function systemFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function writeSystemBinary(filePath: string, data: ArrayBuffer): Promise<void> {
	await fs.writeFile(filePath, Buffer.from(data));
}

export function systemPathToMarkdownRef(systemFilePath: string): string {
	return pathToFileURL(systemFilePath).href;
}

export function joinSystemPath(folder: string, fileName: string): string {
	return path.join(folder, fileName);
}
