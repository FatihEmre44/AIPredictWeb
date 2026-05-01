const MAX_ELO = 2500;
const MAX_REST = 7;
const MAX_MARGIN = 30; // Must match predictor.js scale

function normalize(game) {
    if (typeof game.homeScore !== 'number' || typeof game.awayScore !== 'number') {
        return null;
    }

    // Normalizing inputs (0 to 1)
    const input = {
        homeStrength: (game.homeElo || 1500) / MAX_ELO,
        awayStrength: (game.awayElo || 1500) / MAX_ELO,
        homeRest: Math.min((game.homeRestDays || 0) / MAX_REST, 1),
        awayRest: Math.min((game.awayRestDays || 0) / MAX_REST, 1),
        homeForm: game.homeLast5WinRate || 0,
        awayForm: game.awayLast5WinRate || 0
    };

    // Calculate real margin
    const margin = game.homeScore - game.awayScore;
    
    // Scale margin to a 0.0 - 1.0 range
    let normalizedMargin = (margin / MAX_MARGIN + 1) / 2;
    // Clamp values between 0 and 1 to prevent neural network errors
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