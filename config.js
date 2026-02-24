// ============================================
// HotelSync — config.js
// Credenciales y configuración central
// ============================================
const CONFIG = Object.freeze({
  GOOGLE: {
    CLIENT_ID: '814005655098-8csk41qts3okv4b2fjnq7ls4qc2kq0vc.apps.googleusercontent.com',
    API_KEY: 'AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q',
    SPREADSHEET_ID: '1HARWT7d23TcO7fnzMea4h-P19LsDsDZDvMZSn3FD5js',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
    SHEETS_BASE: 'https://sheets.googleapis.com/v4/spreadsheets'
  },
  SHEETS: {
    HABITACIONES: 'Habitaciones',
    RESERVAS: 'Reservas',
    HUESPEDES: 'Huéspedes',
    HISTORIAL: 'Historial',
    USUARIOS: 'Usuarios'
  },
  ROLES: {
    ADMIN: {
      id: 'admin',
      label: 'Administrador',
      icon: '👑',
      color: '#C9A96E',
      permissions: ['dashboard','rooms','reservations','guests','history','users','config','reports']
    },
    RECEPCION: {
      id: 'recepcion',
      label: 'Recepcionista',
      icon: '🛎️',
      color: '#42A5F5',
      permissions: ['dashboard','rooms','reservations','guests','history']
    },
    HOUSEKEEPING: {
      id: 'housekeeping',
      label: 'Housekeeping',
      icon: '🧹',
      color: '#66BB6A',
      permissions: ['dashboard','rooms']
    },
    VIEWER: {
      id: 'viewer',
      label: 'Solo Lectura',
      icon: '👁️',
      color: '#AB47BC',
      permissions: ['dashboard']
    }
  },
  ROOM_TYPES: ['Individual', 'Doble', 'Triple', 'Matrimonial', 'Suite', 'Suite Junior', 'Familiar', 'Presidencial'],
  ROOM_STATES: ['Disponible', 'Ocupada', 'Limpieza', 'Mantenimiento', 'Reservada'],
  RESERVATION_STATES: ['Confirmada', 'Pendiente', 'Check-In', 'Check-Out', 'Cancelada', 'No-Show'],
  CURRENCY: 'Bs',
  HOTEL_NAME: 'HotelSync PMS'
});
