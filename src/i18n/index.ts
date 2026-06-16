import type { Language } from '../settings';
import { en } from './en';
import { zh } from './zh';

export type I18nKey = keyof typeof zh;

const locales: Record<Language, Record<I18nKey, string>> = { zh, en };

export function t(lang: Language, key: I18nKey, vars?: Record<string, string | number>): string {
	let text = locales[lang][key];
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replace(`{${name}}`, String(value));
		}
	}
	return text;
}
