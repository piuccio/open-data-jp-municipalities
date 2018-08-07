const csv = require('csv-parse');
const { PdfReader } = require('pdfreader');
const fs = require('fs');
const util = require('util');

async function readCsv(filePath, transform = (x) => x) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(csv({ columns: true }, (err, data) => {
      if (err) reject(err);
      else resolve(transform(data));
    }));
  });
}

async function parseFile(filePath, applySchema) {
  let currentPage = 0;
  let currentLinePosition = 0;
  const rows = {};
  const readFile = util.promisify(fs.readFile);
  const reader = new PdfReader();

  return readFile(filePath).then((pdfBuffer) => new Promise((resolve, reject) => {
    reader.parseBuffer(pdfBuffer, (err, item) => {
      if (err) reject(err);
      else if (!item) resolve(rows);
      else if (item.page) {
        currentPage = item.page;
        currentLinePosition = 0;
        currentLetterOffset = 0;
      }
      else if (item.text) {
        if (Math.abs(item.y - currentLinePosition) > 0.5) currentLinePosition = item.y;
        const rowPosition = `${currentPage}_${currentLinePosition}`;
        if (!rows[rowPosition]) rows[rowPosition] = [];
        rows[rowPosition].push(item.text.trim());
      }
    });
  })).then(applySchema);
}

function applyUpdateSchema(rows) {
  const possibleActions = ['Modified', 'Added', 'Deleted'];
  return Object.entries(rows).map(([position, line]) => {
    const [action, grid, kanji, hiragana, romaji, lon1, lonDegree, lon2, lat1, latDegree, lat2, classification] = line;
    if (action === 'Grid' || action.startsWith('Updated list')) return null;

    const lon = parseInt(lon1, 10) + (parseInt(lon2, 10) / 60);
    const lat = parseInt(lat1, 10) + (parseInt(lat2, 10) / 60);
    if (!possibleActions.includes(action)) console.error('Does not match any action', position, line);
    else if (isNaN(lon) || isNaN(lat)) console.error('Incorrect coordinates', position, line);
    else if (lonDegree !== '゜' || latDegree !== '゜') console.error('Missing degree marker', position, line);
    else if (classification.toLowerCase() !== 'municipality') return;
    else return {
      action,
      grid: parseInt(grid, 10),
      kanji,
      hiragana,
      romaji,
      lat,
      lon,
      classification,
    };
  }).filter(Boolean).reduce((byAction, point) => {
    byAction[point.action] = Object.assign(byAction[point.action] || {}, {
      [point.kanji]: point,
    });
    return byAction;
  }, {});
}

async function generate() {
  const listOfCodes = await readCsv('./input/000562730.csv');
  const originalGazetteer = await readCsv('./input/2007.csv');
  const changes = await parseFile('./input/000201879.pdf', applyUpdateSchema);
  const disambiguations = await readCsv('./input/disambiguations.csv');
  const missingRomaji = await readCsv('./input/missingRomaji.csv');
  const prefectures = await readCsv('./input/prefectures.csv');

  const municipalities = listOfCodes.map((item) => {
    if (!item.municipality) return; // A prefecture, not a municipality
    if (changes.Deleted[item.municipality]) return; // This was deleted in the most recent update
    if (changes.Added[item.municipality]) {
      const newItem = changes.Added[item.municipality];
      return mergeMunicipalityWithGazetteer(item, newItem, prefectures);
    }
    const possibilities = originalGazetteer.filter((needle) => needle.JP_Kanji === item.municipality);
    if (possibilities.length === 1) return mergeMunicipalityWithGazetteer(item, possibilities[0], prefectures);
    const moreSpecific = disambiguations.find(
      (alternative) => alternative.municipality === item.municipality && alternative.prefecture === item.prefecture
    );
    if (moreSpecific) return mergeMunicipalityWithGazetteer(item, possibilities.find((point) => point.org_Longitude === moreSpecific.org_Longitude), prefectures);
    const missing = missingRomaji.find((point) => item.code === point.code);
    if (missing) return mergeMunicipalityWithGazetteer(item, missing, prefectures);
    console.log('Could not find', item);
  }).filter(Boolean);
  console.log(`Saving ${municipalities.length} municipalities`);
  return util.promisify(fs.writeFile)('./municipalities.json', JSON.stringify(municipalities, null, '  '));
}

function mergeMunicipalityWithGazetteer(municipality, gazetteer, prefectures) {
  const prefectureNames = prefectures.find((pref) => pref.prefecture_kanji === municipality.prefecture);
  if (!prefectureNames) console.error('Could not find prefecture', municipality);
  return {
    code: municipality.code,
    name_kanji: municipality.municipality,
    name_kana: gazetteer.hiragana || gazetteer.JP_Kana,
    name_romaji: gazetteer.romaji || gazetteer.JP_Roma,
    lat: gazetteer.lat,
    lon: gazetteer.lon,
    prefecture_kanji: municipality.prefecture,
    prefecture_kana: prefectureNames.prefecture_kana,
    prefecture_romaji: prefectureNames.prefecture_romaji,
  };
}

if (require.main === module) {
  generate();
}
