const fs = require('fs');
const path = require('path');

// 1. Klasör Hazırlığı
const dir = './data/raw';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
    console.log("📂 Klasörler oluşturuldu: " + dir);
}

const filePath = path.join(dir, 'mock-games.json');

// 2. Veri Hazırlığı (DİKKAT: 'games' burada tanımlanmalı)
const games = [];

console.log("🏀 Veri üretimi başlıyor...");

for (let i = 0; i < 1000; i++) {
   // datagenerator.js içinde değiştir:
const homeElo = Math.floor(Math.random() * (2200 - 1000) + 1000);
const awayElo = Math.floor(Math.random() * (2200 - 1000) + 1000);
    const homeRest = Math.floor(Math.random() * 7) + 1;
    const awayRest = Math.floor(Math.random() * 7) + 1;
    const homeForm = Math.random();
    const awayForm = Math.random();

    // Galibiyet ihtimalini belirleyen küçük bir mantık
    let homeScore = 100 + (homeElo - 1500) / 10 + (homeRest * 2) + (homeForm * 10) + (Math.random() * 20);
    let awayScore = 100 + (awayElo - 1500) / 10 + (awayRest * 2) + (awayForm * 10) + (Math.random() * 20);

    games.push({
        homeElo, 
        awayElo,
        homeRestDays: homeRest, 
        awayRestDays: awayRest,
        homeLast5WinRate: parseFloat(homeForm.toFixed(2)),
        awayLast5WinRate: parseFloat(awayForm.toFixed(2)),
        homeScore: Math.round(homeScore),
        awayScore: Math.round(awayScore)
    });
}

// 3. Yazma İşlemi (Döngü bittikten sonra en sonda olmalı)
fs.writeFileSync(filePath, JSON.stringify(games, null, 2));

console.log(`✅ İşlem Tamam! 1000 maçlık dev veri seti oluşturuldu.`);
console.log(`📍 Konum: ${filePath}`);