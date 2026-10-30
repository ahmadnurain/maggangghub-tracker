#!/usr/bin/env python3
"""
MagangHub Kemnaker Vacancy & Quota Tracker
Mengakses data lowongan, kuota disetujui (approvedQuantity), dan jumlah pendaftar (totalApplications).
"""
import json
import urllib.request
from typing import Any, Dict, List, Optional

SERVER_ACTION_ID = "4042e54ac927b18cee0deb2e4ec2ecee4980c12ec1"
ENDPOINT_URL = "https://maganghub.kemnaker.go.id/magang-nasional/lowongan"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/x-component",
    "Next-Action": SERVER_ACTION_ID,
    "Content-Type": "text/plain;charset=UTF-8",
    "Referer": "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
    "Origin": "https://maganghub.kemnaker.go.id",
}


def fetch_vacancies(
    keyword: str = "",
    page: int = 1,
    sort: str = "least_applicants",  # 'least_applicants', 'best_chance', 'most_applicants'
    timeout: int = 15,
) -> Dict[str, Any]:
    """Menembak endpoint Next.js Server Action MagangHub untuk mengambil lowongan & status kuota."""
    # ponytail: parse manual RSC flight chunk 1:{"data":...}, upgrade ke full RSC parser jika format berubah
    params: Dict[str, Any] = {"page": page, "sort": sort}
    if keyword:
        params["keyword"] = keyword

    payload = json.dumps([params]).encode("utf-8")
    req = urllib.request.Request(ENDPOINT_URL, data=payload, headers=HEADERS, method="POST")

    with urllib.request.urlopen(req, timeout=timeout) as resp:
        text = resp.read().decode("utf-8")

    marker = '1:{"data":'
    idx = text.find(marker)
    if idx == -1:
        raise ValueError("Data lowongan tidak ditemukan di dalam response MagangHub.")

    json_str = text[idx + 2 :].split("\n")[0]
    return json.loads(json_str)


def display_vacancies(result: Dict[str, Any], max_display: int = 10) -> None:
    meta = result.get("meta", {})
    items = result.get("data", [])

    print(f"\n{'='*70}")
    print(f"Total Lowongan Ditemukan : {meta.get('total', 0)}")
    print(f"Halaman                 : {meta.get('currentPage', 1)} / {meta.get('lastPage', 1)}")
    print(f"{'='*70}\n")

    for i, job in enumerate(items[:max_display], 1):
        posisi = job.get("positionName", "-")
        perusahaan = job.get("organizer", {}).get("name", "-")
        kuota = job.get("approvedQuantity", 0)
        pelamar = job.get("totalApplications", 0)
        peluang_skor = job.get("competitiveScore", 0)
        kota = job.get("city", {}).get("name", "-") if isinstance(job.get("city"), dict) else (job.get("city") or "-")
        job_id = job.get("id", "")
        link = f"https://maganghub.kemnaker.go.id/magang-nasional/lowongan/{job_id}"

        # Perhitungan rasio
        status_kuota = "PENUH" if (kuota > 0 and pelamar >= kuota) else "TERSEDIA"

        print(f"[{i}] {posisi}")
        print(f"    Perusahaan    : {perusahaan}")
        print(f"    Lokasi        : {kota}")
        print(f"    Kuota Disetujui: {kuota} orang")
        print(f"    Jumlah Pelamar: {pelamar} orang ({status_kuota})")
        print(f"    Skor Peluang  : {peluang_skor}%")
        print(f"    Link Detail   : {link}\n")


if __name__ == "__main__":
    import sys

    kw = sys.argv[1] if len(sys.argv) > 1 else "backend"
    print(f"Mencari lowongan dengan kata kunci: '{kw}'...")
    res = fetch_vacancies(keyword=kw, page=1)
    display_vacancies(res)
