import { getBots, saveBots } from '@/app/lib/db';

export async function GET() {
  try {
    const bots = await getBots();
    return Response.json({ bots });
  } catch (error) {
    console.error('Error in GET /api/bots:', error);
    return Response.json({ error: 'Failed to get bots' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { bots } = await req.json();
    await saveBots(bots);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/bots:', error);
    return Response.json({ error: 'Failed to save bots' }, { status: 500 });
  }
}