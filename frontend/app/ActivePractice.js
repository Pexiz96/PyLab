"use client";

import { useMemo, useState } from "react";
import { Bug, CheckCircle2, ChevronRight, Code2, Eye, FileQuestion, PencilLine, Play, RefreshCcw } from "lucide-react";
import BasicVisualizer from "./BasicVisualizer";

const API = "/backend-api";

const EXERCISES = [
  {type:"predict",lessonIndex:0,title:"Was kommt raus?",code:'punkte = 5\npunkte = 8\nprint(punkte)',question:"Welche Ausgabe erzeugt der Code?",options:["5","8","punkte"],correct:1,explanation:"Die zweite Zuweisung ersetzt den vorherigen Wert. Deshalb wird 8 ausgegeben."},
  {type:"debug",lessonIndex:0,title:"Fehler finden",code:'print(Hallo)',question:"Warum entsteht hier ein Fehler?",options:["print() darf keinen Text ausgeben","Hallo wird ohne Anführungszeichen als Name interpretiert","Runde Klammern sind verboten"],correct:1,explanation:"Ohne Anführungszeichen sucht Python nach einer Variable namens Hallo."},
  {type:"predict",lessonIndex:1,title:"Datentyp verstehen",code:'zahl = "5"\nprint(zahl + zahl)',question:"Was wird ausgegeben?",options:["10","55","Fehler"],correct:1,explanation:"\"5\" ist ein String. Zwei Strings werden mit + aneinandergehängt."},
  {type:"fill",lessonIndex:2,title:"Lückencode",code:'rest = 7 __ 2\nprint(rest)',question:"Welcher Operator gehört in die Lücke, damit 1 ausgegeben wird?",answers:["%"],explanation:"% ist der Modulo-Operator. Er liefert den Rest einer Division."},
  {type:"debug",lessonIndex:3,title:"Typfehler erkennen",code:'alter = input("Alter: ")\nprint(alter + 1)',question:"Was muss geändert werden, damit gerechnet werden kann?",options:["input() durch print() ersetzen","alter vor der Addition mit int() umwandeln","Die 1 in Anführungszeichen setzen"],correct:1,explanation:"input() liefert immer einen String. Für eine Ganzzahlrechnung brauchst du int()."},
  {type:"predict",lessonIndex:4,title:"Bedingung lesen",code:'alter = 20\nif alter >= 18:\n    print("Ja")\nelse:\n    print("Nein")',question:"Welche Ausgabe erscheint?",options:["Ja","Nein","20"],correct:0,explanation:"20 ist größer oder gleich 18, deshalb wird der if-Zweig ausgeführt."},
  {type:"explain",lessonIndex:5,title:"Erkläre den Code",code:'for zahl in range(1, 4):\n    print(zahl)',question:"Erkläre in eigenen Worten, was die Schleife macht.",keywords:["1","2","3"],explanation:"Eine gute Erklärung nennt, dass die Schleife nacheinander die Werte 1, 2 und 3 verarbeitet und ausgibt."},
  {type:"fill",lessonIndex:5,title:"Schleife vervollständigen",code:'for zahl in ____(3):\n    print(zahl)',question:"Welche Funktion gehört in die Lücke?",answers:["range","range()"],explanation:"range() erzeugt die Zahlenfolge, über die die for-Schleife läuft."},
  {type:"challenge",lessonIndex:2,title:"Offene Problemlösung",question:"Schreibe ein Programm, das die Zahl 17 durch 5 teilt und nur den Rest ausgibt. Die Ausgabe muss exakt 2 sein.",starter:'# Schreibe deine Lösung hier\n',expected_output:"2",explanation:"Hier musst du selbst erkennen, dass der Modulo-Operator % gebraucht wird."},
  {type:"challenge",lessonIndex:5,title:"Basics kombinieren",question:"Gib mit einer Schleife die Zahlen 1 bis 3 jeweils in einer neuen Zeile aus. Die Ausgabe muss exakt 1, 2, 3 sein.",starter:'# Nutze eine Schleife\n',expected_output:"1\n2\n3",explanation:"Die Aufgabe verrät dir bewusst nicht die komplette Syntax. Du musst range() und for selbst kombinieren."},
];

function typeLabel(type) {
  return {predict:"Code vorhersagen",debug:"Fehler finden",fill:"Lückencode",explain:"Code erklären",challenge:"Problemlösen"}[type] || type;
}

export default function ActivePractice({ lessons, refreshProfile }) {
  const [index,setIndex] = useState(0);
  const [selected,setSelected] = useState(null);
  const [answer,setAnswer] = useState("");
  const [code,setCode] = useState(EXERCISES[0].starter || "");
  const [result,setResult] = useState(null);
  const [consoleText,setConsoleText] = useState("");
  const [showVisualizer,setShowVisualizer] = useState(false);
  const exercise = EXERCISES[index];
  const lesson = lessons[exercise.lessonIndex];
  const completed = useMemo(() => index + 1, [index]);
  const visualCode = exercise.type === "challenge" ? code : (exercise.code || "");

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
      const response = await fetch(`${API}/check`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,expected_output:exercise.expected_output,lesson_id:lesson?.id || "practice",step_id:`practice-${index}`,xp:25})});
      const data = await response.json();
      setConsoleText(data.stderr || data.stdout || "(keine Ausgabe)");
      setResult({passed:data.passed});
      await refreshProfile?.();
      return;
    }
    setResult({passed});
    await record(passed);
  }

  async function runCode() {
    const response = await fetch(`${API}/run`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
    const data = await response.json();
    setConsoleText(data.stderr || data.stdout || "(keine Ausgabe)");
  }

  function next() {
    const n = (index + 1) % EXERCISES.length;
    setIndex(n); setSelected(null); setAnswer(""); setResult(null); setConsoleText(""); setCode(EXERCISES[n].starter || ""); setShowVisualizer(false);
  }

  return <section className="practice-page">
    <div className="path-heading"><span className="eyebrow">Aktives Training</span><h1>Basics wirklich anwenden</h1><p>PyLab mischt verschiedene Lernformen. Du musst selbst erkennen, welches Wissen du brauchst.</p></div>
    <div className="practice-types">
      <span><FileQuestion/> Code vorhersagen</span><span><Bug/> Fehler finden</span><span><PencilLine/> Lückencode</span><span><Code2/> Erklären & programmieren</span>
    </div>
    <div className="practice-card">
      <div className="practice-head"><div><span>{typeLabel(exercise.type)}</span><h2>{exercise.title}</h2></div><strong>{completed} / {EXERCISES.length}</strong></div>
      {exercise.code && <pre className="code-block"><code>{exercise.code}</code></pre>}
      <p className="question">{exercise.question}</p>

      {(exercise.type === "predict" || exercise.type === "debug") && <div className="options">{exercise.options.map((o,i)=><button key={o} className={`option ${selected===i?"selected":""}`} disabled={result!==null} onClick={()=>setSelected(i)}><span>{String.fromCharCode(65+i)}</span><code>{o}</code></button>)}</div>}
      {(exercise.type === "fill" || exercise.type === "explain") && <textarea className="practice-answer" value={answer} disabled={result!==null} onChange={e=>setAnswer(e.target.value)} placeholder={exercise.type === "explain" ? "Erkläre den Ablauf in deinen eigenen Worten …" : "Deine Antwort …"}/>} 
      {exercise.type === "challenge" && <><div className="editor-shell"><div className="editor-toolbar"><span>practice.py</span><button onClick={runCode}><Play size={15}/> Ausführen</button></div><textarea className="editor" value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}/></div><div className="console"><div className="console-title">Ausgabe</div><pre>{consoleText || "Deine Ausgabe erscheint hier."}</pre></div></>}

      {visualCode && !visualCode.includes("____") && <div className="practice-viz-toggle"><button className="ghost" onClick={()=>setShowVisualizer(v=>!v)}><Eye size={16}/> {showVisualizer?"Visualizer schließen":"Code Schritt für Schritt"}</button></div>}
      {showVisualizer && visualCode && !visualCode.includes("____") && <BasicVisualizer code={visualCode}/>} 

      {result && <div className={`feedback ${result.passed?"success":"error"}`}><strong>{result.passed?"Richtig – das sitzt.":"Noch nicht sicher."}</strong><p>{exercise.explanation}</p></div>}
      <div className="practice-actions">{!result ? <button className="primary" onClick={check} disabled={(exercise.type==="predict"||exercise.type==="debug")&&selected===null}><CheckCircle2 size={17}/> Prüfen</button> : <button className="primary" onClick={next}>{index===EXERCISES.length-1?<RefreshCcw size={17}/>:<ChevronRight size={17}/>} {index===EXERCISES.length-1?"Neue Runde":"Nächste Aufgabe"}</button>}</div>
    </div>
  </section>;
}
