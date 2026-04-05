'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as db from '../lib/db';
import { createClient } from '../lib/supabase';

// ─── Measurement helpers (same as prototype) ───
const CONVERSIONS = {
  tsp:{name:"teaspoon",plural:"teaspoons"},tbsp:{name:"tablespoon",plural:"tablespoons"},
  cup:{name:"cup",plural:"cups"},oz:{name:"oz",plural:"oz"},lb:{name:"lb",plural:"lbs"},
  g:{name:"g",plural:"g"},kg:{name:"kg",plural:"kg"},ml:{name:"ml",plural:"ml"},
  l:{name:"liter",plural:"liters"},pinch:{name:"pinch",plural:"pinches"},
  clove:{name:"clove",plural:"cloves"},piece:{name:"piece",plural:"pieces"},
  slice:{name:"slice",plural:"slices"},whole:{name:"",plural:""},
};

function smartScale(amount,unit,scale){
  const scaled=amount*scale,u=unit?.toLowerCase()||"";
  if(!CONVERSIONS[u])return{amount:cleanNum(scaled),unit};
  if(u==="tsp"&&scaled>=3){const t=scaled/3;if(t>=16)return{amount:cleanNum(t/16),unit:"cup"};return{amount:cleanNum(t),unit:"tbsp"};}
  if(u==="tbsp"&&scaled>=16)return{amount:cleanNum(scaled/16),unit:"cup"};
  if(u==="cup"&&scaled<0.25)return{amount:cleanNum(scaled*16),unit:"tbsp"};
  if(u==="oz"&&scaled>=16)return{amount:cleanNum(scaled/16),unit:"lb"};
  if(u==="g"&&scaled>=1000)return{amount:cleanNum(scaled/1000),unit:"kg"};
  if(u==="ml"&&scaled>=1000)return{amount:cleanNum(scaled/1000),unit:"l"};
  return{amount:cleanNum(scaled),unit};
}
function cleanNum(n){
  if(n===Math.floor(n))return n;
  const fracs=[[.125,"⅛"],[.25,"¼"],[.333,"⅓"],[.5,"½"],[.667,"⅔"],[.75,"¾"]];
  const whole=Math.floor(n),dec=n-whole;
  for(const[val,sym]of fracs)if(Math.abs(dec-val)<.05)return whole>0?`${whole} ${sym}`:sym;
  return Math.round(n*100)/100;
}
function formatAmount(a,u){
  const unit=u?.toLowerCase()||"",conv=CONVERSIONS[unit];
  if(!conv)return`${a} ${u||""}`.trim();
  const plural=typeof a==="number"?a!==1:!a.toString().match(/^1$|^1 /);
  return`${a} ${plural?conv.plural:conv.name}`.trim();
}

const CATEGORIES=["All","Breakfast","Lunch","Dinner","Baking","Dessert","Snack"];
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEALS_LIST=["Breakfast","Lunch","Dinner"];

function getWeekStart(){const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().split('T')[0];}

// ─── Image Upload Component ───
function ImageUpload({value,onChange,height=200,label="Upload a photo",round=false}){
  const inputRef=useRef(null);
  const[dragging,setDragging]=useState(false);
  const handleFile=async(file)=>{if(!file||!file.type.startsWith("image/"))return;onChange(file);};
  if(round)return(<div style={{display:"inline-block"}}><div onClick={()=>inputRef.current?.click()} style={{width:80,height:80,borderRadius:"50%",overflow:"hidden",background:value?"none":"linear-gradient(135deg,var(--pink-200),var(--sage-200))",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"3px dashed var(--sage-300)"}}>{value?<img src={typeof value==="string"?value:URL.createObjectURL(value)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:24}}>📷</span>}</div><input ref={inputRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} style={{display:"none"}}/><div style={{fontSize:11,color:"var(--gray-400)",textAlign:"center",marginTop:4}}>{label}</div></div>);
  return(<div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer?.files?.[0])handleFile(e.dataTransfer.files[0]);}} onClick={()=>inputRef.current?.click()} style={{height,borderRadius:"var(--radius)",overflow:"hidden",border:dragging?"3px dashed var(--sage-400)":value?"none":"3px dashed var(--gray-300)",background:value?"none":"linear-gradient(135deg,var(--pink-50),var(--sage-50),var(--blue-50))",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s",position:"relative"}}>{value?(<><img src={typeof value==="string"?value:URL.createObjectURL(value)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.6)",color:"white",padding:"4px 10px",borderRadius:99,fontSize:12,fontWeight:700}}>Change photo</div></>):(<><span style={{fontSize:36,marginBottom:8}}>📸</span><span style={{fontWeight:700,fontSize:14,color:"var(--gray-500)"}}>{label}</span><span style={{fontSize:12,color:"var(--gray-400)",marginTop:2}}>Drag & drop or click to browse</span></>)}<input ref={inputRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])} style={{display:"none"}}/></div>);
}

function Lightbox({src,onClose}){
  if(!src)return null;
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",backdropFilter:"blur(8px)"}}><img src={src} alt="" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:12,boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}/><button onClick={onClose} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.2)",border:"none",color:"white",width:40,height:40,borderRadius:"50%",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>);
}

// ─── CSS (same proven styles from prototype) ───
const CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600;700;800&display=swap');
:root{--pink-50:#fdf2f4;--pink-100:#fce7eb;--pink-200:#f9ced8;--pink-300:#f4a5b8;--pink-400:#ed7a97;--pink-500:#e04d73;--sage-50:#f4f7f4;--sage-100:#e5ede5;--sage-200:#c8dbc8;--sage-300:#a3c2a3;--sage-400:#7ba67b;--sage-500:#5a8a5a;--sage-600:#476e47;--blue-50:#eff6ff;--blue-100:#dbeafe;--blue-200:#bfdbfe;--blue-300:#93c5fd;--blue-400:#60a5fa;--blue-500:#3b82f6;--white:#fff;--gray-50:#fafafa;--gray-100:#f5f5f5;--gray-200:#e5e5e5;--gray-300:#d4d4d4;--gray-400:#a3a3a3;--gray-500:#737373;--gray-600:#525252;--gray-700:#404040;--gray-800:#262626;--font-display:'DM Serif Display',serif;--font-body:'Nunito',sans-serif;--radius:16px;--radius-sm:10px;--shadow-sm:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);--shadow:0 4px 12px rgba(0,0,0,.07),0 2px 4px rgba(0,0,0,.04);--shadow-lg:0 12px 32px rgba(0,0,0,.1),0 4px 8px rgba(0,0,0,.05)}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:var(--font-body);background:linear-gradient(135deg,var(--pink-50),var(--sage-50) 50%,var(--blue-50));min-height:100vh;color:var(--gray-700)}.app{min-height:100vh;display:flex;flex-direction:column}
.nav{background:rgba(255,255,255,.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--pink-100);padding:0 24px;position:sticky;top:0;z-index:100}.nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px}.nav-logo{font-family:var(--font-display);font-size:26px;color:var(--sage-600);display:flex;align-items:center;gap:8px;cursor:pointer}.nav-logo span{color:var(--pink-400)}.nav-links{display:flex;gap:4px}.nav-link{padding:8px 16px;border-radius:99px;font-weight:600;font-size:14px;cursor:pointer;border:none;background:none;color:var(--gray-500);transition:all .2s;font-family:var(--font-body)}.nav-link:hover{color:var(--sage-600);background:var(--sage-50)}.nav-link.active{color:var(--sage-600);background:var(--sage-100)}.nav-user{display:flex;align-items:center;gap:12px}.nav-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--pink-200),var(--sage-200));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:var(--sage-600);cursor:pointer;border:2px solid var(--white);box-shadow:var(--shadow-sm);overflow:hidden}.nav-avatar img{width:100%;height:100%;object-fit:cover}
.btn{padding:10px 20px;border-radius:99px;border:none;font-family:var(--font-body);font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:linear-gradient(135deg,var(--sage-400),var(--sage-500));color:#fff;box-shadow:0 2px 8px rgba(90,138,90,.3)}.btn-primary:hover{transform:translateY(-1px)}.btn-secondary{background:var(--white);color:var(--sage-600);border:2px solid var(--sage-200)}.btn-secondary:hover{border-color:var(--sage-400);background:var(--sage-50)}.btn-pink{background:linear-gradient(135deg,var(--pink-300),var(--pink-400));color:#fff;box-shadow:0 2px 8px rgba(224,77,115,.3)}.btn-pink:hover{transform:translateY(-1px)}.btn-sm{padding:6px 14px;font-size:13px}.btn:disabled{opacity:0.6;cursor:not-allowed;transform:none!important}
.main{flex:1;max-width:1200px;margin:0 auto;padding:32px 24px;width:100%}.card{background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;transition:all .25s}.card:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.recipe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}.recipe-card{cursor:pointer;position:relative}.recipe-card-img{height:200px;display:flex;align-items:center;justify-content:center;font-size:72px;position:relative;background:linear-gradient(135deg,var(--pink-100),var(--sage-100),var(--blue-100));overflow:hidden}.recipe-card-img img{width:100%;height:100%;object-fit:cover}.recipe-card-badge{position:absolute;top:12px;left:12px;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;background:rgba(255,255,255,.9);color:var(--sage-600);backdrop-filter:blur(8px);z-index:2}.recipe-card-save{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:all .2s;z-index:2}.recipe-card-save:hover{transform:scale(1.1)}.recipe-card-body{padding:16px}.recipe-card-title{font-family:var(--font-display);font-size:18px;color:var(--gray-800);margin-bottom:4px}.recipe-card-meta{display:flex;gap:12px;font-size:13px;color:var(--gray-400);margin-top:8px}.recipe-card-author{font-size:13px;color:var(--sage-500);font-weight:600}
.recipe-detail{max-width:800px;margin:0 auto}.recipe-hero{height:300px;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:96px;margin-bottom:32px;background:linear-gradient(135deg,var(--pink-100),var(--sage-100),var(--blue-100));overflow:hidden}.recipe-hero img{width:100%;height:100%;object-fit:cover}.recipe-title{font-family:var(--font-display);font-size:36px;color:var(--gray-800);margin-bottom:8px}.recipe-desc{color:var(--gray-500);margin-bottom:20px;line-height:1.6}.recipe-info{display:flex;gap:24px;margin-bottom:28px;flex-wrap:wrap}.recipe-info-item{display:flex;flex-direction:column;gap:2px}.recipe-info-label{font-size:12px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.5px}.recipe-info-value{font-size:15px;font-weight:700;color:var(--gray-700)}
.scale-bar{background:var(--sage-50);border:2px solid var(--sage-200);border-radius:var(--radius);padding:16px 20px;display:flex;align-items:center;gap:12px;margin-bottom:28px;flex-wrap:wrap}.scale-bar label{font-weight:700;font-size:14px;color:var(--sage-600);white-space:nowrap}.scale-btn{padding:6px 14px;border-radius:99px;border:2px solid var(--sage-200);background:var(--white);font-weight:700;font-size:13px;cursor:pointer;transition:all .15s;font-family:var(--font-body);color:var(--sage-600)}.scale-btn.active{background:var(--sage-400);color:#fff;border-color:var(--sage-400)}.scale-btn:hover{border-color:var(--sage-400)}.scale-input{width:60px;padding:6px 10px;border-radius:var(--radius-sm);border:2px solid var(--sage-200);font-family:var(--font-body);font-weight:700;font-size:14px;text-align:center;color:var(--sage-600)}.scale-input:focus{outline:none;border-color:var(--sage-400)}
.section-title{font-family:var(--font-display);font-size:22px;color:var(--gray-800);margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--pink-100)}.ingredient-list{list-style:none;margin-bottom:32px}.ingredient-item{padding:10px 0;border-bottom:1px solid var(--gray-100);display:flex;gap:8px;font-size:15px}.ingredient-amount{font-weight:700;color:var(--sage-600);min-width:90px}.ingredient-name{color:var(--gray-600)}.step-list{list-style:none;margin-bottom:32px;counter-reset:step}.step-item{padding:14px 0 14px 48px;border-bottom:1px solid var(--gray-100);position:relative;font-size:15px;line-height:1.6;color:var(--gray-600)}.step-item::before{counter-increment:step;content:counter(step);position:absolute;left:0;top:14px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--pink-200),var(--pink-300));color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center}
.auth-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}.auth-modal{background:var(--white);border-radius:var(--radius);padding:40px;width:420px;max-width:90vw;box-shadow:var(--shadow-lg)}.auth-title{font-family:var(--font-display);font-size:28px;color:var(--gray-800);margin-bottom:4px}.auth-subtitle{color:var(--gray-400);margin-bottom:24px;font-size:14px}.form-group{margin-bottom:16px}.form-label{display:block;font-weight:700;font-size:13px;color:var(--gray-600);margin-bottom:6px}.form-input{width:100%;padding:10px 14px;border:2px solid var(--gray-200);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:14px;transition:border-color .2s}.form-input:focus{outline:none;border-color:var(--sage-400)}.form-textarea{resize:vertical;min-height:80px}
.profile-header{background:linear-gradient(135deg,var(--pink-100),var(--sage-100),var(--blue-100));border-radius:var(--radius);padding:32px;display:flex;align-items:center;gap:24px;margin-bottom:32px}.profile-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--pink-300),var(--sage-300));display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:#fff;border:4px solid var(--white);box-shadow:var(--shadow);overflow:hidden;flex-shrink:0}.profile-avatar img{width:100%;height:100%;object-fit:cover}.profile-name{font-family:var(--font-display);font-size:28px;color:var(--gray-800)}.profile-bio{color:var(--gray-500);font-size:14px;margin-top:4px}.profile-stats{display:flex;gap:24px;margin-top:8px}.profile-stat{font-size:13px;color:var(--sage-600);font-weight:700}
.planner-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}.planner-day{background:var(--white);border-radius:var(--radius-sm);padding:14px;box-shadow:var(--shadow-sm);border:2px solid transparent;transition:all .2s}.planner-day:hover{border-color:var(--sage-200)}.planner-day-name{font-weight:800;font-size:13px;color:var(--sage-600);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}.planner-meal{margin-bottom:8px}.planner-meal-label{font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}.planner-meal-slot{min-height:36px;border:2px dashed var(--gray-200);border-radius:8px;padding:6px 8px;font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;color:var(--gray-400)}.planner-meal-slot:hover{border-color:var(--sage-300);background:var(--sage-50)}.planner-meal-slot.filled{border-style:solid;border-color:var(--sage-200);background:var(--sage-50);color:var(--gray-700);font-weight:600}.planner-meal-slot .rm{margin-left:auto;cursor:pointer;color:var(--gray-400);font-size:14px;border:none;background:none;padding:0 2px}.planner-meal-slot .rm:hover{color:var(--pink-400)}
.search-bar{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;align-items:center}.search-input{flex:1;min-width:200px;padding:12px 20px;border:2px solid var(--gray-200);border-radius:99px;font-family:var(--font-body);font-size:14px;background:var(--white)}.search-input:focus{outline:none;border-color:var(--sage-400)}.filter-chips{display:flex;gap:6px;flex-wrap:wrap}.filter-chip{padding:6px 14px;border-radius:99px;border:2px solid var(--gray-200);background:var(--white);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font-body);color:var(--gray-500)}.filter-chip.active{background:var(--pink-100);border-color:var(--pink-300);color:var(--pink-500)}.filter-chip:hover{border-color:var(--pink-300)}
.page-title{font-family:var(--font-display);font-size:32px;color:var(--gray-800);margin-bottom:8px}.page-subtitle{color:var(--gray-400);margin-bottom:28px}.empty-state{text-align:center;padding:60px 20px;color:var(--gray-400)}.empty-state-icon{font-size:48px;margin-bottom:12px}.empty-state-text{font-size:16px;font-weight:600}.empty-state-sub{font-size:13px;margin-top:4px}.back-btn{background:none;border:none;cursor:pointer;font-family:var(--font-body);font-weight:700;font-size:14px;color:var(--sage-500);margin-bottom:20px;display:inline-flex;align-items:center;gap:4px}.back-btn:hover{color:var(--sage-600)}.tag{padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;background:var(--blue-100);color:var(--blue-500)}.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.toggle-track{width:40px;height:22px;border-radius:11px;background:var(--gray-300);cursor:pointer;position:relative;transition:background .2s}.toggle-track.on{background:var(--sage-400)}.toggle-knob{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:var(--shadow-sm)}.toggle-track.on .toggle-knob{transform:translateX(18px)}
.cooked-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:16px}.cooked-photo{border-radius:var(--radius-sm);overflow:hidden;aspect-ratio:1;cursor:pointer;position:relative;box-shadow:var(--shadow-sm);transition:all .2s}.cooked-photo:hover{transform:scale(1.03);box-shadow:var(--shadow)}.cooked-photo img{width:100%;height:100%;object-fit:cover}.cooked-photo-info{position:absolute;bottom:0;left:0;right:0;padding:6px 8px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;font-size:11px;font-weight:600}
.pick-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}.pick-modal{background:#fff;border-radius:var(--radius);padding:28px;width:400px;max-width:90vw;max-height:70vh;overflow-y:auto;box-shadow:var(--shadow-lg)}.pick-opt{padding:10px 12px;border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s;margin-bottom:4px}.pick-opt:hover{background:var(--sage-50)}.pick-emoji{font-size:24px;width:36px;height:36px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--pink-50);flex-shrink:0}.pick-emoji img{width:100%;height:100%;object-fit:cover}.pick-title{font-weight:600;font-size:14px}
.hero-section{text-align:center;padding:40px 20px 20px}.hero-title{font-family:var(--font-display);font-size:42px;color:var(--gray-800);margin-bottom:8px}.hero-title span{color:var(--sage-500)}.hero-sub{color:var(--gray-400);font-size:16px;max-width:500px;margin:0 auto 28px}.tab-row{display:flex;gap:8px;margin-bottom:24px}
.footer{background:var(--white);border-top:1px solid var(--pink-100);padding:48px 24px 32px;margin-top:48px}.footer-inner{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;gap:40px;justify-content:space-between;align-items:flex-start}.footer-brand{max-width:300px}.footer-brand-name{font-family:var(--font-display);font-size:22px;color:var(--sage-600);margin-bottom:8px}.footer-brand-name span{color:var(--pink-400)}.footer-brand-desc{font-size:13px;color:var(--gray-400);line-height:1.6}.footer-col h4{font-family:var(--font-display);font-size:16px;color:var(--gray-800);margin-bottom:12px}.footer-link{display:block;font-size:13px;color:var(--gray-500);text-decoration:none;cursor:pointer;margin-bottom:8px;font-weight:600;transition:color .2s;background:none;border:none;padding:0;font-family:var(--font-body)}.footer-link:hover{color:var(--sage-500)}.footer-nl{max-width:320px}.footer-nl-row{display:flex;gap:8px;margin-top:8px}.footer-nl-input{flex:1;padding:10px 14px;border:2px solid var(--sage-200);border-radius:99px;font-family:var(--font-body);font-size:13px}.footer-nl-input:focus{outline:none;border-color:var(--sage-400)}.footer-bottom{max-width:1200px;margin:24px auto 0;padding-top:20px;border-top:1px solid var(--gray-100);text-align:center;font-size:12px;color:var(--gray-400)}
.checkbox-row{display:flex;align-items:flex-start;gap:10px;margin-top:4px;margin-bottom:16px;cursor:pointer}.checkbox-box{width:20px;height:20px;border-radius:6px;border:2px solid var(--sage-300);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;margin-top:1px}.checkbox-box.checked{background:var(--sage-400);border-color:var(--sage-400)}.checkbox-label{font-size:13px;color:var(--gray-600);line-height:1.4}
.recipe-actions{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}.nl-success{background:var(--sage-50);border:2px solid var(--sage-200);border-radius:var(--radius);padding:20px;text-align:center;margin-top:8px}.nl-success-icon{font-size:32px;margin-bottom:8px}.nl-success-text{font-weight:700;font-size:15px;color:var(--sage-600)}
.loading{text-align:center;padding:60px;color:var(--gray-400)}.loading-spinner{display:inline-block;width:32px;height:32px;border:3px solid var(--sage-200);border-top-color:var(--sage-400);border-radius:50%;animation:spin .8s linear infinite;margin-bottom:12px}@keyframes spin{to{transform:rotate(360deg)}}
.error-msg{background:var(--pink-50);border:2px solid var(--pink-200);border-radius:var(--radius-sm);padding:10px 14px;color:var(--pink-500);font-size:13px;font-weight:600;margin-bottom:16px}
@media print{.nav,.footer,.scale-bar,.recipe-actions,.cooked-gallery,.back-btn,.recipe-card-save,.btn{display:none!important}.recipe-hero{height:200px;break-inside:avoid}.main{padding:0}.recipe-detail{max-width:100%}}
@media(max-width:640px){.nav-links{display:none}.recipe-grid{grid-template-columns:1fr}.profile-header{flex-direction:column;text-align:center}.planner-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.hero-title{font-size:30px}.recipe-title{font-size:26px}.scale-bar{flex-direction:column;align-items:flex-start}.cooked-grid{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}.footer-inner{flex-direction:column;gap:24px}}`;

// ─── MAIN APP ───
export default function Stewdium() {
  const supabase = createClient();
  // State
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [cookedPhotos, setCookedPhotos] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [scaleMode, setScaleMode] = useState("servings");
  const [scaleValue, setScaleValue] = useState(null);
  const [mealPlan, setMealPlan] = useState({});
  const [picker, setPicker] = useState(null);
  const [boardTab, setBoardTab] = useState("saved");
  const [newRecipe, setNewRecipe] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nlEmail, setNlEmail] = useState("");
  const [footerNlSuccess, setFooterNlSuccess] = useState(false);
  const [authForm, setAuthForm] = useState({ name:"",email:"",password:"",bio:"",newsletter:true });
  const csvImportRef = useRef(null);

  // ─── Auth listener ───
  useEffect(() => {
    const { data: { subscription } } = db.onAuthChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: p } = await db.getProfile(session.user.id);
        setProfile(p);
        const { data: ids } = await db.getSavedRecipeIds(session.user.id);
        setSavedIds(ids);
      } else {
        setUser(null); setProfile(null); setSavedIds([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Load recipes ───
  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const { data } = await db.getRecipes({ category: catFilter, search });
    setRecipes(data);
    setLoading(false);
  }, [catFilter, search]);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  // ─── Load cooked photos when viewing recipe ───
  useEffect(() => {
    if (viewing) {
      db.getCookedPhotos(viewing.id).then(({ data }) => setCookedPhotos(data));
    }
  }, [viewing]);

  // ─── Load meal plan ───
  useEffect(() => {
    if (user && page === "planner") {
      db.getMealPlan(user.id, getWeekStart()).then(({ data }) => {
        const plan = {};
        DAYS.forEach(d => { plan[d] = {}; MEALS_LIST.forEach(m => { plan[d][m] = null; }); });
        data.forEach(item => {
          if (plan[item.day_of_week]) plan[item.day_of_week][item.meal_type] = item.recipes;
        });
        setMealPlan(plan);
      });
    }
  }, [user, page]);

  // ─── Auth handlers ───
  const handleSignup = async () => {
    setAuthError("");
    const { error } = await db.signUp(authForm.email, authForm.password, {
      name: authForm.name || "New Cook",
      bio: authForm.bio || "I love cooking!",
      newsletter: authForm.newsletter,
    });
    if (error) { setAuthError(error.message); return; }
    setAuthModal(null);
    setAuthForm({ name:"",email:"",password:"",bio:"",newsletter:true });
  };

  const handleLogin = async () => {
    setAuthError("");
    const { error } = await db.signIn(authForm.email, authForm.password);
    if (error) { setAuthError(error.message); return; }
    setAuthModal(null);
    setAuthForm({ name:"",email:"",password:"",bio:"",newsletter:true });
  };

  const handleSignOut = async () => {
    await db.signOut();
    setPage("home");
  };

  // ─── Recipe CRUD ───
  const toggleSave = async (id) => {
    if (!user) { setAuthModal("login"); return; }
    if (savedIds.includes(id)) {
      await db.unsaveRecipe(user.id, id);
      setSavedIds(p => p.filter(x => x !== id));
    } else {
      await db.saveRecipe(user.id, id);
      setSavedIds(p => [...p, id]);
    }
  };

  const openRecipe = (r) => { setViewing(r); setScaleValue(null); setScaleMode("servings"); setPage("recipe"); };

  const handleAddRecipe = () => {
    if (!user) { setAuthModal("login"); return; }
    setNewRecipe({ title:"",description:"",category:"Dinner",prepTime:"",cookTime:"",servings:4,ingredients:[{amount:"",unit:"",name:""}],steps:[""],isPublic:true,imageFile:null,emoji:"🍽️" });
    setPage("addRecipe");
  };

  const saveNewRecipe = async () => {
    if (!newRecipe?.title || !user || saving) return;
    setSaving(true);
    let image_url = "";
    if (newRecipe.imageFile) {
      const ext = newRecipe.imageFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { url } = await db.uploadImage('recipe-images', path, newRecipe.imageFile);
      if (url) image_url = url;
    }
    const { error } = await db.createRecipe({
      user_id: user.id, title: newRecipe.title, description: newRecipe.description,
      category: newRecipe.category, prep_time: newRecipe.prepTime, cook_time: newRecipe.cookTime,
      servings: parseInt(newRecipe.servings) || 4, is_public: newRecipe.isPublic,
      image_url, emoji: newRecipe.emoji,
      ingredients: newRecipe.ingredients.filter(i => i.name).map(i => ({ ...i, amount: parseFloat(i.amount) || 1 })),
      steps: newRecipe.steps.filter(s => s.trim()),
    });
    setSaving(false);
    if (!error) { setNewRecipe(null); setPage("board"); loadRecipes(); }
  };

  const uploadCookedPhoto = async (file) => {
    if (!user || !viewing) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${viewing.id}_${Date.now()}.${ext}`;
    const { url } = await db.uploadImage('cooked-photos', path, file);
    if (url) {
      const { data } = await db.addCookedPhoto(user.id, viewing.id, url);
      if (data) setCookedPhotos(p => [data, ...p]);
    }
  };

  const cookedPhotoRef = useRef(null);

  // ─── Print & Download ───
  const printRecipe = () => window.print();
  const downloadRecipe = (r, scale) => {
    const es = scaleValue && scaleMode === "servings" ? scaleValue : Math.round(r.servings * scale);
    const lines = [`${r.title}\n${"=".repeat(r.title.length)}\n`, `By: ${r.profiles?.name || "Unknown"}`, `Prep: ${r.prep_time}  |  Cook: ${r.cook_time}  |  Servings: ${es}\n`];
    if (r.description) lines.push(`${r.description}\n`);
    lines.push(`INGREDIENTS\n${"-".repeat(30)}`);
    (r.ingredients || []).forEach(ing => { const { amount, unit } = smartScale(ing.amount, ing.unit, scale); lines.push(`  ${formatAmount(amount, unit)}  ${ing.name}`); });
    lines.push(`\nINSTRUCTIONS\n${"-".repeat(30)}`);
    (r.steps || []).forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    lines.push(`\n---\nFrom Stewdium (stewdium.com)`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${r.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ +/g, "_")}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ─── CSV Export/Import ───
  const exportCSV = (list) => {
    const esc = s => { const str = String(s || ""); return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str; };
    const headers = ["Title","Description","Category","Prep Time","Cook Time","Servings","Public","Ingredients","Steps"];
    const rows = list.map(r => [esc(r.title), esc(r.description), esc(r.category), esc(r.prep_time), esc(r.cook_time), r.servings, r.is_public ? "Yes" : "No", esc((r.ingredients || []).map(i => `${i.amount} ${i.unit} ${i.name}`).join(" | ")), esc((r.steps || []).join(" | "))].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "stewdium_recipes.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importCSV = async (e) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    const text = await file.text();
    const lines = []; let current = ""; let inQuotes = false;
    for (let i = 0; i < text.length; i++) { const ch = text[i]; if (ch === '"') { if (inQuotes && text[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } } else if (ch === "\n" && !inQuotes) { lines.push(current); current = ""; } else { current += ch; } }
    if (current.trim()) lines.push(current);
    const parseRow = (line) => { const cols = []; let cur = ""; let q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else { q = !q; } } else if (c === "," && !q) { cols.push(cur); cur = ""; } else { cur += c; } } cols.push(cur); return cols; };
    const header = parseRow(lines[0]).map(h => h.trim().toLowerCase());
    const ti = header.indexOf("title"), di = header.indexOf("description"), ci = header.indexOf("category");
    const pri = header.indexOf("prep time"), coi = header.indexOf("cook time"), si = header.indexOf("servings");
    const pubi = header.indexOf("public"), ingi = header.indexOf("ingredients"), sti = header.indexOf("steps");
    if (ti === -1) { alert("CSV must have a 'Title' column."); e.target.value = ""; return; }
    const newRecipes = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseRow(lines[i]);
      const title = cols[ti]?.trim(); if (!title) continue;
      const ingStr = ingi >= 0 ? cols[ingi] || "" : "";
      const ingredients = ingStr.split("|").filter(s => s.trim()).map(s => { const parts = s.trim().match(/^([\d./]+)\s*(\S+)\s+(.+)$/); if (parts) return { amount: parseFloat(parts[1]) || 1, unit: parts[2], name: parts[3] }; return { amount: 1, unit: "whole", name: s.trim() }; });
      const stepStr = sti >= 0 ? cols[sti] || "" : "";
      const steps = stepStr.split("|").filter(s => s.trim()).map(s => s.trim());
      newRecipes.push({ user_id: user.id, title, description: di >= 0 ? cols[di]?.trim() || "" : "", category: ci >= 0 ? cols[ci]?.trim() || "Dinner" : "Dinner", prep_time: pri >= 0 ? cols[pri]?.trim() || "" : "", cook_time: coi >= 0 ? cols[coi]?.trim() || "" : "", servings: si >= 0 ? parseInt(cols[si]) || 4 : 4, is_public: pubi >= 0 ? cols[pubi]?.trim().toLowerCase() !== "no" : true, ingredients, steps, emoji: "🍽️" });
    }
    if (newRecipes.length === 0) alert("No valid recipes found in CSV.");
    else { const { error } = await db.bulkCreateRecipes(newRecipes); if (!error) { alert(`Imported ${newRecipes.length} recipe${newRecipes.length > 1 ? "s" : ""}!`); loadRecipes(); } else alert("Import error: " + error.message); }
    e.target.value = "";
  };

  // ─── Newsletter ───
  const handleFooterNl = async () => { if (nlEmail.includes("@")) { await db.subscribeNewsletter(nlEmail); setFooterNlSuccess(true); setNlEmail(""); } };

  // ─── Meal plan ───
  const setMealSlot = async (day, meal, recipe) => {
    await db.setMealPlanSlot(user.id, day, meal, recipe?.id || null, getWeekStart());
    setMealPlan(p => ({ ...p, [day]: { ...p[day], [meal]: recipe } }));
    setPicker(null);
  };

  // ─── Profile update ───
  const updateProfileField = async (field, value) => {
    setProfile(p => ({ ...p, [field]: value }));
    await db.updateProfile(user.id, { [field]: value });
  };

  const uploadAvatar = async (file) => {
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { url } = await db.uploadImage('profile-avatars', path, file);
    if (url) { setProfile(p => ({ ...p, avatar_url: url })); await db.updateProfile(user.id, { avatar_url: url }); }
  };

  // ─── Helpers ───
  const getScale = (r) => { if (!scaleValue || !r) return 1; return scaleMode === "multiply" ? scaleValue : scaleValue / r.servings; };
  const RImg = ({ r }) => (<div className="recipe-card-img">{r.image_url ? <img src={r.image_url} alt={r.title}/> : r.emoji || "🍽️"}</div>);
  const authorName = (r) => r.profiles?.name || "Unknown";

  // ─── Board data ───
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);

  useEffect(() => {
    if (user && page === "board") {
      db.getSavedRecipes(user.id).then(({ data }) => setSavedRecipes(data));
      db.getUserRecipes(user.id).then(({ data }) => setMyRecipes(data));
    }
  }, [user, page]);

  // ─── RENDER ───
  return (<><style>{CSS}</style><div className="app"><Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    <nav className="nav"><div className="nav-inner">
      <div className="nav-logo" onClick={() => { setPage("home"); setViewing(null); }}>🍲 <span>stew</span>dium</div>
      <div className="nav-links">
        <button className={`nav-link ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Browse</button>
        <button className={`nav-link ${page === "board" ? "active" : ""}`} onClick={() => { if (!user) setAuthModal("login"); else setPage("board"); }}>My Board</button>
        <button className={`nav-link ${page === "planner" ? "active" : ""}`} onClick={() => { if (!user) setAuthModal("login"); else setPage("planner"); }}>Meal Plan</button>
      </div>
      <div className="nav-user">{user ? <div className="nav-avatar" onClick={() => setPage("profile")} title={profile?.name}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.name || "U")[0].toUpperCase()}</div> : <button className="btn btn-primary btn-sm" onClick={() => setAuthModal("login")}>Sign In</button>}</div>
    </div></nav>
    <div className="main">

    {/* HOME */}
    {page === "home" && <><div className="hero-section"><div className="hero-title">Welcome to <span>Stewdium</span></div><div className="hero-sub">Discover recipes, build your collection, and plan your meals -- all in one place.</div></div>
      <div className="search-bar"><input className="search-input" placeholder="Search recipes or ingredients..." value={search} onChange={e => setSearch(e.target.value)} /><button className="btn btn-primary" onClick={handleAddRecipe}>+ Add Recipe</button></div>
      <div className="filter-chips" style={{ marginBottom: 24 }}>{CATEGORIES.map(c => <button key={c} className={`filter-chip ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>)}</div>
      {loading ? <div className="loading"><div className="loading-spinner" /><div>Loading recipes...</div></div> :
        recipes.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🔍</div><div className="empty-state-text">No recipes found</div><div className="empty-state-sub">{user ? "Be the first to add one!" : "Sign in to add recipes"}</div></div> :
        <div className="recipe-grid">{recipes.map(r => <div key={r.id} className="card recipe-card" onClick={() => openRecipe(r)}>
          <RImg r={r} /><span className="recipe-card-badge">{r.category}</span>
          <button className="recipe-card-save" onClick={e => { e.stopPropagation(); toggleSave(r.id); }}>{savedIds.includes(r.id) ? "❤️" : "🤍"}</button>
          <div className="recipe-card-body"><div className="recipe-card-title">{r.title}</div><div className="recipe-card-author">by {authorName(r)}</div>
            <div className="recipe-card-meta"><span>⏱ {r.cook_time}</span><span>👥 {r.servings} servings</span></div></div></div>)}</div>}</>}

    {/* RECIPE DETAIL */}
    {page === "recipe" && viewing && (() => { const r = viewing, scale = getScale(r), es = scaleValue && scaleMode === "servings" ? scaleValue : Math.round(r.servings * scale); return <div className="recipe-detail">
      <button className="back-btn" onClick={() => setPage("home")}>← Back to recipes</button>
      <div className="recipe-hero">{r.image_url ? <img src={r.image_url} alt={r.title} /> : r.emoji || "🍽️"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div><div className="recipe-title">{r.title}</div><div className="recipe-card-author" style={{ marginBottom: 8 }}>by {authorName(r)}</div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {user && <><button className="btn btn-pink btn-sm" onClick={() => cookedPhotoRef.current?.click()}>📸 I cooked this!</button><input ref={cookedPhotoRef} type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) uploadCookedPhoto(e.target.files[0]); e.target.value = ""; }} style={{ display: "none" }} /></>}
          <button className="btn btn-secondary btn-sm" onClick={() => toggleSave(r.id)}>{savedIds.includes(r.id) ? "❤️ Saved" : "🤍 Save"}</button>
        </div></div>
      <div className="recipe-desc">{r.description}</div>
      <div className="recipe-info"><div className="recipe-info-item"><span className="recipe-info-label">Prep</span><span className="recipe-info-value">{r.prep_time}</span></div><div className="recipe-info-item"><span className="recipe-info-label">Cook</span><span className="recipe-info-value">{r.cook_time}</span></div><div className="recipe-info-item"><span className="recipe-info-label">Servings</span><span className="recipe-info-value">{es}</span></div></div>
      <div className="scale-bar"><label>Scale recipe:</label>
        <button className={`scale-btn ${!scaleValue ? "active" : ""}`} onClick={() => setScaleValue(null)}>1x</button>
        <button className={`scale-btn ${scaleValue === r.servings * 2 && scaleMode === "servings" ? "active" : ""}`} onClick={() => { setScaleMode("servings"); setScaleValue(r.servings * 2); }}>2x</button>
        <button className={`scale-btn ${scaleValue === r.servings * 3 && scaleMode === "servings" ? "active" : ""}`} onClick={() => { setScaleMode("servings"); setScaleValue(r.servings * 3); }}>3x</button>
        <span style={{ color: "var(--gray-400)", fontWeight: 600, fontSize: 13 }}>or</span>
        <label style={{ fontWeight: 600, fontSize: 13, color: "var(--sage-600)" }}>Feeding</label>
        <input className="scale-input" type="number" min="1" max="100" placeholder={r.servings} value={scaleMode === "servings" && scaleValue ? scaleValue : ""} onChange={e => { setScaleMode("servings"); setScaleValue(parseInt(e.target.value) || null); }} />
        <span style={{ fontSize: 13, color: "var(--gray-400)", fontWeight: 600 }}>people</span></div>
      <div className="section-title">Ingredients</div>
      <ul className="ingredient-list">{(r.ingredients || []).map((ing, i) => { const { amount, unit } = smartScale(ing.amount, ing.unit, scale); return <li key={i} className="ingredient-item"><span className="ingredient-amount">{formatAmount(amount, unit)}</span><span className="ingredient-name">{ing.name}</span></li>; })}</ul>
      <div className="section-title">Instructions</div>
      <ol className="step-list">{(r.steps || []).map((s, i) => <li key={i} className="step-item">{s}</li>)}</ol>
      <div className="recipe-actions"><button className="btn btn-secondary btn-sm" onClick={printRecipe}>🖨️ Print</button><button className="btn btn-secondary btn-sm" onClick={() => downloadRecipe(r, scale)}>⬇️ Download</button></div>
      <div style={{ marginTop: 32 }}><div className="section-title" style={{ borderColor: "var(--sage-200)" }}>📸 Community Photos ({cookedPhotos.length})</div>
        {cookedPhotos.length === 0 ? <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--gray-400)", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", marginTop: 8 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🍳</div><div style={{ fontWeight: 600, fontSize: 14 }}>No photos yet</div><div style={{ fontSize: 13, marginTop: 4 }}>Be the first to cook this and share a photo!</div></div>
          : <div className="cooked-grid">{cookedPhotos.map(cp => <div key={cp.id} className="cooked-photo" onClick={() => setLightbox(cp.image_url)}><img src={cp.image_url} alt="" /><div className="cooked-photo-info">{cp.profiles?.name} · {new Date(cp.created_at).toLocaleDateString()}</div></div>)}</div>}
      </div></div>; })()}

    {/* MY BOARD */}
    {page === "board" && user && <><div className="page-title">My Recipe Board</div><div className="page-subtitle">Your personal collection of recipes</div>
      <div className="tab-row"><button className={`filter-chip ${boardTab === "saved" ? "active" : ""}`} onClick={() => setBoardTab("saved")}>❤️ Saved ({savedRecipes.length})</button><button className={`filter-chip ${boardTab === "mine" ? "active" : ""}`} onClick={() => setBoardTab("mine")}>👩‍🍳 My Recipes ({myRecipes.length})</button><button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={handleAddRecipe}>+ Add Recipe</button></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => csvImportRef.current?.click()}>📥 Import CSV</button>
        <input ref={csvImportRef} type="file" accept=".csv" onChange={importCSV} style={{ display: "none" }} />
        {myRecipes.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(myRecipes)}>📤 Export My Recipes</button>}
        {savedRecipes.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(savedRecipes)}>📤 Export Saved</button>}
      </div>
      {boardTab === "saved" && (savedRecipes.length === 0 ? <div className="empty-state"><div className="empty-state-icon">💝</div><div className="empty-state-text">No saved recipes yet</div></div> : <div className="recipe-grid">{savedRecipes.map(r => <div key={r.id} className="card recipe-card" onClick={() => openRecipe(r)}><RImg r={r} /><span className="recipe-card-badge">{r.category}</span><div className="recipe-card-body"><div className="recipe-card-title">{r.title}</div><div className="recipe-card-meta"><span>⏱ {r.cook_time}</span><span>👥 {r.servings}</span></div></div></div>)}</div>)}
      {boardTab === "mine" && (myRecipes.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-text">No recipes created yet</div></div> : <div className="recipe-grid">{myRecipes.map(r => <div key={r.id} className="card recipe-card" onClick={() => openRecipe(r)}><RImg r={r} /><span className="recipe-card-badge">{r.is_public ? "Public" : "Private"}</span><div className="recipe-card-body"><div className="recipe-card-title">{r.title}</div><div className="recipe-card-meta"><span>⏱ {r.cook_time || "---"}</span><span>👥 {r.servings}</span></div></div></div>)}</div>)}</>}

    {/* ADD RECIPE */}
    {page === "addRecipe" && newRecipe && <div style={{ maxWidth: 640, margin: "0 auto" }}><button className="back-btn" onClick={() => { setNewRecipe(null); setPage("board"); }}>← Back</button>
      <div className="page-title">Add a Recipe</div><div className="page-subtitle">Share something delicious</div>
      <div className="card" style={{ padding: 28 }}>
        <div className="form-group"><label className="form-label">Recipe Photo</label><ImageUpload value={newRecipe.imageFile} onChange={f => setNewRecipe({ ...newRecipe, imageFile: f })} height={220} label="Upload a photo of your dish" /></div>
        <div className="form-group"><label className="form-label">Recipe Title *</label><input className="form-input" placeholder="e.g., Grandma's Apple Pie" value={newRecipe.title} onChange={e => setNewRecipe({ ...newRecipe, title: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-input form-textarea" placeholder="A short description..." value={newRecipe.description} onChange={e => setNewRecipe({ ...newRecipe, description: e.target.value })} /></div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: 1, minWidth: 120 }}><label className="form-label">Category</label><select className="form-input" value={newRecipe.category} onChange={e => setNewRecipe({ ...newRecipe, category: e.target.value })}>{CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="form-group" style={{ flex: 1, minWidth: 100 }}><label className="form-label">Servings</label><input className="form-input" type="number" min="1" value={newRecipe.servings} onChange={e => setNewRecipe({ ...newRecipe, servings: e.target.value })} /></div>
          <div className="form-group" style={{ flex: 1, minWidth: 100 }}><label className="form-label">Prep Time</label><input className="form-input" placeholder="15 min" value={newRecipe.prepTime} onChange={e => setNewRecipe({ ...newRecipe, prepTime: e.target.value })} /></div>
          <div className="form-group" style={{ flex: 1, minWidth: 100 }}><label className="form-label">Cook Time</label><input className="form-input" placeholder="30 min" value={newRecipe.cookTime} onChange={e => setNewRecipe({ ...newRecipe, cookTime: e.target.value })} /></div>
        </div>
        {!newRecipe.imageFile && <div className="form-group"><label className="form-label">Fallback Emoji</label><input className="form-input" style={{ width: 80 }} value={newRecipe.emoji} onChange={e => setNewRecipe({ ...newRecipe, emoji: e.target.value })} /></div>}
        <div className="form-group"><label className="form-label">Ingredients</label>
          {newRecipe.ingredients.map((ing, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input className="form-input" style={{ width: 70 }} placeholder="Amt" value={ing.amount} onChange={e => { const n = [...newRecipe.ingredients]; n[i] = { ...n[i], amount: e.target.value }; setNewRecipe({ ...newRecipe, ingredients: n }); }} />
            <input className="form-input" style={{ width: 80 }} placeholder="Unit" value={ing.unit} onChange={e => { const n = [...newRecipe.ingredients]; n[i] = { ...n[i], unit: e.target.value }; setNewRecipe({ ...newRecipe, ingredients: n }); }} />
            <input className="form-input" style={{ flex: 1 }} placeholder="Ingredient name" value={ing.name} onChange={e => { const n = [...newRecipe.ingredients]; n[i] = { ...n[i], name: e.target.value }; setNewRecipe({ ...newRecipe, ingredients: n }); }} />
            {newRecipe.ingredients.length > 1 && <button style={{ border: "none", background: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 18 }} onClick={() => setNewRecipe({ ...newRecipe, ingredients: newRecipe.ingredients.filter((_, j) => j !== i) })}>✕</button>}
          </div>)}
          <button className="btn btn-secondary btn-sm" onClick={() => setNewRecipe({ ...newRecipe, ingredients: [...newRecipe.ingredients, { amount: "", unit: "", name: "" }] })}>+ Ingredient</button></div>
        <div className="form-group"><label className="form-label">Steps</label>
          {newRecipe.steps.map((s, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: "var(--pink-300)", fontSize: 14, minWidth: 24 }}>{i + 1}.</span>
            <input className="form-input" placeholder={`Step ${i + 1}...`} value={s} onChange={e => { const n = [...newRecipe.steps]; n[i] = e.target.value; setNewRecipe({ ...newRecipe, steps: n }); }} />
            {newRecipe.steps.length > 1 && <button style={{ border: "none", background: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 18 }} onClick={() => setNewRecipe({ ...newRecipe, steps: newRecipe.steps.filter((_, j) => j !== i) })}>✕</button>}
          </div>)}
          <button className="btn btn-secondary btn-sm" onClick={() => setNewRecipe({ ...newRecipe, steps: [...newRecipe.steps, ""] })}>+ Step</button></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div className={`toggle-track ${newRecipe.isPublic ? "on" : ""}`} onClick={() => setNewRecipe({ ...newRecipe, isPublic: !newRecipe.isPublic })}><div className="toggle-knob" /></div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--gray-600)" }}>{newRecipe.isPublic ? "🌎 Public" : "🔒 Private"}</span></div>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}><button className="btn btn-primary" disabled={saving} onClick={saveNewRecipe}>{saving ? "Saving..." : "Save Recipe"}</button><button className="btn btn-secondary" onClick={() => { setNewRecipe(null); setPage("board"); }}>Cancel</button></div>
      </div></div>}

    {/* PLANNER */}
    {page === "planner" && user && <><div className="page-title">Meal Planner</div><div className="page-subtitle">Plan your week using recipes from Stewdium</div>
      <div className="planner-grid">{DAYS.map(d => <div key={d} className="planner-day"><div className="planner-day-name">{d}</div>
        {MEALS_LIST.map(m => <div key={m} className="planner-meal"><div className="planner-meal-label">{m}</div>
          {mealPlan[d]?.[m] ? <div className="planner-meal-slot filled"><span style={{ fontSize: 14 }}>{mealPlan[d][m].emoji || "🍽️"}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{mealPlan[d][m].title}</span><button className="rm" onClick={() => setMealSlot(d, m, null)}>✕</button></div>
            : <div className="planner-meal-slot" onClick={() => setPicker({ day: d, meal: m })}>+ Add</div>}
        </div>)}</div>)}</div></>}

    {/* PROFILE */}
    {page === "profile" && user && profile && <><div className="profile-header"><div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile.name || "U")[0].toUpperCase()}</div><div><div className="profile-name">{profile.name}</div><div className="profile-bio">{profile.bio}</div><div className="profile-stats"><span className="profile-stat">📖 {myRecipes.length} recipes</span><span className="profile-stat">❤️ {savedIds.length} saved</span></div></div></div>
      <div className="card" style={{ padding: 28 }}><div className="section-title" style={{ borderColor: "var(--sage-200)" }}>Edit Profile</div>
        <div className="form-group"><label className="form-label">Profile Picture</label><ImageUpload value={profile.avatar_url} onChange={f => uploadAvatar(f)} round label="Change photo" /></div>
        <div className="form-group"><label className="form-label">Display Name</label><input className="form-input" value={profile.name} onChange={e => updateProfileField('name', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Bio</label><textarea className="form-input form-textarea" value={profile.bio || ""} onChange={e => updateProfileField('bio', e.target.value)} /></div>
        <button className="btn btn-pink" style={{ marginTop: 8 }} onClick={handleSignOut}>Sign Out</button></div></>}

    {/* BLOG placeholder */}
    {page === "blog" && <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}><div className="page-title">Stewdium Blog</div><div className="page-subtitle">Coming soon! Recipes, tips, and stories from the community.</div><div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-text">Blog posts coming soon</div></div></div>}

    </div>

    {/* FOOTER */}
    <footer className="footer"><div className="footer-inner">
      <div className="footer-brand"><div className="footer-brand-name">🍲 <span>stew</span>dium</div><div className="footer-brand-desc">Your home for discovering, sharing, and organizing recipes. Built by food lovers, for food lovers.</div></div>
      <div className="footer-col"><h4>Explore</h4><button className="footer-link" onClick={() => setPage("home")}>Browse Recipes</button><button className="footer-link" onClick={() => { if (!user) setAuthModal("login"); else setPage("planner"); }}>Meal Planner</button><button className="footer-link" onClick={() => setPage("blog")}>Blog</button></div>
      <div className="footer-col"><h4>Account</h4>{user ? <><button className="footer-link" onClick={() => setPage("board")}>My Board</button><button className="footer-link" onClick={() => setPage("profile")}>Profile</button></> : <><button className="footer-link" onClick={() => setAuthModal("login")}>Sign In</button><button className="footer-link" onClick={() => setAuthModal("signup")}>Create Account</button></>}</div>
      <div className="footer-nl"><h4>Get the Newsletter</h4><div className="checkbox-label">Weekly recipes, cooking tips, and community highlights.</div>
        {footerNlSuccess ? <div className="nl-success"><div className="nl-success-icon">🎉</div><div className="nl-success-text">You're subscribed!</div></div> : <div className="footer-nl-row"><input className="footer-nl-input" type="email" placeholder="your@email.com" value={nlEmail} onChange={e => setNlEmail(e.target.value)} /><button className="btn btn-pink btn-sm" onClick={handleFooterNl}>Subscribe</button></div>}
      </div></div><div className="footer-bottom">© 2026 Stewdium. All rights reserved. Made with ❤️ and 🍲</div></footer>

    {/* AUTH MODAL */}
    {authModal && <div className="auth-overlay" onClick={() => { setAuthModal(null); setAuthError(""); }}><div className="auth-modal" onClick={e => e.stopPropagation()}>
      {authError && <div className="error-msg">{authError}</div>}
      {authModal === "login" ? <><div className="auth-title">Welcome back</div><div className="auth-subtitle">Sign in to your Stewdium account</div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@email.com" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} /></div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={handleLogin}>Sign In</button>
        <div style={{ textAlign: "center", fontSize: 14, color: "var(--gray-400)" }}>New here? <span style={{ color: "var(--sage-500)", fontWeight: 700, cursor: "pointer" }} onClick={() => { setAuthModal("signup"); setAuthError(""); }}>Create an account</span></div></>
        : <><div className="auth-title">Join Stewdium</div><div className="auth-subtitle">Create your free account and start cooking</div>
        <div className="form-group"><label className="form-label">Display Name</label><input className="form-input" placeholder="Your name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="you@email.com" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Min 6 characters" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Short Bio</label><input className="form-input" placeholder="I love cooking!" value={authForm.bio} onChange={e => setAuthForm({ ...authForm, bio: e.target.value })} /></div>
        <div className="checkbox-row" onClick={() => setAuthForm({ ...authForm, newsletter: !authForm.newsletter })}><div className={`checkbox-box ${authForm.newsletter ? "checked" : ""}`}>{authForm.newsletter && <span style={{ color: "white", fontSize: 13, fontWeight: 800 }}>✓</span>}</div><span className="checkbox-label">Send me the Stewdium weekly newsletter with trending recipes and cooking tips</span></div>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={handleSignup}>Create Account</button>
        <div style={{ textAlign: "center", fontSize: 14, color: "var(--gray-400)" }}>Already have an account? <span style={{ color: "var(--sage-500)", fontWeight: 700, cursor: "pointer" }} onClick={() => { setAuthModal("login"); setAuthError(""); }}>Sign in</span></div></>}
    </div></div>}

    {/* MEAL PLAN PICKER */}
    {picker && <div className="pick-overlay" onClick={() => setPicker(null)}><div className="pick-modal" onClick={e => e.stopPropagation()}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>Add to {picker.day}</div>
      <div style={{ fontSize: 13, color: "var(--gray-400)", marginBottom: 16 }}>{picker.meal}</div>
      {recipes.map(r => <div key={r.id} className="pick-opt" onClick={() => setMealSlot(picker.day, picker.meal, r)}>
        <div className="pick-emoji">{r.image_url ? <img src={r.image_url} alt="" /> : r.emoji || "🍽️"}</div>
        <span className="pick-title">{r.title}</span></div>)}
    </div></div>}

  </div></>);
}
