import { App, MarkdownView, Menu, TFile } from 'obsidian';
import type Image2LocalPlugin from './main';
import {
	countSaveableImages,
	getImageSrcFromElement,
	isInsideMarkdownView,
} from './imageProcessor';

export function registerImageContextMenu(plugin: Image2LocalPlugin): void {
	plugin.registerDomEvent(
		document,
		'contextmenu',
		(evt: MouseEvent) => {
			const target = evt.target;
			if (!(target instanceof HTMLElement)) return;

			const img =
				target instanceof HTMLImageElement ? target : target.closest('img');
			if (!(img instanceof HTMLImageElement)) return;
			if (!isInsideMarkdownView(img)) return;

			const file = getActiveMarkdownFile(plugin.app);
			if (!file) return;

			evt.preventDefault();
			evt.stopPropagation();

			void showImageContextMenu(plugin, evt, img, file);
		},
		true,
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
