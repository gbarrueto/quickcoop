// Content script que corre DENTRO de la página de Epic en /id/api/redirect.
// Como corre en el origen de epicgames.com, puede leer el JSON que la app web
// no podía leer por cross-origin. Extrae el authorizationCode y lo manda al
// background para que lo reenvíe a la pestaña de QuickCoop.

(function () {
  function extractAuthCode() {
    try {
      const text = document.body ? document.body.innerText.trim() : "";
      if (!text) return null;
      const data = JSON.parse(text);
      return data && data.authorizationCode ? data.authorizationCode : null;
    } catch (e) {
      // La página no es el JSON esperado (login, etc.). No hacemos nada.
      return null;
    }
  }

  const code = extractAuthCode();
  if (code) {
    chrome.runtime.sendMessage({ type: "epic-auth-code", code });
    console.log("[QuickCoop ext] authorizationCode capturado y enviado.");
  }
})();
