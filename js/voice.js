// 방 음성 채팅: 브라우저 WebRTC로 참가자끼리 직접 연결해요 (최대 8명, 음성만).
// 연결 정보(offer/answer/ICE)는 backend.voice(방코드, uid) 채널로 주고받아요.
// 녹음·저장은 하지 않아요. 방을 나가면 바로 끊겨요.
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export function createVoice({ backend, code, uid, members, onChange }) {
  const peers = new Map(); // uid → { pc, audio, pending: [], analyser }
  let ch = null, stream = null, on = false, userMuted = false, forced = '', listenOnly = false;
  let peerInfo = {}; // 채널에 들어온 사람들 { uid: { m: 음소거 } }
  let actx = null, meter = 0;
  const speaking = new Set();
  const emit = () => onChange?.(state());
  const state = () => ({ on, muted: userMuted || !!forced || listenOnly, userMuted, forced, listenOnly, members: Object.keys(peerInfo), info: peerInfo, speaking: new Set(speaking), connected: [...peers.keys()].filter((u) => ['connected', 'completed'].includes(peers.get(u).pc.iceConnectionState)) });

  function applyMute() {
    const live = !(userMuted || forced);
    stream?.getAudioTracks().forEach((t) => (t.enabled = live));
    ch?.publish({ m: !live || listenOnly });
    emit();
  }
  function analyse(id, ms) {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaStreamSource(ms), an = actx.createAnalyser();
      an.fftSize = 512; src.connect(an);
      return an;
    } catch { return null; }
  }
  const buf = new Uint8Array(512);
  function tick() {
    let changed = false;
    const test = (id, an) => {
      if (!an) return;
      an.getByteTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const loud = Math.sqrt(sum / buf.length) > 0.045;
      if (loud !== speaking.has(id)) { loud ? speaking.add(id) : speaking.delete(id); changed = true; }
    };
    peers.forEach((p, id) => test(id, p.analyser));
    if (stream && !(userMuted || forced)) test(uid, peers.self); else if (speaking.delete(uid)) changed = true;
    if (changed) emit();
  }

  function makePc(other) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const p = { pc, audio: null, pending: [], analyser: null };
    peers.set(other, p);
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = (e) => { if (e.candidate) ch?.send(other, { k: 'ice', c: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      const ms = e.streams[0] || new MediaStream([e.track]);
      if (!p.audio) { p.audio = document.createElement('audio'); p.audio.autoplay = true; p.audio.playsInline = true; p.audio.className = 'voice-audio'; document.body.appendChild(p.audio); }
      p.audio.srcObject = ms; p.audio.play?.().catch(() => {});
      p.analyser = analyse(other, ms);
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') { drop(other); setTimeout(() => sync(), 1500); }
      emit();
    };
    return p;
  }
  function drop(other) {
    const p = peers.get(other); if (!p) return;
    try { p.pc.close(); } catch {}
    p.audio?.remove();
    peers.delete(other); speaking.delete(other);
  }
  async function call(other) {
    const p = makePc(other);
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    ch?.send(other, { k: 'offer', sdp: offer.sdp });
  }
  async function onSignal(from, msg) {
    if (!on || !members().includes(from)) return; // 방 참가자가 아니면 무시
    try {
      if (msg.k === 'offer') {
        drop(from);
        const p = makePc(from);
        await p.pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
        const ans = await p.pc.createAnswer();
        await p.pc.setLocalDescription(ans);
        ch?.send(from, { k: 'answer', sdp: ans.sdp });
        p.pending.splice(0).forEach((c) => p.pc.addIceCandidate(c).catch(() => {}));
      } else if (msg.k === 'answer') {
        const p = peers.get(from); if (!p) return;
        await p.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
        p.pending.splice(0).forEach((c) => p.pc.addIceCandidate(c).catch(() => {}));
      } else if (msg.k === 'ice') {
        const p = peers.get(from); if (!p) return;
        if (p.pc.remoteDescription) p.pc.addIceCandidate(msg.c).catch(() => {}); else p.pending.push(msg.c);
      }
    } catch {}
  }
  // 채널에 들어온 사람과 연결: uid가 작은 쪽이 먼저 전화를 걸어요(동시에 거는 충돌 방지)
  function sync() {
    if (!on) return;
    const allow = new Set(members());
    const want = Object.keys(peerInfo).filter((u) => u !== uid && allow.has(u));
    [...peers.keys()].forEach((u) => { if (!want.includes(u)) drop(u); });
    want.forEach((u) => { if (!peers.has(u) && uid < u) call(u).catch(() => drop(u)); });
    emit();
  }

  return {
    get on() { return on; },
    state,
    async start() {
      if (on) return state();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        listenOnly = false;
        peers.self = analyse(uid, stream);
      } catch { stream = null; listenOnly = true; }
      ch = await backend.voice(code, uid);
      if (!ch) { stream?.getTracks().forEach((t) => t.stop()); stream = null; throw new Error('지금은 음성 채팅을 쓸 수 없어요'); }
      on = true;
      ch.onSignal(onSignal);
      ch.watchPeers((info) => { peerInfo = info || {}; sync(); });
      applyMute();
      meter = setInterval(tick, 160);
      return state();
    },
    stop() {
      if (!on) return;
      on = false;
      clearInterval(meter);
      [...peers.keys()].forEach(drop);
      delete peers.self;
      stream?.getTracks().forEach((t) => t.stop()); stream = null;
      ch?.close(); ch = null; peerInfo = {}; speaking.clear();
      try { actx?.close(); } catch {} actx = null;
      emit();
    },
    toggleMute() { if (listenOnly) return; userMuted = !userMuted; applyMute(); },
    setForced(reason) { reason = reason || ''; if (reason === forced) return; forced = reason; applyMute(); },
    refresh: () => sync(),
  };
}
