# 📱 GestorInventory - Sistema de Gestión de Inventario

### 🚀 **Funcionalidades Avanzadas**
- ✅ **Sistema de lotes avanzado** con control granular
- ✅ **Temas oscuro/claro** automáticos
- ✅ **PWA completa** instalable como aplicación web
- ✅ **Sincronización automática** con resolución de conflictos
- ✅ **Modo offline completo** con IndexedDB

---

## 📋 **Changelog - Últimas Actualizaciones**

### 🔄 **Agosto 2025 - Corrección de Precisión Decimal**
- ✅ **Corrección crítica**: Solucionado problema de truncamiento de cantidades decimales
- ✅ **Inventario manual**: Las cantidades como "5.999" y "14.500" ahora se guardan correctamente
- ✅ **Inventario por lotes avanzado**: Preservación de precisión decimal en pesos y cantidades
- ✅ **Validación mejorada**: Nueva validación que acepta valores decimales incluyendo cero
- ✅ **Funciones afectadas**:
  - `guardarInventario()`: Cambio de `parseInt()` a `parseFloat()` y validación mejorada
  - `modificarInventario()`: Cambio de `parseInt()` a `parseFloat()`
  - `guardarInventarioLotesAvanzado()`: Eliminación de `Math.round()` que causaba truncamiento
- ✅ **Compatibilidad**: Mantiene compatibilidad total con datos existentes
- ✅ **Base de datos**: Supabase almacena ahora correctamente los valores decimales

---

## 📋 **Changelog - Últimas Actualizaciones**

### 🛠️ **17 de agosto de 2025 - Correcciones y Mejoras**

#### 📷 Escáner (Modal y Ciclo de Vida)
- ✅ **Corrección crítica**: Eliminado listener duplicado que causaba apertura de dos vistas de cámara
- ✅ **Hardened lifecycle**: Funciones de inicio/stop/clear ahora detienen explícitamente `MediaStreamTrack`s como fallback
- ✅ **Protección concurrencia**: Añadidos try/catch y flags de transición para evitar llamadas concurrentes
- ✅ **Beneficio**: Evita cámaras persistentes y errores "cannot stop/resume" en distintos navegadores

#### 🎯 Lotes Avanzado (Robustez y Nueva Opción)
- ✅ **Null-safety**: Reparados errores TypeError por accesos DOM sin comprobación
- ✅ **Scope corregido**: `iniciarEscanerLotesAvanzadoHtml5Qrcode` accesible desde todos los flujos
- ✅ **Pausa/Reanudar mejorado**: Envoltorios con try/catch y fallback a `start()` si `resume()` falla
- ✅ **Nueva opción**: `relacionarProductos` (por defecto ON) para controlar consultas a `productos_subproductos`
- ✅ **Interfaz**: Nuevo checkbox en inventario para alternar la opción
- ✅ **Persistencia**: Opción guardada en `localStorage` con key `lotes_relacionarProductos`
- ✅ **Debounce mejorado**: Mejor manejo para evitar bucles de re-escaneo

#### 📄 Reportes PDF (Preconteo)
- ✅ **Fecha de generación**: Impresa en el encabezado de cada página (formato es-ES)
- ✅ **Paginación**: Numeración "Página X/Y" en cada hoja, sin solapamiento
- ✅ **Compatibilidad**: Eliminados emojis en títulos de agrupaciones para evitar caracteres garbled
- ✅ **Beneficio**: Reportes legibles y consistentes en diferentes entornos

> 📖 Para detalles técnicos completos de las modificaciones, ver `CAMBIOS.md` en la raíz del proyecto.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/angelaramiz/GestorInventory-Frontend)
![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![Mobile Optimized](https://img.shields.io/badge/mobile-optimized-green.svg)
![PWA Ready](https://img.shields.io/badge/PWA-ready-purple.svg)

**GestorInventory** es un sistema completo de gestión de inventario basado en web, **completamente optimizado para móviles**, que permite a empresas y negocios administrar eficientemente sus productos e inventarios desde cualquier dispositivo. Desarrollado con tecnologías modernas como JavaScript, Supabase para almacenamiento en la nube y capacidades offline mediante IndexedDB.

![GestorInventory Logo](assets/logo.svg)

---

## 🌟 **Novedades v2.0**

### � **Optimización Móvil Completa**
- ✅ **Diseño responsivo avanzado** para móviles, tablets y desktop
- ✅ **Tablas inteligentes** que se convierten automáticamente en tarjetas en móviles
- ✅ **Formularios optimizados** con teclados específicos y navegación mejorada
- ✅ **Componentes táctiles** con feedback visual y áreas de toque optimizadas
- ✅ **Menús adaptativos** con overlays y navegación gestual

### �🚀 **Funcionalidades Avanzadas**
- ✅ **Sistema de lotes avanzado** con control granular
- ✅ **Temas oscuro/claro** automáticos
- ✅ **PWA completa** instalable como aplicación nativa
- ✅ **Sincronización automática** con resolución de conflictos
- ✅ **Modo offline completo** con IndexedDB

---

## 🚀 Características principales

### 📦 **Gestión de Productos**
- **➕ Agregar productos**: Registro completo con códigos de barras, nombres, categorías y más
- **🔍 Búsqueda avanzada**: Consulta productos por código, nombre o categoría con filtros personalizables
- **✏️ Edición completa**: Actualización rápida de información de productos existentes
- **📍 Gestión por áreas**: Organiza tus productos por ubicaciones o departamentos
- **🏷️ Categorización**: Agrupa productos por tipo, marca o cualquier categoría personalizada
- **📱 Optimizado móvil**: Formularios adaptativos y navegación táctil mejorada

### 📊 **Gestión de Inventario Avanzada**
- **🎯 Control multi-lote**: Manejo detallado de diferentes lotes del mismo producto
- **� Precisión decimal**: Soporte completo para cantidades decimales (ej: 5.999, 14.500, 0.25)
- **�📋 Trazabilidad completa**: Seguimiento de:
  - Cantidad exacta y unidades de medida personalizables con precisión decimal
  - Fechas de caducidad con alertas configurables
  - Números de lote y control de proveedores
  - Comentarios y notas específicas por lote
  - Ubicaciones y movimientos internos
- **📈 Historial de movimientos**: Registro completo de entradas, salidas y ajustes
- **🔔 Alertas inteligentes**: Notificaciones de stock mínimo y productos próximos a caducar
- **📱 Vista móvil**: Tarjetas adaptativas que muestran información prioritaria

### 📤 **Importación/Exportación**
- **📥 Carga masiva**: Importa cientos de productos mediante archivos CSV
- **📊 Exportación personalizada**: Genera reportes en CSV filtrados por criterios
- **📄 Informes en PDF**: Reportes profesionales con códigos de barras incluidos
- **📋 Plantillas inteligentes**: Descarga plantillas preconfiguradas para facilitar la carga
- **📱 Responsive**: Interfaz optimizada para gestión desde móviles

### 📱 **Escaneo de Códigos Optimizado**
- **⚡ Lectura rápida**: Escaneo instantáneo de códigos de barras
- **🔄 Multi-formato**: Compatible con EAN-13, UPC, CODE128 y otros formatos estándar
- **📷 Cámara móvil**: Optimizado para cámaras de smartphones y tablets
- **🏷️ Generación**: Crea e imprime códigos de barras para tus productos
- **📱 UX móvil**: Modal de escaneo adaptativo con controles táctiles

---

## �️ **Tecnologías y Arquitectura**

### 🎨 **Frontend Avanzado**
- **HTML5 semántico** con estructura modular y plantillas reutilizables
- **CSS3 moderno** con sistema de temas y componentes móviles
- **JavaScript ES6+** con arquitectura por módulos y clases
- **Tailwind CSS** como framework de utilidades responsive
- **Progressive Web App (PWA)** con service worker y manifest

### 📱 **Optimización Móvil**
- **MobileOptimizer**: Clase JavaScript para detección de dispositivos y optimización automática
- **TableMobileOptimizer**: Sistema inteligente de conversión tabla-a-tarjeta
- **Mobile Components**: Biblioteca de componentes específicos para móviles (FAB, cards, navigation)
- **Touch Optimization**: Feedback táctil, áreas de toque optimizadas y gestos nativos

### �️ **Backend y Almacenamiento**
- **Supabase**: Backend como servicio con autenticación y base de datos PostgreSQL
- **IndexedDB**: Almacenamiento local para modo offline completo
- **Service Worker**: Sincronización en background y cache inteligente
- **Real-time sync**: Sincronización bidireccional con resolución de conflictos

### 📊 **Gestión de Estado**
- **Módulos ES6**: Arquitectura modular con separación de responsabilidades
- **LocalStorage**: Configuraciones de usuario y preferencias de tema
- **SessionStorage**: Estado temporal y datos de sesión
- **Event-driven**: Sistema de eventos para comunicación entre módulos

---

## 📚 **Guía de Inicio Rápido**

### �🔑 **Primeros Pasos**

1. **🚀 Instalación como PWA**:
   - Abre el proyecto en tu navegador móvil
   - Toca "Agregar a pantalla de inicio" en el menú del navegador
   - Disfruta de la experiencia nativa desde tu dispositivo

2. **👤 Registro e Inicio de Sesión**:
   - Accede a `register.html` para crear una nueva cuenta
   - Verifica tu correo electrónico mediante el enlace enviado
   - Inicia sesión con tus credenciales desde cualquier dispositivo

3. **⚙️ Configuración Inicial**:
   - **Móvil**: Usa el menú hamburguesa → Configuraciones
   - **Desktop**: Navega a la sección de configuraciones
   - Define áreas, categorías y unidades de medida
   - Personaliza tema (claro/oscuro/automático)

### 📝 **Gestión de Productos Optimizada**

1. **➕ Agregar Nuevo Producto**:
   - **Móvil**: Usa el botón FAB (flotante) "+" en la esquina
   - **Desktop**: Navega a "Agregar productos"
   - **Formulario inteligente**: Los campos se adaptan al tipo de dispositivo
   - **Escaneo QR/Barcode**: Toca el ícono de cámara para escanear
   - **Validación en tiempo real**: Los errores se muestran instantáneamente

2. **🔍 Búsqueda y Consulta**:
   - **Búsqueda inteligente**: Busca por código, nombre o categoría
   - **Vista adaptativa**: 
     - **Móvil**: Tarjetas con información prioritaria
     - **Desktop**: Tabla completa con todos los detalles
   - **Filtros avanzados**: Filtra por área, categoría, stock, etc.
   - **Resultados instantáneos**: Búsqueda con debounce optimizado

3. **✏️ Edición Rápida**:
   - **Móvil**: Toca cualquier tarjeta para editar
   - **Desktop**: Clic en "Editar" en la tabla
   - **Formularios adaptativos**: Teclados específicos según el campo
   - **Guardado automático**: Los cambios se sincronizan automáticamente

### 📦 **Gestión de Inventario con Lotes**

1. **📋 Control de Lotes Avanzado**:
   - **Registro detallado**: Cada lote tiene fecha, cantidad, comentarios
   - **Trazabilidad completa**: Seguimiento desde entrada hasta salida
   - **Vista móvil optimizada**: Información prioritaria en tarjetas expandibles

2. **📊 Registro de Entradas**:
   - **Formulario paso a paso**: Guía intuitiva para registro
   - **Escaneo masivo**: Escanea múltiples productos consecutivamente
   - **Validación inteligente**: Detecta duplicados y errores automáticamente

3. **📈 Inventario en Tiempo Real**:
   - **Actualización automática**: Cambios reflejados instantáneamente
   - **Alertas contextuales**: Notificaciones de stock bajo en el momento
   - **Sincronización multi-dispositivo**: Cambios visibles en todos los dispositivos

### 📱 **Características Móviles Específicas**

1. **🎯 Navegación Táctil**:
   - **Gestos nativos**: Desliza para acciones rápidas
   - **Menú hamburguesa**: Navegación principal adaptativa
   - **Bottom navigation**: Acceso rápido a secciones principales

2. **📸 Escaneo Optimizado**:
   - **Cámara nativa**: Usa la cámara del dispositivo directamente
   - **Enfoque automático**: Detección automática de códigos
   - **Feedback visual**: Confirmación visual al escanear exitosamente

3. **⚡ Rendimiento Móvil**:
   - **Carga lazy**: Componentes se cargan según necesidad
   - **Cache inteligente**: Datos frecuentes en cache local
   - **Modo offline**: Funcionalidad completa sin conexión

---

## 📁 **Estructura del Proyecto**

```
GestorInventory-Frontend/
│
├── 📄 index.html                 # Página principal (login)
├── 📄 register.html              # Registro de usuarios
├── 📄 manifest.json              # Configuración PWA
├── 📄 service-worker.js          # Service Worker para PWA
├── 📄 CAMBIOS.md                 # Registro de cambios detallado
├── 📄 README.md                  # Documentación del proyecto
│
├── 🎨 css/
│   ├── styles.css                # Estilos principales + responsive
│   └── mobile-components.css     # Componentes específicos móviles
│
├── ⚙️ js/
│   ├── main.js                   # Lógica principal de la aplicación
│   ├── auth.js                   # Autenticación y usuarios
│   ├── token-config.js           # Configuración de tokens Supabase
│   ├── db-operations.js          # Operaciones base de datos
│   ├── product-operations.js     # Gestión de productos
│   ├── tabla-productos.js        # Renderizado de tablas de productos
│   ├── lotes-avanzado.js         # Sistema de lotes completo
│   ├── lotes-config.js           # Configuración de lotes
│   ├── lotes-database.js         # Operaciones BD de lotes
│   ├── lotes-scanner.js          # Escáner específico para lotes
│   ├── scanner.js                # Escaneo QR/códigos de barras
│   ├── registro-entradas-operations.js # Operaciones de registro de entradas
│   ├── relaciones-productos.js   # Gestión de productos relacionados
│   ├── rep.js                    # Generación de reportes PDF
│   ├── configuraciones.js        # Gestión de configuraciones
│   ├── mobile-optimizer.js       # Optimización automática móvil
│   ├── table-mobile-optimizer.js # Conversión tabla-a-tarjeta
│   ├── theme-manager.js          # Sistema de temas avanzado
│   ├── theme-toggle.js           # Toggle de tema claro/oscuro
│   ├── theme-debug.js            # Depuración del sistema de temas
│   ├── logs.js                   # Sistema de mensajes y alertas
│   ├── sanitizacion.js           # Funciones de sanitización de datos
│   ├── error-checker.js          # Verificación de errores
│   └── extension-conflict-detector.js # Detector de conflictos de extensiones
│
├── 🖼️ assets/
│   ├── favicon.ico               # Favicon del sitio
│   └── logo.svg                  # Logo vectorial
│
├── 📚 librerías/
│   ├── tailwind.min.css          # Framework CSS responsive
│   ├── html5-qrcode.min.js       # Biblioteca escaneo QR
│   ├── JsBarcode.all.min.js      # Generación códigos de barras
│   ├── jspdf.umd.min.js          # Generación PDFs
│   └── sweetalert2@11.js         # Alertas y modales elegantes
│
└── 🗂️ plantillas/
    ├── main.html                 # Dashboard principal
    ├── agregar.html              # Formulario agregar productos
    ├── consulta.html             # Búsqueda y consulta
    ├── editar.html               # Edición de productos
    ├── inventario.html           # Gestión de inventario y lotes
    ├── registro-entradas.html    # Registro de entradas
    ├── archivos.html             # Importación/exportación CSV
    ├── report.html               # Generación de reportes
    ├── configuraciones.html      # Panel de configuraciones
    └── confirm-email.html        # Confirmación de email
```
---

## 🚀 **Instalación y Configuración**

### � **Para Usuarios (Móvil/Desktop)**

1. **💻 Acceso Web Directo**:
   ```bash
   # Simplemente abre en tu navegador
   https://tu-dominio.com/GestorInventory-Frontend
   ```

2. **📱 Instalación como PWA**:
   - **Android**: Chrome/Edge → Menú (⋮) → "Agregar a pantalla de inicio"
   - **iOS**: Safari → Compartir → "Agregar a pantalla de inicio" 
   - **Desktop**: Chrome → Menú → "Instalar GestorInventory..."

3. **🔧 Servidor Local (Desarrollo)**:
   ```powershell
   # Clona el repositorio
   git clone https://github.com/tu-usuario/GestorInventory-Frontend.git
   cd GestorInventory-Frontend
   
   # Ejecuta el servidor local (Python)
   python -m http.server 8080
   
   # O usa la tarea VS Code incluida
   # Ctrl+Shift+P → "Tasks: Run Task" → "Servir GestorInventory"
   ```

### ⚙️ **Configuración de Supabase**

1. **🔗 Configurar Conexión**:
   ```javascript
   // En js/token-config.js
   const SUPABASE_CONFIG = {
     url: 'https://tu-proyecto.supabase.co',
     key: 'tu-anon-key-aqui'
   };
   ```

2. **🗄️ Base de Datos**:
   - Crear tablas: `productos`, `inventario`, `areas`, `categorias`
   - Configurar RLS (Row Level Security)
   - Activar autenticación por email

3. **🔐 Configuración de Autenticación**:
   ```sql
   -- Habilitar autenticación
   alter table auth.users enable row level security;
   
   -- Políticas de acceso
   create policy "Users can read own data" on productos
     for select using (auth.uid() = user_id);
   ```

---

## 📖 **Guía de Desarrollo**

### �️ **Agregar Nuevas Funcionalidades**

1. **📄 Crear Nueva Plantilla**:
   ```html
   <!-- plantillas/nueva-funcionalidad.html -->
   <div class="container mx-auto p-4">
     <h1 class="text-2xl font-bold mb-4">Nueva Funcionalidad</h1>
     <!-- Tu contenido aquí -->
   </div>
   ```

2. **⚙️ Crear Módulo JavaScript**:
   ```javascript
   // js/nueva-funcionalidad.js
   class NuevaFuncionalidad {
     constructor() {
       this.init();
     }
     
     init() {
       // Inicialización
       if (window.mobileOptimizer) {
         window.mobileOptimizer.optimizeComponent(this.container);
       }
     }
   }
   ```

3. **🎨 Estilos Responsivos**:
   ```css
   /* css/styles.css */
   .nueva-funcionalidad {
     /* Estilos desktop */
   }
   
   @media (max-width: 640px) {
     .nueva-funcionalidad {
       /* Estilos móviles */
     }
   }
   ```

### 📱 **Optimización Móvil Automática**

El sistema incluye optimización automática que se activa en todos los componentes:

```javascript
// El MobileOptimizer se inicializa automáticamente
// y optimiza todos los formularios, tablas y componentes

// Para componentes personalizados:
if (window.mobileOptimizer) {
  window.mobileOptimizer.optimizeComponent(tuComponente);
}
```

---

## 🔧 **Resolución de Problemas**

### 📱 **Problemas Móviles Comunes**

1. **📋 Tablas no se ven bien en móvil**:
   ```javascript
   // Se resuelve automáticamente con TableMobileOptimizer
   // Si necesitas forzar la optimización:
   window.tableMobileOptimizer?.optimizeTable(tuTabla);
   ```

2. **⌨️ Teclado virtual cubre formularios**:
   ```javascript
   // Optimización automática incluida
   // Para casos específicos:
   window.mobileOptimizer?.optimizeFormForMobile(tuFormulario);
   ```

3. **👆 Elementos muy pequeños para tocar**:
   ```css
   /* Automáticamente aplicado, pero puedes personalizar: */
   .touch-target {
     min-height: 44px; /* Tamaño mínimo táctil */
     min-width: 44px;
   }
   ```

### � **Problemas de Sincronización**

1. **🔌 Modo Offline**:
   - Los datos se guardan automáticamente en IndexedDB
   - Al reconectar, se sincronizan automáticamente
   - Revisa las notificaciones de sincronización

2. **🔄 Conflictos de Datos**:
   - El sistema detecta y resuelve conflictos automáticamente
   - Prioriza cambios más recientes
   - Notifica al usuario sobre resoluciones

---

## 🤝 **Contribuir al Proyecto**

### 🔄 **Proceso de Contribución**

1. **🍴 Fork del Repositorio**
2. **🌿 Crear Branch Feature**:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. **💻 Desarrollar con Estándares**:
   - Mantener compatibilidad móvil
   - Seguir patrones existentes
   - Documentar cambios

4. **✅ Testing**:
   - Probar en móvil y desktop
   - Verificar modo offline
   - Validar sincronización

5. **📝 Pull Request**

### 🏗️ **Estándares de Código**

- **📱 Mobile First**: Siempre diseñar primero para móvil
- **♿ Accesibilidad**: Seguir pautas WCAG
- **⚡ Performance**: Optimizar carga y respuesta
- **📖 Documentación**: Comentar funciones complejas

---

## 📜 **Licencia y Créditos**

**GestorInventory** está licenciado bajo [MIT License](LICENSE).

### 🙏 **Agradecimientos**

- **Supabase** - Backend as a Service
- **Tailwind CSS** - Framework de utilidades CSS
- **html5-qrcode** - Biblioteca de escaneo QR/códigos de barras
- **SweetAlert2** - Alertas y modales elegantes
- **jsPDF** - Generación de documentos PDF

### 📧 **Contacto y Soporte**

- **📧 Email**: soporte@gestorinventory.com
- **📝 Issues**: [GitHub Issues](https://github.com/tu-usuario/GestorInventory-Frontend/issues)
- **📖 Wiki**: [Documentación Completa](https://github.com/tu-usuario/GestorInventory-Frontend/wiki)

---

*⭐ Si este proyecto te ha sido útil, ¡considera darle una estrella en GitHub!*
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

*Última actualización: Agosto 2025* 
