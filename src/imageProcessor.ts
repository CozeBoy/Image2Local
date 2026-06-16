import { App, normalizePath, Platform, requestUrl, TFile } from 'obsidian';
import type Image2LocalPlugin from './main';
import {
	ensureSystemFolder,
	joinSystemPath,
	systemFileExists,
	systemPathToMarkdownRef,
	writeSystemBinary,
} from './fileSystem';
import {
	encodeMarkdownPath,
	getRelativeResourcePath,
	resolveStorageTarget,
} from './pathUtils';
import { pickRandomUserAgent, pickUserAgent } from './userAgents';

const IMAGE_MARKDOWN_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const HTML_IMG_REGEX = /<img\s+[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
const BARE_IMAGE_URL_REGEX =
	/https?:\/\/[^\s<>\])"'`]+?\.(?:png|jpe?g|gif|webp|svg|bmp|ico)(?:\?[^\s<>\])"'`]*)?/gi;
const DATA_URL_REGEX = /^data:image\/([\w.+-]+);base64,(.+)$/i;
const HTTP_URL_REGEX = /^https?:\/\//i;

export interface ImageMatch {
	fullMatch: string;
	alt: string;
	src: string;
	index: number;
	type: 'markdown' | 'html' | 'bare-url';
}

function regexGroup(match: RegExpMatchArray, index: number): string {
	const value = match[index];
	if (value === undefined) {
		throw new Error(`Missing regex capture group at index ${index}`);
	}
	return value;
}

export function findImageMatches(content: string): ImageMatch[] {
	const matches: ImageMatch[] = [];
	const occupied: Array<[number, number]> = [];

	const overlaps = (start: number, end: number) =>
		occupied.some(([s, e]) => start < e && end > s);

	const addMatch = (
		fullMatch: string,
		src: string,
		index: number,
		type: ImageMatch['type'],
		alt = '',
	) => {
		const trimmed = src.trim();
		if (!isProcessableImageSource(trimmed)) return;
		const end = index + fullMatch.length;
		if (overlaps(index, end)) return;
		matches.push({ fullMatch, alt, src: trimmed, index, type });
		occupied.push([index, end]);
	};

	let match: RegExpExecArray | null;

	const mdRegex = new RegExp(IMAGE_MARKDOWN_REGEX.source, 'g');
	while ((match = mdRegex.exec(content)) !== null) {
		addMatch(match[0], regexGroup(match, 2), match.index, 'markdown', match[1] ?? '');
	}

	const htmlRegex = new RegExp(HTML_IMG_REGEX.source, 'gi');
	while ((match = htmlRegex.exec(content)) !== null) {
		const altMatch = match[0].match(/\balt=["']([^"']*)["']/i);
		addMatch(match[0], regexGroup(match, 1), match.index, 'html', altMatch?.[1] ?? '');
	}

	const bareRegex = new RegExp(BARE_IMAGE_URL_REGEX.source, 'gi');
	while ((match = bareRegex.exec(content)) !== null) {
		addMatch(match[0], match[0], match.index, 'bare-url');
	}

	return matches.sort((a, b) => a.index - b.index);
}

export function countSaveableImages(content: string): number {
	return findImageMatches(content).length;
}

interface MarkdownEmbed {
	fullMatch: string;
	alt: string;
	src: string;
	index: number;
}

function findAllMarkdownImageEmbeds(content: string): MarkdownEmbed[] {
	const embeds: MarkdownEmbed[] = [];
	let match: RegExpExecArray | null;
	const regex = new RegExp(IMAGE_MARKDOWN_REGEX.source, 'g');
	while ((match = regex.exec(content)) !== null) {
		embeds.push({
			fullMatch: match[0],
			alt: match[1] ?? '',
			src: regexGroup(match, 2).trim(),
			index: match.index,
		});
	}
	return embeds;
}

export function isProcessableImageSource(src: string): boolean {
	return DATA_URL_REGEX.test(src) || HTTP_URL_REGEX.test(src);
}

export function isRemoteImageUrl(src: string): boolean {
	return HTTP_URL_REGEX.test(src);
}

function getUserAgent(plugin: Image2LocalPlugin): string {
	if (plugin.settings.rotateUserAgent) {
		return pickRandomUserAgent();
	}
	return pickUserAgent(plugin.settings.userAgentIndex);
}

function extensionFromMime(mime: string): string {
	const map: Record<string, string> = {
		png: 'png',
		jpeg: 'jpg',
		jpg: 'jpg',
		gif: 'gif',
		webp: 'webp',
		svg: 'svg',
		bmp: 'bmp',
		'svg+xml': 'svg',
	};
	return map[mime.toLowerCase()] ?? 'png';
}

function extensionFromUrl(url: string): string | null {
	try {
		const pathname = new URL(url).pathname;
		const dot = pathname.lastIndexOf('.');
		if (dot === -1) return null;
		const ext = pathname.slice(dot + 1).toLowerCase();
		if (/^[a-z0-9]{1,5}$/.test(ext)) return ext;
	} catch {
		// ignore invalid URLs
	}
	return null;
}

function extensionFromContentType(contentType: string | null): string | null {
	if (!contentType) return null;
	const mimePart = contentType.split(';')[0]?.trim().replace('image/', '');
	if (!mimePart) return null;
	return extensionFromMime(mimePart);
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	if (await app.vault.adapter.exists(normalized)) return;
	const parts = normalized.split('/');
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!(await app.vault.adapter.exists(current))) {
			await app.vault.createFolder(current);
		}
	}
}

function buildFileName(src: string, ext: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).slice(2, 8);
	if (DATA_URL_REGEX.test(src)) {
		return `image_${timestamp}_${random}.${ext}`;
	}
	const fromUrl = extensionFromUrl(src);
	const finalExt = fromUrl ?? ext;
	const urlName = (() => {
		try {
			const pathname = new URL(src).pathname;
			const base = pathname.split('/').pop() ?? '';
			const cleaned = base.replace(/[^\w.-]/g, '_').slice(0, 40);
			if (cleaned && cleaned.includes('.')) return cleaned;
		} catch {
			// ignore
		}
		return `image_${timestamp}_${random}.${finalExt}`;
	})();
	return urlName;
}

async function downloadRemoteImage(
	plugin: Image2LocalPlugin,
	url: string,
): Promise<{ data: ArrayBuffer; ext: string }> {
	const headers: Record<string, string> = {
		'User-Agent': getUserAgent(plugin),
	};
	try {
		headers['Referer'] = new URL(url).origin + '/';
	} catch {
		// ignore
	}

	const response = await requestUrl({ url, headers });
	const ext =
		extensionFromContentType(response.headers['content-type'] ?? null) ??
		extensionFromUrl(url) ??
		'png';
	return { data: response.arrayBuffer, ext };
}

function decodeBase64Image(src: string): { data: ArrayBuffer; ext: string } {
	const match = src.match(DATA_URL_REGEX);
	if (!match) throw new Error('Invalid base64 image');
	const mime = regexGroup(match, 1);
	const base64 = regexGroup(match, 2);
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return { data: bytes.buffer, ext: extensionFromMime(mime) };
}

export async function saveImageSource(
	plugin: Image2LocalPlugin,
	noteFile: TFile,
	src: string,
): Promise<string> {
	const target = resolveStorageTarget(noteFile, plugin.settings);

	if (target.type === 'system' && !Platform.isDesktop) {
		throw new Error('System absolute path is only supported on desktop');
	}

	let data: ArrayBuffer;
	let ext: string;

	if (DATA_URL_REGEX.test(src)) {
		({ data, ext } = decodeBase64Image(src));
	} else if (HTTP_URL_REGEX.test(src)) {
		({ data, ext } = await downloadRemoteImage(plugin, src));
	} else {
		throw new Error('Unsupported image source');
	}

	const fileName = buildFileName(src, ext);

	if (target.type === 'system') {
		await ensureSystemFolder(target.folder);
		let filePath = joinSystemPath(target.folder, fileName);

		if (await systemFileExists(filePath)) {
			const dot = fileName.lastIndexOf('.');
			const stem = dot === -1 ? fileName : fileName.slice(0, dot);
			const suffix = dot === -1 ? '' : fileName.slice(dot);
			filePath = joinSystemPath(target.folder, `${stem}_${Date.now()}${suffix}`);
		}

		await writeSystemBinary(filePath, data);
		return encodeMarkdownPath(systemPathToMarkdownRef(filePath));
	}

	await ensureFolder(plugin.app, target.folder);
	let filePath = normalizePath(`${target.folder}/${fileName}`);

	if (await plugin.app.vault.adapter.exists(filePath)) {
		const dot = fileName.lastIndexOf('.');
		const stem = dot === -1 ? fileName : fileName.slice(0, dot);
		const suffix = dot === -1 ? '' : fileName.slice(dot);
		filePath = normalizePath(`${target.folder}/${stem}_${Date.now()}${suffix}`);
	}

	await plugin.app.vault.createBinary(filePath, data);

	const markdownPath = encodeMarkdownPath(getRelativeResourcePath(noteFile, filePath));
	return markdownPath;
}

export async function processNoteContent(
	plugin: Image2LocalPlugin,
	noteFile: TFile,
	content: string,
	filter?: (src: string) => boolean,
): Promise<{ content: string; savedCount: number }> {
	const matches = findImageMatches(content).filter((m) => !filter || filter(m.src));
	if (matches.length === 0) {
		return { content, savedCount: 0 };
	}

	let result = content;
	let offset = 0;
	let savedCount = 0;

	for (const match of matches) {
		try {
			const localPath = await saveImageSource(plugin, noteFile, match.src);
			const replacement = buildReplacement(match, localPath);
			const start = match.index + offset;
			const end = start + match.fullMatch.length;
			result = result.slice(0, start) + replacement + result.slice(end);
			offset += replacement.length - match.fullMatch.length;
			savedCount++;
		} catch (error) {
			console.error('Image2Local: failed to save image', match.src.slice(0, 80), error);
		}
	}

	return { content: result, savedCount };
}

export function urlMatches(markdownSrc: string, imgSrc: string): boolean {
	const a = markdownSrc.trim();
	const b = imgSrc.trim();
	if (a === b) return true;
	try {
		if (decodeURIComponent(a) === decodeURIComponent(b)) return true;
	} catch {
		// ignore
	}
	if (DATA_URL_REGEX.test(a) && b.startsWith('data:image/')) {
		if (a === b) return true;
		const minLen = Math.min(a.length, b.length, 120);
		return a.slice(0, minLen) === b.slice(0, minLen);
	}
	try {
		return new URL(a).href === new URL(b).href;
	} catch {
		return false;
	}
}

function buildReplacement(match: ImageMatch, localPath: string): string {
	switch (match.type) {
		case 'markdown':
		case 'html':
			return `![${match.alt}](${localPath})`;
		case 'bare-url':
			return `![image](${localPath})`;
	}
}

export function isInsideMarkdownView(el: Element): boolean {
	return !!el.closest(
		'.markdown-preview-view, .markdown-reading-view, .markdown-source-view, .cm-editor, .markdown-rendered',
	);
}

export async function getImageSrcFromElement(
	img: HTMLImageElement,
	file: TFile,
	app: App,
): Promise<{ src: string; matchIndex: number } | null> {
	const attrSrc = img.getAttribute('src')?.trim() ?? '';
	if (attrSrc && isProcessableImageSource(attrSrc)) {
		return { src: attrSrc, matchIndex: -1 };
	}

	const imgSrc = img.src?.trim() ?? '';
	if (imgSrc && isProcessableImageSource(imgSrc)) {
		return { src: imgSrc, matchIndex: -1 };
	}

	const container = img.closest(
		'.markdown-preview-view, .markdown-reading-view, .markdown-source-view, .markdown-rendered',
	);
	if (!container) return null;

	const content = await app.vault.read(file);
	const saveableMatches = findImageMatches(content);
	if (saveableMatches.length === 0) return null;

	const allImgs = Array.from(container.querySelectorAll('img'));
	const clickedIndex = allImgs.indexOf(img);
	if (clickedIndex < 0) return null;

	const allEmbeds = findAllMarkdownImageEmbeds(content);
	if (clickedIndex < allEmbeds.length) {
		const embed = allEmbeds[clickedIndex];
		if (embed && isProcessableImageSource(embed.src)) {
			const matchIndex = saveableMatches.findIndex(
				(m) => m.index === embed.index && m.src === embed.src,
			);
			return { src: embed.src, matchIndex: matchIndex >= 0 ? matchIndex : -1 };
		}
	}

	if (saveableMatches.length === 1) {
		const onlyMatch = saveableMatches[0];
		if (onlyMatch) {
			return { src: onlyMatch.src, matchIndex: 0 };
		}
	}

	return null;
}

/** @deprecated use getImageSrcFromElement */
export function getRemoteImageSrc(img: HTMLImageElement): string | null {
	const attrSrc = img.getAttribute('src');
	if (attrSrc && isProcessableImageSource(attrSrc)) return attrSrc;
	if (img.src && isProcessableImageSource(img.src)) return img.src;
	return null;
}

export async function saveSingleImageInFile(
	plugin: Image2LocalPlugin,
	file: TFile,
	imageUrl: string,
	matchIndex = -1,
): Promise<boolean> {
	const content = await plugin.app.vault.read(file);
	const matches = findImageMatches(content);
	const match =
		matchIndex >= 0
			? matches[matchIndex] ??
				matches.find((m) => urlMatches(m.src, imageUrl))
			: matches.find((m) => urlMatches(m.src, imageUrl));
	if (!match) return false;

	const localPath = await saveImageSource(plugin, file, match.src);
	const replacement = buildReplacement(match, localPath);
	const newContent =
		content.slice(0, match.index) +
		replacement +
		content.slice(match.index + match.fullMatch.length);

	if (newContent !== content) {
		await plugin.app.vault.modify(file, newContent);
	}
	return true;
}

export function getImageUrlAtCursor(line: string, cursorCh: number): string | null {
	const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(line)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		if (cursorCh >= start && cursorCh <= end) {
			const src = regexGroup(match, 2).trim();
			if (isProcessableImageSource(src)) return src;
		}
	}

	const urlRegex = /(https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^\s)]*)?)/gi;
	while ((match = urlRegex.exec(line)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		if (cursorCh >= start && cursorCh <= end) {
			return regexGroup(match, 1);
		}
	}

	const dataRegex = /(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/g;
	while ((match = dataRegex.exec(line)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		if (cursorCh >= start && cursorCh <= end) {
			return regexGroup(match, 1);
		}
	}

	return null;
}

export function getImageUrlNearCursor(editor: import('obsidian').Editor): string | null {
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const onLine = getImageUrlAtCursor(line, cursor.ch);
	if (onLine) return onLine;

	for (let offset = 1; offset <= 3; offset++) {
		const prev = cursor.line - offset;
		if (prev >= 0) {
			const found = getImageUrlAtCursor(editor.getLine(prev), Number.MAX_SAFE_INTEGER);
			if (found) return found;
		}
		const next = cursor.line + offset;
		if (next < editor.lineCount()) {
			const found = getImageUrlAtCursor(editor.getLine(next), 0);
			if (found) return found;
		}
	}

	return null;
}
