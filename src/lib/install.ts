export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type IOSKind = 'none' | 'safari' | 'other';

export function detectIOSKind(): IOSKind {
  if (typeof window === 'undefined') return 'none';
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
  if (!isIOS) return 'none';
  // Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS), Opera (OPiOS),
  // and in-app browsers (FBAN/FBAV, Instagram, Line, WeChat) all use
  // WebKit but don't expose "Add to Home Screen".
  const isNonSafari = /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line|MicroMessenger/i.test(ua);
  return isNonSafari ? 'other' : 'safari';
}

export function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export const INSTALL_DISMISS_KEY = 'installPromptDismissed';
export const OPEN_INSTALL_EVENT = 'bartilbar:open-install';

// Re-open the global InstallPromptSheet on demand (e.g. the profile button),
// clearing the once-per-session dismiss so it can show again. Client-only.
export function openInstallSheet(): void {
  sessionStorage.removeItem(INSTALL_DISMISS_KEY);
  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
}
