import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { confirmAction, notify } from '@/lib/confirm';
import { explain } from '@/lib/dbError';
import { formatDate } from '@/lib/format';
import {
  listMyRequests,
  sendExerciseRequest,
  STATUS_LABEL,
  withdrawRequest,
  type ExerciseRequest,
} from '@/lib/requests';
import { EQUIPMENT, MUSCLE_GROUPS } from '@/lib/types';
import { colors, muscleColor, radius, spacing } from '@/lib/theme';

/**
 * Asking for a movement that is not in the catalogue.
 *
 * Making one by hand already works and solves it for one person. This is for
 * the ones worth adding for everybody — and it shows what became of each ask,
 * because a request that vanishes into a form is one nobody sends twice.
 */
export default function RequestsScreen() {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [gear, setGear] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<ExerciseRequest[]>([]);

  const load = useCallback(() => {
    listMyRequests()
      .then(setMine)
      .catch(() => {
        // The form still works without the history behind it.
      });
  }, []);

  useFocusEffect(load);

  const trimmed = name.trim();

  async function send() {
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendExerciseRequest({
        name: trimmed,
        muscleGroup: group,
        equipment: gear,
        note,
      });
      setName('');
      setGroup(null);
      setGear(null);
      setNote('');
      load();
      notify('보냈어요', '읽는 대로 여기에 답이 보여요.');
    } catch (e: any) {
      notify('보내지 못했어요', explain(e));
    } finally {
      setSending(false);
    }
  }

  function withdraw(request: ExerciseRequest) {
    confirmAction('요청 취소', `"${request.name}" 요청을 지울까요?`, async () => {
      try {
        await withdrawRequest(request.id);
        load();
      } catch (e: any) {
        notify('지우지 못했어요', explain(e));
      }
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        찾으시는 운동이 목록에 없나요? 이름만 알려주시면 살펴보고 기본 목록에 넣을게요.
        {'\n'}직접 만들어 쓰셔도 되고, 넣어달라고 하셔도 돼요.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="운동 이름 (예: 랜드마인 프레스)"
        placeholderTextColor={colors.textDim}
        value={name}
        onChangeText={setName}
      />

      {/*
        Both optional, and said to be. A guess that turns out wrong still
        narrows it to a handful of movements, and demanding one from someone
        who only knows what the machine looks like is how a form stops being
        filled in.
      */}
      <Text style={styles.label}>어느 부위인가요? (몰라도 괜찮아요)</Text>
      <View style={styles.chipRow}>
        {MUSCLE_GROUPS.map((g) => (
          <Pressable
            key={g}
            style={[
              styles.chip,
              group === g && {
                backgroundColor: `${muscleColor(g)}26`,
                borderColor: muscleColor(g),
              },
            ]}
            onPress={() => setGroup(group === g ? null : g)}>
            <Text
              style={[
                styles.chipText,
                group === g && { color: muscleColor(g), fontWeight: '700' },
              ]}>
              {g}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>무엇으로 하나요? (몰라도 괜찮아요)</Text>
      <View style={styles.chipRow}>
        {EQUIPMENT.map((g) => (
          <Pressable
            key={g}
            style={[styles.chip, gear === g && styles.chipOn]}
            onPress={() => setGear(gear === g ? null : g)}>
            <Text style={[styles.chipText, gear === g && styles.chipTextOn]}>{g}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={[styles.input, styles.note]}
        placeholder="한마디 (예: 헬스장에 있는데 이름을 모르겠어요)"
        placeholderTextColor={colors.textDim}
        value={note}
        onChangeText={setNote}
        multiline
      />

      <Pressable
        style={[styles.send, (!trimmed || sending) && styles.sendOff]}
        disabled={!trimmed || sending}
        onPress={send}>
        <Text style={styles.sendText}>{sending ? '보내는 중…' : '이 운동 넣어주세요'}</Text>
      </Pressable>

      {mine.length > 0 && (
        <>
          <Text style={styles.heading}>보낸 요청</Text>
          {mine.map((request) => (
            <View key={request.id} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{request.name}</Text>
                <Text style={styles.rowSub}>
                  {formatDate(request.created_at, 'short')} · {STATUS_LABEL[request.status]}
                </Text>
                {/* Their answer, where the person who asked will actually see it. */}
                {!!request.reply && <Text style={styles.reply}>{request.reply}</Text>}
              </View>
              {request.status === 'new' && (
                <Pressable hitSlop={8} onPress={() => withdraw(request)}>
                  <Ionicons name="close" size={18} color={colors.textDim} />
                </Pressable>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  hint: { color: colors.textDim, fontSize: 13, lineHeight: 20, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
  },
  note: { minHeight: 72, textAlignVertical: 'top' },
  label: { color: colors.textDim, fontSize: 12, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.faint,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 13 },
  chipTextOn: { color: colors.accent, fontWeight: '700' },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sendOff: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
  heading: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowSub: { color: colors.textDim, fontSize: 12 },
  reply: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
