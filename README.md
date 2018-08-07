## List of Japanese Municipalities

The list is extracted from the Gazetteer of Japan 2007 and subsequent update in March 2018 as avaialable at http://www.gsi.go.jp/ENGLISH/pape_e300284.html

The original 2007 list is taken from https://github.com/nyampire/Gazetteer_JP_2007

Prefecture information comes from http://www.soumu.go.jp/denshijiti/code.html

### Usage

Just grab the file `municipalities.json` it has a list of objects with the structure

```json
{
  "code": "011002",
  "name_kanji": "札幌市",
  "name_kana": "さっぽろし",
  "name_romaji": "Sapporo Shi",
  "lat": "43.05",
  "lon": "141.35",
  "prefecture_kanji": "北海道",
  "prefecture_kana": "ほっかいどう",
  "prefecture_romaji": "Hokkaido"
}
```

The `name` in romaji will include one of the possible denomination `Machi`, `Cho`, `Shi`, `Mura`, `Ku`. Note that `Ku` is only used for the 23 special wards of `Tokyo To` that are included even if they're not technically a municipality.

## Related links

More [open data repositories](https://github.com/piuccio?utf8=%E2%9C%93&tab=repositories&q=open-data-jp&type=&language=).
