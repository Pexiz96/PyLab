"use client";

import { Award, Check, Flame, Medal, Sparkles, Star, Target, Trophy } from "lucide-react";

const DEFINITIONS = [
  {id:"first",title:"Erster Schritt",text:"Die erste Lektion abschließen.",icon:Sparkles,test:({completed})=>completed>=1},
  {id:"five",title:"Dranbleiber",text:"5 Lektionen abschließen.",icon:Medal,test:({completed})=>completed>=5},
  {id:"ten",title:"Python Explorer",text:"10 Lektionen abschließen.",icon:Award,test:({completed})=>completed>=10},
  {id:"basics",title:"Basics Master",text:"Die ersten 18 Lektionen abschließen.",icon:Trophy,test:({completed})=>completed>=18},
  {id:"xp500",title:"500 XP",text:"Mindestens 500 Erfahrungspunkte sammeln.",icon:Star,test:({xp})=>xp>=500},
  {id:"mastery50",title:"Solides Fundament",text:"50 % durchschnittliche Mastery erreichen.",icon:Target,test:({average})=>average>=50},
  {id:"mastery80",title:"Python sitzt",text:"80 % durchschnittliche Mastery erreichen.",icon:Trophy,test:({average})=>average>=80},
  {id:"streak3",title:"Treffer-Serie",text:"3 richtige Versuche in Folge bei einem Thema.",icon:Flame,test:({maxStreak})=>maxStreak>=3},
];

export default function AchievementsPanel({profile, lessons}) {
  const completed = (profile.progress || []).filter(x=>Boolean(x.completed)).length;
  const maxStreak = Math.max(0,...(profile.mastery || []).map(x=>x.streak||0));
  const context = {completed,xp:profile.xp||0,average:profile.average_mastery||0,maxStreak};
  const unlocked = DEFINITIONS.filter(x=>x.test(context)).length;

  return <section className="feature-page">
    <div className="path-heading"><span className="eyebrow">Achievements</span><h1>Deine Python-Meilensteine</h1><p>Auszeichnungen stehen nicht nur für Klicks, sondern für abgeschlossene Lektionen, Übung und echte Beherrschung.</p></div>
    <div className="achievement-summary"><div><Trophy/><span>Freigeschaltet</span><strong>{unlocked} / {DEFINITIONS.length}</strong></div><div><Check/><span>Lektionen</span><strong>{completed} / {lessons.length}</strong></div><div><Target/><span>Mastery</span><strong>{profile.average_mastery||0}%</strong></div></div>
    <div className="achievement-grid">{DEFINITIONS.map(item=>{const Icon=item.icon;const done=item.test(context);return <article key={item.id} className={`achievement-card ${done?"unlocked":"locked"}`}><div className="achievement-icon"><Icon/></div><div><span>{done?"Freigeschaltet":"Noch offen"}</span><h2>{item.title}</h2><p>{item.text}</p></div>{done&&<Check className="achievement-check"/>}</article>})}</div>
  </section>;
}
