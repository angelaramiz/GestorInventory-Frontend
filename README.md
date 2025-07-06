# GestorInventory

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/angelaramiz/GestorInventory-Frontend)

GestorInventory es un sistema completo de gestión de inventario basado en web que permite a empresas y negocios administrar eficientemente sus productos e inventarios. Desarrollado con tecnologías modernas como JavaScript, Supabase para almacenamiento en la nube y capacidades offline mediante IndexedDB.

![GestorInventory Logo](assets/logo.svg)

## 🚀 Características principales

### 📦 Gestión de Productos
- **Agregar productos**: Registro completo con códigos de barras, nombres, categorías y más.
- **Búsqueda avanzada**: Consulta productos por código, nombre o categoría con filtros personalizables.
- **Edición completa**: Actualización rápida de información de productos existentes.
- **Gestión por áreas**: Organiza tus productos por ubicaciones o departamentos.
- **Categorización**: Agrupa productos por tipo, marca o cualquier categoría personalizada.

### 📊 Gestión de Inventario
- **Control multi-lote**: Manejo detallado de diferentes lotes del mismo producto.
- **Trazabilidad completa**: Seguimiento de:
  - Cantidad exacta y unidades de medida personalizables.
  - Fechas de caducidad con alertas configurables.
  - Números de lote y control de proveedores.
  - Comentarios y notas específicas por lote.
- **Historial de movimientos**: Registro completo de entradas, salidas y ajustes de inventario.
- **Alertas automáticas**: Notificaciones de stock mínimo y productos próximos a caducar.

### 📤 Importación/Exportación
- **Carga masiva**: Importa cientos de productos mediante archivos CSV.
- **Exportación personalizada**: Genera reportes en formato CSV filtrados por diferentes criterios.
- **Informes en PDF**: Reportes profesionales de inventario con códigos de barras incluidos.
- **Plantillas inteligentes**: Descarga plantillas preconfiguradas para facilitar la carga de datos.

### 📱 Escaneo de códigos
- **Lectura rápida**: Escaneo de códigos de barras para operaciones instantáneas.
- **Multi-formato**: Compatible con códigos EAN-13, UPC, CODE128 y otros formatos estándar.
- **Uso de cámara**: Funciona con webcams y cámaras de dispositivos móviles.
- **Generación de códigos**: Crea e imprime códigos de barras para tus productos.

## 📚 Tutorial de uso

### 🔑 Primeros pasos

1. **Registro e inicio de sesión**:
   - Accede a `register.html` para crear una nueva cuenta.
   - Verifica tu correo electrónico mediante el enlace enviado.
   - Inicia sesión con tus credenciales en `login.html`.

2. **Configuración inicial**:
   - Configura las áreas o ubicaciones de tu inventario.
   - Define las categorías de productos que utilizarás.
   - Personaliza las unidades de medida según tus necesidades.

### 📝 Gestión de productos

1. **Agregar un nuevo producto**:
   - Navega a la sección "Agregar productos".
   - Completa todos los campos requeridos (código, nombre, descripción).
   - Opcionalmente, escanea el código de barras usando el botón "Escanear".
   - Asigna categoría, proveedor y otros detalles.
   - Haz clic en "Guardar" para registrar el producto.

2. **Buscar y consultar productos**:
   - Accede a "Consulta de productos".
   - Utiliza los filtros por código, nombre o categoría.
   - Los resultados se mostrarán en una tabla ordenable.
   - Haz clic en cualquier producto para ver detalles adicionales.

3. **Editar un producto existente**:
   - Desde la pantalla de consulta, localiza el producto deseado.
   - Haz clic en el botón "Editar" junto al producto.
   - Modifica los campos necesarios.
   - Guarda los cambios con el botón "Actualizar".

### 📦 Manejo de inventario

1. **Registrar entrada de inventario**:
   - Ve a la sección "Inventario".
   - Busca el producto utilizando su código o nombre.
   - Ingresa la cantidad, unidad de medida y fecha de caducidad.
   - Especifica número de lote y comentarios si es necesario.
   - Confirma la entrada con el botón "Registrar".

2. **Gestionar múltiples lotes**:
   - Al ingresar producto, especifica un número de lote distinto.
   - El sistema mantendrá un registro separado para cada lote.
   - Puedes ver todos los lotes de un producto en la pantalla de detalle.

3. **Consultar existencias**:
   - En la sección "Consulta", usa el filtro de existencias.
   - Visualiza productos con stock bajo, agotados o en exceso.
   - Revisa la fecha de caducidad de cada lote disponible.

### 📊 Reportes e informes

1. **Generar reporte de inventario**:
   - Accede a la sección "Reportes".
   - Selecciona el tipo de reporte (general, por área, por caducidad).
   - Aplica filtros adicionales según necesites.
   - Haz clic en "Generar PDF" para crear un informe visual.
   - Para datos en bruto, usa "Exportar a CSV".

2. **Personalizar reportes PDF**:
   - Elige qué información mostrar (códigos de barras, fechas, comentarios).
   - Ordena los productos según diferentes criterios.
   - Decide si fusionar o no los productos con múltiples lotes.
   - Visualiza el reporte antes de descargarlo.

3. **Analizar el inventario**:
   - Utiliza los reportes para identificar productos de baja rotación.
   - Detecta productos próximos a caducar para tomar acciones preventivas.
   - Evalúa niveles de stock para optimizar reabastecimiento.

### 📤 Importación y exportación

1. **Importar productos desde CSV**:
   - Descarga la plantilla desde la sección "Archivos".
   - Completa la información siguiendo el formato establecido.
   - Sube el archivo CSV completo.
   - Revisa la validación previa y corrige errores si es necesario.
   - Confirma la importación.

2. **Exportar datos**:
   - Selecciona la información que deseas exportar.
   - Filtra según tus necesidades específicas.
   - Descarga el archivo CSV generado.
   - Abre con Excel u otra herramienta de hojas de cálculo para análisis adicional.

## 🧰 Estructura del Proyecto

```
├── README.md               # Documentación del proyecto
├── index.html              # Punto de entrada principal
├── login.html              # Página de inicio de sesión
├── register.html           # Página de registro de usuarios
├── manifest.json           # Configuración PWA
├── service-worker.js       # Soporte para funcionamiento offline
├── css/
│   └── styles.css          # Estilos generales
├── js/
│   ├── auth.js             # Autenticación con Supabase
│   ├── db-operations.js    # Operaciones de base de datos
│   ├── logs.js             # Sistema de mensajes y alertas
│   ├── main.js             # Lógica principal de la aplicación
│   ├── product-operations.js # Operaciones relacionadas con productos
│   ├── rep.js              # Generación de reportes PDF con códigos de barras
│   ├── sanitizacion.js     # Funciones de sanitización de datos
│   └── scanner.js          # Funcionalidad de escaneo de códigos
├── librerías/              # Dependencias externas
│   ├── html5-qrcode.min.js # Lectura de códigos QR/barras
│   ├── JsBarcode.all.min.js # Generación de códigos de barras
│   ├── jspdf.umd.min.js    # Generación de PDF
│   ├── sweetalert2@11.js   # Alertas y diálogos mejorados
│   └── tailwind.min.css    # Framework CSS
└── plantillas/
    ├── agregar.html        # Plantilla para agregar productos
    ├── archivos.html       # Gestión de archivos CSV
    ├── confirm-email.html  # Confirmación de email
    ├── consulta.html       # Consulta de productos
    ├── editar.html         # Edición de productos
    ├── inventario.html     # Registro de inventario
    ├── main.html           # Página principal tras login
    ├── report.html         # Generación de reportes
    ├── request-password-reset.html # Solicitud de reinicio de contraseña
    └── reset-password.html # Reinicio de contraseña
```

## ⚙️ Requisitos técnicos

- **Navegador moderno** con soporte para:
  - IndexedDB (almacenamiento local)
  - WebRTC (para funcionalidad de escaneo)
  - Service Workers (para capacidades offline)
- **Conexión a internet** para:
  - Sincronización con la base de datos en la nube
  - Autenticación de usuarios
  - Carga inicial de la aplicación
- **Dispositivo con cámara** para escanear códigos de barras (opcional)
- **Impresora** para imprimir reportes y etiquetas (opcional)

## 🔧 Instalación

1. **Clonar el repositorio**:
   ```powershell
   git clone https://github.com/tu-usuario/GestorInventory.git
   ```

2. **Configurar variables de entorno**:
   - Crea un archivo `.env` en la raíz del proyecto.
   - Agrega las credenciales de Supabase:
     ```
     SUPABASE_URL=tu_url_de_supabase
     SUPABASE_KEY=tu_clave_anon_supabase
     ```

3. **Iniciar la aplicación**:
   - Para desarrollo local, puedes usar un servidor como Live Server en VS Code.
   - Alternativamente, despliega en un servidor web como Apache o Nginx.
   - También puedes acceder directamente abriendo `index.html` en tu navegador.

## 💡 Consejos y buenas prácticas

### Organización efectiva del inventario

1. **Establece una jerarquía clara de categorías**:
   - Crea categorías principales y subcategorías bien definidas.
   - Mantén una estructura consistente para facilitar la búsqueda.

2. **Utiliza códigos de producto significativos**:
   - Si creas códigos manuales, sigue un patrón lógico.
   - Considera incluir información como categoría o ubicación en el código.

3. **Aprovecha los comentarios y etiquetas**:
   - Usa comentarios para información temporal o contextual.
   - Crea etiquetas para clasificaciones transversales que no encajan en categorías.

4. **Realiza inventarios regularmente**:
   - Programa conteos físicos periódicos y compara con el sistema.
   - Utiliza los reportes de pre-conteo para facilitar la verificación física.

### Optimización del flujo de trabajo

1. **Usa el escáner siempre que sea posible**:
   - Reduce errores de entrada manual con el escáner de códigos.
   - Considera adquirir un escáner de mano para mayor eficiencia.

2. **Procesa lotes por fechas de caducidad**:
   - Establece la política FEFO (First Expired, First Out).
   - Configura alertas tempranas para productos próximos a caducar.

3. **Automatiza con importación/exportación**:
   - Crea plantillas personalizadas para tus proveedores recurrentes.
   - Programa exportaciones automáticas para reportes periódicos.

4. **Usa dispositivos móviles in situ**:
   - Accede al sistema desde tabletas o móviles en el almacén.
   - Realiza entradas y salidas en tiempo real donde ocurren.

## 🔍 Solución de problemas comunes

### Problemas de autenticación

- **No puedo iniciar sesión**:
  1. Verifica que tu correo esté confirmado.
  2. Comprueba que no haya espacios adicionales en tu correo o contraseña.
  3. Utiliza la opción "Olvidé mi contraseña" si es necesario.

- **No recibo el correo de confirmación**:
  1. Revisa la carpeta de spam o correo no deseado.
  2. Verifica que la dirección de correo sea correcta.
  3. Contacta al administrador para verificación manual.

### Problemas con el escáner

- **La cámara no se activa**:
  1. Verifica que hayas concedido permisos de cámara al navegador.
  2. Prueba con otro navegador (Chrome suele funcionar mejor).
  3. Comprueba que no haya otra aplicación usando la cámara.

- **El código no se reconoce**:
  1. Asegúrate de tener buena iluminación sin reflejos.
  2. Mantén el código a una distancia adecuada (15-20 cm).
  3. Comprueba que el código no esté dañado o sea demasiado pequeño.

### Problemas con reportes e importación

- **El reporte PDF se genera vacío o con errores**:
  1. Verifica que los filtros no sean demasiado restrictivos.
  2. Intenta generar el reporte con menos información (desactivando códigos de barras).
  3. Divide el reporte en múltiples reportes más pequeños si contiene muchos productos.

- **Error en la importación de CSV**:
  1. Comprueba que el archivo siga exactamente el formato de la plantilla.
  2. Verifica que no haya caracteres especiales o formato adicional.
  3. Asegúrate de que los campos obligatorios estén completos.
  4. Guarda el archivo en formato CSV UTF-8.

## 📱 Acceso móvil y uso offline

GestorInventory está diseñado para funcionar en dispositivos móviles y en situaciones con conectividad limitada:

1. **Uso en dispositivos móviles**:
   - La interfaz es responsive y se adapta a pantallas pequeñas.
   - Optimizado para uso táctil en tablets y smartphones.

2. **Capacidades offline**:
   - La aplicación sigue funcionando sin conexión a internet.
   - Los datos se almacenan localmente y se sincronizan cuando hay conexión.
   - El escaneo de códigos funciona completamente sin conexión.

3. **Sincronización automática**:
   - Los cambios realizados offline se suben automáticamente al recuperar la conexión.
   - Sistema de resolución de conflictos para cambios simultáneos.

## 🛡️ Seguridad y respaldo

1. **Copias de seguridad**:
   - Exporta regularmente tus datos usando la función de exportación CSV.
   - El sistema realiza copias de seguridad automáticas en la nube (si está configurado).

2. **Control de acceso**:
   - Diferentes niveles de usuario (administrador, operador, visualizador).
   - Registro de acciones para auditoría y trazabilidad.

3. **Protección de datos**:
   - Información sensible encriptada en tránsito y en reposo.
   - Cumplimiento con normativas de protección de datos.

---

## 📞 Soporte y contacto

Para cualquier consulta, problema técnico o sugerencia, contacta con el equipo de desarrollo:

- **Correo electrónico**: soporte@gestorinventory.com
- **GitHub**: [Reportar un problema](https://github.com/tu-usuario/GestorInventory/issues)
- **Documentación completa**: [Wiki del proyecto](https://github.com/tu-usuario/GestorInventory/wiki)
- **DeepWiki**: [https://deepwiki.com/angelaramiz/GestorInventory-Frontend](https://deepwiki.com/angelaramiz/GestorInventory-Frontend)

---

*Última actualización: Mayo 2025* 
