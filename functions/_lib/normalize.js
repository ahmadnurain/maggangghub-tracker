/**
 * Vacancy Normalization Layer
 * Maps raw MagangHub API / Next.js Server Action objects to Normalized Vacancy Schema
 */
import { detectCompanyType, extractSkills } from "./utils.js";
import { calculateApplicantsPerSlot, getCompetitionCategory } from "./scoring.js";

export function normalizeVacancy(raw, minimumWages = {}) {
  if (!raw) return null;

  const id = raw.id || raw.externalId || "";
  const title = raw.positionName || raw.posisi || raw.title || "Lowongan Magang";
  
  // Organizer / Company
  const org = raw.organizer || raw.company || {};
  const company = typeof org === "string" ? org : (org.name || org.namaPerusahaan || "Penyelenggara Magang");
  const isGov = (org.organizableType && org.organizableType !== "company") || detectCompanyType(company) === "Pemerintah";
  const companyType = isGov ? "Pemerintah" : "Perusahaan";
  const logo = org.logoUrl || org.logo || null;

  // Location
  const cityObj = raw.city || {};
  const cityName = typeof cityObj === "string" ? cityObj : (cityObj.name || raw.penempatan || "-");
  const provObj = raw.province || {};
  const provName = typeof provObj === "string" ? provObj : (provObj.name || "");
  const location = provName ? `${cityName}, ${provName}` : cityName;

  // Quota & Applicants
  const quota = Number(raw.approvedQuantity ?? raw.jumlahKuota ?? 1);
  const applicants = Number(raw.totalApplications ?? raw.jumlahTerdaftar ?? 0);
  const applicantsPerSlot = calculateApplicantsPerSlot(applicants, quota);
  const competition = getCompetitionCategory(applicantsPerSlot);

  // Education & Study Programs
  let educationLevels = [];
  if (Array.isArray(raw.educationLevels)) {
    educationLevels = raw.educationLevels;
  } else if (raw.jenjangValues) {
    try { educationLevels = JSON.parse(raw.jenjangValues); } catch (_) {}
  } else if (raw.jenjangTitles) {
    educationLevels = raw.jenjangTitles.split(",").map(s => s.trim());
  }

  let studyPrograms = [];
  if (Array.isArray(raw.studyPrograms)) {
    studyPrograms = raw.studyPrograms.map(sp => (typeof sp === "string" ? sp : (sp.name || sp.title || ""))).filter(Boolean);
  } else if (raw.studyProgramValues) {
    try {
      studyPrograms = JSON.parse(raw.studyProgramValues).map(sp => sp.name || sp.title || "");
    } catch (_) {}
  } else if (raw.programStudiTitles) {
    studyPrograms = raw.programStudiTitles.split(",").map(s => s.trim()).filter(Boolean);
  }

  // Description & Curriculum (sanitizing Next.js internal RSC markers like "$2", "$3")
  const rawDesc = raw.taskDescription || raw.deskripsiPosisi || raw.description || "";
  let description = "";
  if (typeof rawDesc === "string" && !rawDesc.trim().startsWith("$") && rawDesc.trim().length > 3) {
    description = rawDesc.trim();
  }
  let curriculum = "";
  if (Array.isArray(raw.curriculums)) {
    curriculum = raw.curriculums.map(c => (typeof c === "string" ? c : c.title || "")).filter(Boolean).join(", ");
  }

  // Interview & Working Conditions
  const interviewTypes = Array.isArray(raw.interviewTypes) ? raw.interviewTypes : [];
  const workingDaysPerWeek = raw.workingDaysPerWeek ? Number(raw.workingDaysPerWeek) : null;
  const daysOff = Array.isArray(raw.daysOff) ? raw.daysOff : [];
  const isDisabilityFriendly = Boolean(raw.isDisabilityFriendly);
  const fullAddress = raw.address || org.address || "";
  const companyEmail = org.email || "";
  const companyPhone = org.phone || "";
  
  // Clean company description (avoiding Next.js internal RSC markers like "$2", "$3")
  let companyDescription = "";
  if (typeof org.description === "string" && !org.description.startsWith("$")) {
    companyDescription = org.description.trim();
  }

  // Skills
  const skills = extractSkills(`${title} ${description} ${curriculum}`);

  // UMK
  const estimatedUmk = minimumWages[cityName] || minimumWages["default"] || 3000000;

  // Direct URL
  const sourceUrl = `https://maganghub.kemnaker.go.id/magang-nasional/lowongan/${id}`;

  return {
    id,
    title,
    company,
    companyType,
    logo,
    companyDescription,
    companyEmail,
    companyPhone,
    province: provName,
    city: cityName,
    location,
    fullAddress,
    quota,
    applicants,
    applicantsPerSlot,
    competition,
    sourceCompetitiveScore: raw.competitiveScore ?? null,
    educationLevels,
    studyPrograms,
    interviewTypes,
    workingDaysPerWeek,
    daysOff,
    isDisabilityFriendly,
    skills,
    description,
    curriculum,
    requirements: raw.syaratKhusus || "",
    estimatedUmk,
    sourceUrl,
    publishedAt: raw.publishedAt || raw.tanggalTayang || raw.createdAt || null,
    fetchedAt: new Date().toISOString(),
  };
}
