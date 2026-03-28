'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { runAudit } from '@/lib/auditStream';

function StatusBadge({ status }) {
  const config = {
    waiting:   { label: 'Waiting',  bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', dot: '#475569' },
    testing:   { label: 'Testing',  bg: 'rgba(234,179,8,0.15)',  color: '#fbbf24', dot: '#f59e0b' },
    judging:   { label: 'Judging',  bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', dot: '#6366f1' },
    PASS:      { label: 'PASS',     bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', dot: '#22c55e' },
    FAIL:      { label: 'FAIL',     bg: 'rgba(239,68,68,0.15)',  color: '#f87171', dot: '#ef4444' },
  };
  const c = config[status] || config.waiting;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: c.bg, color: c.color,
      borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: '600',
      letterSpacing: '0.06em',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', background: c.dot,
        animation: (status === 'testing' || status === 'judging') ? 'pulse 1s infinite' : 'none',
      }} />
      {c.label}
    </span>
  );
}

function AuditCard({ test }) {
  const borderColor = test.status === 'PASS'
    ? 'rgba(34,197,94,0.3)'
    : test.status === 'FAIL'
    ? 'rgba(239,68,68,0.3)'
    : 'rgba(255,255,255,0.08)';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${borderColor}`,
      borderRadius: '16px', padding: '20px',
      transition: 'border-color 0.4s',
    }}>
      {/* Rule + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#475569', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '4px' }}>
            RULE {String(test.ruleIndex + 1).padStart(2, '0')}
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500', lineHeight: '1.4' }}>
            {test.rule}
          </div>
        </div>
        <StatusBadge status={test.status} />
      </div>

      {/* Adversarial message */}
      {test.adversarialMessage && (
        <div style={{
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
        }}>
          <div style={{ color: '#6366f1', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '4px' }}>
            ATTACK MESSAGE
          </div>
          <div style={{ color: '#c7d2fe', fontSize: '13px', lineHeight: '1.5' }}>
            "{test.adversarialMessage}"
          </div>
        </div>
      )}

      {/* AI response stream */}
      {test.streamedResponse !== undefined && (
        <div style={{
          background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
          padding: '10px 14px', marginBottom: test.explanation ? '12px' : 0,
          minHeight: '40px',
        }}>
          <div style={{ color: '#475569', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '4px' }}>
            AI RESPONSE
          </div>
          <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {test.streamedResponse}
            {test.status === 'testing' && (
              <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#6366f1', marginLeft: '2px', animation: 'blink 1s infinite' }} />
            )}
          </div>
        </div>
      )}

      {/* Verdict explanation */}
      {test.explanation && (
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '12px',
          padding: '10px 14px',
          background: test.status === 'PASS' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          borderRadius: '10px',
        }}>
          <span style={{ fontSize: '14px' }}>{test.status === 'PASS' ? '✓' : '✗'}</span>
          <div style={{
            color: test.status === 'PASS' ? '#86efac' : '#fca5a5',
            fontSize: '13px', lineHeight: '1.5',
          }}>
            {test.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBoard({ passed, failed, total, rules, tests }) {
  const pct = Math.round((passed / total) * 100);
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const label = pct >= 70 ? 'Strong' : pct >= 50 ? 'Needs work' : 'Vulnerable';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px', padding: '32px', textAlign: 'center', marginBottom: '32px',
    }}>
      <div style={{ color: '#94a3b8', fontSize: '13px', letterSpacing: '0.08em', marginBottom: '12px' }}>
        AUDIT COMPLETE
      </div>
      <div style={{ fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: '800', color, lineHeight: 1, marginBottom: '8px' }}>
        {passed}<span style={{ color: '#475569', fontSize: '0.5em' }}>/{total}</span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>
        rules held &nbsp;·&nbsp; <span style={{ color }}>{label}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {tests.map((t, i) => (
          <div key={i} title={t.rule} style={{
            width: '28px', height: '28px', borderRadius: '6px',
            background: t.status === 'PASS' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
            border: `1px solid ${t.status === 'PASS' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: t.status === 'PASS' ? '#4ade80' : '#f87171',
          }}>
            {t.status === 'PASS' ? '✓' : '✗'}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditResultsPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('loading');
  const [rules, setRules] = useState([]);
  const [tests, setTests] = useState([]);
  const [score, setScore] = useState(null);
  const [error, setError] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const testsRef = useRef([]);

  useEffect(() => {
    const prompt = sessionStorage.getItem('auditPrompt');
    if (!prompt) { router.push('/audit'); return; }
    setPromptPreview(prompt.slice(0, 60) + (prompt.length > 60 ? '…' : ''));
    setPhase('extracting');

    runAudit(
      prompt,
      (event) => {
        if (event.type === 'rules_extracted') {
          setRules(event.rules);
          // Initialise test cards as waiting
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

  const completedTests = tests.filter(t => t.status === 'PASS' || t.status === 'FAIL');
  const currentIndex = tests.findIndex(t => t.status === 'testing' || t.status === 'judging');

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 60%, #0d0d0d 100%)',
      fontFamily: "'Inter', 'Geist', sans-serif",
      padding: '0 0 80px',
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#6366f1', fontSize: '13px', fontWeight: '700' }}>AUDIT</span>
          <span style={{ color: '#475569', fontSize: '13px', fontFamily: 'monospace' }}>{promptPreview}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {phase === 'testing' && rules.length > 0 && (
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Testing rule {Math.min(completedTests.length + 1, rules.length)} of {rules.length}
            </span>
          )}
          <button
            onClick={() => router.push('/audit')}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', borderRadius: '8px', padding: '6px 14px',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            New Audit
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 0' }}>

        {/* Extracting phase */}
        {phase === 'extracting' && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>⚙</div>
            <div style={{ fontSize: '16px' }}>Extracting rules from your prompt…</div>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#f87171',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>Audit failed</div>
            <div style={{ fontSize: '14px', color: '#fca5a5' }}>{error}</div>
          </div>
        )}

        {/* Rules chips */}
        {rules.length > 0 && (
          <div style={{ marginBottom: '28px', animation: 'slideIn 0.4s ease' }}>
            <div style={{ color: '#475569', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '10px' }}>
              {rules.length} RULES FOUND
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {rules.map((r, i) => {
                const t = tests[i];
                const done = t && (t.status === 'PASS' || t.status === 'FAIL');
                const active = t && t.status === 'testing';
                return (
                  <span key={i} style={{
                    background: done
                      ? (t.status === 'PASS' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)')
                      : active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${done
                      ? (t.status === 'PASS' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)')
                      : active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '100px', padding: '4px 12px',
                    fontSize: '12px',
                    color: done
                      ? (t.status === 'PASS' ? '#4ade80' : '#f87171')
                      : active ? '#a5b4fc' : '#64748b',
                    transition: 'all 0.3s',
                  }}>
                    {i + 1}. {r.length > 40 ? r.slice(0, 40) + '…' : r}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Score board */}
        {score && (
          <div style={{ animation: 'slideIn 0.5s ease' }}>
            <ScoreBoard
              passed={score.passed}
              failed={score.failed}
              total={score.total}
              rules={rules}
              tests={tests}
            />
          </div>
        )}

        {/* Audit cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tests.map((test, i) => (
            <div key={i} style={{ animation: 'slideIn 0.3s ease' }}>
              <AuditCard test={test} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
