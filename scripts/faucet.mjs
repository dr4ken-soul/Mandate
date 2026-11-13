/**
 * Request test STT from the Somnia Explorer faucet.
 *
 * The faucet is a form in the explorer, and the explorer refuses a request
 * that does not carry the browser challenge its own script produces. This
 * script drives a real Chrome through the DevTools protocol, so the challenge
 * is real, and prints the transaction hash it produced.
 *
 *   node scripts/faucet.mjs 0xYourAddress
 *
 * The Chrome profile lives in a temporary directory, so nothing is written to
 * the system drive.
 */

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FAUCET_URL = "https://explorer.testnet.somnia.network/tokyo/faucet";
const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = Number(process.env.CDP_PORT ?? 9333);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";

const address = process.argv[2];
if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
  console.error("usage: node scripts/faucet.mjs 0xYourAddress");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // The browser is still starting.
    }
    await sleep(500);
  }
  throw new Error(`no response from ${url}`);
}

const profile = mkdtempSync(join(tmpdir(), "mandate-faucet-"));
const browser = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
            "about:blank",
  ],
  { stdio: "ignore" },
);

process.on("exit", () => browser.kill());

try {
  await waitForJson(`http://127.0.0.1:${PORT}/json/version`);

  const created = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(FAUCET_URL)}`, {
    method: "PUT",
  });
  const target = await created.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.consoleAPICalled") {
      const text = (message.params.args ?? [])
        .map((arg) => arg.value ?? arg.description ?? arg.type)
        .join(" ");
      console.log(`[console.${message.params.type}] ${text}`);
    }
    if (message.method === "Runtime.exceptionThrown") {
      console.log(
        `[exception] ${message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text}`,
      );
    }
    if (message.method === "Network.requestWillBeSent") {
      const request = message.params?.request;
      if (request?.method === "POST" && request.url.includes("explorer")) {
        console.log(`[post] ${request.url}`);
      }
    }
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId;
      nextId += 1;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return response.result?.result?.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setUserAgentOverride", {
    userAgent: USER_AGENT,
    platform: "Win32",
    acceptLanguage: "en-US,en;q=0.9",
  });
  await send("Emulation.setUserAgentOverride", {
    userAgent: USER_AGENT,
    platform: "Win32",
    acceptLanguage: "en-US,en;q=0.9",
  });
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });",
  });

  await send("Page.navigate", { url: FAUCET_URL });

  // Let the page settle, then ask for the explorer's challenge script so the
  // challenge is ready before the form is submitted.
  await sleep(9000);
  console.log("[step] import", await evaluate(`import("/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/p.js").then(()=>typeof window.KPSDK).catch(e=>"ERR:"+e.message)`));
  await sleep(3000);

  // Wait for the form to exist and for React to have hydrated it.
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(500);
    const present = await evaluate(`
      (() => {
        const input = document.querySelector('input[name="address"]');
        if (!input) return false;
        const form = input.closest('form');
        const keys = form ? Object.keys(form) : [];
        return keys.some((key) => key.startsWith('__react'));
      })()
    `);
    if (present) {
      ready = true;
      break;
    }
  }
  if (!ready) throw new Error("the faucet form never hydrated");


  await evaluate(`
    (() => {
      const input = document.querySelector('input[name="address"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(address)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `);

  console.log("[step] handler", await evaluate(`(() => { const f = document.querySelector('input[name="address"]').closest('form'); const k = Object.keys(f).find(x=>x.startsWith('__reactProps')); if(!k) return 'no props'; try { const r = f[k].onSubmit({preventDefault(){}, currentTarget:f}); return 'called ' + String(r); } catch(e) { return 'ERR '+e.message; } })()`));

  let outcome = null;
  let lastText = "";
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await sleep(1000);
    const text = await evaluate(`document.body.innerText`);
    if (typeof text !== "string") continue;
    lastText = text;
    if (text.includes("Sent 1 STT")) {
      outcome = text;
      break;
    }
    if (/automated|refused|declined/i.test(text)) {
      outcome = text;
      break;
    }
  }

  if (!outcome) {
    console.log(lastText.slice(0, 800));
    throw new Error("the faucet did not answer in time");
  }

  const hash = await evaluate(`
    (() => {
      const link = [...document.querySelectorAll('a')].find((a) => a.href.includes('/tx/'));
      return link ? link.href.split('/tx/')[1].split('?')[0] : null;
    })()
  `);

  if (!outcome.includes("Sent 1 STT")) {
    console.log(outcome.slice(0, 400));
    throw new Error("the faucet refused the request");
  }

  console.log(`sent 1 STT to ${address}`);
  if (hash) console.log(`tx ${hash}`);
} finally {
  browser.kill();
}

