const brain = require('brain.js');
const fs = require('fs');
const path = require('path');
const { nbaEloList } = require('./stats');
const { normalize } = require('./proces/normalizer');

// 1. Model ve Veri Yollarını Tanımla
const modelPath = path.join(__dirname, 'models', 'nba-brain.json');
const dataPath = path.join(__dirname, 'scraper', 'data.json');

// 2. Eğitilmiş Modeli Yükle
if (!fs.existsSync(modelPath)) {
    console.error("❌ Model dosyası bulunamadı! Önce training.js'i çalıştır.");
    process.exit(1);
}

const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
const net = new brain.NeuralNetwork();
net.fromJSON(modelData);

// 3. Güncel Takım İstatistiklerini data.json'dan Çeken Fonksiyon
const getLatestTeamStats = (teamName) => {
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    // Bu takıma ait en güncel veriyi bul (Scraper'ın eklediği homeStats/awayStats)
    const lastGame = rawData.reverse().find(m => 
        (m.homeTeam === teamName || m.awayTeam === teamName || m.homeStats?.teamName === teamName || m.awayStats?.teamName === teamName) && m.homeStats
    );

    if (!lastGame) {
        console.log(`⚠️ Uyarı: ${teamName} için güncel veri bulunamadı, default değerler kullanılıyor.`);
        return { offRating: 110, defRating: 110, pace: 98, efg: 0.52, tov: 0.14, orb: 0.25, drb: 0.75 };
    }
    
    if (lastGame.homeTeam === teamName || lastGame.homeStats?.teamName === teamName) {
        return lastGame.homeStats;
    }
    return lastGame.awayStats;
};

// 4. Tahmin Fonksiyonu
const predictMatch = (homeTeam, awayTeam, homeRest = 2, awayRest = 2, homeForm = 0.5, awayForm = 0.5) => {
    // Takımların güncel reytinglerini otomatik çek
    const hStats = getLatestTeamStats(homeTeam);
    const aStats = getLatestTeamStats(awayTeam);

    const gameData = {
        homeElo: nbaEloList[homeTeam] || 1500,
        awayElo: nbaEloList[awayTeam] || 1500,
        homeOffRating: hStats.offRating,
        homeDefRating: hStats.defRating,
        homePace: hStats.pace,
        homeEfg: hStats.efg,
        homeTov: hStats.tov,
        homeOrb: hStats.orb,
        homeDrb: hStats.drb,
        awayOffRating: aStats.offRating,
        awayDefRating: aStats.defRating,
        awayPace: aStats.pace,
        awayEfg: aStats.efg,
        awayTov: aStats.tov,
        awayOrb: aStats.orb,
        awayDrb: aStats.drb,
        homeRestDays: homeRest,
        awayRestDays: awayRest,
        homeLast5WinRate: homeForm,
        awayLast5WinRate: awayForm
    };

    const input = normalize(gameData);
    const output = net.run(input);

    console.log(`\n🏀 ${homeTeam} vs ${awayTeam}`);
    console.log(`-----------------------------------`);
    console.log(`📊 Ev Sahibi Gücü (Rating): ${hStats.offRating.toFixed(1)} / ${hStats.defRating.toFixed(1)}`);
    console.log(`📊 Deplasman Gücü (Rating): ${aStats.offRating.toFixed(1)} / ${aStats.defRating.toFixed(1)}`);
    console.log(`📈 Tahmin: %${(output.homeWin * 100).toFixed(2)} ihtimalle ${homeTeam} kazanır.`);
};

// --- CLI KULLANIMI ---
// node src/predictor.js "Los Angeles Lakers" "Golden State Warriors" 3 1 0.6 0.4
const args = process.argv.slice(2);
if (args.length >= 2) {
    const homeTeam = args[0];
    const awayTeam = args[1];
    const homeRest = args[2] ? Number(args[2]) : 2;
    const awayRest = args[3] ? Number(args[3]) : 2;
    const homeForm = args[4] ? Number(args[4]) : 0.5;
    const awayForm = args[5] ? Number(args[5]) : 0.5;
    predictMatch(homeTeam, awayTeam, homeRest, awayRest, homeForm, awayForm);
} else {
    // Varsayilan ornekler
    predictMatch("Los Angeles Lakers", "Golden State Warriors", 3, 1, 0.6, 0.4);
    predictMatch("Boston Celtics", "Miami Heat", 2, 2, 0.8, 0.5);
}