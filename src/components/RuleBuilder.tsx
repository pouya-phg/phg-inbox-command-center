"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Power, PowerOff } from "lucide-react";
import type { TriageRule, RuleCondition, Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

const EMPTY_CONDITION: RuleCondition = { field: "sender", operator: "contains", value: "" };

export default function RuleBuilder() {
  const [rules, setRules] = useState<TriageRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({ rule_name: "", conditions: [{ ...EMPTY_CONDITION }], action: "noise" as Priority });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    const res = await fetch("/api/rules");
    if (res.ok) { const data = await res.json(); setRules(data.rules || []); }
    setLoading(false);
  }

  function addCondition() { setNewRule({ ...newRule, conditions: [...newRule.conditions, { ...EMPTY_CONDITION }] }); }
  function removeCondition(i: number) { setNewRule({ ...newRule, conditions: newRule.conditions.filter((_, idx) => idx !== i) }); }
  function updateCondition(i: number, field: keyof RuleCondition, value: string) {
    const updated = [...newRule.conditions]; updated[i] = { ...updated[i], [field]: value }; setNewRule({ ...newRule, conditions: updated });
  }

  async function saveRule() {
    if (!newRule.rule_name || newRule.conditions.some((c) => !c.value)) return;
    setSaving(true);
    const res = await fetch("/api/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newRule) });
    if (res.ok) { setShowForm(false); setNewRule({ rule_name: "", conditions: [{ ...EMPTY_CONDITION }], action: "noise" }); fetchRules(); }
    setSaving(false);
  }

  async function deleteRule(id: string) {
    await fetch("/api/rules", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div className="text-center py-16 text-[#9898b0] text-[13px]">Loading rules...</div>;

  return (
    <div>
      <div className="space-y-2 mb-6">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white border-[0.5px] border-[#e0e0e8] rounded-[10px] p-4 flex items-center justify-between hover:bg-[#f7f7f9] transition-colors">
            <div>
              <div className="flex items-center gap-2">
                {rule.is_active ? <Power className="w-3.5 h-3.5 text-[#1e7a48]" /> : <PowerOff className="w-3.5 h-3.5 text-[#9898b0]" />}
                <h3 className="font-medium text-[#1a1a2e] text-[13px]">{rule.rule_name}</h3>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_CONFIG[rule.action as Priority]?.badgeStyle}`}>
                  → {PRIORITY_CONFIG[rule.action as Priority]?.label}
                </span>
              </div>
              <div className="mt-1 text-[12px] text-[#5a5a72]">
                {(rule.conditions as RuleCondition[]).map((c, i) => (
                  <span key={i}>{i > 0 && <span className="text-[#9898b0]"> AND </span>}<span className="text-[#607088]">{c.field}</span> {c.operator} <span className="text-[#1a1a2e]">&quot;{c.value}&quot;</span></span>
                ))}
              </div>
            </div>
            <button onClick={() => deleteRule(rule.id)} className="p-2 text-[#9898b0] hover:text-[#9a2828] transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rules.length === 0 && <p className="text-[#9898b0] text-[13px]">No rules yet. Create one to auto-triage emails.</p>}
      </div>

      {showForm ? (
        <div className="bg-white border-[0.5px] border-[#cacad8] rounded-[12px] p-5 space-y-4">
          <input type="text" placeholder="Rule name" value={newRule.rule_name} onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
            className="w-full bg-white border-[0.5px] border-[#cacad8] rounded-md px-3 py-2 text-[13px] text-[#1a1a2e] placeholder-[#9898b0] focus:border-[#8090a8] focus:outline-none" />
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-[#5a5a72] uppercase tracking-[0.08em]">Conditions</p>
            {newRule.conditions.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                {i > 0 && <span className="text-[10px] text-[#9898b0] font-medium">AND</span>}
                <select value={c.field} onChange={(e) => updateCondition(i, "field", e.target.value)} className="bg-white border-[0.5px] border-[#cacad8] rounded-md px-2 py-1.5 text-[13px] text-[#1a1a2e] focus:border-[#8090a8] focus:outline-none">
                  <option value="sender">Sender</option><option value="subject">Subject</option><option value="body">Body</option>
                </select>
                <select value={c.operator} onChange={(e) => updateCondition(i, "operator", e.target.value)} className="bg-white border-[0.5px] border-[#cacad8] rounded-md px-2 py-1.5 text-[13px] text-[#1a1a2e] focus:border-[#8090a8] focus:outline-none">
                  <option value="contains">contains</option><option value="equals">equals</option><option value="starts_with">starts with</option>
                </select>
                <input type="text" placeholder="Value" value={c.value} onChange={(e) => updateCondition(i, "value", e.target.value)}
                  className="flex-1 bg-white border-[0.5px] border-[#cacad8] rounded-md px-2 py-1.5 text-[13px] text-[#1a1a2e] placeholder-[#9898b0] focus:border-[#8090a8] focus:outline-none" />
                {newRule.conditions.length > 1 && <button onClick={() => removeCondition(i)} className="text-[#9898b0] hover:text-[#9a2828]"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
            <button onClick={addCondition} className="text-[12px] text-[#8090a8] hover:text-[#607088] flex items-center gap-1"><Plus className="w-3 h-3" /> Add condition</button>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#5a5a72] uppercase tracking-[0.08em] mb-1">Assign priority</p>
            <select value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value as Priority })} className="bg-white border-[0.5px] border-[#cacad8] rounded-md px-3 py-2 text-[13px] text-[#1a1a2e] focus:border-[#8090a8] focus:outline-none">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveRule} disabled={saving} className="px-4 py-2 bg-[#a88830] text-white text-[13px] font-medium rounded-md hover:bg-[#886810] disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save Rule"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[#5a5a72] text-[13px] border-[0.5px] border-[#cacad8] rounded-md hover:bg-[#eeeef2] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#a88830] text-white text-[13px] font-medium rounded-md hover:bg-[#886810] transition-colors">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      )}
    </div>
  );
}
