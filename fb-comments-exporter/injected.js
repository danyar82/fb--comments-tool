/**
 * injected.js — Runs in Facebook's MAIN world
 * Has access to page cookies, window.fb_dtsg, and can make authenticated API calls.
 */

(function () {
  "use strict";

  const MSG_PREFIX_SEND = "fbce_send_";
  const MSG_PREFIX_RECV = "fbce_recv_";

  // ---------------------------------------------------------------------------
  // Utility: get fb_dtsg token
  // ---------------------------------------------------------------------------
  function getFbDtsg() {
    // Method 1: direct global
    if (window.fb_dtsg) return window.fb_dtsg;

    // Method 2: hidden input
    const input = document.querySelector('input[name="fb_dtsg"]');
    if (input && input.value) return input.value;

    // Method 3: parse from page source (script tags)
    const scripts = document.querySelectorAll("script:not([src])");
    for (const script of scripts) {
      const text = script.textContent;
      // Pattern: "DTSGInitData",[],{"token":"..."}
      const match = text.match(/"DTSGInitData",\[\],\{"token":"([^"]+)"/);
      if (match) return match[1];
      // Pattern: fb_dtsg.*?"value":"..."
      const match2 = text.match(/fb_dtsg.*?"value":"([^"]+)"/);
      if (match2) return match2[1];
      // Pattern: "dtsg":{"token":"..."}
      const match3 = text.match(/"dtsg":\{"token":"([^"]+)"/);
      if (match3) return match3[1];
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Utility: get user ID from cookies
  // ---------------------------------------------------------------------------
  function getUserId() {
    const match = document.cookie.match(/c_user=(\d+)/);
    return match ? match[1] : "0";
  }

  // ---------------------------------------------------------------------------
  // Utility: extract story/post ID from URL
  // ---------------------------------------------------------------------------
  function extractPostIdFromUrl(url) {
    let m;
    // /posts/pfbid... or /posts/12345
    m = url.match(/\/posts\/([a-zA-Z0-9]+)/);
    if (m) return { id: m[1], type: "post" };
    // /permalink/12345
    m = url.match(/\/permalink\/(\d+)/);
    if (m) return { id: m[1], type: "permalink" };
    // story_fbid=12345
    m = url.match(/story_fbid=(\d+)/);
    if (m) return { id: m[1], type: "story" };
    // fbid=12345
    m = url.match(/fbid=(\d+)/);
    if (m) return { id: m[1], type: "photo" };
    // /videos/12345
    m = url.match(/\/videos\/(\d+)/);
    if (m) return { id: m[1], type: "video" };
    // /reel/12345
    m = url.match(/\/reel\/(\d+)/);
    if (m) return { id: m[1], type: "reel" };
    // /watch/?v=12345
    m = url.match(/[?&]v=(\d+)/);
    if (m) return { id: m[1], type: "watch" };
    return null;
  }

  // ---------------------------------------------------------------------------
  // Find feedback ID from page data (script tags contain Relay data)
  // ---------------------------------------------------------------------------
  function findFeedbackIdFromPage() {
    const scripts = document.querySelectorAll("script:not([src])");
    const feedbackIds = [];

    for (const script of scripts) {
      const text = script.textContent;
      if (!text || text.length < 100) continue;

      // Pattern: "feedback_id":"ZmVlZG..."
      const matches = text.matchAll(/"feedback_id"\s*:\s*"([^"]+)"/g);
      for (const m of matches) {
        if (!feedbackIds.includes(m[1])) feedbackIds.push(m[1]);
      }

      // Pattern: "feedbackID":"ZmVlZG..."
      const matches2 = text.matchAll(/"feedbackID"\s*:\s*"([^"]+)"/g);
      for (const m of matches2) {
        if (!feedbackIds.includes(m[1])) feedbackIds.push(m[1]);
      }

      // Pattern: feedbackSource.*?id":"..." (near feedback references)
      const matches3 = text.matchAll(
        /"feedback"\s*:\s*\{[^}]*"id"\s*:\s*"([^"]+)"/g
      );
      for (const m of matches3) {
        if (!feedbackIds.includes(m[1])) feedbackIds.push(m[1]);
      }
    }

    return feedbackIds;
  }

  // ---------------------------------------------------------------------------
  // Build feedback ID from post ID (base64 encoded)
  // ---------------------------------------------------------------------------
  function buildFeedbackId(postId) {
    // Facebook feedback IDs are base64 of "feedback:{numeric_id}"
    if (/^\d+$/.test(postId)) {
      return btoa("feedback:" + postId);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Intercept doc_ids from Facebook's own GraphQL requests
  // ---------------------------------------------------------------------------
  let capturedDocIds = {};

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    try {
      const [url, options] = args;
      if (
        url &&
        typeof url === "string" &&
        url.includes("/api/graphql/") &&
        options &&
        options.body
      ) {
        const body =
          typeof options.body === "string"
            ? options.body
            : new URLSearchParams(options.body).toString();
        const params = new URLSearchParams(body);
        const docId = params.get("doc_id");
        const friendlyName = params.get("fb_api_req_friendly_name");

        if (docId && friendlyName) {
          const nameLower = friendlyName.toLowerCase();
          if (
            nameLower.includes("comment") ||
            nameLower.includes("ufi") ||
            nameLower.includes("feedback")
          ) {
            capturedDocIds[friendlyName] = docId;
            console.log("[FBCE] Captured doc_id:", friendlyName, "→", docId);
          }
        }
      }
    } catch (e) {
      /* silent */
    }
    return originalFetch.apply(this, args);
  };

  // ---------------------------------------------------------------------------
  // Make a GraphQL request to fetch comments
  // ---------------------------------------------------------------------------
  async function fetchComments(feedbackId, cursor, docId) {
    const dtsg = getFbDtsg();
    const userId = getUserId();

    if (!dtsg) throw new Error("fb_dtsg not found");

    const variables = {
      commentsAfterCount: 50,
      commentsAfterCursor: cursor || null,
      commentsBeforeCount: null,
      commentsBeforeCursor: null,
      feedbackSource: 2,
      focusCommentID: null,
      scale: 1,
      useDefaultActor: false,
      id: feedbackId,
      __relay_internal__pv__IsWorkUserrelayprovider: false,
    };

    const formData = new URLSearchParams();
    formData.append("fb_dtsg", dtsg);
    formData.append("fb_api_caller_class", "RelayModern");
    formData.append("fb_api_req_friendly_name", "CometUFICommentsProviderQuery");
    formData.append("variables", JSON.stringify(variables));
    formData.append("server_timestamps", "true");
    formData.append("__user", userId);
    formData.append("__a", "1");
    if (docId) {
      formData.append("doc_id", docId);
    }

    const response = await originalFetch.call(
      window,
      "https://www.facebook.com/api/graphql/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        credentials: "include",
      }
    );

    const text = await response.text();
    return parseGraphQLResponse(text);
  }

  // ---------------------------------------------------------------------------
  // Fetch replies for a specific comment
  // ---------------------------------------------------------------------------
  async function fetchReplies(commentId, cursor, docId) {
    const dtsg = getFbDtsg();
    const userId = getUserId();

    if (!dtsg) throw new Error("fb_dtsg not found");

    const variables = {
      after: cursor || null,
      before: null,
      feedbackID: commentId,
      feedLocation: "PERMALINK",
      first: 50,
      focusCommentID: null,
      includeHighlightedReply: false,
      isComet: true,
      last: null,
      scale: 1,
    };

    const formData = new URLSearchParams();
    formData.append("fb_dtsg", dtsg);
    formData.append("fb_api_caller_class", "RelayModern");
    formData.append(
      "fb_api_req_friendly_name",
      "CometFocusedStoryAndRepliesQuery"
    );
    formData.append("variables", JSON.stringify(variables));
    formData.append("server_timestamps", "true");
    formData.append("__user", userId);
    formData.append("__a", "1");
    if (docId) {
      formData.append("doc_id", docId);
    }

    const response = await originalFetch.call(
      window,
      "https://www.facebook.com/api/graphql/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        credentials: "include",
      }
    );

    const text = await response.text();
    return parseGraphQLResponse(text);
  }

  // ---------------------------------------------------------------------------
  // Parse GraphQL response (handles Facebook's NDJSON format)
  // ---------------------------------------------------------------------------
  function parseGraphQLResponse(text) {
    const results = [];
    // Facebook sometimes prepends "for (;;);" as anti-XSRF
    let cleaned = text.replace(/^for\s*\(;;\)\s*;\s*/, "");

    // Try to parse as single JSON first
    try {
      const parsed = JSON.parse(cleaned);
      results.push(parsed);
      return results;
    } catch (e) {
      // Not single JSON, try NDJSON
    }

    // Split by newlines and parse each line
    const lines = cleaned.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        results.push(JSON.parse(trimmed));
      } catch (e) {
        // Skip unparseable lines
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Extract comment data from GraphQL response objects
  // ---------------------------------------------------------------------------
  function extractComments(responseObjects) {
    const comments = [];

    function processNode(node, parentAuthor) {
      if (!node) return;

      const comment = {
        id: node.id || "",
        author: "",
        authorUrl: "",
        text: "",
        timestamp: "",
        date: "",
        likeCount: 0,
        replyCount: 0,
        isReply: !!parentAuthor,
        parentAuthor: parentAuthor || "",
      };

      // Author
      if (node.author) {
        comment.author = node.author.name || node.author.__typename || "";
        comment.authorUrl = node.author.url || node.author.uri || "";
      }

      // Text
      if (node.body) {
        comment.text = node.body.text || "";
      }

      // Timestamp
      if (node.created_time) {
        comment.timestamp = node.created_time;
        try {
          comment.date = new Date(node.created_time * 1000).toLocaleString();
        } catch (e) {
          comment.date = String(node.created_time);
        }
      }

      // Reactions/likes
      if (node.feedback) {
        if (node.feedback.reactors) {
          comment.likeCount = node.feedback.reactors.count || 0;
        }
        if (node.feedback.total_comment_count != null) {
          comment.replyCount = node.feedback.total_comment_count;
        }
      }

      // Legacy like count
      if (node.comment_like_count != null) {
        comment.likeCount = node.comment_like_count;
      }

      comments.push(comment);

      // Process replies
      if (node.feedback && node.feedback.display_comments) {
        const edges = node.feedback.display_comments.edges || [];
        for (const edge of edges) {
          if (edge.node) {
            processNode(edge.node, comment.author);
          }
        }
      }
    }

    // Deep search through response for comment nodes
    function deepSearch(obj, parentAuthor) {
      if (!obj || typeof obj !== "object") return;

      // Check if this looks like a comment node
      if (obj.body && obj.author && (obj.created_time || obj.created_time_text)) {
        processNode(obj, parentAuthor);
        return; // Don't recurse into already-processed nodes
      }

      // Look for display_comments edges
      if (obj.display_comments && obj.display_comments.edges) {
        for (const edge of obj.display_comments.edges) {
          if (edge.node) processNode(edge.node, null);
        }
        return;
      }

      // Recurse into arrays and objects
      if (Array.isArray(obj)) {
        for (const item of obj) deepSearch(item, parentAuthor);
      } else {
        for (const key of Object.keys(obj)) {
          deepSearch(obj[key], parentAuthor);
        }
      }
    }

    for (const response of responseObjects) {
      deepSearch(response, null);
    }

    return comments;
  }

  // ---------------------------------------------------------------------------
  // DOM Scraping fallback: extract comments from rendered page
  // ---------------------------------------------------------------------------
  function scrapeCommentsFromDOM() {
    const comments = [];

    // Try to find comment elements by aria-label pattern
    const articles = document.querySelectorAll('[role="article"]');

    for (const article of articles) {
      // Skip the main post (usually the first article)
      const ariaLabel = article.getAttribute("aria-label") || "";
      const isComment =
        ariaLabel.toLowerCase().includes("comment") ||
        ariaLabel.includes("تێبینی") || // Kurdish
        ariaLabel.includes("تعليق") || // Arabic
        ariaLabel.includes("댓글") || // Korean 
        article.closest('[aria-label*="omment"]'); // Parent check
      
      if (!isComment && articles[0] === article) continue;

      // Try to extract comment data
      const links = article.querySelectorAll("a[role='link']");
      let author = "";
      let authorUrl = "";

      for (const link of links) {
        const href = link.getAttribute("href") || "";
        if (
          href.includes("/user/") ||
          href.includes("/profile.php") ||
          (href.startsWith("/") &&
            !href.includes("/posts/") &&
            !href.includes("#") &&
            link.textContent.trim().length > 0 &&
            link.textContent.trim().length < 100)
        ) {
          author = link.textContent.trim();
          authorUrl = href;
          break;
        }
      }

      if (!author) {
        // Fallback: first link with substantial text
        for (const link of links) {
          const text = link.textContent.trim();
          if (text.length > 0 && text.length < 80) {
            author = text;
            authorUrl = link.getAttribute("href") || "";
            break;
          }
        }
      }

      // Get comment text
      const textElements = article.querySelectorAll("div[dir='auto']");
      let text = "";
      for (const el of textElements) {
        const t = el.textContent.trim();
        if (t.length > 0 && t !== author) {
          text = t;
          break;
        }
      }

      // Get timestamp
      const timeEl = article.querySelector("abbr, time, a[href*='comment_id']");
      let date = timeEl ? timeEl.textContent.trim() || timeEl.getAttribute("title") || "" : "";

      if (author || text) {
        comments.push({
          id: "",
          author: author,
          authorUrl: authorUrl,
          text: text,
          timestamp: "",
          date: date,
          likeCount: 0,
          replyCount: 0,
          isReply: false,
          parentAuthor: "",
        });
      }
    }

    return comments;
  }

  // ---------------------------------------------------------------------------
  // Message handler: listen for requests from content script
  // ---------------------------------------------------------------------------
  window.addEventListener("message", async function (event) {
    if (event.source !== window) return;
    if (!event.data || !event.data.name) return;

    const name = event.data.name;

    // ----- Get tokens -----
    if (name === MSG_PREFIX_SEND + "getTokens") {
      const dtsg = getFbDtsg();
      const userId = getUserId();
      const postInfo = extractPostIdFromUrl(window.location.href);
      const feedbackIds = findFeedbackIdFromPage();

      let builtFeedbackId = null;
      if (postInfo && postInfo.id) {
        builtFeedbackId = buildFeedbackId(postInfo.id);
      }

      window.postMessage(
        {
          name: MSG_PREFIX_RECV + "getTokens",
          payload: {
            fb_dtsg: dtsg,
            userId: userId,
            postInfo: postInfo,
            feedbackIds: feedbackIds,
            builtFeedbackId: builtFeedbackId,
            capturedDocIds: capturedDocIds,
            url: window.location.href,
          },
        },
        "*"
      );
    }

    // ----- Fetch comments via API -----
    if (name === MSG_PREFIX_SEND + "fetchComments") {
      const { feedbackId, cursor, docId } = event.data.payload || {};
      try {
        const response = await fetchComments(feedbackId, cursor, docId);
        const comments = extractComments(response);

        // Check for pagination
        let nextCursor = null;
        let hasMore = false;
        function findPageInfo(obj) {
          if (!obj || typeof obj !== "object") return;
          if (obj.page_info) {
            if (obj.page_info.has_next_page) {
              hasMore = true;
              nextCursor = obj.page_info.end_cursor;
            }
            return;
          }
          if (Array.isArray(obj)) {
            for (const item of obj) findPageInfo(item);
          } else {
            for (const key of Object.keys(obj)) findPageInfo(obj[key]);
          }
        }
        for (const r of response) findPageInfo(r);

        window.postMessage(
          {
            name: MSG_PREFIX_RECV + "fetchComments",
            payload: {
              success: true,
              comments: comments,
              hasMore: hasMore,
              nextCursor: nextCursor,
              raw: response,
            },
          },
          "*"
        );
      } catch (error) {
        window.postMessage(
          {
            name: MSG_PREFIX_RECV + "fetchComments",
            payload: {
              success: false,
              error: error.message,
              comments: [],
            },
          },
          "*"
        );
      }
    }

    // ----- DOM Scraping fallback -----
    if (name === MSG_PREFIX_SEND + "scrapeDOM") {
      const comments = scrapeCommentsFromDOM();
      window.postMessage(
        {
          name: MSG_PREFIX_RECV + "scrapeDOM",
          payload: { comments: comments },
        },
        "*"
      );
    }

    // ----- Expand all comments (click "View more") -----
    if (name === MSG_PREFIX_SEND + "expandComments") {
      let clicked = 0;
      const maxClicks = 500; // Safety limit

      // -------- STEP 1: Read total comment count from the post --------
      function parseK_M(numStr) {
        let multiplier = 1;
        numStr = numStr.toUpperCase();
        if (numStr.includes('K')) multiplier = 1000;
        if (numStr.includes('M')) multiplier = 1000000;
        
        let cleaned = numStr.replace(/[KM,\s]/g, ""); // remove K, M, commas, spaces
        let num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.floor(num * multiplier);
      }

      function getTotalCommentCount() {
        const allElements = document.querySelectorAll(
          '[role="button"] span, span, a'
        );
        for (const el of allElements) {
          const text = el.textContent.trim();
          
          // English: "56 Comments", "2.4K Comments"
          let match = text.match(/^([\d[٠-٩],\.\sKMkm]+)\s*(تعليق|كۆمێنت|تێبینی|لێدوان|comments?|comment)/i);
          if (match) {
            let numStr = match[1].replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
            return parseK_M(numStr);
          }
          
          // Reverse formats: "تێبینی ٥٦" or "56K تعليق"
          match = text.match(/(تعليق|كۆمێنت|تێبینی|لێدوان|comments?|comment)\s*([\d[٠-٩],\.\sKMkm]+)/i);
          if (match) {
            let numStr = match[2].replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
            return parseK_M(numStr);
          }
        }
        return 0;
      }

      const expectedTotal = getTotalCommentCount();
      console.log(`[FBCE] Expected total comments: ${expectedTotal}`);

      // Send progress update
      function sendProgress(msg) {
        window.postMessage({
          name: MSG_PREFIX_RECV + "expandProgress",
          payload: { message: msg },
        }, "*");
      }

      // -------- STEP 2: Click "All comments" filter --------
      async function clickAllCommentsFilter() {
        const allElements = document.querySelectorAll(
          '[role="button"] span, [role="menuitem"] span, span[dir="auto"]'
        );
        
        // First try to find and click the filter dropdown
        for (const el of allElements) {
          const text = el.textContent.trim().toLowerCase();
          if (
            text === "most relevant" ||
            text === "newest" ||
            text.includes("most relevant") ||
            text === "الأكثر صلة" ||
            text === "پەیوەندیدارترین" ||
            text === "all comments" ||
            text === "جميع التعليقات" ||
            text === "هەموو تێبینییەکان"
          ) {
            const btn = el.closest('[role="button"]') || el;
            btn.click();
            console.log("[FBCE] Clicked comment filter dropdown");
            await new Promise((r) => setTimeout(r, 2000));
            break;
          }
        }

        // Now look for "All comments" option in the dropdown/menu
        await new Promise((r) => setTimeout(r, 1000));
        const menuItems = document.querySelectorAll(
          '[role="menuitem"], [role="menuitemradio"], [role="option"], [role="listbox"] [role="button"], div[role="dialog"] [role="button"] span, [role="menu"] span'
        );
        
        for (const item of menuItems) {
          const text = item.textContent.trim().toLowerCase();
          if (
            text === "all comments" ||
            text.includes("all comment") ||
            text === "جميع التعليقات" ||
            text === "هەموو تێبینییەکان" ||
            text === "هەموو لێدوانەکان"
          ) {
            const btn = item.closest('[role="menuitem"], [role="menuitemradio"], [role="option"], [role="button"]') || item;
            btn.click();
            console.log("[FBCE] ✅ Selected 'All comments' filter");
            sendProgress("'All comments' هەڵبژێردرا ✅");
            await new Promise((r) => setTimeout(r, 3000));
            return true;
          }
        }

        console.log("[FBCE] Could not find 'All comments' option, proceeding anyway");
        return false;
      }

      await clickAllCommentsFilter();

      sendProgress(`ژمارەی کۆمێنتەکان: ${expectedTotal || "نادیار"} — دەست بە فراوانکردن دەکەم...`);

      // -------- STEP 3: Keep clicking "View more" until all loaded --------
      function countVisibleComments() {
        return document.querySelectorAll('[role="article"]').length - 1; // minus the main post
      }

      async function clickMoreComments() {
        const allSpans = document.querySelectorAll(
          '[role="button"] span, a[role="button"]'
        );
        let found = false;

        for (const span of allSpans) {
          const text = span.textContent.toLowerCase();
          if (
            text.includes("view more comment") ||
            text.includes("see more comment") ||
            text.includes("more comment") ||
            text.includes("view all") ||
            text.includes("see all") ||
            text.includes("previous comment") ||
            text.includes("view more") ||
            text.includes("بینینی") || // Kurdish
            text.includes("زیاتر") || // Kurdish more
            text.includes("عرض") || // Arabic
            text.includes("المزيد") || // Arabic
            text.includes("مشاهدة المزيد")
          ) {
            const btn = span.closest('[role="button"]') || span;
            btn.click();
            clicked++;
            found = true;
            
            const visible = countVisibleComments();
            console.log(`[FBCE] Click #${clicked} — ${visible} comments visible now. Waiting 8s...`);
            sendProgress(`کلیک #${clicked} — ${visible} کۆمێنت بینرا لە ${expectedTotal || "?"} — ٨ چرکە وەستان...`);
            break;
          }
        }

        if (found && clicked < maxClicks) {
          // Wait 8 seconds for new comments to load
          await new Promise((r) => setTimeout(r, 8000));
          
          // Check if all comments are loaded
          const visible = countVisibleComments();
          if (expectedTotal > 0 && visible >= expectedTotal) {
            console.log(`[FBCE] ✅ All ${visible} comments loaded!`);
            sendProgress(`✅ هەموو ${visible} کۆمێنت لود بوون!`);
            return;
          }
          
          await clickMoreComments();
        }
      }

      await clickMoreComments();

      // -------- STEP 4: Expand all replies --------
      sendProgress("وەڵامەکان فراوان دەکرێن...");
      
      let replyClicks = 0;
      const replyButtons = document.querySelectorAll('[role="button"] span');
      for (const span of replyButtons) {
        const text = span.textContent.toLowerCase();
        if (
          text.includes("repl") ||
          text.includes("وەڵام") ||
          text.includes("رد") ||
          text.includes("view") && text.includes("repl")
        ) {
          const btn = span.closest('[role="button"]') || span;
          try {
            btn.click();
            replyClicks++;
            console.log(`[FBCE] Expanding replies #${replyClicks}, waiting 8s...`);
            sendProgress(`وەڵامی #${replyClicks} فراوان دەکرێت — ٨ چرکە وەستان...`);
            await new Promise((r) => setTimeout(r, 8000));
          } catch (e) {}
        }
      }

      const finalCount = countVisibleComments();
      console.log(`[FBCE] ✅ Done! ${finalCount} items visible, ${clicked} view-more clicks, ${replyClicks} reply expansions`);
      
      window.postMessage(
        {
          name: MSG_PREFIX_RECV + "expandComments",
          payload: { 
            clickCount: clicked, 
            replyClicks: replyClicks,
            visibleCount: finalCount,
            expectedTotal: expectedTotal
          },
        },
        "*"
      );
    }
  });

  console.log("[FBCE] Injected script loaded ✅");
})();
