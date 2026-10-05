exports.handler = async function (event, context) {
  // Hanya izinkan method POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Ambil data yang dikirim dari frontend
    const { soal, kunciJawaban, jawabanUser } = JSON.parse(event.body);

    if (!jawabanUser || jawabanUser.trim() === "") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          skor: 0,
          isCorrect: false,
          alasan: "Jawaban kosong.",
        }),
      };
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const prompt = `Kamu adalah penilai ujian otomatis untuk materi Pramuka/Sekolah yang adil dan teliti.

Soal: "${soal}"
Kunci Jawaban / Acuan: "${kunciJawaban}"
Jawaban Siswa: "${jawabanUser}"

Tugas Koreksi:
1. Analisis apakah Jawaban Siswa secara esensi/konsep SUDAH BENAR sesuai Kunci Jawaban.
2. Toleransi jika ada perbedaan susunan kata, sinonim kata (misal: "membuat" = "memasang"), atau kesalahan ketik kecil (typo).
3. Berikan output HANYA JSON baku tanpa format markdown tambahan:
{
  "skor": <angka 0 sampai 100>,
  "isCorrect": <true jika skor >= 70, false jika < 70>,
  "alasan": "<penjelasan singkat maksimal 1-2 kalimat kenapa benar/salah>"
}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const hasilEvaluasi = JSON.parse(rawText);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hasilEvaluasi),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        skor: 0,
        isCorrect: false,
        alasan: "Sistem AI sedang bermasalah, silakan coba lagi.",
      }),
    };
  }
};
