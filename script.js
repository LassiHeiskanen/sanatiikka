// ======== SUPABASE ========
const SUPA_URL = 'https://avtlhmgppxuwahkxjxbb.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGxobWdwcHh1d2Foa3hqeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3OTk3NzcsImV4cCI6MjA2MzM3NTc3N30.7V2xSt0pBhIJhj4Z2_CQESJkesaIkr-zrkZmY9CzVXw';
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// ======== PELILOGIIKKA ========
let wordList = ['omena','kissa','koira', /*… täydennä sanalistasi…*/];
let target, count, closestScore;
let history = [];

const el = id => document.getElementById(id);
const denorm = s => s.replace(/{/g,'å').replace(/\|/g,'ä').replace(/}/g,'ö');

// resettaa pelin tilan
function startGame() {
  const len = +el('length').value;
  target = denorm(wordList.filter(w=>w.length===len)[Math.floor(Math.random()*len)].toUpperCase());
  count = 0; closestScore = Infinity; history = [];
  el('game').style.display = '';
  el('letters').textContent = '_'.repeat(target.length);
  el('history').textContent = '';
  el('result').textContent = '';
  el('closest').textContent = '';
  el('count').textContent = '';
  el('report').style.display = 'none';
  el('top5').textContent = '';
}

// arvaa
async function submitGuess() {
  const g = el('guess').value.trim().toUpperCase();
  if (!wordList.includes(g.toLowerCase())) { el('result').textContent = 'Tuntematon sana!'; return; }
  if (g.length!==target.length)  { el('result').textContent = 'Väärä pituus!'; return; }

  count++;
  let score = [...g].reduce((s,c,i)=> s + Math.abs(c.charCodeAt(0)-target[i].charCodeAt(0)), 0);
  el('result').textContent = `Etäisyys: ${score}`;
  history.push(`${g} (${score})`);
  el('history').textContent = history.join('\n');
  el('count').textContent   = `Arvauksia: ${count}`;

  if (score<closestScore) {
    closestScore = score;
    el('closest').textContent = `Lähin sana: ${g} (${score})`;
  }
  if (score===0) {
    el('reveal').disabled = true;
    el('report').style.display = '';
    await saveScore(count);
    await fetchTop5();
  }
}

// vihje
function giveHint(){
  const i = history.length; 
  if (i<target.length) {
    let arr = el('letters').textContent.split('');
    arr[i] = target[i];
    el('letters').textContent = arr.join('');
  }
}

// paljasta sana
function reveal(){
  el('result').textContent = `Oikea sana: ${target}`;
  el('report').style.display = '';
}

// supabaseen tallennus
async function saveScore(score){
  await supa
    .from('leaderboard')
    .insert([{ date: new Date().toISOString().slice(0,10),
               length: target.length,
               name: 'XXX',   // voit kysyä nimimerkin erikseen
               score }]);
}

// hae TOP5 viikolta
async function fetchTop5(){
  // laske viikon alku
  const now = new Date(), d = now.getDay(), diff = (d+6)%7;
  const mon = new Date(now - diff*864e5).toISOString().slice(0,10);
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

// raportoi sana
function reportWord(){
  el('reportMsg').textContent =
    'Kiitos, asia käsitellään sanojen arviointilautakunnassa kuukausikokouksen yhteydessä.';
  supa.from('reports').insert([{ word: target, date: new Date().toISOString() }]);
}

// ======== SITOMINEN ========
el('start').onclick   = startGame;
el('submit').onclick  = submitGuess;
el('hint').onclick    = giveHint;
el('reveal').onclick  = reveal;
el('report').onclick  = reportWord;
el('showTop5').onclick= fetchTop5;  // jos haluat erillisen napin

