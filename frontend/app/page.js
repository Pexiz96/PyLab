"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, BookOpen, Brain, Check, ChevronLeft, ChevronRight, Code2, Home,
  Menu, Play, RotateCcw, Settings, Sparkles, Trophy, Target,
  CalendarClock, Eye, Lightbulb, Layers3
} from "lucide-react";
import ActivePractice from "./ActivePractice";
import AchievementsPanel from "./AchievementsPanel";
import MentorPanel from "./MentorPanel";
import SettingsPanel from "./SettingsPanel";

const API = "/backend-api";
const nav = [
  ["Heute lernen", Home], ["Lernpfad", BookOpen], ["Übungen", Code2],
  ["Wiederholen", RotateCcw], ["Achievements", Trophy], ["Lernmentor", Brain],
];

function masteryLabel(score = 0) {
  if (score >= 90) return "Sicher";
  if (score >= 70) return "Gut";
  if (score >= 40) return "Im Aufbau";
  if (score > 0) return "Noch unsicher";
  return "Noch nicht bewertet";
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = data?.detail || data?.message || `HTTP ${response.status}`;
    throw new Error(typeof detail === "string" ? detail : "Die Anfrage konnte nicht verarbeitet werden.");
  }
  return data;
}

function explainCodeLine(line) {
  const text = line.trim();
  if (!text) return "Leere Zeile – sie trennt Codeabschnitte optisch.";
  if (text.startsWith("#")) return "Kommentar – Python führt diese Zeile nicht aus.";
  if (/^def\s+\w+\s*\(/.test(text)) return "Eine Funktion wird definiert. Ihr eingerückter Code läuft erst beim Aufruf.";
  if (/^class\s+\w+/.test(text)) return "Eine Klasse wird als Bauplan für Objekte definiert.";
  if (/^if\s+/.test(text) || /^elif\s+/.test(text)) return "Eine Bedingung wird geprüft. Das Ergebnis ist True oder False.";
  if (/^else\s*:/.test(text)) return "Dieser Zweig läuft, wenn die vorherigen Bedingungen nicht erfüllt waren.";
  if (/^for\s+/.test(text)) return "Eine for-Schleife startet bzw. steuert den nächsten Durchlauf.";
  if (/^while\s+/.test(text)) return "Die while-Bedingung entscheidet, ob die Schleife weiterläuft.";
  if (/^return\b/.test(text)) return "Ein Wert wird aus der Funktion an die Aufrufstelle zurückgegeben.";
  if (/^print\s*\(/.test(text)) return "Ein Wert oder Text wird in der Konsole ausgegeben.";
  if (/^\w+(?:\[[^\]]+\])?\s*(?:=|\+=|-=|\*=|\/=|%=)\s*[^=]/.test(text)) return "Ein Wert wird gespeichert oder verändert.";
  if (/\b(?:==|!=|>=|<=|>|<)\b/.test(text) || /(?:==|!=|>=|<=|>|<)/.test(text)) return "Hier wird ein Vergleich ausgewertet.";
  return "Python verarbeitet diese Anweisung der Reihe nach.";
}

function insertIndent(event, value, setValue) {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const target = event.currentTarget;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const next = `${value.slice(0, start)}    ${value.slice(end)}`;
  setValue(next);
  requestAnimationFrame(() => {
    target.selectionStart = target.selectionEnd = start + 4;
  });
}

export default function HomePage() {
  const [lessons, setLessons] = useState([]);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [profile, setProfile] = useState({ xp:0, level:1, rank:"Python Anfänger", progress:[], mastery:[], average_mastery:0, due_reviews:[] });
  const [stepIndex, setStepIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Heute lernen");
  const [selected, setSelected] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [checkState, setCheckState] = useState(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [finishMessage, setFinishMessage] = useState("");
  const [visualMode, setVisualMode] = useState(true);
  const [busy, setBusy] = useState("");
  const [codeAttempts, setCodeAttempts] = useState(0);

  async function refreshProfile() {
    try {
      const data = await apiJson(`${API}/profile`, { cache:"no-store" });
      setProfile(data);
    } catch (error) {
      setNotice(`Lernstand konnte nicht aktualisiert werden: ${error.message}`);
    }
  }

  useEffect(() => {
    const storedVisual = window.localStorage.getItem("pylab-visual-mode");
    if (storedVisual !== null) setVisualMode(storedVisual === "true");
    async function load() {
      try {
        const [lessonData, profileData] = await Promise.all([
          apiJson(`${API}/lessons`, { cache:"no-store" }),
          apiJson(`${API}/profile`, { cache:"no-store" }),
        ]);
        if (!Array.isArray(lessonData) || !lessonData.length) throw new Error("Keine gültigen Lektionen gefunden.");
        setLessons(lessonData);
        setProfile(profileData);
        const progress = Array.isArray(profileData.progress) ? profileData.progress : [];
        let targetLesson = 0;
        let targetStep = 0;
        for (let i=0; i<lessonData.length; i++) {
          const saved = progress.find(p => p.lesson_id === lessonData[i].id);
          if (!saved || !saved.completed) {
            targetLesson = i;
            targetStep = saved ? Math.min(saved.step_index || 0, lessonData[i].steps.length - 1) : 0;
            break;
          }
          if (i === lessonData.length - 1) {
            targetLesson = i;
            targetStep = lessonData[i].steps.length - 1;
          }
        }
        setLessonIndex(targetLesson);
        setStepIndex(targetStep);
      } catch (error) {
        setLoadError(error.message || "PyLab konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pylab-visual-mode", String(visualMode));
  }, [visualMode]);

  const lesson = lessons[lessonIndex] || null;
  const step = lesson?.steps?.[stepIndex] || null;
  const progressPercent = lesson ? Math.round(((stepIndex + 1) / lesson.steps.length) * 100) : 0;
  const currentMastery = profile.mastery?.find(m => m.lesson_id === lesson?.id) || { score:0, attempts:0, streak:0 };

  useEffect(() => {
    if (!step) return;
    setSelected(null);
    setQuizChecked(false);
    setCheckState(null);
    setHintIndex(0);
    setOutput("");
    setNotice("");
    setCodeAttempts(0);
    if (step.type === "code") setCode(step.starter_code || "");
  }, [lessonIndex, stepIndex, step]);

  const canContinue = useMemo(() => {
    if (!step || busy) return false;
    if (step.type === "quiz") return quizChecked && selected === step.correct;
    if (step.type === "code") return checkState === "success";
    return true;
  }, [step, quizChecked, selected, checkState, busy]);

  function lessonProgress(id) {
    return profile.progress?.find(p => p.lesson_id === id) || null;
  }

  function lessonMastery(id) {
    return profile.mastery?.find(m => m.lesson_id === id) || { score:0, attempts:0, streak:0 };
  }

  async function saveProgress(index, completed = false) {
    if (!lesson) return;
    try {
      await apiJson(`${API}/progress`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lesson_id:lesson.id, step_index:index, completed}),
      });
      await refreshProfile();
    } catch (error) {
      setNotice(`Fortschritt konnte nicht gespeichert werden: ${error.message}`);
    }
  }

  async function recordQuiz(passed) {
    await apiJson(`${API}/mastery/attempt`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lesson_id:lesson.id, passed}),
    });
    await refreshProfile();
  }

  async function checkQuiz() {
    if (selected === null || busy) return;
    setBusy("quiz");
    setNotice("");
    try {
      setQuizChecked(true);
      await recordQuiz(selected === step.correct);
    } catch (error) {
      setQuizChecked(false);
      setNotice(`Antwort konnte nicht bewertet werden: ${error.message}`);
    } finally {
      setBusy("");
    }
  }

  function retryQuiz() {
    setSelected(null);
    setQuizChecked(false);
    setNotice("");
  }

  async function next() {
    if (!lesson?.steps?.length || busy) return;
    setFinishMessage("");
    if (stepIndex < lesson.steps.length - 1) {
      const n = stepIndex + 1;
      setStepIndex(n);
      await saveProgress(n, false);
      return;
    }

    setBusy("progress");
    try {
      await saveProgress(stepIndex, true);
      if (lessonIndex < lessons.length - 1) {
        const n = lessonIndex + 1;
        setLessonIndex(n);
        setStepIndex(0);
        setFinishMessage(`Lektion abgeschlossen. Weiter mit: ${lessons[n].title}`);
      } else {
        setFinishMessage("Alle aktuell verfügbaren Lektionen sind abgeschlossen.");
        setActiveNav("Lernpfad");
      }
    } finally {
      setBusy("");
    }
  }

  async function goBack() {
    if (stepIndex <= 0 || busy) return;
    setFinishMessage("");
    const p = stepIndex - 1;
    setStepIndex(p);
    await saveProgress(p, false);
  }

  function openLesson(index) {
    const target = lessons[index];
    if (!target) return;
    const saved = lessonProgress(target.id);
    setLessonIndex(index);
    setStepIndex(saved ? Math.min(saved.step_index || 0, target.steps.length - 1) : 0);
    setFinishMessage("");
    setNotice("");
    setActiveNav("Heute lernen");
  }

  function openReview(review) {
    const index = lessons.findIndex(l => l.id === review.lesson_id);
    if (index >= 0) {
      setLessonIndex(index);
      setStepIndex(0);
      setFinishMessage("");
      setActiveNav("Heute lernen");
    }
  }

  async function runCode() {
    if (!code.trim() || busy) return;
    setBusy("run");
    setNotice("");
    try {
      const data = await apiJson(`${API}/run`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({code, stdin:step?.stdin || ""}),
      });
      setOutput(data.stderr || data.stdout || "(keine Ausgabe)");
    } catch (error) {
      setOutput("");
      setNotice(`Code konnte nicht ausgeführt werden: ${error.message}`);
    } finally {
      setBusy("");
    }
  }

  async function checkCode() {
    if (!code.trim() || busy) return;
    setBusy("check");
    setNotice("");
    try {
      const data = await apiJson(`${API}/check`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({code, lesson_id:lesson.id, step_id:step.id, stdin:step?.stdin || ""}),
      });
      setOutput(data.stderr || data.stdout || "(keine Ausgabe)");
      setCheckState(data.passed ? "success" : "error");
      if (!data.passed) setCodeAttempts(v => v + 1);
      await refreshProfile();
    } catch (error) {
      setCheckState("error");
      setNotice(`Lösung konnte nicht geprüft werden: ${error.message}`);
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="startup"><div className="loader">PyLab wird geladen …</div></div>;
  if (loadError) return <div className="startup"><div className="error-card"><h1>PyLab konnte nicht starten</h1><p>{loadError}</p><code>{API}/health</code><button onClick={()=>window.location.reload()}>Erneut versuchen</button></div></div>;
  if (!lesson || !step) return <div className="startup">Keine Lektion verfügbar.</div>;

  const hints = Array.isArray(step.hints) ? step.hints : [];
  const hasMoreHints = hintIndex < hints.length;

  return <div className="app-shell">
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={19}/></div>{!collapsed && <div><div className="brand">PyLab</div><div className="brand-sub">Python Learning Lab</div></div>}</div>
      <button className="collapse-btn" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed ? "Menü ausklappen" : "Menü einklappen"}><Menu size={18}/>{!collapsed && <span>Menü einklappen</span>}</button>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={`nav-item ${activeNav === name ? "active" : ""}`} onClick={()=>setActiveNav(name)} title={name}><Icon size={19}/>{!collapsed && <span>{name}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className={`nav-item ${activeNav === "Einstellungen" ? "active" : ""}`} onClick={()=>setActiveNav("Einstellungen")} title="Einstellungen"><Settings size={19}/>{!collapsed && <span>Einstellungen</span>}</button></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><div className="top-title">{activeNav}</div><div className="top-subtitle">Learn. Code. Master Python.</div></div><div className="profile-strip"><div className="mastery-mini" title="Mastery über den gesamten Lernpfad"><Target size={15}/>{profile.average_mastery || 0}%</div><div className="level-pill">Level {profile.level}</div><div><div className="rank">{profile.rank}</div><div className="xp">{profile.xp} XP</div></div></div></header>

      {notice && <div className="app-notice" role="status"><AlertCircle size={17}/><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Hinweis schließen">×</button></div>}

      {activeNav === "Lernpfad" ? <section className="path-page">
        <div className="path-heading"><span className="eyebrow">Python Lernpfad</span><h1>Schritt für Schritt Python beherrschen</h1><p>Fortschritt zeigt, was du erledigt hast. Mastery zeigt, was über den gesamten Lernpfad wirklich sitzt.</p></div>
        <div className="mastery-dashboard"><div className="metric"><Target/><span>Gesamt-Mastery</span><strong>{profile.average_mastery || 0}%</strong></div><div className="metric"><CalendarClock/><span>Fällige Wiederholungen</span><strong>{profile.due_reviews?.length || 0}</strong></div><div className="metric"><Layers3/><span>Lektionen</span><strong>{lessons.length}</strong></div></div>
        <div className="path-list">{lessons.map((item, index) => {const saved=lessonProgress(item.id);const mastery=lessonMastery(item.id);const completed=Boolean(saved?.completed);const active=index===lessonIndex;return <button className={`path-card ${completed?"completed":""} ${active?"current":""}`} key={item.id} onClick={()=>openLesson(index)}><div className="path-number">{completed?<Check size={20}/>:index+1}</div><div className="path-info"><span>{completed?"Abgeschlossen":active?"Aktuell":"Lektion"}</span><h2>{item.title}</h2><p>{item.subtitle}</p><div className="mastery-line"><div><i style={{width:`${mastery.score}%`}}/></div><small>{masteryLabel(mastery.score)} · {mastery.score}%</small></div></div><div className="path-meta">≈ {item.estimated_minutes} Min. <ChevronRight size={18}/></div></button>})}</div>
      </section>

      : activeNav === "Übungen" ? <ActivePractice lessons={lessons} refreshProfile={refreshProfile}/>

      : activeNav === "Wiederholen" ? <section className="review-page"><div className="path-heading"><span className="eyebrow">Spaced Repetition</span><h1>Wiederholen, bevor du es vergisst</h1><p>PyLab priorisiert automatisch Themen, die wieder gefestigt werden sollten.</p></div>{profile.due_reviews?.length ? <div className="review-list">{profile.due_reviews.map(review=>{const l=lessons.find(x=>x.id===review.lesson_id);return <button key={review.lesson_id} className="review-card" onClick={()=>openReview(review)}><RotateCcw/><div><strong>{l?.title||review.lesson_id}</strong><span>{masteryLabel(review.score)} · {review.score}% Mastery</span></div><ChevronRight/></button>})}</div> : <div className="review-empty"><Trophy/><h2>Aktuell nichts fällig</h2><p>Sobald ein Thema wiederholt werden sollte, erscheint es automatisch hier.</p></div>}</section>

      : activeNav === "Achievements" ? <AchievementsPanel profile={profile} lessons={lessons}/>

      : activeNav === "Lernmentor" ? <MentorPanel lesson={lesson} step={step}/>

      : activeNav === "Einstellungen" ? <SettingsPanel visualMode={visualMode} setVisualMode={setVisualMode}/>

      : <div className="lesson-layout"><section className="lesson-card">{finishMessage && <div className="finish-banner">{finishMessage}</div>}
        <div className="lesson-header"><div><span className="eyebrow">{step.eyebrow}</span><h1>{step.title}</h1></div><span className="counter">{stepIndex+1} / {lesson.steps.length}</span></div>
        <div className="progress-track"><div className="progress-fill" style={{width:`${progressPercent}%`}}/></div>
        <div className="lesson-content">
          {step.type === "lesson" && <>{step.body?.map((p,i)=><p key={i}>{p}</p>)}{step.code && <><pre className="code-block"><code>{step.code}</code></pre>{visualMode && <div className="visual-explain"><div className="visual-title"><Eye size={17}/> So liest Python das</div>{step.code.split("\n").filter(Boolean).slice(0,8).map((line,i)=><div className="visual-row" key={i}><span>{i+1}</span><code>{line}</code><ChevronRight size={15}/><em>{explainCodeLine(line)}</em></div>)}</div>}</>}{step.term && <div className="term-card"><div className="term-symbol">{step.term.symbol}</div><div><strong>{step.term.name}</strong><p>{step.term.meaning}</p></div></div>}{step.callout && <div className="callout"><strong>{step.callout.title}</strong><p>{step.callout.text}</p></div>}</>}

          {step.type === "quiz" && <div><p className="question">{step.question}</p><div className="options">{step.options.map((option,idx)=><button key={`${idx}-${option}`} className={`option ${selected===idx?"selected":""} ${quizChecked&&idx===step.correct?"correct":""} ${quizChecked&&selected===idx&&idx!==step.correct?"wrong":""}`} disabled={busy === "quiz" || (quizChecked && selected === step.correct)} onClick={()=>{if(!quizChecked||selected!==step.correct)setSelected(idx)}}><span>{String.fromCharCode(65+idx)}</span><code>{option}</code></button>)}</div>{!quizChecked ? <button className="secondary" disabled={selected===null||busy==="quiz"} onClick={checkQuiz}>{busy==="quiz"?"Prüfe …":"Antwort prüfen"}</button> : selected===step.correct ? <div className="feedback success">{step.explanation}</div> : <><div className="feedback error">Noch nicht richtig. Deine Antwort wurde nicht als korrekt gewertet. Du kannst es direkt noch einmal versuchen.</div><button className="secondary" onClick={retryQuiz}>Nochmal versuchen</button></>}</div>}

          {step.type === "code" && <div><p className="question">{step.task}</p><div className="editor-shell"><div className="editor-toolbar"><span>main.py</span><button disabled={!code.trim()||Boolean(busy)} onClick={runCode}><Play size={15}/> {busy==="run"?"Läuft …":"Ausführen"}</button></div><textarea className="editor" value={code} onChange={e=>{setCode(e.target.value);setCheckState(null)}} onKeyDown={e=>insertIndent(e,code,setCode)} spellCheck={false}/></div><div className="console"><div className="console-title">Ausgabe</div><pre>{output || "Deine Ausgabe erscheint hier."}</pre></div><div className="actions"><button className="ghost" disabled={!hasMoreHints||Boolean(busy)} onClick={()=>setHintIndex(i=>Math.min(i+1,hints.length))}><Lightbulb size={16}/> {hasMoreHints?"Hinweis":"Alle Hinweise gezeigt"}</button><button className="primary" disabled={!code.trim()||Boolean(busy)} onClick={checkCode}>{busy==="check"?"Prüfe …":"Lösung prüfen"}</button></div>{hintIndex>0 && <div className="hint"><strong>Hinweis {hintIndex} von {hints.length}</strong><p>{hints[hintIndex-1]}</p></div>}{checkState && <div className={`feedback ${checkState}`}>{checkState==="success"?`Richtig! +${step.xp||40} XP · Mastery aktualisiert`:`Noch nicht richtig. Versuch ${codeAttempts}. Nutze bei Bedarf die Hinweise und prüfe besonders Ausgabe, Datentypen und Einrückung.`}</div>}</div>}

          {step.type === "summary" && <div className="summary"><div className="summary-icon"><Trophy/></div><ul>{step.items.map(item=><li key={item}>{item}</li>)}</ul>{step.next && <div className="next-topic">{step.next}</div>}</div>}
        </div>
        <footer className="lesson-footer"><button className="ghost" disabled={stepIndex===0||Boolean(busy)} onClick={goBack}><ChevronLeft size={18}/> Zurück</button><button className="primary" disabled={!canContinue} onClick={next}>{stepIndex===lesson.steps.length-1?"Lektion abschließen":"Weiter"}<ChevronRight size={18}/></button></footer>
      </section>

      <aside className="course-panel"><span className="eyebrow">Dein Lernstand</span><h2>{lesson.title}</h2><div className="mastery-ring"><strong>{currentMastery.score}%</strong><span>{masteryLabel(currentMastery.score)}</span></div><div className="course-meta"><span>{currentMastery.attempts} Versuche</span><span>Serie {currentMastery.streak}</span><span>≈ {lesson.estimated_minutes} Min.</span></div><button className={`visual-toggle ${visualMode?"on":""}`} onClick={()=>setVisualMode(v=>!v)}><Eye size={16}/> Visuelle Erklärung {visualMode?"an":"aus"}</button><div className="step-list">{lesson.steps.map((s,i)=><button key={s.id} className={`step-row ${i===stepIndex?"current":""} ${i<stepIndex?"done":""}`} onClick={()=>{setFinishMessage("");setStepIndex(i)}}><span className="step-dot">{i<stepIndex?<Check size={13}/>:i+1}</span><span>{s.title}</span></button>)}</div></aside></div>}
    </main>
  </div>;
}
