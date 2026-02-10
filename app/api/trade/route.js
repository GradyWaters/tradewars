import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const { botName, strategy, portfolio, prices } = await req.json();
  
  const systemPrompt = strategy === 'conservative' 
    ? `You are ${botName}, a conservative crypto trader. You avoid risk, buy dips cautiously, and take small profits. Never risk more than 30% of portfolio on one trade.`
    : `You are ${botName}, an aggressive crypto trader. You chase pumps, take big risks, and go for maximum gains. You're willing to go all-in.`;
  
  const userPrompt = `
Current Portfolio:
- Cash: $${portfolio.balance.toFixed(2)}
- BTC: ${portfolio.btc.toFixed(4)} (worth $${(portfolio.btc * prices.btc).toFixed(2)})
- ETH: ${portfolio.eth.toFixed(4)} (worth $${(portfolio.eth * prices.eth).toFixed(2)})

Current Prices:
- BTC: $${prices.btc}
- ETH: $${prices.eth}

Total Portfolio Value: $${(portfolio.balance + (portfolio.btc * prices.btc) + (portfolio.eth * prices.eth)).toFixed(2)}

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
    
    return Response.json({ decision });
  } catch (error) {
    console.error('Trading error:', error);
    return Response.json({ decision: 'HOLD' });
  }
}