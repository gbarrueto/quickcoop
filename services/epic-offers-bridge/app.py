"""Tiny dedicated relay for Epic's offers GraphQL endpoint.

store.epicgames.com/graphql sits behind a Cloudflare challenge that blocks
plain HTTP clients (Node fetch, curl) even with full browser headers — only a
real TLS/JS-capable client passes it. `cloudscraper` (used here) solves that
challenge; nothing in Node does. Everything else in the Epic game-details
pipeline (get_product, namespace mapping, catalog metadata bulk) is NOT
behind this wall and stays in TypeScript — see lib/epic/store-api.ts. This
service only exists for the one call that needs it.

Deployed on Render (see README.md / render.yaml) — needs a host with a
persistent Python process AND unrestricted outbound internet. Vercel's Node
functions can't spawn Python; PythonAnywhere's free tier forces outbound
traffic through a domain-whitelisted proxy that blocks store.epicgames.com
entirely (confirmed: ProxyError 403 on every request).
"""

import os

from flask import Flask, jsonify, request
from epicstore_api import EpicGamesStoreAPI

app = Flask(__name__)
api = EpicGamesStoreAPI()

BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET")
CHUNK_SIZE = 20

# epicstore_api's own OFFERS_QUERY (PyPI 0.2.0) only requests `tags { id }` —
# no name/groupName, which is exactly what the pipeline needs to tell genre
# from feature tags. The library doesn't let get_offers_data() take a custom
# query, so this calls the (otherwise-private) batched GraphQL helper
# directly with our own query instead of going through get_offers_data().
OFFERS_QUERY = """
query catalogQuery($productNamespace: String!, $offerId: String!, $locale: String, $country: String!) {
  Catalog {
    catalogOffer(namespace: $productNamespace, id: $offerId, locale: $locale) {
      id
      description
      keyImages {
        type
        url
      }
      tags {
        id
        name
        groupName
      }
      price(country: $country) {
        totalPrice {
          currencyCode
          discount
          discountPrice
          originalPrice
          voucherDiscount
          currencyInfo {
            decimals
          }
          fmtPrice(locale: $locale) {
            originalPrice
            discountPrice
            intermediatePrice
          }
        }
      }
    }
  }
}
"""


GRAPHQL_URL = "https://store.epicgames.com/graphql"


def get_offers_bulk(offer_specs, chunk=CHUNK_SIZE):
    out = {}
    specs = [(spec["namespace"], spec["offerId"]) for spec in offer_specs if spec.get("offerId")]

    for i in range(0, len(specs), chunk):
        batch = specs[i:i + chunk]
        body = [
            {
                "query": OFFERS_QUERY,
                "variables": {"productNamespace": ns, "offerId": oid, "locale": "en-US", "country": "US"},
            }
            for ns, oid in batch
        ]

        # Calling the session directly (instead of api._make_graphql_query)
        # so a non-JSON response — Cloudflare challenge page, empty body,
        # whatever — gets logged with enough detail to actually diagnose,
        # instead of a bare "Expecting value" JSONDecodeError.
        try:
            response = api._session.post(GRAPHQL_URL, json=body)
        except Exception as exc:  # noqa: BLE001
            app.logger.error("offers bulk chunk %d request failed: %s", i, exc)
            continue

        if response.status_code != 200:
            app.logger.error(
                "offers bulk chunk %d got HTTP %d, body: %s",
                i, response.status_code, response.text[:500],
            )
            continue

        try:
            results = response.json()
        except ValueError:
            app.logger.error(
                "offers bulk chunk %d returned non-JSON (%d bytes), body: %s",
                i, len(response.content), response.text[:500],
            )
            continue

        for result in results:
            offer = (result.get("data", {}).get("Catalog", {}) or {}).get("catalogOffer")
            if offer and offer.get("id"):
                out[offer["id"]] = offer

    return out


@app.before_request
def check_secret():
    if request.path == "/health":
        return None
    if BRIDGE_SECRET and request.headers.get("X-Bridge-Secret") != BRIDGE_SECRET:
        return jsonify({"error": "unauthorized"}), 401
    return None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/offers", methods=["POST"])
def offers():
    body = request.get_json(force=True, silent=True) or {}
    offer_specs = body.get("offers")

    if not isinstance(offer_specs, list):
        return jsonify({"error": "offers must be a list of {namespace, offerId}"}), 400

    return jsonify({"offers": get_offers_bulk(offer_specs)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
