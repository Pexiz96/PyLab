"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";

function splitTopLevel(text, delimiter = ",") {
  const result = [];
  let current = "";
  let depth = 0;
  let quote = null;
  for (const char of text) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (["(", "[", "{"].includes(char)) depth += 1;
    if ([")", "]", "}"].includes(char)) depth -= 1;
    if (char === delimiter && depth === 0) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseValue(token, vars) {
  const text = token.trim();
  if (text === "True") return true;
  if (text === "False") return false;
  if (text === "None") return null;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) return splitTopLevel(text.slice(1, -1)).map(part => evalSimple(part, vars));
  if (text.startsWith("{") && text.endsWith("}")) {
    const obj = {};
    for (const part of splitTopLevel(text.slice(1, -1))) {
      const colon = part.indexOf(":");
      if (colon > -1) {
        const key = evalSimple(part.slice(0, colon), vars);
        obj[String(key)] = evalSimple(part.slice(colon + 1), vars);
      }
    }
    return obj;
  }
  const indexMatch = text.match(/^(\w+)\[(-?\d+|["'].+?["'])\]$/);
  if (indexMatch && indexMatch[1] in vars) {
    const source = vars[indexMatch[1]];
    const rawKey = indexMatch[2];
    const key = /^-?\d+$/.test(rawKey) ? Number(rawKey) : rawKey.slice(1, -1);
    return source?.[key];
  }
  if (text in vars) return vars[text];
  return text;
}

function evalSimple(expr, vars) {
  const text = expr.trim();
  const lenMatch = text.match(/^len\((.+)\)$/);
  if (lenMatch) {
    const value = evalSimple(lenMatch[1], vars);
    return value?.length ?? Object.keys(value || {}).length;
  }
  const comparison = text.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparison) {
    const left = evalSimple(comparison[1], vars);
    const right = evalSimple(comparison[3], vars);
    const op = comparison[2];
    return op === "==" ? left === right : op === "!=" ? left !== right : op === ">=" ? left >= right : op === "<=" ? left <= right : op === ">" ? left > right : left < right;
  }
  const math = text.match(/^(.+?)\s*(\+|-|\*|%|\/|\/\/)\s*(.+)$/);
  if (math) {
    const left = evalSimple(math[1], vars);
    const right = evalSimple(math[3], vars);
    const op = math[2];
    if (op === "+") return left + right;
    if (op === "-") return left - right;
    if (op === "*") return left * right;
    if (op === "%") return left % right;
    if (op === "//") return Math.floor(left / right);
    return left / right;
  }
  return parseValue(text, vars);
}

function rangeValues(args, vars) {
  const parts = splitTopLevel(args).map(x => Number(evalSimple(x, vars)));
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
  const functions = {};
  const classes = {};

  function cloneValue(value) {
    if (value && typeof value === "object") return JSON.parse(JSON.stringify(value));
    return value;
  }
  function snapshotVars() {
    return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, cloneValue(v)]));
  }
  function push(lineIndex, description, scope = "global") {
    steps.push({ lineIndex, description, vars: snapshotVars(), output: [...output], scope });
  }
  function collectIndented(start) {
    const body = [];
    let j = start;
    while (j < lines.length && (/^\s+/.test(lines[j]) || !lines[j].trim())) {
      if (lines[j].trim()) body.push({ text: lines[j].trim(), index: j });
      j += 1;
    }
    return { body, next: j };
  }
  function callFunction(name, argText, lineIndex) {
    const fn = functions[name];
    if (!fn) return undefined;
    const localVars = {};
    const args = splitTopLevel(argText).map(arg => evalSimple(arg, vars));
    fn.params.forEach((param, idx) => { localVars[param] = args[idx]; });
    push(lineIndex, `Funktion ${name}() wird aufgerufen. Parameter werden mit Argumenten belegt.`, name);
    let returnValue;
    for (const item of fn.body) {
      const assignment = item.text.match(/^(\w+)\s*=\s*(.+)$/);
      const returnMatch = item.text.match(/^return\s+(.+)$/);
      const printMatch = item.text.match(/^print\((.*)\)$/);
      if (assignment) {
        localVars[assignment[1]] = evalSimple(assignment[2], { ...vars, ...localVars });
        steps.push({ lineIndex: item.index, description: `Lokale Variable ${assignment[1]} erhält ${JSON.stringify(localVars[assignment[1]])}.`, vars: { ...snapshotVars(), ...localVars }, output: [...output], scope: name });
      } else if (returnMatch) {
        returnValue = evalSimple(returnMatch[1], { ...vars, ...localVars });
        steps.push({ lineIndex: item.index, description: `return gibt ${JSON.stringify(returnValue)} an die Aufrufstelle zurück.`, vars: { ...snapshotVars(), ...localVars }, output: [...output], scope: name });
        break;
      } else if (printMatch) {
        const value = evalSimple(printMatch[1], { ...vars, ...localVars });
        output.push(String(value));
        steps.push({ lineIndex: item.index, description: `${JSON.stringify(value)} wird aus der Funktion ausgegeben.`, vars: { ...snapshotVars(), ...localVars }, output: [...output], scope: name });
      }
    }
    return returnValue;
  }

  function executeSimple(line, lineIndex) {
    const append = line.match(/^(\w+)\.append\((.+)\)$/);
    if (append && Array.isArray(vars[append[1]])) {
      const value = evalSimple(append[2], vars);
      vars[append[1]].push(value);
      push(lineIndex, `${JSON.stringify(value)} wird an die Liste ${append[1]} angehängt.`);
      return;
    }
    const itemAssign = line.match(/^(\w+)\[(["'].+?["']|-?\d+)\]\s*=\s*(.+)$/);
    if (itemAssign && vars[itemAssign[1]] != null) {
      const rawKey = itemAssign[2];
      const key = /^-?\d+$/.test(rawKey) ? Number(rawKey) : rawKey.slice(1, -1);
      vars[itemAssign[1]][key] = evalSimple(itemAssign[3], vars);
      push(lineIndex, `${itemAssign[1]}[${JSON.stringify(key)}] wird verändert.`);
      return;
    }
    const assignment = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignment) {
      const name = assignment[1];
      const call = assignment[2].match(/^(\w+)\((.*)\)$/);
      if (call && functions[call[1]]) vars[name] = callFunction(call[1], call[2], lineIndex);
      else if (call && classes[call[1]]) {
        vars[name] = { __class__: call[1], attributes: {} };
        push(lineIndex, `Objekt ${name} der Klasse ${call[1]} wird erzeugt.`, call[1]);
      } else vars[name] = evalSimple(assignment[2], vars);
      push(lineIndex, `${name} erhält den Wert ${JSON.stringify(vars[name])}.`);
      return;
    }
    const standaloneCall = line.match(/^(\w+)\((.*)\)$/);
    if (standaloneCall && functions[standaloneCall[1]]) {
      callFunction(standaloneCall[1], standaloneCall[2], lineIndex);
      return;
    }
    const printMatch = line.match(/^print\((.*)\)$/);
    if (printMatch) {
      const value = evalSimple(printMatch[1], vars);
      output.push(String(value));
      push(lineIndex, `${JSON.stringify(value)} wird ausgegeben.`);
      return;
    }
    push(lineIndex, "Diese Zeile wird ausgeführt. Für diesen Befehl zeigt der Visualizer noch keine Detailanalyse.");
  }

  let i = 0;
  while (i < lines.length && steps.length < 180) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) { i += 1; continue; }

    const defMatch = line.match(/^def\s+(\w+)\((.*)\):$/);
    if (defMatch) {
      const block = collectIndented(i + 1);
      functions[defMatch[1]] = { params: splitTopLevel(defMatch[2]).map(p => p.split("=")[0].trim()).filter(Boolean), body: block.body };
      push(i, `Funktion ${defMatch[1]}() wird definiert. Der Code darin läuft erst beim Aufruf.`);
      i = block.next;
      continue;
    }

    const classMatch = line.match(/^class\s+(\w+)(?:\([^)]*\))?:$/);
    if (classMatch) {
      const block = collectIndented(i + 1);
      classes[classMatch[1]] = { body: block.body };
      push(i, `Klasse ${classMatch[1]} wird als Bauplan definiert.`, classMatch[1]);
      i = block.next;
      continue;
    }

    const forMatch = line.match(/^for\s+(\w+)\s+in\s+range\((.*)\):$/);
    if (forMatch) {
      const block = collectIndented(i + 1);
      for (const value of rangeValues(forMatch[2], vars)) {
        vars[forMatch[1]] = value;
        push(i, `Schleifendurchlauf: ${forMatch[1]} bekommt den Wert ${value}.`);
        block.body.forEach(item => executeSimple(item.text, item.index));
      }
      i = block.next;
      continue;
    }

    const ifMatch = line.match(/^if\s+(.+):$/);
    if (ifMatch) {
      const passed = Boolean(evalSimple(ifMatch[1], vars));
      push(i, `Bedingung wird geprüft und ist ${passed ? "wahr" : "falsch"}.`);
      const ifBlock = collectIndented(i + 1);
      let next = ifBlock.next;
      let elseBody = [];
      if (next < lines.length && lines[next].trim() === "else:") {
        const elseBlock = collectIndented(next + 1);
        elseBody = elseBlock.body;
        next = elseBlock.next;
      }
      (passed ? ifBlock.body : elseBody).forEach(item => executeSimple(item.text, item.index));
      i = next;
      continue;
    }

    executeSimple(line, i);
    i += 1;
  }
  return steps;
}

export default function BasicVisualizer({ code }) {
  const trace = useMemo(() => buildTrace(code || ""), [code]);
  const [index, setIndex] = useState(0);
  const current = trace[Math.min(index, Math.max(0, trace.length - 1))];
  const lines = (code || "").split("\n");

  if (!trace.length) return <div className="viz-empty">Für diesen Code gibt es noch keine visualisierbaren Schritte.</div>;

  return <div className="code-viz">
    <div className="viz-head"><div><span>Interaktiver Code-Visualizer</span><strong>Schritt {Math.min(index + 1, trace.length)} von {trace.length}</strong><small>{current?.scope && current.scope !== "global" ? `Kontext: ${current.scope}` : "Globaler Programmablauf"}</small></div><button onClick={() => setIndex(0)}><RotateCcw size={15}/> Neu starten</button></div>
    <div className="viz-grid">
      <div className="viz-code">{lines.map((line, i) => <div key={i} className={`viz-line ${current?.lineIndex === i ? "active" : ""}`}><span>{i + 1}</span><code>{line || " "}</code>{current?.lineIndex === i && <Play size={14}/>}</div>)}</div>
      <div className="viz-state">
        <div className="viz-explanation">{current?.description}</div>
        <div className="viz-panel"><h4>Variablen & Objekte</h4>{Object.keys(current?.vars || {}).length ? Object.entries(current.vars).map(([name, value]) => <div className="viz-variable" key={name}><code>{name}</code><span>→</span><strong>{JSON.stringify(value)}</strong></div>) : <p>Noch keine Variablen gesetzt.</p>}</div>
        <div className="viz-panel"><h4>Ausgabe</h4><pre>{current?.output?.length ? current.output.join("\n") : "Noch keine Ausgabe."}</pre></div>
      </div>
    </div>
    <div className="viz-controls"><button className="ghost" disabled={index === 0} onClick={() => setIndex(v => Math.max(0, v - 1))}><ChevronLeft size={17}/> Zurück</button><input aria-label="Visualizer Schritt" type="range" min="0" max={Math.max(0, trace.length - 1)} value={Math.min(index, trace.length - 1)} onChange={e => setIndex(Number(e.target.value))}/><button className="primary" disabled={index >= trace.length - 1} onClick={() => setIndex(v => Math.min(trace.length - 1, v + 1))}>Nächster Schritt <ChevronRight size={17}/></button></div>
  </div>;
}
