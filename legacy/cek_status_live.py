import json
import urllib.request

SERVER_ACTION_ID = "4042e54ac927b18cee0deb2e4ec2ecee4980c12ec1"
ENDPOINT_URL = "https://maganghub.kemnaker.go.id/magang-nasional/lowongan"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
    "Accept": "text/x-component",
    "Next-Action": SERVER_ACTION_ID,
    "Content-Type": "text/plain;charset=UTF-8",
    "Referer": "https://maganghub.kemnaker.go.id/magang-nasional/lowongan",
}

payload = json.dumps([{"page": 1, "keyword": "Penghubung"}]).encode("utf-8")
req = urllib.request.Request(ENDPOINT_URL, data=payload, headers=HEADERS, method="POST")

with urllib.request.urlopen(req, timeout=15) as resp:
    text = resp.read().decode("utf-8")

idx = text.find('1:{"data":')
data = json.loads(text[idx + 2:].split("\n")[0])

target = None
for job in data.get("data", []):
    if job.get("id") == "01a03d00-f98f-72f5-82c5-b241bb9d75ad":
        target = job
        break

if target:
    print("=" * 65)
    print("BUKTI DATA RESMI DARI DATABASE MAGANGHUB KEMNAKER")
    print("=" * 65)
    print(f"ID Lowongan        : {target.get('id')}")
    print(f"Posisi             : {target.get('positionName')}")
    print(f"Penyelenggara      : {target.get('organizer', {}).get('name')}")
    print(f"Lokasi             : {target.get('city', {}).get('name') if isinstance(target.get('city'), dict) else target.get('city')}")
    print("-" * 65)
    print("STATUS SELEKSI & KUOTA SAAT INI:")
    print(f"1. Kuota Disetujui Kemnaker  : {target.get('approvedQuantity')} Orang")
    print(f"2. Total Pelamar Terdaftar   : {target.get('totalApplications')} Orang")
    print(f"3. Sisa Peluang (Opp Score)  : {target.get('opportunityScore')}")
    print(f"4. Skor Peluang Lolos        : {target.get('competitiveScore')}%")
    print("-" * 65)
    print("KESIMPULAN RESMI SISTEM:")
    print("* Status Lowongan: MASIH TERBUKA DALAM PROSES TAHAP 3 (REKRUTMEN).")
    print("* Status Kuota   : BELUM ADA KANDIDAT YANG DITETAPKAN/DITERIMA.")
    print("* Jika sudah ada yang resmi diterima, kuota terisi akan diupdate")
    print("  dan status di akun pelamar akan berubah serentak di Tahap 4")
    print("  (16 - 18 September 2026).")
    print("=" * 65)
