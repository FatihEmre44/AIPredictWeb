const MAX_ELO = 2500;
const MAX_REST = 7;
const MAX_MARGIN = 30;
const MAX_RATING = 140;
const MAX_PACE = 120;

function normalize(game) {
    // Girdileri her halükarda normalize et (Hem eğitim hem tahmin için)
    const input = {
        homeStrength: (game.homeElo || 1500) / MAX_ELO,
        awayStrength: (game.awayElo || 1500) / MAX_ELO,
        homeRest: Math.min((game.homeRestDays || 0) / MAX_REST, 1),
        awayRest: Math.min((game.awayRestDays || 0) / MAX_REST, 1),
        homeForm: game.homeLast5WinRate || 0,
        awayForm: game.awayLast5WinRate || 0,
        homeOffRating: Math.min((game.homeOffRating || 110) / MAX_RATING, 1),
        homeDefRating: Math.min((game.homeDefRating || 110) / MAX_RATING, 1),
        homePace: Math.min((game.homePace || 98) / MAX_PACE, 1),
        homeEfg: Math.min(game.homeEfg || 0.52, 1),
        homeTov: Math.min(game.homeTov || 0.14, 1),
        homeOrb: Math.min(game.homeOrb || 0.25, 1),
        homeDrb: Math.min(game.homeDrb || 0.75, 1),
        awayOffRating: Math.min((game.awayOffRating || 110) / MAX_RATING, 1),
        awayDefRating: Math.min((game.awayDefRating || 110) / MAX_RATING, 1),
        awayPace: Math.min((game.awayPace || 98) / MAX_PACE, 1),
        awayEfg: Math.min(game.awayEfg || 0.52, 1),
        awayTov: Math.min(game.awayTov || 0.14, 1),
        awayOrb: Math.min(game.awayOrb || 0.25, 1),
        awayDrb: Math.min(game.awayDrb || 0.75, 1)
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