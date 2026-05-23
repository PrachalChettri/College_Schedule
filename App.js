import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { EVENTS, PHASES, SUBJECT_COLORS, TYPE_COLORS } from './events';

// ─── Helpers ────────────────────────────────────────────────────────────────
function getDaysRemaining(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function getUrgencyStyle(days) {
  if (days < 0)  return { color: '#555', label: 'Done' };
  if (days === 0) return { color: '#FF4D6D', label: 'TODAY' };
  if (days <= 7)  return { color: '#FF4D6D', label: `${days}d left` };
  if (days <= 14) return { color: '#FF8C42', label: `${days}d left` };
  if (days <= 30) return { color: '#F5C518', label: `${days}d left` };
  return { color: '#50C878', label: `${days}d left` };
}

// ─── Components ─────────────────────────────────────────────────────────────

function ProgressRing({ total, done }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <View style={styles.ringWrap}>
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Text style={styles.ringPct}>{pct}%</Text>
          <Text style={styles.ringLabel}>done</Text>
        </View>
      </View>
      <View style={styles.ringStats}>
        <Text style={styles.ringStat}><Text style={{ color: '#50C878' }}>{done}</Text> completed</Text>
        <Text style={styles.ringStat}><Text style={{ color: '#4DA6FF' }}>{total - done}</Text> remaining</Text>
      </View>
    </View>
  );
}

function FocusBanner({ events, completed }) {
  const next = events.find(e => !completed.has(e.id) && getDaysRemaining(e.date) >= 0);
  if (!next) return (
    <View style={[styles.banner, { borderColor: '#50C878' }]}>
      <Text style={styles.bannerEmoji}>🎉</Text>
      <Text style={styles.bannerText}>All deadlines cleared!</Text>
    </View>
  );
  const days = getDaysRemaining(next.date);
  const phase = PHASES.find(p => p.id === next.phase);
  return (
    <View style={[styles.banner, { borderColor: phase?.color || '#F5C518' }]}>
      <View style={styles.bannerLeft}>
        <Text style={styles.bannerTag}>⚡ NEXT UP</Text>
        <Text style={styles.bannerTitle} numberOfLines={1}>{next.title}</Text>
        <Text style={styles.bannerSub}>{next.subject} · {formatDate(next.date)}</Text>
      </View>
      <View style={[styles.bannerBadge, { backgroundColor: phase?.color || '#F5C518' }]}>
        <Text style={styles.bannerBadgeDays}>{days === 0 ? '!' : days}</Text>
        <Text style={styles.bannerBadgeLabel}>{days === 0 ? 'TODAY' : 'days'}</Text>
      </View>
    </View>
  );
}

function EventCard({ event, completed, onToggle }) {
  const isDone = completed.has(event.id);
  const days = getDaysRemaining(event.date);
  const urgency = getUrgencyStyle(days);
  const subjectColor = SUBJECT_COLORS[event.subject] || '#A0A0A0';
  const typeColor = TYPE_COLORS[event.type] || '#A0A0A0';

  return (
    <TouchableOpacity
      style={[styles.card, isDone && styles.cardDone]}
      onPress={() => onToggle(event.id)}
      activeOpacity={0.7}
    >
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: isDone ? '#333' : subjectColor }]} />

      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={styles.cardTags}>
            <View style={[styles.tag, { backgroundColor: isDone ? '#2a2a2a' : `${subjectColor}22`, borderColor: isDone ? '#333' : subjectColor }]}>
              <Text style={[styles.tagText, { color: isDone ? '#555' : subjectColor }]}>{event.subject}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: isDone ? '#2a2a2a' : `${typeColor}22`, borderColor: isDone ? '#333' : typeColor }]}>
              <Text style={[styles.tagText, { color: isDone ? '#555' : typeColor }]}>{event.type}</Text>
            </View>
          </View>
          {/* Countdown */}
          {!isDone ? (
            <Text style={[styles.countdown, { color: urgency.color }]}>{urgency.label}</Text>
          ) : (
            <Text style={styles.doneText}>✓ Done</Text>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, isDone && styles.cardTitleDone]}>{event.title}</Text>

        {/* Date */}
        <Text style={[styles.cardDate, isDone && { color: '#444' }]}>{formatDate(event.date)}</Text>

        {/* Note */}
        {event.note !== '' && !isDone && (
          <Text style={styles.cardNote}>{event.note}</Text>
        )}
      </View>

      {/* Checkbox */}
      <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
        {isDone && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

function PhaseSection({ phase, events, completed, onToggle, collapsed, onToggleCollapse }) {
  const phaseEvents = events.filter(e => e.phase === phase.id);
  const donePct = phaseEvents.filter(e => completed.has(e.id)).length;
  const total = phaseEvents.length;
  const nextDays = phaseEvents
    .filter(e => !completed.has(e.id) && getDaysRemaining(e.date) >= 0)
    .map(e => getDaysRemaining(e.date))[0];

  return (
    <View style={styles.phaseWrap}>
      {/* Phase header */}
      <TouchableOpacity style={[styles.phaseHeader, { borderColor: phase.color }]} onPress={onToggleCollapse} activeOpacity={0.8}>
        <View style={styles.phaseLeft}>
          <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
          <View>
            <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
            <Text style={styles.phaseMeta}>{donePct}/{total} done{nextDays !== undefined ? `  ·  next in ${nextDays}d` : ''}</Text>
          </View>
        </View>
        <View style={styles.phaseRight}>
          <View style={[styles.phasePill, { backgroundColor: phase.bg, borderColor: phase.color }]}>
            <Text style={[styles.phasePillText, { color: phase.color }]}>{total - donePct} left</Text>
          </View>
          <Text style={[styles.chevron, { color: phase.color }]}>{collapsed ? '›' : '⌄'}</Text>
        </View>
      </TouchableOpacity>

      {/* Events */}
      {!collapsed && phaseEvents.map(event => (
        <EventCard key={event.id} event={event} completed={completed} onToggle={onToggle} />
      ))}
    </View>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [completed, setCompleted] = useState(new Set());
  const [collapsed, setCollapsed] = useState({});

  const toggleComplete = useCallback((id) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleCollapse = useCallback((phaseId) => {
    setCollapsed(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  }, []);

  const totalDone = useMemo(() => EVENTS.filter(e => completed.has(e.id)).length, [completed]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Tracker</Text>
            <Text style={styles.headerDate}>{getTodayLabel()}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Sem 2</Text>
          </View>
        </View>

        {/* ── Progress ── */}
        <View style={styles.progressCard}>
          <Text style={styles.progressHeading}>Semester Progress</Text>
          <ProgressRing total={EVENTS.length} done={totalDone} />
        </View>

        {/* ── Focus Banner ── */}
        <FocusBanner events={EVENTS} completed={completed} />

        {/* ── Warning strip ── */}
        <View style={styles.warnStrip}>
          <Text style={styles.warnText}>⚠️  Critical window: June 20 → July 15  ·  30+ days of continuous deadlines</Text>
        </View>

        {/* ── Phases ── */}
        {PHASES.map(phase => (
          <PhaseSection
            key={phase.id}
            phase={phase}
            events={EVENTS}
            completed={completed}
            onToggle={toggleComplete}
            collapsed={!!collapsed[phase.id]}
            onToggleCollapse={() => toggleCollapse(phase.id)}
          />
        ))}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Tap any card to mark it complete ✓</Text>
          <Text style={styles.footerSub}>{EVENTS.length} total deadlines · Good luck! 💪</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0A0A0F',
  surface: '#111118',
  card:    '#16161F',
  border:  '#1E1E2A',
  text:    '#F0F0F5',
  muted:   '#6B6B80',
  dim:     '#3A3A4A',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 30, fontWeight: '800', color: C.text,
    letterSpacing: -0.8,
  },
  headerDate: { fontSize: 13, color: C.muted, marginTop: 3 },
  headerBadge: {
    backgroundColor: '#1A1A28', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 6, borderWidth: 1, borderColor: C.border,
  },
  headerBadgeText: { color: '#B57BFF', fontSize: 12, fontWeight: '700' },

  // Progress card
  progressCard: {
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: C.surface, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: C.border,
  },
  progressHeading: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase' },
  ringWrap: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringOuter: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#50C878',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(80,200,120,0.08)',
  },
  ringInner: { alignItems: 'center' },
  ringPct: { fontSize: 18, fontWeight: '800', color: '#50C878' },
  ringLabel: { fontSize: 10, color: C.muted },
  ringStats: { gap: 6 },
  ringStat: { fontSize: 14, color: C.muted },

  // Focus banner
  banner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  bannerLeft: { flex: 1, marginRight: 12 },
  bannerTag: { fontSize: 10, fontWeight: '800', color: '#F5C518', letterSpacing: 1, marginBottom: 4 },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 3 },
  bannerSub: { fontSize: 12, color: C.muted },
  bannerEmoji: { fontSize: 28, marginRight: 12 },
  bannerText: { fontSize: 16, fontWeight: '700', color: '#50C878' },
  bannerBadge: {
    width: 56, height: 56, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  bannerBadgeDays: { fontSize: 22, fontWeight: '900', color: '#000' },
  bannerBadgeLabel: { fontSize: 9, fontWeight: '800', color: '#00000088' },

  // Warn strip
  warnStrip: {
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: 'rgba(255,77,109,0.08)',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,77,109,0.25)',
  },
  warnText: { color: '#FF4D6D', fontSize: 12, fontWeight: '600', lineHeight: 18 },

  // Phase
  phaseWrap: { marginHorizontal: 16, marginBottom: 16 },
  phaseHeader: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  phaseLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phaseEmoji: { fontSize: 22 },
  phaseLabel: { fontSize: 16, fontWeight: '800' },
  phaseMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  phaseRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phasePill: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
  },
  phasePillText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 22, fontWeight: '300' },

  // Card
  card: {
    backgroundColor: C.card, borderRadius: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardDone: { opacity: 0.45 },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1, marginRight: 8 },
  tag: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  countdown: { fontSize: 13, fontWeight: '800' },
  doneText: { fontSize: 12, color: '#50C878', fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardTitleDone: { textDecorationLine: 'line-through', color: C.dim },
  cardDate: { fontSize: 12, color: C.muted },
  cardNote: {
    marginTop: 8, fontSize: 12, color: '#B57BFF',
    backgroundColor: 'rgba(181,123,255,0.08)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderLeftWidth: 2, borderLeftColor: '#B57BFF',
  },

  // Checkbox
  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 1.5,
    borderColor: C.dim, marginRight: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: '#50C878', borderColor: '#50C878' },
  checkMark: { color: '#000', fontSize: 14, fontWeight: '900' },

  // Footer
  footer: { marginTop: 12, alignItems: 'center', paddingHorizontal: 20 },
  footerText: { color: C.muted, fontSize: 13 },
  footerSub: { color: C.dim, fontSize: 12, marginTop: 4 },
});
