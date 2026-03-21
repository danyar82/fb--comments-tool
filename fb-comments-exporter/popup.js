/**
 * popup.js — Popup UI Logic
 * Handles user interaction, communicates with content script,
 * and generates CSV downloads.
 */

(function () {
  "use strict";

  // DOM elements
  const langToggle = document.getElementById("langToggle");
  const statusCard = document.getElementById("statusCard");
  const statusIcon = document.getElementById("statusIcon");
  const statusText = document.getElementById("statusText");
  const postInfoCard = document.getElementById("postInfoCard");
  const postInfoText = document.getElementById("postInfoText");
  const postIdText = document.getElementById("postIdText");
  const methodSection = document.getElementById("methodSection");
  const actionsSection = document.getElementById("actionsSection");
  const exportBtn = document.getElementById("exportBtn");
  const progressSection = document.getElementById("progressSection");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const resultsSection = document.getElementById("resultsSection");
  const commentCount = document.getElementById("commentCount");
  const replyCount = document.getElementById("replyCount");
  const downloadBtn = document.getElementById("downloadBtn");
  const errorCard = document.getElementById("errorCard");
  const errorText = document.getElementById("errorText");
  const retryBtn = document.getElementById("retryBtn");
  const leaderboardSection = document.getElementById("leaderboardSection");
  const leaderboardList = document.getElementById("leaderboardList");
  const includeRepliesCheckbox = document.getElementById("includeReplies");

  let currentMethod = "api"; // "api" or "dom"
  let allComments = [];
  let uniqueComments = []; // Deduplicated array based on authorUrl or author
  let currentTabId = null;
  
  // ---------------------------------------------------------------------------
  // Localization (i18n)
  // ---------------------------------------------------------------------------
  let currentLang = "ku"; // default
  const i18n = {
    "ku": {
      langBtn: "EN",
      dir: "rtl",
      titleMain: "شیکارکەری کۆمێنتەکانی فەیسبوک",
      subtitle: "هەناردەکردنی کۆمێنتەکان — <strong>دانیار گروپ</strong>",
      freeBadge: "بەخۆڕایی ♾️",
      wait: "چاوەڕوان بە...",
      postFound: "پۆست دۆزرایەوە",
      exportMethod: "شێوازی هەناردەکردن:",
      methodAPI: "⚡ API (خێرا)",
      methodDOM: "🔍 DOM (پشتڕاست)",
      tipTitle: "ڕێنمایی گرنگ:",
      tip1: "<strong>١. پێش کارکردن:</strong> هەوڵبدە بە دەست هەموو کۆمێنتەکان لە لاپەڕەکەدا بکەرەوە (View more) بۆ باشترین ئەنجام.",
      tip2: "<strong>٢. بەشداربووی کەم:</strong> ئەگەر کۆمێنتەکان زۆر بوون بەڵام ئامرازەکە کەمی دەرکرد، بێ داخستنی ئامرازەکە چەند جارێک کلیک لە دەرکردن بکە.",
      tip3Title: "٣. جیاوازی شێوازەکان:",
      tip3API: "⚡ <strong>API:</strong> زۆر خێرایە بەڵام هەندێک جار فەیسبوک ڕێگری لێدەکات (بۆ پۆستی بچووک باشە).",
      tip3DOM: "🔍 <strong>DOM:</strong> کەمێک خاوە بەڵام ٪١٠٠ دروستە و ئەوەی دەیبینیت دەریدەهێنێت (بۆ پۆستی گەورە و پێشبڕکێ باشترە).",
      exportBtn: "دەرکردنی کۆمێنتەکان",
      analyzerBtn: "شیکارکەری چەندین فایلی CSV پێکەوە",
      started: "دەست پێکرا...",
      comments: "کۆمێنت",
      replies: "وەڵام",
      downloadCsv: "داگرتنی CSV",
      removeDupes: "سڕینەوەی دووبارەکان (تەنها ١ کۆمێنت بۆ هەر کەسێک)",
      randomWinner: "تیروپشکی هەڕەمەکی",
      topWinner: "بەپێی زۆرترین کۆمێنت",
      luckyWinner: "براوەی بەختەوەر",
      mostComments: "زۆرترین کۆمێنتکەر",
      includeReplies: "وەڵامەکانیش حیساب بکە",
      retry: "هەوڵی دووبارە",
      developedBy: "پەرەی پێدراوە لەلایەن دانیار گروپ 🚀",
      unlimited: "بێ سنوور و بەخۆڕایی ❤️",
      tabNotFound: "تاب نەدۆزرایەوە",
      openFacebook: "تکایە لاپەڕەیەکی فەیسبوک بکەرەوە",
      connecting: "پەیوەندیکردن بە لاپەڕەکەوە...",
      failedConnect: "ناتوانرێ پەیوەندی بکرێت. تکایە لاپەڕەکە Refresh بکە.",
      cookingBackground: "لە باکگراوند دەکوڵێتەوە...",
      cooking: "دەکوڵێتەوە...",
      extractingBg: "سەرقاڵی دەرهێنانە لە پشتەوە...",
      extractingCont: "دەرهێنان بەردەوامە...",
      connError: "هەڵە لە پەیوەندیکردندا",
      refreshNeeded: "تکایە لاپەڕەکە ڕیفرێش بکەرەوە بەیەکجاری و جارێکی تر تاقیبکەرەوە.",
      findingPost: "دۆزینەوەی زانیارییەکانی پۆست...",
      noPostInfo: "نەتوانرا زانیاری پۆستەکە بەدەست بهێنرێت.",
      noDtsg: "fb_dtsg نەدۆزرایەوە. تکایە دڵنیابە لۆگین کردوویت لە فەیسبوک.",
      readyExport: "ئامادەیە بۆ هەناردەکردن!",
      postFoundCheck: "پۆست دۆزرایەوە ✅",
      fbPage: "لاپەڕەی فەیسبوک 📄",
      useDomScraping: "DOM scraping بەکاردەهێنرێت",
      errorOccurred: "هەڵەیەک ڕوویدا: ",
      done: "تەواو بوو! ✅",
      searching: "...دەگەڕێت...",
      topCommenterWinner: "🥇 باشترین کۆمێنتکەر ({COUNT} کۆمێنت)",
      noComments: "هیچ کۆمێنتێک نییە",
      csvAuthor: "ناو (Author)",
      csvComment: "کۆمێنت (Comment)",
      csvDate: "بەروار (Date)",
      csvLikes: "لایک (Likes)",
      csvIsReply: "وەڵامە؟ (Is Reply)",
      csvReplyTo: "وەڵام بۆ (Reply To)",
      csvProfileUrl: "لینکی پرۆفایل (Profile URL)",
      yes: "بەڵێ",
      no: "نەخێر",
      unknown: "(نەناسراو)",
      tryAgain: "تیروپشکی تر"
    },
    "en": {
      langBtn: "KU",
      dir: "ltr",
      titleMain: "FB Comments Exporter",
      subtitle: "Export Facebook Comments — <strong>Danyar Group</strong>",
      freeBadge: "Free ♾️",
      wait: "Please wait...",
      postFound: "Post Found",
      exportMethod: "Export Method:",
      methodAPI: "⚡ API (Fast)",
      methodDOM: "🔍 DOM (Reliable)",
      tipTitle: "Important Tips:",
      tip1: "<strong>1. Preparation:</strong> Try to manually expand comments (View more) for the best results.",
      tip2: "<strong>2. Missing Users:</strong> If there are many comments but the tool missed some, click export again without closing.",
      tip3Title: "3. Method Differences:",
      tip3API: "⚡ <strong>API:</strong> Very fast but sometimes blocked by Facebook (good for small posts).",
      tip3DOM: "🔍 <strong>DOM:</strong> Slower but 100% accurate, extracting what you see (best for giveaways and large posts).",
      exportBtn: "Export Comments",
      analyzerBtn: "Open Multiple CSV Analyzer Tool",
      started: "Started...",
      comments: "Comments",
      replies: "Replies",
      downloadCsv: "Download CSV",
      removeDupes: "Remove Duplicates (1 comment per person)",
      randomWinner: "Random Winner",
      topWinner: "Top Commenter (Most Comments)",
      luckyWinner: "Lucky Winner",
      mostComments: "Top Commenters",
      includeReplies: "Include replies in count",
      retry: "Retry",
      developedBy: "Developed by Danyar Group 🚀",
      unlimited: "Unlimited & Free ❤️",
      tabNotFound: "Tab not found",
      openFacebook: "Please open a Facebook page",
      connecting: "Connecting to page...",
      failedConnect: "Could not connect. Please refresh the page.",
      cookingBackground: "Cooking in background...",
      cooking: "Cooking...",
      extractingBg: "Extracting in background...",
      extractingCont: "Extraction continuing...",
      connError: "Connection error",
      refreshNeeded: "Please hard refresh the page and try again.",
      findingPost: "Finding post info...",
      noPostInfo: "Could not get post info.",
      noDtsg: "fb_dtsg not found. Please make sure you are logged in.",
      readyExport: "Ready for export!",
      postFoundCheck: "Post Found ✅",
      fbPage: "Facebook Page 📄",
      useDomScraping: "Using DOM scraping",
      errorOccurred: "An error occurred: ",
      done: "Done! ✅",
      searching: "...searching...",
      topCommenterWinner: "🥇 Top Commenter ({COUNT} comments)",
      noComments: "No comments found",
      csvAuthor: "Author",
      csvComment: "Comment",
      csvDate: "Date",
      csvLikes: "Likes",
      csvIsReply: "Is Reply?",
      csvReplyTo: "Reply To",
      csvProfileUrl: "Profile URL",
      yes: "Yes",
      no: "No",
      unknown: "(Unknown)",
      tryAgain: "Spin Again"
    }
  };

  function t(key, replacements = {}) {
    let text = i18n[currentLang][key] || key;
    for (const k in replacements) {
      text = text.replace(`{${k}}`, replacements[k]);
    }
    return text;
  }

  function applyTranslation() {
    langToggle.textContent = i18n[currentLang].langBtn;
    document.documentElement.dir = i18n[currentLang].dir;
    document.body.dir = i18n[currentLang].dir;
    
    // Header
    const titleMain = document.querySelector(".header-text h1");
    if (titleMain) titleMain.textContent = t("titleMain");
    const subtitle = document.querySelector(".header-text .subtitle");
    if (subtitle) subtitle.innerHTML = t("subtitle");
    const badge = document.querySelector(".header .badge");
    if (badge) badge.textContent = t("freeBadge");
    
    // Re-translate status text for all known states
    const statusMap = {};
    for (const lang of ['ku', 'en']) {
      for (const key of ['wait', 'postFound', 'connecting', 'failedConnect', 'connError', 'refreshNeeded',
        'findingPost', 'noPostInfo', 'noDtsg', 'readyExport', 'tabNotFound', 'openFacebook',
        'cookingBackground', 'cooking', 'extractingBg', 'extractingCont', 'done']) {
        statusMap[i18n[lang][key]] = key;
      }
    }
    const statusKey = statusMap[statusText.textContent];
    if (statusKey) statusText.textContent = t(statusKey);
    
    // Buttons & Labels
    const exportMethodLbl = document.querySelector(".method-label");
    if (exportMethodLbl) exportMethodLbl.textContent = t("exportMethod");
    
    const methodAPI = document.getElementById("methodAPI");
    if (methodAPI) methodAPI.innerHTML = t("methodAPI");
    
    const methodDOM = document.getElementById("methodDOM");
    if (methodDOM) methodDOM.innerHTML = t("methodDOM");
    
    // Tips
    const tipBox = document.querySelector(".tip-box strong");
    if (tipBox) tipBox.textContent = t("tipTitle");
    const tips = document.querySelectorAll(".tip-box .tip-text span");
    if (tips.length >= 2) {
      tips[0].innerHTML = t("tip1");
      tips[1].innerHTML = t("tip2");
    }
    const tip3Box = document.querySelector(".tip-box .tip-text div");
    if (tip3Box) {
      const parts = tip3Box.querySelectorAll("span");
      tip3Box.querySelector("strong").textContent = t("tip3Title");
      if (parts.length >= 2) {
        parts[0].innerHTML = t("tip3API");
        parts[1].innerHTML = t("tip3DOM");
      }
    }
    
    // Actions
    if (!exportBtn.disabled) {
      exportBtn.innerHTML = `<span class="btn-icon">📥</span><span>${t("exportBtn")}</span>`;
    }
    const analyzerBtn = document.getElementById("openAnalyzerMainBtn");
    if (analyzerBtn) analyzerBtn.innerHTML = `<span class="btn-icon">📊</span><span>${t("analyzerBtn")}</span>`;
    
    // Results
    const commentLabel = document.querySelector("#commentCount").nextElementSibling;
    if (commentLabel) commentLabel.textContent = t("comments");
    const replyLabel = document.querySelector("#replyCount").nextElementSibling;
    if (replyLabel) replyLabel.textContent = t("replies");
    downloadBtn.innerHTML = `<span class="btn-icon">💾</span><span>${t("downloadCsv")}</span>`;
    
    // Giveaway
    const dupesSpan = document.querySelector("#removeDuplicates").previousElementSibling;
    if (dupesSpan) dupesSpan.textContent = t("removeDupes");
    
    const pickWinnerBtn = document.getElementById("pickWinnerBtn");
    if (pickWinnerBtn && !pickWinnerBtn.disabled && pickWinnerBtn.innerHTML.includes("🎁")) {
      pickWinnerBtn.innerHTML = `<span class="btn-icon">🎁</span><span>${t("randomWinner")}</span>`;
    } else if (pickWinnerBtn && pickWinnerBtn.innerHTML.includes("تیروپشکی تر")) {
      pickWinnerBtn.innerHTML = `<span class="btn-icon">🎁</span><span>${t("tryAgain")}</span>`;
    }
    const pickTopWinnerBtn = document.getElementById("pickTopWinnerBtn");
    if (pickTopWinnerBtn) pickTopWinnerBtn.innerHTML = `<span class="btn-icon">🏆</span><span>${t("topWinner")}</span>`;
    
    // Leaderboard
    const lbTitle = document.querySelector(".leaderboard-title");
    if (lbTitle) lbTitle.textContent = "🏆 " + t("mostComments");
    const inclReplies = document.querySelector("#includeReplies").nextElementSibling.nextElementSibling;
    if (inclReplies) inclReplies.textContent = t("includeReplies");
    
    // Error
    retryBtn.textContent = t("retry");
    
    // Footer
    const footerP = document.querySelectorAll(".footer p");
    if (footerP.length >= 2) {
      footerP[0].innerHTML = `<strong>${t("developedBy")}</strong>`;
      footerP[1].innerHTML = t("unlimited");
    }
    
    // If stats are shown, re-render winners/leaderboard to update texts
    if (allComments.length > 0) {
      const removeDupes = document.getElementById("removeDuplicates").checked;
      const pool = removeDupes ? uniqueComments : allComments;
      renderLeaderboard(pool, document.getElementById("includeReplies").checked);
    }
  }

  // Load saved language
  chrome.storage.local.get(['fbceLang'], (res) => {
    if (res.fbceLang && i18n[res.fbceLang]) {
      currentLang = res.fbceLang;
    } else {
      currentLang = "ku";
    }
    applyTranslation();
  });

  // Toggle language
  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "ku" ? "en" : "ku";
    chrome.storage.local.set({ fbceLang: currentLang });
    applyTranslation();
  });

  // ---------------------------------------------------------------------------
  // Method selection
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".method-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".method-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMethod = btn.dataset.method;
    });
  });

  // ---------------------------------------------------------------------------
  // Include replies toggle
  // ---------------------------------------------------------------------------
  includeRepliesCheckbox.addEventListener("change", () => {
    if (allComments.length > 0) {
      renderLeaderboard(allComments, includeRepliesCheckbox.checked);
    }
  });

  // ---------------------------------------------------------------------------
  // Listen for live progress updates from content script
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "expandProgress" && message.data) {
      updateProgress(40, message.data.message || "...");
    }
  });

  // ---------------------------------------------------------------------------
  // Initialize: check if we're on Facebook
  // ---------------------------------------------------------------------------
  async function init() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        showStatus("⚠️", t("tabNotFound"), false);
        return;
      }

      currentTabId = tab.id;
      const url = tab.url || "";

      if (!url.includes("facebook.com")) {
        showStatus(
          "🌐",
          t("openFacebook"),
          false
        );
        return;
      }

      showStatus("🔄", t("connecting"), false);

      // Wait a bit for content script to inject
      await sleep(500);

      // Try to ping content script
      let pingResult;
      try {
        pingResult = await sendMessage(currentTabId, { action: "ping" });
      } catch (e) {
        // Content script might not be injected yet, try scripting API
        try {
          await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ["content.js"],
          });
          await sleep(1000);
          pingResult = await sendMessage(currentTabId, { action: "ping" });
        } catch (e2) {
          showStatus(
            "❌",
            t("failedConnect"),
            false
          );
          return;
        }
      }

      // Check if export is already running in background
      chrome.runtime.sendMessage({ action: "getState" }, (state) => {
        if (state && state.isRunning) {
          exportBtn.disabled = true;
          exportBtn.innerHTML = `<span class="spinner"></span><span>${t("cookingBackground")}</span>`;
          progressSection.classList.remove("hidden");
          progressSection.classList.add("fade-in");
          errorCard.classList.add("hidden");
          resultsSection.classList.add("hidden");
          updateProgress(state.percent || 5, t("extractingBg"));
          
          showStatus("🔄", t("extractingCont"), false);
          
          // Show the method section even if running, just disabled
          methodSection.classList.remove("hidden");
          actionsSection.classList.remove("hidden");
        } else {
          // Normal token fetching
          fetchTokensFromTab(currentTabId);
        }
      });
      
    } catch (error) {
      showStatus("❌", t("connError"), false);
    }
  }

  async function fetchTokensFromTab(tabId) {
    try {
      showStatus("🔄", t("connecting"), false);
      const pingResult = await sendMessage(tabId, { action: "ping" });

      if (!pingResult || pingResult.status !== "ok" || !pingResult.injected) {
        showStatus("⚠️", t("refreshNeeded"), false);
        return;
      }

      showStatus("🔄", t("findingPost"), false);

      const tokenResult = await sendMessage(tabId, { action: "getTokens" });
      if (!tokenResult || !tokenResult.success) {
        showStatus("⚠️", t("noPostInfo"), false);
        return;
      }

      const data = tokenResult.data;
      if (!data.fb_dtsg) {
        showStatus(
          "⚠️",
          t("noDtsg"),
          false
        );
        return;
      }

      // Show success status
      showStatus("✅", t("readyExport"), true);

      // Show post info
      if (data.postInfo) {
        postInfoCard.classList.remove("hidden");
        postInfoCard.classList.add("fade-in");
        postInfoText.textContent = t("postFoundCheck");
        postIdText.textContent = `${data.postInfo.type}: ${data.postInfo.id}`;
      } else if (data.feedbackIds && data.feedbackIds.length > 0) {
        postInfoCard.classList.remove("hidden");
        postInfoCard.classList.add("fade-in");
        postInfoText.textContent = "Feedback ID ✅";
        postIdText.textContent = data.feedbackIds[0].substring(0, 30) + "...";
      } else {
        postInfoCard.classList.remove("hidden");
        postInfoCard.classList.add("fade-in");
        postInfoText.textContent = t("fbPage");
        postIdText.textContent = t("useDomScraping");
      }

      // Show method selection and action button
      methodSection.classList.remove("hidden");
      methodSection.classList.add("fade-in");
      actionsSection.classList.remove("hidden");
      actionsSection.classList.add("fade-in");
    } catch (error) {
      showStatus("❌", t("errorOccurred") + error.message, false);
    }
  }

  // ---------------------------------------------------------------------------
  // Export button click handler
  // ---------------------------------------------------------------------------
  const openAnalyzerMainBtn = document.getElementById("openAnalyzerMainBtn");
  if(openAnalyzerMainBtn) {
    openAnalyzerMainBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("analyzer.html") });
    });
  }

  exportBtn.addEventListener("click", () => {
    if (!currentTabId) return;

    exportBtn.disabled = true;
    exportBtn.innerHTML =
      `<span class="spinner"></span><span>${t("cooking")}</span>`;
    progressSection.classList.remove("hidden");
    progressSection.classList.add("fade-in");
    errorCard.classList.add("hidden");
    resultsSection.classList.add("hidden");

    allComments = [];

    // Send command to background to start
    chrome.runtime.sendMessage({
      action: "startExport",
      payload: {
        tabId: currentTabId,
        method: currentMethod
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Listen for Background Updates
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "progressUpdate") {
      updateProgress(message.percent, message.text);
      // Sync the background progress to the current UI state so it doesn't get lost
      chrome.runtime.sendMessage({ action: "getState" }, (state) => {
         if(state) state.percent = message.percent;
      });
    } else if (message.action === "exportError") {
      showError(message.text);
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<span class="btn-icon">📥</span><span>${t("exportBtn")}</span>`;
    } else if (message.action === "exportFinished") {
      updateProgress(100, t("done"));
      allComments = message.comments || [];
      
      // Pre-calculate unique comments
      const seen = new Set();
      uniqueComments = [];
      for (const c of allComments) {
        const identifier = c.authorUrl || c.author;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          uniqueComments.push(c);
        }
      }

      const removeDupes = document.getElementById("removeDuplicates").checked;
      const finalArray = removeDupes ? uniqueComments : allComments;

      const comments = finalArray.filter((c) => !c.isReply).length;
      const replies = finalArray.filter((c) => c.isReply).length;

      exportBtn.disabled = false;
      exportBtn.innerHTML = `<span class="btn-icon">📥</span><span>${t("exportBtn")}</span>`;

      setTimeout(() => {
        progressSection.classList.add("hidden");
        resultsSection.classList.remove("hidden");
        resultsSection.classList.add("fade-in");

        commentCount.textContent = comments || finalArray.length;
        replyCount.textContent = replies;

        // Show leaderboard
        renderLeaderboard(finalArray, includeRepliesCheckbox.checked);
        leaderboardSection.classList.remove("hidden");
        leaderboardSection.classList.add("fade-in");
      }, 600);
    }
  });

  // ---------------------------------------------------------------------------
  // Remove Duplicates checkbox change
  // ---------------------------------------------------------------------------
  document.getElementById("removeDuplicates").addEventListener("change", () => {
    if (allComments.length > 0) {
      const removeDupes = document.getElementById("removeDuplicates").checked;
      const finalArray = removeDupes ? uniqueComments : allComments;
      
      const comments = finalArray.filter((c) => !c.isReply).length;
      const replies = finalArray.filter((c) => c.isReply).length;
      
      commentCount.textContent = comments || finalArray.length;
      replyCount.textContent = replies;
      
      renderLeaderboard(finalArray, includeRepliesCheckbox.checked);
    }
  });

  // ---------------------------------------------------------------------------
  // Winner Pickers
  // ---------------------------------------------------------------------------
  const pickWinnerBtn = document.getElementById("pickWinnerBtn");
  const pickTopWinnerBtn = document.getElementById("pickTopWinnerBtn");
  const winnerDisplay = document.getElementById("winnerDisplay");
  const winnerTitle = document.getElementById("winnerTitle");
  const winnerListContainer = document.getElementById("winnerListContainer");

  function renderWinners(winnersArray, titleText) {
    winnerTitle.textContent = titleText;
    winnerListContainer.innerHTML = winnersArray.map(w => `
      <div style="margin-bottom:12px;">
        <a href="${w.authorUrl || '#'}" target="_blank" style="font-size:15px;font-weight:700;color:#ffd700;text-decoration:none;display:block;">${w.author || t("unknown")}</a>
        <p style="font-size:12px;margin-top:4px;color:#fff;background:rgba(0,0,0,0.2);padding:8px;border-radius:6px;word-break:break-all;">${w.text || w.count + " " + t("comments")}</p>
      </div>
    `).join("");
    winnerDisplay.classList.remove("hidden");
  }

  // 1. Random Winner
  pickWinnerBtn.addEventListener("click", () => {
    const removeDupes = document.getElementById("removeDuplicates").checked;
    const pool = removeDupes ? uniqueComments : allComments;

    if (pool.length === 0) return;

    pickWinnerBtn.disabled = true;
    pickTopWinnerBtn.disabled = true;
    winnerDisplay.classList.remove("hidden");
    
    let counter = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      renderWinners([{ author: pool[randomIndex].author, text: t("searching") }], t("luckyWinner"));
      counter++;
      
      if (counter >= maxSpins) {
        clearInterval(interval);
        const winner = pool[Math.floor(Math.random() * pool.length)];
        renderWinners([winner], t("luckyWinner") + " 🎊");
        
        pickWinnerBtn.disabled = false;
        pickTopWinnerBtn.disabled = false;
        pickWinnerBtn.innerHTML = `<span class="btn-icon">🎁</span><span>${t("tryAgain")}</span>`;
      }
    }, 50);
  });

  // 2. Top Commenter(s) Winner
  pickTopWinnerBtn.addEventListener("click", () => {
    // If removeDupes is checked, everybody only has 1 comment, making this useless.
    // So for "Top Commenter", we ALWAYS look at the raw comments list, but respect "includeReplies"
    if (allComments.length === 0) return;
    
    const includeReplies = document.getElementById("includeReplies").checked;
    
    // Count comments per author
    const counts = {};
    const authorUrls = {}; // Store URLs to linkify
    
    for (const c of allComments) {
      if (!includeReplies && c.isReply) continue;
      const name = c.author || t("unknown");
      counts[name] = (counts[name] || 0) + 1;
      if (c.authorUrl) authorUrls[name] = c.authorUrl;
    }

    if (Object.keys(counts).length === 0) return;

    // Find the max count
    let maxVal = 0;
    for (const name in counts) {
      if (counts[name] > maxVal) maxVal = counts[name];
    }

    // Find all authors with that max count (handling ties)
    const winners = [];
    for (const name in counts) {
      if (counts[name] === maxVal) {
        winners.push({
          author: name,
          authorUrl: authorUrls[name] || "#",
          count: maxVal
        });
      }
    }

    renderWinners(winners, t("topCommenterWinner", { COUNT: maxVal }));
  });

  // ---------------------------------------------------------------------------
  // Leaderboard: top 10 commenters
  // ---------------------------------------------------------------------------
  function renderLeaderboard(comments, includeReplies) {
    // Count comments per author
    const counts = {};
    for (const c of comments) {
      if (!includeReplies && c.isReply) continue;
      const name = c.author || t("unknown");
      counts[name] = (counts[name] || 0) + 1;
    }

    // Sort and take top 10
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) {
      leaderboardList.innerHTML =
        `<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:10px">${t("noComments")}</p>`;
      return;
    }

    const maxCount = sorted[0][1];
    const medals = ["🥇", "🥈", "🥉"];
    const rankClasses = ["gold", "silver", "bronze"];

    leaderboardList.innerHTML = sorted
      .map(([name, count], i) => {
        const rank = i < 3 ? medals[i] : `${i + 1}`;
        const rankClass = i < 3 ? rankClasses[i] : "";
        const barWidth = Math.round((count / maxCount) * 100);
        const delay = i * 0.06;

        return `
          <div class="lb-row" style="animation-delay:${delay}s">
            <span class="lb-rank ${rankClass}">${rank}</span>
            <span class="lb-name" title="${name}">${name}</span>
            <span class="lb-count">${count}</span>
            <div class="lb-bar-wrap">
              <div class="lb-bar" style="width:${barWidth}%"></div>
            </div>
          </div>`;
      })
      .join("");
  }

  // ---------------------------------------------------------------------------
  // Download CSV
  // ---------------------------------------------------------------------------
  downloadBtn.addEventListener("click", () => {
    const removeDupes = document.getElementById("removeDuplicates").checked;
    const finalArray = removeDupes ? uniqueComments : allComments;

    if (finalArray.length === 0) return;

    const csv = generateCSV(finalArray);
    const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `fb_comments_${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  });

  // ---------------------------------------------------------------------------
  // Retry button
  // ---------------------------------------------------------------------------
  retryBtn.addEventListener("click", () => {
    errorCard.classList.add("hidden");
    init();
  });

  // ---------------------------------------------------------------------------
  // CSV Generation
  // ---------------------------------------------------------------------------
  function generateCSV(comments) {
    const headers = [
      t("csvAuthor"),
      t("csvComment"),
      t("csvDate"),
      t("csvLikes"),
      t("csvIsReply"),
      t("csvReplyTo"),
      t("csvProfileUrl"),
    ];

    const rows = comments.map((c) => [
      escapeCSV(c.author || ""),
      escapeCSV(c.text || ""),
      escapeCSV(c.date || ""),
      c.likeCount || 0,
      c.isReply ? t("yes") : t("no"),
      escapeCSV(c.parentAuthor || ""),
      escapeCSV(c.authorUrl || ""),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  function escapeCSV(str) {
    if (!str) return '""';
    // Escape quotes and wrap in quotes
    const escaped = String(str).replace(/"/g, '""');
    return `"${escaped}"`;
  }

  // ---------------------------------------------------------------------------
  // UI Helpers
  // ---------------------------------------------------------------------------
  function showStatus(icon, text, ready) {
    statusIcon.textContent = icon;
    statusText.textContent = text;

    if (ready) {
      statusCard.style.borderColor = "rgba(0, 200, 83, 0.3)";
      statusCard.style.background = "rgba(0, 200, 83, 0.06)";
    }
  }

  function updateProgress(percent, text) {
    progressFill.style.width = percent + "%";
    progressText.textContent = text;
  }

  function showError(text) {
    progressSection.classList.add("hidden");
    errorCard.classList.remove("hidden");
    errorCard.classList.add("fade-in");
    errorText.textContent = text;
  }

  // ---------------------------------------------------------------------------
  // Communication helper
  // ---------------------------------------------------------------------------
  function sendMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  init();
})();
