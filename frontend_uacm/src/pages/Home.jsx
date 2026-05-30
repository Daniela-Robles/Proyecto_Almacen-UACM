import { useState, useEffect, useRef, useCallback } from 'react'

const HEARTBEAT_INTERVAL = 120000
const SESSION_CHECK_INTERVAL = 300000

const modulos = [
  { titulo: 'Gestión de Productos',  icono: 'fa-boxes',         color: 'blue',   url: '/GestiondeProductos/' },
  { titulo: 'Reportes e Inventario', icono: 'fa-chart-line',    color: 'navy',   url: '/Reportes/'           },
  { titulo: 'Solicitud de Artículos',icono: 'fa-shopping-cart', color: 'teal',   url: '/Solicitudes/'        },
  { titulo: 'Gestión de Personal',   icono: 'fa-users',         color: 'violet', url: '/GestiondePersonal/'  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCookie(name) {
  let value = null
  if (document.cookie) {
    document.cookie.split(';').forEach(c => {
      const cookie = c.trim()
      if (cookie.startsWith(name + '='))
        value = decodeURIComponent(cookie.substring(name.length + 1))
    })
  }
  return value
}

function getCSRFToken() {
  return getCookie('csrftoken')
}

// ── Componente ────────────────────────────────────────────────────────────────

function Home() {
  const [datos, setDatos]               = useState(null)
  const [saludo, setSaludo]             = useState('Bienvenido')
  const [sessionStatus, setSessionStatus] = useState('active')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalOpen, setModalOpen]       = useState(false)
  const [sessionInfo, setSessionInfo]   = useState(null)
  const [alertasStock, setAlertasStock] = useState([])

  const heartbeatRef    = useRef(null)
  const sessionCheckRef = useRef(null)

  // ── Limpiar intervalos ──────────────────────────────────────────────────────
  const clearIntervals = useCallback(() => {
    if (heartbeatRef.current)    { clearInterval(heartbeatRef.current);    heartbeatRef.current = null }
    if (sessionCheckRef.current) { clearInterval(sessionCheckRef.current); sessionCheckRef.current = null }
  }, [])

  // ── Alerta sesión expirada ──────────────────────────────────────────────────
  const showSessionExpiredAlert = useCallback((redirectUrl) => {
    window.Swal.fire({
      icon: 'warning',
      title: 'Sesión Expirada',
      text: 'Tu sesión ha expirado. Serás redirigido al login.',
      timer: 5000,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: true,
      confirmButtonText: 'Ir al Login',
      confirmButtonColor: '#640404',
    }).then(() => { window.location.href = redirectUrl })
  }, [])

  // ── Heartbeat ───────────────────────────────────────────────────────────────
  const performHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/login/ping-session/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) { setSessionStatus('warning'); return }
      const data = await res.json()
      if (data.redirect)              { clearIntervals(); showSessionExpiredAlert(data.redirect) }
      else if (data.status === 'success') setSessionStatus('active')
      else                                setSessionStatus('warning')
    } catch { setSessionStatus('warning') }
  }, [clearIntervals, showSessionExpiredAlert])

  // ── Verificar sesión ────────────────────────────────────────────────────────
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/login/session-status/', {
        headers: { 'X-CSRFToken': getCSRFToken() },
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return
      const data = await res.json()
      if (!data.session_active) { clearIntervals(); showSessionExpiredAlert('/login/') }
      else setSessionStatus('active')
    } catch { setSessionStatus('warning') }
  }, [clearIntervals, showSessionExpiredAlert])

  // ── Verificación inmediata ──────────────────────────────────────────────────
  const checkSessionImmediately = useCallback(async () => {
    try {
      const res = await fetch('/login/session-status/', {
        headers: { 'X-CSRFToken': getCSRFToken() },
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return
      const data = await res.json()
      if (!data.session_active) { clearIntervals(); showSessionExpiredAlert('/login/') }
      else setSessionStatus('active')
    } catch { setSessionStatus('warning') }
  }, [clearIntervals, showSessionExpiredAlert])

  // ── Mostrar info de sesión en modal ────────────────────────────────────────
  const showSessionInfo = async () => {
    try {
      const res = await fetch('/login/session-status/', {
        headers: { 'X-CSRFToken': getCSRFToken() },
      })
      const data = await res.json()
      setSessionInfo(data)
      setDropdownOpen(false)
      setModalOpen(true)
    } catch {
      window.Swal.fire({
        icon: 'error', title: 'Error',
        text: 'No se pudo obtener la información de la sesión.',
        confirmButtonText: 'Aceptar', confirmButtonColor: '#640404',
      })
    }
  }

  // ── Próximamente ────────────────────────────────────────────────────────────
  const showComingSoon = (e) => {
    e.preventDefault()
    window.Swal.fire({
      icon: 'info', title: 'Próximamente',
      text: 'Esta funcionalidad estará disponible en futuras actualizaciones.',
      confirmButtonText: 'Entendido', confirmButtonColor: '#640404',
    })
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Saludo dinámico
  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 12)       setSaludo('Buenos días')
    else if (h >= 12 && h < 19) setSaludo('Buenas tardes')
    else                         setSaludo('Buenas noches')
  }, [])

  // Cargar datos del dashboard
  useEffect(() => {
    fetch('/home/stats/')
      .then(r => r.json())
      .then(setDatos)
      .catch(() => setDatos({
        persona_nombre: 'Usuario', user_role: 'Usuario',
        total_productos: 0, total_solicitudes: 0,
        solicitudes_pendientes: 0, total_personal: 0, productos_bajo_stock: 0,
      }))
  }, [])

  // Cargar alertas de stock bajo
  useEffect(() => {
    fetch('/Solicitudes/alertas-stock/')
      .then(r => r.json())
      .then(data => setAlertasStock(data.alertas || []))
      .catch(() => {})
  }, [])

  // Heartbeat
  useEffect(() => {
    performHeartbeat()
    heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_INTERVAL)
    return () => clearIntervals()
  }, [performHeartbeat, clearIntervals])

  // Verificación periódica de sesión
  useEffect(() => {
    sessionCheckRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL)
    return () => { if (sessionCheckRef.current) clearInterval(sessionCheckRef.current) }
  }, [checkSession])

  // Visibilidad de página
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_INTERVAL * 2)
        }
      } else {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_INTERVAL)
          performHeartbeat()
        }
        checkSessionImmediately()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [performHeartbeat, checkSessionImmediately])

  // Limpiar al salir
  useEffect(() => {
    const handleUnload = () => clearIntervals()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [clearIntervals])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e) => {
      if (!e.target.closest('#userProfile')) setDropdownOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [dropdownOpen])

  // Cerrar dropdown/modal con ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setModalOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!datos) return <p style={{ padding: '2rem', color: 'white' }}>Cargando...</p>

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/static/media/logouacm.jpg" alt="UACM" className="sidebar-logo" />
          <div className="sidebar-brand-text">
            <span className="sidebar-title">Inventario UACM</span>
            <span className="sidebar-sub">Sistema de Gestión</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Menú principal</p>
          <a href="/home/" className="sidebar-link sidebar-link--active">
            <i className="fas fa-th-large"></i>
            <span>Dashboard</span>
          </a>
          {modulos.map((m, i) => (
            <a key={i} href={m.url} className="sidebar-link">
              <i className={`fas ${m.icono}`}></i>
              <span>{m.titulo}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar"><i className="fas fa-user"></i></div>
            <div>
              <p className="sidebar-user-name">{datos.persona_nombre}</p>
              <p className="sidebar-user-role">{datos.user_role}</p>
            </div>
          </div>
          <a href="/login/logout/" className="sidebar-logout">
            <i className="fas fa-sign-out-alt"></i>
            <span>Cerrar sesión</span>
          </a>
        </div>
      </aside>

      {/* Área principal */}
      <div className="main-wrapper">

        {/* Topbar */}
        <div className="topbar">
          <span className="topbar-greeting">
            {saludo}, <strong>{datos.persona_nombre.split(' ')[0]}</strong>
          </span>
          <button className="topbar-info-btn" onClick={showSessionInfo} title="Estado de sesión">
            <i className="fas fa-info-circle"></i>
          </button>
        </div>

        {/* Contenido */}
        <div className="dashboard-content">

          {/* KPIs */}
          <div className="kpis-grid">
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--blue"><i className="fas fa-boxes"></i></div>
              <span className="kpi-number">{datos.total_productos}</span>
              <span className="kpi-label">Productos registrados</span>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--navy"><i className="fas fa-file-alt"></i></div>
              <span className="kpi-number">{datos.total_solicitudes}</span>
              <span className="kpi-label">Solicitudes realizadas</span>
            </div>
            <div className="kpi-card" style={datos.solicitudes_pendientes > 0 ? { borderTop: '4px solid #ef4444' } : {}}>
              <div className="kpi-icon" style={{ background: datos.solicitudes_pendientes > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(100,4,4,0.08)' }}>
                <i className="fas fa-clock" style={{ color: datos.solicitudes_pendientes > 0 ? '#ef4444' : '#6b0017' }}></i>
              </div>
              <span className="kpi-number" style={datos.solicitudes_pendientes > 0 ? { color: '#ef4444' } : {}}>{datos.solicitudes_pendientes}</span>
              <span className="kpi-label">Pendientes por atender</span>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon kpi-icon--violet"><i className="fas fa-users"></i></div>
              <span className="kpi-number">{datos.total_personal}</span>
              <span className="kpi-label">Personal registrado</span>
            </div>
          </div>

          {/* Alertas de stock */}
          {alertasStock.length > 0 && (
            <div className="info-card">
              <div className="info-card-title">
                <i className="fas fa-exclamation-triangle"></i> Atención requerida
                <span className="info-card-badge">{alertasStock.length}</span>
              </div>
              <div className="stock-alerts-list">
                {alertasStock.map(a => (
                  <div key={a.id_producto} className="stock-alert-item">
                    <span className="stock-alert-name">{a.nombre_producto}</span>
                    <span className="stock-alert-qty">
                      <strong style={{ color: '#ef4444' }}>{a.cantidad}</strong> / mín. {a.stock_minimo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <footer>
          <p>"Nada Humano Me Es Ajeno"</p>
          <p className="footer-copy">Sistema de Gestión UACM © 2026</p>
        </footer>
      </div>

      {/* Modal sesión */}
      {modalOpen && (
        <div className="session-modal" style={{ display: 'block' }} onClick={(e) => {
          if (e.target.classList.contains('session-modal') || e.target.classList.contains('modal-overlay'))
            setModalOpen(false)
        }}>
          <div className="modal-overlay"></div>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
            <div className="modal-header">
              <i className="fas fa-info-circle"></i>
              <h3>Información de Sesión</h3>
            </div>
            <div className="modal-body">
              {sessionInfo ? (
                <>
                  <p><strong><i className="fas fa-user"></i> Usuario:</strong> <span>{sessionInfo.username}</span></p>
                  <p><strong><i className="fas fa-signal"></i> Estado:</strong>{' '}
                    {sessionInfo.session_active
                      ? <span style={{ color: '#28a745', fontWeight: 700 }}><i className="fas fa-check-circle"></i> Activa</span>
                      : <span style={{ color: '#dc3545', fontWeight: 700 }}><i className="fas fa-times-circle"></i> Inactiva</span>}
                  </p>
                  <p><strong><i className="fas fa-clock"></i> Timeout:</strong> <span>{sessionInfo.stats?.timeout_minutes} minutos</span></p>
                  <p><strong><i className="fas fa-calendar-check"></i> Última Verificación:</strong>{' '}
                    <span>{new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </p>
                </>
              ) : <p>Cargando...</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Home
