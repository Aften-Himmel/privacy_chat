import { useState, useRef, useEffect } from 'react'

export default function InvitationsDropdown({ pending, onRespond }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer transition"
        title="Friend Requests">
        {/* Users Icon */}
        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>

        {pending.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pending.length > 9 ? '9+' : pending.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 w-max bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden" style={{minWidth: '280px', maxWidth: 'max(280px, calc(100vw - 2rem))'}}>
          <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex justify-between">
            <span className="text-gray-800 text-sm font-semibold">Contact Requests</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No new requests</p>
            ) : pending.map(inv => (
              <div key={inv._id} className="px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {inv.from.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.from.username}</p>
                    <p className="text-xs text-gray-500">{inv.type === 'contact_request' ? 'wants to connect' : 'invited you to chat'}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { onRespond(inv._id, 'accepted'); setOpen(false) }}
                    className="flex-1 text-xs font-bold rounded-lg py-1.5 transition text-white bg-blue-500 hover:bg-blue-600 border-none cursor-pointer">
                    Accept
                  </button>
                  <button onClick={() => { onRespond(inv._id, 'declined'); setOpen(false) }}
                    className="flex-1 text-xs font-bold rounded-lg py-1.5 transition text-gray-700 bg-gray-200 hover:bg-gray-300 border-none cursor-pointer">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
