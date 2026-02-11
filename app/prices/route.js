export async function GET() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const data = await response.json();
    return Response.json({
      btc: data.bitcoin.usd,
      eth: data.ethereum.usd
    });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}