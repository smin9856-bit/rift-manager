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
  const extra=[
    'Ambessa Aurora Chogath DrMundo Garen Illaoi Irelia Kayle Kled KSante Mordekaiser Nasus Olaf Pantheon Quinn Riven Singed Skarner TahmKench Teemo Trundle Tryndamere Urgot Udyr Volibear Vladimir Yone Yorick Zaahen',
    'Amumu Belveth Brand Briar Diana Ekko Fiddlesticks Evelynn Ivern Karthus Kayn Khazix MasterYi Naafiri Nunu Olaf Qiyana Rammus Rengar RekSai Shaco Shyvana Skarner Talon Trundle Udyr Warwick Volibear Zac',
    'Annie Akshan Anivia AurelionSol Aurora Brand Diana Ekko Fizz Heimerdinger Hwei Irelia Kassadin Katarina Karthus Lissandra Malzahar Mel Naafiri Neeko Pantheon Qiyana Seraphine Swain Smolder Talon Veigar Vex Velkoz Vladimir Xerath Yone Ziggs',
    'Jhin KogMaw Nilah Samira Senna Smolder Twitch Yunara Ziggs Seraphine',
    'Annie Amumu Brand Heimerdinger Hwei Ivern Milio Neeko Pyke Senna Seraphine Sona Swain Taric TahmKench Velkoz Xerath Yuumi Zilean Zyra'
  ];extra.forEach((list,i)=>pools[i].push(...list.split(' ')));for(const ch of Object.values(C.all))if(!pools.some(p=>p.includes(ch.id)))pools[ch.tags.includes('Marksman')?3:ch.tags.includes('Support')?4:ch.tags.includes('Mage')?2:0].push(ch.id);
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
  const palettes = { Blitzcrank:'#f1cf65', Malphite:'#c9a477', Nautilus:'#72c9b0', Rell:'#d5a5f4', Rakan:'#efb0d3', Renata:'#dc83a3', Seraphine:'#e992d9', Sona:'#7db9fa', Soraka:'#9adf9a', Lulu:'#c397ef', Leona:'#ffdf83', Orianna:'#83c7ed', Syndra:'#b190e5', Azir:'#edcb72', Gnar:'#efa27d', LeeSin:'#ecd49d', Renekton:'#b7cd75', Riven:'#98e3b3', Ekko:'#67e8d2', Mordekaiser:'#51d7ba', Karthus:'#74d3d3', Fiddlesticks:'#d87b76', Zyra:'#ad7dc3', Velkoz:'#d59ae9', Xerath:'#80d6ff', Ziggs:'#efb574', AurelionSol:'#8a9bf5', Diana:'#a7b5ef', Nami:'#78d5ed', Mel:'#f5d68b', Ambessa:'#e6a588', Zaahen:'#d392a7', Yunara:'#8dccee', Locke:'#c08ee1', Ahri:'#64e6fa', Ashe:'#8cddff', Brand:'#ff8b37', Annie:'#ff713e', Jinx:'#f69ae7', Lux:'#ffecb5', Thresh:'#50edb7', Senna:'#5fffc9', Veigar:'#ac83ff', Syndra:'#b99bff', Azir:'#efd088', Leona:'#ffe196', Zed:'#ee6677', Vladimir:'#df4267', Nami:'#74e4dc', Viktor:'#bd8bff', Orianna:'#99cfff', Rumble:'#ff973f', Varus:'#d994ff' };
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
