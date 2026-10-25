/**
 * Apollo Lead Extractor - Background Service Worker
 * Manages IndexedDB storage, native Chrome CSV file downloads, and badge telemetry.
 */

const DB_NAME = 'ApolloScraperDB';
const DB_VERSION = 2;
const STORE_NAME = 'leads';

// 1. Initialize IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 2. Save Leads to IndexedDB
async function saveLeads(leads = []) {
  if (!Array.isArray(leads) || leads.length === 0) return 0;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  let added = 0;
  for (const lead of leads) {
    if (lead && lead.id) {
      store.put(lead);
      added++;
    }
  }

  return new Promise((resolve) => {
    tx.oncomplete = () => {
      updateBadge();
      resolve(added);
    };
    tx.onerror = () => resolve(0);
  });
}

// 3. Get Lead Count
async function getLeadCount() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    return new Promise((resolve) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    });
  } catch (e) {
    return 0;
  }
}

// 4. Update Extension Badge Text
async function updateBadge() {
  const count = await getLeadCount();
  const text = count > 999 ? `${(count / 1000).toFixed(1)}k` : (count > 0 ? String(count) : '');
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
}

// 5. Message Listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'APOLLO_SAVE_BATCH') {
    saveLeads(msg.leads).then(count => {
      sendResponse({ saved: count });
    });
    return true;
  }

  if (msg.type === 'APOLLO_DOWNLOAD_CSV') {
    const rawCSV = msg.csv;
    const csvData = Array.isArray(rawCSV) ? rawCSV.join('') : (rawCSV || '');
    const filename = msg.filename || `apollo_leads_${Date.now()}.csv`;

    const blobUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      console.log('[Apollo Extractor] Download started with ID:', downloadId);
      sendResponse({ downloadId });
    });
    return true;
  }

  if (msg.type === 'GET_BACKGROUND_STATS') {
    getLeadCount().then(count => {
      sendResponse({ totalInDB: count });
    });
    return true;
  }

  if (msg.type === 'CLEAR_DB') {
    openDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => {
        updateBadge();
        sendResponse({ success: true });
      };
    });
    return true;
  }
});

// Update badge on startup
updateBadge();
