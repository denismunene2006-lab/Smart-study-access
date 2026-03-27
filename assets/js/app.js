const API_BASE = localStorage.getItem("uepp_api_base") || "http://localhost:4000/api";
const TOKEN_KEY = "uepp_token";
const SEARCH_KEY = "uepp_search_query";
const MODE_KEY = "uepp_mode";
const THEME_KEY = "uepp_theme";
const LOCAL_MODE = (localStorage.getItem(MODE_KEY) || "local") === "local";
const LOCAL_KEYS = {
  users: "uepp_local_users",
  currentUser: "uepp_local_current_user",
  transactions: "uepp_local_transactions",
  uploads: "uepp_local_uploads",
  papers: "uepp_local_papers"
};

const LOCAL_PAPERS_SEED = [
  {
    id: "civ101-2024-cat1",
    faculty: "Engineering",
    department: "Civil Engineering",
    courseCode: "CIV 101",
    courseName: "Statics",
    year: 2024,
    examType: "CAT 1",
    pages: 6,
    views: 124
  },
  {
    id: "eee202-2023-end",
    faculty: "Engineering",
    department: "Electrical Engineering",
    courseCode: "EEE 202",
    courseName: "Circuits II",
    year: 2023,
    examType: "End of Semester",
    pages: 9,
    views: 188
  },
  {
    id: "acc110-2022-end",
    faculty: "Business",
    department: "Accounting",
    courseCode: "ACC 110",
    courseName: "Financial Accounting",
    year: 2022,
    examType: "End of Semester",
    pages: 12,
    views: 142
  },
  {
    id: "edu210-2024-cat2",
    faculty: "Education",
    department: "Arts Education",
    courseCode: "EDU 210",
    courseName: "Curriculum Studies",
    year: 2024,
    examType: "CAT 2",
    pages: 7,
    views: 96
  },
  {
    id: "agr130-2023-end",
    faculty: "Agriculture",
    department: "Crop Science",
    courseCode: "AGR 130",
    courseName: "Plant Physiology",
    year: 2023,
    examType: "End of Semester",
    pages: 10,
    views: 105
  },
  {
    id: "nur240-2021-sup",
    faculty: "Health Sciences",
    department: "Nursing",
    courseCode: "NUR 240",
    courseName: "Community Health",
    year: 2021,
    examType: "Supplementary",
    pages: 8,
    views: 77
  },
  {
    id: "cs211-2024-end",
    faculty: "Computing",
    department: "Computer Science",
    courseCode: "CS 211",
    courseName: "Data Structures",
    year: 2024,
    examType: "End of Semester",
    pages: 11,
    views: 221
  },
  {
    id: "cs101-2022-cat1",
    faculty: "Computing",
    department: "Computer Science",
    courseCode: "CS 101",
    courseName: "Intro to Computing",
    year: 2022,
    examType: "CAT 1",
    pages: 5,
    views: 168
  }
];

const state = {
  users: [],
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
  facultyFilter: get("facultyFilter"),
  departmentFilter: get("departmentFilter"),
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
  uploadFaculty: get("uploadFaculty"),
  uploadDepartment: get("uploadDepartment"),
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
  demoUserBtn: get("demoUserBtn"),
  currentBlobUrl: null
};

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function computeLocalAccess(user) {
  if (!user) {
    return { active: false, daysLeft: 0, accessEndsAt: null };
  }
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const subEnd = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
  const base = !trialEnd && !subEnd ? null : trialEnd && subEnd ? (trialEnd > subEnd ? trialEnd : subEnd) : trialEnd || subEnd;
  if (!base) {
    return { active: false, daysLeft: 0, accessEndsAt: null };
  }
  const bonus = Number(user.bonusDays || 0);
  const accessEndsAt = addDays(base, bonus);
  const now = new Date();
  const diff = Math.ceil((accessEndsAt - now) / (1000 * 60 * 60 * 24));
  return {
    active: diff > 0,
    daysLeft: diff > 0 ? diff : 0,
    accessEndsAt
  };
}

function generateReferralCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function computeAdminLocal() {
  const activeSubscriptions = state.users.filter((user) => {
    if (!user.subscriptionEndsAt) return false;
    return new Date(user.subscriptionEndsAt) > new Date();
  }).length;
  const totalReferrals = state.users.reduce(
    (sum, user) => sum + (user.referralCycles || 0) * 3 + (user.referralProgress || 0),
    0
  );
  const mostViewed = [...state.papers]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3)
    .map((paper) => ({ courseCode: paper.courseCode, views: paper.views || 0 }));
  const pendingUploads = state.uploads
    .filter((upload) => upload.status === "Pending")
    .map((upload) => ({
      id: upload.id,
      title: upload.title,
      courseCode: upload.courseCode,
      createdAt: upload.createdAt
    }));

  return {
    activeSubscriptions,
    totalReferrals,
    mostViewed,
    pendingUploads
  };
}

function loadLocalState() {
  state.users = readLocal(LOCAL_KEYS.users, []);
  state.transactions = readLocal(LOCAL_KEYS.transactions, []);
  state.uploads = readLocal(LOCAL_KEYS.uploads, []);
  state.papers = readLocal(LOCAL_KEYS.papers, LOCAL_PAPERS_SEED);

  const currentId = localStorage.getItem(LOCAL_KEYS.currentUser);
  state.currentUser = state.users.find((user) => user.id === currentId) || null;
  state.access = computeLocalAccess(state.currentUser);
  state.referralCode = state.currentUser?.referralCode || null;
  state.admin = computeAdminLocal();
}

function saveLocalState() {
  writeLocal(LOCAL_KEYS.users, state.users);
  writeLocal(LOCAL_KEYS.transactions, state.transactions);
  writeLocal(LOCAL_KEYS.uploads, state.uploads);
  writeLocal(LOCAL_KEYS.papers, state.papers);
  if (state.currentUser) {
    localStorage.setItem(LOCAL_KEYS.currentUser, state.currentUser.id);
  } else {
    localStorage.removeItem(LOCAL_KEYS.currentUser);
  }
  state.access = computeLocalAccess(state.currentUser);
  state.referralCode = state.currentUser?.referralCode || null;
  state.admin = computeAdminLocal();
}

function getToken() {
  if (LOCAL_MODE) {
    return state.currentUser ? "local" : null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (LOCAL_MODE) {
    return;
  }
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function clearSession() {
  if (LOCAL_MODE) {
    state.currentUser = null;
    state.access = null;
    saveLocalState();
  } else {
    setToken(null);
    state.currentUser = null;
    state.access = null;
  }
}

async function apiFetch(path, options = {}) {
  if (LOCAL_MODE) {
    throw new Error("API is disabled in local mode.");
  }
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
    const message = payload?.error || payload?.message || response.statusText;
    throw new Error(message);
  }

  return payload;
}

async function apiBlob(path) {
  if (LOCAL_MODE) {
    throw new Error("API is disabled in local mode.");
  }
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      message = payload?.error || message;
    } catch (error) {
      // ignore json parse
    }
    throw new Error(message);
  }
  return await response.blob();
}

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function loadSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  const stored = query !== null ? query : (localStorage.getItem(SEARCH_KEY) || "");
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

function syncSearch(value) {
  localStorage.setItem(SEARCH_KEY, value);
  if (elements.searchInput) {
    elements.searchInput.value = value;
    renderLibrary();
  }
  if (elements.navSearch) {
    elements.navSearch.value = value;
  }
}

function normalizeSearchTerm(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clearAllFilters() {
  if (elements.searchInput) elements.searchInput.value = "";
  if (elements.navSearch) elements.navSearch.value = "";
  localStorage.setItem(SEARCH_KEY, "");
  if (elements.facultyFilter) elements.facultyFilter.value = "";
  if (elements.departmentFilter) elements.departmentFilter.value = "";
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
    const target = value ? `library.html?q=${encodeURIComponent(value)}` : "library.html";
    window.location.href = target;
    return;
  }
  const nextUrl = value ? `library.html?q=${encodeURIComponent(value)}` : "library.html";
  window.history.replaceState({}, "", nextUrl);
}

function performLibrarySearch() {
  if (!elements.searchInput) return;
  const value = elements.searchInput.value.trim();
  syncSearch(value);
}

async function fetchMe() {
  if (LOCAL_MODE) {
    loadLocalState();
    return;
  }
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
  if (LOCAL_MODE) {
    state.papers = readLocal(LOCAL_KEYS.papers, LOCAL_PAPERS_SEED);
    return;
  }
  try {
    const data = await apiFetch("/papers");
    state.papers = data.papers || [];
  } catch (error) {
    showToast("Unable to load papers.");
  }
}

async function fetchTransactions() {
  if (LOCAL_MODE) {
    state.transactions = readLocal(LOCAL_KEYS.transactions, []);
    return;
  }
  if (!getToken() || !elements.transactionList) return;
  try {
    const data = await apiFetch("/transactions/my");
    state.transactions = data.transactions || [];
  } catch (error) {
    state.transactions = [];
  }
}

async function fetchUploads() {
  if (LOCAL_MODE) {
    state.uploads = readLocal(LOCAL_KEYS.uploads, []);
    return;
  }
  if (!getToken() || !elements.myUploads) return;
  try {
    const data = await apiFetch("/uploads/my");
    state.uploads = data.uploads || [];
  } catch (error) {
    state.uploads = [];
  }
}

async function fetchAdmin() {
  if (LOCAL_MODE) {
    loadLocalState();
    return;
  }
  if (!getToken() || !elements.adminActiveSubs) return;
  try {
    const data = await apiFetch("/admin/metrics");
    state.admin = data;
  } catch (error) {
    state.admin = null;
  }
}

async function fetchReferralCode() {
  if (LOCAL_MODE) {
    state.referralCode = state.currentUser?.referralCode || null;
    return;
  }
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

  if (LOCAL_MODE) {
    loadLocalState();
    const exists = state.users.some((user) => user.email === email || user.studentId === studentId);
    if (exists) {
      showToast("Account already exists. Please login.");
      return;
    }

    const now = new Date();
    const user = {
      id: `user_${Math.random().toString(36).slice(2, 10)}`,
      name,
      email,
      studentId,
      password,
      role: "student",
      trialEndsAt: addDays(now, 7).toISOString(),
      subscriptionEndsAt: null,
      bonusDays: 0,
      referralProgress: 0,
      referralCycles: 0,
      referralCode: generateReferralCode(),
      createdAt: now.toISOString()
    };

    if (referralCode) {
      const referrer = state.users.find((u) => u.referralCode === referralCode);
      if (referrer) {
        referrer.referralProgress = (referrer.referralProgress || 0) + 1;
        if (referrer.referralProgress >= 3) {
          referrer.referralProgress = 0;
          referrer.referralCycles = (referrer.referralCycles || 0) + 1;
          referrer.bonusDays = (referrer.bonusDays || 0) + 7;
        }
      }
    }

    state.users.push(user);
    state.currentUser = user;
    saveLocalState();
    showToast("Welcome! Your 7-day trial starts now.");
    updateUI();
    return;
  }

  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        studentId,
        password,
        referralCode: referralCode || null
      })
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
  if (LOCAL_MODE) {
    loadLocalState();
    const user = state.users.find(
      (u) => (u.email === id || u.studentId === id) && u.password === password
    );
    if (!user) {
      showToast("Login failed. Check your details.");
      return;
    }
    state.currentUser = user;
    saveLocalState();
    showToast("Logged in successfully.");
    updateUI();
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
  if (LOCAL_MODE) {
    const now = new Date();
    const currentEnd = state.currentUser?.subscriptionEndsAt ? new Date(state.currentUser.subscriptionEndsAt) : null;
    const base = currentEnd && currentEnd > now ? currentEnd : now;
    const newEnd = addDays(base, 30);
    state.currentUser.subscriptionEndsAt = newEnd.toISOString();
    state.transactions.unshift({
      id: `txn_${Math.random().toString(36).slice(2, 10)}`,
      amount: 30,
      method: "M-Pesa (Local)",
      status: "Success",
      createdAt: now.toISOString()
    });
    saveLocalState();
    showToast("Payment recorded locally. Access extended by 30 days.");
    updateUI();
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
        <div><strong>${txn.amount} Ksh</strong> - ${txn.status}</div>
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
  if (!elements.facultyFilter || !elements.departmentFilter || !elements.courseFilter || !elements.yearFilter || !elements.typeFilter) {
    return;
  }
  const unique = (items) => Array.from(new Set(items)).sort();
  const faculties = unique(state.papers.map((p) => p.faculty));
  const departments = unique(state.papers.map((p) => p.department));
  const courses = unique(state.papers.map((p) => p.courseCode));
  const years = unique(state.papers.map((p) => p.year));
  const types = unique(state.papers.map((p) => p.examType));

  fillSelect(elements.facultyFilter, "All faculties", faculties);
  fillSelect(elements.departmentFilter, "All departments", departments);
  fillSelect(elements.courseFilter, "All courses", courses);
  fillSelect(elements.yearFilter, "All years", years);
  fillSelect(elements.typeFilter, "All exam types", types);
}

function renderLibrary() {
  if (!elements.papersGrid || !elements.resultCount) return;

  const rawSearch = (elements.searchInput?.value || localStorage.getItem(SEARCH_KEY) || "").trim();
  const search = normalizeSearchTerm(rawSearch);
  const filters = {
    faculty: elements.facultyFilter?.value || "",
    department: elements.departmentFilter?.value || "",
    course: elements.courseFilter?.value || "",
    year: elements.yearFilter?.value || "",
    type: elements.typeFilter?.value || ""
  };
  const activeFilters = Object.values(filters).filter(Boolean).length;

  const filtered = state.papers.filter((paper) => {
    if (search) {
      const searchable = [
        paper.courseName,
        paper.unitName,
        paper.courseCode
      ]
        .filter(Boolean)
        .map((value) => normalizeSearchTerm(value))
        .join(" ");
      if (!searchable.includes(search)) return false;
    }
    if (filters.faculty && paper.faculty !== filters.faculty) return false;
    if (filters.department && paper.department !== filters.department) return false;
    if (filters.course && paper.courseCode !== filters.course) return false;
    if (filters.year && String(paper.year) !== String(filters.year)) return false;
    if (filters.type && paper.examType !== filters.type) return false;
    return true;
  });

  const queryLabel = rawSearch ? ` for "${rawSearch}"` : "";
  const filterLabel = activeFilters ? ` • ${activeFilters} filter${activeFilters === 1 ? "" : "s"} active` : "";
  elements.resultCount.textContent = `${filtered.length} papers${queryLabel}${filterLabel}`;

  if (filtered.length === 0) {
    const helper = activeFilters
      ? "Try clearing filters or adjusting your search."
      : "Try a different course or unit name, or code.";
    elements.papersGrid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
        <p style="font-size: 1.2rem; color: var(--text-muted);">No papers found matching your search criteria.</p>
        <p class="search-hint" style="margin-bottom: 1.5rem;">${helper}</p>
        <div style="display:flex; gap: 12px; justify-content:center; flex-wrap: wrap;">
          <button class="btn btn-demo" type="button" onclick="clearAllFilters()">Clear Filters</button>
          <button class="btn btn-ghost" type="button" onclick="syncSearch('')">Clear Search</button>
        </div>
      </div>
    `;
    return;
  }

  elements.papersGrid.innerHTML = filtered
    .map((paper, index) => {
      const locked = !hasActiveAccess();
      return `
        <div class="card paper-card reveal" style="transition-delay: ${index * 0.05}s">
          ${locked ? '<div class="lock">Locked</div>' : ''}
          <div class="badge">${paper.faculty}</div>
          <h3>${paper.courseCode} - ${paper.courseName || ""}</h3>
          <p>${paper.department} | ${paper.examType} ${paper.year}</p>
          <div class="paper-meta">${paper.pages || ""} ${paper.pages ? "pages |" : ""} ${paper.views || 0} views</div>
          <button class="btn btn-open" type="button" onclick="openViewer('${paper.id}')">Open Paper</button>
        </div>
      `;
    })
    .join("");

  initReveal(); // Re-trigger animations for new elements
}

function escapePdf(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(text) {
  const safeText = escapePdf(text);
  const objects = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");
  const stream = `BT /F1 24 Tf 72 720 Td (${safeText}) Tj ET`;
  objects.push(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    const off = String(offsets[i]).padStart(10, "0");
    pdf += `${off} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

async function openViewer(paperId) {
  if (!elements.viewerModal || !elements.viewerFrame) return;
  if (!hasActiveAccess()) {
    showToast("Start your trial or subscribe to open papers.");
    return;
  }
  try {
    const paper = state.papers.find((p) => p.id === paperId);
    if (LOCAL_MODE && paper) {
      paper.views = (paper.views || 0) + 1;
      saveLocalState();
    }

    if (elements.currentBlobUrl) {
      URL.revokeObjectURL(elements.currentBlobUrl);
    }

    const blob = LOCAL_MODE
      ? buildPdf(`University of Embu Past Paper - ${paper?.courseCode || ""} ${paper?.examType || ""} ${paper?.year || ""}`)
      : await apiBlob(`/papers/${paperId}/stream`);
    
    elements.currentBlobUrl = URL.createObjectURL(blob);
    const url = elements.currentBlobUrl;

    if (elements.viewerTitle && paper) {
      elements.viewerTitle.textContent = `${paper.courseCode} ${paper.examType}`;
    }
    if (elements.viewerMeta && paper) {
      elements.viewerMeta.textContent = `${paper.courseName || ""} | ${paper.year} | ${paper.department}`;
    }
    elements.viewerFrame.src = `${url}#toolbar=0&navpanes=0&scrollbar=0`;
    elements.viewerModal.style.display = "flex";
    setTimeout(() => { elements.viewerModal.style.opacity = "1"; }, 10);
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
  if (elements.uploadFaculty) elements.uploadFaculty.value = "";
  if (elements.uploadDepartment) elements.uploadDepartment.value = "";
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
  const faculty = elements.uploadFaculty?.value.trim() || "";
  const department = elements.uploadDepartment?.value.trim() || "";
  const course = elements.uploadCourse?.value.trim() || "";
  const courseName = elements.uploadCourseName?.value.trim() || "";
  const year = elements.uploadYear?.value.trim() || "";
  const type = elements.uploadType?.value.trim() || "";
  const file = elements.uploadFile?.files?.[0];

  if (!title || !faculty || !department || !course || !year || !type || !file) {
    showToast("Fill all upload fields and attach the PDF.");
    return;
  }

  if (LOCAL_MODE) {
    const upload = {
      id: `upl_${Math.random().toString(36).slice(2, 10)}`,
      title,
      faculty,
      department,
      courseCode: course,
      courseName: courseName || "",
      year: Number(year),
      examType: type,
      status: "Pending",
      createdAt: new Date().toISOString(),
      uploaderId: state.currentUser?.id || null
    };
    state.uploads.unshift(upload);
    saveLocalState();
    showToast("Upload saved locally for approval.");
    clearUploadForm();
    updateUI();
    return;
  }

  const formData = new FormData();
  formData.append("title", title);
  formData.append("faculty", faculty);
  formData.append("department", department);
  formData.append("courseCode", course);
  formData.append("courseName", courseName);
  formData.append("year", year);
  formData.append("examType", type);
  formData.append("file", file);

  try {
    await apiFetch("/uploads", {
      method: "POST",
      body: formData
    });
    showToast("Upload submitted for approval.");
    clearUploadForm();
    await fetchUploads();
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
        <div style="font-size:12px; color: rgba(14, 27, 22, 0.6);">${upload.status} - ${formatDate(upload.createdAt)}</div>
      </div>
    `)
    .join("");
}

function renderAdmin() {
  if (!elements.adminActiveSubs || !elements.adminReferrals || !elements.adminMostViewed || !elements.adminUploads) return;
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
  if (LOCAL_MODE) {
    const upload = state.uploads.find((item) => item.id === uploadId);
    if (!upload) {
      showToast("Upload not found.");
      return;
    }
    upload.status = "Approved";
    const newPaper = {
      id: `paper_${Math.random().toString(36).slice(2, 10)}`,
      faculty: upload.faculty || "General",
      department: upload.department || "General",
      courseCode: upload.courseCode,
      courseName: upload.courseName || upload.title,
      year: upload.year,
      examType: upload.examType,
      pages: null,
      views: 0
    };
    state.papers.unshift(newPaper);
    if (upload.uploaderId) {
      const uploader = state.users.find((u) => u.id === upload.uploaderId);
      if (uploader) {
        uploader.bonusDays = (uploader.bonusDays || 0) + 2;
      }
    }
    saveLocalState();
    showToast("Upload approved.");
    buildFilters();
    updateUI();
    return;
  }
  try {
    await apiFetch(`/admin/uploads/${uploadId}/approve`, { method: "PATCH" });
    showToast("Upload approved.");
    await fetchAdmin();
    await fetchPapers();
    buildFilters();
    renderLibrary();
    renderAdmin();
  } catch (error) {
    showToast(error.message || "Approval failed.");
  }
}

async function rejectUpload(uploadId) {
  if (LOCAL_MODE) {
    const upload = state.uploads.find((item) => item.id === uploadId);
    if (!upload) {
      showToast("Upload not found.");
      return;
    }
    upload.status = "Rejected";
    saveLocalState();
    showToast("Upload rejected.");
    updateUI();
    return;
  }
  try {
    await apiFetch(`/admin/uploads/${uploadId}/reject`, { method: "PATCH" });
    showToast("Upload rejected.");
    await fetchAdmin();
    renderAdmin();
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
    elements.profileDetails.textContent = hasUser
      ? `Account: ${user.email}`
      : "Login to see your trial and subscription dates.";
  }

  if (elements.trialEnd) {
    elements.trialEnd.textContent = hasUser ? formatDate(user.trialEndsAt) : "-";
  }
  if (elements.subEnd) {
    elements.subEnd.textContent = hasUser ? formatDate(user.subscriptionEndsAt) : "-";
  }
  if (elements.bonusDays) {
    elements.bonusDays.textContent = hasUser ? user.bonusDays : 0;
  }
  if (elements.accessUntil) {
    elements.accessUntil.textContent = hasUser ? formatDate(access.accessEndsAt) : "-";
  }

  if (elements.uploadBonus) {
    elements.uploadBonus.textContent = hasUser ? user.bonusDays : 0;
  }
  if (elements.referralProgress) {
    elements.referralProgress.textContent = hasUser ? user.referralProgress : 0;
  }
  if (elements.referralCode) {
    elements.referralCode.textContent = state.referralCode || "-";
  }

  renderTransactions();
  renderLibrary();
  renderUploads();
  renderAdmin();
}

function demoUser() {
  if (!LOCAL_MODE) {
    showToast("Demo users are disabled in the real build.");
    return;
  }
  loadLocalState();
  const demoId = `demo_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();
  const user = {
    id: `user_${demoId}`,
    name: "Demo Student",
    email: `${demoId}@embuni.ac.ke`,
    studentId: `UEB/DEMO/${demoId.toUpperCase()}`,
    password: "demo123",
    role: "student",
    trialEndsAt: addDays(now, 7).toISOString(),
    subscriptionEndsAt: null,
    bonusDays: 0,
    referralProgress: 0,
    referralCycles: 0,
    referralCode: generateReferralCode(),
    createdAt: now.toISOString()
  };
  state.users.push(user);
  state.currentUser = user;
  saveLocalState();
  showToast("Demo account created. Password: demo123");
  updateUI();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = get("themeToggle");
  if (btn) btn.textContent = saved === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  const btn = get("themeToggle");
  if (btn) btn.textContent = next === "dark" ? "☀️" : "🌙";
}

function setMobileNav(isOpen) {
  if (!elements.mobileNav || !elements.navToggle) return;
  elements.mobileNav.classList.toggle("open", isOpen);
  elements.navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function setActiveNavLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".primary-nav a, .mobile-nav a").forEach(link => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });
}

function setBtnLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) btn.classList.add("loading");
  else btn.classList.remove("loading");
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
  on(elements.facultyFilter, "change", renderLibrary);
  on(elements.departmentFilter, "change", renderLibrary);
  on(elements.courseFilter, "change", renderLibrary);
  on(elements.yearFilter, "change", renderLibrary);
  on(elements.typeFilter, "change", renderLibrary);
  on(elements.copyReferralBtn, "click", copyReferralCode);
  on(elements.demoUserBtn, "click", demoUser);
  on(get("themeToggle"), "click", toggleTheme);
  on(elements.navToggle, "click", () => {
    const isOpen = elements.mobileNav?.classList.contains("open");
    setMobileNav(!isOpen);
  });

  if (elements.mobileNav) {
    elements.mobileNav.querySelectorAll("a").forEach((link) => {
      on(link, "click", () => setMobileNav(false));
    });
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
    }
  });

  document.querySelectorAll(".toggle-password").forEach((btn) => {
    on(btn, "click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = get(targetId);
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "👁️";
      } else {
        input.type = "password";
        btn.textContent = "🙈";
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
      if (elements.viewerModal.style.display === "flex") {
        if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.key === "p")) {
          event.preventDefault();
        }
      }
    });
  }
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

async function bootstrap() {
  loadSearch();
  initTheme();
  setActiveNavLink();
  wireEvents();
  setTimeout(initReveal, 100);

  if (LOCAL_MODE) {
    localStorage.setItem(MODE_KEY, "local");
    loadLocalState();
    buildFilters();
    updateUI();
    return;
  }
  await fetchMe();
  await fetchPapers();
  buildFilters();
  await fetchTransactions();
  await fetchUploads();
  await fetchAdmin();
  await fetchReferralCode();
  updateUI();
}

bootstrap();
