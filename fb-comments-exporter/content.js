/**
 * content.js — Content Script (ISOLATED world)
 * Bridge between popup and injected.js (MAIN world)
 */

(function () {
  "use strict";

  const MSG_PREFIX_SEND = "fbce_send_";
  const MSG_PREFIX_RECV = "fbce_recv_";

  let injectedReady = false;

  // ---------------------------------------------------------------------------
  // Inject the MAIN world script
  // ---------------------------------------------------------------------------
  function injectMainWorldScript() {
    if (injectedReady) return;
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    script.onload = function () {
      this.remove();
      injectedReady = true;
      console.log("[FBCE] Content script: injected.js loaded into MAIN world");
    };
    (document.head || document.documentElement).appendChild(script);
  }

  injectMainWorldScript();

  // ---------------------------------------------------------------------------
  // Pending message callbacks (keyed by message name)
  // ---------------------------------------------------------------------------
  const pendingCallbacks = {};

  // Listen for responses from injected script
  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (!event.data || !event.data.name) return;

    const name = event.data.name;
    if (!name.startsWith(MSG_PREFIX_RECV)) return;

    const action = name.replace(MSG_PREFIX_RECV, "");

    // Forward live progress updates to popup
    if (action === "expandProgress") {
      try {
        chrome.runtime.sendMessage({
          action: "expandProgress",
          data: event.data.payload,
        });
      } catch (err) {
        // This happens if the extension was reloaded but the Facebook page wasn't refreshed.
        // We just ignore the error so it doesn't break the page loop.
      }
      return;
    }

    if (pendingCallbacks[action]) {
      pendingCallbacks[action](event.data.payload);
      delete pendingCallbacks[action];
    }
  });

  // Send a message to the injected script and return a promise
  function sendToInjected(action, payload) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        delete pendingCallbacks[action];
        reject(new Error("Timeout waiting for response from injected script"));
      }, 3600000); // 1 hour timeout instead of 30s

      pendingCallbacks[action] = (data) => {
        clearTimeout(timeout);
        resolve(data);
      };

      window.postMessage(
        {
          name: MSG_PREFIX_SEND + action,
          payload: payload || {},
        },
        "*"
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Handle messages from popup
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
      sendResponse({ status: "ok", injected: injectedReady });
      return true;
    }

    if (message.action === "getTokens") {
      sendToInjected("getTokens")
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) =>
          sendResponse({ success: false, error: err.message })
        );
      return true; // Keep message channel open for async
    }

    if (message.action === "fetchComments") {
      sendToInjected("fetchComments", message.payload)
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) =>
          sendResponse({ success: false, error: err.message })
        );
      return true;
    }

    if (message.action === "scrapeDOM") {
      sendToInjected("scrapeDOM")
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) =>
          sendResponse({ success: false, error: err.message })
        );
      return true;
    }

    if (message.action === "expandComments") {
      sendToInjected("expandComments")
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) =>
          sendResponse({ success: false, error: err.message })
        );
      return true;
    }

    return false;
  });

  console.log("[FBCE] Content script loaded ✅");
})();
