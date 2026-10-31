/**
 * MagangTracker — Independent MagangHub Vacancy & Quota Tracker
 * Live Backend Query with Regional (Provinsi & Kab/Kota), Academic (Prodi & Jenjang),
 * Enterprise (Pemerintah & Perusahaan), Dynamic Company Logos, and Precise Sorting.
 */

const STORAGE_PREFIX = "magangtracker_";

const state = {
  vacancies: [],
  isLoading: false,
  currentPage: 1,
  totalPages: 1,
  totalVacancies: 0,

  filters: {
    keyword: "",
    province: "",
    city: "",
    studyProgram: "",
    education: "",
    companyType: "",
    sort: "least_applicants",
    onlySaved: false,
  },

  profile: JSON.parse(localStorage.getItem(STORAGE_PREFIX + "profile")) || {
    name: "",
    education: "",
    studyProgram: "",
    skills: [],
    cvText: "",
  },

  bookmarks: JSON.parse(localStorage.getItem(STORAGE_PREFIX + "bookmarks")) || [],
  savedVacanciesMap: JSON.parse(localStorage.getItem(STORAGE_PREFIX + "saved_items")) || {},
  regionsData: [],

  radar: {
    isOpen: false,
    activeKeywords: [],
    activeCities: [],
    isScanning: false,
    isRadarActive: false,
    radarPage: 1,
  },
};

let searchDebounceTimer = null;
let currentSearchRequestId = 0;
let currentSearchAbortController = null;

// =============================================================================
// Initialization
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadRegionsAndFilters();
  syncSavedVacancies();
  initRadarUI();
  fetchVacancies(1);
  updateProfileBadge();
  updateSavedPill();
});

// =============================================================================
// Master Data Loading & Regional Dropdown Binding
// =============================================================================
async function loadRegionsAndFilters() {
  try {
    const res = await fetch("/api/filters");
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        state.regionsData = json.data.regions || [];
        populateProvinceDropdown();
        populateCityDropdown();
        populateProdiDropdown(json.data.studyPrograms);
        populateRadarCitySelect();
      }
    }
  } catch (err) {
    console.warn("Failed loading master filters:", err);
  }
}

function populateProvinceDropdown() {
  const provSelect = document.getElementById("filter-province");
  if (!provSelect || !state.regionsData) return;

  provSelect.innerHTML = `<option value="">Semua Provinsi</option>`;
  state.regionsData.forEach((reg) => {
    const opt = document.createElement("option");
    opt.value = reg.name;
    opt.textContent = reg.name;
    provSelect.appendChild(opt);
  });
}

function populateCityDropdown(selectedProvinceName = "") {
  const citySelect = document.getElementById("filter-city");
  if (!citySelect) return;

  citySelect.innerHTML = `<option value="">Semua Kab / Kota</option>`;
  let cities = [];

  if (selectedProvinceName) {
    const reg = state.regionsData.find((r) => r.name.toLowerCase() === selectedProvinceName.toLowerCase());
    if (reg && reg.cities) cities = reg.cities;
  } else {
    state.regionsData.forEach((r) => {
      if (r.cities) cities.push(...r.cities);
    });
  }

  const uniqueCities = Array.from(new Set(cities)).sort();
  uniqueCities.forEach((cityName) => {
    const opt = document.createElement("option");
    opt.value = cityName;
    opt.textContent = cityName;
    citySelect.appendChild(opt);
  });
}

function populateProdiDropdown(prodis = []) {
  const select = document.getElementById("filter-prodi");
  if (!select) return;

  select.innerHTML = `<option value="">Semua Program Studi</option>`;
  const defaultMajors = [
    "Administrasi",
    "Administrasi Bisnis",
    "Akuntansi",
    "Desain Komunikasi Visual",
    "Hukum",
    "Ilmu Komputer",
    "Ilmu Komunikasi",
    "Manajemen",
    "Pariwisata / Perhotelan",
    "Psikologi",
    "Sistem Informasi",
    "Tata Busana",
    "Teknik Elektro",
    "Teknik Industri",
    "Teknik Informatika",
    "Teknik Mesin",
    "Teknologi Informasi"
  ];

  const incoming = (prodis || []).map((p) => p.name);
  const list = Array.from(new Set([...defaultMajors, ...incoming])).sort();

  list.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

// =============================================================================
// Live Backend Fetching (Pagination & Load More Support with Race Guard)
// =============================================================================
async function fetchVacancies(page = 1, append = false, forceNormal = false) {
  if (forceNormal || (!append && page === 1)) {
    state.radar.isRadarActive = false;
    const banner = document.getElementById("active-radar-banner");
    if (banner) banner.classList.add("hidden");
  }

  // Abort any prior in-flight request
  if (currentSearchAbortController) {
    currentSearchAbortController.abort();
  }
  currentSearchAbortController = new AbortController();
  const requestId = ++currentSearchRequestId;

  state.isLoading = true;
  state.currentPage = page;

  const btnLoadMore = document.getElementById("btn-load-more");
  if (btnLoadMore && append) {
    btnLoadMore.disabled = true;
    btnLoadMore.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[16px]">sync</span>
      <span>Memuat lowongan berikutnya...</span>
    `;
  }

  // Only show skeleton if there is NO data on the screen
  // If data already exists, keep it visible while loading to avoid jumpy UI!
  if (!append && (!state.vacancies || state.vacancies.length === 0)) {
    renderSkeleton();
  }
  renderActiveFilterTags();

  const params = new URLSearchParams({
    page: page,
    sort: state.filters.sort || "least_applicants",
  });

  if (state.filters.keyword) params.set("keyword", state.filters.keyword);
  if (state.filters.province) params.set("province", state.filters.province);
  if (state.filters.city) params.set("city", state.filters.city);
  if (state.filters.studyProgram) params.set("prodi", state.filters.studyProgram);
  if (state.filters.education) params.set("education", state.filters.education);
  if (state.filters.companyType) params.set("companyType", state.filters.companyType);

  try {
    const res = await fetch(`/api/vacancies?${params.toString()}`, {
      signal: currentSearchAbortController.signal,
    });
    const json = await res.json();

    // Guard: Discard stale response if a newer request was already dispatched
    if (requestId !== currentSearchRequestId) {
      return;
    }

    if (json.success && Array.isArray(json.items)) {
      const enriched = json.items.map(enrichVacancyWithUserMatch);
      if (append) {
        state.vacancies = [...state.vacancies, ...enriched];
      } else {
        state.vacancies = enriched;
      }

      state.currentPage = json.meta?.currentPage || page;
      state.totalPages = json.meta?.lastPage || 1;
      state.totalVacancies = json.meta?.total || state.vacancies.length;

      appendDynamicStudyPrograms(json.items);

      // Sinkronisasi item tersimpan jika ada lowongan saat ini yang sudah di-bookmark
      enriched.forEach((v) => {
        if (state.bookmarks.includes(v.id)) {
          state.savedVacanciesMap[v.id] = v;
        }
      });
      localStorage.setItem(STORAGE_PREFIX + "saved_items", JSON.stringify(state.savedVacanciesMap));

      renderVacancies();
      updatePaginationUI();
    } else {
      // Do not wipe out already displayed data on temporary server glitch
      if (!append && (!state.vacancies || state.vacancies.length === 0)) {
        renderEmpty(json.message || "Gagal memuat lowongan dari pangkalan data Kemnaker.");
      }
    }
  } catch (err) {
    if (err.name === "AbortError" || requestId !== currentSearchRequestId) {
      return;
    }
    // Only show empty state if screen was already empty
    if (!append && (!state.vacancies || state.vacancies.length === 0)) {
      renderEmpty("Kendala koneksi ke server. Coba muat ulang.");
    }
  } finally {
    if (requestId === currentSearchRequestId) {
      state.isLoading = false;
      if (btnLoadMore) {
        btnLoadMore.disabled = false;
        btnLoadMore.innerHTML = `
          <span class="material-symbols-outlined text-[16px]">add_circle</span>
          <span>Muat 18 Lowongan Lagi</span>
        `;
      }
      updatePaginationUI();
    }
  }
}

function updatePaginationUI() {
  const paginationControls = document.getElementById("pagination-controls");
  if (paginationControls) {
    paginationControls.style.display = state.filters.onlySaved ? "none" : "flex";
  }

  const currentEl = document.getElementById("current-page-num");
  const totalPagesEl = document.getElementById("total-pages-num");
  const totalVacanciesEl = document.getElementById("total-vacancies-num");
  const indicatorEl = document.getElementById("page-indicator");
  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");
  const btnLoadMore = document.getElementById("btn-load-more");

  const cur = state.currentPage || 1;
  const totPages = state.totalPages || 1;
  const totVac = state.totalVacancies ? state.totalVacancies.toLocaleString("id-ID") : (state.vacancies ? state.vacancies.length : 0);

  if (currentEl) currentEl.textContent = cur;
  if (totalPagesEl) totalPagesEl.textContent = totPages.toLocaleString("id-ID");
  if (totalVacanciesEl) totalVacanciesEl.textContent = totVac;
  if (indicatorEl) indicatorEl.textContent = cur;

  if (btnPrev) btnPrev.disabled = cur <= 1;
  if (btnNext) btnNext.disabled = cur >= totPages;
  if (btnLoadMore) {
    btnLoadMore.style.display = cur >= totPages ? "none" : "inline-flex";
  }
}

window.loadMoreVacancies = function() {
  if (state.isLoading) return;
  if (state.radar && state.radar.isRadarActive) {
    loadMoreRadarVacancies();
  } else {
    if (state.currentPage >= state.totalPages) return;
    fetchVacancies(state.currentPage + 1, true, true);
  }
};

window.changePage = function(newPage) {
  if (state.isLoading) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (state.radar && state.radar.isRadarActive) {
    loadRadarPage(newPage);
  } else {
    if (newPage < 1 || newPage > state.totalPages) return;
    fetchVacancies(newPage, false, true);
  }
};

function appendDynamicStudyPrograms(items) {
  const select = document.getElementById("filter-prodi");
  if (!select) return;

  const existing = new Set(Array.from(select.options).map((o) => o.value.toLowerCase()));
  items.forEach((item) => {
    if (Array.isArray(item.studyPrograms)) {
      item.studyPrograms.forEach((sp) => {
        const clean = (sp || "").trim();
        if (clean && clean.toLowerCase() !== "semua" && !clean.toLowerCase().includes("semua jurusan") && !existing.has(clean.toLowerCase())) {
          existing.add(clean.toLowerCase());
          const opt = document.createElement("option");
          opt.value = clean;
          opt.textContent = clean;
          select.appendChild(opt);
        }
      });
    }
  });
}

// =============================================================================
// Client-Side Smart CV Matcher
// =============================================================================
function enrichVacancyWithUserMatch(v) {
  const p = state.profile;
  const hasProfile = Boolean(p.studyProgram || (p.skills && p.skills.length) || p.cvText);

  if (!hasProfile) {
    return { ...v, matchScore: 0, matchBreakdown: null };
  }

  let score = 0;
  const breakdown = [];
  const textCorpus = `${v.title} ${v.company} ${v.description || ""} ${(v.studyPrograms || []).join(" ")}`.toLowerCase();

  // Study program match
  if (p.studyProgram) {
    const userP = p.studyProgram.toLowerCase().trim();
    const acceptsAll = (v.studyPrograms || []).some((sp) => sp.toLowerCase().includes("semua"));
    const directMatch = (v.studyPrograms || []).some((sp) => {
      const itemP = sp.toLowerCase();
      return itemP.includes(userP) || userP.includes(itemP);
    });

    if (directMatch) {
      score += 40;
      breakdown.push(`Jurusan Anda (${p.studyProgram}) diprioritaskan (+40%)`);
    } else if (acceptsAll) {
      score += 25;
      breakdown.push(`Terbuka untuk semua jurusan (+25%)`);
    }
  }

  // Skills match
  if (p.skills && p.skills.length > 0) {
    const matchedSkills = p.skills.filter((sk) => textCorpus.includes(sk.toLowerCase().trim()));
    if (matchedSkills.length > 0) {
      const skillPts = Math.min(35, Math.round((matchedSkills.length / Math.max(1, p.skills.length)) * 35) + 10);
      score += skillPts;
      breakdown.push(`Keahlian cocok: ${matchedSkills.slice(0, 3).join(", ")} (+${skillPts}%)`);
    }
  }

  // Education level match
  if (p.education && v.educationLevels && v.educationLevels.length > 0) {
    const userEdu = p.education.toLowerCase();
    const isEduMatch = v.educationLevels.some((lvl) => {
      const l = (lvl || "").toLowerCase();
      if (userEdu === "bachelor") return l.includes("bachelor") || l.includes("sarjana") || l.includes("s1");
      if (userEdu === "diploma") return l.includes("diploma") || l.includes("d3") || l.includes("d4");
      if (userEdu === "vocational") return l.includes("vocational") || l.includes("smk") || l.includes("sma");
      return l.includes(userEdu);
    });
    if (isEduMatch) {
      score += 15;
      breakdown.push(`Jenjang pendidikan memenuhi syarat (+15%)`);
    }
  }

  return {
    ...v,
    matchScore: Math.min(100, score),
    matchBreakdown: breakdown,
  };
}

// =============================================================================
// Render Vacancies & Active Tags
// =============================================================================
function renderVacancies() {
  const container = document.getElementById("cards-container");
  if (!container) return;

  let items = [];

  // When "Tersimpan" filter is active, fetch from savedVacanciesMap directly
  if (state.filters.onlySaved) {
    items = state.bookmarks
      .map((id) => state.savedVacanciesMap[id] || state.vacancies.find((v) => v.id === id))
      .filter(Boolean);

    // If some bookmarked items are not yet loaded into map, sync in background
    if (items.length < state.bookmarks.length) {
      syncSavedVacancies();
    }
  } else {
    items = [...state.vacancies];
  }

  // Sorting
  const sortMode = state.filters.sort;
  if (sortMode === "least_applicants") {
    items.sort((a, b) => a.applicants - b.applicants || a.applicantsPerSlot - b.applicantsPerSlot);
  } else if (sortMode === "most_applicants") {
    items.sort((a, b) => b.applicants - a.applicants);
  } else if (sortMode === "most_quota") {
    items.sort((a, b) => b.quota - a.quota);
  } else if (sortMode === "least_quota") {
    items.sort((a, b) => a.quota - b.quota);
  } else if (sortMode === "highest_salary") {
    items.sort((a, b) => (b.estimatedUmk || 0) - (a.estimatedUmk || 0));
  } else if (sortMode === "lowest_salary") {
    items.sort((a, b) => (a.estimatedUmk || 0) - (b.estimatedUmk || 0));
  } else if (sortMode === "latest") {
    items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }

  // Update count
  const countEl = document.getElementById("results-count");
  if (countEl) {
    if (state.filters.onlySaved) {
      countEl.innerHTML = `${items.length.toLocaleString("id-ID")} <span class="text-slate-400 font-normal">lowongan tersimpan</span>`;
    } else {
      const totalFormatted = state.totalVacancies ? state.totalVacancies.toLocaleString("id-ID") : items.length.toLocaleString("id-ID");
      countEl.innerHTML = `${items.length.toLocaleString("id-ID")} <span class="text-slate-400 font-normal">dari total ${totalFormatted}</span>`;
    }
  }

  if (items.length === 0) {
    if (state.filters.onlySaved) {
      if (state.bookmarks.length > 0) {
        renderEmpty("Sedang memuat data lowongan tersimpan Anda dari pangkalan data Kemnaker...");
      } else {
        renderEmpty("Belum ada lowongan yang Anda simpan. Klik ikon hati (Love) pada kartu lowongan untuk menyimpannya di sini.");
      }
    } else {
      renderEmpty("Tidak ditemukan lowongan yang cocok dengan kriteria filter Anda.");
    }
    return;
  }

  container.innerHTML = items.map(createOriginalCardHTML).join("");
}

function renderActiveFilterTags() {
  const container = document.getElementById("active-filter-tags");
  if (!container) return;

  const tags = [];
  const f = state.filters;

  if (f.province) tags.push({ key: "province", label: `Provinsi: ${f.province}` });
  if (f.city) tags.push({ key: "city", label: `Kota: ${f.city}` });
  if (f.studyProgram) tags.push({ key: "studyProgram", label: `Prodi: ${f.studyProgram}` });
  if (f.education) {
    const eduName = f.education === "bachelor" ? "Sarjana (S1)" : f.education === "diploma" ? "Diploma (D3/D4)" : "SMK/SMA";
    tags.push({ key: "education", label: `Jenjang: ${eduName}` });
  }
  if (f.companyType) tags.push({ key: "companyType", label: `Instansi: ${f.companyType}` });

  if (tags.length === 0) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = tags.map((t) => `
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
      <span>${t.label}</span>
      <button onclick="removeFilterTag('${t.key}')" class="hover:text-slate-900 font-bold ml-0.5 cursor-pointer">&times;</button>
    </span>
  `).join("") + `
    <button onclick="resetAllFilters()" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs cursor-pointer transition-colors">
      Reset
    </button>
  `;
}

window.removeFilterTag = function(key) {
  if (key === "province") {
    state.filters.province = "";
    const el = document.getElementById("filter-province");
    if (el) el.selectedIndex = 0;
    populateCityDropdown("");
  } else if (key === "city") {
    state.filters.city = "";
    const el = document.getElementById("filter-city");
    if (el) el.selectedIndex = 0;
  } else if (key === "studyProgram") {
    state.filters.studyProgram = "";
    const el = document.getElementById("filter-prodi");
    if (el) el.selectedIndex = 0;
  } else if (key === "education") {
    state.filters.education = "";
    const el = document.getElementById("filter-education");
    if (el) el.selectedIndex = 0;
  } else if (key === "companyType") {
    state.filters.companyType = "";
    const el = document.getElementById("filter-company-type");
    if (el) el.selectedIndex = 0;
  }

  fetchVacancies(1);
};

function renderEmpty(message) {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML = `
    <div class="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
      <div class="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-3">
        <span class="material-symbols-outlined text-[26px]">search_off</span>
      </div>
      <h3 class="text-base font-bold text-slate-800 mb-1">Hasil Tidak Ditemukan</h3>
      <p class="text-xs text-slate-500 max-w-md mx-auto mb-4">${message}</p>
      <button onclick="resetAllFilters()" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer">
        <span class="material-symbols-outlined text-[15px]">refresh</span>
        <span>Reset Filter Pencarian</span>
      </button>
    </div>
  `;
}

// =============================================================================
// ORIGINAL EXECUTIVE CARD DESIGN WITH REAL COMPANY PHOTO / LOGO
// =============================================================================
function createOriginalCardHTML(v) {
  const isSaved = state.bookmarks.includes(v.id);

  // Peluang calculation
  let peluangPercent = 100;
  if (v.quota && v.applicants !== undefined) {
    if (v.applicants === 0) {
      peluangPercent = 100;
    } else {
      peluangPercent = Math.min(100, Math.round((v.quota / Math.max(v.quota, v.applicants)) * 100));
    }
  }

  // Salary format
  const umkFormatted = `Rp ${(v.estimatedUmk || 3972202).toLocaleString("id-ID")}`;

  // Instansi label & style
  const isPemerintah = v.companyType === "Pemerintah";
  const instansiBadge = isPemerintah ? "Pemerintah" : "Swasta";
  const instansiBadgeClass = isPemerintah
    ? "bg-slate-100 text-slate-700 border-slate-200"
    : "bg-slate-50 text-slate-500 border-slate-200/80";

  // Interview method badge (format yang disediakan perusahaan)
  let interviewBadgeHtml = "";
  if (v.interviewTypes && v.interviewTypes.length > 0) {
    const hasOnline = v.interviewTypes.includes("online");
    const hasOnsite = v.interviewTypes.includes("onsite");
    let label = "Metode Interview: ";
    if (hasOnline && hasOnsite) label += "Online & Onsite";
    else if (hasOnline) label += "Online";
    else label += "Tatap Muka";
    
    interviewBadgeHtml = `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80" title="Metode wawancara yang ditentukan perusahaan: ${v.interviewTypes.join(', ')}">
        <span class="material-symbols-outlined text-[12px] text-blue-600">videocam</span>
        <span>${label}</span>
      </span>
    `;
  }

  // Working days text (jelas, tanpa singkatan membingungkan)
  const workDaysText = v.workingDaysPerWeek ? `${v.workingDaysPerWeek} Hari Kerja/Minggu` : null;

  // Ratio explanation
  const ratioText = v.applicants === 0 ? "Bebas Saingan" : `Rasio 1 : ${Math.max(1, Math.round(v.applicants / (v.quota || 1)))}`;

  // Education text
  const eduLabels = {
    diploma: "D3/D4",
    bachelor: "S1",
    master: "S2",
    vocational: "SMK/SMA",
    profession: "Profesi",
  };
  const eduList = (v.educationLevels || ["diploma", "bachelor"]).map((l) => eduLabels[l] || l.toUpperCase()).join(", ");

  // Study programs text
  let prodiText = "Semua Jurusan";
  if (v.studyPrograms && v.studyPrograms.length > 0) {
    const list = v.studyPrograms.slice(0, 2).join(", ");
    const remaining = v.studyPrograms.length > 2 ? ` +${v.studyPrograms.length - 2}` : "";
    prodiText = `${list}${remaining}`;
  }

  // Monogram initials
  const compInitial = (v.company || "P").substring(0, 2).toUpperCase();

  // Location string
  const locationText = v.location || v.city || v.province || "Indonesia";

  return `
    <article class="group bg-white rounded-xl border border-slate-200/90 hover:border-slate-400 hover:shadow-md transition-all duration-150 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
      
      <!-- Top Section: Identity + Action -->
      <div class="flex items-start gap-3.5">
        <!-- Authentic Logo Container (44x44, crisp border, white bg) -->
        <div style="width:44px;height:44px;min-width:44px;min-height:44px;" class="rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
          ${v.logo ? `
            <img 
              src="${v.logo}" 
              alt="${v.company}" 
              style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;"
              loading="lazy" 
              referrerpolicy="no-referrer"
              onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'font-bold text-slate-600 text-xs tracking-wider\\'>${compInitial}</span>';"
            />
          ` : `
            <span class="font-bold text-slate-600 text-xs tracking-wider">${compInitial}</span>
          `}
        </div>

        <!-- Position & Company -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span class="text-[11px] font-medium text-slate-500 uppercase tracking-wide truncate max-w-[180px]" title="${v.company}">
              ${v.company}
            </span>
            <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${instansiBadgeClass}">
              ${instansiBadge}
            </span>
            ${interviewBadgeHtml}
            ${v.matchScore > 0 ? `
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <span>CV ${v.matchScore}%</span>
              </span>
            ` : ''}
          </div>
          <h3 onclick="openDetailModal('${v.id}')" class="text-[14px] sm:text-[15px] font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1" title="${v.title}">
            ${v.title}
          </h3>
        </div>

        <!-- Save Button -->
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="toggleBookmark('${v.id}')" title="Simpan lowongan" class="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-[19px] ${isSaved ? 'text-rose-500 fill' : ''}">favorite</span>
          </button>
        </div>
      </div>

      <!-- Location & Qualification Meta -->
      <div class="space-y-1 text-xs text-slate-500">
        <div class="flex items-center justify-between gap-2 truncate">
          <div class="flex items-center gap-1.5 truncate">
            <span class="material-symbols-outlined text-[15px] text-slate-400 shrink-0">location_on</span>
            <span class="truncate text-slate-600 font-normal" title="${locationText}">${locationText}</span>
          </div>
          ${workDaysText ? `
            <span class="text-[11px] text-slate-500 font-medium shrink-0 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/80 flex items-center gap-1" title="Hari Kerja: ${v.workingDaysPerWeek} hari dalam seminggu">
              <span class="material-symbols-outlined text-[13px] text-slate-400">calendar_today</span>
              <span>${v.workingDaysPerWeek} Hari / Minggu</span>
            </span>
          ` : ''}
        </div>
        <div class="flex items-center gap-1.5 truncate">
          <span class="material-symbols-outlined text-[15px] text-slate-400 shrink-0">school</span>
          <span class="truncate text-slate-600 font-normal" title="${eduList} &bull; ${prodiText}">
            ${eduList} &bull; <span class="text-slate-700 font-medium">${prodiText}</span>
          </span>
        </div>
      </div>

      <!-- Minimalist High-Density Metrics Strip -->
      <div class="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
        <div class="flex items-center gap-3">
          <div>
            <span class="text-[11px] text-slate-400">Kuota</span>
            <span class="font-semibold text-slate-800 ml-1">${v.quota}</span>
          </div>
          <span class="text-slate-200 font-light">|</span>
          <div>
            <span class="text-[11px] text-slate-400">Pelamar</span>
            <span class="font-semibold text-slate-800 ml-1">${v.applicants}</span>
          </div>
          <span class="text-slate-200 font-light">|</span>
          <div class="flex items-center gap-1">
            <span class="text-[11px] text-slate-400">Peluang</span>
            <span class="font-semibold text-blue-600 ml-1">${peluangPercent}%</span>
          </div>
        </div>
        <div class="text-right">
          <span class="font-semibold text-slate-900">${umkFormatted}</span>
          <span class="text-[10px] text-slate-400 font-normal">/bln</span>
        </div>
      </div>

      <!-- Footer CTA Buttons -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full ${v.applicants === 0 ? 'bg-blue-600' : 'bg-slate-400'}"></span>
          <span>${ratioText}</span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="openDetailModal('${v.id}')" class="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer">
            Rincian Lengkap
          </button>
          <a href="${v.sourceUrl}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1 transition-all active:scale-[0.98]">
            <span>Lamar</span>
            <span class="material-symbols-outlined text-[13px]">arrow_outward</span>
          </a>
        </div>
      </div>

    </article>
  `;
}

function renderSkeleton() {
  const container = document.getElementById("cards-container");
  if (!container) return;

  container.innerHTML = Array.from({ length: 4 }).map(() => `
    <div class="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3.5">
      <div class="flex items-start gap-3.5">
        <div class="w-11 h-11 rounded-lg shimmer shrink-0"></div>
        <div class="flex-1 flex flex-col gap-1.5 pt-0.5">
          <div class="h-3 w-1/4 shimmer rounded"></div>
          <div class="h-4 w-3/4 shimmer rounded"></div>
        </div>
      </div>
      <div class="space-y-1.5">
        <div class="h-3 w-1/2 shimmer rounded"></div>
        <div class="h-3 w-2/3 shimmer rounded"></div>
      </div>
      <div class="h-9 w-full shimmer rounded-lg"></div>
      <div class="flex justify-between items-center pt-2 border-t border-slate-100">
        <div class="h-3 w-1/4 shimmer rounded"></div>
        <div class="h-7 w-20 shimmer rounded-md"></div>
      </div>
    </div>
  `).join("");
}

// =============================================================================
// Event Handlers & Filter Bindings
// =============================================================================
function setupEventListeners() {
  // 1. Keyword search
  const kwInput = document.getElementById("filter-keyword");
  if (kwInput) {
    kwInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.filters.keyword = e.target.value.trim();
        fetchVacancies(1);
      }, 350);
    });
    kwInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(searchDebounceTimer);
        const val = kwInput.value.trim();
        if (val.includes(",")) {
          const kws = val.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
          if (kws.length > 0) {
            state.radar.activeKeywords = kws;
            renderRadarActiveTags();
            executeRadarSearch();
            return;
          }
        }
        state.filters.keyword = val;
        fetchVacancies(1);
      }
    });
  }

  // 2. Provinsi filter
  const provSelect = document.getElementById("filter-province");
  if (provSelect) {
    provSelect.addEventListener("change", (e) => {
      state.filters.province = e.target.value;
      state.filters.city = "";
      populateCityDropdown(e.target.value);
      if (kwInput && !kwInput.value.trim()) state.filters.keyword = "";
      state.radar.isRadarActive = false;
      const banner = document.getElementById("active-radar-banner");
      if (banner) banner.classList.add("hidden");
      fetchVacancies(1, false, true);
    });
  }

  // 3. Kabupaten / Kota filter
  const citySelect = document.getElementById("filter-city");
  if (citySelect) {
    citySelect.addEventListener("change", (e) => {
      state.filters.city = e.target.value;
      if (kwInput && !kwInput.value.trim()) state.filters.keyword = "";
      state.radar.isRadarActive = false;
      const banner = document.getElementById("active-radar-banner");
      if (banner) banner.classList.add("hidden");
      fetchVacancies(1, false, true);
    });
  }

  // 4. Prodi filter
  const prodiSelect = document.getElementById("filter-prodi");
  if (prodiSelect) {
    prodiSelect.addEventListener("change", (e) => {
      state.filters.studyProgram = e.target.value;
      fetchVacancies(1);
    });
  }

  // 5. Jenjang filter
  const eduSelect = document.getElementById("filter-education");
  if (eduSelect) {
    eduSelect.addEventListener("change", (e) => {
      state.filters.education = e.target.value;
      fetchVacancies(1);
    });
  }

  // 6. Tipe Instansi filter (Pemerintah / Perusahaan)
  const typeSelect = document.getElementById("filter-company-type");
  if (typeSelect) {
    typeSelect.addEventListener("change", (e) => {
      state.filters.companyType = e.target.value;
      fetchVacancies(1);
    });
  }

  // 7. Sorting filter
  const sortSelect = document.getElementById("filter-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.filters.sort = e.target.value;
      renderVacancies();
    });
  }

  // 8. Profile form
  const profForm = document.getElementById("profile-form");
  if (profForm) {
    profForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveProfile();
    });
  }
}

window.resetAllFilters = function() {
  state.filters.keyword = "";
  state.filters.province = "";
  state.filters.city = "";
  state.filters.studyProgram = "";
  state.filters.education = "";
  state.filters.companyType = "";
  state.filters.onlySaved = false;

  const kwInput = document.getElementById("filter-keyword");
  if (kwInput) kwInput.value = "";

  const selects = ["filter-province", "filter-city", "filter-prodi", "filter-education", "filter-company-type"];
  selects.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  populateCityDropdown("");

  // Reset preset chips
  document.querySelectorAll(".quick-filter-chip").forEach((btn, idx) => {
    if (idx === 0) {
      btn.className = "quick-filter-chip px-3 py-1 rounded-md border border-slate-900 bg-slate-900 text-white font-medium hover:opacity-90 transition-all cursor-pointer shrink-0";
    } else {
      btn.className = "quick-filter-chip px-3 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shrink-0";
    }
  });

  const btnSaved = document.getElementById("btn-toggle-saved");
  if (btnSaved) btnSaved.classList.remove("border-rose-400", "text-rose-600", "bg-rose-50");

  fetchVacancies(1);
};

window.toggleQuickSaved = function() {
  state.filters.onlySaved = !state.filters.onlySaved;
  const btn = document.getElementById("btn-toggle-saved");
  if (btn) {
    if (state.filters.onlySaved) {
      btn.classList.add("border-rose-400", "text-rose-600", "bg-rose-50");
    } else {
      btn.classList.remove("border-rose-400", "text-rose-600", "bg-rose-50");
    }
  }
  if (state.filters.onlySaved) {
    syncSavedVacancies();
  }
  renderVacancies();
  updatePaginationUI();
};

async function syncSavedVacancies() {
  if (!state.bookmarks || state.bookmarks.length === 0) return;

  const missingIds = state.bookmarks.filter((id) => !state.savedVacanciesMap[id]);
  if (missingIds.length === 0) return;

  const needFetch = [];
  missingIds.forEach((id) => {
    const found = state.vacancies.find((v) => v.id === id);
    if (found) {
      state.savedVacanciesMap[id] = found;
    } else {
      needFetch.push(id);
    }
  });

  if (needFetch.length > 0) {
    await Promise.allSettled(
      needFetch.map(async (id) => {
        try {
          const res = await fetch(`/api/vacancy/${id}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              state.savedVacanciesMap[id] = enrichVacancyWithUserMatch(json.data);
            }
          }
        } catch (_) {}
      })
    );
  }

  localStorage.setItem(STORAGE_PREFIX + "saved_items", JSON.stringify(state.savedVacanciesMap));
  updateSavedPill();
  if (state.filters.onlySaved) {
    renderVacancies();
  }
}

function updateSavedPill() {
  const pill = document.getElementById("saved-count-pill");
  if (pill) {
    pill.textContent = `Tersimpan (${state.bookmarks.length})`;
  }
}

// =============================================================================
// Bookmarks & Share
// =============================================================================
window.toggleBookmark = function(id) {
  const idx = state.bookmarks.indexOf(id);
  if (idx === -1) {
    state.bookmarks.push(id);
    const item = state.vacancies.find((v) => v.id === id) || state.savedVacanciesMap[id];
    if (item) {
      state.savedVacanciesMap[id] = item;
    }
  } else {
    state.bookmarks.splice(idx, 1);
    delete state.savedVacanciesMap[id];
  }

  localStorage.setItem(STORAGE_PREFIX + "bookmarks", JSON.stringify(state.bookmarks));
  localStorage.setItem(STORAGE_PREFIX + "saved_items", JSON.stringify(state.savedVacanciesMap));
  updateSavedPill();
  renderVacancies();
};

window.shareVacancy = function(id) {
  const v = state.vacancies.find((item) => item.id === id);
  if (!v) return;

  if (navigator.share) {
    navigator.share({
      title: `${v.title} — ${v.company}`,
      text: `Lowongan Magang: ${v.title} (${v.company}) dengan kuota ${v.quota} posisi. Cek rinciannya di MagangTracker!`,
      url: v.sourceUrl,
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(v.sourceUrl).then(() => {
      alert("Tautan pendaftaran MagangHub telah disalin!");
    });
  }
};

// =============================================================================
// Profile & CV Modal
// =============================================================================
window.openProfileModal = function() {
  const modal = document.getElementById("profile-modal");
  if (!modal) return;

  const p = state.profile;
  const nameEl = document.getElementById("profile-name");
  if (nameEl) nameEl.value = p.name || "";
  const prodiEl = document.getElementById("profile-prodi");
  if (prodiEl) prodiEl.value = p.studyProgram || "";
  const eduEl = document.getElementById("profile-education");
  if (eduEl) eduEl.value = p.education || "";
  const skillsEl = document.getElementById("profile-skills");
  if (skillsEl) skillsEl.value = (p.skills || []).join(", ");
  const cvEl = document.getElementById("profile-cv");
  if (cvEl) cvEl.value = p.cvText || "";

  modal.classList.add("open");
};

window.closeProfileModal = function() {
  const modal = document.getElementById("profile-modal");
  if (modal) modal.classList.remove("open");
};

function saveProfile() {
  const name = (document.getElementById("profile-name")?.value || "").trim();
  const studyProgram = (document.getElementById("profile-prodi")?.value || "").trim();
  const education = document.getElementById("profile-education")?.value || "";
  const skillsRaw = document.getElementById("profile-skills")?.value || "";
  const cvText = (document.getElementById("profile-cv")?.value || "").trim();

  const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  state.profile = { name, studyProgram, education, skills, cvText };
  localStorage.setItem(STORAGE_PREFIX + "profile", JSON.stringify(state.profile));

  state.vacancies = state.vacancies.map(enrichVacancyWithUserMatch);

  updateProfileBadge();
  closeProfileModal();
  renderVacancies();
}

function updateProfileBadge() {
  const badge = document.getElementById("nav-profile-badge");
  if (!badge) return;
  if (state.profile.studyProgram || (state.profile.skills && state.profile.skills.length)) {
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// =============================================================================
// Quick Preset Filters
// =============================================================================
window.applyQuickFilter = function(type) {
  // Update chip styling
  document.querySelectorAll(".quick-filter-chip").forEach((btn) => {
    btn.className = "quick-filter-chip px-3 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shrink-0";
  });

  const eventTarget = window.event ? window.event.currentTarget : null;
  if (eventTarget && eventTarget.classList.contains("quick-filter-chip")) {
    eventTarget.className = "quick-filter-chip px-3 py-1 rounded-md border border-slate-900 bg-slate-900 text-white font-medium hover:opacity-90 transition-all cursor-pointer shrink-0";
  }

  if (type === "all") {
    state.filters.companyType = "";
    state.filters.education = "";
    state.filters.sort = "least_applicants";
    const elType = document.getElementById("filter-company-type");
    if (elType) elType.value = "";
    const elEdu = document.getElementById("filter-education");
    if (elEdu) elEdu.value = "";
    const elSort = document.getElementById("filter-sort");
    if (elSort) elSort.value = "least_applicants";
    fetchVacancies(1);
    return;
  }

  if (type === "pemerintah") {
    state.filters.companyType = "Pemerintah";
    const el = document.getElementById("filter-company-type");
    if (el) el.value = "Pemerintah";
  } else if (type === "perusahaan") {
    state.filters.companyType = "Perusahaan";
    const el = document.getElementById("filter-company-type");
    if (el) el.value = "Perusahaan";
  } else if (type === "bachelor") {
    state.filters.education = "bachelor";
    const el = document.getElementById("filter-education");
    if (el) el.value = "bachelor";
  } else if (type === "diploma") {
    state.filters.education = "diploma";
    const el = document.getElementById("filter-education");
    if (el) el.value = "diploma";
  } else if (type === "least_applicants") {
    state.filters.sort = "least_applicants";
    const el = document.getElementById("filter-sort");
    if (el) el.value = "least_applicants";
    renderVacancies();
    return;
  }
  fetchVacancies(1);
};

// =============================================================================
// Detail Modal (Executive Dossier Redesign with Interview Pipeline & Transparency)
// =============================================================================
window.openDetailModal = function(id) {
  const v = state.vacancies.find((item) => item.id === id);
  if (!v) return;

  const modal = document.getElementById("detail-modal");
  const body = document.getElementById("detail-modal-body");
  if (!modal || !body) return;

  const umkFormatted = `Rp ${(v.estimatedUmk || 3972202).toLocaleString("id-ID")}`;
  const compInitial = (v.company || "P").substring(0, 2).toUpperCase();

  // Peluang calculation
  let peluangPercent = 100;
  if (v.quota && v.applicants !== undefined) {
    if (v.applicants === 0) {
      peluangPercent = 100;
    } else {
      peluangPercent = Math.min(100, Math.round((v.quota / Math.max(v.quota, v.applicants)) * 100));
    }
  }

  const isPemerintah = v.companyType === "Pemerintah";
  const instansiBadge = isPemerintah ? "Instansi Pemerintah RI" : "Perusahaan Mitra Magang";
  const instansiBadgeClass = isPemerintah
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

  // Interview formats
  const interviewTypes = v.interviewTypes || [];
  const hasOnline = interviewTypes.includes("online");
  const hasOnsite = interviewTypes.includes("onsite");
  let interviewFormatText = "Seleksi Bertahap Sesuai Kebijakan Mitra";
  if (hasOnline && hasOnsite) interviewFormatText = "Daring (Online) & Tatap Muka Langsung (Onsite)";
  else if (hasOnline) interviewFormatText = "Wawancara Online (Google Meet / Zoom / Video Call)";
  else if (hasOnsite) interviewFormatText = "Wawancara Tatap Muka di Kantor / Lokasi Penempatan";

  // Education labels
  const eduLabels = {
    diploma: "Diploma (D3 / D4)",
    bachelor: "Sarjana (S1)",
    master: "Magister (S2)",
    vocational: "SMK / SMA Sederajat",
    profession: "Pendidikan Profesi",
  };
  const eduList = (v.educationLevels || ["diploma", "bachelor"]).map((l) => eduLabels[l] || l.toUpperCase()).join(", ");

  // Published Date formatted
  let publishedDateStr = "Baru ditayangkan";
  if (v.publishedAt) {
    try {
      const d = new Date(v.publishedAt);
      publishedDateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch (_) {}
  }

  body.innerHTML = `
    <!-- Header Identity -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
      <div class="flex items-start gap-3.5 min-w-0">
        <div style="width:58px;height:58px;min-width:58px;min-height:58px;" class="rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
          ${v.logo ? `
            <img src="${v.logo}" alt="${v.company}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'font-extrabold text-slate-700 text-base\\'>${compInitial}</span>';"/>
          ` : `
            <span class="font-extrabold text-slate-700 text-base">${compInitial}</span>
          `}
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">${v.company}</span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${instansiBadgeClass}">
              <span class="material-symbols-outlined text-[13px] text-blue-600">${isPemerintah ? 'account_balance' : 'domain'}</span>
              <span>${instansiBadge}</span>
            </span>
          </div>
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug tracking-tight">${v.title}</h2>
          <p class="text-xs text-slate-500 flex items-center gap-2 mt-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 text-slate-600 font-medium">
              <span class="material-symbols-outlined text-[15px] text-blue-600">location_on</span>
              <span>${v.location || v.city || "Indonesia"}</span>
            </span>
            <span class="text-slate-300">&bull;</span>
            <span class="text-slate-400">Ditayangkan: ${publishedDateStr}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        <button onclick="shareVacancy('${v.id}')" class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer" title="Bagikan">
          <span class="material-symbols-outlined text-[18px]">share</span>
        </button>
        <button onclick="toggleBookmark('${v.id}')" class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors cursor-pointer" title="Simpan">
          <span class="material-symbols-outlined text-[18px] ${state.bookmarks.includes(v.id) ? 'text-blue-600 fill' : ''}">favorite</span>
        </button>
      </div>
    </div>

    <!-- Black, White & Blue 4-Grid Metrics Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <!-- Kuota -->
      <div class="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
        <div class="flex items-center justify-between text-slate-500 mb-1.5">
          <span class="text-[11px] font-bold tracking-wider uppercase text-slate-400">Kuota Posisi</span>
          <span class="material-symbols-outlined text-[17px] text-blue-600">group</span>
        </div>
        <div>
          <div class="text-lg sm:text-xl font-extrabold text-slate-900 leading-none">${v.quota} <span class="text-xs font-semibold text-slate-500">Orang</span></div>
          <span class="text-[11px] text-slate-500 mt-1 block">Dibutuhkan mitra</span>
        </div>
      </div>

      <!-- Pelamar -->
      <div class="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
        <div class="flex items-center justify-between text-slate-500 mb-1.5">
          <span class="text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Pelamar</span>
          <span class="material-symbols-outlined text-[17px] text-slate-400">how_to_reg</span>
        </div>
        <div>
          <div class="text-lg sm:text-xl font-extrabold text-slate-900 leading-none">${v.applicants} <span class="text-xs font-semibold text-slate-500">Berkas</span></div>
          <span class="text-[11px] text-slate-500 mt-1 block">Terdaftar di sistem</span>
        </div>
      </div>

      <!-- Peluang Lolos -->
      <div class="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
        <div class="flex items-center justify-between text-slate-500 mb-1.5">
          <span class="text-[11px] font-bold tracking-wider uppercase text-slate-400">Peluang Lolos</span>
          <span class="material-symbols-outlined text-[17px] text-blue-600">trending_up</span>
        </div>
        <div>
          <div class="text-lg sm:text-xl font-extrabold text-blue-600 leading-none">${peluangPercent}%</div>
          <span class="text-[11px] text-slate-500 font-medium mt-1 block">${peluangPercent >= 50 ? 'Peluang Besar' : 'Persaingan Ketat'}</span>
        </div>
      </div>

      <!-- Uang Saku / UMK -->
      <div class="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
        <div class="flex items-center justify-between text-slate-500 mb-1.5">
          <span class="text-[11px] font-bold tracking-wider uppercase text-slate-400">Est. Uang Saku</span>
          <span class="material-symbols-outlined text-[17px] text-slate-400">payments</span>
        </div>
        <div>
          <div class="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate" title="${umkFormatted}">${umkFormatted}</div>
          <span class="text-[11px] text-slate-500 font-medium mt-1 block">Standar UMK / bln</span>
        </div>
      </div>
    </div>

    <!-- CV Matcher Score Bar (if profile exists) -->
    ${v.matchBreakdown && v.matchBreakdown.length > 0 ? `
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
        <div class="font-medium text-slate-800 mb-2 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-blue-600">verified</span>
            <span class="font-semibold text-slate-900">Kecocokan Profil CV: ${v.matchScore}%</span>
          </span>
          <span class="text-[11px] text-slate-400">Privat di Perangkat</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-1.5 mb-2.5 overflow-hidden">
          <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${v.matchScore}%"></div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${v.matchBreakdown.map((b) => `<span class="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">${b}</span>`).join("")}
        </div>
      </div>
    ` : ''}

    <!-- Clean Monochrome & Blue 2x2 Grid (Metode, Jadwal, Disabilitas, Lokasi) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      
      <!-- Card 1: Metode Interview -->
      <div class="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all flex gap-3.5 items-start shadow-2xs">
        <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
          <span class="material-symbols-outlined text-[20px]">videocam</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metode Interview</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              ${hasOnline && hasOnsite ? 'Hybrid' : (hasOnline ? 'Online / Remote' : (hasOnsite ? 'Tatap Muka' : 'Mitra Selection'))}
            </span>
          </div>
          <p class="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
            ${interviewFormatText}
          </p>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px] text-slate-400">info</span>
            <span>Jadwal interview ditentukan langsung oleh mitra bila lolos berkas.</span>
          </p>
        </div>
      </div>

      <!-- Card 2: Jadwal & Hari Kerja -->
      <div class="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all flex gap-3.5 items-start shadow-2xs">
        <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
          <span class="material-symbols-outlined text-[20px]">calendar_month</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jadwal &amp; Hari Kerja</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              ${v.workingDaysPerWeek ? `${v.workingDaysPerWeek} Hari / Minggu` : '5 Hari Kerja'}
            </span>
          </div>
          <p class="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
            ${v.workingDaysPerWeek ? `${v.workingDaysPerWeek} Hari Kerja per Minggu` : '5 Hari Kerja per Minggu (Senin - Jumat)'}
          </p>
          <p class="text-[11px] text-slate-500 mt-1 leading-normal">
            <span class="font-medium text-slate-700">Hari Libur:</span> ${(() => {
              const dayMap = { sunday: "Minggu", monday: "Senin", tuesday: "Selasa", wednesday: "Rabu", thursday: "Kamis", friday: "Jumat", saturday: "Sabtu" };
              if (v.daysOff && v.daysOff.length) return v.daysOff.map(d => dayMap[d.toLowerCase()] || d).join(" & ");
              return v.workingDaysPerWeek === 6 ? "Minggu" : "Sabtu & Minggu";
            })()}
          </p>
        </div>
      </div>

      <!-- Card 3: Aksesibilitas Disabilitas -->
      <div class="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all flex gap-3.5 items-start shadow-2xs">
        <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[20px]">accessible_forward</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksesibilitas</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              ${v.isDisabilityFriendly ? 'Ramah Disabilitas' : 'Umum'}
            </span>
          </div>
          <p class="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
            ${v.isDisabilityFriendly ? 'Tersedia Fasilitas Khusus Disabilitas' : 'Terbuka untuk Semua Kalangan Mahasiswa'}
          </p>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal">
            ${v.isDisabilityFriendly ? 'Mitra menyediakan akomodasi yang sesuai untuk penyandang disabilitas.' : 'Tidak memerlukan fasilitas mobilitas khusus.'}
          </p>
        </div>
      </div>

      <!-- Card 4: Lokasi Penempatan -->
      <div class="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-all flex gap-3.5 items-start shadow-2xs">
        <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
          <span class="material-symbols-outlined text-[20px]">pin_drop</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lokasi Penempatan</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[150px]">
              ${v.city || 'Indonesia'}
            </span>
          </div>
          <p class="text-xs sm:text-[13px] font-semibold text-slate-900 leading-relaxed break-words">
            ${v.fullAddress || v.location || "Alamat resmi kantor penempatan sesuai data MagangHub."}
          </p>
          ${(v.companyEmail || v.companyPhone) ? `
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px] mt-2 pt-2 border-t border-slate-100">
              ${v.companyEmail ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px] text-slate-400">mail</span><span class="font-medium text-slate-700">${v.companyEmail}</span></span>` : ''}
              ${v.companyPhone ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px] text-slate-400">call</span><span class="font-medium text-slate-700">${v.companyPhone}</span></span>` : ''}
            </div>
          ` : ''}
        </div>
      </div>

    </div>

    <!-- Jenjang Pendidikan & Kualifikasi Jurusan -->
    <div class="border border-slate-200 rounded-xl p-4 bg-white space-y-3.5 shadow-2xs">
      <div>
        <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span class="material-symbols-outlined text-blue-600 text-[18px]">school</span>
          <span>Jenjang Pendidikan yang Diterima</span>
        </div>
        <div class="flex flex-wrap gap-2">
          ${(v.educationLevels && v.educationLevels.length ? v.educationLevels : ["diploma", "bachelor"]).map((lvl) => `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span class="material-symbols-outlined text-[14px] text-blue-600">check_circle</span>
              <span>${eduLabels[lvl] || lvl.toUpperCase()}</span>
            </span>
          `).join("")}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between mb-2.5">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span class="material-symbols-outlined text-blue-600 text-[18px]">category</span>
            <span>Program Studi yang Memenuhi Syarat</span>
          </div>
          <span class="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            ${v.studyPrograms ? v.studyPrograms.length : 0} Jurusan
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${v.studyPrograms && v.studyPrograms.length ? v.studyPrograms.map((p) => `
            <span class="bg-white border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors">${p}</span>
          `).join("") : `<span class="bg-white border border-slate-200 text-slate-500 text-xs px-3 py-1 rounded-lg">Semua Jurusan Terbuka</span>`}
        </div>
      </div>
    </div>

    <!-- Deskripsi Tugas & Tanggung Jawab -->
    <div class="border border-slate-200 rounded-xl p-4 bg-white mb-2 shadow-2xs">
      <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
        <span class="material-symbols-outlined text-slate-600 text-[18px]">description</span>
        <span>Rincian Tugas &amp; Tanggung Jawab</span>
      </div>
      <div class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
        ${(!v.description || v.description.startsWith("$") || v.description.trim().length <= 3)
          ? "Instansi belum mencantumkan rincian tugas spesifik pada portal MagangHub. Keterangan teknis dan lingkup pekerjaan lengkap dapat dikonfirmasi saat proses seleksi wawancara atau dilihat pada tautan resmi Kemnaker."
          : v.description}
      </div>
    </div>
  `;

  // Update fixed footer apply link
  const applyBtn = document.getElementById("detail-modal-apply-btn");
  if (applyBtn) {
    applyBtn.href = v.sourceUrl || "https://maganghub.kemnaker.go.id";
  }

  modal.classList.add("open");
};

window.closeDetailModal = function() {
  const modal = document.getElementById("detail-modal");
  if (modal) modal.classList.remove("open");
};

// =============================================================================
// RADAR MULTI-SEARCH (IT & MULTI-KOTA CEPAT)
// =============================================================================
const IT_ROLE_PRESETS = [
  { id: "web", label: "💻 Web & Software", keywords: ["developer", "programmer", "software engineer", "frontend", "backend"] },
  { id: "devops", label: "☁️ DevOps & Cloud", keywords: ["devops", "cloud", "sysadmin", "infrastructure"] },
  { id: "data", label: "📊 Data & AI", keywords: ["data analyst", "data engineer", "machine learning", "ai"] },
  { id: "support", label: "🛡️ Cyber & Support", keywords: ["it support", "network engineer", "cyber security", "helpdesk"] },
  { id: "mobile", label: "📱 Mobile App", keywords: ["mobile developer", "android", "flutter", "ios"] },
  { id: "uiux", label: "🎨 UI/UX & System", keywords: ["ui/ux", "system analyst", "product design"] },
  { id: "qa", label: "🧪 QA & Tester", keywords: ["qa", "quality assurance", "tester"] },
];

const CITY_CLUSTER_PRESETS = [
  { id: "jkt", label: "🏢 Semua DKI Jakarta", name: "Semua DKI Jakarta" },
  { id: "jbtbk", label: "🏙️ Jabodetabek", name: "Jabodetabek" },
  { id: "bdg", label: "⛰️ Bandung Raya", name: "Bandung Raya" },
  { id: "diy", label: "🎓 Jogja & Sleman", name: "Yogyakarta & Sleman" },
  { id: "sby", label: "🚢 Surabaya & Sidoarjo", name: "Surabaya & Sidoarjo" },
  { id: "smg", label: "🏛️ Semarang & Solo", name: "Semarang & Solo" },
  { id: "bali", label: "🌴 Bali / Denpasar", name: "Bali / Denpasar" },
  { id: "medan", label: "📍 Medan", name: "Kota Medan" },
  { id: "malang", label: "📍 Malang", name: "Kota Malang" },
  { id: "mks", label: "📍 Makassar", name: "Kota Makassar" },
];

window.toggleRadarPanel = function () {
  state.radar.isOpen = !state.radar.isOpen;
  const panel = document.getElementById("radar-panel");
  const chevron = document.getElementById("radar-chevron");
  const label = document.getElementById("radar-toggle-label");
  if (panel) {
    if (state.radar.isOpen) {
      panel.classList.remove("hidden");
      if (chevron) chevron.style.transform = "rotate(180deg)";
      if (label) label.textContent = "Tutup Radar";
    } else {
      panel.classList.add("hidden");
      if (chevron) chevron.style.transform = "rotate(0deg)";
      if (label) label.textContent = "Buka Radar";
    }
  }
};

function initRadarUI() {
  renderRadarRoleChips();
  renderRadarCityChips();
  renderRadarActiveTags();
  updateRadarSummaryText();

  // Custom keyword input listener
  const customKwInput = document.getElementById("radar-custom-keyword-input");
  if (customKwInput) {
    customKwInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = customKwInput.value.replace(/,/g, "").trim();
        if (val) {
          addRadarKeyword(val);
          customKwInput.value = "";
        }
      }
    });
  }
}

function renderRadarRoleChips() {
  const container = document.getElementById("radar-role-chips");
  if (!container) return;

  container.innerHTML = IT_ROLE_PRESETS.map((p) => {
    const isActive = p.keywords.some((k) => state.radar.activeKeywords.includes(k));
    return `
      <button 
        type="button" 
        onclick="toggleITPreset('${p.id}')" 
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          isActive
            ? "bg-blue-600 text-white shadow-xs border border-blue-600"
            : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
        }">
        ${p.label}
      </button>
    `;
  }).join("");
}

function renderRadarCityChips() {
  const container = document.getElementById("radar-city-chips");
  if (!container) return;

  container.innerHTML = CITY_CLUSTER_PRESETS.map((c) => {
    const isActive = state.radar.activeCities.includes(c.name);
    return `
      <button 
        type="button" 
        onclick="toggleCityCluster('${c.name}')" 
        class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          isActive
            ? "bg-indigo-600 text-white shadow-xs border border-indigo-600"
            : "bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
        }">
        ${c.label}
      </button>
    `;
  }).join("");
}

function renderRadarActiveTags() {
  // Keywords tags
  const kwContainer = document.getElementById("radar-keyword-tags");
  if (kwContainer) {
    kwContainer.innerHTML = state.radar.activeKeywords.map((k) => `
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <span>${k}</span>
        <button type="button" onclick="removeRadarKeyword('${k}')" class="hover:text-rose-600 transition-colors cursor-pointer text-sm leading-none">&times;</button>
      </span>
    `).join("");
  }

  // Cities tags
  const cityContainer = document.getElementById("radar-city-tags");
  const emptyHint = document.getElementById("radar-city-empty-hint");
  if (cityContainer) {
    if (state.radar.activeCities.length > 0) {
      if (emptyHint) emptyHint.classList.add("hidden");
      cityContainer.innerHTML = state.radar.activeCities.map((c) => `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <span>${c}</span>
          <button type="button" onclick="removeRadarCity('${c}')" class="hover:text-rose-600 transition-colors cursor-pointer text-sm leading-none">&times;</button>
        </span>
      `).join("");
    } else {
      if (emptyHint) emptyHint.classList.remove("hidden");
      cityContainer.innerHTML = "";
    }
  }

  renderRadarRoleChips();
  renderRadarCityChips();
  updateRadarSummaryText();
}

function updateRadarSummaryText() {
  const kwCountEl = document.getElementById("radar-kw-count");
  const cityCountEl = document.getElementById("radar-city-count");
  const summaryEl = document.getElementById("radar-summary-text");

  const kwLen = state.radar.activeKeywords ? state.radar.activeKeywords.length : 0;
  const cityLen = state.radar.activeCities ? state.radar.activeCities.length : 0;

  if (kwCountEl) kwCountEl.textContent = kwLen || "Semua";
  if (cityCountEl) cityCountEl.textContent = cityLen > 0 ? `${cityLen} Wilayah` : "Semua";

  if (summaryEl) {
    if (kwLen > 0 && cityLen > 0) {
      summaryEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Siap memindai <strong>${kwLen}</strong> kata kunci di <strong>${cityLen}</strong> wilayah terpilih.</span>`;
    } else if (kwLen > 0 && cityLen === 0) {
      summaryEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span><span>Siap memindai <strong>${kwLen}</strong> kata kunci di <strong>Semua</strong> wilayah nasional.</span>`;
    } else if (kwLen === 0 && cityLen > 0) {
      summaryEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span><span>Siap mencari <strong>semua lowongan perusahaan</strong> di <strong>${cityLen}</strong> wilayah terpilih (tanpa batasan kata kunci).</span>`;
    } else {
      summaryEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span>Pilih role kata kunci atau wilayah di atas untuk memulai pencarian.</span>`;
    }
  }
}

window.addRadarKeyword = function (kw) {
  const clean = kw.trim().toLowerCase();
  if (clean && !state.radar.activeKeywords.includes(clean)) {
    state.radar.activeKeywords.push(clean);
    renderRadarActiveTags();
  }
};

window.removeRadarKeyword = function (kw) {
  state.radar.activeKeywords = state.radar.activeKeywords.filter((k) => k !== kw);
  renderRadarActiveTags();
};

window.toggleITPreset = function (presetId) {
  const preset = IT_ROLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  const hasAll = preset.keywords.every((k) => state.radar.activeKeywords.includes(k));
  if (hasAll) {
    state.radar.activeKeywords = state.radar.activeKeywords.filter((k) => !preset.keywords.includes(k));
  } else {
    preset.keywords.forEach((k) => {
      if (!state.radar.activeKeywords.includes(k)) {
        state.radar.activeKeywords.push(k);
      }
    });
  }
  renderRadarActiveTags();
};

window.selectAllITRoles = function () {
  IT_ROLE_PRESETS.forEach((p) => {
    p.keywords.forEach((k) => {
      if (!state.radar.activeKeywords.includes(k)) {
        state.radar.activeKeywords.push(k);
      }
    });
  });
  renderRadarActiveTags();
};

window.clearRadarKeywords = function () {
  state.radar.activeKeywords = [];
  renderRadarActiveTags();
};

window.toggleCityCluster = function (cityName) {
  const idx = state.radar.activeCities.indexOf(cityName);
  if (idx === -1) {
    state.radar.activeCities.push(cityName);
  } else {
    state.radar.activeCities.splice(idx, 1);
  }
  renderRadarActiveTags();
};

window.addCityFromDropdown = function (selectEl) {
  const val = selectEl.value;
  if (val && !state.radar.activeCities.includes(val)) {
    state.radar.activeCities.push(val);
    renderRadarActiveTags();
  }
  selectEl.selectedIndex = 0;
};

window.removeRadarCity = function (cityName) {
  state.radar.activeCities = state.radar.activeCities.filter((c) => c !== cityName);
  renderRadarActiveTags();
};

window.clearRadarCities = function () {
  state.radar.activeCities = [];
  renderRadarActiveTags();
};

window.resetRadarFilters = function () {
  state.radar.activeKeywords = [];
  state.radar.activeCities = [];
  renderRadarActiveTags();
};

function getCitySearchQuery(cityName) {
  const t = (cityName || "").toLowerCase().trim();
  if (t.includes("jakarta") || t.includes("dki")) return "Jakarta";
  if (t.includes("jabodetabek")) return "Jakarta";
  if (t.includes("bandung")) return "Bandung";
  if (t.includes("jogja") || t.includes("yogyakarta") || t.includes("sleman")) return "Yogyakarta";
  if (t.includes("surabaya") || t.includes("sidoarjo")) return "Surabaya";
  if (t.includes("semarang")) return "Semarang";
  if (t.includes("solo") || t.includes("surakarta")) return "Surakarta";
  if (t.includes("bali") || t.includes("denpasar")) return "Denpasar";
  if (t.includes("medan")) return "Medan";
  if (t.includes("malang")) return "Malang";
  if (t.includes("makassar")) return "Makassar";
  return cityName.replace(/^(kota adm\.|kota|kab\.|kabupaten)\s+/i, "").trim();
}

function populateRadarCitySelect() {
  const select = document.getElementById("radar-add-city-select");
  if (!select || !state.regionsData) return;

  select.innerHTML = `<option value="">+ Tambah Kota/Kabupaten Lain...</option>`;
  const allCities = [];
  state.regionsData.forEach((r) => {
    if (r.cities) allCities.push(...r.cities);
  });

  const unique = Array.from(new Set(allCities)).sort();
  unique.forEach((cityName) => {
    const opt = document.createElement("option");
    opt.value = cityName;
    opt.textContent = cityName;
    select.appendChild(opt);
  });
}

function isCityMatch(v, selectedCities) {
  if (!selectedCities || selectedCities.length === 0) return true;
  const loc = (v.location || "").toLowerCase();
  const city = (v.cityName || "").toLowerCase();
  const addr = (v.address || "").toLowerCase();
  const text = `${loc} ${city} ${addr}`;

  return selectedCities.some((target) => {
    const t = target.toLowerCase().trim();
    if (t === "semua dki jakarta" || t === "dki jakarta" || t === "jakarta") {
      return text.includes("jakarta") || text.includes("dki");
    }
    if (t === "jabodetabek") {
      return text.includes("jakarta") || text.includes("bogor") || text.includes("depok") || text.includes("tangerang") || text.includes("bekasi");
    }
    if (t === "bandung raya" || t === "bandung") {
      return text.includes("bandung") || text.includes("cimahi");
    }
    if (t === "yogyakarta & sleman" || t === "yogyakarta" || t === "jogja" || t === "sleman") {
      return text.includes("yogyakarta") || text.includes("jogja") || text.includes("sleman") || text.includes("bantul") || text.includes("diy");
    }
    if (t === "surabaya & sidoarjo" || t === "surabaya") {
      return text.includes("surabaya") || text.includes("sidoarjo") || text.includes("gresik");
    }
    if (t === "semarang & solo" || t === "semarang") {
      return text.includes("semarang") || text.includes("surakarta") || text.includes("solo");
    }
    if (t === "bali / denpasar" || t === "bali") {
      return text.includes("bali") || text.includes("denpasar") || text.includes("badung");
    }
    const cleanT = t.replace(/^(kota adm\.|kota|kab\.|kabupaten)\s+/i, "");
    return text.includes(cleanT);
  });
}

function updateRadarProgress(label, percent) {
  const bar = document.getElementById("radar-progress-bar");
  const percentEl = document.getElementById("radar-progress-percent");
  const labelEl = document.getElementById("radar-progress-label");
  if (bar) bar.style.width = `${percent}%`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (labelEl) labelEl.textContent = label;
}

window.executeRadarSearch = async function () {
  if (state.radar.isScanning) return;

  // Abort any pending standard search or debounce timer
  clearTimeout(searchDebounceTimer);
  if (currentSearchAbortController) {
    currentSearchAbortController.abort();
  }
  const radarRequestId = ++currentSearchRequestId;

  const keywords = state.radar.activeKeywords || [];
  const cities = state.radar.activeCities || [];

  // Determine what queries to run
  let searchQueries = [];
  let isCityOnly = false;

  if (keywords.length > 0) {
    searchQueries = [...keywords];
  } else if (cities.length > 0) {
    // User wants to search strictly by city/wilayah (NO IT keywords forced!)
    isCityOnly = true;
    cities.forEach((c) => {
      const clean = getCitySearchQuery(c);
      if (clean && !searchQueries.includes(clean)) {
        searchQueries.push(clean);
      }
    });
  } else {
    // Neither selected, load normal feed
    state.radar.isRadarActive = false;
    fetchVacancies(1, false, true);
    return;
  }

  state.radar.activeQueries = searchQueries;
  state.radar.radarPage = 1;
  state.radar.isScanning = true;
  state.radar.isRadarActive = true;

  const progressContainer = document.getElementById("radar-progress-bar-container");
  const btnExecute = document.getElementById("btn-execute-radar");
  if (progressContainer) progressContainer.classList.remove("hidden");
  if (btnExecute) {
    btnExecute.disabled = true;
    btnExecute.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px]">sync</span><span>Memindai...</span>`;
  }

  // Only render skeleton if there's no data currently
  if (!state.vacancies || state.vacancies.length === 0) {
    renderSkeleton();
  }

  let rawAllItems = [];
  const total = searchQueries.length;

  for (let i = 0; i < searchQueries.length; i++) {
    if (radarRequestId !== currentSearchRequestId) {
      return;
    }

    const q = searchQueries[i];
    const label = isCityOnly ? `Memindai wilayah '${q}'` : `Memindai kata kunci '${q}'`;
    updateRadarProgress(`${label} (${i + 1}/${total})...`, Math.round(((i + 0.3) / total) * 100));

    try {
      const res = await fetch(`/api/vacancies?keyword=${encodeURIComponent(q)}&page=1`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          rawAllItems.push(...json.items);
        }
      }
    } catch (_) {}
    updateRadarProgress(`Selesai memindai '${q}' (${i + 1}/${total})`, Math.round(((i + 1) / total) * 100));
  }

  if (radarRequestId !== currentSearchRequestId) {
    return;
  }

  // Deduplicate by ID
  const seen = new Set();
  let uniqueItems = [];
  for (const item of rawAllItems) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      uniqueItems.push(item);
    }
  }

  // If user searched for keywords AND cities, filter by city match
  if (!isCityOnly && cities.length > 0) {
    uniqueItems = uniqueItems.filter((item) => isCityMatch(item, cities));
  }

  // Enrich with user match
  state.vacancies = uniqueItems.map(enrichVacancyWithUserMatch);
  state.totalVacancies = state.vacancies.length;
  state.currentPage = 1;
  state.totalPages = Math.max(1, Math.ceil(state.vacancies.length / 18)) + 1;

  if (progressContainer) progressContainer.classList.add("hidden");
  if (btnExecute) {
    btnExecute.disabled = false;
    btnExecute.innerHTML = `<span class="material-symbols-outlined text-[16px]">radar</span><span>Jalankan Radar Multi-Cari</span>`;
  }
  state.radar.isScanning = false;

  // Show active radar banner
  const banner = document.getElementById("active-radar-banner");
  const bannerText = document.getElementById("active-radar-banner-text");
  if (banner && bannerText) {
    const cityText = cities.length > 0 ? cities.join(", ") : "Semua Wilayah";
    if (isCityOnly) {
      bannerText.innerHTML = `Radar Wilayah Aktif: Ditemukan <strong>${state.vacancies.length}</strong> lowongan perusahaan di wilayah [${cityText}] (tanpa batasan kata kunci)`;
    } else {
      bannerText.innerHTML = `Radar IT Aktif: Ditemukan <strong>${state.vacancies.length}</strong> lowongan unik untuk kata kunci [${keywords.slice(0, 5).join(", ")}${keywords.length > 5 ? '...' : ''}] di wilayah [${cityText}]`;
    }
    banner.classList.remove("hidden");
  }

  renderVacancies();
  updatePaginationUI();
  window.scrollTo({ top: 380, behavior: "smooth" });
};

window.loadMoreRadarVacancies = async function () {
  if (state.isLoading) return;
  state.isLoading = true;
  state.radar.radarPage = (state.radar.radarPage || 1) + 1;
  const page = state.radar.radarPage;

  const btnLoadMore = document.getElementById("btn-load-more");
  if (btnLoadMore) {
    btnLoadMore.disabled = true;
    btnLoadMore.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px]">sync</span><span>Memuat lowongan berikutnya...</span>`;
  }

  const queries = state.radar.activeQueries || [];
  const cities = state.radar.activeCities || [];
  const isCityOnly = (state.radar.activeKeywords || []).length === 0;
  let newRawItems = [];

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      const res = await fetch(`/api/vacancies?keyword=${encodeURIComponent(q)}&page=${page}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          newRawItems.push(...json.items);
        }
      }
    } catch (_) {}
  }

  const existingIds = new Set(state.vacancies.map((v) => v.id));
  let newUniqueItems = [];
  for (const item of newRawItems) {
    if (item && item.id && !existingIds.has(item.id)) {
      existingIds.add(item.id);
      newUniqueItems.push(item);
    }
  }

  if (!isCityOnly && cities.length > 0) {
    newUniqueItems = newUniqueItems.filter((item) => isCityMatch(item, cities));
  }

  const enriched = newUniqueItems.map(enrichVacancyWithUserMatch);
  state.vacancies = [...state.vacancies, ...enriched];
  state.totalVacancies = state.vacancies.length;
  state.currentPage = page;
  state.totalPages = page + (newUniqueItems.length > 0 ? 1 : 0);

  renderVacancies();
  updatePaginationUI();
  state.isLoading = false;
};

window.loadRadarPage = async function (targetPage) {
  state.currentPage = targetPage;
  state.radar.radarPage = targetPage;
  executeRadarSearch();
};

window.exitRadarMode = function () {
  state.radar.isRadarActive = false;
  const banner = document.getElementById("active-radar-banner");
  if (banner) banner.classList.add("hidden");
  fetchVacancies(1, false, true);
};
