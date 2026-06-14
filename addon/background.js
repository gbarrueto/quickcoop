// Service worker: relay entre el content script de Epic (que captura el code)
// y el content script de la app de QuickCoop (que lo entrega a la página).
// Dos content scripts no se comunican directamente; el mensaje pasa por aquí.

const APP_ORIGIN_PATTERNS = [
  "http://localhost:3000/*",
  "https://quickcoop-git-develop-gbarruetos-projects.vercel.app/*",
  "https://www.quickcoop.me/*",
];

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "epic-auth-code" || !message.code) {
    return;
  }

  // Reenviar el code a todas las pestañas del origen de la app (en la práctica, una).
  // La app es la dueña del popup de Epic y lo cierra ella misma al recibir el code.
  chrome.tabs.query({ url: APP_ORIGIN_PATTERNS }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.sendMessage(tab.id, {
          type: "epic-auth-code",
          code: message.code,
        });
      }
    }
  });
});
