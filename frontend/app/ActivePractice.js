"use client";

import { useEffect, useMemo, useState } from "react";
import { Bug, CheckCircle2, ChevronRight, Code2, Eye, FileQuestion, PencilLine, Play, RefreshCcw, Shuffle, Target } from "lucide-react";
import BasicVisualizer from "./BasicVisualizer";

const API = "/backend-api";

const EXERCISES = [
  {type:"predict",lessonIndex:0,title:"Was kommt raus?",code:'punkte = 5\npunkte = 8\nprint(punkte)',question:"Welche Ausgabe erzeugt der Code?",options:["5","8","punkte"],correct:1,explanation:"Die zweite Zuweisung ersetzt den vorherigen Wert. Deshalb wird 8 ausgegeben."},
  {type:"debug",lessonIndex:0,title:"Fehler finden",code:'print(Hallo)',question:"Warum entsteht hier ein Fehler?",options:["print() darf keinen Text ausgeben","Hallo wird ohne Anführungszeichen als Name interpretiert","Runde Klammern sind verboten"],correct:1,explanation:"Ohne Anführungszeichen sucht Python nach einer Variable namens Hallo."},
  {type:"predict",lessonIndex:1,title:"Datentyp verstehen",code:'zahl = "5"\nprint(zahl + zahl)',question:"Was wird ausgegeben?",options:["10","55","Fehler"],correct:1,explanation:"\"5\" ist ein String. Zwei Strings werden mit + aneinandergehängt."},
  {type:"fill",lessonIndex:2,title:"Modulo einsetzen",code:'rest = 7 __ 2\nprint(rest)',question:"Welcher Operator gehört in die Lücke, damit 1 ausgegeben wird?",answers:["%"],explanation:"% ist der Modulo-Operator. Er liefert den Rest einer Division."},
  {type:"debug",lessonIndex:3,title:"Typfehler erkennen",code:'alter = input("Alter: ")\nprint(alter + 1)',question:"Was muss geändert werden, damit gerechnet werden kann?",options:["input() durch print() ersetzen","alter vor der Addition mit int() umwandeln","Die 1 in Anführungszeichen setzen"],correct:1,explanation:"input() liefert immer einen String. Für eine Ganzzahlrechnung brauchst du int()."},
  {type:"predict",lessonIndex:4,title:"Bedingung lesen",code:'alter = 20\nif alter >= 18:\n    print("Ja")\nelse:\n    print("Nein")',question:"Welche Ausgabe erscheint?",options:["Ja","Nein","20"],correct:0,explanation:"20 ist größer oder gleich 18, deshalb wird der if-Zweig ausgeführt."},
  {type:"explain",lessonIndex:5,title:"Schleife erklären",code:'for zahl in range(1, 4):\n    print(zahl)',question:"Erkläre in eigenen Worten, was die Schleife macht.",keywords:["1","2","3"],explanation:"Eine gute Erklärung nennt, dass die Schleife nacheinander die Werte 1, 2 und 3 verarbeitet und ausgibt."},
  {type:"fill",lessonIndex:5,title:"Schleife vervollständigen",code:'for zahl in ____(3):\n    print(zahl)',question:"Welche Funktion gehört in die Lücke?",answers:["range","range()"],explanation:"range() erzeugt die Zahlenfolge, über die die for-Schleife läuft."},
  {type:"predict",lessonIndex:6,title:"String-Index verstehen",code:'wort = "Python"\nprint(wort[0])',question:"Was wird ausgegeben?",options:["P","y","Python"],correct:0,explanation:"Index 0 bezeichnet das erste Zeichen eines Strings."},
  {type:"predict",lessonIndex:7,title:"Listen verändern",code:'zahlen = [1, 2]\nzahlen.append(3)\nprint(zahlen[2])',question:"Welche Ausgabe erscheint?",options:["2","3","[1, 2, 3]"],correct:1,explanation:"append(3) hängt 3 an. Der Index 2 zeigt danach auf die 3."},
  {type:"debug",lessonIndex:7,title:"Listenindex prüfen",code:'namen = ["Ana", "Ben"]\nprint(namen[2])',question:"Was ist das Problem?",options:["Listen dürfen keinen Text enthalten","Index 2 existiert hier nicht","print() kann keine Listenelemente ausgeben"],correct:1,explanation:"Die Liste hat nur die Indizes 0 und 1. Index 2 liegt außerhalb der Liste."},
  {type:"predict",lessonIndex:9,title:"Dictionary lesen",code:'person = {"name": "Mia", "alter": 30}\nprint(person["name"])',question:"Was wird ausgegeben?",options:["name","Mia","30"],correct:1,explanation:"Über den Schlüssel \"name\" wird der Wert \"Mia\" gelesen."},
  {type:"explain",lessonIndex:10,title:"Funktion und return",code:'def addiere(a, b):\n    return a + b\n\nergebnis = addiere(2, 3)\nprint(ergebnis)',question:"Erkläre, was beim Funktionsaufruf passiert und welcher Wert zurückkommt.",keywords:["2","3","5"],explanation:"2 und 3 werden als Argumente übergeben, a und b erhalten diese Werte und return liefert 5 zurück."},
  {type:"predict",lessonIndex:10,title:"Return vorhersagen",code:'def verdopple(zahl):\n    return zahl * 2\n\nwert = verdopple(4)\nprint(wert)',question:"Welche Ausgabe erscheint?",options:["4","8","zahl * 2"],correct:1,explanation:"Die Funktion erhält 4, multipliziert mit 2 und gibt 8 zurück."},
  {type:"debug",lessonIndex:12,title:"Exception verstehen",code:'zahl = int("Hallo")',question:"Welche Exception ist hier zu erwarten?",options:["ValueError","NameError","IndexError"],correct:0,explanation:"Der Text Hallo kann nicht in eine Ganzzahl umgewandelt werden. Das führt zu ValueError."},
  {type:"predict",lessonIndex:16,title:"Comprehension lesen",code:'zahlen = [1, 2, 3, 4]\ngerade = [x for x in zahlen if x % 2 == 0]\nprint(len(gerade))',question:"Wie viele Elemente enthält gerade?",options:["1","2","4"],correct:1,explanation:"2 und 4 sind gerade, also enthält die neue Liste zwei Elemente."},
  {type:"challenge",lessonIndex:2,title:"Offene Problemlösung",question:"Schreibe ein Programm, das die Zahl 17 durch 5 teilt und nur den Rest ausgibt. Die Ausgabe muss exakt 2 sein.",starter:'# Finde selbst heraus, welcher Operator passt.\n',expected_output:"2",explanation:"Hier musst du selbst erkennen, dass der Modulo-Operator % gebraucht wird."},
  {type:"challenge",lessonIndex:5,title:"Basics kombinieren",question:"Gib mit einer Schleife die Zahlen 1 bis 3 jeweils in einer neuen Zeile aus. Die Ausgabe muss exakt 1, 2, 3 sein.",starter:'# Löse die Aufgabe ohne vorgegebene Syntax.\n',expected_output:"1\n2\n3",explanation:"Du musst range() und for selbst kombinieren."},
  {type:"challenge",lessonIndex:7,title:"Liste anwenden",question:"Erstelle eine Liste mit 10, 20 und 30 und gib nur das zweite Element aus. Die Ausgabe muss exakt 20 sein.",starter:'# Erstelle zuerst eine Liste.\n',expected_output:"20",explanation:"Listen beginnen beim Index 0. Das zweite Element hat daher Index 1."},
  {type:"challenge",lessonIndex:10,title:"Funktion selbst bauen",question:"Schreibe eine Funktion quadrat(zahl), die das Quadrat zurückgibt. Rufe sie mit 5 auf und gib das Ergebnis aus. Ausgabe: 25.",starter:'def quadrat(zahl):\n    # ergänzen\n    pass\n\n',expected_output:"25",explanation:"Die Funktion braucht return und anschließend einen Aufruf mit 5."},
];

const MODES = {
  mixed: {label:"Gemischt",types:null,icon:Shuffle,description:"Alle Lernformen gemischt."},
  visual: {label:"Visuell",types:["predict","explain"],icon:Eye,description:"Code lesen, vorhersagen und visualisieren."},
  debug: {label:"Fehlertraining",types:["debug","fill"],icon:Bug,description:"Fehler erkennen und Syntax festigen."},
  practice: {label:"Praxis",types:["challenge"],icon:Target,description:"Offene Aufgaben ohne Lösungsweg."},
};

function typeLabel(type) {
  return {predict:"Code vorhersagen",debug:"Fehler finden",fill:"Lückencode",explain:"Code erklären",challenge:"Problemlösen"}[type] || type;
}

export default function ActivePractice({ lessons, refreshProfile }) {
  const [mode,setMode] = useState("mixed");
  const pool = useMemo(() => EXERCISES.filter(x => !MODES[mode].types || MODES[mode].types.includes(x.type)), [mode]);
  const [index,setIndex] = useState(0);
  const [selected,setSelected] = useState(null);
  const [answer,setAnswer] = useState("");
  const [code,setCode] = useState(pool[0]?.starter || "");
  const [result,setResult] = useState(null);
  const [consoleText,setConsoleText] = useState("");
  const [showVisualizer,setShowVisualizer] = useState(false);
  const [session,setSession] = useState({correct:0,total:0});
  const exercise = pool[index] || pool[0];
  const lesson = lessons[exercise?.lessonIndex];
  const visualCode = exercise?.type === "challenge" ? code : (exercise?.code || "");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("pylab-learning-mode") : null;
    if (saved && MODES[saved]) setMode(saved);
  }, []);

  function resetExercise(nextIndex = 0, nextPool = pool) {
    const item = nextPool[nextIndex] || nextPool[0];
    setIndex(nextIndex); setSelected(null); setAnswer(""); setResult(null); setConsoleText(""); setCode(item?.starter || ""); setShowVisualizer(false);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    if (typeof window !== "undefined") window.localStorage.setItem("pylab-learning-mode", nextMode);
    const nextPool = EXERCISES.filter(x => !MODES[nextMode].types || MODES[nextMode].types.includes(x.type));
    resetExercise(0, nextPool);
  }

  async function record(passed) {
    if (!lesson) return;
    await fetch(`${API}/mastery/attempt`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lesson_id:lesson.id,passed})});
    await refreshProfile?.();
  }

  async function check() {
    let passed = false;
    if (exercise.type === "predict" || exercise.type === "debug") passed = selected === exercise.correct;
    if (exercise.type === "fill") passed = exercise.answers.some(x => x.toLowerCase() === answer.trim().toLowerCase());
    if (exercise.type === "explain") {
      const text = answer.toLowerCase();
      passed = exercise.keywords.every(k => text.includes(k.toLowerCase()));
    }
    if (exercise.type === "challenge") {
      const response = await fetch(`${API}/check`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,expected_output:exercise.expected_output,lesson_id:lesson?.id || "practice",step_id:`practice-${exercise.lessonIndex}-${index}`,xp:25})});
      const data = await response.json();
      setConsoleText(data.stderr || data.stdout || "(keine Ausgabe)");
      setResult({passed:data.passed});
      setSession(s=>({correct:s.correct+(data.passed?1:0),total:s.total+1}));
      await refreshProfile?.();
      return;
    }
    setResult({passed});
    setSession(s=>({correct:s.correct+(passed?1:0),total:s.total+1}));
    await record(passed);
  }

  async function runCode() {
    const response = await fetch(`${API}/run`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
    const data = await response.json();
    setConsoleText(data.stderr || data.stdout || "(keine Ausgabe)");
  }

  function next() {
    const n = (index + 1) % pool.length;
    resetExercise(n);
  }

  if (!exercise) return null;

  return <section className="practice-page">
    <div className="path-heading"><span className="eyebrow">Aktives Training</span><h1>Python wirklich anwenden</h1><p>Wähle, wie du trainieren möchtest. Der Lerninhalt bleibt gleich, die Lernform ändert sich.</p></div>

    <div className="learning-modes">{Object.entries(MODES).map(([key,item])=>{const Icon=item.icon;return <button key={key} className={mode===key?"active":""} onClick={()=>changeMode(key)}><Icon size={17}/><strong>{item.label}</strong><span>{item.description}</span></button>})}</div>

    <div className="practice-session"><span>Diese Runde</span><strong>{session.correct} richtig / {session.total} beantwortet</strong><small>{session.total ? `${Math.round(session.correct/session.total*100)}% Trefferquote` : "Noch keine Aufgabe bewertet"}</small></div>

    <div className="practice-types"><span><FileQuestion/> Vorhersagen</span><span><Bug/> Fehler finden</span><span><PencilLine/> Lückencode</span><span><Code2/> Erklären</span><span><Target/> Problemlösen</span></div>

    <div className="practice-card">
      <div className="practice-head"><div><span>{typeLabel(exercise.type)}</span><h2>{exercise.title}</h2></div><strong>{index + 1} / {pool.length}</strong></div>
      {exercise.code && <pre className="code-block"><code>{exercise.code}</code></pre>}
      <p className="question">{exercise.question}</p>

      {(exercise.type === "predict" || exercise.type === "debug") && <div className="options">{exercise.options.map((o,i)=><button key={o} className={`option ${selected===i?"selected":""} ${result && i===exercise.correct?"correct":""} ${result && selected===i && i!==exercise.correct?"wrong":""}`} disabled={result!==null} onClick={()=>setSelected(i)}><span>{String.fromCharCode(65+i)}</span><code>{o}</code></button>)}</div>}
      {(exercise.type === "fill" || exercise.type === "explain") && <textarea className="practice-answer" value={answer} disabled={result!==null} onChange={e=>setAnswer(e.target.value)} placeholder={exercise.type === "explain" ? "Erkläre den Ablauf in deinen eigenen Worten …" : "Deine Antwort …"}/>} 
      {exercise.type === "challenge" && <><div className="editor-shell"><div className="editor-toolbar"><span>practice.py</span><button onClick={runCode}><Play size={15}/> Ausführen</button></div><textarea className="editor" value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}/></div><div className="console"><div className="console-title">Ausgabe</div><pre>{consoleText || "Deine Ausgabe erscheint hier."}</pre></div></>}

      {visualCode && !visualCode.includes("____") && <div className="practice-viz-toggle"><button className="ghost" onClick={()=>setShowVisualizer(v=>!v)}><Eye size={16}/> {showVisualizer?"Visualizer schließen":"Code Schritt für Schritt"}</button></div>}
      {showVisualizer && visualCode && !visualCode.includes("____") && <BasicVisualizer code={visualCode}/>} 

      {result && <div className={`feedback ${result.passed?"success":"error"}`}><strong>{result.passed?"Richtig – das sitzt.":"Noch nicht sicher."}</strong><p>{exercise.explanation}</p></div>}
      <div className="practice-actions">{!result ? <button className="primary" onClick={check} disabled={(exercise.type==="predict"||exercise.type==="debug")&&selected===null}><CheckCircle2 size={17}/> Prüfen</button> : <button className="primary" onClick={next}>{index===pool.length-1?<RefreshCcw size={17}/>:<ChevronRight size={17}/>} {index===pool.length-1?"Neue Runde":"Nächste Aufgabe"}</button>}</div>
    </div>
  </section>;
}
