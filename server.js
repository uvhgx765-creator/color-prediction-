const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    currentPeriod: 20261009001,
    secondsLeft: 30,
    history: [{ period: 20261009000, number: 3, color: 'Green' }],
    userWallet: 1000.00,
    activeBets: [],
    forcedOutcome: null
};

// Admin page chalane ka password
const ADMIN_SECRET_KEY = "my_private_secret_key_123";

setInterval(() => {
    gameState.secondsLeft--;
    if (gameState.secondsLeft <= 0) {
        let winningNumber;
        let winningColor;

        if (gameState.forcedOutcome !== null) {
            winningNumber = gameState.forcedOutcome.number;
            winningColor = gameState.forcedOutcome.color;
        } else {
            winningNumber = Math.floor(Math.random() * 10);
            if (winningNumber === 0 || winningNumber === 5) winningColor = 'Violet';
            else if (winningNumber % 2 === 0) winningColor = 'Red';
            else winningColor = 'Green';
        }

        gameState.activeBets.forEach(bet => {
            if (bet.type === 'color' && bet.selection === winningColor) {
                gameState.userWallet += bet.amount * 2;
            } else if (bet.type === 'number' && parseInt(bet.selection) === winningNumber) {
                gameState.userWallet += bet.amount * 9;
            }
        });

        gameState.history.unshift({
            period: gameState.currentPeriod,
            number: winningNumber,
            color: winningColor
        });
        if (gameState.history.length > 15) gameState.history.pop();

        gameState.currentPeriod++;
        gameState.secondsLeft = 30;
        gameState.activeBets = [];
        gameState.forcedOutcome = null;
    }
}, 1000);

app.get('/api/game-state', (req, res) => {
    res.json({
        currentPeriod: gameState.currentPeriod,
        secondsLeft: gameState.secondsLeft,
        wallet: gameState.userWallet,
        history: gameState.history
    });
});

app.post('/api/place-trade', (req, res) => {
    const { type, selection, amount } = req.body;
    const tradeAmount = parseFloat(amount);
    if (gameState.secondsLeft <= 5) return res.status(400).json({ error: "Trading frozen!" });
    if (gameState.userWallet < tradeAmount) return res.status(400).json({ error: "Insufficient balance." });

    gameState.userWallet -= tradeAmount;
    gameState.activeBets.push({ type, selection, amount: tradeAmount });
    res.json({ success: true, newBalance: gameState.userWallet });
});

app.post('/api/admin/override', (req, res) => {
    const { secretKey, targetNumber } = req.body;
    if (secretKey !== ADMIN_SECRET_KEY) return res.status(401).json({ error: "Access denied." });
    const num = parseInt(targetNumber);
    let col = 'Green';
    if (num === 0 || num === 5) col = 'Violet';
    else if (num % 2 === 0) col = 'Red';

    gameState.forcedOutcome = { number: num, color: col };
    res.json({ success: true, message: `Landed forced to ${col} (${num})` });
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
          
