/**
 * Query the Hideki indexer.
 *
 * The indexer host does not resolve from this machine, so the request goes to
 * one of its addresses with the right server name for the certificate.
 *
 *   node scripts/query-indexer.mjs "{ Market(limit: 5) { id } }"
 */

import https from "node:https";

const HOST = "hideki-dev.smk.somnia.host";
const ADDRESSES = ["13.112.214.183", "13.193.143.148", "54.64.12.224"];

function post(address, path, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        host: address,
        servername: HOST,
        path,
        method: "POST",
        headers: {
          host: HOST,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: 60_000,
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode, data }));
      },
    );
    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.write(body);
    request.end();
  });
}

const query = process.argv[2] ?? "{ Market(limit: 3) { id } }";

for (const address of ADDRESSES) {
  try {
    const response = await post(address, "/v1/graphql", JSON.stringify({ query }));
    if (response.status === 200) {
      console.log(response.data);
      break;
    }
    console.log(address, response.status, response.data.slice(0, 200));
  } catch (error) {
    console.log(address, "failed", error.message);
  }
}
