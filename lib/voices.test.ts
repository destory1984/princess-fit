import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVISORS } from './advisors.ts';
import { VOICES, voiceOf, type VoiceId } from './voices.ts';
import { messageFor, thanksFor } from './economy.ts';
import { eventMemory, memoryLine } from './companion.ts';

const ids = Object.keys(VOICES) as VoiceId[];

test('every girl you can pick has a voice of her own', () => {
  for (const a of ADVISORS.filter((x) => x.playable)) {
    assert.ok(a.id in VOICES, `${a.name} (${a.id}) has no voice`);
  }
});

test('no line is empty, in any voice', () => {
  for (const id of ids) {
    const v = VOICES[id];
    const lists = [
      v.mood.hungry,
      v.mood.shabby,
      ...Object.values(v.mood.byStage).flatMap((s) => Object.values(s)),
      ...Object.values(v.thanks),
    ];
    for (const l of lists) {
      assert.ok(l.length > 0, id);
      for (const line of l) assert.ok(line.trim().length > 0, id);
    }
    for (const f of Object.values(v.fresh)) assert.ok(f('벤치프레스 100kg').length > 0, id);
  }
});

test('the three do not say the same thing', () => {
  const day = new Date(2026, 8, 20);
  const said = ids.map((id) => messageFor('fine', day, 'new', id));
  assert.equal(new Set(said).size, ids.length, said.join(' / '));
  const thanks = ids.map((id) => thanksFor('clothes', 'gown', id));
  assert.equal(new Set(thanks).size, ids.length, thanks.join(' / '));
});

test('유키 is formal until you are comfortable with each other', () => {
  const yuki = VOICES.seora.mood.byStage;
  for (const stage of ['new', 'familiar'] as const) {
    for (const line of Object.values(yuki[stage]).flat()) {
      assert.doesNotMatch(line, /[^니]요[.?!]?$/, line);
    }
  }
});

test('a memory made today is said in her own voice', () => {
  const today = new Date(2026, 0, 1);
  const memories = [eventMemory('first_garment', '리본 블라우스', today)];
  const said = ids.map((id) => memoryLine(memories, today, id));
  assert.equal(new Set(said).size, ids.length);
  for (const l of said) assert.match(l!, /리본 블라우스/);
});

test('an unknown girl speaks as 리나 rather than falling silent', () => {
  assert.equal(voiceOf('nobody'), VOICES.geumhwa);
  assert.equal(voiceOf(undefined), VOICES.geumhwa);
});
