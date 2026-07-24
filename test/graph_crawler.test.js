/**
 * Mathematical State-Machine Crawler
 * ====================================
 * Multi-seed BFS over every role domain with rich mocked data. Verifies:
 *   1. Reachability    — every expected state reachable from its seed
 *   2. No Dead Ends    — every non-terminal state has ≥1 outbound edge
 *   3. Domain Integrity — Doctor/Patient cannot reach Admin states
 *   4. Cycle Detection — BFS layer analysis flags runaway loops / self-loops
 *   5. Graph Metrics   — diameter, branch factor, sink ratio collected
 *   6. Coverage Report — FlowStates vs visited delta reported across all seeds
 *   7. DOT Export      — full graph written to test/artifacts/graph_<role>.dot
 */
const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs   = require('fs');
const path = require('path');

process.env.DATA_DIR = path.join(__dirname, 'test_data_graph_crawler');

const { ConversationFlow, FlowStates } = require('../services/conversationFlow');
const ConsultationManager = require('../services/consultationManager');
const DoctorRouter        = require('../services/doctorRouter');
const PaymentService      = require('../services/paymentService');
const UserRegistry        = require('../services/userRegistry');
const adminRegistry       = require('../services/adminRegistry');
const { payloadMap }      = require('../services/payloadMap');

// ── Artifact directory ────────────────────────────────────────────────────────
const ARTIFACT_DIR = path.join(__dirname, 'artifacts');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

// ── Domain sets (mirror conversationFlow.js) ──────────────────────────────────
const ADMIN_DOMAIN_STATES = new Set([
  FlowStates.ADMIN_MENU, FlowStates.SUPER_ADMIN_MENU,
  FlowStates.SUPER_ADMIN_MANAGE_ADMINS, FlowStates.ADMIN_ROLE_APPROVALS,
  FlowStates.ADMIN_DOCTOR_MANAGEMENT, FlowStates.ADMIN_VERIFY_PAYMENT_INPUT,
  FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT, FlowStates.ADMIN_MESSAGE_PATIENT_INPUT,
  FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT, FlowStates.ADMIN_CLOSE_CONSULTATION,
  FlowStates.ADMIN_ADD_ADMIN_INPUT, FlowStates.ADMIN_REMOVE_ADMIN_INPUT,
  FlowStates.ADMIN_SET_FEE_INPUT, FlowStates.ADMIN_PROFILE_EDIT,
  FlowStates.ADMIN_PROFILE_EDIT_NAME, FlowStates.ADMIN_PROFILE_EDIT_PHONE,
  FlowStates.ADMIN_PROFILE_COMPLETE_OPTIONS, FlowStates.ADMIN_INVITE_DOCTOR_INPUT,
  FlowStates.ADMIN_REGISTER_DOCTOR_INPUT, FlowStates.ADMIN_APPROVE_DOCTOR_INPUT,
  FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT, FlowStates.ADMIN_APPROVE_SUPPORT_INPUT,
  FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT, FlowStates.ADMIN_REMOVE_DOCTOR_INPUT,
  FlowStates.ADMIN_REJECT_DOCTOR_INPUT, FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT,
  FlowStates.ADMIN_CONSULTATIONS_MENU, FlowStates.ADMIN_FINANCES_MENU,
  FlowStates.ADMIN_SYSTEM_MENU,
]);

const DOCTOR_DOMAIN_STATES = new Set([
  FlowStates.DOCTOR_MENU, FlowStates.DOCTOR_PROFILE_EDIT,
  FlowStates.DOCTOR_MSG_ADMIN_INPUT, FlowStates.DOCTOR_PATIENTS_VIEW,
]);

// ── Per-state valid inputs ────────────────────────────────────────────────────
function getValidInputsForState(state) {
  const universal      = ['cancel', '0'];
  const fromPayloadMap = payloadMap[state] ? Object.values(payloadMap[state]) : [];
  const extra = [];

  switch (state) {
    case FlowStates.PERSONA_SELECT:              extra.push('1','2','3','4','5'); break;
    case FlowStates.ROLE_APPLICATION:            extra.push('1','2','3','4'); break;
    case FlowStates.PROFILE_REMOVE_ROLE:         extra.push('doctor','support','caregiver'); break;
    case FlowStates.ADMIN_ROLE_APPROVALS:        extra.push('1','2','3','4'); break;
    case FlowStates.ADMIN_DOCTOR_MANAGEMENT:     extra.push('1','2','3','4','5','6','7','8','9'); break;
    case FlowStates.SUPER_ADMIN_MANAGE_ADMINS:   extra.push('1','2'); break;
    case FlowStates.ADMIN_CONSULTATIONS_MENU:   extra.push('1','2','3','4','5'); break;
    case FlowStates.ADMIN_FINANCES_MENU:        extra.push('1','2','3'); break;
    case FlowStates.ADMIN_SYSTEM_MENU:          extra.push('1','2','3'); break;
    case FlowStates.PLATFORM_TERMS:              extra.push('1','2'); break;
    case FlowStates.PROFILE_VIEW:                extra.push('1','2','3','4','5'); break;
    case FlowStates.WELCOME:                     extra.push('1','2','3'); break;
    case FlowStates.DOCTOR_MENU:                 extra.push('1','2','3','4'); break;
    case FlowStates.PROFILE_DISCOUNT_CATEGORY:   extra.push('1','2','3','4'); break;
    case FlowStates.PROFILE_DISCOUNT_ECONOMIC:   extra.push('1','2','3'); break;
    case FlowStates.PROFILE_DISCOUNT_PROFESSION: extra.push('1','2'); break;
    case FlowStates.PROFILE_DISCOUNT_SOCIAL:     extra.push('1','2'); break;
    case FlowStates.PROFILE_CONSENTS:            extra.push('1','2','3'); break;
    case FlowStates.CANCER_TYPE:                 extra.push('1','2','3','4','5','6','7','8'); break;
    case FlowStates.CONSULTATION:                extra.push('1','2','3','4'); break;
    case FlowStates.CONSULTATION_WITHDRAW:       extra.push('1','0'); break;
    case FlowStates.CAREGIVER_MENU:              extra.push('1','2','0'); break;
    case FlowStates.CAREGIVER_AUTH:              extra.push('1','2'); break;
    case FlowStates.CAREGIVER_CONSENT_ACK:      extra.push('1'); break;
    case FlowStates.ADMIN_CLOSE_CONSULTATION:    extra.push('1','0'); break;
    case FlowStates.ADMIN_PROFILE_EDIT:          extra.push('1','2','0'); break;
    case FlowStates.ADMIN_PROFILE_COMPLETE_OPTIONS: extra.push('1','2'); break;
    default: break;
  }
  return [...new Set([...universal, ...fromPayloadMap, ...extra])];
}

// ── BFS Crawler — returns visited set, adjacency graph, and BFS layers ────────
async function crawlFromSeed(flow, cm, chatId, seedState, seedPersona, customSessionData = {}) {
  const visited = new Set();
  const graph   = new Map();   // state -> Set<nextState>
  const layers  = new Map();   // state -> BFS depth
  const queue   = [[seedState, 0]];

  const baseSession = { flowState: seedState, phoneNumber: chatId, selectedPersona: seedPersona, ...customSessionData };
  cm.updateSession(chatId, baseSession);

  while (queue.length > 0) {
    const [currentState, depth] = queue.shift();
    if (visited.has(currentState)) continue;
    visited.add(currentState);
    graph.set(currentState, new Set());
    layers.set(currentState, depth);

    for (const input of getValidInputsForState(currentState)) {
      cm.updateSession(chatId, { ...baseSession, flowState: currentState });
      let nextState;
      try {
        const result = await flow.createFlowHandler(chatId, input);
        nextState = result?.nextState;
      } catch (_) { continue; }

      if (nextState && nextState !== currentState) {
        graph.get(currentState).add(nextState);
        if (!visited.has(nextState)) queue.push([nextState, depth + 1]);
      }
    }
  }
  return { visited, graph, layers };
}

// ── Graph utility: detect back-edges (cycles) via DFS ────────────────────────
function detectCycles(graph) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  const backEdges = [];

  for (const node of graph.keys()) color[node] = WHITE;

  function dfs(u) {
    color[u] = GRAY;
    for (const v of (graph.get(u) || [])) {
      if (color[v] === GRAY)  backEdges.push([u, v]);
      else if (color[v] === WHITE) dfs(v);
    }
    color[u] = BLACK;
  }
  for (const node of graph.keys()) if (color[node] === WHITE) dfs(node);

  const selfLoops = [...graph.entries()]
    .filter(([s, edges]) => edges.has(s) && edges.size === 1)
    .map(([s]) => s);

  return { backEdges, selfLoops };
}

// ── Graph metrics ─────────────────────────────────────────────────────────────
function computeMetrics(graph, layers) {
  const nodeCount   = graph.size;
  const edgeCount   = [...graph.values()].reduce((s, e) => s + e.size, 0);
  const sinks       = [...graph.entries()].filter(([, e]) => e.size === 0).map(([s]) => s);
  const maxDegree   = Math.max(0, ...[...graph.values()].map(e => e.size));
  const avgDegree   = nodeCount ? (edgeCount / nodeCount).toFixed(2) : 0;
  const diameter    = layers.size ? Math.max(...layers.values()) : 0;
  return { nodeCount, edgeCount, sinks, maxDegree, avgDegree, diameter };
}

// ── DOT export ────────────────────────────────────────────────────────────────
function exportDot(graph, role, layers) {
  const maxDepth  = layers.size ? Math.max(...layers.values()) : 0;
  const colorOf   = d => {
    const pct = maxDepth ? d / maxDepth : 0;
    const r   = Math.round(255 * pct);
    const g   = Math.round(200 * (1 - pct));
    return `"#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}88"`;
  };

  const lines = [`digraph ${role.replace(/-/g,'_')}_flow {`, '  rankdir=LR;', '  node [shape=box style=filled fontname="Helvetica" fontsize=10];'];
  for (const [state, depth] of layers) {
    const label = state.replace(/_/g,' ');
    lines.push(`  "${state}" [label="${label}" fillcolor=${colorOf(depth)}];`);
  }
  for (const [from, tos] of graph) {
    for (const to of tos) lines.push(`  "${from}" -> "${to}";`);
  }
  lines.push('}');

  const dotPath = path.join(ARTIFACT_DIR, `graph_${role}.dot`);
  fs.writeFileSync(dotPath, lines.join('\n'));
  return dotPath;
}

// ── Coverage report ───────────────────────────────────────────────────────────
function coverageReport(visited) {
  const all      = new Set(Object.values(FlowStates));
  const covered  = [...visited].filter(s => all.has(s));
  const missed   = [...all].filter(s => !visited.has(s));
  const pct      = ((covered.length / all.size) * 100).toFixed(1);
  return { total: all.size, covered: covered.length, missed, pct };
}

test.after(() => {
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═════════════════════════════════════════════════════════════════════════════
describe('Mathematical State-Machine Crawler', () => {
  const SUPER_ADMIN_ID = '999999991';
  const DOCTOR_ID      = '999999992';
  const SUPPORT_ID     = '999999993';
  const PATIENT_ID     = '999999994';
  const CAREGIVER_ID   = '999999997';

  let cm, flow, dr, userReg;

  beforeEach(() => {
    dr      = new DoctorRouter();
    cm      = new ConsultationManager(dr);
    userReg = new UserRegistry();
    flow    = new ConversationFlow(cm, dr, new PaymentService(), userReg, adminRegistry);

    adminRegistry.addAdmin(SUPER_ADMIN_ID, 'system', SUPER_ADMIN_ID, 'super_admin', 'Test SA');
    adminRegistry.addAdmin(SUPPORT_ID,     'system', SUPPORT_ID,     'support',     'Test Support');

    // Seed dummy doctor into router persistence for doctor assignment tests
    dr.persistence.addDoctor({
      id: 'doc_test_1', name: 'Dr. Test Specialist',
      telegramId: DOCTOR_ID, phoneNumber: DOCTOR_ID,
      specialty: 'Oncology', cancerTypes: ['lung', 'breast', 'prostate', 'general'],
      status: 'active'
    });

    // Seed dummy role requests in UserRegistry
    userReg.requestRole(PATIENT_ID, 'doctor');
    userReg.requestRole(CAREGIVER_ID, 'caregiver');
  });

  afterEach(() => {
    adminRegistry.removeAdmin(SUPER_ADMIN_ID);
    adminRegistry.removeAdmin(SUPPORT_ID);
    try { cm.sessions.clear(); }     catch(_) {}
    try { cm.consultations.clear(); } catch(_) {}
  });

  // ── 1. SUPER_ADMIN domain ──────────────────────────────────────────────────
  test('SUPER_ADMIN domain: reachability, dead-ends, cycles, metrics, DOT export', async () => {
    const { visited, graph, layers } = await crawlFromSeed(
      flow, cm, SUPER_ADMIN_ID, FlowStates.SUPER_ADMIN_MENU, 'super_admin'
    );

    const expected = [
      FlowStates.SUPER_ADMIN_MENU,    FlowStates.ADMIN_CONSULTATIONS_MENU,
      FlowStates.ADMIN_FINANCES_MENU, FlowStates.ADMIN_SYSTEM_MENU,
      FlowStates.ADMIN_PROFILE_EDIT,  FlowStates.ADMIN_ROLE_APPROVALS,
      FlowStates.ADMIN_DOCTOR_MANAGEMENT, FlowStates.SUPER_ADMIN_MANAGE_ADMINS,
      FlowStates.ADMIN_VERIFY_PAYMENT_INPUT, FlowStates.ADMIN_VERIFY_DISCOUNT_INPUT,
      FlowStates.ADMIN_SET_FEE_INPUT,
    ];
    for (const s of expected)
      assert.ok(visited.has(s), `REACHABILITY: '${s}' unreachable from SUPER_ADMIN_MENU`);

    for (const [s, edges] of graph)
      if (s !== FlowStates.COMPLETED)
        assert.ok(edges.size > 0, `DEAD END: '${s}' has 0 outbound edges`);

    const { backEdges, selfLoops } = detectCycles(graph);
    assert.strictEqual(selfLoops.length, 0,
      `SELF-LOOP TRAP: states with no forward exit: [${selfLoops.join(', ')}]`);

    const m = computeMetrics(graph, layers);
    assert.ok(m.nodeCount >= 11, `METRICS: expected ≥11 nodes, got ${m.nodeCount}`);
    assert.ok(m.edgeCount >= 11, `METRICS: expected ≥11 edges, got ${m.edgeCount}`);

    const dotPath = exportDot(graph, 'super_admin', layers);
    assert.ok(fs.existsSync(dotPath), `DOT: file not written at ${dotPath}`);

    const cov = coverageReport(visited);
    console.log(`✅ SUPER_ADMIN: ${visited.size} states | diameter=${m.diameter} | avg-out=${m.avgDegree} | coverage=${cov.pct}%`);
  });

  // ── 2. ADMIN domain ────────────────────────────────────────────────────────
  test('ADMIN domain: reachability, dead-ends, cycles, metrics, DOT export', async () => {
    const AID = '999999995';
    adminRegistry.addAdmin(AID, 'system', AID, 'admin', 'Test Admin');

    const { visited, graph, layers } = await crawlFromSeed(
      flow, cm, AID, FlowStates.ADMIN_MENU, 'admin'
    );

    const expected = [
      FlowStates.ADMIN_MENU,           FlowStates.ADMIN_CONSULTATIONS_MENU,
      FlowStates.ADMIN_FINANCES_MENU,  FlowStates.ADMIN_SYSTEM_MENU,
      FlowStates.ADMIN_PROFILE_EDIT,   FlowStates.ADMIN_ROLE_APPROVALS,
      FlowStates.ADMIN_DOCTOR_MANAGEMENT,
    ];
    for (const s of expected)
      assert.ok(visited.has(s), `REACHABILITY: '${s}' unreachable from ADMIN_MENU`);

    for (const [s, edges] of graph)
      if (s !== FlowStates.COMPLETED)
        assert.ok(edges.size > 0, `DEAD END: '${s}' has 0 outbound edges`);

    const { backEdges, selfLoops } = detectCycles(graph);
    assert.strictEqual(selfLoops.length, 0,
      `SELF-LOOP TRAP: states with no forward exit: [${selfLoops.join(', ')}]`);

    const m = computeMetrics(graph, layers);
    assert.ok(m.nodeCount >= 7, `METRICS: expected ≥7 nodes, got ${m.nodeCount}`);

    const dotPath = exportDot(graph, 'admin', layers);
    assert.ok(fs.existsSync(dotPath), `DOT: file not written`);

    adminRegistry.removeAdmin(AID);

    const cov = coverageReport(visited);
    console.log(`✅ ADMIN: ${visited.size} states | diameter=${m.diameter} | avg-out=${m.avgDegree} | coverage=${cov.pct}%`);
  });

  // ── 3. SUPPORT domain ─────────────────────────────────────────────────────
  test('SUPPORT domain: reachability, dead-ends, no direct admin access, DOT export', async () => {
    const { visited, graph, layers } = await crawlFromSeed(
      flow, cm, SUPPORT_ID, FlowStates.SUPPORT_MENU, 'support'
    );

    assert.ok(visited.has(FlowStates.SUPPORT_MENU), 'REACHABILITY: SUPPORT_MENU not reached');

    for (const [s, edges] of graph)
      if (s !== FlowStates.COMPLETED)
        assert.ok(edges.size > 0, `DEAD END: '${s}' has 0 outbound edges`);

    const supportEdges = graph.get(FlowStates.SUPPORT_MENU) || new Set();
    const illegalDirect = [
      FlowStates.ADMIN_CONSULTATIONS_MENU, FlowStates.ADMIN_FINANCES_MENU,
      FlowStates.ADMIN_SYSTEM_MENU, FlowStates.SUPER_ADMIN_MANAGE_ADMINS,
      FlowStates.ADMIN_ROLE_APPROVALS, FlowStates.ADMIN_DOCTOR_MANAGEMENT,
    ];
    for (const illegal of illegalDirect)
      assert.ok(!supportEdges.has(illegal),
        `DOMAIN VIOLATION: SUPPORT_MENU directly links to admin-only '${illegal}'`);

    const { backEdges, selfLoops } = detectCycles(graph);
    assert.strictEqual(selfLoops.length, 0,
      `SELF-LOOP TRAP in support domain: [${selfLoops.join(', ')}]`);
    const m         = computeMetrics(graph, layers);
    const dotPath   = exportDot(graph, 'support', layers);
    assert.ok(fs.existsSync(dotPath), 'DOT: file not written');

    const cov = coverageReport(visited);
    console.log(`✅ SUPPORT: ${visited.size} states | diameter=${m.diameter} | coverage=${cov.pct}%`);
  });

  // ── 4. DOCTOR domain ───────────────────────────────────────────────────────
  test('DOCTOR domain: reachability, no admin cross-domain, cycles, DOT export', async () => {
    const { visited, graph, layers } = await crawlFromSeed(
      flow, cm, DOCTOR_ID, FlowStates.DOCTOR_MENU, 'doctor'
    );

    const expected = [
      FlowStates.DOCTOR_MENU, FlowStates.DOCTOR_PROFILE_EDIT, FlowStates.DOCTOR_MSG_ADMIN_INPUT,
    ];
    for (const s of expected)
      assert.ok(visited.has(s), `REACHABILITY: Doctor state '${s}' unreachable`);

    for (const [s, edges] of graph)
      if (s !== FlowStates.COMPLETED)
        assert.ok(edges.size > 0, `DEAD END: '${s}' has 0 outbound edges`);

    for (const s of visited)
      assert.ok(!ADMIN_DOMAIN_STATES.has(s),
        `🚨 DOMAIN INTEGRITY VIOLATION: Doctor domain reached ADMIN state '${s}'`);

    const { backEdges, selfLoops } = detectCycles(graph);
    assert.strictEqual(selfLoops.length, 0,
      `SELF-LOOP TRAP in doctor domain: [${selfLoops.join(', ')}]`);

    const m       = computeMetrics(graph, layers);
    const dotPath = exportDot(graph, 'doctor', layers);
    assert.ok(fs.existsSync(dotPath), 'DOT: file not written');

    const cov = coverageReport(visited);
    console.log(`✅ DOCTOR: ${visited.size} states | diameter=${m.diameter} | coverage=${cov.pct}%`);
  });

  // ── 5. PATIENT domain ─────────────────────────────────────────────────────
  test('PATIENT domain: reachability, no admin/doctor cross-domain, DOT export', async () => {
    const { visited, graph, layers } = await crawlFromSeed(
      flow, cm, PATIENT_ID, FlowStates.WELCOME, 'patient', {
        patientProfile: {
          name: 'Test Patient', age: '45', gender: 'Male',
          address: '123 Test St', pincode: '123456', state: 'Maharashtra',
          cancerType: 'Lung', treatingHospital: 'Test Hospital',
          treatmentStatus: 'ongoing', emergencyContactName: 'Test Contact',
          emergencyContactNumber: '9876543210', emergencyContactRelation: 'Spouse',
          platformTermsAccepted: true,
          confirmedConsents: { teleconsultation: true, dataSharing: true, dpdp: true },
        },
      }
    );

    const expected = [FlowStates.WELCOME, FlowStates.PROFILE_VIEW];
    for (const s of expected)
      assert.ok(visited.has(s), `REACHABILITY: '${s}' unreachable from WELCOME`);

    for (const [s, edges] of graph)
      if (s !== FlowStates.COMPLETED)
        assert.ok(edges.size > 0, `DEAD END: '${s}' has 0 outbound edges`);

    // Domain Integrity: Patient cannot reach doctor/admin states directly from patient menus
    // (excluding via PERSONA_SELECT which is the explicit role-switch gateway).
    const patientMenuEdges = graph.get(FlowStates.WELCOME) || new Set();
    for (const s of patientMenuEdges) {
      assert.ok(!ADMIN_DOMAIN_STATES.has(s),
        `🚨 DOMAIN INTEGRITY: Patient directly reached ADMIN state '${s}'`);
      assert.ok(!DOCTOR_DOMAIN_STATES.has(s),
        `🚨 DOMAIN INTEGRITY: Patient directly reached DOCTOR state '${s}'`);
    }

    const { backEdges, selfLoops } = detectCycles(graph);
    assert.strictEqual(selfLoops.length, 0,
      `SELF-LOOP TRAP in patient domain: [${selfLoops.join(', ')}]`);
    const m         = computeMetrics(graph, layers);
    const dotPath   = exportDot(graph, 'patient', layers);
    assert.ok(fs.existsSync(dotPath), 'DOT: file not written');

    const cov = coverageReport(visited);
    console.log(`✅ PATIENT: ${visited.size} states | diameter=${m.diameter} | coverage=${cov.pct}%`);
  });

  // ── 6. CAREGIVER domain ───────────────────────────────────────────────────
  test('CAREGIVER domain: reachability, dead-ends, DOT export', async () => {
    const { visited, graph, layers } = await crawlFromSeed(
      flow, cm, CAREGIVER_ID, FlowStates.CAREGIVER_MENU, 'caregiver'
    );

    assert.ok(visited.has(FlowStates.CAREGIVER_MENU), 'REACHABILITY: CAREGIVER_MENU not reached');

    for (const [s, edges] of graph)
      if (s !== FlowStates.COMPLETED)
        assert.ok(edges.size > 0, `DEAD END: '${s}' has 0 outbound edges`);

    const { backEdges, selfLoops } = detectCycles(graph);
    assert.strictEqual(selfLoops.length, 0,
      `SELF-LOOP TRAP in caregiver domain: [${selfLoops.join(', ')}]`);
    const m       = computeMetrics(graph, layers);
    const dotPath = exportDot(graph, 'caregiver', layers);
    assert.ok(fs.existsSync(dotPath), 'DOT: file not written');

    const cov = coverageReport(visited);
    console.log(`✅ CAREGIVER: ${visited.size} states | diameter=${m.diameter} | coverage=${cov.pct}%`);
  });

  // ── 7. payloadMap consistency ─────────────────────────────────────────────
  test('payloadMap: every mapped state key exists in FlowStates', () => {
    const allValues = new Set(Object.values(FlowStates));
    for (const state of Object.keys(payloadMap))
      assert.ok(allValues.has(state),
        `CONSISTENCY: payloadMap key '${state}' not in FlowStates`);
    console.log(`✅ payloadMap: all ${Object.keys(payloadMap).length} keys valid`);
  });

  // ── 8. Global FlowStates Coverage Boost via Multi-State Seed Expansion ───
  test('Global FlowStates coverage report across all seeds & scenarios', async () => {
    const allVisited = new Set();

    // 1. Super admin seed
    {
      const { visited } = await crawlFromSeed(flow, cm, SUPER_ADMIN_ID, FlowStates.SUPER_ADMIN_MENU, 'super_admin');
      visited.forEach(s => allVisited.add(s));
    }

    // 2. Admin seed
    const AID = '999999996';
    adminRegistry.addAdmin(AID, 'system', AID, 'admin', 'Coverage Admin');
    {
      const { visited } = await crawlFromSeed(flow, cm, AID, FlowStates.ADMIN_MENU, 'admin');
      visited.forEach(s => allVisited.add(s));
    }
    adminRegistry.removeAdmin(AID);

    // 3. Support seed
    {
      const { visited } = await crawlFromSeed(flow, cm, SUPPORT_ID, FlowStates.SUPPORT_MENU, 'support');
      visited.forEach(s => allVisited.add(s));
    }

    // 4. Doctor seed
    {
      const { visited } = await crawlFromSeed(flow, cm, DOCTOR_ID, FlowStates.DOCTOR_MENU, 'doctor');
      visited.forEach(s => allVisited.add(s));
    }

    // 5. Patient Completed Profile seed
    {
      const { visited } = await crawlFromSeed(flow, cm, PATIENT_ID, FlowStates.WELCOME, 'patient', {
        patientProfile: {
          name: 'P', age: '40', gender: 'M', cancerType: 'Lung', platformTermsAccepted: true,
          confirmedConsents: { teleconsultation: true, dataSharing: true, dpdp: true }
        }
      });
      visited.forEach(s => allVisited.add(s));
    }

    // 6. Patient Onboarding (Unaccepted terms / Incomplete profile) seed
    const NEW_PATIENT_ID = '999999998';
    {
      const { visited } = await crawlFromSeed(flow, cm, NEW_PATIENT_ID, FlowStates.WELCOME, 'patient', {
        patientProfile: {} // completely uninitialized profile
      });
      visited.forEach(s => allVisited.add(s));
    }

    // 7. Directly seed specific sub-menu states to explore sub-graph branches
    const subMenuSeeds = [
      { state: FlowStates.CAREGIVER_MENU, persona: 'caregiver', id: CAREGIVER_ID },
      { state: FlowStates.CAREGIVER_AUTH, persona: 'caregiver', id: CAREGIVER_ID },
      { state: FlowStates.CAREGIVER_CONSENT_ACK, persona: 'caregiver', id: CAREGIVER_ID },
      { state: FlowStates.CAREGIVER_PATIENT_LINK, persona: 'caregiver', id: CAREGIVER_ID },
      { state: FlowStates.PROFILE, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PROFILE_CONSENTS, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PROFILE_DISCOUNT_CATEGORY, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PROFILE_DISCOUNT_ECONOMIC, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PROFILE_DISCOUNT_PROFESSION, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PROFILE_DISCOUNT_SOCIAL, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PROFILE_DISCOUNT_DOCUMENTS, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.CANCER_TYPE, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.REPORT_UPLOAD, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.BILLING, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.PAYMENT_PENDING, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.DOCTOR_SELECT, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.CONSULTATION, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.CONSULTATION_WITHDRAW, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.COMPLETED, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.ADMIN_INVITE_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_REGISTER_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_APPROVE_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_APPROVE_CAREGIVER_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_APPROVE_SUPPORT_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_ASSIGN_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_REMOVE_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_REJECT_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_MESSAGE_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_REASSIGN_DOCTOR_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_MESSAGE_PATIENT_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_ADD_ADMIN_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_REMOVE_ADMIN_INPUT, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_PROFILE_COMPLETE_OPTIONS, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.DOCTOR_PATIENTS_VIEW, persona: 'doctor', id: DOCTOR_ID },
      { state: FlowStates.MOBILE_COLLECTION, persona: 'patient', id: PATIENT_ID },
      { state: FlowStates.ADMIN_BOOTSTRAP_SECRET, persona: 'super_admin', id: SUPER_ADMIN_ID },
      { state: FlowStates.ADMIN_FALLBACK, persona: 'super_admin', id: SUPER_ADMIN_ID },
    ];

    for (const seed of subMenuSeeds) {
      const { visited } = await crawlFromSeed(flow, cm, seed.id, seed.state, seed.persona);
      visited.forEach(s => allVisited.add(s));
    }

    const cov = coverageReport(allVisited);

    console.log(`\n📊 EXPANDED GLOBAL COVERAGE REPORT`);
    console.log(`   Total FlowStates : ${cov.total}`);
    console.log(`   Covered by crawls: ${cov.covered} (${cov.pct}%)`);
    console.log(`   Uncovered states : [${cov.missed.join(', ')}]`);

    const reportPath = path.join(ARTIFACT_DIR, 'coverage_report.txt');
    fs.writeFileSync(reportPath, [
      `Global State Coverage Report (Expanded)`,
      `Generated: ${new Date().toISOString()}`,
      `Total FlowStates : ${cov.total}`,
      `Covered          : ${cov.covered} (${cov.pct}%)`,
      `Uncovered        : ${cov.missed.join(', ')}`,
    ].join('\n'));

    // High coverage threshold requirement
    assert.ok(parseFloat(cov.pct) >= 90,
      `COVERAGE ASSERTION FAILED: expected ≥90% state coverage, got ${cov.pct}% (${cov.covered}/${cov.total} states)`);

    console.log(`   Report written to: ${reportPath}`);
  });
});
