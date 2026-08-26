"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";

function splitTopLevel(text, delimiter = ",") {
  const result = [];
  let current = "";
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (const char of text) {
    if (quote) {
      current += char;
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
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

function pythonRepr(value) {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

function displayPrintValue(value) {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "string") return value;
  if (Array.isArray(value) || (value && typeof value === "object")) return pythonRepr(value);
  return String(value);
}

function findTopLevelOperator(text, operators) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = text.length - 1; i >= 0; i -= 1) {
    const char = text[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if ([")", "]", "}"].includes(char)) { depth += 1; continue; }
    if (["(", "[", "{"].includes(char)) { depth -= 1; continue; }
    if (depth !== 0) continue;

    for (const operator of operators) {
      const start = i - operator.length + 1;
      if (start >= 0 && text.slice(start, i + 1) === operator) {
        return { index:start, operator };
      }
    }
  }
  return null;
}

function parseValue(token, vars) {
  const text = token.trim();
  if (text === "True") return true;
  if (text === "False") return false;
  if (text === "None") return null;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) return splitTopLevel(text.slice(1, -1)).map(part => evalSimple(part, vars));
  if (text.startsWith("(") && text.endsWith(")")) return evalSimple(text.slice(1, -1), vars);
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
    if (Array.isArray(source) && typeof key === "number" && key < 0) return source[source.length + key];
    return source?.[key];
  }
  if (text in vars) return vars[text];
  throw new Error(`Ausdruck „${text}“ wird vom Lern-Visualizer noch nicht sicher unterstützt.`);
}

function evalSimple(expr, vars) {
  const text = expr.trim();
  const lenMatch = text.match(/^len\((.+)\)$/);
  if (lenMatch) {
    const value = evalSimple(lenMatch[1], vars);
    if (typeof value === "string" || Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    throw new Error("len() kann für diesen Wert nicht visualisiert werden.");
  }

  const comparison = findTopLevelOperator(text, ["==", "!=", ">=", "<=", ">", "<"]);
  if (comparison) {
    const left = evalSimple(text.slice(0, comparison.index), vars);
    const right = evalSimple(text.slice(comparison.index + comparison.operator.length), vars);
    const op = comparison.operator;
    if (op === "==") return left === right;
    if (op === "!=") return left !== right;
    if (op === ">=") return left >= right;
    if (op === "<=") return left <= right;
    if (op === ">") return left > right;
    return left < right;
  }

  // Addition/Subtraktion haben niedrigere Priorität als Multiplikation/Division.
  let math = findTopLevelOperator(text, ["+", "-"]);
  if (!math) math = findTopLevelOperator(text, ["//", "*", "%", "/"]);
  if (math && math.index > 0) {
    const left = evalSimple(text.slice(0, math.index), vars);
    const right = evalSimple(text.slice(math.index + math.operator.length), vars);
    const op = math.operator;
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
  if (!parts.length || parts.some(Number.isNaN) || parts.length > 3) throw new Error("Diese range()-Schreibweise wird noch nicht unterstützt.");
  let start = 0, stop = 0, step = 1;
  if (parts.length === 1) stop = parts[0];
  if (parts.length >= 2) [start, stop] = parts;
  if (parts.length === 3) step = parts[2];
  if (step === 0) throw new Error("range() darf keinen step von 0 haben.");

  const result = [];
  if (step > 0) for (let value = start; value < stop && result.length < 100; value += step) result.push(value);
  else for (let value = start; value > stop && result.length < 100; value += step) result.push(value);
  return result;
}

function buildTrace(code) {
  const lines = code.split("\n");
  const vars = {};
  const output = [];
  const steps = [];
  const functions = {};
  let unsupported = "";

  const cloneValue = value => value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
  const snapshotVars = () => Object.fromEntries(Object.entries(vars).map(([k,v]) => [k, cloneValue(v)]));
  const push = (lineIndex, description, scope="global", scopedVars=null) => steps.push({
    lineIndex,
    description,
    vars: scopedVars || snapshotVars(),
    output:[...output],
    scope,
  });

  function indentation(line) {
    return line.match(/^\s*/)?.[0].length || 0;
  }

  function collectBlock(start, parentIndent) {
    const body = [];
    let j = start;
    while (j < lines.length) {
      if (!lines[j].trim()) { j += 1; continue; }
      const indent = indentation(lines[j]);
      if (indent <= parentIndent) break;
      body.push({text:lines[j].trim(),index:j,indent});
      j += 1;
    }
    return {body,next:j};
  }

  function printValues(argText, env) {
    const args = splitTopLevel(argText);
    return args.map(arg => displayPrintValue(evalSimple(arg, env))).join(" ");
  }

  function callFunction(name, argText, lineIndex) {
    const fn = functions[name];
    if (!fn) throw new Error(`Funktion ${name}() wurde nicht gefunden.`);
    const localVars = {};
    const args = splitTopLevel(argText).map(arg => evalSimple(arg, vars));
    fn.params.forEach((param,idx) => { localVars[param] = args[idx]; });
    push(lineIndex, `Funktion ${name}() wird aufgerufen. Die Argumente werden den Parametern zugeordnet.`, name, {...snapshotVars(),...localVars});

    let returnValue;
    for (const item of fn.body) {
      const returnMatch = item.text.match(/^return(?:\s+(.+))?$/);
      const assignment = item.text.match(/^(\w+)\s*=\s*(.+)$/);
      const printMatch = item.text.match(/^print\((.*)\)$/);
      if (returnMatch) {
        returnValue = returnMatch[1] ? evalSimple(returnMatch[1], {...vars,...localVars}) : null;
        push(item.index, `return gibt ${pythonRepr(returnValue)} an die Aufrufstelle zurück.`, name, {...snapshotVars(),...localVars});
        return returnValue;
      }
      if (assignment) {
        localVars[assignment[1]] = evalSimple(assignment[2], {...vars,...localVars});
        push(item.index, `Lokale Variable ${assignment[1]} erhält ${pythonRepr(localVars[assignment[1]])}.`, name, {...snapshotVars(),...localVars});
        continue;
      }
      if (printMatch) {
        const printed = printValues(printMatch[1], {...vars,...localVars});
        output.push(printed);
        push(item.index, `${JSON.stringify(printed)} wird ausgegeben.`, name, {...snapshotVars(),...localVars});
        continue;
      }
      throw new Error(`Die Funktionszeile „${item.text}“ wird noch nicht sicher visualisiert.`);
    }
    return returnValue;
  }

  function executeSimple(line, lineIndex) {
    const append = line.match(/^(\w+)\.append\((.+)\)$/);
    if (append && Array.isArray(vars[append[1]])) {
      const value = evalSimple(append[2], vars);
      vars[append[1]].push(value);
      push(lineIndex, `${pythonRepr(value)} wird an die Liste ${append[1]} angehängt.`);
      return;
    }

    const itemAssign = line.match(/^(\w+)\[(["'].+?["']|-?\d+)\]\s*=\s*(.+)$/);
    if (itemAssign && vars[itemAssign[1]] != null) {
      const rawKey = itemAssign[2];
      let key = /^-?\d+$/.test(rawKey) ? Number(rawKey) : rawKey.slice(1,-1);
      if (Array.isArray(vars[itemAssign[1]]) && typeof key === "number" && key < 0) key = vars[itemAssign[1]].length + key;
      vars[itemAssign[1]][key] = evalSimple(itemAssign[3],vars);
      push(lineIndex, `${itemAssign[1]}[${pythonRepr(key)}] wird verändert.`);
      return;
    }

    const assignment = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignment) {
      const name = assignment[1];
      const call = assignment[2].match(/^(\w+)\((.*)\)$/);
      if (call && functions[call[1]]) vars[name] = callFunction(call[1],call[2],lineIndex);
      else vars[name] = evalSimple(assignment[2],vars);
      push(lineIndex, `${name} erhält den Wert ${pythonRepr(vars[name])}.`);
      return;
    }

    const standaloneCall = line.match(/^(\w+)\((.*)\)$/);
    if (standaloneCall && functions[standaloneCall[1]]) {
      callFunction(standaloneCall[1],standaloneCall[2],lineIndex);
      return;
    }

    const printMatch = line.match(/^print\((.*)\)$/);
    if (printMatch) {
      const printed = printValues(printMatch[1],vars);
      output.push(printed);
      push(lineIndex, `${JSON.stringify(printed)} wird ausgegeben.`);
      return;
    }

    throw new Error(`Die Zeile „${line}“ wird vom Visualizer noch nicht sicher unterstützt.`);
  }

  try {
    let i = 0;
    while (i < lines.length && steps.length < 250) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line || line.startsWith("#")) { i += 1; continue; }

      if (/^class\s+/.test(line) || /\bself\b/.test(line) || /^\w+\.\w+\(/.test(line)) {
        throw new Error("Klassen, Objekte und allgemeine Methoden werden noch nicht simuliert, weil PyLab hier keine falschen Zustände anzeigen soll.");
      }

      const defMatch = line.match(/^def\s+(\w+)\((.*)\):$/);
      if (defMatch) {
        const block = collectBlock(i+1,indentation(raw));
        functions[defMatch[1]] = {params:splitTopLevel(defMatch[2]).map(p=>p.split("=")[0].trim()).filter(Boolean),body:block.body};
        push(i,`Funktion ${defMatch[1]}() wird definiert. Ihr Code läuft erst beim Aufruf.`);
        i = block.next;
        continue;
      }

      const forMatch = line.match(/^for\s+(\w+)\s+in\s+range\((.*)\):$/);
      if (forMatch) {
        const block = collectBlock(i+1,indentation(raw));
        for (const value of rangeValues(forMatch[2],vars)) {
          vars[forMatch[1]] = value;
          push(i,`Neuer Schleifendurchlauf: ${forMatch[1]} ist jetzt ${value}.`);
          for (const item of block.body) executeSimple(item.text,item.index);
        }
        i = block.next;
        continue;
      }

      const ifMatch = line.match(/^if\s+(.+):$/);
      if (ifMatch) {
        const passed = Boolean(evalSimple(ifMatch[1],vars));
        push(i,`Die Bedingung ist ${passed ? "True (wahr)" : "False (falsch)"}.`);
        const ifBlock = collectBlock(i+1,indentation(raw));
        let next = ifBlock.next;
        let elseBody = [];
        if (next < lines.length && lines[next].trim() === "else:") {
          const elseBlock = collectBlock(next+1,indentation(lines[next]));
          elseBody = elseBlock.body;
          next = elseBlock.next;
        }
        for (const item of (passed ? ifBlock.body : elseBody)) executeSimple(item.text,item.index);
        i = next;
        continue;
      }

      executeSimple(line,i);
      i += 1;
    }
  } catch (error) {
    unsupported = error.message || "Dieser Code kann noch nicht zuverlässig visualisiert werden.";
  }

  return {steps,unsupported};
}

export default function BasicVisualizer({code}) {
  const traceResult = useMemo(()=>buildTrace(code || ""),[code]);
  const trace = traceResult.steps;
  const [index,setIndex] = useState(0);
  const current = trace[Math.min(index,Math.max(0,trace.length-1))];
  const lines = (code || "").split("\n");

  useEffect(()=>setIndex(0),[code]);

  if (!trace.length) return <div className="viz-empty"><AlertTriangle size={18}/><span>{traceResult.unsupported || "Für diesen Code gibt es noch keine zuverlässig visualisierbaren Schritte."}</span></div>;

  return <div className="code-viz">
    {traceResult.unsupported && <div className="viz-warning"><AlertTriangle size={17}/><span>Die Simulation stoppt hier bewusst: {traceResult.unsupported}</span></div>}
    <div className="viz-head"><div><span>Interaktiver Code-Visualizer</span><strong>Schritt {Math.min(index+1,trace.length)} von {trace.length}</strong><small>{current?.scope && current.scope!=="global" ? `Kontext: ${current.scope}` : "Globaler Programmablauf"}</small></div><button onClick={()=>setIndex(0)}><RotateCcw size={15}/> Neu starten</button></div>
    <div className="viz-grid">
      <div className="viz-code">{lines.map((line,i)=><div key={i} className={`viz-line ${current?.lineIndex===i?"active":""}`}><span>{i+1}</span><code>{line || " "}</code>{current?.lineIndex===i&&<Play size={14}/>}</div>)}</div>
      <div className="viz-state">
        <div className="viz-explanation">{current?.description}</div>
        <div className="viz-panel"><h4>Variablen</h4>{Object.keys(current?.vars||{}).length ? Object.entries(current.vars).map(([name,value])=><div className="viz-variable" key={name}><code>{name}</code><span>→</span><strong>{pythonRepr(value)}</strong></div>) : <p>Noch keine Variablen gesetzt.</p>}</div>
        <div className="viz-panel"><h4>Ausgabe</h4><pre>{current?.output?.length ? current.output.join("\n") : "Noch keine Ausgabe."}</pre></div>
      </div>
    </div>
    <div className="viz-controls"><button className="ghost" disabled={index===0} onClick={()=>setIndex(v=>Math.max(0,v-1))}><ChevronLeft size={17}/> Zurück</button><input aria-label="Visualizer Schritt" type="range" min="0" max={Math.max(0,trace.length-1)} value={Math.min(index,trace.length-1)} onChange={e=>setIndex(Number(e.target.value))}/><button className="primary" disabled={index>=trace.length-1} onClick={()=>setIndex(v=>Math.min(trace.length-1,v+1))}>Nächster Schritt <ChevronRight size={17}/></button></div>
  </div>;
}
