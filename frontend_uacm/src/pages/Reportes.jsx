import { useState, useEffect } from 'react'

const modulos = [
  { titulo: 'Gestión de Productos',   icono: 'fa-boxes',         url: '/GestiondeProductos/' },
  { titulo: 'Reportes e Inventario',  icono: 'fa-chart-line',    url: '/Reportes/'           },
  { titulo: 'Solicitud de Artículos', icono: 'fa-shopping-cart', url: '/Solicitudes/'        },
  { titulo: 'Gestión de Personal',    icono: 'fa-users',         url: '/GestiondePersonal/'  },
]

function getCookie(name) {
  let value = null
  if (document.cookie)
    document.cookie.split(';').forEach(c => {
      const t = c.trim()
      if (t.startsWith(name + '=')) value = decodeURIComponent(t.substring(name.length + 1))
    })
  return value
}

export default function Reportes() {
  const [datos, setDatos]                         = useState(null)
  const [form, setForm]                           = useState({ fecha_inicio: '', fecha_fin: '', formato: 'PDF' })
  const [resultados, setResultados]               = useState([])
  const [inventario, setInventario]               = useState([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [mostrarInventario, setMostrarInventario] = useState(false)
  const [loadingReporte, setLoadingReporte]       = useState(false)
  const [loadingInventario, setLoadingInventario] = useState(false)

  useEffect(() => {
    fetch('/Reportes/datos/')
      .then(r => r.json())
      .then(setDatos)
      .catch(() => setDatos({ persona_nombre: 'Usuario', user_role: 'Usuario' }))
  }, [])

  const handleGenerarReporte = async (e) => {
    e.preventDefault()
    if (!form.fecha_inicio || !form.fecha_fin) {
      window.Swal.fire({ icon: 'warning', title: 'Fechas requeridas', text: 'Selecciona ambas fechas.', confirmButtonColor: '#640404' }); return
    }
    if (form.fecha_inicio > form.fecha_fin) {
      window.Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha de inicio no puede ser mayor que la de fin.', confirmButtonColor: '#640404' }); return
    }

    setLoadingReporte(true)
    try {
      const fd = new FormData()
      fd.append('fecha_inicio', form.fecha_inicio)
      fd.append('fecha_fin',    form.fecha_fin)
      fd.append('formato',      form.formato)

      const res  = await fetch('/Reportes/reporte_solicitudes/', {
        method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') }, body: fd,
      })
      const data = await res.json()

      if (data.url) {
        const a = document.createElement('a')
        a.href = data.url; a.download = 'reporte'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        return
      }

      const filas = data.productos || data.datos || []
      if (filas.length === 0) {
        window.Swal.fire({ icon: 'info', title: 'Sin resultados', text: 'No se encontraron resultados para ese período.', confirmButtonColor: '#640404' }); return
      }
      setResultados(filas)
      setMostrarResultados(true)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al generar el reporte.', confirmButtonColor: '#640404' })
    } finally {
      setLoadingReporte(false)
    }
  }

  const handleVerInventario = async () => {
    setLoadingInventario(true)
    try {
      const res  = await fetch('/Reportes/inventario/')
      const data = await res.json()
      if (!data.articulos || data.articulos.length === 0) {
        window.Swal.fire({ icon: 'info', title: 'Sin artículos', text: 'No hay artículos en inventario.', confirmButtonColor: '#640404' }); return
      }
      setInventario(data.articulos)
      setMostrarInventario(true)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al cargar el inventario.', confirmButtonColor: '#640404' })
    } finally {
      setLoadingInventario(false)
    }
  }

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
          <a href="/home/" className="sidebar-link">
            <i className="fas fa-th-large"></i>
            <span>Dashboard</span>
          </a>
          {modulos.map((m, i) => (
            <a key={i} href={m.url}
              className={`sidebar-link${m.url === '/Reportes/' ? ' sidebar-link--active' : ''}`}>
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
          <div>
            <p className="topbar-title">Reportes e Inventario</p>
            <p className="topbar-subtitle">Generación de reportes y consulta de inventario</p>
          </div>
        </div>

        {/* Contenido */}
        <div className="dashboard-content">

          {/* Reporte de solicitudes */}
          <div className="card">
            <div className="card-title">
              <i className="fas fa-chart-bar"></i> Reporte de Solicitudes
            </div>
            <form onSubmit={handleGenerarReporte}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Fecha fin</label>
                  <input type="date" value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Formato</label>
                  <select value={form.formato} onChange={e => setForm(f => ({ ...f, formato: e.target.value }))}>
                    <option value="PDF">PDF</option>
                    <option value="CSV">CSV</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loadingReporte}>
                  <i className="fas fa-chart-bar"></i>
                  {loadingReporte ? 'Generando...' : 'Generar reporte'}
                </button>
              </div>
            </form>

            {mostrarResultados && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th><th>Almacén</th><th>Artículo</th>
                      <th>Cantidad</th><th>Solicitante</th><th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((item, i) => (
                      <tr key={i}>
                        <td>{item.id_solicitud        || '-'}</td>
                        <td>{item.almacen_direccion   || '-'}</td>
                        <td>{item.nom_articulo        || '-'}</td>
                        <td>{item.cantidad            || '-'}</td>
                        <td>{item.nombre_persona      || '-'}</td>
                        <td>{item.fecha_sol           || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Inventario general */}
          <div className="card">
            <div className="card-title">
              <i className="fas fa-boxes"></i> Inventario General
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={handleVerInventario} disabled={loadingInventario}>
                <i className="fas fa-boxes"></i>
                {loadingInventario ? 'Cargando...' : 'Ver inventario'}
              </button>
            </div>

            {mostrarInventario && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Artículo</th><th>Descripción</th><th>Cantidad</th><th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.map((item, i) => (
                      <tr key={i}>
                        <td>{item.nom_articulo  || '-'}</td>
                        <td>{item.desc_articulo || '-'}</td>
                        <td>{item.cantidad      || '-'}</td>
                        <td>{item.nomb_estatus  || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
