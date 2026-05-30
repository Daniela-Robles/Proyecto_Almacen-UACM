import { useState, useEffect } from 'react'
import { getCookie } from '../utils/getCookie'
import { usePersonal } from './usePersonal'

const formVacio = { matricula: '', nombre: '', id_rol: '', id_almacen: '', observaciones: '' }

export function useSolicitud({ datos, alertasStock, setModalAlertas, setCampanaVisible }) {
  const [form, setForm] = useState(formVacio)
  const [productos, setProductos] = useState([])
  const [prodSel, setProdSel] = useState({ id_producto: '', cantidad: 1 })
  const [solicitudActual, setSolicitudActual] = useState(null)
  const [buscarId, setBuscarId] = useState('')
  const [checkedItems, setCheckedItems] = useState(new Set())
  const [desdeAlertas, setDesdeAlertas] = useState(false)

  const { personalValido, setPersonalValido, personalStatus, reset: resetPersonal, procesarQRPersonal, handleMatriculaBlur } = usePersonal({
    onPersonalFound: (data) => setForm(f => ({ ...f, ...data })),
  })

  // ── Valores derivados ──────────────────────────────────────────────────────
  const solicitanteRolNombre = form.id_rol
    ? (datos?.roles?.find(r => String(r.id_rol) === String(form.id_rol))?.nombre_rol || '')
    : ''
  const solicitanteEsEncargado = solicitanteRolNombre.toLowerCase().includes('encargado')
  const almacenesFiltrados = !form.id_rol || solicitanteEsEncargado
    ? (datos?.almacenes || [])
    : (datos?.almacenes || []).filter(a => a.tipo_almacen.toLowerCase().includes('cuautepec'))
  const almacenEsCentral = datos?.ids_almacen_central?.includes(parseInt(form.id_almacen)) ?? false
  const productosFiltrados = almacenEsCentral
    ? (datos?.productos || [])
    : (datos?.productos || []).filter(p => p.id_estatus === datos?.id_estatus_activo)
  const accionable = solicitudActual?.estatus === 'SOLICITADA'

  // ── Auto-buscar si viene ?id= en la URL ────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (!id) return
    setBuscarId(id)
    fetch(`/Solicitudes/buscar/${id}/`)
      .then(r => r.json())
      .then(data => {
        if (!data.solicitud) return
        const sol = data.solicitud
        setForm({ matricula: String(sol.matricula || ''), nombre: sol.solicitante || '', id_rol: String(sol.id_rol || ''), id_almacen: String(sol.id_almacen || ''), observaciones: '' })
        setProductos(sol.productos)
        setPersonalValido(true)
        setSolicitudActual(sol)
        setCheckedItems(new Set())
        setDesdeAlertas(false)
        setTimeout(() => document.querySelector('.buscar-section')?.scrollIntoView({ behavior: 'smooth' }), 300)
      })
      .catch(() => {})
  }, [])

  // ── Limpiar selección de producto si ya no está disponible ─────────────────
  useEffect(() => {
    if (!prodSel.id_producto) return
    const sigueDisponible = productosFiltrados.find(p => String(p.id_producto) === prodSel.id_producto)
    if (!sigueDisponible) setProdSel(s => ({ ...s, id_producto: '' }))
  }, [datos?.productos?.length, form.id_almacen])

  // ── Limpiar almacén si ya no está en la lista filtrada ────────────────────
  useEffect(() => {
    if (!solicitudActual && form.id_almacen && !almacenesFiltrados.find(a => String(a.id_almacen) === form.id_almacen)) {
      setForm(f => ({ ...f, id_almacen: '' }))
    }
    if (!solicitudActual && almacenesFiltrados.length === 1) {
      setForm(f => ({ ...f, id_almacen: String(almacenesFiltrados[0].id_almacen) }))
    }
  }, [solicitanteEsEncargado])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMatriculaChange = (value) => {
    setForm(f => ({ ...f, matricula: value, nombre: '', id_rol: '' }))
    resetPersonal()
  }

  const handleAgregarProducto = () => {
    if (solicitudActual) return
    if (!prodSel.id_producto || prodSel.cantidad <= 0) return
    const id   = String(prodSel.id_producto)
    const cant = parseInt(prodSel.cantidad) || 1
    const info = datos?.productos?.find(p => String(p.id_producto) === id)
    const nombre = info?.nombre_producto || id
    setProductos(prev => {
      const existe = prev.find(p => p.id_producto === id)
      if (existe) return prev.map(p => p.id_producto === id ? { ...p, cantidad: p.cantidad + cant } : p)
      return [...prev, { id_producto: id, nombre, cantidad: cant }]
    })
    setProdSel({ id_producto: '', cantidad: 1 })
  }

  const handleEnviar = async () => {
    if (solicitudActual) return
    if (!form.matricula.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa la matrícula del solicitante.' }); return
    }
    if (desdeAlertas && !solicitanteEsEncargado) {
      window.Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo un encargado de almacén puede generar una solicitud de reabastecimiento.' })
        .then(() => { setDesdeAlertas(false); setProductos([]); setForm(f => ({ ...f, id_almacen: '' })) })
      return
    }
    if (!personalValido) {
      window.Swal.fire({ icon: 'warning', title: 'Personal inválido', text: 'La matrícula no está registrada. Verifica o usa el escáner QR.' }); return
    }
    if (!form.nombre.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa el nombre del solicitante.' }); return
    }
    if (!form.id_almacen) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Selecciona un almacén de destino.' }); return
    }
    if (productos.length === 0) {
      window.Swal.fire({ icon: 'warning', title: 'Sin productos', text: 'Agrega al menos un producto.' }); return
    }

    const payload = {
      id_almacen:              form.id_almacen,
      id_personal:             form.matricula.trim(),
      observaciones_solicitud: form.observaciones.trim(),
      productos: productos.map(p => ({ id_producto: p.id_producto, cantidad: p.cantidad })),
    }

    try {
      const res = await fetch('/Solicitudes/crear/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(payload),
      })
      const rawText = await res.text()
      let result
      try { result = JSON.parse(rawText) } catch { throw new Error('Respuesta inválida del servidor: ' + rawText) }
      if (res.ok) {
        setSolicitudActual(result.solicitud)
        setProductos(result.solicitud.productos)
        setCheckedItems(new Set())
        if (desdeAlertas) setCampanaVisible(false)
        setDesdeAlertas(false)
        window.Swal.fire({ icon: 'success', title: 'Solicitud creada', text: 'Solicitud registrada correctamente.', timer: 2000, showConfirmButton: false })
      } else {
        throw new Error(result.message || result.error || rawText)
      }
    } catch (err) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
  }

  const handleNuevaSolicitud = () => {
    setSolicitudActual(null)
    setForm(formVacio)
    setProductos([])
    setProdSel({ id_producto: '', cantidad: 1 })
    resetPersonal()
    setCheckedItems(new Set())
    document.getElementById('nueva-solicitud-container')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCancelar = async () => {
    if (!solicitudActual) return
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Cancelar solicitud?',
      showCancelButton: true, confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No', confirmButtonColor: '#dc3545',
    })
    if (!conf.isConfirmed) return
    try {
      const res = await fetch(`/Solicitudes/cancelar/${solicitudActual.id_solicitud}/`, {
        method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const result = await res.json()
      if (res.ok) {
        window.Swal.fire({ icon: 'success', title: 'Cancelada', text: 'Solicitud cancelada.', timer: 2000, showConfirmButton: false })
          .then(() => location.reload())
      } else {
        throw new Error(result.message || result.error)
      }
    } catch (err) {
      window.Swal.fire({ icon: 'error', title: 'Error', text: err.message })
    }
  }

  const handleAprobar = async () => {
    if (!solicitudActual) return
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Aprobar solicitud?',
      showCancelButton: true, confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'No', confirmButtonColor: '#28a745',
    })
    if (!conf.isConfirmed) return
    try {
      const res = await fetch(`/Solicitudes/aprobar/${solicitudActual.id_solicitud}/`, {
        method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') },
      })
      const result = await res.json()
      if (res.ok) {
        setSolicitudActual(s => ({ ...s, estatus: 'APROBADA' }))
        window.Swal.fire({ icon: 'success', title: 'Aprobada', text: 'Solicitud aprobada correctamente.', timer: 2000, showConfirmButton: false })
      } else {
        window.Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo aprobar.' })
      }
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al aprobar la solicitud.' })
    }
  }

  const handleCheck = async (id_producto) => {
    const nuevos = new Set(checkedItems)
    if (nuevos.has(id_producto)) { nuevos.delete(id_producto); setCheckedItems(nuevos); return }
    nuevos.add(id_producto)
    setCheckedItems(nuevos)
    if (nuevos.size === productos.length) {
      const conf = await window.Swal.fire({
        icon: 'success', title: 'Todos los productos verificados', text: '¿Deseas aprobar la solicitud?',
        showCancelButton: true, confirmButtonText: 'Sí, aprobar', cancelButtonText: 'No por ahora',
        confirmButtonColor: '#28a745',
      })
      if (conf.isConfirmed) await handleAprobar()
      else { nuevos.delete(id_producto); setCheckedItems(new Set(nuevos)) }
    }
  }

  const handleGenerarDesdeAlertas = () => {
    sessionStorage.removeItem('alertas_stock_vistas')
    setModalAlertas(false)
    setDesdeAlertas(true)
    const idCentral = datos?.ids_almacen_central?.[0]
    setForm(f => ({ ...f, id_almacen: idCentral ? String(idCentral) : '' }))
    setProductos(alertasStock.map(a => ({ id_producto: String(a.id_producto), nombre: a.nombre_producto, cantidad: a.faltante })))
  }

  const handleBuscarSolicitud = async () => {
    if (!buscarId.trim()) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingresa el ID de la solicitud.' }); return
    }
    try {
      const res  = await fetch(`/Solicitudes/buscar/${buscarId}/`)
      const data = await res.json()
      if (!res.ok) {
        window.Swal.fire({ icon: 'info', title: 'No encontrada', text: data.error || 'Solicitud no encontrada.' }); return
      }
      const sol = data.solicitud
      setForm({ matricula: String(sol.matricula || ''), nombre: sol.solicitante || '', id_rol: String(sol.id_rol || ''), id_almacen: String(sol.id_almacen || ''), observaciones: '' })
      setProductos(sol.productos)
      setPersonalValido(true)
      setSolicitudActual(sol)
      setCheckedItems(new Set())
      setDesdeAlertas(false)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'Error al buscar la solicitud.' })
    }
  }

  const handleExportar = () => {
    if (!solicitudActual) return
    window.open(`/Solicitudes/exportar/pdf/${solicitudActual.id_solicitud}/`)
  }

  return {
    form, setForm, productos, setProductos, prodSel, setProdSel,
    solicitudActual, setSolicitudActual, buscarId, setBuscarId,
    checkedItems, desdeAlertas,
    personalValido, personalStatus,
    solicitanteEsEncargado, almacenesFiltrados, productosFiltrados, accionable,
    handleMatriculaChange, handleAgregarProducto, handleEnviar, handleNuevaSolicitud,
    handleCancelar, handleAprobar, handleCheck,
    handleGenerarDesdeAlertas, handleBuscarSolicitud, handleExportar,
    procesarQRPersonal, handleMatriculaBlur,
  }
}
