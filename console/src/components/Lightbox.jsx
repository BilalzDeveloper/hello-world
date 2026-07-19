import React, { useEffect } from 'react';
import { useStore } from '../store.jsx';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons.jsx';

export default function Lightbox() {
  const { state, actions } = useStore();
  const { lightbox, listings, autoReady } = state;
  const listing = lightbox ? listings.find((l) => l.id === lightbox.id) || autoReady.find((l) => l.id === lightbox.id) : null;
  const urls = listing?.imageUrls || [];

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e) {
      if (e.key === 'Escape') actions.closeLightbox();
      if (e.key === 'ArrowLeft') actions.lightboxNav(-1);
      if (e.key === 'ArrowRight') actions.lightboxNav(1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  if (!lightbox || !listing || !urls.length) return null;
  const index = ((lightbox.index % urls.length) + urls.length) % urls.length;

  return (
    <div
      onClick={actions.closeLightbox}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,10,10,.88)', zIndex: 100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', animation: 'soFade .15s ease-out',
      }}
    >
      <button
        onClick={actions.closeLightbox}
        className="so-close-btn"
        style={{
          position: 'absolute', top: 20, right: 20, width: 38, height: 38, borderRadius: 10, border: 'none',
          background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <XIcon size={18} stroke="#fff" width={2.2} />
      </button>

      <div style={{ position: 'absolute', top: 22, left: 24, color: '#fff', fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
        {listing.title} · {index + 1} / {urls.length}
      </div>

      {urls.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); actions.lightboxNav(-1); }}
          style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%',
            border: 'none', background: 'rgba(255,255,255,.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeftIcon />
        </button>
      )}

      <img
        src={urls[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '82vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 6, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}
      />

      {urls.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); actions.lightboxNav(1); }}
          style={{
            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%',
            border: 'none', background: 'rgba(255,255,255,.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
}
