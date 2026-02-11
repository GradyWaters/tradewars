'use client';
import { useState, useEffect } from 'react';

export default function TradeWars() {
  const [prices, setPrices] = useState({});
  const [bots, setBots] = useState([]);
  const [trades, setTrades] = useState([]);
  const [isTrading, setIsTrading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBots();
    fetchPrices();
    const priceInterval = setInterval(fetchPrices, 30000);
    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    if (bots.length > 0 && Object.keys(prices).length > 0 && !isTrading) {
      const tradeInterval = setInterval(() => executeTradingRound(), 10000);
      return () => clearInterval(tradeInterval);
    }
  }, [bots, prices, isTrading]);

  const loadBots = async () => {
    try {
      const response = await fetch('/api/bots');
      const data = await response.json();
      setBots(data.bots);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load bots:', error);
      setLoading(false);
    }
  };

  const saveBots = async (newBots) => {
    try {
      await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bots: newBots })
      });
    } catch (error) {
      console.error('Failed to save bots:', error);
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
      const data = await response.json();
      setPrices({
        btc: data.bitcoin.usd,
        eth: data.ethereum.usd
      });
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const executeTradingRound = async () => {
    setIsTrading(true);
    
    const newBots = [...bots];
    
    for (let i = 0; i < newBots.length; i++) {
      const bot = newBots[i];
      
      try {
        const response = await fetch('/api/trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botName: bot.name,
            strategy: bot.strategy,
            portfolio: { balance: bot.balance, btc: bot.btc, eth: bot.eth },
            prices: prices
          })
        });
        
        const { decision } = await response.json();
        executeDecision(newBots, i, decision);
        
      } catch (error) {
        console.error(`${bot.name} trade error:`, error);
      }
    }
    
    setBots(newBots);
    await saveBots(newBots);
    setIsTrading(false);
  };

  const executeDecision = (botsArray, botIndex, decision) => {
    const parts = decision.split(' ');
    const action = parts[0];
    
    if (action === 'HOLD') {
      addTrade(botsArray[botIndex].name, decision);
      return;
    }
    
    const coin = parts[1];
    const amount = parseFloat(parts[2]);
    const bot = botsArray[botIndex];
    
    if (action === 'BUY') {
      if (coin === 'BTC' && bot.balance >= amount) {
        const btcAmount = amount / prices.btc;
        bot.balance -= amount;
        bot.btc += btcAmount;
        addTrade(bot.name, `BUY ${btcAmount.toFixed(4)} BTC for $${amount}`);
      } else if (coin === 'ETH' && bot.balance >= amount) {
        const ethAmount = amount / prices.eth;
        bot.balance -= amount;
        bot.eth += ethAmount;
        addTrade(bot.name, `BUY ${ethAmount.toFixed(4)} ETH for $${amount}`);
      }
    } else if (action === 'SELL') {
      if (coin === 'BTC' && bot.btc >= amount) {
        const usdAmount = amount * prices.btc;
        bot.btc -= amount;
        bot.balance += usdAmount;
        addTrade(bot.name, `SELL ${amount} BTC for $${usdAmount.toFixed(2)}`);
      } else if (coin === 'ETH' && bot.eth >= amount) {
        const usdAmount = amount * prices.eth;
        bot.eth -= amount;
        bot.balance += usdAmount;
        addTrade(bot.name, `SELL ${amount} ETH for $${usdAmount.toFixed(2)}`);
      }
    }
  };

  const addTrade = (botName, action) => {
    const time = new Date().toLocaleTimeString();
    setTrades(prev => [{ botName, action, time }, ...prev].slice(0, 10));
  };

  const calculatePortfolioValue = (bot) => {
    return bot.balance + (bot.btc * (prices.btc || 0)) + (bot.eth * (prices.eth || 0));
  };

  const sortedBots = [...bots].sort((a, b) => calculatePortfolioValue(b) - calculatePortfolioValue(a));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-2xl">Loading TradeWars...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
          TradeWars
        </h1>
        <p className="text-center text-gray-400 mb-8">AI Bots Battle for Crypto Trading Supremacy</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Live Market Prices</h2>
            <div className="space-y-3">
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-gray-400 text-sm">Bitcoin (BTC)</div>
                <div className="text-2xl font-bold">${prices.btc?.toLocaleString() || '...'}</div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="text-gray-400 text-sm">Ethereum (ETH)</div>
                <div className="text-2xl font-bold">${prices.eth?.toLocaleString() || '...'}</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
            <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {trades.map((trade, i) => (
                <div key={i} className="bg-gray-700 p-2 rounded">
                  <span className="text-orange-400 font-bold">{trade.botName}:</span>{' '}
                  <span className="text-gray-300">{trade.action}</span>{' '}
                  <span className="text-gray-500 text-xs">({trade.time})</span>
                </div>
              ))}
              {trades.length === 0 && (
                <div className="text-gray-500 text-center py-4">Waiting for first trade...</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          <div className="space-y-3">
            {sortedBots.map((bot, i) => (
              <div key={i} className="bg-gray-700 p-4 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg">{i + 1}. {bot.name}</div>
                    <div className="text-sm text-gray-400 capitalize">{bot.strategy} strategy</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">
                      ${calculatePortfolioValue(bot).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">Total Value</div>
                  </div>
                </div>
                <div className="text-sm text-gray-400 grid grid-cols-3 gap-2">
                  <div>Cash: ${bot.balance.toFixed(2)}</div>
                  <div>BTC: {bot.btc.toFixed(4)}</div>
                  <div>ETH: {bot.eth.toFixed(4)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm">
          Bots trade every 10 seconds • Competition resets daily at midnight UTC
        </div>
      </div>
    </div>
  );
}