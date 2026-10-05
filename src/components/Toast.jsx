import React from 'react';

// Notifikasi singkat bertanda centang (mis. "Perubahan tersimpan"). Pemanggil yang
// mengatur kapan tampil/hilang; tampil sebagai lencana melayang di atas layar.
export function Toast({ pesan }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-ikon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 12.5 10 17.5 19 7" />
        </svg>
      </span>
      {pesan}
    </div>
  );
}
