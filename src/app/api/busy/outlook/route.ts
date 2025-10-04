// app/api/busy/outlook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { fetchOutlookBusyWithRefresh, type OAuthBundle } from '@/calendar/fetchOutlookBusy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to   = url.searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing ?from=YYYY-MM-DD&to=YYYY-MM-DD' }, { status: 400 });
  }

  // Pull tokens from next-auth JWT (make sure you store these in your JWT callback)
  const token = await getToken({ req });
  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const oauth: OAuthBundle = {
    access_token: String(token.accessToken),
    refresh_token: token.refreshToken ? String(token.refreshToken) : undefined,
    expires_at: typeof token.expiresAt === 'number' ? token.expiresAt : undefined,
    token_type: token.tokenType ? String(token.tokenType) : undefined,
    scope: token.scope ? String(token.scope) : undefined,
  };

  // Refresh if needed, then fetch
  const { busy, oauth: refreshed } = await fetchOutlookBusyWithRefresh(from, to, oauth);

  // Optional: if you want to persist rotated refresh_token/expires_at into the JWT,
  // do that in your next-auth JWT callback. Here we just return the busy list.
  return NextResponse.json(
    { busy },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
  );
}
