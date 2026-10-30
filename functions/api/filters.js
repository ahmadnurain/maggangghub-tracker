/**
 * Endpoint: GET /api/filters
 * Returns Master Data for regions, study programs, and education levels
 */
import regions from "../../data/regions.json" assert { type: "json" };
import studyPrograms from "../../data/study-programs.json" assert { type: "json" };
import education from "../../data/education.json" assert { type: "json" };

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
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
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400"
      }
    }
  );
}
