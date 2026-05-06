const MAX_ELO = 2500;
const MAX_REST = 7;
const MAX_MARGIN = 30;

function normalize(game) {
    // Girdileri her halükarda normalize et (Hem eğitim hem tahmin için)
    const input = {
        homeStrength: (game.homeElo || 1500) / MAX_ELO,
        awayStrength: (game.awayElo || 1500) / MAX_ELO,
        homeRest: Math.min((game.homeRestDays || 0) / MAX_REST, 1),
        awayRest: Math.min((game.awayRestDays || 0) / MAX_REST, 1),
        homeForm: game.homeLast5WinRate || 0,
        awayForm: game.awayLast5WinRate || 0
    };

    // --- KRİTİK DÜZELTME BAŞLANGICI ---
    // Eğer skorlar yoksa (Tahmin/Predictor modu), sadece input'u döndür
    if (typeof game.homeScore !== 'number' || typeof game.awayScore !== 'number') {
        return input; 
    }
    // --- KRİTİK DÜZELTME BİTİŞİ ---

    // Eğer kod buraya gelmişse skorlar vardır (Eğitim/Training modu)
    const margin = game.homeScore - game.awayScore;
    let normalizedMargin = (margin / MAX_MARGIN + 1) / 2;
    normalizedMargin = Math.max(0, Math.min(1, normalizedMargin));

    return {
        input,
        output: { 
            expectedMargin: normalizedMargin,
            homeWin: margin > 0 ? 1 : 0
        }
    };
}

module.exports = { normalize };