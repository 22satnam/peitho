import React from 'react'

const links = [
  { label: 'LinkedIn', href: 'https://linkedin.com/in/22satnam' },
  { label: 'X', href: 'https://x.com/22satnamdev' },
  { label: 'Portfolio', href: 'https://satnamsingh.in' },
]

export default function CreatorSignature() {
  return (
    <footer className="creator-signature">
      <style>{`
        .creator-signature{font-family:'Instrument Sans',-apple-system,'Segoe UI',sans-serif;background:#F6F4EF;color:#98937F;border-top:1px solid #E1DDD0;padding:20px 24px 24px;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;font-size:12.5px;line-height:1.4}
        .creator-signature .made{color:#6E6A5C}
        .creator-signature .sep{color:#C9C3B2;user-select:none}
        .creator-signature a{color:#6E6A5C;text-decoration:none;text-underline-offset:3px;transition:color .15s ease}
        .creator-signature a:hover,.creator-signature a:focus-visible{color:#1A56A8;text-decoration:underline;outline:none}
        @media(max-width:520px){.creator-signature{padding:18px 16px 82px;gap:8px;font-size:12px}.creator-signature .made{flex-basis:100%;text-align:center;margin-bottom:2px}.creator-signature .made+.sep{display:none}}
      `}</style>
      <span className="made">Made with ❤️ by Satnam</span>
      <span className="sep">·</span>
      {links.map((link, index) => (
        <React.Fragment key={link.href}>
          <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} — Satnam Singh`}>{link.label}</a>
          {index < links.length - 1 && <span className="sep">·</span>}
        </React.Fragment>
      ))}
    </footer>
  )
}
