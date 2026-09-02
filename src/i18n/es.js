export default {
  'app.title': 'Bookito',
  'app.tagline': 'Recomendaciones de libros a partir de tu historial de Goodreads',
  'app.langToggle.es': 'ES',
  'app.langToggle.en': 'EN',

  'upload.title': '1. Subí tu export de Goodreads',
  'upload.instructions': 'Goodreads → My Books → Import/Export → Export Library',
  'upload.button': 'Elegir archivo CSV',
  'upload.fileSelected': 'Seleccionado: {filename}',
  'upload.parseError':
    'No pudimos leer ese archivo. Verificá que sea un export de biblioteca de Goodreads en CSV.',

  'key.title': '2. Pegá tu API key de Gemini',
  'key.instructions':
    'La key se guarda solo en este navegador (localStorage). Bookito no tiene servidor — nada de lo que pegues acá sale de tu máquina, salvo los llamados directos a Google.',
  'key.getKeyLink': 'Conseguí una API key gratis en Google AI Studio',
  'key.placeholder': 'Pegá tu API key',
  'key.forget': 'Olvidar mi key',
  'key.validating': 'Verificando tu key…',
  'key.invalid': 'Google rechazó esa key. Revisala e intentá de nuevo.',
  'key.transientError':
    'La API de Google está temporalmente sobrecargada o inaccesible — no es un problema con tu key. Esperá un momento e intentá de nuevo.',
  'key.billingError':
    'El proyecto de esta key se quedó sin créditos prepagos — esperar no lo va a solucionar. Agregá facturación en ai.studio/projects, o usá otra key del nivel gratuito.',
  'key.save': 'Guardar y continuar',

  'generate.button': 'Obtener recomendaciones',
  'generate.regenerate': 'Regenerar',
  'generate.loading': 'Analizando tu gusto lector…',
  'generate.error.quota':
    'Llegaste al límite gratuito de Gemini. Esperá un poco e intentá de nuevo.',
  'generate.error.generic': 'Algo falló al hablar con Gemini. Intentá de nuevo en un momento.',
  'generate.error.unparsable': 'No pudimos interpretar la respuesta de Gemini. Probá regenerar.',

  'results.title': 'Recomendaciones',
  'results.filter.all': 'Todas',
  'results.filter.safe': 'Apuestas seguras',
  'results.filter.stretch': 'Elecciones laterales',
  'results.badge.safe': 'Apuesta segura',
  'results.badge.stretch': 'Elección lateral',
  'results.discarded':
    '{count, plural, one {# recomendación descartada} other {# recomendaciones descartadas}} — no se encontraron en ningún catálogo.',
  'results.staleReason': 'Esta explicación es de un idioma anterior — regenerá para actualizarla.',
  'results.markRead': 'Ya lo leí',
  'results.markNotInterested': 'No me interesa',
  'results.openLibraryLink': 'Ver en Open Library',
  'results.goodreadsSearchLink': 'Buscar en Goodreads',
  'results.empty': 'Subí tu biblioteca y agregá tu API key para empezar.',

  'privacy.note': 'Todo pasa en tu navegador. Sin cuenta, sin servidor, sin base de datos.',

  'footer.sourceLink': 'Ver código fuente en GitHub',
};
