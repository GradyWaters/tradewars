import OpenAI from 'openai';
import { getBots, saveBots } from '@/app/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const bots = await getBots();
    
    const pricesResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const pricesData = await pricesResponse.json();
    const prices = {
      btc: pricesData.bitcoin.usd,
      eth: pricesData.ethereum.usd
    };

    const newBots = [...bots];
    
    for (let i = 0; i < newBots.length; i++) {
      const bot = newBots[i];
      
      const systemPrompt = bot.strategy === 'conservative' 
        ? `You are ${bot.name}, a conservative crypto trader. You make careful, calculated trades. Buy when prices dip 2-3%, take profits at 5-10% gains. Trade 10-20% of portfolio per decision. You DO trade regularly, just cautiously.`
        : `You are ${bot.name}, an aggressive crypto trader. You chase pumps, take big risks, and go for maximum gains. You're willing to go all-in.`;
      
      const userPrompt = `
Current Portfolio:
- Cash: $${bot.balance.toFixed(2)}
- BTC: ${bot.btc.toFixed(4)} (worth $${(bot.btc * prices.btc).toFixed(2)})
- ETH: ${bot.eth.toFixed(4)} (worth $${(bot.eth * prices.eth).toFixed(2)})

Current Prices:
- BTC: $${prices.btc}
- ETH: $${prices.eth}

Total Portfolio Value: $${(bot.balance + (bot.btc * prices.btc) + (bot.eth * prices.eth)).toFixed(2)}

Make ONE trading decision. Respond with ONLY one of these formats:
BUY BTC 1000
BUY ETH 500
SELL BTC 0.01
SELL ETH 0.5
HOLD

Keep trades within your available balance/holdings.
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
        executeDecision(newBots, i, decision, prices);
        
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

function executeDecision(botsArray, botIndex, decision, prices) {
  const parts = decision.split(' ');
  const action = parts[0];
  
  if (action === 'HOLD') return;
  
  const coin = parts[1];
  const amount = parseFloat(parts[2]);
  const bot = botsArray[botIndex];
  
  if (action === 'BUY') {
    if (coin === 'BTC' && bot.balance >= amount) {
      const btcAmount = amount / prices.btc;
      bot.balance -= amount;
      bot.btc += btcAmount;
    } else if (coin === 'ETH' && bot.balance >= amount) {
      const ethAmount = amount / prices.eth;
      bot.balance -= amount;
      bot.eth += ethAmount;
    }
  } else if (action === 'SELL') {
    if (coin === 'BTC' && bot.btc >= amount) {
      const usdAmount = amount * prices.btc;
      bot.btc -= amount;
      bot.balance += usdAmount;
    } else if (coin === 'ETH' && bot.eth >= amount) {
      const usdAmount = amount * prices.eth;
      bot.eth -= amount;
      bot.balance += usdAmount;
    }
  }
}