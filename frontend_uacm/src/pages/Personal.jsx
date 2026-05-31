import { useState, useEffect, useCallback } from 'react'

const MAX_PRODUCTOS = 3

const modulos = [
  { titulo: 'Gestión de Productos',   icono: 'fa-boxes',         url: '/GestiondeProductos/' },
  { titulo: 'Reportes e Inventario',  icono: 'fa-chart-line',    url: '/Reportes/'           },
  { titulo: 'Solicitud de Artículos', icono: 'fa-shopping-cart', url: '/Solicitudes/'        },
  { titulo: 'Gestión de Personal',    icono: 'fa-users',         url: '/GestiondePersonal/'  },
]

// ── Item de timeline ──────────────────────────────────────────────────────────

function TlItem({ ev }) {
  const [expandido, setExpandido] = useState(false)
  const cfg = estatusConfig(ev.estatus)
  const tieneExtra = ev.productos.length > MAX_PRODUCTOS
  const visibles = expandido ? ev.productos : ev.productos.slice(0, MAX_PRODUCTOS)

  return (
    <div className="tl-item">
      <div className={`tl-dot ${cfg.dot}`}>
        <i className={`fas ${cfg.icon}`}></i>
      </div>
      <div className="tl-body">
        <a className="tl-folio" href={`/Solicitudes/?id=${ev.id_solicitud}`} title="Ver solicitud">
          FOLIO-{String(ev.id_solicitud).padStart(5, '0')}
          <i className="fas fa-external-link-alt" style={{ fontSize: '.65rem', marginLeft: '.3rem', opacity: .6 }}></i>
        </a>
        <div className="tl-fecha">{ev.fecha}</div>
        <span className={`tl-estatus ${cfg.badge}`}>{ev.estatus}</span>

        {ev.productos.length > 0 && (
          <div className="tl-productos">
            {visibles.map((p, j) => (
              <div className="tl-prod-item" key={j}>
                <i className="fas fa-box" style={{ marginRight: '.3rem', color: '#aaa' }}></i>
                {p.nombre} × {p.cantidad}
              </div>
            ))}
            {tieneExtra && (
              <button className="tl-ver-mas" onClick={() => setExpandido(e => !e)}>
                {expandido
                  ? <><i className="fas fa-chevron-up"></i> Ver menos</>
                  : <><i className="fas fa-chevron-down"></i> +{ev.productos.length - MAX_PRODUCTOS} más</>
                }
              </button>
            )}
          </div>
        )}

        {ev.gestionado_por && (
          <div className="tl-gestor">
            {ev.estatus === 'Aprobada' ? 'Aprobado' : 'Gestionado'} por {ev.gestionado_por}
            {ev.fecha_gestion && ` · ${ev.fecha_gestion}`}
          </div>
        )}

        {ev.observaciones && (
          <div className="tl-gestor" style={{ color: '#777', fontStyle: 'normal' }}>
            {ev.observaciones}
          </div>
        )}
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

const ESTATUS_CONFIG = {
  'SOLICITADA':      { dot: 'dot-solicitada', badge: 'est-solicitada', icon: 'fa-clock'    },
  'APROBADA':        { dot: 'dot-aprobada',   badge: 'est-aprobada',   icon: 'fa-check'    },
  'CANCELADA':       { dot: 'dot-cancelada',  badge: 'est-cancelada',  icon: 'fa-times'    },
  'COMPLETADA':      { dot: 'dot-completada', badge: 'est-completada', icon: 'fa-star'     },
  'ENTREGA_PARCIAL': { dot: 'dot-parcial',    badge: 'est-parcial',    icon: 'fa-box-open' },
}
function estatusConfig(nombre) {
  return ESTATUS_CONFIG[nombre] || { dot: 'dot-default', badge: 'est-default', icon: 'fa-circle' }
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Personal() {
  const [userData, setUserData]             = useState(null)
  const [roles, setRoles]                   = useState([])
  const [personal, setPersonal]             = useState([])
  const [loading, setLoading]               = useState(false)
  const [busqueda, setBusqueda]             = useState('')
  const [filtroRol, setFiltroRol]           = useState('')
  const [seleccionado, setSeleccionado]     = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  useEffect(() => {
    fetch('/GestiondePersonal/lista/')
      .then(r => r.json())
      .then(d => { setPersonal(d.personal); setRoles(d.roles) })
      .catch(() => {})

    fetch('/home/stats/')
      .then(r => r.json())
      .then(d => setUserData({ persona_nombre: d.persona_nombre, user_role: d.user_role }))
      .catch(() => setUserData({ persona_nombre: 'Usuario', user_role: '' }))
  }, [])

  const buscar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (busqueda)  params.set('q', busqueda)
    if (filtroRol) params.set('id_rol', filtroRol)
    fetch(`/GestiondePersonal/lista/?${params}`)
      .then(r => r.json())
      .then(d => { setPersonal(d.personal); setLoading(false) })
      .catch(() => setLoading(false))
  }, [busqueda, filtroRol])

  useEffect(() => { buscar() }, [filtroRol])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleBusquedaKeyDown = e => { if (e.key === 'Enter') buscar() }

  const verDetalle = (id) => {
    if (seleccionado?.id === id) { setSeleccionado(null); return }
    setLoadingDetalle(true)
    setSeleccionado({ id, datos: null })
    fetch(`/GestiondePersonal/${id}/`)
      .then(r => r.json())
      .then(datos => { setSeleccionado({ id, datos }); setLoadingDetalle(false) })
      .catch(() => { setSeleccionado(null); setLoadingDetalle(false) })
  }

  if (!userData) return <p style={{ padding: '2rem', color: 'white' }}>Cargando...</p>

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
          <a href="/home/" className="sidebar-link">
            <i className="fas fa-th-large"></i><span>Dashboard</span>
          </a>
          {modulos.map((m, i) => (
            <a key={i} href={m.url}
              className={`sidebar-link${m.url === '/GestiondePersonal/' ? ' sidebar-link--active' : ''}`}>
              <i className={`fas ${m.icono}`}></i><span>{m.titulo}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar"><i className="fas fa-user"></i></div>
            <div>
              <p className="sidebar-user-name">{userData.persona_nombre}</p>
              <p className="sidebar-user-role">{userData.user_role}</p>
            </div>
          </div>
          <a href="/login/logout/" className="sidebar-logout">
            <i className="fas fa-sign-out-alt"></i><span>Cerrar sesión</span>
          </a>
        </div>
      </aside>

      {/* Área principal */}
      <div className="main-wrapper">

        <div className="topbar">
          <div>
            <p className="topbar-title">Gestión de Personal</p>
            <p className="topbar-subtitle">Directorio y actividad del personal registrado</p>
          </div>
        </div>

        <div className="dashboard-content">

          {/* Filtros */}
          <div className="filtros-card">
            <div className="form-group">
              <label>Buscar</label>
              <input
                type="text"
                placeholder="Nombre, matrícula, correo…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={handleBusquedaKeyDown}
              />
            </div>
            <div className="form-group">
              <label>Cargo</label>
              <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="">Todos</option>
                {roles.map(r => (
                  <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={buscar}>
              <i className="fas fa-search"></i> Buscar
            </button>
          </div>

          {/* Tabla + panel de detalle */}
          <div className={seleccionado ? 'layout-split panel-abierto' : ''}>

            <div className="tabla-card">
              <h2><i className="fas fa-users"></i> Personal ({personal.length})</h2>
              <table>
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Nombre</th>
                    <th>Cargo</th>
                    <th className="col-secundaria">Categoría Salarial</th>
                    <th>Correo</th>
                    <th className="col-secundaria">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="loading-row">
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <i className="fas fa-spinner fa-spin"></i> Cargando…
                      </td>
                    </tr>
                  )}
                  {!loading && personal.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#aaa' }}>
                        Sin resultados
                      </td>
                    </tr>
                  )}
                  {!loading && personal.map(p => (
                    <tr
                      key={p.id_personal}
                      className={seleccionado?.id === p.id_personal ? 'selected' : ''}
                      onClick={() => verDetalle(p.id_personal)}
                    >
                      <td>{p.id_personal}</td>
                      <td><strong>{p.nombre_completo}</strong></td>
                      <td><span className="badge-rol">{p.cargo}</span></td>
                      <td className="col-secundaria">{p.categoria_salarial}</td>
                      <td>{p.correo}</td>
                      <td className="col-secundaria">{p.telefono}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {seleccionado && (
              <div className="detalle-panel">
                {loadingDetalle || !seleccionado.datos ? (
                  <div className="detalle-placeholder">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Cargando información…</p>
                  </div>
                ) : (
                  <DetallePersonal datos={seleccionado.datos} />
                )}
              </div>
            )}

          </div>

        </div>

        <footer>
          <p>"Nada Humano Me Es Ajeno"</p>
          <p className="footer-copy">Sistema de Gestión UACM © 2026</p>
        </footer>
      </div>
    </>
  )
}

// ── Panel de detalle + timeline ────────────────────────────────────────────────

function DetallePersonal({ datos }) {
  return (
    <>
      <div className="detalle-header">
        <h3><i className="fas fa-id-card"></i> {datos.nombre_completo}</h3>
        <p>Matrícula: {datos.id_personal}</p>
      </div>

      <div className="detalle-meta">
        <div className="meta-item">
          <span className="meta-label">Cargo</span>
          <span className="meta-val">{datos.cargo}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Categoría Salarial</span>
          <span className="meta-val">{datos.categoria_salarial}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Correo</span>
          <span className="meta-val" style={{ wordBreak: 'break-all' }}>{datos.correo}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Teléfono</span>
          <span className="meta-val">{datos.telefono}</span>
        </div>
        {datos.descripcion_categoria && datos.descripcion_categoria !== '—' && (
          <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
            <span className="meta-label">Descripción</span>
            <span className="meta-val">{datos.descripcion_categoria}</span>
          </div>
        )}
      </div>

      <div className="timeline-header">
        <i className="fas fa-history"></i>
        Historial de solicitudes ({datos.timeline.length})
      </div>

      <div className="timeline">
        {datos.timeline.length === 0 ? (
          <div className="timeline-empty">
            <i className="fas fa-inbox"></i>
            <p>Sin solicitudes registradas</p>
          </div>
        ) : (
          datos.timeline.map((ev, i) => <TlItem key={i} ev={ev} />)
        )}
      </div>
    </>
  )
}
