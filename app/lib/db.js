import { kv } from '@vercel/kv';

const BOTS_KEY = 'tradewars:bots';
const LAST_RESET_KEY = 'tradewars:last_reset';
const WINNERS_KEY = 'tradewars:winners';

const defaultBots = [
  { name: 'Aurelian', balance: 10000, btc: 0, eth: 0, strategy: 'conservative' },
  { name: 'Pumara', balance: 10000, btc: 0, eth: 0, strategy: 'aggressive' }
];

export async function getBots() {
  try {
    await checkDailyReset();
    const bots = await kv.get(BOTS_KEY);
    return bots || defaultBots;
  } catch (error) {
    console.error('Error getting bots:', error);
    return defaultBots;
  }
}

export async function saveBots(bots) {
  try {
    await kv.set(BOTS_KEY, bots);
    return true;
  } catch (error) {
    console.error('Error saving bots:', error);
    return false;
  }
}

export async function checkDailyReset() {
  try {
    const lastReset = await kv.get(LAST_RESET_KEY);
    const now = new Date();
    const today = now.toDateString();
    
    if (lastReset !== today) {
      const currentBots = await kv.get(BOTS_KEY);
      
      if (currentBots) {
        const winner = currentBots.reduce((prev, current) => {
          const prevValue = prev.balance + (prev.btc * 68000) + (prev.eth * 2000);
          const currentValue = current.balance + (current.btc * 68000) + (current.eth * 2000);
          return currentValue > prevValue ? current : prev;
        });
        
        const winners = await kv.get(WINNERS_KEY) || [];
        winners.unshift({
          date: lastReset || 'Unknown',
          winner: winner.name,
          value: winner.balance + (winner.btc * 68000) + (winner.eth * 2000)
        });
        
        await kv.set(WINNERS_KEY, winners.slice(0, 30));
      }
      
      await kv.set(BOTS_KEY, defaultBots);
      await kv.set(LAST_RESET_KEY, today);
    }
  } catch (error) {
    console.error('Error in daily reset:', error);
  }
}

export async function getWinners() {
  try {
    return await kv.get(WINNERS_KEY) || [];
  } catch (error) {
    console.error('Error getting winners:', error);
    return [];
  }
}