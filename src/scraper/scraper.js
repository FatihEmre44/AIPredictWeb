const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ADV_STATS_CACHE = path.join(__dirname, 'advanced-stats.json');
const TEAM_MAP_CACHE = path.join(__dirname, 'team-map.json');
const DATA_PATH = path.join(__dirname, 'data.json');

const NBA_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.nba.com',
    'Referer': 'https://www.nba.com/',
    'Connection': 'keep-alive',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getWithRetry(url, options, retries = 6) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await axios.get(url, options);
        } catch (error) {
            const status = error.response?.status;
            const shouldRetry = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
            if (shouldRetry && attempt < retries) {
                const base = status === 429 ? 3000 : 1500;
                const backoff = base * Math.pow(2, attempt);
                const jitter = Math.floor(Math.random() * 500);
                const waitMs = backoff + jitter;
                await sleep(waitMs);
                attempt += 1;
                continue;
            }
            throw error;
        }
    }
}

function seasonToNbaString(seasonYear) {
    const start = seasonYear - 1;
    const end = String(seasonYear).slice(-2);
    return `${start}-${end}`;
}

function rowValue(row, headers, key) {
    const idx = headers.indexOf(key);
    return idx >= 0 ? row[idx] : null;
}

async function fetchAdvancedTeamStats(seasonYear = 2024) {
    const manualPath = process.env.ADV_STATS_PATH;
    if (manualPath && fs.existsSync(manualPath)) {
        try {
            return JSON.parse(fs.readFileSync(manualPath, 'utf8'));
        } catch (error) {
            console.log("⚠️ Manual advanced stats okunamadi, cache'e bakiliyor.");
        }
    }
    if (fs.existsSync(ADV_STATS_CACHE)) {
        try {
            return JSON.parse(fs.readFileSync(ADV_STATS_CACHE, 'utf8'));
        } catch (error) {
            console.log("⚠️ Advanced stats cache okunamadi, yeniden indiriliyor.");
        }
    }

    const url = 'https://stats.nba.com/stats/leaguedashteamstats';
    const params = {
        Season: seasonToNbaString(seasonYear),
        SeasonType: 'Regular Season',
        MeasureType: 'Advanced',
        PerMode: 'PerGame',
        LeagueID: '00',
        TeamID: '0',
        Conference: '',
        Division: '',
        GameScope: '',
        GameSegment: '',
        DateFrom: '',
        DateTo: '',
        Location: '',
        Outcome: '',
        SeasonSegment: '',
        Period: '0',
        LastNGames: '0',
        Month: '0',
        OpponentTeamID: '0',
        PORound: '0',
        PaceAdjust: 'N',
        PlusMinus: 'N',
        Rank: 'N'
    };

    const { data } = await getWithRetry(url, { headers: NBA_HEADERS, params });
    const resultSet = data?.resultSets?.find(rs => rs.name === 'LeagueDashTeamStats') || data?.resultSets?.[0];
    if (!resultSet) {
        throw new Error('Advanced stats result set missing');
    }

    const headers = resultSet.headers;
    const stats = {};
    resultSet.rowSet.forEach(row => {
        const teamId = rowValue(row, headers, 'TEAM_ID');
        const teamName = rowValue(row, headers, 'TEAM_NAME');
        if (!teamId || !teamName) return;
        stats[teamId] = {
            teamName,
            offRating: rowValue(row, headers, 'OFF_RATING'),
            defRating: rowValue(row, headers, 'DEF_RATING'),
            pace: rowValue(row, headers, 'PACE'),
            efg: rowValue(row, headers, 'EFG_PCT'),
            tov: rowValue(row, headers, 'TOV_PCT'),
            orb: rowValue(row, headers, 'OREB_PCT'),
            drb: rowValue(row, headers, 'DREB_PCT')
        };
    });

    fs.writeFileSync(ADV_STATS_CACHE, JSON.stringify(stats, null, 2));
    return stats;
}

async function fetchTeamMap(seasonYear = 2024) {
    if (fs.existsSync(TEAM_MAP_CACHE)) {
        try {
            return JSON.parse(fs.readFileSync(TEAM_MAP_CACHE, 'utf8'));
        } catch (error) {
            console.log("⚠️ Team map cache okunamadi, yeniden indiriliyor.");
        }
    }
    const url = `https://data.nba.net/10s/prod/v2/${seasonYear}/teams.json`;
    try {
        const { data } = await getWithRetry(url, { headers: NBA_HEADERS });
        const teams = data?.league?.standard || [];
        const map = {};
        teams.forEach(team => {
            if (team.isNBAFranchise && team.teamId) {
                map[team.teamId] = `${team.fullName}`;
            }
        });
        fs.writeFileSync(TEAM_MAP_CACHE, JSON.stringify(map, null, 2));
        return map;
    } catch (error) {
        const fallback = {
            "1610612737": "Atlanta Hawks",
            "1610612738": "Boston Celtics",
            "1610612751": "Brooklyn Nets",
            "1610612766": "Charlotte Hornets",
            "1610612741": "Chicago Bulls",
            "1610612739": "Cleveland Cavaliers",
            "1610612742": "Dallas Mavericks",
            "1610612743": "Denver Nuggets",
            "1610612765": "Detroit Pistons",
            "1610612744": "Golden State Warriors",
            "1610612745": "Houston Rockets",
            "1610612754": "Indiana Pacers",
            "1610612746": "Los Angeles Clippers",
            "1610612747": "Los Angeles Lakers",
            "1610612763": "Memphis Grizzlies",
            "1610612748": "Miami Heat",
            "1610612749": "Milwaukee Bucks",
            "1610612750": "Minnesota Timberwolves",
            "1610612740": "New Orleans Pelicans",
            "1610612752": "New York Knicks",
            "1610612760": "Oklahoma City Thunder",
            "1610612753": "Orlando Magic",
            "1610612755": "Philadelphia 76ers",
            "1610612756": "Phoenix Suns",
            "1610612757": "Portland Trail Blazers",
            "1610612758": "Sacramento Kings",
            "1610612759": "San Antonio Spurs",
            "1610612761": "Toronto Raptors",
            "1610612762": "Utah Jazz",
            "1610612764": "Washington Wizards"
        };
        fs.writeFileSync(TEAM_MAP_CACHE, JSON.stringify(fallback, null, 2));
        console.log("⚠️ Team map API hatasi, fallback team map kullaniliyor.");
        return fallback;
    }
}

async function fetchScoreboardByDateDataNba(dateYmd, teamMap) {
    const url = `https://data.nba.net/10s/prod/v1/${dateYmd}/scoreboard.json`;
    const { data } = await getWithRetry(url, { headers: NBA_HEADERS });
    const games = data?.games || [];
    return games.map(game => {
        const homeId = game.hTeam?.teamId;
        const awayId = game.vTeam?.teamId;
        const homePts = parseInt(game.hTeam?.score, 10);
        const awayPts = parseInt(game.vTeam?.score, 10);
        return {
            homeTeamId: homeId,
            awayTeamId: awayId,
            homeTeam: teamMap[homeId] || game.hTeam?.triCode || 'Home',
            awayTeam: teamMap[awayId] || game.vTeam?.triCode || 'Away',
            homePts,
            awayPts,
            status: game.statusNum === 3 ? 'Final' : game.statusText
        };
    }).filter(g => g.homeTeamId && g.awayTeamId && !Number.isNaN(g.homePts) && !Number.isNaN(g.awayPts));
}

async function fetchScoreboardByDate(date) {
    const url = 'https://stats.nba.com/stats/scoreboardv2';
    const params = {
        GameDate: date,
        LeagueID: '00',
        DayOffset: 0
    };

    const { data } = await getWithRetry(url, { headers: NBA_HEADERS, params });
    const gameHeader = data?.resultSets?.find(rs => rs.name === 'GameHeader');
    const lineScore = data?.resultSets?.find(rs => rs.name === 'LineScore');
    if (!gameHeader || !lineScore) {
        return [];
    }

    const headerMap = new Map();
    const headerHeaders = gameHeader.headers;
    gameHeader.rowSet.forEach(row => {
        const gameId = rowValue(row, headerHeaders, 'GAME_ID');
        if (!gameId) return;
        headerMap.set(gameId, {
            gameId,
            status: rowValue(row, headerHeaders, 'GAME_STATUS_TEXT'),
            homeTeamId: rowValue(row, headerHeaders, 'HOME_TEAM_ID'),
            awayTeamId: rowValue(row, headerHeaders, 'VISITOR_TEAM_ID')
        });
    });

    const lineHeaders = lineScore.headers;
    const lineMap = new Map();
    lineScore.rowSet.forEach(row => {
        const gameId = rowValue(row, lineHeaders, 'GAME_ID');
        const teamId = rowValue(row, lineHeaders, 'TEAM_ID');
        if (!gameId || !teamId) return;
        const key = `${gameId}_${teamId}`;
        lineMap.set(key, {
            teamId,
            teamName: rowValue(row, lineHeaders, 'TEAM_NAME'),
            pts: rowValue(row, lineHeaders, 'PTS')
        });
    });

    const games = [];
    headerMap.forEach(game => {
        const homeKey = `${game.gameId}_${game.homeTeamId}`;
        const awayKey = `${game.gameId}_${game.awayTeamId}`;
        const home = lineMap.get(homeKey);
        const away = lineMap.get(awayKey);
        if (!home || !away) return;
        if (typeof home.pts !== 'number' || typeof away.pts !== 'number') return;
        games.push({
            homeTeamId: home.teamId,
            awayTeamId: away.teamId,
            homeTeam: home.teamName,
            awayTeam: away.teamName,
            homePts: home.pts,
            awayPts: away.pts,
            status: game.status || 'Final'
        });
    });

    return games;
}

async function scrapeNbaStatsApi() {
    try {
        const season = 2024;
        const manualDate = process.env.BOX_DATE;
        const startDateEnv = process.env.START_DATE;
        const endDateEnv = process.env.END_DATE;

        console.log("🚀 Veri madenciliği başlatılıyor...");

        let teamStats = {};
        try {
            teamStats = await fetchAdvancedTeamStats(season);
        } catch (error) {
            console.log("⚠️ Advanced stats alinmadi, stats olmadan devam ediliyor.");
        }

        let teamMap = {};
        try {
            teamMap = await fetchTeamMap(season);
        } catch (error) {
            console.log("⚠️ Team map alinmadi, takim isimleri kisitli olabilir.");
        }

        const existing = fs.existsSync(DATA_PATH)
            ? JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
            : [];
        const allMatches = [];
        let usedDate = null;

        let baseDate = new Date();
        if (manualDate) {
            const parts = manualDate.split('-').map(Number);
            if (parts.length === 3 && !parts.some(Number.isNaN)) {
                baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
            }
        }

        let startDate = null;
        let endDate = null;
        if (startDateEnv && endDateEnv) {
            const s = startDateEnv.split('-').map(Number);
            const e = endDateEnv.split('-').map(Number);
            if (s.length === 3 && e.length === 3 && !s.some(Number.isNaN) && !e.some(Number.isNaN)) {
                startDate = new Date(s[0], s[1] - 1, s[2]);
                endDate = new Date(e[0], e[1] - 1, e[2]);
            }
        }

        const tryDates = manualDate ? 1 : 30;
        const dateList = [];
        if (startDate && endDate) {
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                dateList.push(new Date(d));
            }
        } else {
            for (let i = 0; i < tryDates; i += 1) {
                const date = new Date(baseDate);
                date.setDate(date.getDate() - i);
                dateList.push(date);
            }
        }

        for (const date of dateList) {
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const yyyy = String(date.getFullYear());
            const gameDate = `${mm}/${dd}/${yyyy}`;

            let games = [];
            try {
                games = await fetchScoreboardByDate(gameDate);
            } catch (error) {
                const ymd = `${yyyy}${mm}${dd}`;
                games = await fetchScoreboardByDateDataNba(ymd, teamMap);
            }
            if (games.length > 0) {
                games.forEach(game => {
                    const homeStats = teamStats[game.homeTeamId] || null;
                    const awayStats = teamStats[game.awayTeamId] || null;
                        const homeName = homeStats?.teamName || game.homeTeam;
                        const awayName = awayStats?.teamName || game.awayTeam;
                    allMatches.push({
                            date: gameDate,
                            homeTeam: homeName,
                            awayTeam: awayName,
                        homePts: game.homePts,
                        awayPts: game.awayPts,
                        margin: game.homePts - game.awayPts,
                        status: game.status,
                        homeStats,
                        awayStats
                    });
                });
                usedDate = gameDate;
            }

            await sleep(250);
        }

        if (allMatches.length === 0) {
            console.log("⚠️ Maç bulunamadı. Son 30 gün içinde maç yok veya API cevap vermiyor olabilir.");
        } else {
            const merged = [...existing, ...allMatches];
            fs.writeFileSync(DATA_PATH, JSON.stringify(merged, null, 2));
            console.log(`✅ Başarılı! ${allMatches.length} yeni maç eklendi, toplam ${merged.length}.`);
            if (usedDate) {
                console.log(`📅 Kullanilan tarih: ${usedDate}`);
            }
        }
    } catch (error) {
        const status = error.response?.status;
        if (status === 429) {
            if (fs.existsSync(DATA_PATH)) {
                console.log("⚠️ 429 limit: mevcut data.json kullaniliyor. Daha sonra tekrar deneyin.");
                return;
            }
            console.error("❌ 429 limit: API isteklere izin vermiyor. 10-30 dakika bekleyip tekrar deneyin.");
            return;
        }
        console.error("❌ Hata:", error.message);
    }
}

scrapeNbaStatsApi();