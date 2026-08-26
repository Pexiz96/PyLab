"use client";

import { useMemo, useState } from "react";
import { Brain, HelpCircle, Lightbulb, MessageCircleQuestion, Send, ShieldAlert } from "lucide-react";

const TERMS = {
  def: {
    aliases:["def","funktion definieren","funktion erstellen"],
    what:"`def` ist das Python-Schlüsselwort, mit dem du eine Funktion definierst. Hinter `def` stehen der Funktionsname und runde Klammern. Beispiel:\n\ndef begruessen():\n    print(\"Hallo\")",
    when:"Du brauchst `def`, wenn du einen Ablauf als eigene Funktion zusammenfassen möchtest – besonders wenn du denselben Code mehrfach brauchst, ihn übersichtlicher machen oder Werte über Parameter verarbeiten willst.",
    example:"Beispiel für `def`:\n\ndef addiere(a, b):\n    return a + b\n\nergebnis = addiere(2, 3)\nprint(ergebnis)\n\n`def addiere(a, b):` erstellt die Funktion. Erst `addiere(2, 3)` führt sie aus.",
  },
  return: {
    aliases:["return","zurückgeben","zurueckgeben"],
    what:"`return` gibt einen Wert aus einer Funktion an die Stelle zurück, an der die Funktion aufgerufen wurde. Dadurch kannst du mit dem Ergebnis weiterarbeiten.",
    when:"Du brauchst `return`, wenn eine Funktion ein Ergebnis liefern soll, das später gespeichert, verglichen oder weiterberechnet wird. Nur etwas auf dem Bildschirm zu zeigen ist dagegen die Aufgabe von `print()`.",
    example:"def verdopple(zahl):\n    return zahl * 2\n\nergebnis = verdopple(4)\n\nDanach enthält `ergebnis` den Wert 8.",
  },
  range: {
    aliases:["range","range()"],
    what:"`range()` erzeugt eine Zahlenfolge, die sehr häufig in `for`-Schleifen benutzt wird. `range(1, 4)` liefert 1, 2 und 3; der Endwert 4 ist nicht mehr enthalten.",
    when:"Du brauchst `range()`, wenn eine Schleife eine bestimmte Anzahl von Durchläufen oder einen bestimmten Zahlenbereich durchlaufen soll.",
    example:"for zahl in range(1, 4):\n    print(zahl)\n\nAusgabe: 1, 2 und 3 jeweils in einer neuen Zeile.",
  },
  modulo: {
    aliases:["modulo","%","prozent operator"],
    what:"`%` ist der Modulo-Operator. Er liefert den Rest einer Division. `7 % 2` ergibt 1.",
    when:"Modulo brauchst du zum Beispiel, um gerade und ungerade Zahlen zu erkennen, wiederkehrende Muster zu bauen oder zu prüfen, ob eine Zahl ohne Rest teilbar ist.",
    example:"zahl = 8\nif zahl % 2 == 0:\n    print(\"gerade\")",
  },
  int: {
    aliases:["int","int()","integer"],
    what:"`int()` wandelt einen passenden Wert in eine Ganzzahl um. `int(\"5\")` ergibt die Zahl 5.",
    when:"Du brauchst `int()` häufig nach `input()`, weil `input()` immer Text zurückgibt. Wenn du mit der Eingabe rechnen willst, musst du den Text zuerst in eine Zahl umwandeln.",
    example:"alter = int(input(\"Alter: \"))\nprint(alter + 1)",
  },
  input: {
    aliases:["input","input()","eingabe"],
    what:"`input()` wartet auf eine Eingabe des Nutzers und gibt diese immer als String, also Text, zurück.",
    when:"Du brauchst `input()`, wenn dein Programm während der Ausführung Daten vom Nutzer entgegennehmen soll.",
    example:"name = input(\"Wie heißt du? \" )\nprint(\"Hallo\", name)",
  },
  self: {
    aliases:["self"],
    what:"`self` bezeichnet innerhalb einer Klasse das konkrete Objekt, mit dem gerade gearbeitet wird. `self.name` ist zum Beispiel das Attribut `name` genau dieses Objekts.",
    when:"Du brauchst `self` in Instanzmethoden einer Klasse, wenn du auf Attribute oder andere Methoden des aktuellen Objekts zugreifen möchtest.",
    example:"class Person:\n    def __init__(self, name):\n        self.name = name",
  },
  list: {
    aliases:["liste","list","list()"],
    what:"Eine Liste speichert mehrere Werte in einer festen Reihenfolge. Listen sind veränderbar und beginnen beim Index 0.",
    when:"Eine Liste ist sinnvoll, wenn du mehrere zusammengehörige Werte speichern und später hinzufügen, entfernen oder einzeln über ihren Index ansprechen möchtest.",
    example:"namen = [\"Ana\", \"Ben\"]\nnamen.append(\"Mia\")\nprint(namen[0])",
  },
};

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

function detectTerm(q) {
  return Object.entries(TERMS).find(([,data]) => data.aliases.some(alias => q.includes(alias)))?.[0] || null;
}

function detectIntent(q) {
  if (/wann|wofür|wofuer|wann brauche|wo brauche|wozu/.test(q)) return "when";
  if (/beispiel|zeig.*beispiel|wie sieht.*aus|wie benutze|wie verwende/.test(q)) return "example";
  if (/unterschied|unterscheidet|versus| vs |statt/.test(q)) return "difference";
  if (/warum/.test(q)) return "why";
  if (/was ist|was bedeutet|bedeutet|erklär.*was|erklaer.*was/.test(q)) return "what";
  if (/fehler|falsch|funktioniert nicht|klappt nicht/.test(q)) return "mistake";
  if (/einfach|leichter|versteh.*nicht|nicht verstanden/.test(q)) return "simple";
  if (/test|frag mich|abfragen|prüf mich|pruef mich/.test(q)) return "test";
  if (/hinweis|tipp/.test(q)) return "hint";
  return "general";
}

function termReply(termKey, intent, q) {
  const term = TERMS[termKey];
  if (!term) return null;
  if (intent === "what") return term.what;
  if (intent === "when" || intent === "why") return term.when;
  if (intent === "example") return term.example;

  if (intent === "difference") {
    if ((termKey === "return" && q.includes("print")) || (termKey === "def" && q.includes("aufruf"))) {
      if (termKey === "return") return "`print()` zeigt einen Wert nur in der Ausgabe an. `return` gibt einen Wert aus einer Funktion zurück, sodass dein Programm damit weiterarbeiten kann. Beispiel: `x = verdopple(4)` funktioniert nur sinnvoll, wenn `verdopple()` den Wert mit `return` zurückgibt.";
      return "`def` erstellt bzw. definiert eine Funktion. Ein Funktionsaufruf führt sie aus. Beispiel: `def hallo(): ...` definiert die Funktion; `hallo()` ruft sie später auf.";
    }
    return `${term.what}\n\n${term.when}`;
  }
  return term.what;
}

function contextualReply(question, lesson, step, awaitingTest) {
  const q = question.trim().toLowerCase();
  const context = stepText(lesson, step);

  if (awaitingTest) {
    if (context.includes("print") && /erste|zweite|dritte|zeile|ausgabe|1|2|3/.test(q)) {
      return "Der Kern deiner Antwort passt: Die drei print()-Aufrufe werden nacheinander ausgeführt und geben jeweils ihren Text aus. Wichtig: Bei diesem Beispiel werden keine eigenen Variablen gespeichert.";
    }
    return "Ich werte zuerst den inhaltlichen Kern. Beschreibe kurz, was Python der Reihe nach macht und welches Ergebnis entsteht. Eine andere Formulierung als eine Musterlösung ist völlig in Ordnung.";
  }

  const intent = detectIntent(q);
  const termKey = detectTerm(q);
  if (termKey) {
    const reply = termReply(termKey, intent, q);
    if (reply) return reply;
  }

  if (intent === "mistake") return quickAnswer("mistake", lesson, step);
  if (intent === "simple") return quickAnswer("simple", lesson, step);
  if (intent === "test") return quickAnswer("test", lesson, step);
  if (intent === "hint") return "Hinweis: Löse nicht sofort die ganze Aufgabe. Frage dich zuerst: Welche Werte habe ich? Welches Ergebnis brauche ich? Und welches Python-Werkzeug verbindet beides?";
  if (intent === "why") return quickAnswer("why", lesson, step);

  if (context.includes("schleif") || context.includes("range")) return "Beim aktuellen Thema geht es um Wiederholungen. Frag mich zum Beispiel: „Was ist range()?“, „Wann brauche ich eine for-Schleife?“ oder „Warum endet range(1, 4) bei 3?“";
  if (context.includes("funktion") || context.includes("return") || context.includes("def ")) return "Beim aktuellen Thema geht es um Funktionen. Du kannst mich konkret nach `def`, Parametern, Argumenten, dem Funktionsaufruf oder `return` fragen.";
  if (context.includes("liste")) return "Bei Listen kannst du mich zum Beispiel nach Index, `append()`, Veränderbarkeit oder dem Unterschied zu Tupeln fragen.";
  if (context.includes("if") || context.includes("beding")) return "Bei Bedingungen kannst du mich konkret nach `if`, `elif`, `else`, Vergleichsoperatoren oder True/False fragen.";

  return `Ich beziehe mich auf „${step?.title || lesson?.title || "dein aktuelles Thema"}“. Frage möglichst konkret nach einem Begriff oder Zweck, zum Beispiel „Was ist def?“, „Wann brauche ich return?“ oder „Zeig mir ein Beispiel“. `;
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
