const POPUP_FEATURES = "width=700,height=760,menubar=no,toolbar=no,location=no,status=no"

export function openAuthPopup(url: string, windowName: string): Window | null {
  return window.open(url, windowName, POPUP_FEATURES)
}

export function isTrustedOAuthMessage(event: MessageEvent): boolean {
  return event.origin === window.location.origin && Boolean(event.data)
}
