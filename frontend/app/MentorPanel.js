"use client";

import { useMemo, useState } from "react";
import { Brain, HelpCircle, Lightbulb, MessageCircleQuestion, Send, ShieldAlert } from "lucide-react";

function stepText(lesson, step) {
  const body = Array.isArray(step?.body) ? step.body.join(" ") : "";
  return `${lesson?.title || ""} ${lesson?.subtitle || ""} ${step?.title || ""} ${body} ${step?.question || ""} ${step?.task || ""} ${step?.code || ""}`.toLowerCase();
}

function quickAnswer(action, lesson, step) {
  const body = Array.isArray(step?.body) ? step.body : [];
  const first = body[0] || step?.question || step?.task || lesson?.subtitle || "Schau dir den aktuellen Schritt noch einmal genau an.";

  if (action === "simple") return `Ganz einfach: ${first}`;
  if (action === "why") return step?.term?.meaning || step?.callout?.text || "Dieses Thema ist ein Baustein für spätere Python-Aufgaben. Wichtig ist nicht nur die Syntax, sondern zu verstehen, wann und warum du sie einsetzt.";
  if (action === "mistake") {
    if (step?.type === "code") return "Typische Fehler sind falsche Einrückung, ein unpassender Datentyp, ein falscher Variablenname oder der falsche Operator. Prüfe den Code deshalb Zeile für Zeile.";
    if (step?.type === "quiz") return "Lies den Code Zeile für Zeile und verfolge jeden Wert. Wähle die Antwort nicht nur danach aus, was dir bekannt vorkommt.";
    return step?.callout?.text || "Ein häufiger Fehler ist, Syntax nur auswendig zu lernen. Versuche zusätzlich zu erklären, was Python bei jeder Zeile tatsächlich macht.";
  }
  if (action === "test") {
    if (step?.code) return `Mini-Test: Lies diesen Code ohne ihn auszuführen und erkläre, was nach jeder Zeile passiert und welche Ausgabe entsteht:\n\n${step.code}`;
    return `Mini-Test: Erkläre in deinen eigenen Worten, wofür du „${lesson?.title || "dieses Thema"}“ in einem echten Programm einsetzen würdest.`;
  }
  return first;
}

function contextualReply(question, lesson, step, awaitingTest) {
  const q = question.trim().toLowerCase();
  const context = stepText(lesson, step);

  if (awaitingTest) {
    if (context.includes("print") && /erste|zweite|dritte|zeile|ausgabe|1|2|3/.test(q)) {
      return "Der Kern deiner Antwort passt: Die drei print()-Aufrufe werden nacheinander ausgeführt und geben jeweils ihren Text aus. Wichtig: Bei diesem Beispiel werden keine eigenen Variablen gespeichert. Wenn du möchtest, erkläre zusätzlich, warum die Reihenfolge genau so entsteht.";
    }
    return "Ich werte bei freien Antworten zuerst den inhaltlichen Kern. Beschreibe kurz, was Python der Reihe nach macht und welches Ergebnis entsteht. Eine andere Formulierung als meine Musterlösung ist völlig in Ordnung.";
  }

  if (/was ist|was bedeutet|bedeutet/.test(q)) {
    if (q.includes("%") || q.includes("modulo")) return "% heißt Modulo-Operator. Er liefert den Rest einer Division. Beispiel: 7 % 2 ergibt 1, weil nach 7 durch 2 der Rest 1 bleibt.";
    if (q.includes("return")) return "return beendet eine Funktion an dieser Stelle und gibt einen Wert an den Aufrufer zurück. Anders als print() zeigt return den Wert nicht einfach nur an, sondern macht ihn außerhalb der Funktion weiterverwendbar.";
    if (q.includes("range")) return "range() erzeugt eine Zahlenfolge für Schleifen. Bei range(1, 4) entstehen 1, 2 und 3. Der Endwert 4 gehört nicht mehr dazu.";
    if (q.includes("self")) return "self bezeichnet innerhalb einer Klasse das konkrete Objekt, mit dem gerade gearbeitet wird. Über self.name greifst du zum Beispiel auf das Attribut name dieses Objekts zu.";
  }

  if (/warum/.test(q)) {
    if (q.includes("int") || context.includes("input")) return "input() liefert Text, also einen String. Wenn du mit einer eingegebenen Ganzzahl rechnen möchtest, wandelst du sie mit int() um. Sonst würde Python zum Beispiel Text und Zahl miteinander verrechnen sollen.";
    if (q.includes("range")) return "range() ist praktisch, weil du damit festlegen kannst, welche Zahlen eine for-Schleife nacheinander durchlaufen soll, ohne jede Zahl selbst aufzuschreiben.";
    return quickAnswer("why", lesson, step);
  }

  if (/fehler|falsch|funktioniert nicht|klappt nicht/.test(q)) return quickAnswer("mistake", lesson, step);
  if (/einfach|leichter|versteh.*nicht|nicht verstanden/.test(q)) return quickAnswer("simple", lesson, step);
  if (/test|frag mich|abfragen|prüf mich|pruef mich/.test(q)) return quickAnswer("test", lesson, step);
  if (/hinweis|tipp/.test(q)) return "Hinweis: Löse nicht sofort die ganze Aufgabe. Frage dich zuerst: Welche Werte habe ich? Welches Ergebnis brauche ich? Und welches Python-Werkzeug verbindet beides?";

  if (context.includes("schleif") || context.includes("range")) return "Beim aktuellen Thema geht es um Wiederholungen. Denk bei einer Schleife immer an drei Fragen: Welche Werte werden durchlaufen? Was passiert pro Durchlauf? Wann endet die Schleife?";
  if (context.includes("funktion") || context.includes("return")) return "Beim aktuellen Thema geht es um Funktionen. Parameter nehmen Werte entgegen, der Funktionskörper verarbeitet sie und return kann ein Ergebnis zurückgeben. Frag mich gern konkret nach einem dieser Teile.";
  if (context.includes("liste")) return "Bei Listen sind besonders Index, Veränderbarkeit und Methoden wie append() wichtig. Der erste Index ist immer 0. Stell mir gern eine konkrete Frage zu deinem aktuellen Beispiel.";
  if (context.includes("if") || context.includes("beding")) return "Bei Bedingungen entscheidet ein Ausdruck mit True oder False, welcher Code ausgeführt wird. Wenn du mir sagst, welche Zeile dir unklar ist, erkläre ich genau diesen Teil.";

  return `Ich beziehe mich auf „${step?.title || lesson?.title || "dein aktuelles Thema"}“. Formuliere deine Frage möglichst konkret, zum Beispiel „Warum brauche ich das?“, „Was macht diese Zeile?“ oder „Warum ist meine Lösung falsch?“.`;
}

export default function MentorPanel({lesson, step}) {
  const [action,setAction] = useState("simple");
  const [input,setInput] = useState("");
  const [awaitingTest,setAwaitingTest] = useState(false);
  const initial = useMemo(()=>quickAnswer(action,lesson,step),[action,lesson,step]);
  const [messages,setMessages] = useState([]);

  const actions = [
    ["simple","Einfacher erklären",Lightbulb],
    ["why","Warum brauche ich das?",HelpCircle],
    ["mistake","Typische Fehler",ShieldAlert],
    ["test","Teste mich",MessageCircleQuestion],
  ];

  function useAction(id) {
    setAction(id);
    const text = quickAnswer(id, lesson, step);
    setMessages(prev => [...prev, {role:"mentor", text}]);
    setAwaitingTest(id === "test");
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const wasTest = awaitingTest;
    const reply = contextualReply(text, lesson, step, wasTest);
    setMessages(prev => [...prev, {role:"user", text}, {role:"mentor", text:reply}]);
    setInput("");
    if (wasTest) setAwaitingTest(false);
    if (/test|frag mich|abfragen|prüf mich|pruef mich/i.test(text)) setAwaitingTest(true);
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  const visibleMessages = messages.length ? messages : [{role:"mentor", text:initial}];

  return <section className="feature-page mentor-page">
    <div className="path-heading"><span className="eyebrow">Lernmentor</span><h1>Hilfe passend zu deinem aktuellen Thema</h1><p>Frage frei nach, lass dir etwas erklären oder antworte direkt auf eine Testfrage.</p></div>
    <div className="mentor-context"><Brain/><div><span>Aktueller Kontext</span><strong>{lesson?.title}</strong><small>{step?.title}</small></div></div>
    <div className="mentor-actions">{actions.map(([id,label,Icon])=><button key={id} className={action===id?"active":""} onClick={()=>useAction(id)}><Icon size={17}/>{label}</button>)}</div>

    <div className="mentor-chat">
      {visibleMessages.map((message,index)=><div key={`${message.role}-${index}`} className={`mentor-message ${message.role}`}>
        {message.role === "mentor" && <div className="mentor-avatar"><Brain/></div>}
        <div className="mentor-bubble"><span>{message.role === "mentor" ? "PyLab Mentor" : "Du"}</span><p>{message.text}</p></div>
      </div>)}
    </div>

    <div className="mentor-input-row">
      <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKeyDown} placeholder={awaitingTest ? "Schreibe deine Antwort auf die Testfrage …" : "Stell dem Lernmentor eine Frage …"} rows={2}/>
      <button onClick={sendMessage} disabled={!input.trim()} aria-label="Nachricht senden"><Send size={18}/><span>Senden</span></button>
    </div>
    <div className="mentor-input-hint">Enter = senden · Shift + Enter = neue Zeile</div>

    <div className="mentor-note">Der Mentor nutzt aktuell PyLab-Inhalte und feste Lernregeln. Er kann freie Fragen im aktuellen Lernkontext beantworten, ist aber noch keine externe generative KI.</div>
  </section>;
}
