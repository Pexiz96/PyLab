"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Brain, Check, ChevronLeft, ChevronRight, Code2, Home,
  Menu, Play, RotateCcw, Settings, Sparkles, Trophy
} from "lucide-react";

const API = "/api";

const nav = [
  ["Heute lernen", Home],
  ["Lernpfad", BookOpen],
  ["Übungen", Code2],
  ["Wiederholen", RotateCcw],
  ["Achievements", Trophy],
  ["Lernmentor", Brain],
];

export default function HomePage() {
  const [lessons, setLessons] = useState([]);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [profile, setProfile] = useState({ xp: 0, level: 1, rank: "Python Anfänger", progress: [] });
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
  const [finishMessage, setFinishMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [lessonRes, profileRes] = await Promise.all([
          fetch(`${API}/lessons`, { cache: "no-store" }),
          fetch(`${API}/profile`, { cache: "no-store" }),
        ]);
        if (!lessonRes.ok || !profileRes.ok) throw new Error("Backend antwortet nicht korrekt.");

        const lessonData = await lessonRes.json();
        const profileData = await profileRes.json();

        if (!Array.isArray(lessonData) || !lessonData.length) {
          throw new Error("Keine gültigen Lektionen gefunden.");
        }

        setLessons(lessonData);
        setProfile(profileData);

        const progress = Array.isArray(profileData.progress) ? profileData.progress : [];
        let targetLesson = 0;
        let targetStep = 0;

        for (let i = 0; i < lessonData.length; i++) {
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

  const lesson = lessons[lessonIndex] || null;
  const step = lesson?.steps?.[stepIndex] || null;
  const progressPercent = lesson ? Math.round(((stepIndex + 1) / lesson.steps.length) * 100) : 0;

  useEffect(() => {
    if (!step) return;
    setSelected(null);
    setQuizChecked(false);
    setCheckState(null);
    setHintIndex(0);
    setOutput("");
    setFinishMessage("");
    if (step.type === "code") setCode(step.starter_code || "");
  }, [lessonIndex, stepIndex, step]);

  const canContinue = useMemo(() => {
    if (!step) return false;
    if (step.type === "quiz") return quizChecked && selected === step.correct;
    if (step.type === "code") return checkState === "success";
    return true;
  }, [step, quizChecked, selected, checkState]);

  function lessonProgress(lessonId) {
    return profile.progress?.find(p => p.lesson_id === lessonId) || null;
  }

  async function refreshProfile() {
    const data = await fetch(`${API}/profile`, { cache: "no-store" }).then(r => r.json());
    setProfile(data);
  }

  async function saveProgress(index, completed = false) {
    if (!lesson) return;
    await fetch(`${API}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lesson.id, step_index: index, completed }),
    });
    await refreshProfile();
  }

  async function next() {
    if (!lesson?.steps?.length) return;

    if (stepIndex < lesson.steps.length - 1) {
      const nextStep = stepIndex + 1;
      setStepIndex(nextStep);
      await saveProgress(nextStep, false);
      return;
    }

    await saveProgress(stepIndex, true);

    if (lessonIndex < lessons.length - 1) {
      const nextLessonIndex = lessonIndex + 1;
      setLessonIndex(nextLessonIndex);
      setStepIndex(0);
      setFinishMessage(`Lektion abgeschlossen. Weiter mit: ${lessons[nextLessonIndex].title}`);
      return;
    }

    setFinishMessage("Alle aktuell verfügbaren Lektionen sind abgeschlossen. Weitere Module folgen im Lernpfad.");
    setActiveNav("Lernpfad");
  }

  async function goBack() {
    if (stepIndex <= 0) return;
    const previous = stepIndex - 1;
    setStepIndex(previous);
    await saveProgress(previous, false);
  }

  function openLesson(index) {
    const target = lessons[index];
    const saved = lessonProgress(target.id);
    setLessonIndex(index);
    setStepIndex(saved ? Math.min(saved.step_index || 0, target.steps.length - 1) : 0);
    setActiveNav("Heute lernen");
  }

  async function runCode() {
    const data = await fetch(`${API}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then(r => r.json());
    setOutput(data.stderr || data.stdout || "(keine Ausgabe)");
  }

  async function checkCode() {
    const data = await fetch(`${API}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        expected_output: step.expected_output,
        lesson_id: lesson.id,
        step_id: step.id,
        xp: step.xp || 40,
      }),
    }).then(r => r.json());

    setOutput(data.stderr || data.stdout || "(keine Ausgabe)");
    setCheckState(data.passed ? "success" : "error");
    if (data.passed) await refreshProfile();
  }

  if (loading) return <div className="startup"><div className="loader">PyLab wird geladen …</div></div>;
  if (loadError) return <div className="startup"><div className="error-card"><h1>PyLab konnte nicht starten</h1><p>{loadError}</p><code>/api/health</code></div></div>;
  if (!lesson || !step) return <div className="startup">Keine Lektion verfügbar.</div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19}/></div>
          {!collapsed && <div><div className="brand">PyLab</div><div className="brand-sub">Python Learning Lab</div></div>}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(v => !v)}>
          <Menu size={18}/>{!collapsed && <span>Menü einklappen</span>}
        </button>
        <nav>
          {nav.map(([name, Icon]) => (
            <button key={name} className={`nav-item ${activeNav === name ? "active" : ""}`} onClick={() => setActiveNav(name)} title={name}>
              <Icon size={19}/>{!collapsed && <span>{name}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={19}/>{!collapsed && <span>Einstellungen</span>}</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><div className="top-title">{activeNav}</div><div className="top-subtitle">Learn. Code. Master Python.</div></div>
          <div className="profile-strip">
            <div className="level-pill">Level {profile.level}</div>
            <div><div className="rank">{profile.rank}</div><div className="xp">{profile.xp} XP</div></div>
          </div>
        </header>

        {activeNav === "Lernpfad" ? (
          <section className="path-page">
            <div className="path-heading">
              <span className="eyebrow">Python Lernpfad</span>
              <h1>Schritt für Schritt Python lernen</h1>
              <p>Alle Lektionen bleiben frei zugänglich. Dein Fortschritt wird automatisch gespeichert.</p>
            </div>
            <div className="path-list">
              {lessons.map((item, index) => {
                const saved = lessonProgress(item.id);
                const completed = Boolean(saved?.completed);
                const active = index === lessonIndex;
                return (
                  <button className={`path-card ${completed ? "completed" : ""} ${active ? "current" : ""}`} key={item.id} onClick={() => openLesson(index)}>
                    <div className="path-number">{completed ? <Check size={20}/> : index + 1}</div>
                    <div className="path-info">
                      <span>{completed ? "Abgeschlossen" : active ? "Aktuell" : "Lektion"}</span>
                      <h2>{item.title}</h2>
                      <p>{item.subtitle}</p>
                    </div>
                    <div className="path-meta">≈ {item.estimated_minutes} Min. <ChevronRight size={18}/></div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : activeNav !== "Heute lernen" ? (
          <section className="placeholder">
            <h1>{activeNav}</h1>
            <p>Dieser Bereich wird auf der bestehenden PyLab-Lernarchitektur weiter ausgebaut.</p>
            <button className="primary" onClick={() => setActiveNav("Heute lernen")}>Weiterlernen</button>
          </section>
        ) : (
          <div className="lesson-layout">
            <section className="lesson-card">
              {finishMessage && <div className="finish-banner">{finishMessage}</div>}
              <div className="lesson-header">
                <div><span className="eyebrow">{step.eyebrow}</span><h1>{step.title}</h1></div>
                <span className="counter">{stepIndex + 1} / {lesson.steps.length}</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{width: `${progressPercent}%`}}/></div>

              <div className="lesson-content">
                {step.type === "lesson" && <>
                  {step.body?.map((p, i) => <p key={i}>{p}</p>)}
                  {step.code && <pre className="code-block"><code>{step.code}</code></pre>}
                  {step.term && <div className="term-card"><div className="term-symbol">{step.term.symbol}</div><div><strong>{step.term.name}</strong><p>{step.term.meaning}</p></div></div>}
                  {step.callout && <div className="callout"><strong>{step.callout.title}</strong><p>{step.callout.text}</p></div>}
                </>}

                {step.type === "quiz" && <div>
                  <p className="question">{step.question}</p>
                  <div className="options">
                    {step.options.map((option, idx) => (
                      <button key={option} className={`option ${selected === idx ? "selected" : ""} ${quizChecked && idx === step.correct ? "correct" : ""} ${quizChecked && selected === idx && idx !== step.correct ? "wrong" : ""}`} onClick={() => !quizChecked && setSelected(idx)}>
                        <span>{String.fromCharCode(65 + idx)}</span><code>{option}</code>
                      </button>
                    ))}
                  </div>
                  {!quizChecked ? <button className="secondary" disabled={selected === null} onClick={() => setQuizChecked(true)}>Antwort prüfen</button> : <div className={`feedback ${selected === step.correct ? "success" : "error"}`}>{selected === step.correct ? step.explanation : "Noch nicht ganz. Versuche es erneut."}</div>}
                </div>}

                {step.type === "code" && <div>
                  <p className="question">{step.task}</p>
                  <div className="editor-shell">
                    <div className="editor-toolbar"><span>main.py</span><button onClick={runCode}><Play size={15}/> Ausführen</button></div>
                    <textarea className="editor" value={code} onChange={e => setCode(e.target.value)} spellCheck={false}/>
                  </div>
                  <div className="console"><div className="console-title">Ausgabe</div><pre>{output || "Deine Ausgabe erscheint hier."}</pre></div>
                  <div className="actions"><button className="ghost" onClick={() => setHintIndex(i => Math.min(i + 1, step.hints.length))}>Hinweis</button><button className="primary" onClick={checkCode}>Lösung prüfen</button></div>
                  {hintIndex > 0 && <div className="hint"><strong>Hinweis {hintIndex}</strong><p>{step.hints[hintIndex - 1]}</p></div>}
                  {checkState && <div className={`feedback ${checkState}`}>{checkState === "success" ? `Richtig! +${step.xp} XP` : "Noch nicht richtig. Prüfe deine Ausgabe."}</div>}
                </div>}

                {step.type === "summary" && <div className="summary">
                  <div className="summary-icon"><Trophy/></div>
                  <ul>{step.items.map(item => <li key={item}>{item}</li>)}</ul>
                  <div className="next-topic">{step.next}</div>
                  <p className="summary-help">Klicke unten auf „Lektion abschließen“. PyLab speichert deinen Fortschritt und öffnet danach automatisch die nächste Lektion.</p>
                </div>}
              </div>

              <footer className="lesson-footer">
                <button className="ghost" disabled={stepIndex === 0} onClick={goBack}><ChevronLeft size={18}/> Zurück</button>
                <button className="primary" disabled={!canContinue} onClick={next}>
                  {stepIndex === lesson.steps.length - 1 ? (lessonIndex < lessons.length - 1 ? "Lektion abschließen & weiter" : "Lektion abschließen") : "Weiter"}
                  <ChevronRight size={18}/>
                </button>
              </footer>
            </section>

            <aside className="course-panel">
              <span className="eyebrow">Aktuelle Lektion</span>
              <h2>{lesson.title}</h2>
              <p>{lesson.subtitle}</p>
              <div className="course-meta"><span>{lesson.difficulty}</span><span>≈ {lesson.estimated_minutes} Min.</span></div>
              <div className="step-list">
                {lesson.steps.map((item, idx) => (
                  <button key={item.id} className={`step-row ${idx === stepIndex ? "current" : ""} ${idx < stepIndex ? "done" : ""}`} onClick={() => idx <= stepIndex && setStepIndex(idx)}>
                    <span className="step-dot">{idx < stepIndex ? "✓" : idx + 1}</span><span>{item.title}</span>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
