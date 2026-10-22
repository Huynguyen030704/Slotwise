import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Check, Coffee, Flag, GripVertical, Pin, Users, Wind, Zap } from '../../ui/icons';
import { useTranslation } from 'react-i18next';
import { checkPlacement, snapToGrid } from '@slotwise/core';
import { AppText } from '../../ui/AppText';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { formatClock } from '../../lib/format';
import { registerDropTarget } from '../../lib/dragBus';

export const PPM = 1.4; // pixels per minute
const GUTTER = 52;
const GRID = 15;
const EDGE = 64; // auto-scroll band at the top and bottom of the viewport
const IS_WEB = Platform.OS === 'web';

/**
 * @typedef {object} TaskBlock
 * @property {import('@slotwise/core/types.js').TreeNode} node
 * @property {number} startMin
 * @property {boolean} done
 */

/**
 * @typedef {object} FixedBlock
 * @property {string} id
 * @property {'meeting' | 'lunch'} kind
 * @property {string} label
 * @property {number} startMin
 * @property {number} endMin
 */

/**
 * Day timeline with drag-to-pin. Touch drags from the grip only (keeps scrolling smooth), the
 * mouse drags the whole block. Alternatives for every drag live in the block menu.
 * @param {{
 *   workStartMin: number,
 *   workEndMin: number,
 *   peak: { startMin: number, endMin: number },
 *   fixed: FixedBlock[],
 *   blocks: TaskBlock[],
 *   onBlockPress: (node: import('@slotwise/core/types.js').TreeNode) => void,
 *   onToggleDone: (block: TaskBlock) => void,
 *   onPin: (id: string, startMin: number) => void,
 *   onUnpin: (id: string) => void,
 *   onReject: (message: string) => void,
 *   emptyHint?: import('react').ReactNode,
 *   top?: import('react').ReactNode,
 * }} props
 */
export function Timeline({
  workStartMin,
  workEndMin,
  peak,
  fixed,
  blocks,
  onBlockPress,
  onToggleDone,
  onPin,
  onUnpin,
  onReject,
  top,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollRef = useRef(/** @type {any} */ (null));
  const frameRef = useRef(/** @type {any} */ (null));
  const scrollY = useRef(0);
  const frame = useRef({ top: 0, bottom: 0, left: 0, right: 0 });
  const gridY = useRef(0);
  const lastDrag = useRef(0);
  const session = useRef(
    /** @type {null | { id: string, orig: number, duration: number, pinned: boolean, scroll0: number, dy: number, absY: number, absX: number, cancelled: boolean, scrollDir: number }} */ (
      null
    ),
  );
  const [drag, setDrag] = useState(
    /** @type {null | { id: string, startMin: number, duration: number, placement: import('@slotwise/core/day.js').Placement | null, unpin: boolean }} */ (
      null
    ),
  );

  const height = (workEndMin - workStartMin) * PPM;
  const y = (/** @type {number} */ min) => (min - workStartMin) * PPM;

  const busyFor = useCallback(
    (/** @type {string} */ id) => [
      ...fixed.map((f) => ({ id: f.id, label: f.label, startMin: f.startMin, endMin: f.endMin })),
      ...blocks
        .filter((b) => b.node.id !== id && (b.done || b.node.pinnedStartMin !== null))
        .map((b) => ({
          id: b.node.id,
          label: b.node.title,
          startMin: b.startMin,
          endMin: b.startMin + b.node.durationMin,
        })),
    ],
    [fixed, blocks],
  );

  /** Recompute the preview from the session's latest pointer data. */
  const refresh = useCallback(() => {
    const s = session.current;
    if (!s || s.cancelled) return;
    const raw = s.orig + (s.dy + (scrollY.current - s.scroll0)) / PPM;
    const startMin = Math.max(
      workStartMin,
      Math.min(workEndMin - s.duration, snapToGrid(raw, GRID)),
    );
    const unpin = s.pinned && (s.absY < frame.current.top || s.absX < frame.current.left);
    setDrag({
      id: s.id,
      startMin,
      duration: s.duration,
      unpin,
      placement: unpin
        ? null
        : checkPlacement({
            startMin,
            durationMin: s.duration,
            workStartMin,
            workEndMin,
            busy: busyFor(s.id),
          }),
    });
  }, [workStartMin, workEndMin, busyFor]);

  const reasonText = useCallback(
    (/** @type {import('@slotwise/core/day.js').Placement} */ p) => {
      if (p.ok) return '';
      if (p.reason === 'outside') return t('calendar.pinOutside');
      return t('calendar.pinConflict', {
        title: /** @type {{ label?: string }} */ (p.with).label ?? '',
        range: `${formatClock(p.with.startMin)}–${formatClock(p.with.endMin)}`,
      });
    },
    [t],
  );

  const measureFrame = useCallback(() => {
    frameRef.current?.measureInWindow(
      (
        /** @type {number} */ fx,
        /** @type {number} */ fy,
        /** @type {number} */ fw,
        /** @type {number} */ fh,
      ) => {
        frame.current = { top: fy, bottom: fy + fh, left: fx, right: fx + fw };
      },
    );
  }, []);

  const start = useCallback(
    (/** @type {TaskBlock} */ b) => {
      measureFrame();
      session.current = {
        id: b.node.id,
        orig: b.startMin,
        duration: b.node.durationMin,
        pinned: b.node.pinnedStartMin !== null,
        scroll0: scrollY.current,
        dy: 0,
        absY: 0,
        absX: 0,
        cancelled: false,
        scrollDir: 0,
      };
    },
    [measureFrame],
  );

  const move = useCallback(
    (/** @type {number} */ dy, /** @type {number} */ absY, /** @type {number} */ absX) => {
      const s = session.current;
      if (!s || s.cancelled) return;
      s.dy = dy;
      s.absY = absY;
      s.absX = absX;
      s.scrollDir =
        absY < frame.current.top + EDGE && absY >= frame.current.top
          ? -1
          : absY > frame.current.bottom - EDGE
            ? 1
            : 0;
      refresh();
    },
    [refresh],
  );

  const finish = useCallback(
    (/** @type {boolean} */ ok) => {
      const s = session.current;
      session.current = null;
      lastDrag.current = Date.now();
      setDrag(null);
      if (!s || s.cancelled || !ok) return;
      const raw = s.orig + (s.dy + (scrollY.current - s.scroll0)) / PPM;
      const startMin = Math.max(
        workStartMin,
        Math.min(workEndMin - s.duration, snapToGrid(raw, GRID)),
      );
      if (s.pinned && (s.absY < frame.current.top || s.absX < frame.current.left)) {
        onUnpin(s.id);
        return;
      }
      if (startMin === s.orig && !s.pinned) {
        // Moved nowhere: keep auto placement.
        return;
      }
      const placement = checkPlacement({
        startMin,
        durationMin: s.duration,
        workStartMin,
        workEndMin,
        busy: busyFor(s.id),
      });
      if (placement.ok) onPin(s.id, startMin);
      else onReject(t('calendar.reject', { reason: reasonText(placement) }));
    },
    [workStartMin, workEndMin, busyFor, onPin, onUnpin, onReject, reasonText, t],
  );

  // Auto-scroll near the viewport edges while dragging.
  useEffect(() => {
    if (!drag) return undefined;
    const id = setInterval(() => {
      const s = session.current;
      if (!s || !s.scrollDir) return;
      const next = Math.max(0, Math.min(height, scrollY.current + s.scrollDir * 14));
      scrollRef.current?.scrollTo({ y: next, animated: false });
      scrollY.current = next;
      refresh();
    }, 32);
    return () => clearInterval(id);
  }, [drag, height, refresh]);

  // Escape cancels a drag (web).
  useEffect(() => {
    if (!drag || !IS_WEB) return undefined;
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key !== 'Escape' || !session.current) return;
      session.current.cancelled = true;
      lastDrag.current = Date.now();
      setDrag(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag]);

  // Lets a drag from the task list preview and drop on this timeline (wide layout).
  const latest = useRef({ blocks, busyFor, onPin, onReject, reasonText, t });
  latest.current = { blocks, busyFor, onPin, onReject, reasonText, t };
  useEffect(
    () =>
      registerDropTarget({
        start: measureFrame,
        hover: (x, yy, p) => {
          const f = frame.current;
          if (!p.schedulable || x < f.left || x > f.right || yy < f.top || yy > f.bottom) {
            return false;
          }
          const raw =
            workStartMin +
            (yy - (f.top - scrollY.current + gridY.current)) / PPM -
            p.durationMin / 2;
          const startMin = Math.max(
            workStartMin,
            Math.min(workEndMin - p.durationMin, snapToGrid(raw, GRID)),
          );
          setDrag({
            id: p.id,
            startMin,
            duration: p.durationMin,
            unpin: false,
            placement: checkPlacement({
              startMin,
              durationMin: p.durationMin,
              workStartMin,
              workEndMin,
              busy: latest.current.busyFor(p.id),
            }),
          });
          return true;
        },
        leave: () => {
          if (!session.current) setDrag(null);
        },
        drop: (x, yy, p) => {
          const f = frame.current;
          if (!p.schedulable || x < f.left || x > f.right || yy < f.top || yy > f.bottom) {
            return false;
          }
          const raw =
            workStartMin +
            (yy - (f.top - scrollY.current + gridY.current)) / PPM -
            p.durationMin / 2;
          const startMin = Math.max(
            workStartMin,
            Math.min(workEndMin - p.durationMin, snapToGrid(raw, GRID)),
          );
          const placement = checkPlacement({
            startMin,
            durationMin: p.durationMin,
            workStartMin,
            workEndMin,
            busy: latest.current.busyFor(p.id),
          });
          setDrag(null);
          if (placement.ok) latest.current.onPin(p.id, startMin);
          else {
            latest.current.onReject(
              latest.current.t('calendar.reject', { reason: latest.current.reasonText(placement) }),
            );
          }
          return true;
        },
      }),
    [measureFrame, workStartMin, workEndMin],
  );

  const hours = [];
  for (let m = Math.ceil(workStartMin / 60) * 60; m <= workEndMin; m += 60) hours.push(m);

  return (
    <View style={{ flex: 1 }}>
      {drag && drag.unpin ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: spacing.md,
            backgroundColor: colors.danger,
          }}
        >
          <AppText tone="accentInk" weight="bodyBold" style={{ textAlign: 'center' }}>
            {t('calendar.dragToUnpin')}
          </AppText>
        </View>
      ) : null}
      <View ref={frameRef} collapsable={false} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEnabled={!drag}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96, gap: spacing.md }}
        >
          {top}
          <View
            style={{ height, marginTop: spacing.sm }}
            onLayout={(e) => {
              gridY.current = e.nativeEvent.layout.y;
            }}
          >
            {/* peak band */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: GUTTER,
                right: 0,
                top: y(peak.startMin),
                height: (peak.endMin - peak.startMin) * PPM,
                backgroundColor: colors.peakBg,
                borderLeftWidth: 3,
                borderLeftColor: colors.peakLine,
                borderTopRightRadius: radius.md,
                borderBottomRightRadius: radius.md,
              }}
            >
              <AppText size={12} tone="muted" style={{ position: 'absolute', right: 10, top: 6 }}>
                {t('calendar.peak')}
              </AppText>
            </View>
            {/* hour lines */}
            {hours.map((m) => (
              <View
                key={m}
                pointerEvents="none"
                style={{ position: 'absolute', left: 0, right: 0, top: y(m) }}
              >
                <AppText size={12} tone="muted" style={{ position: 'absolute', top: -9 }}>
                  {formatClock(m)}
                </AppText>
                <View style={{ marginLeft: GUTTER - 6, height: 1, backgroundColor: colors.line }} />
              </View>
            ))}
            {/* meetings, lunch */}
            {fixed.map((f) => {
              const Icon = f.kind === 'lunch' ? Coffee : Users;
              return (
                <View
                  key={f.id}
                  accessible
                  accessibilityLabel={`${f.label} ${formatClock(f.startMin)}–${formatClock(f.endMin)}`}
                  style={{
                    position: 'absolute',
                    left: GUTTER + 6,
                    right: 4,
                    top: y(f.startMin) + 1,
                    height: (f.endMin - f.startMin) * PPM - 2,
                    backgroundColor: colors.busy,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.muted,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    overflow: 'hidden',
                  }}
                >
                  <Icon size={14} color={colors.muted} />
                  <AppText size={13} tone="muted" numberOfLines={1}>
                    {f.label} · {formatClock(f.startMin)}–{formatClock(f.endMin)}
                  </AppText>
                </View>
              );
            })}
            {/* tasks */}
            {blocks.map((b) => (
              <TaskBlockView
                key={b.node.id}
                block={b}
                workStartMin={workStartMin}
                dragging={drag?.id === b.node.id}
                onPress={() => {
                  if (session.current || Date.now() - lastDrag.current < 400) return;
                  onBlockPress(b.node);
                }}
                onToggleDone={() => onToggleDone(b)}
                gesture={
                  b.done
                    ? null
                    : Gesture.Pan()
                        .minDistance(6)
                        .runOnJS(true)
                        .onStart(() => start(b))
                        .onUpdate((e) => move(e.translationY, e.absoluteY, e.absoluteX))
                        .onEnd((_e, success) => finish(success))
                        .onFinalize(() => {
                          if (session.current) finish(false);
                        })
                }
              />
            ))}
            {/* drag preview */}
            {drag && !drag.unpin ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: GUTTER + 6,
                  right: 4,
                  top: y(drag.startMin) + 1,
                  height: drag.duration * PPM - 2,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: drag.placement?.ok ? colors.ok : colors.danger,
                  backgroundColor: drag.placement?.ok
                    ? 'rgba(31,122,77,0.18)'
                    : 'rgba(179,38,30,0.18)',
                  paddingHorizontal: spacing.sm,
                  justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                <AppText
                  size={12}
                  weight="bodyBold"
                  tone={drag.placement?.ok ? 'ok' : 'danger'}
                  numberOfLines={2}
                >
                  {formatClock(drag.startMin)}–{formatClock(drag.startMin + drag.duration)}
                  {drag.placement && !drag.placement.ok ? ` · ${reasonText(drag.placement)}` : ''}
                </AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/**
 * @param {{
 *   block: TaskBlock,
 *   workStartMin: number,
 *   dragging: boolean,
 *   gesture: import('react-native-gesture-handler').GestureType | null,
 *   onPress: () => void,
 *   onToggleDone: () => void,
 * }} props
 */
function TaskBlockView({ block, workStartMin, dragging, gesture, onPress, onToggleDone }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { node, startMin, done } = block;
  const heavy = node.energy === 'heavy';
  const bg = done ? colors.surface : heavy ? colors.heavy : colors.light;
  const fgColor = done ? colors.muted : heavy ? colors.accentInk : colors.lightInk;
  const Icon = heavy ? Zap : Wind;
  const h = node.durationMin * PPM - 2;
  const roomy = h >= 44;
  const pinned = node.pinnedStartMin !== null;

  const body = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${node.title}, ${formatClock(startMin)}–${formatClock(startMin + node.durationMin)}`}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.sm,
      }}
    >
      <Icon size={14} color={fgColor} />
      <View style={{ flex: 1 }}>
        <AppText
          size={13}
          weight="bodyBold"
          numberOfLines={roomy ? 2 : 1}
          style={{ color: fgColor, textDecorationLine: done ? 'line-through' : 'none' }}
        >
          {node.title}
        </AppText>
        {roomy ? (
          <AppText size={12} style={{ color: fgColor }}>
            {formatClock(startMin)}–{formatClock(startMin + node.durationMin)}
          </AppText>
        ) : null}
      </View>
      {pinned && !done ? <Pin size={13} color={fgColor} /> : null}
      {node.doLast && !done ? <Flag size={13} color={fgColor} /> : null}
    </Pressable>
  );

  const grip = !done ? (
    <View style={{ width: 28, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <GripVertical size={16} color={fgColor} />
    </View>
  ) : null;

  const content = (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      {IS_WEB ? null : gesture ? <GestureDetector gesture={gesture}>{grip}</GestureDetector> : null}
      {body}
      {roomy ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={t(done ? 'actions.undone' : 'actions.done')}
          onPress={onToggleDone}
          style={{ width: 40, height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.sm,
              borderWidth: 2,
              borderColor: done ? colors.ok : fgColor,
              backgroundColor: done ? colors.ok : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {done ? <Check size={13} color={colors.surface} strokeWidth={3} /> : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        position: 'absolute',
        left: GUTTER + 6,
        right: 4,
        top: (startMin - workStartMin) * PPM + 1,
        height: h,
        backgroundColor: bg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: done ? colors.ok : bg,
        overflow: 'hidden',
        opacity: dragging ? 0.45 : 1,
      }}
    >
      {IS_WEB && gesture ? <GestureDetector gesture={gesture}>{content}</GestureDetector> : content}
    </View>
  );
}
