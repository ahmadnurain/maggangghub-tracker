/**
 * Eligibility & Smart Profile Matcher
 * Can be run both on server and on frontend.
 */

export function checkEligibility(profile, vacancy) {
  if (!profile || (!profile.education && !profile.studyProgram)) {
    return { status: "UNKNOWN", reason: "Profil belum diisi lengkap" };
  }

  // 1. Check Jenjang Pendidikan
  if (profile.education && vacancy.educationLevels && vacancy.educationLevels.length > 0) {
    const userEdu = profile.education.toLowerCase();
    const isEduMatch = vacancy.educationLevels.some((lvl) => {
      const l = (lvl || "").toLowerCase();
      if (userEdu.includes("s1") || userEdu.includes("sarjana")) return l.includes("bachelor") || l.includes("sarjana");
      if (userEdu.includes("d3") || userEdu.includes("d4") || userEdu.includes("diploma")) return l.includes("diploma") || l.includes("vokasi");
      if (userEdu.includes("s2") || userEdu.includes("magister")) return l.includes("master") || l.includes("magister");
      if (userEdu.includes("profesi")) return l.includes("profession") || l.includes("profesi");
      return l.includes(userEdu);
    });

    if (!isEduMatch) {
      return { status: "NOT_ELIGIBLE", reason: "Jenjang pendidikan tidak sesuai kualifikasi" };
    }
  }

  // 2. Check Program Studi
  if (profile.studyProgram && vacancy.studyPrograms && vacancy.studyPrograms.length > 0) {
    const userProdi = profile.studyProgram.toLowerCase().trim();
    // Jika lowongan terbuka untuk semua jurusan
    const allowsAll = vacancy.studyPrograms.some((sp) => {
      const name = (typeof sp === "string" ? sp : sp.name || "").toLowerCase();
      return name.includes("semua jurusan") || name.includes("semua program studi") || name.includes("umum");
    });

    if (allowsAll) {
      return { status: "ELIGIBLE", reason: "Terbuka untuk semua jurusan" };
    }

    const isProdiMatch = vacancy.studyPrograms.some((sp) => {
      const name = (typeof sp === "string" ? sp : sp.name || "").toLowerCase();
      return name.includes(userProdi) || userProdi.includes(name);
    });

    if (!isProdiMatch) {
      return { status: "NOT_ELIGIBLE", reason: `Jurusan ${profile.studyProgram} tidak tercantum pada kualifikasi lowongan` };
    }
  }

  return { status: "ELIGIBLE", reason: "Memenuhi syarat kualifikasi" };
}

export function calculateMatchScore(profile, vacancy) {
  if (!profile) return { score: 0, breakdown: {}, explanations: [] };

  let skillPoints = 0;
  let prodiPoints = 0;
  let keywordPoints = 0;
  let locPoints = 0;
  let eduPoints = 0;
  const explanations = [];

  // 1. Skill Match (Max 40%)
  const userSkills = (profile.skills || []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  const targetText = [
    vacancy.title || vacancy.positionName || "",
    vacancy.description || "",
    vacancy.curriculum || "",
    vacancy.requirements || "",
    ...(vacancy.skills || []),
  ].join(" ").toLowerCase();

  let matchedSkills = [];
  let missingSkills = [];

  if (userSkills.length > 0) {
    userSkills.forEach((skill) => {
      const rx = new RegExp(`\\b${skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (rx.test(targetText)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    const skillRatio = matchedSkills.length / userSkills.length;
    skillPoints = Math.round(skillRatio * 40);

    matchedSkills.slice(0, 4).forEach((s) => explanations.push({ type: "match", text: `Skill '${s}' ditemukan di deskripsi tugas` }));
    missingSkills.slice(0, 2).forEach((s) => explanations.push({ type: "gap", text: `Skill '${s}' belum tertera di kualifikasi` }));
  }

  // 2. Program Studi Match (Max 25%)
  if (profile.studyProgram && vacancy.studyPrograms && vacancy.studyPrograms.length > 0) {
    const userProdi = profile.studyProgram.toLowerCase().trim();
    const hasProdi = vacancy.studyPrograms.some((sp) => {
      const name = (typeof sp === "string" ? sp : sp.name || "").toLowerCase();
      return name.includes(userProdi) || userProdi.includes(name) || name.includes("semua jurusan");
    });
    if (hasProdi) {
      prodiPoints = 25;
      explanations.push({ type: "match", text: `Program studi sesuai (${profile.studyProgram})` });
    }
  }

  // 3. Job / Experience Keyword (CV text) (Max 20%)
  if (profile.cvText) {
    const cv = profile.cvText.toLowerCase();
    const pos = (vacancy.title || vacancy.positionName || "").toLowerCase();
    const posWords = pos.split(/\s+/).filter((w) => w.length > 2);
    let matchWordCount = 0;
    posWords.forEach((w) => {
      if (cv.includes(w)) matchWordCount++;
    });

    if (posWords.length > 0) {
      const ratio = matchWordCount / posWords.length;
      keywordPoints = Math.round(ratio * 20);
      if (ratio > 0.5) explanations.push({ type: "match", text: `Keyword posisi relevan dengan teks CV Anda` });
    }
  }

  // 4. Location Preference (Max 10%)
  if (profile.city || profile.province) {
    const vacCity = (vacancy.city || vacancy.location || "").toLowerCase();
    const vacProv = (vacancy.province || "").toLowerCase();
    if (profile.city && vacCity.includes(profile.city.toLowerCase())) {
      locPoints = 10;
      explanations.push({ type: "match", text: `Lokasi sesuai domisili (${profile.city})` });
    } else if (profile.province && vacProv.includes(profile.province.toLowerCase())) {
      locPoints = 6;
      explanations.push({ type: "match", text: `Satu provinsi dengan domisili` });
    }
  }

  // 5. Jenjang (Max 5%)
  if (profile.education && vacancy.educationLevels && vacancy.educationLevels.length > 0) {
    eduPoints = 5;
  }

  const totalScore = Math.min(100, Math.max(0, skillPoints + prodiPoints + keywordPoints + locPoints + eduPoints));

  return {
    score: totalScore,
    breakdown: {
      skill: skillPoints,
      prodi: prodiPoints,
      keyword: keywordPoints,
      location: locPoints,
      education: eduPoints,
    },
    explanations,
  };
}
