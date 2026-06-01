// app/api/geoip/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-client-ip') ||
               'unknown';

    return NextResponse.json({ ip, message: 'Use browser Geolocation API instead' });
  } catch (error) {
    return NextResponse.json({ error: 'Geolocation failed' }, { status: 500 });
  }
}