# HotelSync — Sistema de Gestión Hotelera con Google Sheets

## 📋 Descripción

Sistema web de gestión hotelera que se conecta directamente a Google Sheets como base de datos. Permite administrar habitaciones, reservas y huéspedes con sincronización en tiempo real usando la API de Google Sheets y autenticación OAuth 2.0.

---

## 🔑 Credenciales Pre-configuradas

Las siguientes credenciales ya están integradas en el sistema:

| Credencial | Valor |
|---|---|
| **API Key** | `AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q` |
| **Spreadsheet ID** | `1HARWT7d23TcO7fnzMea4h-P19LsDsDZDvMZSn3FD5js` |
| **Client ID OAuth 2.0** | `814005655098-8csk41qts3okv4b2fjnq7ls4qc2kq0vc.apps.googleusercontent.com` |

---

## 📊 Estructura del Google Sheets

El Spreadsheet debe tener **exactamente 3 hojas** con los siguientes nombres y encabezados en la **fila 1**:

### Hoja 1: `Habitaciones`

| Columna A | Columna B | Columna C | Columna D | Columna E | Columna F |
|---|---|---|---|---|---|
| **Número** | **Tipo** | **Precio** | **Estado** | **Piso** | **Notas** |
| 101 | Individual | 150 | Disponible | 1 | Vista al jardín |
| 102 | Doble | 250 | Disponible | 1 | Dos camas |
| 201 | Suite | 450 | Ocupada | 2 | Jacuzzi incluido |
| 202 | Familiar | 350 | Limpieza | 2 | Capacidad 4 personas |
| 301 | Presidencial | 800 | Disponible | 3 | Terraza privada |

**Valores válidos para Estado:** `Disponible`, `Ocupada`, `Limpieza`, `Mantenimiento`

**Valores válidos para Tipo:** `Individual`, `Doble`, `Suite`, `Familiar`, `Presidencial`

### Hoja 2: `Reservas`

| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H |
|---|---|---|---|---|---|---|---|
| **ID** | **Habitación** | **Huésped** | **CheckIn** | **CheckOut** | **Estado** | **Total** | **Notas** |
| R001 | 201 | Juan Pérez | 2026-02-20 | 2026-02-25 | Confirmada | 2250 | Llegada tarde |
| R002 | 102 | María López | 2026-03-01 | 2026-03-05 | Pendiente | 1000 | |

**Valores válidos para Estado:** `Confirmada`, `Pendiente`, `Completada`, `Cancelada`

**Formato de fechas:** `YYYY-MM-DD` (ej: 2026-02-24)

**El campo Habitación** debe coincidir exactamente con el Número de la hoja Habitaciones.

### Hoja 3: `Huéspedes`

| Col A | Col B | Col C | Col D | Col E | Col F |
|---|---|---|---|---|---|
| **ID** | **Nombre** | **Documento** | **Teléfono** | **Email** | **País** |
| G001 | Juan Pérez | 12345678 | +591 71234567 | juan@email.com | Bolivia |
| G002 | María López | 87654321 | +591 76543210 | maria@email.com | Bolivia |

---

## ⚙️ Permisos de Google Cloud (Ya Configurados)

Los siguientes permisos y configuraciones deben estar activos en Google Cloud Console (proyecto `814005655098`):

### 1. APIs Habilitadas

- **Google Sheets API** → Permite leer y escribir en Google Sheets
- **Google People API** o **Google OAuth2 API** → Permite obtener info del usuario autenticado

### 2. OAuth 2.0 Client ID (Tipo: Web Application)

Configuración requerida en Credentials → OAuth 2.0 Client IDs:

**Authorized JavaScript Origins** (agregar TODAS las URLs donde se usará la app):
```
http://localhost
http://localhost:8080
http://127.0.0.1
http://127.0.0.1:8080
https://tu-dominio.com
```

**Authorized Redirect URIs:**
```
http://localhost
http://localhost:8080
http://127.0.0.1
http://127.0.0.1:8080
https://tu-dominio.com
```

### 3. API Key Restrictions (Recomendado)

En Credentials → API Keys, configurar:
- **Application restrictions:** HTTP referrers (las mismas URLs de arriba)
- **API restrictions:** Restrict to Google Sheets API only

### 4. Pantalla de Consentimiento OAuth

En OAuth consent screen:
- **User Type:** External (o Internal si es Google Workspace)
- **App name:** HotelSync
- **Scopes:** `https://www.googleapis.com/auth/spreadsheets`
- **Test users:** Agregar los emails de las personas que usarán el sistema

> ⚠️ **IMPORTANTE:** Si la app está en modo "Testing", solo los test users podrán autenticarse. Para permitir cualquier usuario, hay que publicar la app (requiere verificación de Google).

### 5. Permisos del Spreadsheet

El Google Sheet debe estar compartido con permiso de **Editor** para las cuentas que se autenticarán:
- Abrir el Spreadsheet → Compartir → Agregar los emails como Editor
- O bien: Cualquier persona con el enlace → Editor

---

## 🚀 Cómo Usar

### Paso 1: Preparar el Google Sheet

1. Abre el Spreadsheet: `https://docs.google.com/spreadsheets/d/1HARWT7d23TcO7fnzMea4h-P19LsDsDZDvMZSn3FD5js/edit`
2. Verifica que existan las 3 hojas: `Habitaciones`, `Reservas`, `Huéspedes`
3. Verifica que la fila 1 de cada hoja tenga los encabezados exactos (ver estructura arriba)
4. Opcionalmente agrega datos de ejemplo

### Paso 2: Abrir el Sistema

1. Abre el archivo `hotel-system.html` en tu navegador
2. Las credenciales ya están pre-cargadas
3. Escribe el nombre de tu hotel
4. Haz clic en **"Iniciar sesión con Google"**
5. Autoriza el acceso en la ventana emergente de Google
6. Haz clic en **"Conectar con Google Sheets"**

### Paso 3: Usar el Sistema

- **Dashboard:** Vista general con estadísticas y habitaciones
- **Habitaciones:** Agregar, filtrar y cambiar estados
- **Reservas:** Crear reservas vinculadas a habitaciones y huéspedes
- **Huéspedes:** Registrar clientes con documento y datos de contacto
- **Configuración:** Renovar token, cambiar credenciales, forzar sincronización

---

## 🔄 Sincronización

- Los datos se leen directamente de Google Sheets cada vez que se sincroniza
- Las escrituras (agregar habitación, crear reserva, etc.) se hacen en tiempo real via API
- El token OAuth se auto-renueva cada 45 minutos
- Puedes editar datos directamente en Google Sheets y hacer clic en "Sincronizar" en el sistema

---

## 📱 Funcionalidades

| Función | Descripción |
|---|---|
| Dashboard en tiempo real | Estadísticas de ocupación, disponibilidad y reservas |
| Gestión de habitaciones | CRUD completo, cambio de estado con escritura a Sheets |
| Sistema de reservas | Vincula habitaciones con huéspedes, calcula totales |
| Registro de huéspedes | Documento, teléfono, email, país |
| Filtros por estado | Disponible, Ocupada, Limpieza, Mantenimiento |
| Auto-sync de estados | Al confirmar reserva → habitación se marca Ocupada |
| Responsive | Se adapta a móvil y tablet |
| OAuth 2.0 seguro | Escritura autenticada, lectura con API Key como fallback |

---

## 🛠️ Resolución de Problemas

| Error | Solución |
|---|---|
| "popup_closed_by_user" | Permite popups en tu navegador para esta página |
| "access_denied" | Tu email no está en Test Users del OAuth consent screen |
| "The caller does not have permission" | El Sheet no está compartido con tu email como Editor |
| "Requested entity was not found" | Verifica que el Spreadsheet ID sea correcto |
| "Unable to parse range" | Los nombres de las hojas no coinciden (Habitaciones, Reservas, Huéspedes) |
| Token expira constantemente | Haz clic en "Renovar Token" en Config o Dashboard |

---

## 📁 Archivos

```
hotel-system.html    ← Sistema completo (abrir en navegador)
README.md            ← Esta documentación
```

---

## 💡 Notas Importantes

1. **No se requiere servidor backend** — todo funciona desde el navegador
2. **Los tokens se guardan en localStorage** — nunca se envían a terceros
3. **Google Sheets es la base de datos** — puedes editar datos directamente ahí
4. **Las credenciales están embebidas** — no necesitas configurar nada extra
5. **Para producción:** se recomienda servir desde HTTPS y restringir los orígenes OAuth
