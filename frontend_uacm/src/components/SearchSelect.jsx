import { useState, useRef, useEffect } from 'react'

export function SearchSelect({ options = [], value, onChange, placeholder = 'Seleccione...', disabled = false, searchable = true, error = false, renderOption }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  const selected = options.find(o => String(o.value) === String(value || ''))
  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open) { setSearch(''); return }
    const handler = e => { if (!containerRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          border: `1px solid ${error ? '#dc3545' : '#ced4da'}`,
          borderRadius: '4px',
          padding: '6px 10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#e9ecef' : '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9rem',
          color: selected ? '#333' : '#999',
          minHeight: '38px',
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? (renderOption ? renderOption(selected) : selected.label) : placeholder}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.65rem', color: '#aaa', marginLeft: '6px', flexShrink: 0 }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
          zIndex: 9999, background: '#fff', border: '1px solid #ced4da',
          borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: '240px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {searchable && (
            <input
              ref={searchRef} type="text" placeholder="Buscar..." value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ border: 'none', borderBottom: '1px solid #eee', padding: '7px 10px', fontSize: '0.85rem', outline: 'none', flexShrink: 0 }}
            />
          )}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 10px', color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>Sin resultados</div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); setSearch('') }}
                  style={{
                    padding: '7px 12px', cursor: 'pointer', fontSize: '0.88rem',
                    background: String(opt.value) === String(value || '') ? '#f0f0f0' : 'transparent',
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => { if (String(opt.value) !== String(value || '')) e.currentTarget.style.background = '#f8f9fa' }}
                  onMouseLeave={e => { e.currentTarget.style.background = String(opt.value) === String(value || '') ? '#f0f0f0' : 'transparent' }}
                >
                  {renderOption ? renderOption(opt) : opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
