import baseCss from '../shared/base.css';
import darkCss from '../shared/dark.css';

export interface ThemeColors {
  background: string;
  nav: string;
  primary: string;
  panel: string;
  text: string;
}

export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  // false: the theme starts from the client's own look, without shared/base.css
  base?: boolean;
  colors: ThemeColors;
  description: Record<string, string>;
  // Stylesheets in cascade order: shared base (unless base is false), shared dark panels (dark themes), the theme
  sheets: string[];
}

// The plain BigBlueButton look, without any theme stylesheet
export const NONE = 'none';
export const NONE_COLORS: ThemeColors = {
  background: '#102133',
  nav: '#FFFFFF',
  primary: '#0F70D7',
  panel: '#FFFFFF',
  text: '#222426',
};

// Every folder in themes/ with a theme.json and a theme.css is a theme; its id is the folder name
const metadata = import.meta.webpackContext('../themes', { recursive: true, regExp: /^\.\/[^/]+\/theme\.json$/ });
const stylesheets = import.meta.webpackContext('../themes', { recursive: true, regExp: /^\.\/[^/]+\/theme\.css$/ });
const folder = (key: string) => key.split('/')[1];
const cssKeys = new Map(stylesheets.keys().map((key) => [folder(key), key]));

export const THEMES: Theme[] = metadata.keys()
  .filter((key) => cssKeys.has(folder(key)))
  .map((key) => {
    const id = folder(key);
    const meta = metadata(key) as Omit<Theme, 'id' | 'sheets'>;
    const css = (stylesheets(cssKeys.get(id)) as { default: string }).default;
    const sheets = [...(meta.base === false ? [] : [baseCss]), ...(meta.dark ? [darkCss] : []), css];
    return { ...meta, id, sheets };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

// Ids are matched trimmed and case-insensitively
export function findTheme(id: unknown): Theme | undefined {
  const wanted = String(id ?? '').trim().toLowerCase();
  return THEMES.find((theme) => theme.id.toLowerCase() === wanted);
}

// A known theme id in its canonical spelling, 'none', or undefined
export function normalizeId(id: unknown): string | undefined {
  if (String(id ?? '').trim().toLowerCase() === NONE) return NONE;
  return findTheme(id)?.id;
}
