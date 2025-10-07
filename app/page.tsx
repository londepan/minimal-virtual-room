'use client'
import { useEffect, useMemo, useState } from 'react'

type PlanIndexItem = {
  id: string
  title: string
  district: string
  csj: string
  highway: string
  letDate: string
  version: string
  size: string
  tags: string[]
  s3Key: string
  createdAt: string
}

const LOGO = '/MaciasSCLogo.png' // ensure this exists in /public

function saveEmail(email: string){ localStorage.setItem('vr_email', email) }
function getEmail(){ return localStorage.getItem('vr_email') || '' }
function isAdmin(email: string){ return email.toLowerCase().endsWith('@maciasspecialty.com') }

export default function Page(){
  const [email, setEmail] = useState('')
  const [signed, setSigned] = useState(false)
  const [dark, setDark] = useState(false)

  // search/sort for live plans
  const [q, setQ] = useState('')
  const [district, setDistrict] = useState('All')
  const [sort, setSort] = useState<'Newest'|'Oldest'|'A–Z'>('Newest')

  // S3-backed tiles (via /api/files/list -> index.json)
  const [items, setItems] = useState<PlanIndexItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    const e = getEmail(); if(e){ setEmail(e); setSigned(true) }
    const d = localStorage.getItem('vr_dark') === '1'
    setDark(d); document.documentElement.classList.toggle('dark', d)
  },[])

  useEffect(()=>{
    // always fetch so the Plans section can show “please sign in” OR the live list
    setLoading(true)
    fetch('/api/files/list')
      .then(r=>r.json())
      .then(d=> setItems(Array.isArray(d.items) ? d.items : []))
      .finally(()=>setLoading(false))
  },[signed])

  const districts = useMemo(
    () => ['All', ...Array.from(new Set(items.map(i => i.district)))],
    [items]
  )

  const filtered = useMemo(()=>{
    const text = q.trim().toLowerCase()
    let list = items.filter(p =>
      [p.title, p.district, p.highway, p.csj, p.version, p.tags?.join(' ') ?? ''].join(' ')
      .toLowerCase().includes(text)
    )
    if (district !== 'All') list = list.filter(p=>p.district === district)
    list.sort((a,b)=>
      sort==='Newest' ? (+new Date(b.letDate) - +new Date(a.letDate)) :
      sort==='Oldest' ? (+new Date(a.letDate) - +new Date(b.letDate)) :
      a.title.localeCompare(b.title)
    )
    return list
  }, [q, district, sort, items])

  function signIn(e: React.FormEvent){ e.preventDefault(); saveEmail(email.trim()); setSigned(true) }
  function signOut(){ localStorage.removeItem('vr_email'); setEmail(''); setSigned(false) }
  function toggleDark(){ const v = !dark; setDark(v); localStorage.setItem('vr_dark', v ? '1':'0'); document.documentElement.classList.toggle('dark', v) }

  async function download(key: string){
    const r = await fetch('/api/files/download-url',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key })})
    const { url } = await r.json()
    location.href = url
  }

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-inner container">
          <img src={LOGO} alt="Macias" className="logo" />
          <div className="brand">Macias Specialty Contracting</div>
          <div className="spacer" />
          <a className="btn" href="#plans">Enter Plans Room</a>
          <button className="btn" onClick={toggleDark}>{dark ? 'Light mode' : 'Dark mode'}</button>
          {signed ? (
            <>
              <span style={{fontSize:13,color:'var(--ink-2)'}}>{email}</span>
              <a className="btn" href="/admin" style={{display:isAdmin(email)?'inline-flex':'none'}}>Admin</a>
              <button className="btn" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <form onSubmit={signIn} style={{display:'flex',gap:8}}>
              <input className="input" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} />
              <button className="btn primary" type="submit">Sign in</button>
            </form>
          )}
        </div>
      </div>

      {/* HERO (clean, no mock preview) */}
      <div className="hero">
        <div className="container hero-grid">
          <div>
            <h1 className="hero-title">TxDOT Plans Portal for Macias Specialty</h1>
            <p className="hero-sub">
              A modern, secure room where subcontractors can view and download project plan sets released by TxDOT.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="#plans">Enter Plans Room</a>
              <a className="btn" href="/admin" style={{display:isAdmin(email)?'inline-flex':'none'}}>Upload Plans</a>
            </div>
          </div>
          <div className="showroom">
            <div style={{fontSize:14, color:'var(--ink-2)'}}>
              Welcome to the Macias Plans Room. Use the button to jump to the live plan sets below.
              Admins can upload & register a plan set; subcontractors can search and download.
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES (unchanged visual style) */}
      <div className="section" id="features">
        <div className="container">
          <div className="section-title">Features</div>
          <div className="cards">
            <div className="card">
              <div className="card-title">TxDOT Plan Access</div>
              <div className="meta">
                <span className="pill">By district</span>
                <span className="pill">By CSJ</span>
                <span className="pill">By highway</span>
              </div>
              <p style={{marginTop:10,color:'var(--ink-2)'}}>Browse current releases and quickly find the sheets you need.</p>
            </div>
            <div className="card">
              <div className="card-title">Secure &amp; Audited</div>
              <div className="meta">
                <span className="pill">Per-user links</span>
                <span className="pill">Expiring URLs</span>
                <span className="pill">Download logs</span>
              </div>
              <p style={{marginTop:10,color:'var(--ink-2)'}}>Access is tied to work email and links expire automatically.</p>
            </div>
            <div className="card">
              <div className="card-title">Built for Subs</div>
              <div className="meta">
                <span className="pill">Fast</span>
                <span className="pill">Mobile-friendly</span>
                <span className="pill">Simple</span>
              </div>
              <p style={{marginTop:10,color:'var(--ink-2)'}}>Clean interface with powerful search and quick downloads.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SIGNED-IN TOOLBAR (always visible so #plans anchor works; prompts to sign in if needed) */}
      <div className="toolbar">
        <div className="container toolbar-inner" id="plans">
          <input
            className="input"
            placeholder={signed ? "Search titles, CSJ, districts, tags…" : "Please sign in to search and download"}
            value={q}
            onChange={e=>setQ(e.target.value)}
            disabled={!signed}
          />
          <select className="input" value={district} onChange={e=>setDistrict(e.target.value)} disabled={!signed}>
            {districts.map(d => <option key={d}>{d}</option>)}
          </select>
          <select className="input" value={sort} onChange={e=>setSort(e.target.value as any)} disabled={!signed}>
            <option>Newest</option><option>Oldest</option><option>A–Z</option>
          </select>
        </div>
      </div>

      {/* LIVE S3 TILES */}
      <div className="section">
        <div className="container">
          <div className="section-title">Available Plan Sets</div>

          {!signed && (
            <div className="card">Please sign in with your work email above to view and download plan sets.</div>
          )}

          {signed && loading && <div className="card">Loading…</div>}

          {signed && !loading && filtered.length === 0 && (
            <div className="card">No registered plan sets yet.</div>
          )}

          {signed && !loading && filtered.length > 0 && (
            <div className="cards">
              {filtered.map(it=>(
                <div key={it.id} className="tile">
                  <div className="tile-head">
                    <div className="tile-title">{it.title}</div>
                    <span className="badge">{it.size || ''}</span>
                  </div>
                  <div className="meta">
                    <span className="pill">{it.district} District</span>
                    <span className="pill">CSJ {it.csj}</span>
                    <span className="pill">{it.highway}</span>
                    <span className="pill">Let {new Date(it.letDate).toLocaleDateString()}</span>
                    <span className="pill">{it.version}</span>
                  </div>
                  <div className="meta" style={{marginTop:6}}>
                    {(it.tags||[]).map(t => <span key={t} className="badge">{t}</span>)}
                  </div>
                  <div style={{marginTop:10}}>
                    <button className="btn" onClick={()=>download(it.s3Key)}>Download</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div className="container" style={{display:'flex',gap:12,alignItems:'center'}}>
          <img src={LOGO} alt="Macias" className="logo" />
          <div style={{fontSize:13}}>© {new Date().getFullYear()} Macias Specialty Contracting LLC</div>
          <div className="spacer" />
          <a className="btn" href="#plans">Enter Plans Room</a>
        </div>
      </div>
    </>
  )
}
