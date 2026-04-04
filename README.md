# ⚡ LeadFinder - Prospección B2B con IA

Herramienta de prospección B2B que busca negocios en Google Maps, extrae emails y redes sociales de sus webs, analiza reseñas con IA para encontrar pain points, y genera cold emails personalizados.

Inspirada en MapiLeads, pero open source y de coste prácticamente $0.

## Funcionalidades

- 🔍 **Búsqueda de negocios** via Google Places API (o modo demo sin API key)
- 📧 **Extracción de emails** scrapeando la web del negocio (páginas de contacto, about, etc.)
- 📱 **Extracción de redes sociales** (Facebook, Instagram, LinkedIn, X, TikTok, YouTube)
- 🧠 **Análisis de reseñas con IA** — detecta debilidades, fortalezas, pain points y genera un score de oportunidad
- ✉️ **Generación de cold emails** personalizados en ES/PT/EN, basados en los problemas reales del lead
- 📥 **Exportación a CSV** compatible con Excel/Google Sheets
- 🔄 **Enriquecimiento masivo** de todos los leads con un clic

## Stack

- React + Vite
- Claude API (Sonnet) para análisis IA
- Google Places API para datos de negocios
- AllOrigins como proxy CORS para scraping de webs

## Coste

| Servicio | Coste |
|---|---|
| Google Places API | $0 (primeros $200/mes gratis) |
| Claude API | ~$0.01 por lead analizado |
| Hosting (Vercel) | $0 |
| **Total** | **~$0-5/mes** |

## Deploy en Vercel

1. Fork o clona este repo
2. Ve a [vercel.com/new](https://vercel.com/new)
3. Importa el repo → Framework: **Vite**
4. Click **Deploy**

## Configuración

1. Abre la app → ⚙ Config
2. Pega tu **Google Places API Key** (opcional, sin ella funciona en modo demo)
3. Edita tu **perfil de negocio** para que la IA cruce tus servicios con los pain points de cada lead

## Uso

1. Busca un tipo de negocio + ciudad
2. Click en un lead → pestaña **Inteligencia** → "Analizar con IA"
3. La IA detecta debilidades y cruza con tu oferta
4. Pestaña **Email** → elige idioma → genera email personalizado
5. Copia o abre directamente en Gmail

## Licencia

MIT
