"use client";

import { useEffect, useState } from "react";
import { Eye, Gauge, Settings2, Type } from "lucide-react";

function applyDetail(value) {
  document.documentElement.dataset.detailLevel = value;
}

export default function SettingsPanel({visualMode,setVisualMode}) {
  const [detail,setDetail] = useState("balanced");
  const [fontScale,setFontScale] = useState("normal");

  useEffect(()=>{
    const storedDetail = window.localStorage.getItem("pylab-detail-level") || "balanced";
    const storedFont = window.localStorage.getItem("pylab-font-scale") || "normal";
    setDetail(storedDetail);
    setFontScale(storedFont);
    applyDetail(storedDetail);
    document.documentElement.dataset.fontScale = storedFont;
  },[]);

  function changeDetail(value){
    setDetail(value);
    window.localStorage.setItem("pylab-detail-level",value);
    applyDetail(value);
  }

  function changeFont(value){
    setFontScale(value);
    window.localStorage.setItem("pylab-font-scale",value);
    document.documentElement.dataset.fontScale=value;
  }

  return <section className="feature-page">
    <div className="path-heading"><span className="eyebrow">Einstellungen</span><h1>So soll PyLab mit dir lernen</h1><p>Die Lernziele bleiben identisch. Du passt nur Darstellung und Erklärungstiefe an.</p></div>
    <div className="settings-grid">
      <article className="setting-card"><div className="setting-title"><Eye/><div><strong>Visuelle Erklärungen</strong><span>Code zusätzlich Schritt für Schritt darstellen.</span></div></div><button className={`setting-switch ${visualMode?"on":""}`} onClick={()=>setVisualMode(v=>!v)} aria-pressed={visualMode}><i/>{visualMode?"An":"Aus"}</button></article>
      <article className="setting-card vertical"><div className="setting-title"><Gauge/><div><strong>Erklärungstiefe</strong><span>Wie viel erklärender Text pro Lernschritt sichtbar sein soll.</span></div></div><div className="segmented">{[["compact","Kompakt"],["balanced","Gemischt"],["deep","Ausführlich"]].map(([value,label])=><button key={value} className={detail===value?"active":""} aria-pressed={detail===value} onClick={()=>changeDetail(value)}>{label}</button>)}</div><small>Kompakt zeigt den Kern, Gemischt zusätzlichen Kontext und Ausführlich alle vorhandenen Erklärungsabsätze.</small></article>
      <article className="setting-card vertical"><div className="setting-title"><Type/><div><strong>Textgröße</strong><span>Lesbarkeit an deinen Bildschirm anpassen.</span></div></div><div className="segmented">{[["small","Klein"],["normal","Normal"],["large","Groß"]].map(([value,label])=><button key={value} className={fontScale===value?"active":""} aria-pressed={fontScale===value} onClick={()=>changeFont(value)}>{label}</button>)}</div></article>
      <article className="setting-card vertical"><div className="setting-title"><Settings2/><div><strong>Lernprinzip</strong><span>PyLab bewertet Beherrschung statt nur erledigte Seiten.</span></div></div><ul className="setting-list"><li>Quiz und Code fließen in Mastery ein.</li><li>Schwache Themen werden früher wiederholt.</li><li>Übungsmodi ändern die Lernform, nicht den Stoff.</li></ul></article>
    </div>
  </section>;
}
