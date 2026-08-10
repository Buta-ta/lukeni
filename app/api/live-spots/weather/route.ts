import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const WEATHER_API_KEY =
  process.env.WEATHER_API_KEY?.trim() ||
  process.env.OPENWEATHER_API_KEY?.trim();

const WEATHER_BASE_URL =
  'https://api.openweathermap.org/data/2.5/weather';

export async function POST(request: NextRequest) {
  if (!WEATHER_API_KEY) {
    return NextResponse.json(
      { error: 'Configuration API météo manquante' },
      { status: 500 }
    );
  }

  const { city, countryCode, spotId } = await request.json();

  if (!city || !countryCode) {
    return NextResponse.json(
      { error: 'Ville et pays requis' },
      { status: 400 }
    );
  }

  try {
    const query = `${city},${countryCode}`;
    const url = `${WEATHER_BASE_URL}?q=${encodeURIComponent(query)}&appid=${WEATHER_API_KEY}&units=metric&lang=fr`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Ville introuvable' },
        { status: 400 }
      );
    }

    const weatherData = {
      temp: Math.round(data.main.temp),
      condition: data.weather[0].description,
      icon: data.weather[0].icon,
      lat: data.coord.lat,
      lng: data.coord.lon,
      cityName: data.name
    };

    // Si spotId fourni, mettre à jour en base avec supabaseAdmin
    if (spotId && supabaseAdmin) {
      await supabaseAdmin
        .from('live_spots')
        .update({
          weather_lat: weatherData.lat,
          weather_lng: weatherData.lng,
          last_weather_temp: weatherData.temp,
          last_weather_condition: weatherData.condition,
          last_weather_icon: weatherData.icon,
          last_weather_fetched_at: new Date().toISOString()
        })
        .eq('id', spotId);
    }

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération météo' },
      { status: 500 }
    );
  }
}