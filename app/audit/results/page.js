'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { runAudit } from '@/lib/auditStream';

export default function AuditResultsPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('loading');
  const [rules, setRules] = useState([]);
  const [tests, setTests] = useState([]);
  const [score, setScore] = useState(null);
  const [error, setError] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const testsRef = useRef([]);

  useEffect(() => {
    const prompt = sessionStorage.getItem('auditPrompt');
    if (!prompt) { router.push('/audit'); return; }
    setPromptPreview(prompt.slice(0, 50) + (prompt.length > 50 ? '…' : ''));
    setPhase('extracting');

    runAudit(
      prompt,
      (event) => {
        if (event.type === 'rules_extracted') {
          setRules(event.rules);
          const initial = event.rules.map((rule, i) => ({
            ruleIndex: i, rule, status: 'waiting',
            adversarialMessage: null, streamedResponse: undefined, explanation: null,
          }));
          testsRef.current = initial;
          setTests([...initial]);
          setPhase('testing');
        }
        if (event.type === 'test_start') {
          const { rule_index, adversarial_message } = event;
          setActiveIndex(rule_index);
          setSelectedIndex(rule_index);
          testsRef.current = testsRef.current.map(t =>
            t.ruleIndex === rule_index
              ? { ...t, status: 'testing', adversarialMessage: adversarial_message, streamedResponse: '' }
              : t
          );
          setTests([...testsRef.current]);
        }
        if (event.type === 'response_token') {
          const { rule_index, token } = event;
          testsRef.current = testsRef.current.map(t =>
            t.ruleIndex === rule_index
              ? { ...t, streamedResponse: (t.streamedResponse || '') + token }
              : t
          );
          setTests([...testsRef.current]);
        }
        if (event.type === 'test_result') {
          const { rule_index, verdict, explanation, ai_response } = event;
          testsRef.current = testsRef.current.map(t =>
            t.ruleIndex === rule_index
              ? { ...t, status: verdict, streamedResponse: ai_response, explanation }
              : t
          );
          setTests([...testsRef.current]);
        }
        if (event.type === 'audit_complete') {
          setScore({ passed: event.passed, failed: event.failed, total: event.total });
          setPhase('complete');
          setActiveIndex(null);
          sessionStorage.removeItem('auditPrompt');
        }
        if (event.type === 'error') {
          setError(event.message);
          setPhase('error');
        }
      },
      (err) => { setError(err.message); setPhase('error'); }
    );
  }, []);

  const displayIndex = selectedIndex !== null ? selectedIndex : activeIndex;
  const activeTest = tests[displayIndex] ?? null;
  const completedCount = tests.filter(t => t.status === 'PASS' || t.status === 'FAIL').length;

  return (
    <main style={{
      height: '100vh', overflow: 'hidden',
      background: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideR   { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes barGrow  { from{width:0} to{width:var(--w)} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }

        .rule-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; cursor: pointer;
          border-bottom: 1px solid #f5f5f5;
          transition: background 0.15s;
          position: relative;
        }
        .rule-row:hover { background: #fafafa; }
        .rule-row.active { background: #f5f5f5; }
        .rule-row.selected { background: #f5f5f5; }

        .detail-panel { animation: slideR 0.3s ease both; }

        .tag {
          font-size: '10px'; font-weight: 700;
          letter-spacing: 0.08em; color: #bbb;
        }

        .stream-cursor {
          display: inline-block; width: 2px; height: 14px;
          background: #0a0a0a; margin-left: 2px;
          vertical-align: middle; animation: blink 0.8s infinite;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 4px; }
      `}</style>

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
        background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => router.push('/audit')}>
            <div style={{
              width: '26px', height: '26px', border: '2px solid #0a0a0a',
              borderRadius: '6px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '12px', fontWeight: '900',
            }}>R</div>
            <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '-0.02em' }}>RuleCheck</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: '#e0e0e0' }} />
          <span style={{ fontSize: '11px', color: '#ccc', fontFamily: 'monospace' }}>{promptPreview}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Progress bar */}
          {phase === 'testing' && rules.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '120px', height: '3px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: '#0a0a0a', borderRadius: '4px',
                  width: `${(completedCount / rules.length) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '11px', color: '#aaa', whiteSpace: 'nowrap' }}>
                {completedCount}/{rules.length}
              </span>
            </div>
          )}
          {phase === 'complete' && score && (
            <span style={{ fontSize: '12px', fontWeight: '700', color: score.passed === score.total ? '#16a34a' : '#0a0a0a' }}>
              {score.passed}/{score.total} rules held
            </span>
          )}
          <button onClick={() => router.push('/audit')} style={{
            background: '#0a0a0a', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '7px 16px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          }}>
            New Audit
          </button>
        </div>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — rule list */}
        <div style={{
          width: '300px', flexShrink: 0,
          borderRight: '1px solid #f0f0f0',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #f0f0f0',
            fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '0.1em',
            background: '#fafafa', flexShrink: 0,
          }}>
            {rules.length > 0 ? `${rules.length} RULES` : 'SCANNING…'}
          </div>

          {/* Extracting state */}
          {phase === 'extracting' && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#ccc' }}>
              <div style={{ fontSize: '20px', marginBottom: '10px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⚙</div>
              <div style={{ fontSize: '12px' }}>Reading prompt…</div>
            </div>
          )}

          {/* Rule rows */}
          {tests.map((test, i) => {
            const isActive = activeIndex === i;
            const isSelected = selectedIndex === i;
            const isDone = test.status === 'PASS' || test.status === 'FAIL';

            return (
              <div
                key={i}
                className={`rule-row${isActive || isSelected ? ' selected' : ''}`}
                onClick={() => setSelectedIndex(i)}
                style={{ animation: `fadeUp 0.3s ${i * 0.04}s ease both` }}
              >
                {/* Status indicator */}
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: test.status === 'PASS' ? '#16a34a'
                    : test.status === 'FAIL' ? '#e11d48'
                    : isActive ? '#0a0a0a'
                    : '#e0e0e0',
                  animation: isActive ? 'pulse 1s infinite' : 'none',
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: '#ccc', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{
                    fontSize: '12px', fontWeight: isActive ? '600' : '500',
                    color: isDone ? '#0a0a0a' : isActive ? '#0a0a0a' : '#888',
                    lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {test.rule}
                  </div>
                </div>

                {/* Verdict pill */}
                {isDone && (
                  <span style={{
                    fontSize: '10px', fontWeight: '800',
                    color: test.status === 'PASS' ? '#16a34a' : '#e11d48',
                    letterSpacing: '0.06em', flexShrink: 0,
                  }}>
                    {test.status}
                  </span>
                )}
                {isActive && !isDone && (
                  <span style={{ width: '12px', height: '12px', border: '2px solid #0a0a0a', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                )}
              </div>
            );
          })}

          {/* Score summary at bottom */}
          {score && (
            <div style={{
              marginTop: 'auto', padding: '16px', borderTop: '1px solid #f0f0f0',
              background: '#fafafa', flexShrink: 0,
              animation: 'fadeUp 0.4s ease both',
            }}>
              <div style={{ fontSize: '10px', color: '#bbb', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '8px' }}>FINAL SCORE</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {tests.map((t, i) => (
                  <div key={i} style={{
                    width: '18px', height: '18px', borderRadius: '3px',
                    background: t.status === 'PASS' ? '#0a0a0a' : '#fff',
                    border: `1.5px solid ${t.status === 'PASS' ? '#0a0a0a' : '#e11d48'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', fontWeight: '800',
                    color: t.status === 'PASS' ? '#fff' : '#e11d48',
                    cursor: 'pointer',
                  }} onClick={() => setSelectedIndex(i)}>
                    {t.status === 'PASS' ? '✓' : '✗'}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.03em' }}>
                {score.passed}<span style={{ color: '#ddd', fontSize: '14px' }}>/{score.total}</span>
              </div>
              <div style={{ fontSize: '11px', color: score.passed / score.total >= 0.7 ? '#16a34a' : '#e11d48', fontWeight: '700', marginTop: '2px' }}>
                {Math.round((score.passed / score.total) * 100)}% rules held
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — detail panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>

          {/* Empty / extracting state */}
          {phase === 'extracting' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: '#ccc' }}>
              <div style={{ fontSize: '36px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>⚙</div>
              <div style={{ fontSize: '14px' }}>Extracting rules from your prompt…</div>
            </div>
          )}

          {phase === 'testing' && !activeTest && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc', fontSize: '14px' }}>
              Select a rule to inspect it
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '24px' }}>
              <div style={{ fontWeight: '700', color: '#e11d48', marginBottom: '6px' }}>Audit failed</div>
              <div style={{ fontSize: '13px', color: '#be123c' }}>{error}</div>
            </div>
          )}

          {/* Score hero — shown at top when complete */}
          {score && (
            <div style={{
              border: '2px solid #0a0a0a', borderRadius: '16px',
              padding: '24px 28px', marginBottom: '28px',
              boxShadow: '4px 4px 0 #0a0a0a',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              animation: 'popIn 0.4s ease both',
            }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '0.1em', marginBottom: '6px' }}>AUDIT COMPLETE</div>
                <div style={{ fontSize: '56px', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {score.passed}<span style={{ color: '#ddd', fontSize: '28px' }}>/{score.total}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                  rules held &nbsp;·&nbsp;
                  <span style={{ fontWeight: '700', color: score.passed / score.total >= 0.7 ? '#16a34a' : '#e11d48' }}>
                    {score.passed / score.total >= 0.7 ? 'Strong' : score.passed / score.total >= 0.5 ? 'Needs work' : 'Vulnerable'}
                  </span>
                </div>
              </div>
              {/* Progress ring visual */}
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#f0f0f0" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#0a0a0a" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - score.passed / score.total)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '800',
                }}>
                  {Math.round((score.passed / score.total) * 100)}%
                </div>
              </div>
            </div>
          )}

          {/* Active test detail */}
          {activeTest && (
            <div key={displayIndex} className="detail-panel">

              {/* Rule title */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  RULE {String(activeTest.ruleIndex + 1).padStart(2, '0')}
                </div>
                <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {activeTest.rule}
                </h2>
                <div style={{ marginTop: '10px' }}>
                  {activeTest.status === 'waiting' && (
                    <span style={{ fontSize: '12px', color: '#bbb', fontWeight: '500' }}>Queued…</span>
                  )}
                  {activeTest.status === 'testing' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#d97706', fontWeight: '600' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d97706', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                      Attacking this rule…
                    </span>
                  )}
                  {activeTest.status === 'PASS' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                      ✓ Rule held
                    </span>
                  )}
                  {activeTest.status === 'FAIL' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#e11d48', fontWeight: '700' }}>
                      ✗ Rule broken
                    </span>
                  )}
                </div>
              </div>

              {/* Attack message */}
              {activeTest.adversarialMessage && (
                <div style={{ marginBottom: '16px', animation: 'fadeUp 0.3s ease both' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    ATTACK MESSAGE
                  </div>
                  <div style={{
                    background: '#fafafa', border: '1px solid #ebebeb',
                    borderLeft: '3px solid #0a0a0a',
                    borderRadius: '10px', padding: '14px 16px',
                  }}>
                    <p style={{ fontSize: '13.5px', color: '#333', lineHeight: '1.65', fontStyle: 'italic' }}>
                      "{activeTest.adversarialMessage}"
                    </p>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {activeTest.streamedResponse !== undefined && (
                <div style={{ marginBottom: '16px', animation: 'fadeUp 0.3s 0.1s ease both' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#bbb', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    AI RESPONSE
                  </div>
                  <div style={{
                    background: '#fafafa', border: '1px solid #ebebeb',
                    borderRadius: '10px', padding: '14px 16px',
                    minHeight: '60px',
                  }}>
                    <p style={{ fontSize: '13.5px', color: '#222', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                      {activeTest.streamedResponse}
                      {activeTest.status === 'testing' && <span className="stream-cursor" />}
                    </p>
                  </div>
                </div>
              )}

              {/* Verdict */}
              {activeTest.explanation && (
                <div style={{
                  padding: '16px 18px',
                  background: activeTest.status === 'PASS' ? '#f0fdf4' : '#fff1f2',
                  border: `1px solid ${activeTest.status === 'PASS' ? '#bbf7d0' : '#fecdd3'}`,
                  borderRadius: '10px',
                  animation: 'popIn 0.3s ease both',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em', marginBottom: '6px', color: activeTest.status === 'PASS' ? '#16a34a' : '#e11d48' }}>
                    {activeTest.status === 'PASS' ? '✓ VERDICT: PASS' : '✗ VERDICT: FAIL'}
                  </div>
                  <p style={{ fontSize: '13.5px', color: activeTest.status === 'PASS' ? '#15803d' : '#be123c', lineHeight: '1.6' }}>
                    {activeTest.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
