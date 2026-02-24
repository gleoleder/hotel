# HotelSync PMS — Property Management System

Sistema profesional de gestión hotelera conectado a Google Sheets con autenticación OAuth 2.0, control de acceso por roles y relaciones entre habitaciones, huéspedes y reservas.

---

## 📁 Estructura de Archivos

```
hotelsync/
├── index.html      ← Interfaz principal (abrir en navegador)
├── styles.css      ← Diseño visual completo
├── config.js       ← Credenciales y configuración (NO editar)
├── app.js          ← Lógica de la aplicación
└── README.md       ← Este archivo
```

---

## 📊 Estructura del Google Sheets

El Spreadsheet necesita **5 hojas**. Copia estos encabezados EXACTOS en la fila 1 de cada hoja:

### Hoja 1: `Habitaciones`

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| **Número** | **Tipo** | **Precio** | **Estado** | **Piso** | **Notas** | **ClienteActual** |

- **Número:** Identificador único (101, 102, 201...)
- **Tipo:** Individual, Doble, Triple, Matrimonial, Suite, Suite Junior, Familiar, Presidencial
- **Precio:** Número decimal (precio por noche en Bs)
- **Estado:** Disponible, Ocupada, Limpieza, Mantenimiento, Reservada
- **Piso:** Número de piso
- **Notas:** Texto libre
- **ClienteActual:** Nombre del huésped actual (se llena automáticamente)

### Hoja 2: `Reservas`

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| **ID** | **Habitación** | **HuéspedID** | **HuéspedNombre** | **CheckIn** | **CheckOut** | **Estado** | **Total** | **Notas** | **CreadoPor** | **Fecha** |

- **ID:** Auto-generado (R-XXXXXX)
- **Habitación:** Debe coincidir con Número de la hoja Habitaciones
- **HuéspedID / HuéspedNombre:** Referencia al huésped (relación con hoja Huéspedes)
- **CheckIn / CheckOut:** Formato YYYY-MM-DD
- **Estado:** Confirmada, Pendiente, Check-In, Check-Out, Cancelada, No-Show
- **CreadoPor:** Email/nombre del usuario que creó la reserva (trazabilidad)
- **Fecha:** Fecha de creación del registro

### Hoja 3: `Huéspedes`

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| **ID** | **Nombre** | **Documento** | **Teléfono** | **Email** | **País** | **Dirección** | **Notas** | **TotalEstancias** | **ÚltimaVisita** |

- **ID:** Auto-generado (H-XXXXXX)
- **TotalEstancias:** Contador de veces que se hospedó
- **ÚltimaVisita:** Fecha del último check-out

### Hoja 4: `Historial`

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| **Fecha** | **Habitación** | **Huésped** | **CheckIn** | **CheckOut** | **Total** | **Nota** |

Se llena **automáticamente** al hacer Check-Out de una reserva. Sirve para:
- Saber qué cliente estuvo en qué habitación
- Historial completo de estancias
- Auditoría de operaciones

### Hoja 5: `Usuarios`

| A | B | C | D |
|---|---|---|---|
| **Email** | **Nombre** | **Rol** | **Activo** |

- **Email:** El email de Google del usuario (debe coincidir con su cuenta)
- **Rol:** `admin`, `recepcion`, `housekeeping`, `viewer`
- **Activo:** `true` o `false`

**Ejemplo:**
```
maria@gmail.com    | María García    | admin        | true
carlos@gmail.com   | Carlos López    | recepcion    | true
limpieza@gmail.com | Equipo Limpieza | housekeeping | true
invitado@gmail.com | Invitado        | viewer       | true
```

---

## 🔐 Sistema de Roles (RBAC)

| Rol | Permisos |
|---|---|
| 👑 **Administrador** | Todo: Dashboard, Habitaciones, Reservas, Huéspedes, Historial, Usuarios, Config, Reportes |
| 🛎️ **Recepcionista** | Dashboard, Habitaciones, Reservas, Huéspedes, Historial |
| 🧹 **Housekeeping** | Dashboard, Habitaciones (solo cambiar estado de limpieza) |
| 👁️ **Solo Lectura** | Solo Dashboard (vista general) |

**El primer usuario que se conecta sin hoja Usuarios configurada obtiene rol Admin automáticamente.**

---

## 🔗 Relaciones entre Tablas

```
Habitaciones ──────┐
  Número ◄─────────┼── Reservas.Habitación
  ClienteActual ◄──┘       │
                            │
Huéspedes ─────────────────┘
  ID ◄── Reservas.HuéspedID
  Nombre ◄── Reservas.HuéspedNombre

Historial
  Se genera automáticamente al hacer Check-Out
  Vincula: Fecha + Habitación + Huésped + Montos
```

**Flujo de datos:**
1. Al crear reserva → se vincula Habitación + Huésped
2. Al confirmar/Check-In → Habitación cambia a "Ocupada" + se asigna ClienteActual
3. Al Check-Out → Habitación cambia a "Limpieza" + se limpia ClienteActual + se registra en Historial
4. Al cancelar/No-Show → Habitación vuelve a "Limpieza" + se limpia ClienteActual

---

## ⚙️ Permisos de Google Cloud

### APIs que deben estar habilitadas:
- Google Sheets API
- Google OAuth2 / People API

### OAuth 2.0 Client ID:
En **Credentials → OAuth 2.0 Client IDs** (tipo Web Application):

**Authorized JavaScript Origins:**
```
http://localhost
http://localhost:8080
http://127.0.0.1:5500   (para Live Server de VS Code)
https://tu-dominio.com
```

**Authorized Redirect URIs:**
```
(las mismas URLs de arriba)
```

### Pantalla de Consentimiento (OAuth Consent Screen):
- **User Type:** External
- **App name:** HotelSync PMS
- **Scopes:** `spreadsheets`, `userinfo.email`
- **Test users:** Agrega TODOS los emails que usarán el sistema

### Permisos del Spreadsheet:
El Google Sheet debe estar compartido como **Editor** con todos los usuarios que iniciarán sesión.

---

## 🚀 Instalación

1. Copia los 4 archivos a una carpeta
2. Abre el Google Sheet y crea las 5 hojas con los encabezados exactos
3. Agrega usuarios en la hoja `Usuarios`
4. Abre `index.html` en un navegador (o usa Live Server)
5. Inicia sesión con Google
6. El sistema detecta tu rol y te muestra las secciones correspondientes

---

## 💡 Características

- **Relaciones reales** entre habitaciones, huéspedes y reservas
- **Asignación de clientes** a habitaciones (saber quién está/estuvo en cada habitación)
- **Control de roles** por email de Google (RBAC)
- **Historial automático** de estancias al hacer check-out
- **Trazabilidad** de quién creó cada reserva
- **Flujo completo:** Reserva → Check-In → Check-Out → Historial
- **Sincronización bidireccional** con Google Sheets
- **Diseño responsive** con tema oscuro profesional
- **Botones de alto contraste** (dorado sobre oscuro)
- **Sin servidor backend** — funciona 100% desde el navegador
