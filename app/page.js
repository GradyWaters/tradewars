'use client';
import { useState, useEffect } from 'react';

export default function TradeWars() {
  const [prices, setPrices] = useState({});
  const [bots, setBots] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [botsRes, pricesRes] = await Promise.all([
        fetch('/api/bots'),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd')
      ]);
      
      const botsData = await botsRes.json();
      const pricesData = await pricesRes.json();
      
      const newBots = botsData.bots;
      
      // Detect trades by comparing with previous state
      if (bots.length > 0) {
        newBots.forEach((newBot, i) => {
          const oldBot = bots[i];
          if (oldBot) {
            if (newBot.btc !== oldBot.btc || newBot.eth !== oldBot.eth || newBot.balance !== oldBot.balance) {
              const time = new Date().toLocaleTimeString();
              
              if (newBot.btc > oldBot.btc) {
                const amount = newBot.btc - oldBot.btc;
                setTrades(prev => [{botName: newBot.name, action: `BUY ${amount.toFixed(4)} BTC`, time}, ...prev].slice(0, 10));
              } else if (newBot.btc < oldBot.btc) {
                const amount = oldBot.btc - newBot.btc;
                setTrades(prev => [{botName: newBot.name, action: `SELL ${amount.toFixed(4)} BTC`, time}, ...prev].slice(0, 10));
              }
              
              if (newBot.eth > oldBot.eth) {
                const amount = newBot.eth - oldBot.eth;
                setTrades(prev => [{botName: newBot.name, action: `BUY ${amount.toFixed(4)} ETH`, time}, ...prev].slice(0, 10));
              } else if (newBot.eth < oldBot.eth) {
                const amount = oldBot.eth - newBot.eth;
                setTrades(prev => [{botName: newBot.name, action: `SELL ${amount.toFixed(4)} ETH`, time}, ...prev].slice(0, 10));
              }
            }
          }
        });
      }
      
      setBots(newBots);
      setPrices({
        btc: pricesData.bitcoin.usd,
        eth: pricesData.ethereum.usd
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
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
                <div className="text-gray-500 text-center py-4">Waiting for trades...</div>
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
          Bots trade every minute • Competition resets daily at midnight UTC
        </div>
      </div>
    </div>
  );
}