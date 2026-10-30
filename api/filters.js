import fs from "node:fs";
import path from "node:path";

export default function handler(req, res) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    const regions = JSON.parse(fs.readFileSync(path.join(dataDir, "regions.json"), "utf-8"));
    const studyPrograms = JSON.parse(fs.readFileSync(path.join(dataDir, "study-programs.json"), "utf-8"));
    const education = JSON.parse(fs.readFileSync(path.join(dataDir, "education.json"), "utf-8"));

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, s-maxage=86400, max-age=86400");
    return res.status(200).json({
      success: true,
      data: {
        regions,
        studyPrograms,
        education,
        companyTypes: ["Pemerintah", "Perusahaan"],
        sortOptions: [
          { value: "least_applicants", label: "Pelamar Terendah" },
          { value: "most_applicants", label: "Pelamar Tertinggi" },
          { value: "most_quota", label: "Kuota Tertinggi" },
          { value: "least_quota", label: "Kuota Terendah" },
          { value: "highest_salary", label: "Gaji Tertinggi" },
          { value: "lowest_salary", label: "Gaji Terendah" },
          { value: "latest", label: "Lowongan Terbaru" }
        ]
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
