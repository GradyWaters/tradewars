import OpenAI from 'openai';
import { getBots, saveBots, addTrade, savePriceSnapshot, getPriceHistory } from '@/app/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getPrices() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'TradeWars/1.0'
    }
  });
  if (!response.ok) throw new Error('Price fetch failed');
  const data = await response.json();
  return { btc: data.bitcoin.usd, eth: data.ethereum.usd };
}

function buildTrendSummary(history, currentPrices) {
  if (history.length < 2) return 'No price history yet. Make your best guess.';

  const oldest = history[0];
  const mid = history[Math.floor(history.length / 2)];
  const recent = history[history.length - 1];

  const btcChangeTotal = ((currentPrices.btc - oldest.btc) / oldest.btc * 100).toFixed(2);
  const ethChangeTotal = ((currentPrices.eth - oldest.eth) / oldest.eth * 100).toFixed(2);
  const btcChangeRecent = ((currentPrices.btc - recent.btc) / recent.btc * 100).toFixed(2);
  const ethChangeRecent = ((currentPrices.eth - recent.eth) / recent.eth * 100).toFixed(2);

  const minutesTracked = Math.round((Date.now() - oldest.time) / 60000);

  return `Price Trends (last ${minutesTracked} minutes, ${history.length} snapshots):
- BTC overall: ${btcChangeTotal}% | Last few minutes: ${btcChangeRecent}%
- ETH overall: ${ethChangeTotal}% | Last few minutes: ${ethChangeRecent}%
- BTC high: $${Math.max(...history.map(h => h.btc)).toLocaleString()} | Low: $${Math.min(...history.map(h => h.btc)).toLocaleString()}
- ETH high: $${Math.max(...history.map(h => h.eth)).toLocaleString()} | Low: $${Math.min(...history.map(h => h.eth)).toLocaleString()}`;
}

export async function GET() {
  try {
    const bots = await getBots();
    const prices = await getPrices();
    const history = await getPriceHistory();

    await savePriceSnapshot(prices);

    const trendSummary = buildTrendSummary(history, prices);
    const newBots = [...bots];

    for (let i = 0; i < newBots.length; i++) {
      const bot = newBots[i];

      const systemPrompt = bot.strategy === 'conservative'
        ? `You are ${bot.name}, a smart balanced crypto trader. You ALWAYS make a trade - never HOLD. Every round you either BUY or SELL something. You use price trends to make decisions. If prices are dipping, you buy. If prices spiked, you take profits. You spread risk by buying both BTC and ETH. You trade 15-30% of your cash per buy. You are strategic but active.`
        : `You are ${bot.name}, an aggressive crypto trader. You ALWAYS make a trade - never HOLD. You chase momentum hard. If something is pumping, you go ALL IN. If it's dumping, you panic sell and switch to the other coin. You use price trends to make big bold moves. You're not afraid to put 50-100% of your cash in one trade.`;

      const userPrompt = `
Current Portfolio:
- Cash: $${bot.balance.toFixed(2)}
- BTC: ${bot.btc.toFixed(4)} (worth $${(bot.btc * prices.btc).toFixed(2)})
- ETH: ${bot.eth.toFixed(4)} (worth $${(bot.eth * prices.eth).toFixed(2)})

Current Prices:
- BTC: $${prices.btc}
- ETH: $${prices.eth}

${trendSummary}

Total Portfolio Value: $${(bot.balance + (bot.btc * prices.btc) + (bot.eth * prices.eth)).toFixed(2)}

Make ONE trading decision. Respond with ONLY one of these formats:
BUY BTC 1000
BUY ETH 500
SELL BTC 0.01
SELL ETH 0.5

You MUST buy or sell. Do NOT say HOLD. Keep trades within your available balance/holdings.
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 50,
          temperature: 0.8,
        });

        const decision = completion.choices[0].message.content.trim();
        await executeDecision(newBots, i, decision, prices);

      } catch (error) {
        console.error(`${bot.name} trade error:`, error);
      }
    }

    await saveBots(newBots);
    return Response.json({ success: true, bots: newBots });
  } catch (error) {
    console.error('Error executing trades:', error);
    return Response.json({ error: 'Failed to execute trades' }, { status: 500 });
  }
}

async function executeDecision(botsArray, botIndex, decision, prices) {
  const parts = decision.split(' ');
  const action = parts[0];
  const bot = botsArray[botIndex];

  if (action === 'HOLD') {
    await addTrade(bot.name, 'HOLD');
    return;
  }

  const coin = parts[1];
  const amount = parseFloat(parts[2]);

  if (action === 'BUY') {
    if (coin === 'BTC' && bot.balance >= amount) {
      const btcAmount = amount / prices.btc;
      bot.balance -= amount;
      bot.btc += btcAmount;
      await addTrade(bot.name, `BUY ${btcAmount.toFixed(4)} BTC for $${amount.toFixed(2)}`);
    } else if (coin === 'ETH' && bot.balance >= amount) {
      const ethAmount = amount / prices.eth;
      bot.balance -= amount;
      bot.eth += ethAmount;
      await addTrade(bot.name, `BUY ${ethAmount.toFixed(4)} ETH for $${amount.toFixed(2)}`);
    }
  } else if (action === 'SELL') {
    if (coin === 'BTC' && bot.btc >= amount) {
      const usdAmount = amount * prices.btc;
      bot.btc -= amount;
      bot.balance += usdAmount;
      await addTrade(bot.name, `SELL ${amount.toFixed(4)} BTC for $${usdAmount.toFixed(2)}`);
    } else if (coin === 'ETH' && bot.eth >= amount) {
      const usdAmount = amount * prices.eth;
      bot.eth -= amount;
      bot.balance += usdAmount;
      await addTrade(bot.name, `SELL ${amount.toFixed(4)} ETH for $${usdAmount.toFixed(2)}`);
    }
  }
}