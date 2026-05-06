const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const getdata = async () => {
    const url = "https://www.basketball-reference.com/leagues/NBA_2026_games.html";
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const table = $('#schedule');
        const rows = table.find('tbody tr');
        const games = [];

        rows.each((index, row) => {
            const date = $(row).find('th[data-stat="date_game"]').text().trim();
            const homeTeam = $(row).find('td[data-stat="home_team_name"]').text().trim();
            const awayTeam = $(row).find('td[data-stat="visitor_team_name"]').text().trim();
            const homePts = $(row).find('td[data-stat="home_pts"]').text().trim();
            const awayPts = $(row).find('td[data-stat="visitor_pts"]').text().trim();

            if (date && homeTeam && awayTeam && homePts !== "" && awayPts !== "") {
                games.push({
                    date,
                    homeTeam,
                    awayTeam,
                    homePts: parseInt(homePts),
                    awayPts: parseInt(awayPts),
                    margin: parseInt(homePts) - parseInt(awayPts)
                    game
                });
            }
        });

        // DOSYAYA KAYIT (Return'den önce yapılmalı!)
        fs.writeFileSync('data.json', JSON.stringify(games, null, 2));
        console.log('✅ Veriler data.json dosyasına kaydedildi.');

        return games; 
    } catch (error) {
        console.error("❌ Veri çekme hatası:", error.message);
    }
};

// Fonksiyonu çalıştır
getdata().then(allGames => {
    if (allGames && allGames.length > 0) {
        console.log(`🚀 Toplam ${allGames.length} maç çekildi.`);
        console.log("🏀 İlk Maç Örneği:", allGames[0]); // Index eklendi
    }
});