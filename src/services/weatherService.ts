export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

export async function getFestivalWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await response.json();
    
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;
    
    // Simple mapping of WMO codes to conditions
    let condition = "Limpo";
    if (code > 0 && code < 4) condition = "Parcialmente Nublado";
    if (code >= 45 && code < 50) condition = "Neblina";
    if (code >= 51 && code < 70) condition = "Chuva";
    if (code >= 71) condition = "Neve";

    return {
      temp,
      condition,
      icon: "🌤️"
    };
  } catch (error) {
    console.error("Weather fetch failed", error);
    return { temp: 25, condition: "Desconhecido", icon: "❓" };
  }
}
