const brain = require('brain.js');
const fs = require('fs');
const path = require('path');
const { normalize } = require('./proces/normalizer');

const net = new brain.NeuralNetwork({
    hiddenLayers: [4], // Reduced from [20, 20] to prevent extreme overconfidence
    activation: 'sigmoid'
});

const rawDataPath = path.join(__dirname, '../src/data/raw/mock-games.json');

if (!fs.existsSync(rawDataPath)) {
    console.error("❌ Error: data/raw/mock-games.json not found! Create it first.");
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

// FIX: Ensure BOTH expectedMargin and homeWin exist in the training data
const allData = rawData
    .map(game => normalize(game))
    .filter(item => 
        item && 
        item.input && 
        item.output && 
        typeof item.output.expectedMargin === 'number' &&
        typeof item.output.homeWin === 'number'
    )
    .sort(() => Math.random() - 0.5);

if (allData.length < 5) {
    console.error("❌ Error: Not enough normalized training data. Check your normalizer.js and mock-games.json!");
    process.exit(1);
}

const splitIndex = Math.floor(allData.length * 0.8);
const trainSet = allData.slice(0, splitIndex);
const testSet = allData.slice(splitIndex);

console.log('🚀 Training started for the 2026 Playoff Regression Model...');

net.train(trainSet, {
    iterations: 8000,
    errorThresh: 0.01,
    learningRate: 0.1,
    log: true,
    logPeriod: 500
});

let totalError = 0;

testSet.forEach(test => {
    const output = net.run(test.input);
    const predicted = output.expectedMargin;
    const actual = test.output.expectedMargin;
    totalError += Math.abs(predicted - actual);
});

const mae = testSet.length ? totalError / testSet.length : 0;

console.log(`\n---------------------------------`);
console.log(`✅ TEST MAE: ${mae.toFixed(4)}`);
console.log(`---------------------------------`);

const modelPath = path.join(__dirname, 'models/nba-brain.json');
fs.writeFileSync(modelPath, JSON.stringify(net.toJSON(), null, 2));
console.log(`💾 Model başarıyla 'models/nba-brain.json' adresine kaydedildi.`);