import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import api from '../services/electronService';
import { Breadcrumb, Icon } from '../components';

const SectionBtn = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} style={{
    display:'flex', alignItems:'center', gap:10, width:'100%',
    padding:'10px 12px', borderRadius:9, border:'none',
    background: active?'var(--accent-light)':'none',
    color: active?'var(--accent-dark)':'var(--text-secondary)',
    fontWeight: active?600:400, cursor:'pointer', fontSize:13.5, textAlign:'left',
    marginBottom:2, transition:'all 0.15s',
  }}>
    <span style={{ fontSize:16 }}>{icon}</span>{label}
  </button>
);

const ToggleRow = ({ label, checked, onChange }) => (
  <div className="toggle-row">
    <span className="toggle-label">{label}</span>
    <div className={`toggle ${checked?'on':''}`} onClick={()=>onChange(!checked)}>
      <div className="toggle-thumb" />
    </div>
  </div>
);

export default function SettingsPage({ t, lang }) {
  const { theme, toggleTheme, toggleLang, showToast } = useApp();
  const T = t.settings;
  const [section, setSection]  = useState('profile');
  const [notifs, setNotifs]    = useState({ overdue:true, renewal:true, payment:false, report:true });
  const [profileForm, setProf] = useState({ name:'Ahmad Al-Hassan', email:'ahmad@realestate.com', phone:'+962 79 123 4567' });

  const sections = [
    { key:'profile',       label:T.profile,       icon:'👤' },
    { key:'appearance',    label:T.theme,          icon:'🎨' },
    { key:'language',      label:T.language,       icon:'🌍' },
    { key:'notifications', label:T.notifications,  icon:'🔔' },
    { key:'backup',        label:T.backup,         icon:'💾' },
    { key:'about',         label:lang==='ar'?'حول البرنامج':'About', icon:'ℹ️' },
  ];

  const handleSaveProfile = async () => {
    showToast(t.messages.changesSaved,'success');
  };

  const handleExport = async () => {
    await api.db.export();
  };

  const handleImport = async () => {
    await api.db.import();
  };

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <h2 className="page-title" style={{ marginBottom:20 }}>{T.title}</h2>

      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:18 }}>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column' }}>
          {sections.map(s=>(
            <SectionBtn key={s.key} label={s.label} icon={s.icon} active={section===s.key} onClick={()=>setSection(s.key)} />
          ))}
        </div>

        {/* Content panel */}
        <div className="card">

          {section==='profile' && (
            <div>
              <h3 style={{ fontWeight:600, fontSize:16, marginBottom:20 }}>{T.profile}</h3>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-light)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:22, color:'var(--accent-dark)' }}>AH</div>
                <div>
                  <p style={{ fontWeight:600, fontSize:15, margin:0 }}>{profileForm.name}</p>
                  <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'2px 0 0' }}>{profileForm.email}</p>
                </div>
              </div>
              {[
                { label:lang==='ar'?'الاسم':'Full Name', key:'name', type:'text' },
                { label:lang==='ar'?'البريد الإلكتروني':'Email', key:'email', type:'email' },
                { label:lang==='ar'?'الهاتف':'Phone', key:'phone', type:'tel' },
              ].map(f=>(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input type={f.type} value={profileForm[f.key]}
                    onChange={e=>setProf(p=>({...p,[f.key]:e.target.value}))}
                    className="form-control" />
                </div>
              ))}
              <button className="btn btn-primary" onClick={handleSaveProfile} style={{ marginTop:8 }}>{T.save}</button>
            </div>
          )}

          {section==='appearance' && (
            <div>
              <h3 style={{ fontWeight:600, fontSize:16, marginBottom:20 }}>{T.theme}</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:20 }}>
                {lang==='ar'?'اختر مظهر التطبيق':'Choose the application appearance'}
              </p>
              <div style={{ display:'flex', gap:12 }}>
                {[
                  { key:'light', label:lang==='ar'?'فاتح':'Light', icon:'☀️' },
                  { key:'dark',  label:lang==='ar'?'داكن':'Dark',  icon:'🌙' },
                ].map(opt=>(
                  <div key={opt.key} onClick={opt.key!==theme?toggleTheme:undefined}
                    style={{ flex:1, padding:'20px', border:`2px solid ${theme===opt.key?'var(--accent)':'var(--border)'}`,
                      borderRadius:12, cursor:'pointer', textAlign:'center',
                      background:theme===opt.key?'var(--accent-light)':'var(--bg-secondary)',
                      transition:'all 0.15s' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>{opt.icon}</div>
                    <div style={{ fontWeight:600, fontSize:14, color:theme===opt.key?'var(--accent-dark)':'var(--text-primary)' }}>{opt.label}</div>
                    {theme===opt.key && <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>✓ {lang==='ar'?'محدد':'Selected'}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section==='language' && (
            <div>
              <h3 style={{ fontWeight:600, fontSize:16, marginBottom:20 }}>{T.language}</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:20 }}>
                {lang==='ar'?'اختر لغة التطبيق':'Choose application language'}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { code:'en', name:'English', native:'English', flag:'🇬🇧' },
                  { code:'ar', name:'Arabic',  native:'العربية', flag:'🇯🇴' },
                ].map(l=>(
                  <div key={l.code} onClick={lang!==l.code?toggleLang:undefined}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                      border:`2px solid ${lang===l.code?'var(--accent)':'var(--border)'}`,
                      borderRadius:12, cursor:'pointer',
                      background:lang===l.code?'var(--accent-light)':'none',
                      transition:'all 0.15s' }}>
                    <span style={{ fontSize:26 }}>{l.flag}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, fontSize:14 }}>{l.native}</p>
                      <p style={{ margin:0, fontSize:12, color:'var(--text-secondary)' }}>{l.name}</p>
                    </div>
                    {lang===l.code && <span style={{ color:'var(--accent)', fontWeight:700, fontSize:16 }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section==='notifications' && (
            <div>
              <h3 style={{ fontWeight:600, fontSize:16, marginBottom:20 }}>{T.notifications}</h3>
              <ToggleRow label={lang==='ar'?'تنبيه الدفعات المتأخرة':'Overdue payment alerts'}  checked={notifs.overdue}  onChange={v=>setNotifs(n=>({...n,overdue:v}))} />
              <ToggleRow label={lang==='ar'?'تجديد العقود القريبة':'Upcoming contract renewals'} checked={notifs.renewal} onChange={v=>setNotifs(n=>({...n,renewal:v}))} />
              <ToggleRow label={lang==='ar'?'إشعار بكل دفعة':'Alert on every payment'}          checked={notifs.payment} onChange={v=>setNotifs(n=>({...n,payment:v}))} />
              <ToggleRow label={lang==='ar'?'التقارير الشهرية':'Monthly reports'}               checked={notifs.report}  onChange={v=>setNotifs(n=>({...n,report:v}))} />
              <button className="btn btn-primary" style={{ marginTop:20 }} onClick={()=>showToast(t.messages.changesSaved,'success')}>{T.save}</button>
            </div>
          )}

          {section==='backup' && (
            <div>
              <h3 style={{ fontWeight:600, fontSize:16, marginBottom:8 }}>{T.backup}</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:14, marginBottom:24 }}>
                {lang==='ar'?'قم بتصدير قاعدة بياناتك أو استيرادها لاستعادة بياناتك':'Export or import your database to back up or restore your data.'}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="card" style={{ background:'var(--bg-secondary)', border:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontWeight:600, margin:'0 0 4px' }}>{T.exportDb}</p>
                      <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0 }}>
                        {lang==='ar'?'احفظ نسخة من قاعدة البيانات على جهازك':'Save a copy of your database to your computer'}
                      </p>
                    </div>
                    <button className="btn btn-secondary" onClick={handleExport}>
                      <Icon.Upload />{T.exportDb}
                    </button>
                  </div>
                </div>
                <div className="card" style={{ background:'var(--bg-secondary)', border:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontWeight:600, margin:'0 0 4px' }}>{T.importDb}</p>
                      <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0 }}>
                        {lang==='ar'?'استبدل قاعدة البيانات الحالية بنسخة محفوظة':'Replace current database with a saved backup'}
                      </p>
                    </div>
                    <button className="btn btn-danger" onClick={handleImport}>{T.importDb}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section==='about' && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🏛</div>
              <h3 style={{ fontWeight:700, fontSize:20, marginBottom:4 }}>محاسب عقاراتك</h3>
              <p style={{ color:'var(--text-secondary)', marginBottom:4 }}>Real Estate Accountant</p>
              <p style={{ fontSize:13, color:'var(--text-tertiary)', marginBottom:20 }}>v1.0.0</p>
              <div style={{ display:'inline-flex', flexDirection:'column', gap:8, textAlign:'left', background:'var(--bg-secondary)', borderRadius:10, padding:'14px 20px', fontSize:13 }}>
                {[
                  ['Electron', '28.x'],
                  ['React',    '18.x'],
                  ['SQLite',   'better-sqlite3 9.x'],
                  ['Platform', 'Windows / macOS / Linux'],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', gap:20 }}>
                    <span style={{ color:'var(--text-secondary)', minWidth:80 }}>{k}</span>
                    <span style={{ fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
