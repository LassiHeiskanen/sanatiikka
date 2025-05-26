// ======== SUPABASE ========
const SUPA_URL = 'https://avtlhmgppxuwahkxjxbb.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGxobWdwcHh1d2Foa3hqeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3OTk3NzcsImV4cCI6MjA2MzM3NTc3N30.7V2xSt0pBhIJhj4Z2_CQESJkesaIkr-zrkZmY9CzVXw';
const supa     = supabase.createClient(SUPA_URL, SUPA_KEY);

// ======== PELILOGIIKKA ========
let wordList = [], target, count, closestScore, history = [];

// apufunktiot
const el        = id => document.getElementById(id);
const denorm    = s  => s.replace(/{/g,'å').replace(/\|/g,'ä').replace(/}/g,'ö');
const Normalize = w  => w.replace(/å/g,'{').replace(/ä/g,'|').replace(/ö/g,'}');

// 1) Lataa sanalista ennen UI:n kytkentöjä
async function startGame() {
  try {
    const res = await fetch('sanat_uusi.txt');
    if (!res.ok) throw new Error(`Sanalistan haku epäonnistui: ${res.status}`);
    const txt = await res.text();
    wordList = txt
      .split(/\r?\n/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w);
  } catch (e) {
    console.error(e);
    alert('Sanalistaa ei voitu ladata!');
    return;
  }

  // Kun sanalista on ladattu, sidotaan UI-tapahtumat ja käynnistetään peli
  initUIBindings();
  beginGame();
}



// 2) UI-sidonnat ja pelin alustus
function initUIBindings() {
  el('start').onclick     = beginGame;
  el('submit').onclick    = submitGuess;
  el('hint').onclick      = giveHint;
  el('reveal').onclick    = reveal;
  el('report').onclick    = reportWord;
  el('showTop5').onclick  = fetchTop5;
}

// 3) Käynnistä sanalistan haku heti, kun DOM on valmis
window.addEventListener('DOMContentLoaded', startGame);

// 4) Aloita peli ja piirrä viivat
function beginGame() {
  const len = +el('length').value;
  const candidates = wordList.filter(w => w.length === len);
  if (candidates.length === 0) {
    alert('Valitun pituisia sanoja ei löytynyt.');
    return;
  }

  target        = denorm(candidates[Math.floor(Math.random() * candidates.length)]).toUpperCase();
  count         = 0;
  closestScore  = Infinity;
  history       = [];

  el('game').style.display   = '';
  // Esimerkiksi: "_ _ _ _ _ "
  el('letters').textContent  = Array(target.length).fill('_').join(' ');
  el('history').textContent  = '';
  el('result').textContent   = '';
  el('closest').textContent  = '';
  el('count').textContent    = '';
  el('report').style.display = 'none';
  el('top5').textContent     = '';
}

// 5) Kun käyttäjä arvaa
async function submitGuess() {
  const raw = el('guess').value.trim().toUpperCase();
  if (!wordList.includes(raw.toLowerCase())) {
    el('result').textContent = 'Tuntematon sana!';
    return;
  }
  if (raw.length !== target.length) {
    el('result').textContent = 'Väärä pituus!';
    return;
  }

  count++;
  const score = [...raw]
    .reduce((sum, ch, i) => sum + Math.abs(ch.charCodeAt(0) - target[i].charCodeAt(0)), 0);

  el('result').textContent  = `Etäisyys: ${score}`;
  history.push(`${raw} (${score})`);
  el('history').textContent = history.join('\n');
  el('count').textContent   = `Arvauksia: ${count}`;

  if (score < closestScore) {
    closestScore = score;
    el('closest').textContent = `Lähin sana: ${raw} (${score})`;
  }

  if (score === 0) {
    el('reveal').disabled      = true;
    el('report').style.display = '';
    await saveScore(count);
    await fetchTop5();
  }
}

// 6) Paljasta yksi kirjain vihjeeksi
function giveHint() {
  const i = history.length;
  if (i < target.length) {
    const arr = el('letters').textContent.split(' ');
    arr[i] = target[i];
    el('letters').textContent = arr.join(' ');
  }
}

// 7) Paljasta koko sana
function reveal() {
  el('result').textContent   = `Oikea sana: ${target}`;
  el('report').style.display = '';
}

// 8) Tallenna tulos
async function saveScore(score) {
  await supa
    .from('leaderboard')
    .insert([{ 
      date:   new Date().toISOString().slice(0,10),
      length: target.length,
      name:   'XXX', 
      score 
    }]);
}

// 9) Hae tämän viikon TOP5
async function fetchTop5() {
  const now  = new Date();
  const d    = now.getDay(), diff = (d + 6) % 7;
  const mon  = new Date(now - diff * 864e5).toISOString().slice(0,10);

  let { data, error } = await supa
    .from('leaderboard')
    .select('*')
    .gte('date', mon)
    .eq('length', target.length)
    .order('score', { ascending:true })
    .limit(5);

  if (data) {
    el('top5').textContent =
      `Viikon TOP5\n${target.length}-kirjainta\nalk. ${mon}\n\n` +
      data.map((e,i)=>`${i+1}. ${e.name} - ${e.score}`).join('\n');
  }
}

// 10) Raportoi sana
function reportWord() {
  el('reportMsg').textContent =
    'Kiitos, asia käsitellään sanojen arviointilautakunnassa kuukausikokouksen yhteydessä.';
  supa.from('reports').insert([{ word: target, date: new Date().toISOString() }]);
}
