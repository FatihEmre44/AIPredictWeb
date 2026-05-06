const fs = require('fs');
const path = require('path');
const brain = require('brain.js');
const { nbaEloList } = require('./stats');; // Doğru: Bir üst klasöre çık ve dosyayı bul
const { normalize } = require('./proces/normalizer'); // Doğru: Bulunduğun yerdeki proces klasörüne gir Direkt yanındaki proces klasörüne gir

// Veri yolu (dataPath) için de düzeltme:
const dataPath = path.join(__dirname, 'scraper', 'data.json'); 
const modelSavePath = path.join(__dirname, 'models', 'nba-brain.json');
// --- HESAPLAMA FONKSİYONLARI ---

// Takımın son 5 maçtaki galibiyet oranını bulur
const getWinRate = (allMatches, teamName, currentDate) => {
    const pastMatches = allMatches.filter(m => 
        (m.homeTeam === teamName || m.awayTeam === teamName) && 
        new Date(m.date) < new Date(currentDate)
    ).slice(-5); // Son 5 maç

    if (pastMatches.length === 0) return 0.5; // Veri yoksa nötr

    const wins = pastMatches.filter(m => {
        const isHome = m.homeTeam === teamName;
        return isHome ? (m.homePts > m.awayPts) : (m.awayPts > m.homePts);
    }).length;

    return wins / pastMatches.length;
};

// Takımın kaç gündür dinlendiğini bulur
const getRestDays = (allMatches, teamName, currentDate) => {
    const lastMatch = allMatches.filter(m => 
        (m.homeTeam === teamName || m.awayTeam === teamName) && 
        new Date(m.date) < new Date(currentDate)
    ).pop(); // En son oynadığı maç

    if (!lastMatch) return 3; // İlk maçsa ideal dinlenme 3 gün

    const diffTime = Math.abs(new Date(currentDate) - new Date(lastMatch.date));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(diffDays, 7); // Max 7 gün sayalım (Normalizer'ına uygun)
};

// --- ANA EĞİTİM FONKSİYONU ---

const trainModel = () => {
    try {
        const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        // Maçları tarihe göre dizelim ki geçmişi doğru hesaplayalım
        const sortedData = rawData.sort((a, b) => new Date(a.date) - new Date(b.date));

        const trainingData = sortedData.map((game, idx) => {
            const hElo = nbaEloList[game.homeTeam] || 1500;
            const aElo = nbaEloList[game.awayTeam] || 1500;

            // Gerçek zamanlı form ve dinlenme hesaplama
            const hWinRate = getWinRate(sortedData, game.homeTeam, game.date);
            const aWinRate = getWinRate(sortedData, game.awayTeam, game.date);
            const hRest = getRestDays(sortedData, game.homeTeam, game.date);
            const aRest = getRestDays(sortedData, game.awayTeam, game.date);

            const gameData = {
                homeScore: game.homePts,
                awayScore: game.awayPts,
                homeElo: hElo,
                awayElo: aElo,
                homeRestDays: hRest,
                awayRestDays: aRest,
                homeLast5WinRate: hWinRate,
                awayLast5WinRate: aWinRate
            };

            return normalize(gameData);
        }).filter(item => item !== null);

        const net = new brain.NeuralNetwork({ hiddenLayers: [6, 4] }); // Katmanları biraz artırdık

        console.log(`🚀 ${trainingData.length} maç analiz edildi. Derin eğitim başlıyor...`);

        net.train(trainingData, {
            iterations: 10000,
            log: true,
            logPeriod: 1000,
            learningRate: 0.1
        });

        fs.writeFileSync(modelSavePath, JSON.stringify(net.toJSON(), null, 2));
        console.log(`✅ NBA Zekası Oluşturuldu: ${modelSavePath}`);

    } catch (error) {
        console.error("❌ Hata:", error.message);
    }
};

trainModel();