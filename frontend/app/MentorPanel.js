"use client";

import { useMemo, useState } from "react";
import { Brain, HelpCircle, Lightbulb, MessageCircleQuestion, ShieldAlert } from "lucide-react";

function mentorAnswer(action, lesson, step) {
  const body = Array.isArray(step?.body) ? step.body : [];
  const first = body[0] || step?.question || step?.task || lesson?.subtitle || "Schau dir den aktuellen Schritt noch einmal genau an.";
  if (action === "simple") return `Ganz einfach: ${first}`;
  if (action === "why") return step?.term?.meaning || step?.callout?.text || `Dieses Thema ist wichtig, weil es ein Baustein für spätere Python-Aufgaben ist. Entscheidend ist nicht nur die Syntax, sondern zu verstehen, wann du sie einsetzen musst.`;
  if (action === "mistake") {
    if (step?.type === "code") return "Typischer Fehler: nur auf die gewünschte Ausgabe zu schauen. Prüfe zusätzlich Datentypen, Einrückung, Variablennamen und ob du den passenden Operator oder Kontrollfluss gewählt hast.";
    if (step?.type === "quiz") return "Typischer Fehler: die Antwort nach vertrauter Schreibweise auszuwählen, statt den Code Zeile für Zeile auszuführen. Gehe jeden Wert und jede Änderung einzeln durch.";
    return step?.callout?.text || "Typischer Fehler: Syntax auswendig zu lernen, ohne den Ablauf zu verstehen. Versuche vorherzusagen, was Python in jeder Zeile macht.";
  }
  if (action === "test") {
    if (step?.code) return `Mini-Test: Lies diesen Code ohne ihn auszuführen und erkläre, was nach jeder Zeile im Speicher steht und welche Ausgabe entsteht:\n\n${step.code}`;
    return `Mini-Test: Erkläre in deinen eigenen Worten den Unterschied zwischen „Syntax kennen“ und „wissen, wann du ${lesson?.title || "dieses Thema"} einsetzen musst“.`;
  }
  return first;
}

export default function MentorPanel({lesson, step}) {
  const [action,setAction] = useState("simple");
  const answer = useMemo(()=>mentorAnswer(action,lesson,step),[action,lesson,step]);
  const actions = [
    ["simple","Einfacher erklären",Lightbulb],
    ["why","Warum brauche ich das?",HelpCircle],
    ["mistake","Typische Fehler",ShieldAlert],
    ["test","Teste mich",MessageCircleQuestion],
  ];

  return <section className="feature-page mentor-page">
    <div className="path-heading"><span className="eyebrow">Lernmentor</span><h1>Hilfe passend zu deinem aktuellen Thema</h1><p>Der Mentor nutzt den aktuellen Lernschritt als Kontext und hilft dir beim Verstehen, Prüfen und Wiederholen.</p></div>
    <div className="mentor-context"><Brain/><div><span>Aktueller Kontext</span><strong>{lesson?.title}</strong><small>{step?.title}</small></div></div>
    <div className="mentor-actions">{actions.map(([id,label,Icon])=><button key={id} className={action===id?"active":""} onClick={()=>setAction(id)}><Icon size={17}/>{label}</button>)}</div>
    <div className="mentor-answer"><div className="mentor-avatar"><Brain/></div><div><span>PyLab Mentor</span><p>{answer}</p></div></div>
    <div className="mentor-note">Der eingebaute Mentor arbeitet aktuell mit deinen PyLab-Inhalten und festen Lernregeln. Dadurch funktioniert er ohne externe KI-Verbindung und erfindet keine neuen Kursinhalte.</div>
  </section>;
}
