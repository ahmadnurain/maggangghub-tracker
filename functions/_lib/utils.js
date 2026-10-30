/**
 * MagangFinder Utilities & Helpers
 */

export function slugify(text) {
  return (text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export function detectCompanyType(name) {
  if (!name) return "Swasta";
  const n = name.toUpperCase();
  if (
    n.includes("KEMENTERIAN") ||
    n.includes("BALAI") ||
    n.includes("DINAS") ||
    n.includes("DIREKTORAT") ||
    n.includes("BADAN") ||
    n.includes("PUSKESMAS") ||
    n.includes("RSUD") ||
    n.includes("SEKRETARIAT") ||
    n.includes("PEMERINTAH") ||
    n.includes("UPTD") ||
    n.includes("LEMBAGA") ||
    n.includes("BIRO")
  ) {
    return "Pemerintah";
  }
  if (
    n.includes("PERSERO") ||
    n.includes("BUMN") ||
    n.includes("TELKOM") ||
    n.includes("PLN") ||
    n.includes("PERTAMINA") ||
    n.includes("BANK NEGARA INDONESIA") ||
    n.includes("BANK RAKYAT INDONESIA") ||
    n.includes("BANK MANDIRI") ||
    n.includes("BANK SYARIAH INDONESIA") ||
    n.includes("BPJS") ||
    n.includes("KERETA API") ||
    n.includes("POS INDONESIA")
  ) {
    return "BUMN";
  }
  return "Swasta";
}

export function formatRupiah(number) {
  if (!number || isNaN(number)) return "Sesuai Kebijakan";
  return "Rp " + Math.round(number).toLocaleString("id-ID");
}

export function extractSkills(text) {
  if (!text) return [];
  const knownKeywords = [
    "javascript", "typescript", "python", "php", "golang", "java", "c#", "c++",
    "html", "css", "react", "vue", "angular", "next.js", "node.js", "express",
    "laravel", "django", "fastapi", "spring boot", "flutter", "react native",
    "sql", "mysql", "postgresql", "mongodb", "redis", "docker", "kubernetes",
    "git", "linux", "aws", "gcp", "azure", "figma", "ui/ux", "photoshop", "illustrator",
    "excel", "word", "powerpoint", "canva", "copywriting", "social media", "seo",
    "accounting", "pajak", "audit", "hr", "recruitment", "public speaking", "content creator",
    "data analyst", "data science", "tableau", "power bi", "machine learning", "rest api"
  ];

  const lower = text.toLowerCase();
  const matched = [];
  for (const kw of knownKeywords) {
    const rx = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (rx.test(lower)) {
      matched.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  }
  return matched;
}
