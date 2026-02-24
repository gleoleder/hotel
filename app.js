// ============================================
// HotelSync PMS — app.js
// Core application logic
// ============================================

const App = {
  auth: { token: null, exp: null, email: null, tc: null },
  user: { email: '', role: null, name: '' },
  data: { rooms: [], reservations: [], guests: [], history: [], users: [] },
  filter: 'todas',

  // === HELPERS ===
  $: id => document.getElementById(id),
  toast(msg, type = 'info') {
    const s = App.$('toasts');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
    s.appendChild(t);
    setTimeout(() => { t.classList.add('exit'); setTimeout(() => t.remove(), 300); }, 3000);
  },
  showLoad(t) { App.$('loadText').textContent = t; App.$('loader').classList.add('open'); },
  hideLoad() { App.$('loader').classList.remove('open'); },

  // === AUTH ===
  initOAuth() {
    if (!window.google?.accounts) return;
    App.auth.tc = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE.CLIENT_ID,
      scope: CONFIG.GOOGLE.SCOPES,
      callback: async (r) => {
        if (r.error) { App.setAuthMsg('err', '✕ Error: ' + r.error); return; }
        App.auth.token = r.access_token;
        App.auth.exp = Date.now() + (r.expires_in * 1000);
        try {
          const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': 'Bearer ' + App.auth.token }
          }).then(r => r.json());
          App.auth.email = info.email || '';
          App.user.email = info.email || '';
          App.user.name = info.name || info.email?.split('@')[0] || '';
          App.setAuthMsg('ok', `✓ ${App.user.name || App.auth.email}`);
          localStorage.setItem('hs_auth', JSON.stringify({ t: App.auth.token, e: App.auth.exp, m: App.auth.email, n: App.user.name }));
          App.enterApp();
        } catch (e) { App.setAuthMsg('ok', '✓ Autenticado'); App.enterApp(); }
      }
    });
  },

  startAuth() {
    if (!App.auth.tc) App.initOAuth();
    if (App.auth.tc) App.auth.tc.requestAccessToken({ prompt: 'consent' });
    else App.toast('Google aún no cargó. Intenta de nuevo.', 'warning');
  },

  refreshToken() {
    if (!App.auth.tc) App.initOAuth();
    if (App.auth.tc) App.auth.tc.requestAccessToken({ prompt: '' });
  },

  tokenValid() { return App.auth.token && App.auth.exp && Date.now() < App.auth.exp; },

  async ensureToken() {
    if (App.tokenValid()) return true;
    return new Promise(ok => {
      if (!App.auth.tc) { App.toast('Sin OAuth', 'error'); ok(false); return; }
      const orig = App.auth.tc.callback;
      App.auth.tc.callback = r => {
        if (r.error) { ok(false); return; }
        App.auth.token = r.access_token;
        App.auth.exp = Date.now() + (r.expires_in * 1000);
        localStorage.setItem('hs_auth', JSON.stringify({ t: App.auth.token, e: App.auth.exp, m: App.auth.email, n: App.user.name }));
        ok(true);
      };
      App.auth.tc.requestAccessToken({ prompt: '' });
    });
  },

  setAuthMsg(cls, msg) {
    const el = App.$('authMsg');
    if (el) { el.className = 'auth-msg ' + cls; el.textContent = msg; }
  },

  // === SHEETS API ===
  headers() { return { 'Authorization': 'Bearer ' + App.auth.token, 'Content-Type': 'application/json' }; },

  async sheetGet(name, range) {
    const r = range ? '!' + range : '';
    const url = `${CONFIG.GOOGLE.SHEETS_BASE}/${CONFIG.GOOGLE.SPREADSHEET_ID}/values/${encodeURIComponent(name)}${r}`;
    const h = App.tokenValid() ? App.headers() : {};
    const u = App.tokenValid() ? url : url + '?key=' + CONFIG.GOOGLE.API_KEY;
    const res = await fetch(u, { headers: h });
    if (!res.ok) throw new Error((await res.json()).error?.message || 'Error lectura');
    return (await res.json()).values || [];
  },

  async sheetAppend(name, vals) {
    if (!await App.ensureToken()) throw new Error('Requiere OAuth');
    const url = `${CONFIG.GOOGLE.SHEETS_BASE}/${CONFIG.GOOGLE.SPREADSHEET_ID}/values/${encodeURIComponent(name)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, { method: 'POST', headers: App.headers(), body: JSON.stringify({ values: [vals] }) });
    if (!res.ok) throw new Error((await res.json()).error?.message || 'Error escritura');
    return res.json();
  },

  async sheetUpdate(name, range, vals) {
    if (!await App.ensureToken()) throw new Error('Requiere OAuth');
    const url = `${CONFIG.GOOGLE.SHEETS_BASE}/${CONFIG.GOOGLE.SPREADSHEET_ID}/values/${encodeURIComponent(name)}!${range}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, { method: 'PUT', headers: App.headers(), body: JSON.stringify({ values: [vals] }) });
    if (!res.ok) throw new Error((await res.json()).error?.message || 'Error update');
    return res.json();
  },

  // === DATA PARSING ===
  parseRooms(rows) {
    if (rows.length < 2) return [];
    return rows.slice(1).map((r, i) => ({
      _row: i + 2, numero: r[0] || '', tipo: r[1] || '', precio: parseFloat(r[2]) || 0,
      estado: r[3] || 'Disponible', piso: r[4] || '', notas: r[5] || '', clienteActual: r[6] || ''
    }));
  },

  parseReservations(rows) {
    if (rows.length < 2) return [];
    return rows.slice(1).map((r, i) => ({
      _row: i + 2, id: r[0] || '', habitacion: r[1] || '', huespedId: r[2] || '', huespedNombre: r[3] || '',
      checkIn: r[4] || '', checkOut: r[5] || '', estado: r[6] || '', total: parseFloat(r[7]) || 0,
      notas: r[8] || '', creadoPor: r[9] || '', fecha: r[10] || ''
    }));
  },

  parseGuests(rows) {
    if (rows.length < 2) return [];
    return rows.slice(1).map((r, i) => ({
      _row: i + 2, id: r[0] || '', nombre: r[1] || '', documento: r[2] || '', telefono: r[3] || '',
      email: r[4] || '', pais: r[5] || '', direccion: r[6] || '', notas: r[7] || '',
      totalEstancias: parseInt(r[8]) || 0, ultimaVisita: r[9] || ''
    }));
  },

  parseHistory(rows) {
    if (rows.length < 2) return [];
    return rows.slice(1).map((r, i) => ({
      _row: i + 2, fecha: r[0] || '', habitacion: r[1] || '', huesped: r[2] || '',
      checkIn: r[3] || '', checkOut: r[4] || '', total: parseFloat(r[5]) || 0, nota: r[6] || ''
    }));
  },

  parseUsers(rows) {
    if (rows.length < 2) return [];
    return rows.slice(1).map((r, i) => ({
      _row: i + 2, email: r[0] || '', nombre: r[1] || '', rol: r[2] || 'viewer', activo: r[3] !== 'false'
    }));
  },

  // === SYNC ===
  async sync() {
    App.showLoad('Sincronizando con Google Sheets...');
    try {
      const [a, b, c, d, e] = await Promise.all([
        App.sheetGet(CONFIG.SHEETS.HABITACIONES),
        App.sheetGet(CONFIG.SHEETS.RESERVAS),
        App.sheetGet(CONFIG.SHEETS.HUESPEDES),
        App.sheetGet(CONFIG.SHEETS.HISTORIAL).catch(() => []),
        App.sheetGet(CONFIG.SHEETS.USUARIOS).catch(() => [])
      ]);
      App.data.rooms = App.parseRooms(a);
      App.data.reservations = App.parseReservations(b);
      App.data.guests = App.parseGuests(c);
      App.data.history = App.parseHistory(d);
      App.data.users = App.parseUsers(e);

      // Determine user role
      const u = App.data.users.find(x => x.email.toLowerCase() === App.user.email.toLowerCase());
      if (u && u.activo) {
        App.user.role = CONFIG.ROLES[u.rol.toUpperCase()] || CONFIG.ROLES.VIEWER;
        App.user.name = u.nombre || App.user.name;
      } else if (App.data.users.length === 0) {
        App.user.role = CONFIG.ROLES.ADMIN; // First user = admin
      } else {
        App.user.role = CONFIG.ROLES.VIEWER;
      }

      App.render();
      App.updateNav();
      App.toast('Datos sincronizados', 'success');
      App.$('syncDot').className = 'sync-dot';
      App.$('syncTxt').textContent = 'Sincronizado';
    } catch (e) {
      console.error(e);
      App.toast('Error: ' + e.message, 'error');
      App.$('syncDot').className = 'sync-dot error';
      App.$('syncTxt').textContent = 'Error';
    } finally { App.hideLoad(); }
  },

  // === PERMISSIONS ===
  can(section) {
    return App.user.role?.permissions?.includes(section) ?? false;
  },

  updateNav() {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      const page = el.dataset.page;
      if (App.can(page)) { el.classList.remove('disabled'); }
      else { el.classList.add('disabled'); }
    });
    // Update user info
    App.$('userAvatar').textContent = (App.user.name || 'U')[0].toUpperCase();
    App.$('userName').textContent = App.user.name || App.user.email;
    const roleEl = App.$('userRole');
    roleEl.textContent = `${App.user.role?.icon || ''} ${App.user.role?.label || 'Sin rol'}`;
    roleEl.className = 'sidebar-user-role role-' + (App.user.role?.id || 'viewer');
  },

  // === RENDER ALL ===
  render() {
    App.renderStats();
    App.renderDashRooms();
    App.renderRoomGrid();
    App.renderResTable();
    App.renderGuestTable();
    App.renderHistoryTable();
    App.renderUsersTable();
  },

  renderStats() {
    const R = App.data.rooms;
    const res = App.data.reservations;
    App.$('sTotal').textContent = R.length;
    App.$('sDisp').textContent = R.filter(r => r.estado === 'Disponible').length;
    App.$('sOcup').textContent = R.filter(r => r.estado === 'Ocupada').length;
    App.$('sReserv').textContent = res.filter(r => ['Confirmada', 'Pendiente', 'Check-In'].includes(r.estado)).length;
    const occ = R.length ? Math.round((R.filter(r => r.estado === 'Ocupada').length / R.length) * 100) : 0;
    App.$('sOccRate').textContent = occ + '%';
  },

  // Room card builder
  roomCardHTML(r) {
    const st = r.estado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const bc = 'badge-' + st;
    const guest = App.data.reservations.find(x => x.habitacion === r.numero && ['Confirmada', 'Check-In'].includes(x.estado));
    const guestHTML = (guest || r.clienteActual) ? `
      <div class="room-guest-info">
        <div class="avatar-mini">${(guest?.huespedNombre || r.clienteActual || '?')[0]}</div>
        <span>${guest?.huespedNombre || r.clienteActual}</span>
      </div>` : '';
    return `<div class="room-card ${st}" onclick="App.openRoomDetail('${r.numero}')">
      <div class="room-header">
        <div><div class="room-number">${r.numero}</div><div class="room-floor">Piso ${r.piso}</div></div>
        <span class="badge ${bc}">${r.estado}</span>
      </div>
      <div class="room-type">${r.tipo}</div>
      <div class="room-price">${CONFIG.CURRENCY} ${r.precio.toFixed(2)} <span>/noche</span></div>
      ${guestHTML}
    </div>`;
  },

  renderDashRooms() {
    App.$('dashRooms').innerHTML = App.data.rooms.length
      ? App.data.rooms.map(r => App.roomCardHTML(r)).join('')
      : '<div class="empty-state"><div class="empty-state-icon">🏨</div><div class="empty-state-text">Sin habitaciones. Agrega desde la hoja "Habitaciones" o desde este sistema.</div></div>';
  },

  renderRoomGrid() {
    const f = App.filter === 'todas' ? App.data.rooms : App.data.rooms.filter(r => r.estado === App.filter);
    App.$('roomGrid').innerHTML = f.length
      ? f.map(r => App.roomCardHTML(r)).join('')
      : '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">Sin habitaciones con este filtro</div></div>';
  },

  renderResTable() {
    const t = App.$('resBody');
    if (!App.data.reservations.length) {
      t.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Sin reservas</div></div></td></tr>';
      return;
    }
    t.innerHTML = App.data.reservations.map(r => {
      const bc = 'badge-' + r.estado.toLowerCase().replace('-', '-');
      return `<tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.habitacion}</td>
        <td>${r.huespedNombre}</td>
        <td>${r.checkIn}</td>
        <td>${r.checkOut}</td>
        <td><span class="badge ${bc}">${r.estado}</span></td>
        <td><span class="currency">${CONFIG.CURRENCY} ${r.total.toFixed(2)}</span></td>
        <td>${r.creadoPor || ''}</td>
        <td class="table-actions">
          <button class="btn btn-ghost" onclick="App.cycleResState('${r.id}')">Cambiar</button>
        </td>
      </tr>`;
    }).join('');
  },

  renderGuestTable() {
    const t = App.$('guestBody');
    if (!App.data.guests.length) {
      t.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Sin huéspedes</div></div></td></tr>';
      return;
    }
    t.innerHTML = App.data.guests.map(g => `<tr>
      <td><strong>${g.id}</strong></td>
      <td>${g.nombre}</td>
      <td>${g.documento}</td>
      <td>${g.telefono}</td>
      <td>${g.email}</td>
      <td>${g.pais}</td>
      <td>${g.totalEstancias}</td>
      <td>${g.ultimaVisita}</td>
    </tr>`).join('');
  },

  renderHistoryTable() {
    const t = App.$('histBody');
    if (!t) return;
    if (!App.data.history.length) {
      t.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-text">Sin historial</div></div></td></tr>';
      return;
    }
    t.innerHTML = App.data.history.map(h => `<tr>
      <td>${h.fecha}</td><td><strong>${h.habitacion}</strong></td><td>${h.huesped}</td>
      <td>${h.checkIn}</td><td>${h.checkOut}</td>
      <td><span class="currency">${CONFIG.CURRENCY} ${h.total.toFixed(2)}</span></td>
      <td>${h.nota}</td>
    </tr>`).join('');
  },

  renderUsersTable() {
    const t = App.$('usersBody');
    if (!t) return;
    if (!App.data.users.length) {
      t.innerHTML = '<tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-text">Sin usuarios configurados. El primer usuario es Admin.</div></div></td></tr>';
      return;
    }
    t.innerHTML = App.data.users.map(u => {
      const role = CONFIG.ROLES[u.rol.toUpperCase()] || CONFIG.ROLES.VIEWER;
      return `<tr>
        <td><strong>${u.email}</strong></td>
        <td>${u.nombre}</td>
        <td><span class="badge role-${role.id}">${role.icon} ${role.label}</span></td>
        <td><span class="badge ${u.activo ? 'badge-disponible' : 'badge-cancelada'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      </tr>`;
    }).join('');
  },

  // === FILTERS ===
  setFilter(val, el) {
    App.filter = val;
    document.querySelectorAll('#roomFilters .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    App.renderRoomGrid();
  },

  // === ROOM DETAIL ===
  openRoomDetail(num) {
    const r = App.data.rooms.find(x => x.numero === num);
    if (!r) return;
    const res = App.data.reservations.find(x => x.habitacion === num && ['Confirmada', 'Check-In', 'Pendiente'].includes(x.estado));
    const pastRes = App.data.reservations.filter(x => x.habitacion === num);

    let histHTML = '';
    if (pastRes.length) {
      histHTML = '<div class="detail-box"><div class="detail-box-title blue">📋 Historial de esta Habitación</div><div class="timeline">';
      pastRes.slice(-5).reverse().forEach(pr => {
        histHTML += `<div class="timeline-item"><div class="timeline-date">${pr.checkIn} → ${pr.checkOut}</div><div class="timeline-text"><strong>${pr.huespedNombre}</strong> — ${pr.estado} — ${CONFIG.CURRENCY} ${pr.total.toFixed(2)}</div></div>`;
      });
      histHTML += '</div></div>';
    }

    App.$('modalRoomTitle').textContent = '🏠 Habitación ' + r.numero;
    App.$('modalRoomContent').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Tipo</div><div class="detail-value">${r.tipo}</div></div>
        <div class="detail-item"><div class="detail-label">Piso</div><div class="detail-value">${r.piso}</div></div>
        <div class="detail-item"><div class="detail-label">Precio</div><div class="detail-value" style="color:var(--accent-primary)">${CONFIG.CURRENCY} ${r.precio.toFixed(2)}/noche</div></div>
        <div class="detail-item"><div class="detail-label">Estado</div><div class="detail-value">${r.estado}</div></div>
      </div>
      ${r.notas ? `<div class="detail-box"><div class="detail-box-title">📝 Notas</div><div style="font-size:0.87rem;color:var(--text-70)">${r.notas}</div></div>` : ''}
      ${res ? `<div class="detail-box"><div class="detail-box-title gold">🛎️ Reserva Activa</div><div style="font-size:0.93rem;font-weight:600">${res.huespedNombre}</div><div style="font-size:0.8rem;color:var(--text-70);margin-top:4px">${res.checkIn} → ${res.checkOut} &middot; ${CONFIG.CURRENCY} ${res.total.toFixed(2)}</div></div>` : ''}
      ${histHTML}
      ${App.can('rooms') ? `<div class="form-row">
        <div class="form-group"><label class="form-label">Cambiar Estado</label><select class="form-select" id="roomNewState">${CONFIG.ROOM_STATES.map(s => `<option${r.estado === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Asignar Cliente</label><select class="form-select" id="roomAssignGuest"><option value="">— Sin cliente —</option>${App.data.guests.map(g => `<option value="${g.nombre}"${r.clienteActual === g.nombre ? ' selected' : ''}>${g.nombre} (${g.documento})</option>`).join('')}</select></div>
      </div>` : ''}
    `;
    App.$('modalRoomActions').innerHTML = `
      <button class="btn btn-secondary" onclick="App.closeModal('modalRoom')">Cerrar</button>
      ${App.can('rooms') ? `<button class="btn btn-primary" onclick="App.updateRoom('${num}')">Guardar Cambios</button>` : ''}
    `;
    App.openModal('modalRoom');
  },

  async updateRoom(num) {
    const r = App.data.rooms.find(x => x.numero === num);
    if (!r) return;
    const ns = App.$('roomNewState')?.value || r.estado;
    const ng = App.$('roomAssignGuest')?.value || '';
    App.showLoad('Actualizando...');
    try {
      await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `D${r._row}:G${r._row}`, [ns, r.piso, r.notas, ng]);
      App.closeModal('modalRoom');
      App.toast(`Hab ${num} actualizada`, 'success');
      await App.sync();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    finally { App.hideLoad(); }
  },

  // === ADD ROOM ===
  async addRoom() {
    const v = [App.$('fRoomNum').value, App.$('fRoomType').value, App.$('fRoomPrice').value, App.$('fRoomState').value, App.$('fRoomFloor').value, App.$('fRoomNotes').value, ''];
    if (!v[0]) { App.toast('Número obligatorio', 'error'); return; }
    App.showLoad('Agregando...');
    try {
      await App.sheetAppend(CONFIG.SHEETS.HABITACIONES, v);
      App.closeModal('modalAddRoom');
      App.toast('Habitación ' + v[0] + ' agregada', 'success');
      await App.sync();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    finally { App.hideLoad(); }
  },

  // === ADD RESERVATION ===
  populateDropdowns() {
    const rSel = App.$('fResRoom');
    const gSel = App.$('fResGuest');
    if (rSel) rSel.innerHTML = '<option value="">Seleccionar...</option>' + App.data.rooms.filter(r => r.estado === 'Disponible').map(r => `<option value="${r.numero}">${r.numero} — ${r.tipo} (${CONFIG.CURRENCY} ${r.precio})</option>`).join('');
    if (gSel) gSel.innerHTML = '<option value="">Seleccionar...</option>' + App.data.guests.map(g => `<option value="${g.id}" data-name="${g.nombre}">${g.nombre} (${g.documento})</option>`).join('');
  },

  async addReservation() {
    const id = 'R-' + Date.now().toString(36).toUpperCase();
    const gSel = App.$('fResGuest');
    const gName = gSel.options[gSel.selectedIndex]?.dataset?.name || '';
    const v = [id, App.$('fResRoom').value, gSel.value, gName, App.$('fResCI').value, App.$('fResCO').value, App.$('fResState').value, App.$('fResTotal').value, App.$('fResNotes').value, App.user.name || App.user.email, new Date().toISOString().slice(0, 10)];
    if (!v[1] || !v[4] || !v[5]) { App.toast('Habitación, check-in y check-out obligatorios', 'error'); return; }
    App.showLoad('Creando reserva...');
    try {
      await App.sheetAppend(CONFIG.SHEETS.RESERVAS, v);
      // Mark room occupied if confirmed
      if (v[6] === 'Confirmada' || v[6] === 'Check-In') {
        const rm = App.data.rooms.find(r => r.numero === v[1]);
        if (rm) await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `D${rm._row}`, ['Ocupada']);
        if (rm) await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `G${rm._row}`, [gName]);
      }
      App.closeModal('modalAddRes');
      App.toast('Reserva ' + id + ' creada', 'success');
      await App.sync();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    finally { App.hideLoad(); }
  },

  // === ADD GUEST ===
  async addGuest() {
    const id = 'H-' + Date.now().toString(36).toUpperCase();
    const v = [id, App.$('fGuestName').value, App.$('fGuestDoc').value, App.$('fGuestPhone').value, App.$('fGuestEmail').value, App.$('fGuestCountry').value, App.$('fGuestAddr').value, App.$('fGuestNotes').value, '0', ''];
    if (!v[1] || !v[2]) { App.toast('Nombre y documento obligatorios', 'error'); return; }
    App.showLoad('Registrando...');
    try {
      await App.sheetAppend(CONFIG.SHEETS.HUESPEDES, v);
      App.closeModal('modalAddGuest');
      App.toast(v[1] + ' registrado', 'success');
      await App.sync();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    finally { App.hideLoad(); }
  },

  // === ADD USER ===
  async addUser() {
    const v = [App.$('fUserEmail').value, App.$('fUserName').value, App.$('fUserRole').value, 'true'];
    if (!v[0]) { App.toast('Email obligatorio', 'error'); return; }
    App.showLoad('Agregando usuario...');
    try {
      await App.sheetAppend(CONFIG.SHEETS.USUARIOS, v);
      App.closeModal('modalAddUser');
      App.toast('Usuario agregado', 'success');
      await App.sync();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    finally { App.hideLoad(); }
  },

  // === CYCLE RESERVATION STATE ===
  async cycleResState(rid) {
    const r = App.data.reservations.find(x => x.id === rid);
    if (!r || !App.can('reservations')) return;
    const sts = CONFIG.RESERVATION_STATES;
    const ns = sts[(sts.indexOf(r.estado) + 1) % sts.length];
    App.showLoad('Actualizando...');
    try {
      await App.sheetUpdate(CONFIG.SHEETS.RESERVAS, `G${r._row}`, [ns]);
      const rm = App.data.rooms.find(x => x.numero === r.habitacion);
      if (rm) {
        if (ns === 'Check-In') { await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `D${rm._row}`, ['Ocupada']); await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `G${rm._row}`, [r.huespedNombre]); }
        else if (ns === 'Check-Out' || ns === 'Cancelada' || ns === 'No-Show') { await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `D${rm._row}`, ['Limpieza']); await App.sheetUpdate(CONFIG.SHEETS.HABITACIONES, `G${rm._row}`, ['']); }
      }
      // Log to history on Check-Out
      if (ns === 'Check-Out') {
        await App.sheetAppend(CONFIG.SHEETS.HISTORIAL, [new Date().toISOString().slice(0, 10), r.habitacion, r.huespedNombre, r.checkIn, r.checkOut, r.total, 'Check-out por ' + (App.user.name || App.user.email)]);
      }
      App.toast(`Reserva ${rid} → ${ns}`, 'success');
      await App.sync();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    finally { App.hideLoad(); }
  },

  // === NAVIGATION ===
  nav(page) {
    if (!App.can(page) && page !== 'dashboard') { App.toast('Sin permisos', 'warning'); return; }
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const sec = App.$('page-' + page);
    if (sec) sec.classList.add('active');
    const ni = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (ni) ni.classList.add('active');
    if (page === 'reservations') App.populateDropdowns();
  },

  // === MODALS ===
  openModal(id) {
    if (id === 'modalAddRes') App.populateDropdowns();
    App.$(id).classList.add('open');
  },
  closeModal(id) { App.$(id).classList.remove('open'); },

  // === ENTER APP ===
  async enterApp() {
    App.$('login-screen').style.display = 'none';
    App.$('app-screen').style.display = 'block';
    await App.sync();
  },

  // === LOGOUT ===
  logout() {
    if (App.auth.token) google.accounts.oauth2.revoke(App.auth.token);
    localStorage.removeItem('hs_auth');
    location.reload();
  },

  // === INIT ===
  init() {
    // Restore auth
    try {
      const sa = JSON.parse(localStorage.getItem('hs_auth'));
      if (sa) { App.auth.token = sa.t; App.auth.exp = sa.e; App.auth.email = sa.m; App.user.email = sa.m; App.user.name = sa.n || ''; }
    } catch (e) {}

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(o => {
      o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
    });

    // Wait for GIS
    const wait = setInterval(() => {
      if (window.google?.accounts) {
        clearInterval(wait);
        App.initOAuth();
        if (App.tokenValid()) App.enterApp();
      }
    }, 200);

    // Token auto-refresh
    setInterval(() => { if (App.auth.tc && App.auth.exp && (App.auth.exp - Date.now()) < 5 * 60000) App.refreshToken(); }, 60000);
  }
};

document.addEventListener('DOMContentLoaded', App.init);
