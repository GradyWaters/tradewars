import { createClient } from 'redis';

let client = null;

async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
  }
  return client;
}

const BOTS_KEY = 'tradewars:bots';
const TRADES_KEY = 'tradewars:trades';
const LAST_RESET_KEY = 'tradewars:last_reset';
const WINNERS_KEY = 'tradewars:winners';
const PRICE_HISTORY_KEY = 'tradewars:price_history';

const defaultBots = [
  { name: 'Aurelian', balance: 10000, btc: 0, eth: 0, strategy: 'conservative' },
  { name: 'Pumara', balance: 10000, btc: 0, eth: 0, strategy: 'aggressive' }
];

export async function getBots() {
  try {
    await checkDailyReset();
    const db = await getClient();
    const data = await db.get(BOTS_KEY);
    return data ? JSON.parse(data) : defaultBots;
  } catch (error) {
    console.error('Error getting bots:', error);
    return defaultBots;
  }
}

export async function saveBots(bots) {
  try {
    const db = await getClient();
    await db.set(BOTS_KEY, JSON.stringify(bots));
    return true;
  } catch (error) {
    console.error('Error saving bots:', error);
    return false;
  }
}

export async function addTrade(botName, action) {
  try {
    const db = await getClient();
    const data = await db.get(TRADES_KEY);
    const trades = data ? JSON.parse(data) : [];
    const time = new Date().toLocaleTimeString();
    trades.unshift({ botName, action, time });
    await db.set(TRADES_KEY, JSON.stringify(trades.slice(0, 20)));
    return true;
  } catch (error) {
    console.error('Error adding trade:', error);
    return false;
  }
}

export async function getTrades() {
  try {
    const db = await getClient();
    const data = await db.get(TRADES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting trades:', error);
    return [];
  }
}

export async function savePriceSnapshot(prices) {
  try {
    const db = await getClient();
    const data = await db.get(PRICE_HISTORY_KEY);
    const history = data ? JSON.parse(data) : [];
    history.push({
      btc: prices.btc,
      eth: prices.eth,
      time: Date.now()
    });
    const last60 = history.slice(-60);
    await db.set(PRICE_HISTORY_KEY, JSON.stringify(last60));
    return true;
  } catch (error) {
    console.error('Error saving price snapshot:', error);
    return false;
  }
}

export async function getPriceHistory() {
  try {
    const db = await getClient();
    const data = await db.get(PRICE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting price history:', error);
    return [];
  }
}

export async function checkDailyReset() {
  try {
    const db = await getClient();
    const lastReset = await db.get(LAST_RESET_KEY);
    const now = new Date();
    const today = now.toDateString();
    if (lastReset !== today) {
      const botsData = await db.get(BOTS_KEY);
      if (botsData) {
        const currentBots = JSON.parse(botsData);
        const winner = currentBots.reduce((prev, current) => {
          const prevValue = prev.balance + (prev.btc * 68000) + (prev.eth * 2000);
          const currentValue = current.balance + (current.btc * 68000) + (current.eth * 2000);
          return currentValue > prevValue ? current : prev;
        });
        const winnersData = await db.get(WINNERS_KEY);
        const winners = winnersData ? JSON.parse(winnersData) : [];
        winners.unshift({
          date: lastReset || 'Unknown',
          winner: winner.name,
          value: winner.balance + (winner.btc * 68000) + (winner.eth * 2000)
        });
        await db.set(WINNERS_KEY, JSON.stringify(winners.slice(0, 30)));
      }
      await db.set(BOTS_KEY, JSON.stringify(defaultBots));
      await db.set(TRADES_KEY, JSON.stringify([]));
      await db.set(PRICE_HISTORY_KEY, JSON.stringify([]));
      await db.set(LAST_RESET_KEY, today);
    }
  } catch (error) {
    console.error('Error in daily reset:', error);
  }
}

export async function getWinners() {
  try {
    const db = await getClient();
    const data = await db.get(WINNERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting winners:', error);
    return [];
  }
}