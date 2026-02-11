import { getTrades } from '@/app/lib/db';

export async function GET() {
  try {
    const trades = await getTrades();
    return Response.json({ trades });
  } catch (error) {
    console.error('Error in GET /api/trades:', error);
    return Response.json({ error: 'Failed to get trades' }, { status: 500 });
  }
}