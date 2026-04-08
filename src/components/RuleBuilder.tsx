"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Power, PowerOff } from "lucide-react";
import type { TriageRule, RuleCondition, Priority } from "@/types";
import { PRIORITY_CONFIG } from "@/types";

const EMPTY_CONDITION: RuleCondition = {
  field: "sender",
  operator: "contains",
  value: "",
};

export default function RuleBuilder() {
  const [rules, setRules] = useState<TriageRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: "",
    conditions: [{ ...EMPTY_CONDITION }],
    action: "noise" as Priority,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    const res = await fetch("/api/rules");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules || []);
    }
    setLoading(false);
  }

  function addCondition() {
    setNewRule({
      ...newRule,
      conditions: [...newRule.conditions, { ...EMPTY_CONDITION }],
    });
  }

  function removeCondition(index: number) {
    setNewRule({
      ...newRule,
      conditions: newRule.conditions.filter((_, i) => i !== index),
    });
  }

  function updateCondition(
    index: number,
    field: keyof RuleCondition,
    value: string
  ) {
    const updated = [...newRule.conditions];
    updated[index] = { ...updated[index], [field]: value };
    setNewRule({ ...newRule, conditions: updated });
  }

  async function saveRule() {
    if (!newRule.rule_name || newRule.conditions.some((c) => !c.value)) return;
    setSaving(true);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    });
    if (res.ok) {
      setShowForm(false);
      setNewRule({
        rule_name: "",
        conditions: [{ ...EMPTY_CONDITION }],
        action: "noise",
      });
      fetchRules();
    }
    setSaving(false);
  }

  async function deleteRule(id: string) {
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading rules...</div>;
  }

  return (
    <div>
      {/* Existing rules */}
      <div className="space-y-3 mb-6">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="border rounded-lg p-4 bg-white flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                {rule.is_active ? (
                  <Power className="w-4 h-4 text-green-500" />
                ) : (
                  <PowerOff className="w-4 h-4 text-gray-400" />
                )}
                <h3 className="font-medium text-gray-900">{rule.rule_name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    PRIORITY_CONFIG[rule.action as Priority]?.color
                  } bg-gray-100`}
                >
                  → {PRIORITY_CONFIG[rule.action as Priority]?.label}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {(rule.conditions as RuleCondition[]).map((c, i) => (
                  <span key={i}>
                    {i > 0 && " AND "}
                    {c.field} {c.operator} &quot;{c.value}&quot;
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => deleteRule(rule.id)}
              className="p-2 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-gray-500 text-sm">
            No rules yet. Create one to auto-triage emails.
          </p>
        )}
      </div>

      {/* Add rule form */}
      {showForm ? (
        <div className="border rounded-lg p-4 bg-white space-y-4">
          <input
            type="text"
            placeholder="Rule name (e.g., Workday notifications)"
            value={newRule.rule_name}
            onChange={(e) =>
              setNewRule({ ...newRule, rule_name: e.target.value })
            }
            className="w-full border rounded px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Conditions</p>
            {newRule.conditions.map((condition, i) => (
              <div key={i} className="flex gap-2 items-center">
                {i > 0 && (
                  <span className="text-xs text-gray-500 font-medium">AND</span>
                )}
                <select
                  value={condition.field}
                  onChange={(e) => updateCondition(i, "field", e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm"
                >
                  <option value="sender">Sender</option>
                  <option value="subject">Subject</option>
                  <option value="body">Body</option>
                </select>
                <select
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(i, "operator", e.target.value)
                  }
                  className="border rounded px-2 py-1.5 text-sm"
                >
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="starts_with">starts with</option>
                </select>
                <input
                  type="text"
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) => updateCondition(i, "value", e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm"
                />
                {newRule.conditions.length > 1 && (
                  <button
                    onClick={() => removeCondition(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addCondition}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add condition
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Assign priority
            </p>
            <select
              value={newRule.action}
              onChange={(e) =>
                setNewRule({ ...newRule, action: e.target.value as Priority })
              }
              className="border rounded px-3 py-2 text-sm"
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveRule}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Rule"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 text-sm rounded-md hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      )}
    </div>
  );
}
