'use client'
import { useState } from 'react'

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

export default function Admin(){
  const [email, setEmail] = useState('')
  const [folder, setFolder] = useState('') // e.g. Austin/0015-13-200
  const [file, setFile] = useState<File|null>(null)

  // metadata fields
  const [title, setTitle] = useState('New Plan Set')
  const [district, setDistrict] = useState('Austin')
  const [csj, setCsj] = useState('0015-13-200')
  const [highway, setHighway] = useState('IH 35')
  const [letDate, setLetDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [version, setVersion] = useState('IFB v1')
  const [tags, setTags] = useState('Roadway, Structures')

  const [status, setStatus] = useState('')
  const can = email.toLowerCase().endsWith('@maciasspecialty.com') && !!file

  const upload = async ()=>{
    try{
      if(!file) return
      setStatus('Requesting upload URL…')
      const r = await fetch('/api/files/upload-url',{
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-user-email': email },
        body: JSON.stringify({ folder, filename: file.name })
      })
      if(!r.ok){ setStatus(`Denied (${r.status})`); return }
      const { url, key } = await r.json()

      setStatus('Uploading PDF to S3…')
      const put = await fetch(url, { method:'PUT', body: file, headers:{ 'Content-Type': file.type || 'application/pdf' }})
      if(!put.ok){ setStatus(`S3 PUT failed (${put.status})`); return }

      // compute size label
      const mb = Math.max(1, Math.round((file.size || 0) / (1024*1024)))
      const sizeLabel = `${mb} MB`

      // register metadata
      setStatus('Registering metadata…')
      const item: PlanIndexItem = {
        id: crypto.randomUUID(),
        title,
        district,
        csj,
        highway,
        letDate,
        version,
        size: sizeLabel,
        tags: tags.split(',').map(t=>t.trim()).filter(Boolean),
        s3Key: key,
        createdAt: new Date().toISOString(),
      }

      const reg = await fetch('/api/files/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': email },
        body: JSON.stringify(item)
      })
      if(!reg.ok){ setStatus(`Register failed (${reg.status})`); return }

      setStatus(`✅ Uploaded & registered: ${key}`)
    }catch(err:any){
      setStatus(`Error: ${err?.message || err}`)
    }
  }

  return (
    <>
      <div className="header">
        <div className="header-inner">
          <b>Admin — Upload Plan Set</b>
          <div className="spacer" />
          <a className="btn" href="/">Back to Plans</a>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div className="grid" style={{gap:10}}>
            <div>
              <div style={{fontSize:12, color:'#666', marginBottom:6}}>Your Macias email</div>
              <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@maciasspecialty.com" />
            </div>
            <div className="grid" style={{gap:10, gridTemplateColumns:'1fr 1fr'}}>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>Optional folder (e.g. Austin/0015-13-200)</div>
                <input className="input" value={folder} onChange={e=>setFolder(e.target.value)} placeholder="Austin/0015-13-200" />
              </div>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>PDF file</div>
                <input className="input" type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} />
              </div>
            </div>

            {/* Metadata */}
            <div className="grid" style={{gap:10, gridTemplateColumns:'1fr 1fr'}}>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>Title</div>
                <input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
              </div>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>District</div>
                <input className="input" value={district} onChange={e=>setDistrict(e.target.value)} />
              </div>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>CSJ</div>
                <input className="input" value={csj} onChange={e=>setCsj(e.target.value)} />
              </div>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>Highway</div>
                <input className="input" value={highway} onChange={e=>setHighway(e.target.value)} />
              </div>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>Let date</div>
                <input className="input" type="date" value={letDate} onChange={e=>setLetDate(e.target.value)} />
              </div>
              <div>
                <div style={{fontSize:12, color:'#666', marginBottom:6}}>Version</div>
                <input className="input" value={version} onChange={e=>setVersion(e.target.value)} />
              </div>
            </div>
            <div>
              <div style={{fontSize:12, color:'#666', marginBottom:6}}>Tags (comma separated)</div>
              <input className="input" value={tags} onChange={e=>setTags(e.target.value)} />
            </div>

            <div>
              <button className="btn primary" disabled={!can} onClick={upload}>Upload & Register</button>
            </div>
            <div style={{fontSize:12, color:'#666'}}>{status}</div>
            <div style={{fontSize:12, color:'#666'}}>Note: only <code>@maciasspecialty.com</code> can upload.</div>
          </div>
        </div>
      </div>
    </>
  )
}
