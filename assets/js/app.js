const LOCAL_API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000/api"
    : "";
const API_BASE = (
  (window.__UEPP_CONFIG__?.apiBaseUrl || "").trim() ||
  (localStorage.getItem("uepp_api_base") || "").trim() ||
  LOCAL_API_BASE
).replace(/\/$/, "");

const TOKEN_KEY = "uepp_token";
const SEARCH_KEY = "uepp_search_query";
const THEME_KEY = "uepp_theme";
const LEGACY_KEYS = [
  "uepp_mode",
  "uepp_local_users",
  "uepp_local_current_user",
  "uepp_local_transactions",
  "uepp_local_uploads",
  "uepp_local_papers"
];

const state = {
  currentUser: null,
  access: null,
  papers: [],
  transactions: [],
  uploads: [],
  admin: null,
  referralCode: null
};

const get = (id) => document.getElementById(id);
const on = (el, event, handler) => {
  if (el) {
    el.addEventListener(event, handler);
  }
};

const elements = {
  signupName: get("signupName"),
  signupEmail: get("signupEmail"),
  signupStudent: get("signupStudent"),
  signupReferral: get("signupReferral"),
  signupPassword: get("signupPassword"),
  signupBtn: get("signupBtn"),
  loginId: get("loginId"),
  loginPassword: get("loginPassword"),
  loginBtn: get("loginBtn"),
  logoutBtn: get("logoutBtn"),
  accessStatus: get("accessStatus"),
  accessDetails: get("accessDetails"),
  heroStatus: get("heroStatus"),
  renewalNotice: get("renewalNotice"),
  metricAccess: get("metricAccess"),
  metricPapers: get("metricPapers"),
  transactionList: get("transactionList"),
  payBtn: get("payBtn"),
  mpesaPhone: get("mpesaPhone"),
  searchInput: get("searchInput"),
  librarySearchBtn: get("librarySearchBtn"),
  clearFiltersBtn: get("clearFiltersBtn"),
  navSearch: get("navSearch"),
  navSearchBtn: get("navSearchBtn"),
  navSearchForm: get("navSearchForm"),
  navToggle: get("navToggle"),
  mobileNav: get("mobileNav"),
  courseFilter: get("courseFilter"),
  yearFilter: get("yearFilter"),
  typeFilter: get("typeFilter"),
  papersGrid: get("papersGrid"),
  resultCount: get("resultCount"),
  viewerModal: get("viewerModal"),
  viewerTitle: get("viewerTitle"),
  viewerMeta: get("viewerMeta"),
  viewerFrame: get("viewerFrame"),
  closeViewer: get("closeViewer"),
  toast: get("toast"),
  profileStatus: get("profileStatus"),
  profileDetails: get("profileDetails"),
  trialEnd: get("trialEnd"),
  subEnd: get("subEnd"),
  bonusDays: get("bonusDays"),
  accessUntil: get("accessUntil"),
  uploadTitle: get("uploadTitle"),
  uploadCourse: get("uploadCourse"),
  uploadCourseName: get("uploadCourseName"),
  uploadYear: get("uploadYear"),
  uploadType: get("uploadType"),
  uploadFile: get("uploadFile"),
  uploadBtn: get("uploadBtn"),
  uploadBonus: get("uploadBonus"),
  referralProgress: get("referralProgress"),
  referralCode: get("referralCode"),
  copyReferralBtn: get("copyReferralBtn"),
  myUploads: get("myUploads"),
  adminActiveSubs: get("adminActiveSubs"),
  adminReferrals: get("adminReferrals"),
  adminMostViewed: get("adminMostViewed"),
  adminUploads: get("adminUploads"),
  currentBlobUrl: null
};

function clearLegacyDemoData() {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function humanizeStatus(value) {
  if (!value) return "-";
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function ensureApiConfigured() {
  if (API_BASE) return;
  throw new Error(
    "API base URL is not configured. Set FRONTEND_API_BASE for Vercel or uepp_api_base in localStorage."
  );
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function clearSession() {
  setToken(null);
  state.currentUser = null;
  state.access = null;
  state.transactions = [];
  state.uploads = [];
  state.admin = null;
  state.referralCode = null;
}

async function apiFetch(path, options = {}) {
  ensureApiConfigured();

  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearSession();
    updateUI();
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || response.statusText);
  }

  return payload;
}

async function apiBlob(path) {
  ensureApiConfigured();
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      message = payload?.error || message;
    } catch (error) {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return response.blob();
}

function loadSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  const stored = query !== null ? query : localStorage.getItem(SEARCH_KEY) || "";
  if (query !== null) {
    localStorage.setItem(SEARCH_KEY, query);
  }
  if (elements.searchInput) {
    elements.searchInput.value = stored;
  }
  if (elements.navSearch) {
    elements.navSearch.value = stored;
  }
}

const debouncedRenderLibrary = debounce(() => renderLibrary(), 250);

function syncSearch(value) {
  localStorage.setItem(SEARCH_KEY, value);
  if (elements.searchInput) {
    elements.searchInput.value = value;
  }
  if (elements.navSearch) {
    elements.navSearch.value = value;
  }
  debouncedRenderLibrary();
}

function normalizeSearchTerm(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactSearchTerm(value) {
  return normalizeSearchTerm(value).replace(/\s+/g, "");
}

function buildSearchSuggestions() {
  const listId = "courseSuggestions";
  let datalist = document.getElementById(listId);
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = listId;
    document.body.appendChild(datalist);
  }

  const suggestions = new Set();
  state.papers.forEach((paper) => {
    [paper.courseName, paper.unitName, paper.courseCode].forEach((value) => {
      if (value) suggestions.add(value);
    });
  });

  datalist.innerHTML = "";
  Array.from(suggestions)
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      datalist.appendChild(option);
    });

  if (elements.navSearch) elements.navSearch.setAttribute("list", listId);
  if (elements.searchInput) elements.searchInput.setAttribute("list", listId);
}

function clearAllFilters() {
  if (elements.searchInput) elements.searchInput.value = "";
  if (elements.navSearch) elements.navSearch.value = "";
  localStorage.setItem(SEARCH_KEY, "");
  if (elements.courseFilter) elements.courseFilter.value = "";
  if (elements.yearFilter) elements.yearFilter.value = "";
  if (elements.typeFilter) elements.typeFilter.value = "";
  const currentPath = window.location.pathname.split("/").pop() || "";
  if (currentPath === "library.html") {
    window.history.replaceState({}, "", "library.html");
  }
  renderLibrary();
}

function performNavSearch() {
  if (!elements.navSearch) return;
  const value = elements.navSearch.value.trim();
  syncSearch(value);
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  if (currentPath !== "library.html") {
    window.location.href = value ? `library.html?q=${encodeURIComponent(value)}` : "library.html";
    return;
  }
  window.history.replaceState({}, "", value ? `library.html?q=${encodeURIComponent(value)}` : "library.html");
}

function performLibrarySearch() {
  if (!elements.searchInput) return;
  syncSearch(elements.searchInput.value.trim());
}

async function fetchMe() {
  if (!getToken()) {
    state.currentUser = null;
    state.access = null;
    return;
  }

  try {
    const data = await apiFetch("/auth/me");
    state.currentUser = data.user;
    state.access = data.access;
  } catch (error) {
    clearSession();
    showToast("Session expired. Please login again.");
  }
}

async function fetchPapers() {
  try {
    const data = await apiFetch("/papers");
    state.papers = data.papers || [];
  } catch (error) {
    state.papers = [];
    showToast(error.message || "Unable to load papers.");
  }
}

async function fetchTransactions() {
  if (!getToken() || !elements.transactionList) return;
  try {
    const data = await apiFetch("/transactions/my");
    state.transactions = data.transactions || [];
  } catch (error) {
    state.transactions = [];
  }
}

async function fetchUploads() {
  if (!getToken() || !elements.myUploads) return;
  try {
    const data = await apiFetch("/uploads/my");
    state.uploads = data.uploads || [];
  } catch (error) {
    state.uploads = [];
  }
}

async function fetchAdmin() {
  if (!getToken() || !elements.adminActiveSubs || state.currentUser?.role !== "admin") return;
  try {
    const data = await apiFetch("/admin/metrics");
    state.admin = data;
  } catch (error) {
    state.admin = null;
  }
}

async function fetchReferralCode() {
  if (!getToken() || !elements.referralCode) return;
  try {
    const data = await apiFetch("/referrals/code");
    state.referralCode = data.code;
  } catch (error) {
    state.referralCode = null;
  }
}

async function signUp() {
  const name = elements.signupName?.value.trim() || "";
  const email = elements.signupEmail?.value.trim() || "";
  const studentId = elements.signupStudent?.value.trim() || "";
  const referralCode = elements.signupReferral?.value.trim() || "";
  const password = elements.signupPassword?.value.trim() || "";

  if (!name || !email || !studentId || !password) {
    showToast("Please fill in all signup fields.");
    return;
  }

  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, studentId, password, referralCode: referralCode || null })
    });
    setToken(data.token);
    await fetchMe();
    await fetchReferralCode();
    showToast("Welcome! Your 7-day trial starts now.");
    updateUI();
  } catch (error) {
    showToast(error.message || "Signup failed.");
  }
}

async function login() {
  const id = elements.loginId?.value.trim() || "";
  const password = elements.loginPassword?.value.trim() || "";
  if (!id || !password) {
    showToast("Enter your login details.");
    return;
  }

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ id, password })
    });
    setToken(data.token);
    await fetchMe();
    await fetchReferralCode();
    await fetchTransactions();
    await fetchUploads();
    await fetchAdmin();
    showToast("Logged in successfully.");
    updateUI();
  } catch (error) {
    showToast(error.message || "Login failed.");
  }
}

function logout() {
  clearSession();
  updateUI();
  showToast("Logged out.");
}

function hasActiveAccess() {
  return Boolean(state.access?.active);
}

async function paySubscription() {
  if (!getToken()) {
    showToast("Please login first.");
    return;
  }

  const phone = elements.mpesaPhone?.value.trim() || "";
  if (!phone) {
    showToast("Enter your M-Pesa phone number.");
    return;
  }

  try {
    await apiFetch("/subscriptions/mpesa", {
      method: "POST",
      body: JSON.stringify({ phoneNumber: phone })
    });
    showToast("STK push sent. Approve the payment on your phone.");
    await fetchTransactions();
    await fetchMe();
    updateUI();
  } catch (error) {
    showToast(error.message || "Payment failed.");
  }
}

function renderTransactions() {
  if (!elements.transactionList) return;
  if (!getToken()) {
    elements.transactionList.textContent = "Login to see transactions.";
    return;
  }
  if (state.transactions.length === 0) {
    elements.transactionList.textContent = "No transactions yet.";
    return;
  }

  elements.transactionList.innerHTML = state.transactions
    .slice(0, 4)
    .map((txn) => `
      <div style="margin-bottom:8px;">
        <div><strong>${txn.amount} Ksh</strong> - ${humanizeStatus(txn.status)}</div>
        <div style="font-size:12px; color: rgba(14, 27, 22, 0.6);">${formatDate(txn.createdAt)} via ${txn.method}</div>
      </div>
    `)
    .join("");
}

function fillSelect(select, placeholder, options) {
  select.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    select.appendChild(el);
  });
}

function buildFilters() {
  if (!elements.courseFilter || !elements.yearFilter || !elements.typeFilter) return;

  const courses = Array.from(new Set(state.papers.map((paper) => paper.courseName).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  const years = Array.from(new Set(state.papers.map((paper) => paper.year).filter(Boolean)))
    .sort((a, b) => Number(b) - Number(a));
  const examTypes = Array.from(new Set(state.papers.map((paper) => paper.examType).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  fillSelect(elements.courseFilter, "All courses", courses);
  fillSelect(elements.yearFilter, "All years", years);
  fillSelect(elements.typeFilter, "All exam types", examTypes);
}

function renderLibrary() {
  if (!elements.papersGrid || !elements.resultCount) return;

  const rawSearch = (elements.searchInput?.value || localStorage.getItem(SEARCH_KEY) || "").trim();
  const search = normalizeSearchTerm(rawSearch);
  const searchCompact = search.replace(/\s+/g, "");
  const filters = {
    course: elements.courseFilter?.value || "",
    year: elements.yearFilter?.value || "",
    type: elements.typeFilter?.value || ""
  };
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const filtered = state.papers.filter((paper) => {
    if (search) {
      const parts = [paper.courseName, paper.unitName, paper.courseCode].filter(Boolean);
      const searchable = parts.map((value) => normalizeSearchTerm(value)).join(" ");
      const searchableCompact = parts.map((value) => compactSearchTerm(value)).join("");
      if (!searchable.includes(search) && !searchableCompact.includes(searchCompact)) {
        return false;
      }
    }
    if (filters.course && paper.courseName !== filters.course) return false;
    if (filters.year && String(paper.year) !== String(filters.year)) return false;
    if (filters.type && paper.examType !== filters.type) return false;
    return true;
  });

  const queryLabel = rawSearch ? ` for "${rawSearch}"` : "";
  const filterLabel = activeFilters ? ` | ${activeFilters} filter${activeFilters === 1 ? "" : "s"} active` : "";
  elements.resultCount.textContent = `${filtered.length} papers${queryLabel}${filterLabel}`;

  if (filtered.length === 0) {
    const helper = state.papers.length === 0
      ? "No papers have been published yet."
      : activeFilters
        ? "Try clearing filters or adjusting your search."
        : "Try a different unit name.";

    elements.papersGrid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <p style="font-size: 1.2rem; color: var(--text-muted);">No papers found matching your search criteria.</p>
        <p class="search-hint" style="margin-bottom: 1.5rem;">${helper}</p>
        <div style="display:flex; gap: 12px; justify-content:center; flex-wrap: wrap;">
          <button class="btn btn-browse" type="button" onclick="clearAllFilters()">Clear Filters</button>
          <button class="btn btn-ghost" type="button" onclick="syncSearch('')">Clear Search</button>
        </div>
      </div>
    `;
    return;
  }

  elements.papersGrid.innerHTML = filtered
    .map((paper, index) => {
      const locked = !hasActiveAccess();
      const examLabel = `${paper.examType || ""} ${paper.year || ""}`.trim();
      const subtitle = [paper.courseName || "", examLabel].filter(Boolean).join(" | ");
      return `
        <div class="card paper-card reveal" style="transition-delay: ${index * 0.05}s">
          ${locked ? '<div class="lock">Locked</div>' : ""}
          <h3>${paper.courseCode || ""} - ${paper.unitName || ""}</h3>
          <p>${subtitle}</p>
          <div class="paper-meta">${paper.views || 0} views</div>
          <button class="btn btn-open" type="button" onclick="openViewer('${paper.id}')">Open Paper</button>
        </div>
      `;
    })
    .join("");
}

async function openViewer(paperId) {
  if (!elements.viewerModal || !elements.viewerFrame) return;
  if (!hasActiveAccess()) {
    showToast("Start your trial or subscribe to open papers.");
    return;
  }

  try {
    const paper = state.papers.find((item) => item.id === paperId);
    if (elements.currentBlobUrl) {
      URL.revokeObjectURL(elements.currentBlobUrl);
    }

    const blob = await apiBlob(`/papers/${paperId}/stream`);
    if (paper) {
      paper.views = (paper.views || 0) + 1;
    }

    elements.currentBlobUrl = URL.createObjectURL(blob);
    if (elements.viewerTitle && paper) {
      elements.viewerTitle.textContent = `${paper.courseCode} ${paper.examType}`;
    }
    if (elements.viewerMeta && paper) {
      elements.viewerMeta.textContent = `${paper.courseName || ""} | ${paper.year}`;
    }
    elements.viewerFrame.src = `${elements.currentBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`;
    elements.viewerModal.style.display = "flex";
    setTimeout(() => {
      elements.viewerModal.style.opacity = "1";
    }, 10);
    elements.viewerModal.setAttribute("aria-hidden", "false");
  } catch (error) {
    showToast(error.message || "Unable to open paper.");
  }
}

function closeViewer() {
  if (!elements.viewerModal || !elements.viewerFrame) return;
  elements.viewerModal.style.opacity = "0";
  elements.viewerModal.style.display = "none";
  elements.viewerModal.setAttribute("aria-hidden", "true");
  elements.viewerFrame.src = "";
  if (elements.currentBlobUrl) {
    URL.revokeObjectURL(elements.currentBlobUrl);
    elements.currentBlobUrl = null;
  }
}

function clearUploadForm() {
  if (elements.uploadTitle) elements.uploadTitle.value = "";
  if (elements.uploadCourse) elements.uploadCourse.value = "";
  if (elements.uploadCourseName) elements.uploadCourseName.value = "";
  if (elements.uploadYear) elements.uploadYear.value = "";
  if (elements.uploadType) elements.uploadType.value = "";
  if (elements.uploadFile) elements.uploadFile.value = "";
}

async function submitUpload() {
  if (!getToken()) {
    showToast("Login to upload papers.");
    return;
  }

  const title = elements.uploadTitle?.value.trim() || "";
  const course = elements.uploadCourse?.value.trim() || "";
  const courseName = elements.uploadCourseName?.value.trim() || "";
  const year = elements.uploadYear?.value.trim() || "";
  const type = elements.uploadType?.value.trim() || "";
  const file = elements.uploadFile?.files?.[0];

  if (!title || !course || !courseName || !year || !type || !file) {
    showToast("Please fill all required fields and attach a PDF.");
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("courseCode", course);
  formData.append("courseName", courseName);
  formData.append("year", year);
  formData.append("examType", type);
  formData.append("file", file);

  try {
    await apiFetch("/uploads", { method: "POST", body: formData });
    showToast("Upload submitted for approval.");
    clearUploadForm();
    await fetchUploads();
    await fetchAdmin();
    updateUI();
  } catch (error) {
    showToast(error.message || "Upload failed.");
  }
}

async function copyReferralCode() {
  if (!state.referralCode) {
    showToast("No referral code available.");
    return;
  }

  try {
    await navigator.clipboard.writeText(state.referralCode);
    showToast("Referral code copied.");
  } catch (error) {
    showToast("Copy failed. You can select the code manually.");
  }
}

function renderUploads() {
  if (!elements.myUploads) return;
  if (!getToken()) {
    elements.myUploads.textContent = "Login to track uploads.";
    return;
  }
  if (state.uploads.length === 0) {
    elements.myUploads.textContent = "No uploads yet.";
    return;
  }

  elements.myUploads.innerHTML = state.uploads
    .map((upload) => `
      <div style="margin-bottom:8px;">
        <strong>${upload.title}</strong>
        <div style="font-size:12px; color: rgba(14, 27, 22, 0.6);">${humanizeStatus(upload.status)} - ${formatDate(upload.createdAt)}</div>
      </div>
    `)
    .join("");
}

function renderAdmin() {
  if (!elements.adminActiveSubs || !elements.adminReferrals || !elements.adminMostViewed || !elements.adminUploads) return;
  if (state.currentUser?.role !== "admin") {
    elements.adminActiveSubs.textContent = "0";
    elements.adminReferrals.textContent = "0";
    elements.adminMostViewed.textContent = "Admin account required.";
    elements.adminUploads.textContent = "Admin account required.";
    return;
  }
  if (!state.admin) {
    elements.adminActiveSubs.textContent = "0";
    elements.adminReferrals.textContent = "0";
    elements.adminMostViewed.textContent = "No data yet.";
    elements.adminUploads.textContent = "No uploads waiting approval.";
    return;
  }

  elements.adminActiveSubs.textContent = state.admin.activeSubscriptions || 0;
  elements.adminReferrals.textContent = state.admin.totalReferrals || 0;
  elements.adminMostViewed.innerHTML = (state.admin.mostViewed || [])
    .map((paper) => `<div style="margin-bottom:6px;">${paper.courseCode} - ${paper.views} views</div>`)
    .join("") || "No data yet.";

  if (!state.admin.pendingUploads || state.admin.pendingUploads.length === 0) {
    elements.adminUploads.textContent = "No uploads waiting approval.";
    return;
  }

  elements.adminUploads.innerHTML = state.admin.pendingUploads
    .map((upload) => `
      <div style="margin-bottom:12px;">
        <strong>${upload.title}</strong> (${upload.courseCode})
        <div style="font-size:12px; color: rgba(14, 27, 22, 0.6);">Submitted ${formatDate(upload.createdAt)}</div>
        <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-approve" type="button" onclick="approveUpload('${upload.id}')">Approve</button>
          <button class="btn btn-reject" type="button" onclick="rejectUpload('${upload.id}')">Reject</button>
        </div>
      </div>
    `)
    .join("");
}

async function approveUpload(uploadId) {
  try {
    await apiFetch(`/admin/uploads/${uploadId}/approve`, { method: "PATCH" });
    showToast("Upload approved.");
    await fetchAdmin();
    await fetchPapers();
    await fetchUploads();
    buildFilters();
    renderLibrary();
    renderAdmin();
  } catch (error) {
    showToast(error.message || "Approval failed.");
  }
}

async function rejectUpload(uploadId) {
  try {
    await apiFetch(`/admin/uploads/${uploadId}/reject`, { method: "PATCH" });
    showToast("Upload rejected.");
    await fetchAdmin();
    await fetchUploads();
    renderAdmin();
    renderUploads();
  } catch (error) {
    showToast(error.message || "Rejection failed.");
  }
}

function updateUI() {
  const user = state.currentUser;
  const access = state.access || { active: false, daysLeft: 0, accessEndsAt: null };
  const hasUser = Boolean(user);

  if (elements.metricPapers) {
    elements.metricPapers.textContent = state.papers.length;
  }
  if (elements.metricAccess) {
    elements.metricAccess.textContent = access.daysLeft || 0;
  }

  if (elements.heroStatus) {
    elements.heroStatus.textContent = hasUser
      ? `Welcome back, ${user.name}. Your access updates are ready.`
      : "Create an account to unlock your free trial and subscription tools.";
  }

  if (elements.accessStatus) {
    if (!hasUser) {
      elements.accessStatus.textContent = "Not logged in";
      elements.accessStatus.className = "status";
    } else {
      elements.accessStatus.textContent = access.active ? `Active - ${access.daysLeft} days left` : "Expired";
      elements.accessStatus.className = access.active ? "status active" : "status expired";
    }
  }

  if (elements.accessDetails) {
    elements.accessDetails.textContent = hasUser
      ? access.accessEndsAt
        ? `Access until ${formatDate(access.accessEndsAt)}`
        : "No access active."
      : "Sign up to activate your 7-day free trial.";
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.style.display = hasUser ? "inline-flex" : "none";
  }

  if (elements.renewalNotice) {
    if (access.active && access.daysLeft <= 3) {
      elements.renewalNotice.style.display = "block";
      elements.renewalNotice.textContent = `Reminder: Your access expires in ${access.daysLeft} days. Renew now to stay active.`;
    } else {
      elements.renewalNotice.style.display = "none";
    }
  }

  if (elements.profileStatus) {
    elements.profileStatus.textContent = hasUser
      ? access.active
        ? `Active - ${access.daysLeft} days left`
        : "Expired"
      : "Not logged in";
    elements.profileStatus.className = hasUser ? (access.active ? "status active" : "status expired") : "status";
  }

  if (elements.profileDetails) {
    elements.profileDetails.textContent = hasUser ? `Account: ${user.email}` : "Login to see your trial and subscription dates.";
  }

  if (elements.trialEnd) elements.trialEnd.textContent = hasUser ? formatDate(user.trialEndsAt) : "-";
  if (elements.subEnd) elements.subEnd.textContent = hasUser ? formatDate(user.subscriptionEndsAt) : "-";
  if (elements.bonusDays) elements.bonusDays.textContent = hasUser ? user.bonusDays : 0;
  if (elements.accessUntil) elements.accessUntil.textContent = hasUser ? formatDate(access.accessEndsAt) : "-";
  if (elements.uploadBonus) elements.uploadBonus.textContent = hasUser ? user.bonusDays : 0;
  if (elements.referralProgress) elements.referralProgress.textContent = hasUser ? user.referralProgress : 0;
  if (elements.referralCode) elements.referralCode.textContent = state.referralCode || "-";

  renderTransactions();
  renderLibrary();
  renderUploads();
  renderAdmin();
  buildSearchSuggestions();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  syncThemeToggle(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  syncThemeToggle(next);
}

function syncThemeToggle(theme) {
  const btn = get("themeToggle");
  if (!btn) return;

  const isDark = theme === "dark";
  btn.textContent = isDark ? "\u2600" : "\u263E";
  btn.setAttribute("title", isDark ? "Switch to Light Mode" : "Switch to Dark Mode");
  btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function setMobileNav(isOpen) {
  if (!elements.mobileNav || !elements.navToggle) return;
  elements.mobileNav.classList.toggle("open", isOpen);
  elements.navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function setActiveNavLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".primary-nav a, .mobile-nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });
}

function wireEvents() {
  on(elements.signupBtn, "click", signUp);
  on(elements.loginBtn, "click", login);
  on(elements.logoutBtn, "click", logout);
  on(elements.payBtn, "click", paySubscription);
  on(elements.uploadBtn, "click", submitUpload);
  on(elements.closeViewer, "click", closeViewer);
  on(elements.searchInput, "input", (event) => syncSearch(event.target.value));
  on(elements.searchInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      performLibrarySearch();
    }
  });
  on(elements.navSearch, "input", (event) => syncSearch(event.target.value));
  on(elements.navSearchForm, "submit", (event) => {
    event.preventDefault();
    performNavSearch();
  });
  on(elements.navSearch, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      performNavSearch();
    }
  });
  on(elements.navSearch, "search", performNavSearch);
  on(elements.navSearchBtn, "click", performNavSearch);
  on(elements.librarySearchBtn, "click", performLibrarySearch);
  on(elements.clearFiltersBtn, "click", clearAllFilters);
  on(elements.courseFilter, "change", renderLibrary);
  on(elements.yearFilter, "change", renderLibrary);
  on(elements.typeFilter, "change", renderLibrary);
  on(elements.copyReferralBtn, "click", copyReferralCode);
  on(get("themeToggle"), "click", toggleTheme);
  on(elements.navToggle, "click", () => {
    const isOpen = elements.mobileNav?.classList.contains("open");
    setMobileNav(!isOpen);
  });

  if (elements.uploadCourse) {
    on(elements.uploadCourse, "input", () => {
      elements.uploadCourse.value = elements.uploadCourse.value.toUpperCase();
      const code = elements.uploadCourse.value.replace(/\s+/g, "");
      const match = state.papers.find((paper) => (paper.courseCode || "").replace(/\s+/g, "") === code);
      if (match && elements.uploadCourseName && !elements.uploadCourseName.value) {
        elements.uploadCourseName.value = match.courseName;
      }
    });
  }

  if (elements.uploadYear) {
    elements.uploadYear.max = new Date().getFullYear();
    elements.uploadYear.min = 2000;
  }

  if (elements.mobileNav) {
    elements.mobileNav.querySelectorAll("a").forEach((link) => on(link, "click", () => setMobileNav(false)));
  }

  document.addEventListener("click", (event) => {
    if (!elements.mobileNav || !elements.navToggle) return;
    if (!elements.mobileNav.classList.contains("open")) return;
    if (elements.mobileNav.contains(event.target) || elements.navToggle.contains(event.target)) return;
    setMobileNav(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileNav(false);
      if (elements.viewerModal?.style.display === "flex") {
        closeViewer();
      }
    }
  });

  document.querySelectorAll(".toggle-password").forEach((btn) => {
    on(btn, "click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = get(targetId);
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "Hide";
      } else {
        input.type = "password";
        btn.textContent = "Show";
      }
    });
  });

  if (elements.viewerModal) {
    on(elements.viewerModal, "click", (event) => {
      if (event.target === elements.viewerModal) closeViewer();
    });
    document.addEventListener("contextmenu", (event) => {
      if (elements.viewerModal.style.display === "flex") {
        event.preventDefault();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (
        elements.viewerModal.style.display === "flex" &&
        (event.ctrlKey || event.metaKey) &&
        (event.key === "s" || event.key === "p")
      ) {
        event.preventDefault();
      }
    });
  }
}

function initReveal() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

async function bootstrap() {
  clearLegacyDemoData();
  loadSearch();
  initTheme();
  setActiveNavLink();
  wireEvents();
  setTimeout(initReveal, 100);

  await fetchMe();
  await fetchPapers();
  buildFilters();
  await fetchTransactions();
  await fetchUploads();
  await fetchAdmin();
  await fetchReferralCode();
  updateUI();
}

window.openViewer = openViewer;
window.approveUpload = approveUpload;
window.rejectUpload = rejectUpload;
window.clearAllFilters = clearAllFilters;
window.syncSearch = syncSearch;

bootstrap();
