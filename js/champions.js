// Champion identity and presentation. Does not consume the match RNG.
(function (G) {
  const L = G.LFM, data = G.LFM_CHAMPIONS || {champions:{}, version:''};
  const C = L.champions = { all:data.champions, version:data.version };
  const pools = [
    'Aatrox Gnar Jayce Renekton Ornn Ksante Camille Fiora Jax Kennen Rumble Gwen Malphite Gangplank Gragas Darius Sett Sion Shen',
    'LeeSin Viego Vi Sejuani MonkeyKing JarvanIV XinZhao Nidalee Graves Elise Kindred Nocturne Maokai Poppy Lillia Hecarim',
    'Ahri Azir Orianna Syndra Viktor Leblanc Akali Sylas Taliyah Ryze TwistedFate Corki Galio Zoe Zed Yasuo Cassiopeia',
    'Jinx Caitlyn Ezreal Ashe Varus Xayah Kaisa Aphelios Lucian Kalista Sivir Tristana Draven MissFortune Vayne Zeri',
    'Thresh Leona Nautilus Rakan Alistar Braum Nami Lulu Karma Renata Bard Rell Blitzcrank Janna Soraka Morgana Lux'
  ].map(s => s.split(' '));
  C.get = id => C.all[id];
  C.icon = id => `assets/champions/${id}.png`;
  C.available = year => Object.values(C.all).filter(c => c.year <= year);
  C.pool = (role, year) => pools[role].filter(id => C.all[id] && C.all[id].year <= year);
  C.draft = (players, year, seed) => {
    const used = new Set();
    return players.map((p, i) => {
      const options = C.pool(i % 5, year).filter(id => !used.has(id));
      const id = options[L.hash(`${seed}:${p.id}:${i}`) % options.length]; used.add(id); return id;
    });
  };
  const palettes = { Ahri:'#64e6fa', Ashe:'#8cddff', Brand:'#ff8b37', Annie:'#ff713e', Jinx:'#f69ae7', Lux:'#ffecb5', Thresh:'#50edb7', Senna:'#5fffc9', Veigar:'#ac83ff', Syndra:'#b99bff', Azir:'#efd088', Leona:'#ffe196', Zed:'#ee6677', Vladimir:'#df4267', Nami:'#74e4dc', Viktor:'#bd8bff', Orianna:'#99cfff', Rumble:'#ff973f', Varus:'#d994ff' };
  C.profile = id => {
    const c = C.get(id), tags = c?.tags || [];
    const signature=({Ahri:'orb',Ashe:'volley',Lux:'beam',Velkoz:'beam',Senna:'beam',Thresh:'hook',Blitzcrank:'hook',Nautilus:'hook',Jinx:'rocket',Corki:'rocket',Orianna:'shockwave',Kennen:'storm',Viktor:'beam',Yasuo:'wind',Janna:'wind',Rumble:'fire',Brand:'fire',Annie:'fire',Nami:'wave',Taliyah:'wave'})[id] || (tags.includes('Mage')?'orb':tags.includes('Marksman')?'bolt':'slash');
    return { signature, color:palettes[id] || (tags.includes('Mage') ? '#b99bff' : tags.includes('Support') ? '#6ee5c2' : tags.includes('Marksman') ? '#ffd58a' : '#e9bb82'), ranged:(c?.range || 125) > 300, mage:tags.includes('Mage') };
  };
  const images = new Map();
  C.image = path => {
    if (!images.has(path)) { const img = new Image(); img.src = path; images.set(path, img); }
    const img = images.get(path); return img.complete && img.naturalWidth ? img : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
