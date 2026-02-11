export async function GET() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradeWars/1.0'
      },
      next: { revalidate: 30 }
    });
    if (!response.ok) {
      throw new Error('CoinGecko returned ' + response.status);
    }
    const data = await response.json();
    return Response.json({ btc: data.bitcoin.usd, eth: data.ethereum.usd });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}