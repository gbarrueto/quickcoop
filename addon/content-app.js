// Content script que corre en el origen de QuickCoop (la app web).
// Hace dos cosas:
//  1. Avisa a la página que la extensión está disponible (para activar el modo automático).
//  2. Reenvía el authorizationCode (que llega desde el background) a la página vía postMessage,
//     que es el canal que escucha el hook useEpicAuth.

(function () {
  // 1. Anunciar que la extensión está instalada/activa.
  function announceReady() {
    window.postMessage({ type: "epic-ext-ready" }, window.location.origin);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", announceReady);
  } else {
    announceReady();
  }

  // 2. Relay del code desde el background hacia la página.
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "epic-auth-code" && message.code) {
      window.postMessage(
        { type: "epic-auth-code", code: message.code },
        window.location.origin
      );
    }
  });
})();
