"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";

function parseValue(token, vars) {
  const text = token.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text in vars) return vars[text];
  return text;
}

function evalSimple(expr, vars) {
  const text = expr.trim();
  const comparison = text.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparison) {
    const left = evalSimple(comparison[1], vars);
    const right = evalSimple(comparison[3], vars);
    const op = comparison[2];
    if (op === "==") return left === right;
    if (op === "!=") return left !== right;
    if (op === ">=") return left >= right;
    if (op === "<=") return left <= right;
    if (op === ">") return left > right;
    if (op === "<") return left < right;
  }
  const math = text.match(/^(.+?)\s*(\+|-|\*|%|\/)\s*(.+)$/);
  if (math) {
    const left = evalSimple(math[1], vars);
    const right = evalSimple(math[3], vars);
    const op = math[2];
    if (op === "+") return left + right;
    if (op === "-") return left - right;
    if (op === "*") return left * right;
    if (op === "%") return left % right;
    if (op === "/") return left / right;
  }
  return parseValue(text, vars);
}

function rangeValues(args, vars) {
  const parts = args.split(",").map(x => Number(evalSimple(x, vars)));
  let start = 0, stop = 0, step = 1;
  if (parts.length === 1) stop = parts[0];
  if (parts.length >= 2) [start, stop] = parts;
  if (parts.length >= 3) step = parts[2];
  const result = [];
  if (!step) return result;
  if (step > 0) for (let value = start; value < stop && result.length < 50; value += step) result.push(value);
  else for (let value = start; value > stop && result.length < 50; value += step) result.push(value);
  return result;
}

function buildTrace(code) {
  const lines = code.split("\n");
  const vars = {};
  const output = [];
  const steps = [];

  function push(lineIndex, description) {
    steps.push({ lineIndex, description, vars: { ...vars }, output: [...output] });
  }

  let i = 0;
  while (i < lines.length && steps.length < 120) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) { i += 1; continue; }

    const forMatch = line.match(/^for\s+(\w+)\s+in\s+range\((.*)\):$/);
    if (forMatch) {
      const variable = forMatch[1];
      const values = rangeValues(forMatch[2], vars);
      const body = [];
      let j = i + 1;
      while (j < lines.length && /^\s+/.test(lines[j]) && lines[j].trim()) { body.push({ text: lines[j].trim(), index: j }); j += 1; }
      values.forEach(value => {
        vars[variable] = value;
        push(i, `Schleifendurchlauf: ${variable} bekommt den Wert ${value}.`);
        body.forEach(item => executeSimple(item.text, item.index));
      });
      i = j;
      continue;
    }

    const ifMatch = line.match(/^if\s+(.+):$/);
    if (ifMatch) {
      const passed = Boolean(evalSimple(ifMatch[1], vars));
      push(i, `Bedingung wird geprüft und ist ${passed ? "wahr" : "falsch"}.`);
      let j = i + 1;
      const ifBody = [];
      while (j < lines.length && /^\s+/.test(lines[j]) && lines[j].trim()) { ifBody.push({ text: lines[j].trim(), index: j }); j += 1; }
      let elseBody = [];
      if (j < lines.length && lines[j].trim() === "else:") {
        let k = j + 1;
        while (k < lines.length && /^\s+/.test(lines[k]) && lines[k].trim()) { elseBody.push({ text: lines[k].trim(), index: k }); k += 1; }
        j = k;
      }
      (passed ? ifBody : elseBody).forEach(item => executeSimple(item.text, item.index));
      i = j;
      continue;
    }

    executeSimple(line, i);
    i += 1;
  }

  function executeSimple(line, lineIndex) {
    const assignment = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignment) {
      const name = assignment[1];
      vars[name] = evalSimple(assignment[2], vars);
      push(lineIndex, `${name} erhält den Wert ${JSON.stringify(vars[name])}.`);
      return;
    }
    const printMatch = line.match(/^print\((.*)\)$/);
    if (printMatch) {
      const value = evalSimple(printMatch[1], vars);
      output.push(String(value));
      push(lineIndex, `${JSON.stringify(value)} wird ausgegeben.`);
      return;
    }
    push(lineIndex, "Diese Zeile wird ausgeführt. Für diesen Befehl zeigt der Basics-Visualizer noch keine Detailanalyse.");
  }

  return steps;
}

export default function BasicVisualizer({ code }) {
  const trace = useMemo(() => buildTrace(code || ""), [code]);
  const [index, setIndex] = useState(0);
  const current = trace[Math.min(index, Math.max(0, trace.length - 1))];
  const lines = (code || "").split("\n");

  if (!trace.length) return <div className="viz-empty">Für diesen Code gibt es noch keine visualisierbaren Basics-Schritte.</div>;

  return <div className="code-viz">
    <div className="viz-head"><div><span>Interaktiver Code-Visualizer</span><strong>Schritt {Math.min(index + 1, trace.length)} von {trace.length}</strong></div><button onClick={() => setIndex(0)}><RotateCcw size={15}/> Neu starten</button></div>
    <div className="viz-grid">
      <div className="viz-code">
        {lines.map((line, i) => <div key={i} className={`viz-line ${current?.lineIndex === i ? "active" : ""}`}><span>{i + 1}</span><code>{line || " "}</code>{current?.lineIndex === i && <Play size={14}/>}</div>)}
      </div>
      <div className="viz-state">
        <div className="viz-explanation">{current?.description}</div>
        <div className="viz-panel"><h4>Variablen</h4>{Object.keys(current?.vars || {}).length ? Object.entries(current.vars).map(([name, value]) => <div className="viz-variable" key={name}><code>{name}</code><span>→</span><strong>{JSON.stringify(value)}</strong></div>) : <p>Noch keine Variablen gesetzt.</p>}</div>
        <div className="viz-panel"><h4>Ausgabe</h4><pre>{current?.output?.length ? current.output.join("\n") : "Noch keine Ausgabe."}</pre></div>
      </div>
    </div>
    <div className="viz-controls"><button className="ghost" disabled={index === 0} onClick={() => setIndex(v => Math.max(0, v - 1))}><ChevronLeft size={17}/> Zurück</button><button className="primary" disabled={index >= trace.length - 1} onClick={() => setIndex(v => Math.min(trace.length - 1, v + 1))}>Nächster Schritt <ChevronRight size={17}/></button></div>
  </div>;
}
