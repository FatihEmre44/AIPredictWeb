const brain = require('brain.js');
const fs = require('fs');
const path = require('path');

const modelPath = path.join(__dirname, 'models/nba-brain.json');

if (!fs.existsSync(modelPath)) {
    console.error('❌ Hata: Model dosyası bulunamadı! Önce training.js dosyasını çalıştır.');
    process.exit(1);
}

const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const net = new brain.NeuralNetwork();
net.fromJSON(modelData);

const MAX_ELO = 2500;
const MAX_REST = 7;
const MAX_MARGIN = 30; // Must match normalizer scale

const rawMatchData = {
    homeElo: 1606, // Equal strength
    awayElo: 1600,
    homeRestDays: 2,
    awayRestDays: 3,
    homeLast5WinRate: 0.7,
    awayLast5WinRate: 0.6
};

const tonightGame = {
    homeStrength: rawMatchData.homeElo / MAX_ELO,
    awayStrength: rawMatchData.awayElo / MAX_ELO,
    homeRest: Math.min(rawMatchData.homeRestDays / MAX_REST, 1),
    awayRest: Math.min(rawMatchData.awayRestDays / MAX_REST, 1),
    homeForm: rawMatchData.homeLast5WinRate,
    awayForm: rawMatchData.awayLast5WinRate
};

const output = net.run(tonightGame);

// 1. PURE AI output for the point margin (Regression)
const predictedMargin = ((output.expectedMargin * 2) - 1) * MAX_MARGIN;

// 2. PURE AI output for win probability (Classification)
const winProbFactor = output.homeWin; 
const winProb = (winProbFactor * 100).toFixed(1);

console.log(`\n🏀 2026 PLAYOFF ANALİZİ`);
console.log(`-------------------------`);
console.log(`📊 Tahmini Sayı Farkı (AI): ${predictedMargin > 0 ? '+' : ''}${predictedMargin.toFixed(1)} (Ev Sahibi lehine)`);
console.log(`🎯 Ev Sahibi Kazanma İhtimali (AI): %${winProb}`);

if (predictedMargin > 6 && winProbFactor > 0.65) {
    console.log(`🔥 ÖNERİ: Güçlü Ev Sahibi`);
} else if (predictedMargin < -6 && winProbFactor < 0.35) {
    console.log(`🧊 ÖNERİ: Güçlü Deplasman`);
} else {
    console.log(`⚖️ ÖNERİ: Yakın Maç`);
}