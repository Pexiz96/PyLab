"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, HelpCircle, Lightbulb, MessageCircleQuestion, Send, ShieldAlert } from "lucide-react";

const TERMS = {
  funktion:{aliases:["funktion","funktionen"],what:"Eine Funktion ist ein benannter Codeblock, den du bei Bedarf aufrufen kannst. Sie kann Werte über Parameter erhalten und mit `return` ein Ergebnis zurückgeben.",when:"Funktionen helfen dir, Code wiederzuverwenden, große Programme in kleinere Teile zu zerlegen und Abläufe verständlicher zu machen.",how:"Du schreibst eine Funktion mit `def`:\n\ndef begruessen(name):\n    print(\"Hallo\", name)\n\nbegruesse = begruessen(\"Mia\")",example:"def addiere(a, b):\n    return a + b\n\nprint(addiere(2, 3))"},
  def:{aliases:["def","funktion definieren","funktion erstellen"],what:"`def` ist das Python-Schlüsselwort, mit dem du eine Funktion definierst.",when:"Du brauchst `def`, wenn du einen Ablauf als eigene Funktion zusammenfassen möchtest.",how:"Grundform:\n\ndef funktionsname(parameter):\n    # eingerückter Funktionskörper\n    return ergebnis",example:"def verdopple(zahl):\n    return zahl * 2"},
  methode:{aliases:["methode","methoden","method"],what:"Eine Methode ist eine Funktion, die zu einem Objekt oder einer Klasse gehört. Beispiel: `liste.append(5)` – `append()` ist eine Methode der Liste.",when:"Methoden benutzt du, wenn ein Objekt eine passende Aktion ausführen soll, zum Beispiel eine Liste erweitern oder bei einem eigenen Objekt Daten verarbeiten.",how:"Eine eigene Instanzmethode schreibst du innerhalb einer Klasse. Der erste Parameter ist normalerweise `self`:\n\nclass Hund:\n    def bellen(self):\n        print(\"Wuff\")\n\nhund = Hund()\nhund.bellen()",example:"class Konto:\n    def einzahlen(self, betrag):\n        self.guthaben += betrag"},
  parameter:{aliases:["parameter","parametern"],what:"Ein Parameter ist ein Platzhalter in der Funktionsdefinition. In `def hallo(name):` ist `name` der Parameter.",when:"Parameter brauchst du, wenn eine Funktion mit unterschiedlichen Werten arbeiten soll.",how:"def addiere(a, b):\n    return a + b\n\n`a` und `b` sind Parameter.",example:"def begruessen(name):\n    print(\"Hallo\", name)"},
  argument:{aliases:["argument","argumente","argumenten"],what:"Ein Argument ist der konkrete Wert, den du beim Funktionsaufruf übergibst. Bei `addiere(2, 3)` sind 2 und 3 Argumente.",when:"Argumente benutzt du beim Aufruf einer Funktion, wenn deren Parameter konkrete Werte erhalten sollen.",how:"def quadrat(zahl):\n    return zahl * zahl\n\nquadrat(5)  # 5 ist das Argument",example:"print(addiere(10, 20))"},
  return:{aliases:["return","zurückgeben","zurueckgeben"],what:"`return` gibt einen Wert aus einer Funktion an den Aufrufer zurück. Dadurch kannst du mit dem Ergebnis weiterarbeiten.",when:"Du brauchst `return`, wenn eine Funktion ein Ergebnis liefern soll, das später gespeichert, verglichen oder weiterberechnet wird.",how:"def verdopple(zahl):\n    return zahl * 2\n\nergebnis = verdopple(4)",example:"def ist_gerade(zahl):\n    return zahl % 2 == 0"},
  self:{aliases:["self"],what:"`self` bezeichnet innerhalb einer Instanzmethode das konkrete Objekt, mit dem gerade gearbeitet wird.",when:"Du brauchst `self`, wenn eine Methode auf Attribute oder andere Methoden desselben Objekts zugreifen soll.",how:"class Person:\n    def __init__(self, name):\n        self.name = name\n\n    def vorstellen(self):\n        print(self.name)",example:"self.guthaben = 0"},
  klasse:{aliases:["klasse","class","klassen"],what:"Eine Klasse ist ein Bauplan für Objekte. Sie beschreibt, welche Daten und Methoden diese Objekte besitzen.",when:"Klassen sind sinnvoll, wenn du mehrere ähnliche Dinge mit gemeinsamen Eigenschaften und Verhalten modellieren möchtest.",how:"class Person:\n    def __init__(self, name):\n        self.name = name",example:"person = Person(\"Mia\")"},
  objekt:{aliases:["objekt","instanz","objekte","instanzen"],what:"Ein Objekt ist eine konkrete Instanz einer Klasse. Die Klasse ist der Bauplan, das Objekt ist das daraus erzeugte Exemplar.",when:"Objekte benutzt du, wenn du konkrete Daten mit passendem Verhalten zusammenhalten möchtest.",how:"class Auto:\n    pass\n\nmein_auto = Auto()",example:"person = Person(\"Mia\")"},
  init:{aliases:["__init__","init","konstruktor"],what:"`__init__()` ist eine spezielle Methode, die beim Erzeugen eines neuen Objekts automatisch aufgerufen wird. Dort setzt du häufig Startwerte für Attribute.",when:"Du brauchst `__init__()`, wenn ein neues Objekt direkt bestimmte Daten erhalten oder initialisiert werden soll.",how:"class Person:\n    def __init__(self, name):\n        self.name = name",example:"person = Person(\"Mia\")"},
  variable:{aliases:["variable","variablen"],what:"Eine Variable ist ein Name, der auf einen Wert verweist. Mit `alter = 30` bekommt der Name `alter` den Wert 30.",when:"Variablen brauchst du, um Werte zu speichern und später wiederzuverwenden.",how:"name = \"Mia\"\nalter = 30",example:"punkte = 10\npunkte += 5"},
  string:{aliases:["string","str","text"],what:"Ein String ist Text. Strings stehen normalerweise in Anführungszeichen, zum Beispiel `\"Hallo\"`.",when:"Strings brauchst du für Namen, Nachrichten, Texteingaben und andere Zeichenfolgen.",how:"name = \"Mia\"\nprint(name.upper())",example:"text = \"Python\""},
  integer:{aliases:["integer","int","int()","ganzzahl"],what:"Ein Integer (`int`) ist eine Ganzzahl wie 5, -3 oder 100. `int()` kann passende Werte in eine Ganzzahl umwandeln.",when:"Du brauchst Integer für Zählwerte und Berechnungen ohne Nachkommastellen.",how:"alter = int(input(\"Alter: \"))",example:"zahl = 42"},
  float:{aliases:["float","kommazahl","gleitkommazahl"],what:"Ein Float ist eine Zahl mit Nachkommastellen, zum Beispiel `3.14`.",when:"Floats brauchst du für Berechnungen mit Dezimalwerten.",how:"preis = 19.99",example:"durchschnitt = 7 / 2  # 3.5"},
  boolean:{aliases:["bool","boolean","true","false"],what:"Ein Boolean hat genau zwei mögliche Werte: `True` oder `False`.",when:"Booleans brauchst du für Bedingungen und Zustände, zum Beispiel ob ein Benutzer angemeldet ist.",how:"ist_volljaehrig = alter >= 18",example:"spiel_vorbei = False"},
  input:{aliases:["input","input()","eingabe"],what:"`input()` wartet auf eine Eingabe des Nutzers und liefert sie immer als String zurück.",when:"Du brauchst `input()`, wenn dein Programm während der Ausführung Daten vom Nutzer entgegennehmen soll.",how:"name = input(\"Wie heißt du? \" )",example:"alter = int(input(\"Alter: \"))"},
  print:{aliases:["print","print()","ausgeben","ausgabe"],what:"`print()` gibt Werte in der Konsole aus.",when:"Du benutzt `print()` für Ausgaben, Tests und zum Nachvollziehen von Programmen.",how:"print(\"Hallo\")",example:"print(\"Ergebnis:\", 5 + 3)"},
  list:{aliases:["liste","list","list()"],what:"Eine Liste speichert mehrere Werte in einer Reihenfolge. Listen sind veränderbar und beginnen beim Index 0.",when:"Listen sind sinnvoll, wenn du mehrere zusammengehörige Werte speichern und verändern möchtest.",how:"namen = [\"Ana\", \"Ben\"]\nnamen.append(\"Mia\")",example:"print(namen[0])"},
  tuple:{aliases:["tupel","tuple","tuple()"],what:"Ein Tupel speichert mehrere Werte ähnlich wie eine Liste, ist aber nach dem Erstellen nicht veränderbar.",when:"Tupel sind sinnvoll, wenn eine feste Gruppe von Werten nicht verändert werden soll.",how:"punkt = (10, 20)",example:"x, y = punkt"},
  dictionary:{aliases:["dictionary","dict","dict()","wörterbuch","woerterbuch"],what:"Ein Dictionary speichert Werte als Schlüssel-Wert-Paare.",when:"Dictionaries sind sinnvoll, wenn Werte über aussagekräftige Schlüssel statt nur über Zahlenindizes erreichbar sein sollen.",how:"person = {\"name\": \"Mia\", \"alter\": 30}",example:"print(person[\"name\"])"},
  set:{aliases:["set","menge"],what:"Ein Set ist eine ungeordnete Sammlung eindeutiger Werte. Doppelte Werte werden nicht mehrfach gespeichert.",when:"Sets sind praktisch, wenn du Duplikate entfernen oder Mengenoperationen durchführen möchtest.",how:"zahlen = {1, 2, 3}",example:"einzigartig = set([1, 1, 2, 3])"},
  append:{aliases:["append","append()","anhängen","anhaengen"],what:"`append()` ist eine Listenmethode und hängt genau ein neues Element ans Ende einer Liste.",when:"Du brauchst `append()`, wenn eine bestehende Liste um ein Element erweitert werden soll.",how:"zahlen = [1, 2]\nzahlen.append(3)",example:"# danach: [1, 2, 3]"},
  len:{aliases:["len","len()","länge","laenge"],what:"`len()` gibt die Anzahl der Elemente einer Sammlung oder die Anzahl der Zeichen eines Strings zurück.",when:"Du brauchst `len()`, wenn du wissen möchtest, wie viele Elemente oder Zeichen vorhanden sind.",how:"print(len([10, 20, 30]))",example:"len(\"Hallo\")  # 5"},
  index:{aliases:["index","indizes"],what:"Ein Index ist die Position eines Elements. In Python beginnt die Zählung meistens bei 0.",when:"Du brauchst einen Index, um gezielt auf einzelne Elemente in Listen, Strings oder Tupeln zuzugreifen.",how:"namen = [\"Ana\", \"Ben\"]\nprint(namen[0])",example:"wort = \"Python\"\nprint(wort[1])  # y"},
  range:{aliases:["range","range()"],what:"`range()` erzeugt eine Zahlenfolge, die häufig in `for`-Schleifen benutzt wird. `range(1, 4)` liefert 1, 2 und 3.",when:"Du brauchst `range()`, wenn eine Schleife eine bestimmte Anzahl von Durchläufen oder einen Zahlenbereich durchlaufen soll.",how:"for zahl in range(1, 4):\n    print(zahl)",example:"range(0, 10, 2)"},
  for:{aliases:["for-schleife","for schleife","for"],what:"Eine `for`-Schleife durchläuft nacheinander Elemente einer Sammlung oder Zahlenfolge.",when:"Du benutzt `for`, wenn du weißt, über welche Werte oder Elemente du iterieren möchtest.",how:"for name in namen:\n    print(name)",example:"for i in range(3):\n    print(i)"},
  while:{aliases:["while-schleife","while schleife","while"],what:"Eine `while`-Schleife wiederholt Code, solange ihre Bedingung `True` ist.",when:"Du benutzt `while`, wenn die Anzahl der Durchläufe vorher nicht unbedingt feststeht.",how:"zahl = 1\nwhile zahl <= 3:\n    print(zahl)\n    zahl += 1",example:"while not fertig:\n    ..."},
  if:{aliases:["if","bedingung","bedingungen"],what:"`if` prüft eine Bedingung. Ist sie `True`, wird der eingerückte Code ausgeführt.",when:"Du brauchst `if`, wenn dein Programm abhängig von einer Situation unterschiedliche Entscheidungen treffen soll.",how:"if alter >= 18:\n    print(\"volljährig\")",example:"if zahl % 2 == 0:\n    print(\"gerade\")"},
  elif:{aliases:["elif"],what:"`elif` bedeutet sinngemäß „sonst, wenn“. Es prüft eine weitere Bedingung, falls vorherige Bedingungen falsch waren.",when:"Du brauchst `elif`, wenn es mehr als zwei mögliche Fälle gibt.",how:"if note == 1:\n    print(\"sehr gut\")\nelif note == 2:\n    print(\"gut\")",example:"elif alter >= 16:"},
  else:{aliases:["else"],what:"`else` ist der Auffangzweig: Er läuft, wenn keine vorherige Bedingung erfüllt wurde.",when:"Du brauchst `else`, wenn du einen Standardfall für alle übrigen Situationen behandeln möchtest.",how:"if alter >= 18:\n    print(\"Ja\")\nelse:\n    print(\"Nein\")",example:"else:\n    print(\"unbekannt\")"},
  modulo:{aliases:["modulo","%","prozent operator"],what:"`%` ist der Modulo-Operator. Er liefert den Rest einer Division. `7 % 2` ergibt 1.",when:"Modulo brauchst du zum Beispiel, um gerade/ungerade Zahlen zu erkennen oder Teilbarkeit zu prüfen.",how:"rest = 7 % 2",example:"if zahl % 2 == 0:\n    print(\"gerade\")"},
  exception:{aliases:["exception","exceptions","ausnahme","fehlerbehandlung"],what:"Eine Exception ist ein Fehler, der während der Programmausführung auftritt, zum Beispiel `ValueError` oder `IndexError`.",when:"Exceptions behandelst du, wenn dein Programm auf erwartbare Fehler kontrolliert reagieren soll.",how:"try:\n    zahl = int(text)\nexcept ValueError:\n    print(\"Keine Zahl\")",example:"raise ValueError(\"Ungültiger Wert\")"},
  try:{aliases:["try","try except","try/except"],what:"Mit `try` führst du Code aus, bei dem eine Exception auftreten könnte. Mit `except` reagierst du auf den Fehler.",when:"Du brauchst `try/except`, wenn ein Fehler möglich ist und dein Programm trotzdem sinnvoll weiterlaufen soll.",how:"try:\n    zahl = int(input())\nexcept ValueError:\n    print(\"Bitte Zahl eingeben\")",example:"try:\n    ...\nfinally:\n    ..."},
  import:{aliases:["import","importieren"],what:"Mit `import` bindest du Funktionen, Klassen oder Konstanten aus einem anderen Modul ein.",when:"Du brauchst `import`, wenn du Code aus der Standardbibliothek, installierten Paketen oder eigenen Modulen verwenden möchtest.",how:"import math\nprint(math.sqrt(9))",example:"from pathlib import Path"},
  comprehension:{aliases:["comprehension","list comprehension","listen comprehension"],what:"Eine Comprehension ist eine kompakte Schreibweise, um aus vorhandenen Daten neue Sammlungen zu erzeugen.",when:"Sie ist sinnvoll für kurze, gut lesbare Transformationen oder Filterungen.",how:"quadrate = [x * x for x in range(5)]",example:"gerade = [x for x in zahlen if x % 2 == 0]"},
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
  if (action === "mistake") return "Prüfe zuerst Datentypen, Einrückung, Namen, Operatoren und den Ablauf Zeile für Zeile. Wenn du mir den konkreten Code oder Fehler nennst, kann ich gezielter helfen.";
  if (action === "test") {
    if (step?.code) return `Mini-Test: Lies diesen Code ohne ihn auszuführen und erkläre, was nach jeder Zeile passiert und welche Ausgabe entsteht:\n\n${step.code}`;
    return `Mini-Test: Erkläre in deinen eigenen Worten, wofür du „${lesson?.title || "dieses Thema"}“ in einem echten Programm einsetzen würdest.`;
  }
  return first;
}

function normalize(text) {
  return text.toLowerCase().replace(/[?!.:,;]/g," ").replace(/\s+/g," ").trim();
}

function detectTerm(q) {
  const normalized = normalize(q);
  const entries = Object.entries(TERMS).sort((a,b)=>Math.max(...b[1].aliases.map(x=>x.length))-Math.max(...a[1].aliases.map(x=>x.length)));
  return entries.find(([,data]) => data.aliases.some(alias => normalized.includes(normalize(alias))))?.[0] || null;
}

function detectIntent(q) {
  if (/wie schreibe|wie erstellt|wie erstelle|wie definiere|wie mache|syntax|schreibweise/.test(q)) return "how";
  if (/wann|wofür|wofuer|wozu|wo brauche|wann brauche/.test(q)) return "when";
  if (/beispiel|zeig|zeige|wie benutze|wie verwende/.test(q)) return "example";
  if (/unterschied|unterscheidet|versus| vs |statt/.test(q)) return "difference";
  if (/warum/.test(q)) return "why";
  if (/was ist|was sind|was bedeutet|bedeutet|erklär.*was|erklaer.*was/.test(q)) return "what";
  if (/fehler|falsch|funktioniert nicht|klappt nicht|error/.test(q)) return "mistake";
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
  if (intent === "how") return term.how || term.example;
  if (intent === "example") return term.example || term.how;
  if (intent === "difference") {
    if (q.includes("return") && q.includes("print")) return "`print()` zeigt einen Wert nur an. `return` gibt einen Wert aus einer Funktion zurück, sodass das Programm damit weiterarbeiten kann.";
    if (q.includes("funktion") && q.includes("methode")) return "Eine Funktion steht selbstständig, zum Beispiel `len(liste)`. Eine Methode gehört zu einem Objekt oder einer Klasse und wird meist mit Punkt aufgerufen, zum Beispiel `liste.append(5)`. Methoden sind also Funktionen, die an einen Typ bzw. ein Objekt gebunden sind.";
    if (q.includes("liste") && q.includes("tupel")) return "Listen sind veränderbar, Tupel nicht. Beide speichern mehrere Werte in einer Reihenfolge und benutzen Indizes.";
    return `${term.what}\n\n${term.when}`;
  }
  return `${term.what}\n\n${term.when}`;
}

function contextualReply(question, lesson, step, awaitingTest) {
  const q = normalize(question);
  const context = stepText(lesson, step);

  if (awaitingTest) {
    return "Danke. Ich bewerte bei freien Antworten den inhaltlichen Kern und nicht eine exakte Formulierung. Wenn deine Aussage den Ablauf und das Ergebnis richtig beschreibt, zählt sie als verstanden.";
  }

  const intent = detectIntent(q);
  const termKey = detectTerm(q);
  if (termKey) return termReply(termKey, intent, q);

  if (intent === "mistake") return quickAnswer("mistake", lesson, step);
  if (intent === "simple") return quickAnswer("simple", lesson, step);
  if (intent === "test") return quickAnswer("test", lesson, step);
  if (intent === "hint") return "Hinweis: Zerlege die Aufgabe. Welche Eingaben hast du? Welches Ergebnis wird verlangt? Welche Python-Konstrukte kennst du, die diese beiden Seiten verbinden?";
  if (intent === "why") return quickAnswer("why", lesson, step);

  if (/python|programmieren|programmierung/.test(q)) return "Ich kann dir Fragen zur Python-Syntax, zu Datentypen, Bedingungen, Schleifen, Funktionen, Methoden, OOP, Fehlerbehandlung, Dateien, Modulen und vielen weiteren PyLab-Themen erklären. Nenne einfach den Begriff oder schreib deine konkrete Frage.";
  if (context.includes("funktion") || context.includes("return") || context.includes("def ")) return "Deine Frage passt zum Bereich Funktionen. Ich kann dir hier unter anderem `def`, Parameter, Argumente, Methoden, Funktionsaufrufe und `return` erklären. Wenn ein Begriff fehlt, sag ihn direkt – dann sollte ich nicht einfach dieselbe Standardantwort wiederholen.";

  return `Dazu habe ich im eingebauten Regelwissen noch keine sichere Antwort. Ich möchte dir nichts erfinden. Der aktuelle Kontext ist „${step?.title || lesson?.title || "Python"}“. Für wirklich beliebige Python-Fragen braucht PyLab zusätzlich eine generative KI-Verbindung.`;
}

export default function MentorPanel({lesson, step}) {
  const [action,setAction] = useState("simple");
  const [input,setInput] = useState("");
  const [awaitingTest,setAwaitingTest] = useState(false);
  const initial = useMemo(()=>quickAnswer(action,lesson,step),[action,lesson,step]);
  const [messages,setMessages] = useState([]);
  const chatRef = useRef(null);

  const actions = [
    ["simple","Einfacher erklären",Lightbulb],
    ["why","Warum brauche ich das?",HelpCircle],
    ["mistake","Typische Fehler",ShieldAlert],
    ["test","Teste mich",MessageCircleQuestion],
  ];

  useEffect(()=>{
    const chat = chatRef.current;
    if (!chat) return;
    requestAnimationFrame(()=>chat.scrollTo({top:chat.scrollHeight,behavior:"smooth"}));
  },[messages]);

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
    setAwaitingTest(/test|frag mich|abfragen|prüf mich|pruef mich/i.test(text));
    if (wasTest) setAwaitingTest(false);
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

    <div className="mentor-chat" ref={chatRef}>
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

    <div className="mentor-note">Der Mentor kennt jetzt deutlich mehr Python-Grundlagen und erkennt verschiedene Fragetypen. Für wirklich beliebige, frei formulierte Python-Fragen ist langfristig zusätzlich eine generative KI-Verbindung nötig.</div>
  </section>;
}
