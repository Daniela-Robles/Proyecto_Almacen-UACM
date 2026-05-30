import { useState } from 'react'
import { getCookie } from '../utils/getCookie'

const formVacio = { id_producto: '', cantidad_maxima: 5, periodo: 'diario' }

export function useLimites({ datos }) {
  const [modalLimites, setModalLimites] = useState(false)
  const [limites, setLimites] = useState([])
  const [formLimite, setFormLimite] = useState(formVacio)

  const abrirModalLimites = async () => {
    try {
      const res = await fetch('/Solicitudes/limites/')
      const data = await res.json()
      setLimites(data.limites)
      setModalLimites(true)
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los límites.' })
    }
  }

  const handleGuardarLimite = async () => {
    if (!formLimite.id_producto) {
      window.Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Selecciona un producto.' }); return
    }
    try {
      const res = await fetch('/Solicitudes/limites/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(formLimite),
      })
      const result = await res.json()
      if (res.ok) {
        const res2 = await fetch('/Solicitudes/limites/')
        const data2 = await res2.json()
        setLimites(data2.limites)
        setFormLimite(formVacio)
        window.Swal.fire({ icon: 'success', title: result.created ? 'Límite creado' : 'Límite actualizado', timer: 1500, showConfirmButton: false })
      } else {
        window.Swal.fire({ icon: 'error', title: 'Error', text: result.error })
      }
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el límite.' })
    }
  }

  const handleEliminarLimite = async (id_limite) => {
    const conf = await window.Swal.fire({
      icon: 'question', title: '¿Eliminar límite?',
      showCancelButton: true, confirmButtonText: 'Sí', cancelButtonText: 'No',
      confirmButtonColor: '#dc3545',
    })
    if (!conf.isConfirmed) return
    try {
      const res = await fetch('/Solicitudes/limites/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({ id_limite }),
      })
      if (res.ok) setLimites(prev => prev.filter(l => l.id_limite !== id_limite))
    } catch {
      window.Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el límite.' })
    }
  }

  return { modalLimites, setModalLimites, limites, formLimite, setFormLimite, abrirModalLimites, handleGuardarLimite, handleEliminarLimite }
}
