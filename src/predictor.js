const brain = require('brain.js');
const fs = require('fs');
const path = require('path');
const { nbaEloList } = require('./stats');
const { normalize } = require('./proces/normalizer');

// 1. Eğitilmiş modeli yükle
const modelPath = path.join(__dirname, 'models', 'nba-brain.json');
const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

const net = new brain.NeuralNetwork();
net.fromJSON(modelData);

// 2. Tahmin Fonksiyonu
const predictMatch = (homeTeam, awayTeam, homeLast5, awayLast5, homeRest, awayRest) => {
    // 1. Veriyi hazırla
    const rawInput = {
        homeElo: nbaEloList[homeTeam] || 1500,
        awayElo: nbaEloList[awayTeam] || 1500,
        homeLast5WinRate: homeLast5,
        awayLast5WinRate: awayLast5,
        homeRestDays: homeRest,
        awayRestDays: awayRest
    };

    // 2. Normalize et
    const input = normalize(rawInput);

    // 3. KRİTİK KONTROL: Eğer input null ise hatayı yakala
    if (!input) {
        console.error(`❌ Hata: ${homeTeam} veya ${awayTeam} için veriler normalize edilemedi. Lütfen girdi değerlerini kontrol et.`);
        return;
    }

    // 4. Modeli çalıştır
    try {
        const output = net.run(input);
        
        console.log(`\n🏀 ${homeTeam} vs ${awayTeam}`);
        console.log(`📈 Ev Sahibi Galibiyet Olasılığı: %${(output.homeWin * 100).toFixed(2)}`);
    } catch (err) {
        console.error("❌ Tahmin sırasında bir hata oluştu:", err.message);
    }
};

// ÖRNEK TEST:
// Lakers vs Celtics maçı olsun.
// Lakers evinde, son 5 maçta %80 galibiyet, 3 gün dinlenmiş.
// Celtics deplasmanda, son 5 maçta %40 galibiyet, 1 gün dinlenmiş.
predictMatch("Miami Heat", "Golden State Warriors", 0.6, 0.8, 1, 1);