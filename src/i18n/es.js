export default {
  'app.title': 'Great Reads',
  'app.tagline': 'Tu gusto lector, convertido en la próxima recomendación.',

  'upload.title': '1. Subí tu biblioteca de Goodreads',
  'upload.instructions': 'Goodreads → My Books → Import/Export → Export Library',
  'upload.importLink': 'Abrir',
  'upload.importLinkFull': 'Abrir la página de importación/exportación de Goodreads',
  'upload.button': 'Elegir archivo CSV',
  'upload.fileSelected': 'Seleccionado: {filename}',
  'upload.parseError':
    'No pudimos leer ese archivo. Verificá que sea tu biblioteca de Goodreads exportada en CSV.',

  'key.title': '2. Pegá tu API key de Gemini',
  'key.instructions':
    'La key se guarda solo en este navegador, en tu propia computadora. Great Reads no tiene servidor, así que nada de lo que pegues acá sale de tu máquina, salvo los llamados directos a Google.',
  'key.getKeyLink': 'Conseguí una API key gratis en Google AI Studio',
  'key.help.summary': '¿Cómo consigo una?',
  'key.help.step1':
    'Entrá a Google AI Studio (el link de arriba) e iniciá sesión con cualquier cuenta de Google.',
  'key.help.step2': 'Andá a la sección de API keys y hacé clic en "Create API key".',
  'key.help.step3':
    'Elegí un proyecto de Google Cloud que ya tengas, o dejá que AI Studio te cree uno. Cualquiera de las dos sirve.',
  'key.help.step4':
    'Copiá la key que te muestra y pegala en el campo de abajo.',
  'key.help.freeNote':
    'El nivel gratuito no pide tarjeta de crédito. Tiene límites por minuto y por día, de sobra para unas cuantas tandas de recomendaciones.',
  'key.help.secretNote':
    'Tratá la key como una contraseña: no la compartas ni la subas a ningún repo. Podés borrarla desde AI Studio cuando quieras.',
  'key.placeholder': 'Pegá tu API key',
  'key.alreadySaved': 'Ya tenés una key guardada en este navegador.',
  'key.change': 'Cambiar key',
  'key.forget': 'Olvidar mi key',
  'key.validating': 'Verificando tu key…',
  'key.invalid': 'Google rechazó esa key. Revisala e intentá de nuevo.',
  'key.transientError':
    'La API de Google está temporalmente sobrecargada o inaccesible. No es un problema con tu key. Esperá un momento e intentá de nuevo.',
  'key.billingError':
    'El proyecto de esta key se quedó sin créditos prepagos, y esperar no lo va a solucionar. Agregá facturación en ai.studio/projects, o usá otra key del nivel gratuito.',
  'key.save': 'Guardar y continuar',

  'generate.button': 'Obtener recomendaciones',
  'generate.regenerate': 'Regenerar',
  'generate.loading': 'Analizando tu gusto lector…',
  'generate.loadingCatalog': 'Verificando {done} de {total} libros contra los catálogos…',
  'generate.regenerating': 'Regenerando…',
  'generate.needsCsv':
    'Estas son tus últimas recomendaciones guardadas. Volvé a subir tu biblioteca de Goodreads para regenerar.',
  'generate.usingSavedLibrary':
    'Al regenerar se va a usar la biblioteca que subiste el {date}. Subí una exportación nueva para actualizarla.',
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
    '{count, plural, one {# recomendación descartada} other {# recomendaciones descartadas}}: no se encontraron en ningún catálogo.',
  'results.staleReason': 'Esta explicación es de un idioma anterior. Regenerá para actualizarla.',
  'results.markRead': 'Ya lo leí',
  'results.markNotInterested': 'No me interesa',
  'results.openLibraryLink': 'Ver en Open Library',
  'results.goodreadsSearchLink': 'Buscar en Goodreads',
  'results.empty': 'Subí tu biblioteca y agregá tu API key para empezar.',

  'privacy.note': 'Todo pasa en tu navegador. Sin cuenta, sin servidor, sin base de datos.',
  'privacy.clearAll': 'Borrar todos mis datos',
  'privacy.clearConfirm':
    'Esto borra de este navegador tu API key, tus recomendaciones guardadas, el resumen de tu biblioteca y tus marcas de leído y sin interés. ¿Seguimos?',

  'faq.title': 'Preguntas frecuentes',
  'faq.q.stored': '¿Qué guarda Great Reads en mi máquina?',
  'faq.a.stored':
    'Cinco cosas, guardadas directo en tu navegador, en tu propia computadora: tu API key, tu última tanda de recomendaciones, un resumen comprimido de tu biblioteca, los libros que marcaste como leídos o sin interés, y un cache de las búsquedas en catálogos. Nada más, y nada en ningún servidor.',
  'faq.q.discarded': '¿Por qué desaparecieron algunas recomendaciones?',
  'faq.a.discarded':
    'Cada recomendación se valida contra Open Library y después contra Google Books. Si en ninguno aparece un libro cuyo título y apellido de autor coincidan, se descarta. Eso es lo que mantiene los libros inventados fuera de tus resultados.',
  'faq.q.cost': '¿Cuánto cuesta?',
  'faq.a.cost':
    'Nada. El nivel gratuito de Gemini alcanza y no pide tarjeta de crédito. Si llegás al límite por minuto, esperá un momento y regenerá.',
  'faq.q.reset': '¿Cómo borro todo?',
  'faq.a.reset':
    'Usá "Borrar todos mis datos" al pie de la página: elimina las cinco de una. "Olvidar mi key" es más acotado y borra solo la key.',

  'footer.sourceLink': 'Ver código fuente',
  'footer.xLink': '@nicogaldamez',
};
