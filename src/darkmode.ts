// BigBlueButton's dark mode is DarkReader in dynamic mode. It restyles the page
// with <style class="darkreader ..."> elements: its own rules (with the
// client's dark palette), a dark copy of every stylesheet and the overrides
// for inline styles. While a theme is active they are switched off, and so is
// every new one DarkReader adds; with 'none' they come back. The client's own
// dark mode setting is not touched. Our sheets carry the class "stylus", which
// DarkReader leaves alone (it skips the Stylus extension's styles).
//
// BigBlueButton 4.1 has a native dark mode instead: data-theme="dark" on <html>
// switches the client's color variables, all from one stylesheet,
// stylesheets/theme-dark.css. While a theme is active that sheet is switched
// off the same way, unless the theme follows the dark mode (Classic). The
// attribute stays, so the client's own setting and toggle keep working.
//
// The wanted state lives on <html>, not in a variable, so that a second copy
// of the plugin (see index.tsx) and this one agree.
const STATE_ATTR = 'data-bbb-plugin-themes-darkreader';
const PAUSED_ATTR = 'data-bbb-plugin-themes-paused'; // on the dark mode styles we switched off
const NATIVE_DARK_SHEET = 'link[rel="stylesheet"][href*="theme-dark"]';
const DARKREADER_STYLE = 'style.darkreader';

const isDarkReaderStyle = (node: Node): node is Element => (node as Element).localName === 'style'
  && (node as Element).classList.contains('darkreader');

export const isNativeDarkModeOn = (): boolean => document.documentElement.getAttribute('data-theme') === 'dark';

export const isDarkModeOn = (): boolean => document.documentElement.hasAttribute('data-darkreader-mode')
  || isNativeDarkModeOn();

function switchOff(style: Element): void {
  const { sheet } = style as HTMLStyleElement | HTMLLinkElement;
  if (sheet) {
    sheet.disabled = true;
  } else if (style.localName === 'link') {
    // Still loading: switch it off once it is there, if it should still be off
    style.addEventListener('load', () => {
      const loaded = (style as HTMLLinkElement).sheet;
      if (loaded && style.hasAttribute(PAUSED_ATTR)) loaded.disabled = true;
    }, { once: true });
  }
  style.setAttribute(PAUSED_ATTR, '');
}

function switchOn(style: Element): void {
  const { sheet } = style as HTMLStyleElement | HTMLLinkElement;
  if (sheet) sheet.disabled = false;
  style.removeAttribute(PAUSED_ATTR);
}

// New DarkReader styles, and rewritten ones (new content means a new, enabled
// sheet). The client changes the page a lot, so the checks stay cheap.
const watcher = new MutationObserver((records) => {
  const found: Element[] = [];
  records.forEach(({ target, addedNodes }) => {
    if (isDarkReaderStyle(target)) found.push(target);
    addedNodes.forEach((node) => {
      if (isDarkReaderStyle(node)) found.push(node);
      else if ((node as Element).classList?.contains('darkreader')) {
        found.push(...Array.from((node as Element).querySelectorAll(DARKREADER_STYLE)));
      }
    });
  });
  if (found.length === 0) return;
  if (!document.documentElement.hasAttribute(STATE_ATTR)) {
    watcher.disconnect(); // another copy of the plugin resumed dark mode
    return;
  }
  found.forEach(switchOff);
});

// keepNative: a theme that follows the native dark mode (4.1) keeps it; the
// DarkReader dark mode (4.0) pauses for every theme
export function pauseDarkMode(paused: boolean, keepNative = false): void {
  const html = document.documentElement;
  if (paused) {
    html.setAttribute(STATE_ATTR, 'paused');
    document.querySelectorAll(DARKREADER_STYLE).forEach(switchOff);
    if (keepNative) document.querySelectorAll(`${NATIVE_DARK_SHEET}[${PAUSED_ATTR}]`).forEach(switchOn);
    else document.querySelectorAll(NATIVE_DARK_SHEET).forEach(switchOff);
    watcher.observe(document, { childList: true, subtree: true });
    return;
  }
  watcher.disconnect();
  if (!html.hasAttribute(STATE_ATTR)) return;
  html.removeAttribute(STATE_ATTR);
  document.querySelectorAll(`[${PAUSED_ATTR}]`).forEach(switchOn);
}
