'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabaseBrowser} from '../../lib/supabase';
import {useRouter} from 'next/navigation';

const courses=['Scriptwriting','Acting','Film Production','Film Directing','Film Editing','Film Distribution'];

export default function Dashboard(){
 const s=supabaseBrowser(),router=useRouter();
 const [p,setP]=useState<any>(),[classes,setClasses]=useState<any[]>([]),[assignments,setAssignments]=useState<any[]>([]),[subs,setSubs]=useState<any[]>([]),[attendance,setAttendance]=useState<any[]>([]);
 const [tab,setTab]=useState('overview'),[file,setFile]=useState<File|null>(null),[selected,setSelected]=useState<any>(),[notice,setNotice]=useState('');

 async function load(){
  const {data:u}=await s.auth.getUser(); if(!u.user)return router.push('/login');
  const {data:prof}=await s.from('profiles').select('*').eq('id',u.user.id).single();
  if(prof?.role==='admin')return router.push('/admin'); setP(prof);
  const [c,a,sub,att]=await Promise.all([
   s.from('classes').select('*,courses(name)').order('starts_at'),
   s.from('assignments').select('*,courses(name)').order('due_at'),
   s.from('submissions').select('*,assignments(title,max_score,week,courses(name))').eq('student_id',u.user.id).order('submitted_at',{ascending:false}),
   s.from('attendance').select('*,classes(title,starts_at,week,courses(name))').eq('student_id',u.user.id).order('created_at',{ascending:false})
  ]);
  setClasses(c.data||[]);setAssignments(a.data||[]);setSubs(sub.data||[]);setAttendance(att.data||[]);
 }
 useEffect(()=>{load()},[]);

 async function submitAssignment(e:any){
  e.preventDefault();if(!file||!selected)return;
  const {data:u}=await s.auth.getUser();if(!u.user)return;
  const path=u.user.id+'/'+selected.id+'/'+Date.now()+'-'+file.name;
  const up=await s.storage.from('assignment-submissions').upload(path,file,{upsert:false});
  if(up.error){setNotice(up.error.message);return}
  const {error}=await s.from('submissions').upsert({assignment_id:selected.id,student_id:u.user.id,file_path:path,file_name:file.name,status:'submitted'},{onConflict:'assignment_id,student_id'});
  setNotice(error?.message||'Assignment submitted successfully.');if(!error){setSelected(null);setFile(null);load()}
 }

 const graded=subs.filter(x=>x.status==='graded'&&x.score!=null);
 const average=graded.length?Math.round(graded.reduce((n,x)=>n+Number(x.score),0)/graded.length):0;
 const attendancePresent=attendance.filter(x=>['present','late'].includes(x.status)).length;
 const progress=Math.min(100,Math.round(((new Set(classes.filter(x=>new Date(x.starts_at)<new Date()).map(x=>x.week))).size/12)*100));
 const upcoming=classes.filter(x=>new Date(x.starts_at)>=new Date()).slice(0,4);
 const courseProgress=useMemo(()=>courses.map(name=>{
   const done=new Set(subs.filter(x=>x.assignments?.courses?.name===name).map(x=>x.assignments?.week)).size;
   return {name,percent:Math.min(100,Math.round(done/2*100))};
 }),[subs]);

 if(!p)return <main className="login"><div className="loginbox center">Loading your fellowship workspace…</div></main>;

 return <div>
  <header className="topbar">
   <div className="brand"><div className="mark">OAF</div>Oladunni Art Fellowship</div>
   <div className="actions"><span className="pill red">STUDENT PORTAL</span><button className="btn ghost" onClick={async()=>{await s.auth.signOut();router.push('/')}}>Sign out</button></div>
  </header>
  <aside className="side">
   <div style={{padding:'0 12px 26px'}}><b style={{fontSize:20}}>OAF</b><div className="label" style={{marginTop:5}}>12-WEEK FELLOWSHIP</div></div>
   {[[ 'overview','Overview'],['classes','Classes'],['assignments','Assignments'],['records','My record']].map(([k,v])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{v}</button>)}
   <div className="card" style={{position:'absolute',left:18,right:18,bottom:22,padding:14,background:'#f7f7f5'}}><b style={{fontSize:12}}>{p.full_name||'Fellow'}</b><div className="sub" style={{fontSize:11,marginTop:4}}>{p.cohort||'Current cohort'}</div></div>
  </aside>

  <main className="main">
   {tab==='overview'&&<><div className="hero">
     <p className="eyebrow" style={{color:'#fff'}}>OAF • 12-WEEK CREATIVE DEVELOPMENT</p>
     <h1 className="h1" style={{fontSize:36,marginTop:8}}>Welcome back, {p.full_name?.split(' ')[0]||'Fellow'}.</h1>
     <p style={{color:'#bbb',marginBottom:0}}>Your classes, assignments and fellowship record — all in one place.</p>
    </div>
    <div className="grid g4" style={{marginTop:18}}>
     {[['COHORT',p.cohort||'2026','OAF Fellowship'],['CLASSES',classes.length,'Live + completed'],['ASSIGNMENTS',assignments.length,subs.length+' submitted'],['PROGRESS',progress+'%','12-week programme']].map(x=><div className="card" key={String(x[0])}><div className="label">{x[0]}</div><div className="metric">{x[1]}</div><div className="sub" style={{fontSize:12}}>{x[2]}</div></div>)}
    </div>
    <div className="grid" style={{gridTemplateColumns:'1.8fr 1fr',marginTop:28}}>
     <div><p className="eyebrow">Continue learning</p><h2 style={{margin:'0 0 4px'}}>Pick up where you left off.</h2><p className="sub" style={{marginTop:0}}>Your next action is ready.</p>
      <div className="hero" style={{marginTop:14,padding:24}}><span className="pill" style={{background:'#222',color:'#bbb'}}>FILM DIRECTING</span><h2 style={{margin:'16px 0 8px',color:'#fff'}}>Directing Performance</h2><p style={{color:'#aaa',fontSize:13}}>Week 4 • Facilitator: OAF • 48 min</p><button className="btn primary" onClick={()=>setTab('classes')}>Open class</button></div>
     </div>
     <div className="card"><p className="eyebrow">Programme progress</p><div style={{display:'flex',justifyContent:'space-between',alignItems:'end'}}><h2 style={{margin:'4px 0'}}>{progress}%</h2><span className="sub">Week 1–12</span></div><div style={{height:9,background:'#e8e8e8',borderRadius:9,marginTop:18}}><div style={{height:9,width:progress+'%',background:'var(--red)',borderRadius:9}}/></div><p className="sub" style={{fontSize:12}}>Attendance: {attendancePresent} recorded present/late</p><p style={{fontSize:12,fontWeight:800}}>Next milestone: Week {Math.min(12,Math.max(1,Math.ceil((progress/100)*12)+1))}</p></div>
    </div>
    <section style={{marginTop:30}}><p className="eyebrow">Upcoming classes</p><h2 style={{margin:'0 0 5px'}}>Your next live sessions</h2><div className="card" style={{marginTop:14,padding:'4px 20px'}}><table className="table"><thead><tr><th>Class</th><th>Course</th><th>When</th><th></th></tr></thead><tbody>{upcoming.length?upcoming.map(x=><tr key={x.id}><td><b>{x.title}</b></td><td>{x.courses?.name||'—'}</td><td>{new Date(x.starts_at).toLocaleString()}</td><td>{x.meet_url?<a className="btn primary" href={x.meet_url} target="_blank">Join Meet</a>:<span className="pill">Scheduled</span>}</td></tr>):<tr><td colSpan={4}>No upcoming class has been scheduled yet.</td></tr>}</tbody></table></div></section>
   </>}
   {tab==='classes'&&<section><p className="eyebrow">OAF • LIVE LEARNING</p><h1 className="h1">My classes</h1><p className="sub">Join live sessions and keep your weekly schedule in one place.</p><div className="card" style={{marginTop:24}}><table className="table"><thead><tr><th>Class</th><th>Course</th><th>Week</th><th>Date</th><th>Room</th></tr></thead><tbody>{classes.map(x=><tr key={x.id}><td><b>{x.title}</b></td><td>{x.courses?.name}</td><td>{x.week}</td><td>{new Date(x.starts_at).toLocaleString()}</td><td>{x.meet_url?<a className="btn primary" href={x.meet_url} target="_blank">Join Meet</a>:<span className="pill">No link yet</span>}</td></tr>)}</tbody></table></div></section>}
   {tab==='assignments'&&<section><p className="eyebrow">OAF • SUBMISSIONS & FEEDBACK</p><h1 className="h1">Assignments</h1><p className="sub">Submit your work, track review status and read facilitator feedback.</p><div className="grid g4" style={{marginTop:24}}>{[['TOTAL',assignments.length],['SUBMITTED',subs.length],['REVIEWED',graded.length],['AVERAGE',average?average+'%':'—']].map(x=><div className="card" key={String(x[0])}><div className="label">{x[0]}</div><div className="metric">{x[1]}</div></div>)}</div>{notice&&<div className="card" style={{marginTop:16,borderColor:'var(--red)'}}>{notice}</div>}<div className="card" style={{marginTop:20}}><table className="table"><thead><tr><th>Assignment</th><th>Course</th><th>Week</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>{assignments.map(x=>{const sub=subs.find(z=>z.assignment_id===x.id);return <tr key={x.id}><td><b>{x.title}</b><div className="sub" style={{fontSize:11,maxWidth:330}}>{x.instructions}</div></td><td>{x.courses?.name}</td><td>{x.week}</td><td>{x.due_at?new Date(x.due_at).toLocaleDateString():'—'}</td><td><span className="pill">{sub?.status||'Not submitted'}</span></td><td><button className="btn dark" onClick={()=>setSelected(x)}>Submit</button></td></tr>})}</tbody></table>{selected&&<form className="card" style={{marginTop:18,background:'#f7f7f5'}} onSubmit={submitAssignment}><p className="eyebrow">Submission</p><h3 style={{marginTop:0}}>Submit: {selected.title}</h3><input type="file" required onChange={e=>setFile(e.target.files?.[0]||null)}/><div className="actions" style={{marginTop:12}}><button className="btn primary">Upload submission</button><button type="button" className="btn ghost" onClick={()=>setSelected(null)}>Cancel</button></div></form>}</div></section>}
   {tab==='records'&&<section><p className="eyebrow">OAF • PERSONAL LEARNING RECORD</p><h1 className="h1">My record</h1><p className="sub">Attendance, assignments, scores and course progress from your fellowship journey.</p><div className="hero" style={{marginTop:24}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2 style={{margin:0}}>{p.full_name}</h2><p style={{color:'#aaa',marginBottom:0}}>{p.cohort||'OAF Cohort'} • 2026</p></div><div style={{textAlign:'right'}}><div style={{fontSize:30,fontWeight:800}}> {progress}%</div><span style={{color:'#aaa',fontSize:11}}>programme progress</span></div></div></div><div className="card" style={{marginTop:20}}><p className="eyebrow">Course progress</p>{courseProgress.map(x=><div key={x.name} style={{margin:'16px 0'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:800}}><span>{x.name}</span><span className="sub">{x.percent}%</span></div><div style={{height:7,background:'#e8e8e8',borderRadius:7,marginTop:7}}><div style={{height:7,width:x.percent+'%',background:'var(--red)',borderRadius:7}}/></div></div>)}</div><div className="grid g3" style={{marginTop:20}}><div className="card"><div className="label">Attendance</div><div className="metric">{attendancePresent}</div><div className="sub">Present / late records</div></div><div className="card"><div className="label">Graded work</div><div className="metric">{graded.length}</div><div className="sub">Average {average?average+'%':'pending'}</div></div><div className="card"><div className="label">Submissions</div><div className="metric">{subs.length}</div><div className="sub">Across your assignments</div></div></div><div className="card" style={{marginTop:20}}><p className="eyebrow">Assignment record</p><table className="table"><thead><tr><th>Assignment</th><th>Week</th><th>Status</th><th>Score</th><th>Feedback</th></tr></thead><tbody>{subs.map(x=><tr key={x.id}><td>{x.assignments?.title}</td><td>{x.assignments?.week||'—'}</td><td><span className="pill">{x.status}</span></td><td>{x.score??'Pending'}</td><td>{x.feedback||'No feedback yet.'}</td></tr>)}</tbody></table></div></section>}
  </main>
 </div>
}