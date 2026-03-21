// Background Service Worker
// Required by Manifest V3

let exportState = {
  isRunning: false,
  tabId: null,
  method: null,
  comments: [],
  totalFetched: 0,
  percent: 0
};

let keepAliveInterval = null;

// ---- i18n ----
let currentLang = "ku";
const i18n = {
  ku: {
    errorTitle: "کێشەیەک ڕوویدا",
    exportDone: "دەرهێنانی کۆمێنتەکان تەواو بوو! ✅",
    exportDoneMsg: "بەسەرکەوتوویی {COUNT} کۆمێنت دەرهێنران. ئیکستنشنەکە بکەرەوە بۆ داگرتن.",
    errorOccurred: "هەڵەیەک ڕوویدا: ",
    gettingPostInfo: "زانیاری پۆستەکە وەردەگیرێت...",
    cantReadPage: "نەتوانرا زانیاری لاپەڕەکە بخوێنرێتەوە",
    noFeedbackId: "Feedback ID نەدۆزرایەوە، DOM بەکاردەهێنرێت...",
    fetchingComments: "کۆمێنتەکان وەردەگیرێن...",
    pageProgress: "لاپەڕەی {PAGE} — {COUNT} کۆمێنت وەرگیرا...",
    apiFailed: "API نەکرا، DOM بەکاردەهێنرێت...",
    noCommentsAPI: "هیچ کۆمێنتێک نەدۆزرایەوە لە API، DOM دەکوڵێتەوە...",
    expandingComments: "کۆمێنتەکان فراوان دەکرێن... (دەتوانیت بڕۆیتە کارێکی تر)",
    clickedExpand: "{COUNT} جار کلیک کرا بۆ فراوانکردن",
    scrapingPage: "کۆمێنتەکان لە لاپەڕەکە دەکوڵدرێنەوە...",
    cantScrape: "نەتوانرا کۆمێنتەکان لە لاپەڕەکە بخوێنرێنەوە",
    noCommentsFound: "هیچ کۆمێنتێک نەدۆزرایەوە. تکایە دڵنیابە کۆمێنت هەیە لەم پۆستەدا."
  },
  en: {
    errorTitle: "An error occurred",
    exportDone: "Comment export complete! ✅",
    exportDoneMsg: "Successfully exported {COUNT} comments. Open the extension to download.",
    errorOccurred: "An error occurred: ",
    gettingPostInfo: "Getting post info...",
    cantReadPage: "Could not read page info",
    noFeedbackId: "Feedback ID not found, switching to DOM...",
    fetchingComments: "Fetching comments...",
    pageProgress: "Page {PAGE} — {COUNT} comments fetched...",
    apiFailed: "API failed, switching to DOM...",
    noCommentsAPI: "No comments found via API, trying DOM...",
    expandingComments: "Expanding comments... (you can do other things)",
    clickedExpand: "Clicked {COUNT} times to expand",
    scrapingPage: "Scraping comments from page...",
    cantScrape: "Could not read comments from the page",
    noCommentsFound: "No comments found. Please make sure this post has comments."
  }
};

function t(key, replacements = {}) {
  let text = i18n[currentLang]?.[key] || i18n.ku[key] || key;
  for (const k in replacements) {
    text = text.replace(`{${k}}`, replacements[k]);
  }
  return text;
}

// Load language on startup
chrome.storage.local.get(['fbceLang'], (res) => {
  if (res.fbceLang && i18n[res.fbceLang]) currentLang = res.fbceLang;
});
// Listen for language changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.fbceLang) currentLang = changes.fbceLang.newValue || "ku";
});

function keepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(() => {
    if (exportState.isRunning) {
      console.log("Keeping Service Worker alive for FB Comments Exporter...");
    } else {
      clearInterval(keepAliveInterval);
    }
  }, 20000);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("FB Comments Exporter installed successfully!");
  }
});

// Broadcast progress back to popup if it's open
function updateProgress(percent, text) {
  exportState.percent = percent;
  chrome.runtime.sendMessage({
    action: "progressUpdate",
    percent: percent,
    text: text
  }).catch(() => {});
}

function finishExport(errorMsg = null) {
  exportState.isRunning = false;
  
  if (errorMsg) {
    chrome.runtime.sendMessage({
      action: "exportError",
      text: errorMsg
    }).catch(() => {});
    
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: t("errorTitle"),
      message: errorMsg
    });
    return;
  }

  chrome.runtime.sendMessage({
    action: "exportFinished",
    comments: exportState.comments
  }).catch(() => {});

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: t("exportDone"),
    message: t("exportDoneMsg", { COUNT: exportState.comments.length })
  });
}

function sendToTab(tabId, action, payload = null) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action, payload }, (response) => {
      resolve(response);
    });
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getState") {
    sendResponse(exportState);
    return true;
  }

  if (message.action === "startExport" && !exportState.isRunning) {
    exportState.isRunning = true;
    exportState.tabId = message.payload.tabId;
    exportState.method = message.payload.method;
    exportState.comments = [];
    exportState.totalFetched = 0;
    
    keepAlive();
    startExtraction();
  }
  
  if (message.action === "expandProgress" && message.data) {
     updateProgress(40, message.data.message || "...");
  }
});

async function startExtraction() {
  try {
    if (exportState.method === "dom") {
      await exportViaDOM();
    } else {
      await exportViaAPI();
    }
  } catch(e) {
    finishExport(t("errorOccurred") + e.message);
  }
}

async function exportViaAPI() {
  const tabId = exportState.tabId;
  updateProgress(5, t("gettingPostInfo"));

  const tokenResult = await sendToTab(tabId, "getTokens");
  if (!tokenResult || !tokenResult.success) {
    throw new Error(t("cantReadPage"));
  }

  const data = tokenResult.data;
  let feedbackId = null;

  if (data.feedbackIds && data.feedbackIds.length > 0) {
    feedbackId = data.feedbackIds[0];
  } else if (data.builtFeedbackId) {
    feedbackId = data.builtFeedbackId;
  }

  if (!feedbackId) {
    updateProgress(10, t("noFeedbackId"));
    await exportViaDOM();
    return;
  }

  let docId = null;
  if (data.capturedDocIds) {
    for (const key of Object.keys(data.capturedDocIds)) {
      docId = data.capturedDocIds[key];
      break;
    }
  }

  updateProgress(15, t("fetchingComments"));

  let cursor = null;
  let page = 0;

  while(exportState.isRunning) {
    page++;
    updateProgress(
      Math.min(15 + page * 10, 85),
      t("pageProgress", { PAGE: page, COUNT: exportState.totalFetched })
    );

    const result = await sendToTab(tabId, "fetchComments", {
      feedbackId: feedbackId,
      cursor: cursor,
      docId: docId,
    });

    if (!result || !result.success) {
      if (exportState.totalFetched === 0) {
        updateProgress(20, t("apiFailed"));
        await exportViaDOM();
        return;
      }
      break; 
    }

    const fetchData = result.data;
    if (fetchData.comments && fetchData.comments.length > 0) {
      exportState.comments.push(...fetchData.comments);
      exportState.totalFetched = exportState.comments.length;
    }

    if (!fetchData.hasMore || !fetchData.nextCursor) {
      break;
    }

    cursor = fetchData.nextCursor;
    await sleep(8000); 
  }

  if (exportState.comments.length === 0) {
    updateProgress(50, t("noCommentsAPI"));
    await exportViaDOM();
    return;
  }

  finishExport();
}

async function exportViaDOM() {
  const tabId = exportState.tabId;
  updateProgress(20, t("expandingComments"));

  try {
    const expandResult = await sendToTab(tabId, "expandComments");
    if (expandResult && expandResult.success && expandResult.data) {
      updateProgress(50, t("clickedExpand", { COUNT: expandResult.data.clickCount || 0 }));
    }
  } catch (e) {
    console.warn("Expand comments error:", e);
  }

  await sleep(1000);
  updateProgress(70, t("scrapingPage"));

  const result = await sendToTab(tabId, "scrapeDOM");
  if (!result || !result.success) {
    throw new Error(t("cantScrape"));
  }

  exportState.comments = result.data.comments || [];

  if (exportState.comments.length === 0) {
    finishExport(t("noCommentsFound"));
    return;
  }

  finishExport();
}

