/** Two versions of a small service config — the text demo of both layers. */
export const DIFF_OLD_TEXT = `server:
  host: 0.0.0.0
  port: 8080
  workers: 4
logging:
  level: info
  format: json
cache:
  enabled: false
  ttl: 300
features:
  search: true
  export: true
  beta-dashboard: false`;

export const DIFF_NEW_TEXT = `server:
  host: 0.0.0.0
  port: 8443
  workers: 8
  tls: true
logging:
  level: warn
  format: json
cache:
  enabled: false
  ttl: 300
features:
  search: true
  export: true`;

/** Two versions of a product record — the JSON demo (key order differs on purpose). */
export const DIFF_OLD_JSON = `{
  "sku": "SKU-2041",
  "name": "Desk lamp",
  "price": 39.9,
  "tags": ["lighting", "office"],
  "stock": { "warehouse": 120, "store": 8 }
}`;

export const DIFF_NEW_JSON = {
  name: 'Desk lamp',
  sku: 'SKU-2041',
  price: 34.9,
  tags: ['lighting', 'office', 'sale'],
  stock: { store: 8, warehouse: 96 },
};
