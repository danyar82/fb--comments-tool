document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const analyzeReplies = document.getElementById('analyzeReplies');
  const resultsContainer = document.getElementById('resultsContainer');
  const filesGrid = document.getElementById('filesGrid');
  const masterLeaderboard = document.getElementById('masterLeaderboard');
  let parsedFiles = []; // Array of objects: { name, rows }

  // ===== i18n =====
  let currentLang = 'ku';
  const i18n = {
      "ku": {
          langBtn: "EN",
          dir: "rtl",
          mainTitle: "شیکارکەری پێشکەوتووی CSV",
          mainSubtitle: "بەراوردکردن و شیکارکردنی چەندین فایل پێکەوە",
          dropZoneTitle: "فایلەکانی CSV لێرە دابنێ",
          dropZoneSubtitle: "یان کلیک بکە بۆ هەڵبژاردنی چەند فایلێک پێکەوە",
          analyzeReplies: "وەڵامەکانیش حیساب بکە (Replies)",
          masterTitle: "🏆 ڕیزبەندی گشتی (لە تەواوی فایلەکاندا)",
          comments: "کۆمێنت",
          files: "فایل",
          shareLink: "پێدانی لینک",
          exportCsv: "بە فایلی CSV",
          exportPdf: "خەزنکردن وەک PDF",
          noData: "هیچ داتایەک نییە",
          unknown: "(نەناسراو)",
          csvList: "لیست (List)",
          csvAuthor: "ناو (Author)",
          csvTotal: "کۆمێنت (Total)",
          csvGlobal: "ڕیزبەندی گشتی",
          csvTop10: " (Top 10)",
          shareError: "هیچ داتایەک نییە بۆ شەیرکردن",
          fetchingData: "...خەریکی هێنانی داتا (چاوەڕوان بە)",
          fetchingError: "لینکەکە کارناکات یان سڕاوەتەوە",
          fetchError: "سێرڤەری وەڵام ناداتەوە (Failed to fetch)",
          copied: "کۆپی کرا! ✔",
          shareSuccessAlert: "لینکەکە کۆپی کرا! ✔\nئێستا دەتوانیت بینێریت بۆ هەر کەسێک و لە هەر براوسەرێک کاردەکات."
      },
      "en": {
          langBtn: "KU",
          dir: "ltr",
          mainTitle: "Advanced CSV Analyzer",
          mainSubtitle: "Compare and analyze multiple files together",
          dropZoneTitle: "Drop CSV files here",
          dropZoneSubtitle: "Or click to select multiple files",
          analyzeReplies: "Count Replies",
          masterTitle: "🏆 Global Leaderboard (Across All Files)",
          comments: "Comments",
          files: "Files",
          shareLink: "Share Link",
          exportCsv: "Export CSV",
          exportPdf: "Save as PDF",
          noData: "No data available",
          unknown: "(Unknown)",
          csvList: "List",
          csvAuthor: "Author",
          csvTotal: "Total",
          csvGlobal: "Global Ranking",
          csvTop10: " (Top 10)",
          shareError: "No data to share",
          fetchingData: "Fetching data... (Please wait)",
          fetchingError: "Link is broken or data deleted",
          fetchError: "Failed to fetch",
          copied: "Copied! ✔",
          shareSuccessAlert: "Link copied! ✔\nYou can now share it with anyone."
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
      const langToggle = document.getElementById('langToggle');
      if (langToggle) langToggle.textContent = i18n[currentLang].langBtn;
      document.documentElement.dir = i18n[currentLang].dir;
      document.body.dir = i18n[currentLang].dir;

      document.getElementById('mainTitle').textContent = t('mainTitle');
      document.getElementById('mainSubtitle').textContent = t('mainSubtitle');

      const dropZoneTitle = document.querySelector('.upload-zone h2');
      if (dropZoneTitle) dropZoneTitle.textContent = t('dropZoneTitle');

      const dropZoneSubtitle = document.querySelector('.upload-zone p');
      if (dropZoneSubtitle) dropZoneSubtitle.textContent = t('dropZoneSubtitle');

      const toggleText = document.querySelector('.toggle-text');
      if (toggleText) toggleText.textContent = t('analyzeReplies');

      const masterTitle = document.querySelector('.master-card .card-header h2');
      if (masterTitle) masterTitle.textContent = t('masterTitle');

      const shareBtnText = document.getElementById('shareLinkBtn')?.lastChild;
      if (shareBtnText && shareBtnText.nodeType === 3) shareBtnText.textContent = ' ' + t('shareLink');

      const exportCsvBtnText = document.getElementById('exportMasterCsvBtn')?.lastChild;
      if (exportCsvBtnText && exportCsvBtnText.nodeType === 3) exportCsvBtnText.textContent = ' ' + t('exportCsv');

      const exportPdfBtnText = document.getElementById('exportPdfBtn')?.lastChild;
      if (exportPdfBtnText && exportPdfBtnText.nodeType === 3) exportPdfBtnText.textContent = ' ' + t('exportPdf');
      
      const statBadges = document.querySelectorAll('.master-card .stat-badge');
      if (statBadges.length >= 2) {
          statBadges[0].lastChild.textContent = ' ' + t('comments');
          statBadges[1].lastChild.textContent = ' ' + t('files');
      }

      if (parsedFiles.length > 0 || currentMasterSorted.length > 0) {
          renderResults();
      } else if (currentMasterSorted && currentMasterSorted.length > 0) {
          // If loaded from shared link
          renderMasterLeaderboard(currentMasterSorted, parseInt(document.getElementById('totalCommentsStat').textContent.replace(/,/g, '')) || 0, currentFilesSorted.length || parsedFiles.length);
      }
  }

  // Wait for chrome storage to sync language
  if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['fbceLang'], function(result) {
          if (result.fbceLang) currentLang = result.fbceLang;
          applyTranslation();
      });
  } else {
      currentLang = localStorage.getItem('fbceLang') || 'ku';
      applyTranslation();
  }
  
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
      langToggle.addEventListener('click', () => {
          currentLang = currentLang === 'ku' ? 'en' : 'ku';
          if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.local.set({fbceLang: currentLang});
          }
          localStorage.setItem('fbceLang', currentLang);
          applyTranslation();
      });
  }  // Drag and Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4361ee';
    dropZone.style.background = 'rgba(67, 97, 238, 0.1)';
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(100, 100, 255, 0.3)';
    dropZone.style.background = 'transparent';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(100, 100, 255, 0.3)';
    dropZone.style.background = 'transparent';
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) processFiles(e.target.files);
  });

  analyzeReplies.addEventListener('change', () => {
    if (parsedFiles.length > 0) renderResults();
  });

  function processFiles(files) {
    // Sort files by last modified date (oldest to newest)
    const sortedFiles = Array.from(files).sort((a, b) => a.lastModified - b.lastModified);

    const promises = sortedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          resolve({
            name: file.name,
            rows: parseCSV(text)
          });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(promises).then(results => {
      parsedFiles = parsedFiles.concat(results); // append
      renderResults();
    });
  }

  // Robust CSV parser to handle newlines inside quotes
  function parseCSV(text) {
    const result = [];
    let inQuotes = false;
    let row = [];
    let currentVal = '';
    
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1);
    }
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i+1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentVal += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(currentVal);
            currentVal = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            if (char === '\r') i++; // skip \n
            row.push(currentVal);
            if (row.length >= 7 && row[0] !== "ناو (Author)" && row[0] !== "Author") {
                result.push(processRow(row));
            }
            row = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    
    if (currentVal !== '' || row.length > 0) {
        row.push(currentVal);
        if (row.length >= 7 && row[0] !== "ناو (Author)" && row[0] !== "Author") {
            result.push(processRow(row));
        }
    }
    
    return result;
  }

  function processRow(row) {
    return {
        author: row[0] ? row[0].trim() : t('unknown'),
        text: row[1],
        isReply: row[4] ? row[4].trim() === "بەڵێ" || row[4].trim() === "Yes" || row[4].trim() === "yes" : false,
        authorUrl: row[6] ? row[6].trim() : ""
    };
  }

  let currentMasterSorted = [];
  let currentFilesSorted = []; // store each individual file's stats

  // Export buttons
  document.getElementById('exportPdfBtn').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('exportMasterCsvBtn').addEventListener('click', () => {
    if(currentMasterSorted.length === 0) return;
    
    // Create CSV string
    const headers = [t('csvList'), t('csvAuthor'), t('csvTotal')];
    
    // 1. Master rows
    const rows = currentMasterSorted.map(item => {
      const name = String(item.name || t('unknown')).replace(/"/g, '""');
      return `"${t('csvGlobal')}","${name}",${item.count}`;
    });

    // 2. Individual file rows
    currentFilesSorted.forEach(fileData => {
      fileData.sorted.forEach(item => {
         const listName = String(fileData.name).replace(/"/g, '""');
         const name = String(item.name || t('unknown')).replace(/"/g, '""');
         rows.push(`"${listName}${t('csvTop10')}","${name}",${item.count}`);
      });
    });
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FB_Analyzer_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function renderResults() {
    resultsContainer.classList.remove('hidden');
    const includeReplies = analyzeReplies.checked;
    
    // Master data
    const masterCounts = {}; // { id: { count, name, url } }
    let totalComments = 0;

    filesGrid.innerHTML = '';
    currentFilesSorted = []; // Reset before parsing

    // Process each individual file
    parsedFiles.forEach((file, index) => {
      const fileCounts = {};
      let fileTotal = 0;

      file.rows.forEach(row => {
        if (!includeReplies && row.isReply) return;
        
        let cleanUrl = row.authorUrl ? row.authorUrl.split('?')[0] : ""; 
        const id = row.author && row.author !== t('unknown') && row.author !== "(نەناسراو)" ? row.author : cleanUrl;
        
        if (!id) return;

        if(!fileCounts[id]) fileCounts[id] = { count: 0, name: row.author, url: row.authorUrl };
        fileCounts[id].count++;
        fileTotal++;

        if(!masterCounts[id]) masterCounts[id] = { count: 0, name: row.author, url: row.authorUrl };
        masterCounts[id].count++;
        totalComments++;
      });

      const fileSorted = Object.values(fileCounts).sort((a,b) => b.count - a.count).slice(0, 10);
      currentFilesSorted.push({ name: file.name, total: fileTotal, sorted: fileSorted });
      renderFileCard(file.name, fileTotal, fileSorted);
    });

    // Render Master Leaderboard
    const masterSorted = Object.values(masterCounts).sort((a,b) => b.count - a.count);
    currentMasterSorted = masterSorted; // Store globally for CSV export
    const top10Master = masterSorted.slice(0, 10);
    
    renderMasterLeaderboard(top10Master, totalComments, parsedFiles.length);
    renderChart(top10Master);
  }

  function renderChart(sortedData) {
    const chartContainer = document.getElementById('chartContainer');
    if (sortedData.length === 0) {
      chartContainer.innerHTML = '';
      return;
    }

    const maxCount = sortedData[0].count; // The first item has the highest count
    
    chartContainer.innerHTML = sortedData.map((item, index) => {
      // Calculate height percentage relative to highest count
      const heightPercent = Math.max((item.count / maxCount) * 100, 5); 
      // Delay animation slightly for a cool effect
      const name = item.name || t('unknown');
      
      return `
        <div class="chart-col">
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${heightPercent}%; animation: growUp 0.8s ease-out forwards; animation-delay: ${index * 0.05}s;" title="${name}: ${item.count}">
              <span class="chart-count">${item.count}</span>
            </div>
          </div>
          <span class="chart-label" title="${name}">${name}</span>
        </div>
      `;
    }).join("");
  }

  function generateRowsHTML(sortedData) {
    if(sortedData.length === 0) return `<p style="text-align:center;padding:15px;color:var(--text-muted)">${t('noData')}</p>`;
    
    const medals = ["🥇", "🥈", "🥉"];
    const rankClasses = ["gold", "silver", "bronze"];
    
    return sortedData.map((w, i) => {
        const rank = i < 3 ? medals[i] : `${i + 1}`;
        const rankClass = i < 3 ? rankClasses[i] : "";
        return `
          <div class="lb-row">
            <span class="lb-rank ${rankClass}">${rank}</span>
            <span class="lb-name"><a href="${w.url||'#'}" target="_blank" style="color:var(--text-primary);text-decoration:none;">${w.name||t('unknown')}</a></span>
            <span class="lb-count">${w.count}</span>
          </div>`;
    }).join("");
  }

  function renderFileCard(filename, totalComments, sortedData) {
    const safeName = filename.length > 30 ? filename.substring(0, 27) + "..." : filename;
    
    const section = document.createElement('section');
    section.className = 'result-card';
    section.innerHTML = `
      <div class="card-header">
        <h2 title="${filename}">📄 ${safeName}</h2>
        <div class="stat-badge">${totalComments} ${t('comments')}</div>
      </div>
      <div class="leaderboard-list">
        ${generateRowsHTML(sortedData)}
      </div>
    `;
    filesGrid.appendChild(section);
  }

  function renderMasterLeaderboard(sortedData, totalComments, numFiles) {
    document.getElementById('totalCommentsStat').textContent = totalComments.toLocaleString('en-US');
    document.getElementById('totalFilesStat').textContent = numFiles;
    document.getElementById('masterLeaderboard').innerHTML = generateRowsHTML(sortedData);
  }

  // ===== Share Link =====
  const VIEWER_BASE_URL = 'https://danyar82.github.io/fb--comments-tool/index.html';

  document.getElementById('shareLinkBtn')?.addEventListener('click', async () => {
    if(currentMasterSorted.length === 0) {
        alert(t('shareError'));
        return;
    }
    const btn = document.getElementById('shareLinkBtn');
    const originalText = btn.innerHTML;
    
    const btnText = btn.lastChild;
    if (btnText && btnText.nodeType === 3) btnText.textContent = ' ...';
    btn.disabled = true;

    try {
        const totalComments = parseInt(document.getElementById('totalCommentsStat').textContent.replace(/,/g, '')) || 0;
        const exportData = {
           t: totalComments,
           n: parsedFiles.length || currentFilesSorted.length,
           m: currentMasterSorted.slice(0, 15),
           f: currentFilesSorted.map(file => ({
               name: file.name,
               total: file.total,
               sorted: (file.sorted || []).slice(0, 15)
           }))
        };

        const res = await fetch('https://api.npoint.io/bins', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: JSON.stringify(exportData)
        });
        
        if (!res.ok) {
            const errStatus = res.status;
            throw new Error((t('fetchError') || 'Failed to fetch') + ' (Status: ' + errStatus + ')');
        }
        
        const resData = await res.json();
        const blobId = resData.key;

        if (blobId) {
            const shareUrl = VIEWER_BASE_URL + '?shared=' + blobId;
            await navigator.clipboard.writeText(shareUrl);
            btn.innerHTML = t('copied');
            setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 3000);
            
            alert(t('shareSuccessAlert'));
        } else {
            throw new Error('ID Error');
        }

    } catch(e) {
        alert('Error: ' + e.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
  });

  // ===== Load Shared Data on Init =====
  async function loadSharedData() {
      const urlParams = new URLSearchParams(window.location.search);
      const b64 = urlParams.get('d');
      const sharedId = urlParams.get('shared');
      
      const initializeFromData = (data) => {
          if (data && data.m) {
              document.querySelector('.upload-section').style.display = 'none';
              document.getElementById('resultsContainer').classList.remove('hidden');
              
              renderMasterLeaderboard(data.m, data.t, data.n);
              renderChart(data.m);
              
              const filesGrid = document.getElementById('filesGrid');
              filesGrid.innerHTML = '';
              if (data.f) {
                  data.f.forEach(f => {
                      renderFileCard(f.name, f.total || 0, f.sorted);
                  });
              }
              
              currentMasterSorted = data.m;
              currentFilesSorted = data.f || [];
          }
      };

      if (b64) {
          try {
              const safeB64 = b64.replace(/ /g, '+');
              const jsonStr = decodeURIComponent(escape(atob(safeB64)));
              const data = JSON.parse(jsonStr);
              initializeFromData(data);
          } catch(e) {}
      } else if (sharedId) {
          const dropZone = document.getElementById('dropZone');
          const dzTitle = dropZone?.querySelector('h2');
          if (dzTitle) dzTitle.innerText = t('fetchingData');
          
          try {
              let res = await fetch('https://api.npoint.io/' + sharedId);
              if (!res.ok) {
                  res = await fetch('https://jsonblob.com/api/jsonBlob/' + sharedId);
                  if (!res.ok) throw new Error(t('fetchingError'));
              }
              const data = await res.json();
              if (data.parsedFiles) {
                  parsedFiles = data.parsedFiles;
                  renderResults();
                  document.querySelector('.upload-section').style.display = 'none';
              } else {
                  initializeFromData(data);
              }
          } catch(e) {
              alert('هەڵە لە هێنانی داتا: ' + e.message);
          }
      }
  }

  loadSharedData();

});
