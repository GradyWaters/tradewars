import { getWinners } from '@/app/lib/db';

export async function GET() {
  try {
    const winners = await getWinners();
    return Response.json({ winners });
  } catch (error) {
    return Response.json({ error: 'Failed to get winners' }, { status: 500 });
  }
}