import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Portrait } from '@/components/Portrait';
import { ScreenState } from '@/components/ScreenState';
import { confirmAction, notify } from '@/lib/confirm';
import {
  addFriend,
  collectGifts,
  ensureFriendCard,
  listFriends,
  listTogetherDays,
  myFriendName,
  removeFriend,
  sendGift,
  type Friend,
} from '@/lib/db';
import { explain } from '@/lib/dbError';
import {
  arrivedLines,
  arrivedTotal,
  displayName,
  GIFT_AMOUNTS,
  isCode,
  lastTrainedLine,
  normaliseCode,
  TOGETHER_BONUS,
  togetherLine,
  togetherStreak,
  trainedToday,
} from '@/lib/friends';
import { girlOf, useGirl } from '@/lib/girl';
import { withParticle } from '@/lib/korean';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Friends: a code to hand out, a box to type one in, and the people found.
 *
 * Each friend is a girl first and a name second, because what there is to do
 * with a friend here is visit her room and send her something. How much
 * anyone lifted is never shown — only whether they went today, which is the
 * nudge, and which is what earns both of them the bonus.
 */
export default function FriendsScreen() {
  const router = useRouter();
  const girl = useGirl();
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  /** The friend whose gift amounts are open, if any. */
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const [together, setTogether] = useState<Map<string, string[]>>(new Map());

  const load = useCallback(() => {
    setError(null);
    myFriendName()
      .then(async (stored) => {
        setName(stored);
        setSavedName(stored);
        // Keeps the girl on the card current: she is chosen on the phone, and
        // a friend visiting should find the one actually being raised.
        setCode(await ensureFriendCard(stored, girl.id));
        const [list, together] = await Promise.all([listFriends(), listTogetherDays()]);
        setTogether(together);
        setFriends(list);
        const arrived = await collectGifts().catch(() => []);
        if (arrived.length) {
          notify(`친구에게서 골드 ${arrivedTotal(arrived)}G가 왔어요`, arrivedLines(arrived).join('\n'));
        }
      })
      .catch((e) => setError(explain(e)));
  }, [girl.id]);

  useFocusEffect(load);

  async function saveName() {
    const next = name.trim();
    if (next === savedName) return;
    try {
      await ensureFriendCard(next, girl.id);
      setSavedName(next);
    } catch (e: any) {
      notify('이름 저장 실패', explain(e));
    }
  }

  async function shareCode() {
    if (!code) return;
    try {
      await Share.share({ message: `프린세스 핏 친구 코드 ${code}` });
    } catch {
      // Sharing is not everywhere; the code is on screen to read out.
      notify('내 친구 코드', code);
    }
  }

  async function add() {
    const wanted = normaliseCode(typed);
    if (!isCode(wanted)) {
      notify('코드를 확인해 주세요', '친구 코드는 영문과 숫자 6자리예요.');
      return;
    }
    setBusy(true);
    try {
      const who = await addFriend(wanted);
      setTyped('');
      notify('친구가 되었어요', `${displayName(who)}의 방에 놀러 갈 수 있어요.`);
      setFriends(await listFriends());
    } catch (e: any) {
      notify('친구를 맺지 못했어요', explain(e));
    } finally {
      setBusy(false);
    }
  }

  // Three buttons rather than an amount box: the server only takes these
  // amounts anyway, and a box invites typing 5000.
  function gift(friend: Friend, amount: number) {
    confirmAction(
      `${displayName(friend.name)}에게 선물`,
      `${amount}G를 보낼까요?\n\n한 친구에게 하루 한 번 보낼 수 있어요.`,
      () => send(friend, amount)
    );
  }

  async function send(friend: Friend, amount: number) {
    setGiftFor(null);
    try {
      await sendGift(friend.user_id, amount);
      notify('보냈어요', `${withParticle(displayName(friend.name), '이가')} 다음에 앱을 열면 받아요.`);
    } catch (e: any) {
      notify('보내지 못했어요', explain(e));
    }
  }

  function unfriend(friend: Friend) {
    confirmAction(
      '친구 끊기',
      `${withParticle(displayName(friend.name), '와과')} 친구를 끊을까요?\n\n서로의 방에 갈 수 없게 돼요.`,
      async () => {
        try {
          await removeFriend(friend.user_id);
          setFriends((list) => (list ?? []).filter((f) => f.user_id !== friend.user_id));
        } catch (e: any) {
          notify('끊지 못했어요', explain(e));
        }
      }
    );
  }

  if (!friends || !code) return <ScreenState error={error} onRetry={load} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내 친구 코드</Text>
        <Pressable style={styles.codeRow} onPress={shareCode}>
          <Text style={styles.code}>{code}</Text>
          <Ionicons name="share-outline" size={20} color={colors.accent} />
        </Pressable>
        <Text style={styles.label}>친구에게 보일 이름</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          placeholder="이름을 적어 주세요"
          placeholderTextColor={colors.textDim}
          maxLength={20}
          returnKeyType="done"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>친구 맺기</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.addInput]}
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={add}
            placeholder="친구 코드 6자리"
            placeholderTextColor={colors.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            returnKeyType="done"
          />
          <Pressable style={[styles.addButton, busy && styles.off]} disabled={busy} onPress={add}>
            <Text style={styles.addText}>맺기</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>
          같은 날 둘 다 운동하면 둘 다 {TOGETHER_BONUS}G씩 더 받아요.
        </Text>
      </View>

      {friends.length === 0 ? (
        <Text style={styles.empty}>아직 친구가 없어요. 코드를 나눠 보세요.</Text>
      ) : (
        friends.map((friend) => {
          const went = trainedToday(friend.last_trained);
          const open = giftFor === friend.user_id;
          const run = togetherLine(togetherStreak(together.get(friend.user_id) ?? []));
          return (
            <View key={friend.user_id} style={styles.friend}>
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/friend/[id]', params: { id: friend.user_id } })
              }
              onLongPress={() => unfriend(friend)}>
              <Portrait source={girlOf(friend.girl).base} size={48} />
              <View style={styles.rowBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.rowName}>{displayName(friend.name)}</Text>
                  {run && (
                    <View style={styles.run}>
                      <Ionicons name="flame" size={12} color={colors.danger} />
                      <Text style={styles.runText}>{run}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.rowSub, went && styles.went]}>
                  {lastTrainedLine(friend.last_trained)}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                style={styles.giftButton}
                onPress={() => setGiftFor(open ? null : friend.user_id)}
                accessibilityLabel="선물 보내기">
                <Ionicons name={open ? 'gift' : 'gift-outline'} size={20} color={colors.accent} />
              </Pressable>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </Pressable>
            {open && (
              <View style={styles.amounts}>
                {GIFT_AMOUNTS.map((amount) => (
                  <Pressable
                    key={amount}
                    style={styles.amount}
                    onPress={() => gift(friend, amount)}>
                    <Text style={styles.amountText}>{amount} G</Text>
                  </Pressable>
                ))}
              </View>
            )}
            </View>
          );
        })
      )}
      {friends.length > 0 && (
        <Text style={styles.note}>눌러서 방 구경 · 길게 눌러 친구 끊기</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  code: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 4 },
  label: { color: colors.textDim, fontSize: 14, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 17,
  },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  addInput: { flex: 1, letterSpacing: 2 },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  addText: { color: colors.bg, fontWeight: '700' },
  off: { opacity: 0.5 },
  note: { color: colors.textDim, fontSize: 14, textAlign: 'center' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowBody: { flex: 1 },
  rowName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  run: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  runText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  rowSub: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  went: { color: colors.success, fontWeight: '700' },
  giftButton: { padding: spacing.xs },
  friend: { gap: spacing.xs },
  amounts: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  amount: {
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  amountText: { color: colors.gold, fontWeight: '700' },
});
