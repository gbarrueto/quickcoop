const button = document.getElementById("action");
const message = document.getElementById("message");
const fetchButton = document.getElementById("fetch-games");
const status = document.getElementById("status");

let count = 0;

button.addEventListener("click", () => {
  count += 1;
  message.textContent = `Hello World 👋 (x${count})`;
});

// Esta función se serializa y se ejecuta DENTRO de la pestaña de Epic,
// por lo que el fetch sale del propio origen y lleva las cookies de sesión.
const epicGamesScraper = async () => {
  const fetchGamesList = async (pageToken = "", existingList = []) => {
    const baseUrl =
      "https://accounts.epicgames.com/account/v2/payment/ajaxGetOrderHistory";
    const url = `${baseUrl}?count=40&sortDir=DESC&sortBy=DATE&locale=en-US${
      pageToken ? `&nextPageToken=${pageToken}` : ""
    }`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (token: ${pageToken || "—"})`);
    }

    const data = await response.json();
    if (!data.orders || data.orders.length === 0) {
      return existingList;
    }

    const gamesInThisPage = data.orders.reduce((acc, order) => {
      if (order.items) {
        order.items.forEach((item) => acc.push(item.description));
      }
      return acc;
    }, []);

    const updatedList = existingList.concat(gamesInThisPage);
    if (!data.nextPageToken) {
      return updatedList;
    }
    return fetchGamesList(data.nextPageToken, updatedList);
  };

  const games = await fetchGamesList();
  console.log("=== EXTRACCIÓN COMPLETA ===");
  console.log(`Total de juegos detectados: ${games.length}`);
  console.log(games);
  return games;
};

fetchButton.addEventListener("click", async () => {
  fetchButton.disabled = true;
  status.textContent = "Extrayendo…";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url?.includes("epicgames.com")) {
      status.textContent =
        "Abre y selecciona una pestaña de epicgames.com (logueado) y vuelve a intentar.";
      return;
    }

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: epicGamesScraper,
    });

    const games = injection?.result ?? [];
    status.textContent = `✅ ${games.length} juegos extraídos.\nRevisa la consola de la pestaña de Epic.`;
  } catch (error) {
    status.textContent = `❌ Error: ${error.message}`;
    console.error(error);
  } finally {
    fetchButton.disabled = false;
  }
});
