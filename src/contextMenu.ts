import { App, MarkdownView, Menu, TFile } from 'obsidian';
import type Image2LocalPlugin from './main';
import {
	countSaveableImages,
	getImageSrcFromElement,
	isInsideMarkdownView,
} from './imageProcessor';

function resolveImageElement(target: EventTarget | null): HTMLImageElement | null {
	if (!(target instanceof HTMLElement)) return null;
	if (target.instanceOf(HTMLImageElement)) return target;
	const closest = target.closest('img');
	if (closest?.instanceOf(HTMLImageElement)) return closest;
	return null;
}

export function registerImageContextMenu(plugin: Image2LocalPlugin): void {
	const registerOnDocument = (doc: Document) => {
		plugin.registerDomEvent(
			doc,
			'contextmenu',
			(evt: MouseEvent) => {
				const img = resolveImageElement(evt.target);
				if (!img) return;
				if (!isInsideMarkdownView(img)) return;

				const file = getActiveMarkdownFile(plugin.app);
				if (!file) return;

				evt.preventDefault();
				evt.stopPropagation();

				void showImageContextMenu(plugin, evt, img, file);
			},
			true,
		);
	};

	registerOnDocument(window.activeDocument);

	plugin.registerEvent(
		plugin.app.workspace.on('window-open', (win) => {
			registerOnDocument(win.doc);
		}),
	);
}

async function showImageContextMenu(
	plugin: Image2LocalPlugin,
	evt: MouseEvent,
	img: HTMLImageElement,
	file: TFile,
): Promise<void> {
	const content = await plugin.app.vault.read(file);
	const saveableCount = countSaveableImages(content);
	const imageInfo = await getImageSrcFromElement(img, file, plugin.app);

	if (!imageInfo && saveableCount === 0) return;

	const menu = new Menu();

	if (imageInfo) {
		menu.addItem((item) => {
			item
				.setTitle(plugin.translate('saveImageToLocal'))
				.setIcon('download')
				.onClick(() =>
					void plugin.saveImageInFile(file, imageInfo.src, imageInfo.matchIndex),
				);
		});
	}

	if (saveableCount > 0) {
		menu.addItem((item) => {
			item
				.setTitle(plugin.translate('saveAllImagesInNote', { count: saveableCount }))
				.setIcon('images')
				.onClick(() => void plugin.saveAllImagesInFile(file));
		});
	}

	menu.showAtMouseEvent(evt);
}

export function getActiveMarkdownFile(app: App): TFile | null {
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	return view?.file ?? app.workspace.getActiveFile();
}
