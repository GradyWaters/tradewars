'use client';
import { useState, useEffect } from 'react';

export default function TradeWars() {
  const [prices, setPrices] = useState({});
  const [bots, setBots] = useState([]);
  const [trades, setTrades] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    executeTrades();
    const dataInterval = setInterval(loadData, 5000);
    const tradeInterval = setInterval(executeTrades, 60000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(tradeInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      const [botsRes, pricesRes, tradesRes, winnersRes] = await Promise.all([
        fetch('/api/bots'),
        fetch('/api/prices'),
        fetch('/api/trades'),
        fetch('/api/winners')
      ]);

      const botsData = await botsRes.json();
      const pricesData = await pricesRes.json();
      const tradesData = await tradesRes.json();
      const winnersData = await winnersRes.json();

      setBots(botsData.bots || []);
      setPrices({
        btc: pricesData.btc,
        eth: pricesData.eth
      });
      setTrades(tradesData.trades || []);
      setWinners(winnersData.winners || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const executeTrades = async () => {
    try {
      await fetch('/api/trade');
      await loadData();
    } catch (error) {
      console.error('Trade execution error:', error);
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
                <div className="text-gray-500 text-center py-4">Waiting for first trade...</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
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

        {winners.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Past Winners</h2>
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={i} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                  <div>
                    <span className="text-yellow-400 font-bold">{w.winner}</span>
                    <span className="text-gray-400 text-sm ml-2">won on {w.date}</span>
                  </div>
                  <div className="text-green-400 font-bold">${w.value?.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-8 text-gray-500 text-sm">
          Bots trade every minute &bull; Competition resets daily at midnight UTC
        </div>
      </div>
    </div>
  );
}