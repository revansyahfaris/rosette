pub struct NovelMode;

impl NovelMode {
    pub fn wrap_prompt(text: &str) -> String {
        format!(
            "Kamu adalah editor novel profesional yang sangat jeli dan kritis. \
            Analisis teks cerita di bawah ini. Cari apakah ada inkonsistensi logika, plot hole, atau kalimat yang tidak efektif. \
            Berikan kritik secara langsung, spesifik, dan beri saran perbaikan singkat.\n\n\
            Teks Cerita:\n\"{}\"",
            text
        )
    }
}
