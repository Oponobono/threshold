const https = require('https');

async function testYouTubeCaptions(videoId) {
  console.log(`[TEST] Buscando subtítulos para el video: ${videoId}`);
  
  // Test 1: Intentar buscar en la página del video (método scraping robusto)
  console.log(`\n--- Test 1: Scraping directo de YouTube ---`);
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      }
    });
    const html = await response.text();
    
    // Buscar la configuración del reproductor
    const match = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (match && match[1]) {
      const tracks = JSON.parse(match[1]);
      console.log(`¡Éxito! Tracks encontrados: ${tracks.length}`);
      tracks.forEach(t => console.log(` - Idioma: ${t.languageCode}, URL: ${t.baseUrl.substring(0, 50)}...`));
      
      // Probar obtener el primero
      if (tracks.length > 0) {
        const trackRes = await fetch(tracks[0].baseUrl);
        const xml = await trackRes.text();
        console.log(`XML obtenido exitosamente. Longitud: ${xml.length} caracteres.`);
      }
    } else {
      console.log('No se encontraron captionTracks en el HTML. El video puede no tenerlos o YouTube cambió el formato.');
      if (html.includes('captcha') || html.includes('consent.youtube.com')) {
        console.log('¡ALERTA! YouTube está bloqueando la petición con un Captcha o pantalla de consentimiento.');
      }
    }
  } catch (e) {
    console.error(`Error en Test 1: ${e.message}`);
  }

  // Test 2: timedtext API directa
  console.log(`\n--- Test 2: API timedtext directa ---`);
  try {
    const listRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&type=list`);
    const listXml = await listRes.text();
    console.log(`Respuesta lista timedtext: ${listXml.substring(0, 100)}...`);
  } catch (e) {
    console.error(`Error en Test 2: ${e.message}`);
  }
}

// Probar con un video genérico de TED (que siempre tiene subtítulos) y con los argumentos si los pasamos
const testId = process.argv[2] || 'T6piEbA6o9s'; // TED en español "El poder de la vulnerabilidad"
testYouTubeCaptions(testId);
