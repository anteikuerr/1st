/* 英語カードデータの日本語化 (雑訳モジュール)
 * TCGdexの日本語データが取得できず英語にフォールバックした場合に、
 * 表示をできる範囲で日本語化する。訳せないものは英語のまま表示する。
 * ポケモン名の対訳は npm の "pokemon" パッケージ (公式名データ) から生成。
 */

const POKEMON_JA = {"Bulbasaur":"フシギダネ","Ivysaur":"フシギソウ","Venusaur":"フシギバナ","Charmander":"ヒトカゲ","Charmeleon":"リザード","Charizard":"リザードン","Squirtle":"ゼニガメ","Wartortle":"カメール","Blastoise":"カメックス","Caterpie":"キャタピー","Metapod":"トランセル","Butterfree":"バタフリー","Weedle":"ビードル","Kakuna":"コクーン","Beedrill":"スピアー","Pidgey":"ポッポ","Pidgeotto":"ピジョン","Pidgeot":"ピジョット","Rattata":"コラッタ","Raticate":"ラッタ","Spearow":"オニスズメ","Fearow":"オニドリル","Ekans":"アーボ","Arbok":"アーボック","Pikachu":"ピカチュウ","Raichu":"ライチュウ","Sandshrew":"サンド","Sandslash":"サンドパン","Nidoran♀":"ニドラン♀","Nidorina":"ニドリーナ","Nidoqueen":"ニドクイン","Nidoran♂":"ニドラン♂","Nidorino":"ニドリーノ","Nidoking":"ニドキング","Clefairy":"ピッピ","Clefable":"ピクシー","Vulpix":"ロコン","Ninetales":"キュウコン","Jigglypuff":"プリン","Wigglytuff":"プクリン","Zubat":"ズバット","Golbat":"ゴルバット","Oddish":"ナゾノクサ","Gloom":"クサイハナ","Vileplume":"ラフレシア","Paras":"パラス","Parasect":"パラセクト","Venonat":"コンパン","Venomoth":"モルフォン","Diglett":"ディグダ","Dugtrio":"ダグトリオ","Meowth":"ニャース","Persian":"ペルシアン","Psyduck":"コダック","Golduck":"ゴルダック","Mankey":"マンキー","Primeape":"オコリザル","Growlithe":"ガーディ","Arcanine":"ウインディ","Poliwag":"ニョロモ","Poliwhirl":"ニョロゾ","Poliwrath":"ニョロボン","Abra":"ケーシィ","Kadabra":"ユンゲラー","Alakazam":"フーディン","Machop":"ワンリキー","Machoke":"ゴーリキー","Machamp":"カイリキー","Bellsprout":"マダツボミ","Weepinbell":"ウツドン","Victreebel":"ウツボット","Tentacool":"メノクラゲ","Tentacruel":"ドククラゲ","Geodude":"イシツブテ","Graveler":"ゴローン","Golem":"ゴローニャ","Ponyta":"ポニータ","Rapidash":"ギャロップ","Slowpoke":"ヤドン","Slowbro":"ヤドラン","Magnemite":"コイル","Magneton":"レアコイル","Farfetch'd":"カモネギ","Doduo":"ドードー","Dodrio":"ドードリオ","Seel":"パウワウ","Dewgong":"ジュゴン","Grimer":"ベトベター","Muk":"ベトベトン","Shellder":"シェルダー","Cloyster":"パルシェン","Gastly":"ゴース","Haunter":"ゴースト","Gengar":"ゲンガー","Onix":"イワーク","Drowzee":"スリープ","Hypno":"スリーパー","Krabby":"クラブ","Kingler":"キングラー","Voltorb":"ビリリダマ","Electrode":"マルマイン","Exeggcute":"タマタマ","Exeggutor":"ナッシー","Cubone":"カラカラ","Marowak":"ガラガラ","Hitmonlee":"サワムラー","Hitmonchan":"エビワラー","Lickitung":"ベロリンガ","Koffing":"ドガース","Weezing":"マタドガス","Rhyhorn":"サイホーン","Rhydon":"サイドン","Chansey":"ラッキー","Tangela":"モンジャラ","Kangaskhan":"ガルーラ","Horsea":"タッツー","Seadra":"シードラ","Goldeen":"トサキント","Seaking":"アズマオウ","Staryu":"ヒトデマン","Starmie":"スターミー","Mr. Mime":"バリヤード","Scyther":"ストライク","Jynx":"ルージュラ","Electabuzz":"エレブー","Magmar":"ブーバー","Pinsir":"カイロス","Tauros":"ケンタロス","Magikarp":"コイキング","Gyarados":"ギャラドス","Lapras":"ラプラス","Ditto":"メタモン","Eevee":"イーブイ","Vaporeon":"シャワーズ","Jolteon":"サンダース","Flareon":"ブースター","Porygon":"ポリゴン","Omanyte":"オムナイト","Omastar":"オムスター","Kabuto":"カブト","Kabutops":"カブトプス","Aerodactyl":"プテラ","Snorlax":"カビゴン","Articuno":"フリーザー","Zapdos":"サンダー","Moltres":"ファイヤー","Dratini":"ミニリュウ","Dragonair":"ハクリュー","Dragonite":"カイリュー","Mewtwo":"ミュウツー","Mew":"ミュウ","Chikorita":"チコリータ","Bayleef":"ベイリーフ","Meganium":"メガニウム","Cyndaquil":"ヒノアラシ","Quilava":"マグマラシ","Typhlosion":"バクフーン","Totodile":"ワニノコ","Croconaw":"アリゲイツ","Feraligatr":"オーダイル","Sentret":"オタチ","Furret":"オオタチ","Hoothoot":"ホーホー","Noctowl":"ヨルノズク","Ledyba":"レディバ","Ledian":"レディアン","Spinarak":"イトマル","Ariados":"アリアドス","Crobat":"クロバット","Chinchou":"チョンチー","Lanturn":"ランターン","Pichu":"ピチュー","Cleffa":"ピィ","Igglybuff":"ププリン","Togepi":"トゲピー","Togetic":"トゲチック","Natu":"ネイティ","Xatu":"ネイティオ","Mareep":"メリープ","Flaaffy":"モココ","Ampharos":"デンリュウ","Bellossom":"キレイハナ","Marill":"マリル","Azumarill":"マリルリ","Sudowoodo":"ウソッキー","Politoed":"ニョロトノ","Hoppip":"ハネッコ","Skiploom":"ポポッコ","Jumpluff":"ワタッコ","Aipom":"エイパム","Sunkern":"ヒマナッツ","Sunflora":"キマワリ","Yanma":"ヤンヤンマ","Wooper":"ウパー","Quagsire":"ヌオー","Espeon":"エーフィ","Umbreon":"ブラッキー","Murkrow":"ヤミカラス","Slowking":"ヤドキング","Misdreavus":"ムウマ","Unown":"アンノーン","Wobbuffet":"ソーナンス","Girafarig":"キリンリキ","Pineco":"クヌギダマ","Forretress":"フォレトス","Dunsparce":"ノコッチ","Gligar":"グライガー","Steelix":"ハガネール","Snubbull":"ブルー","Granbull":"グランブル","Qwilfish":"ハリーセン","Scizor":"ハッサム","Shuckle":"ツボツボ","Heracross":"ヘラクロス","Sneasel":"ニューラ","Teddiursa":"ヒメグマ","Ursaring":"リングマ","Slugma":"マグマッグ","Magcargo":"マグカルゴ","Swinub":"ウリムー","Piloswine":"イノムー","Corsola":"サニーゴ","Remoraid":"テッポウオ","Octillery":"オクタン","Delibird":"デリバード","Mantine":"マンタイン","Skarmory":"エアームド","Houndour":"デルビル","Houndoom":"ヘルガー","Kingdra":"キングドラ","Phanpy":"ゴマゾウ","Donphan":"ドンファン","Porygon2":"ポリゴン２","Stantler":"オドシシ","Smeargle":"ドーブル","Tyrogue":"バルキー","Hitmontop":"カポエラー","Smoochum":"ムチュール","Elekid":"エレキッド","Magby":"ブビィ","Miltank":"ミルタンク","Blissey":"ハピナス","Raikou":"ライコウ","Entei":"エンテイ","Suicune":"スイクン","Larvitar":"ヨーギラス","Pupitar":"サナギラス","Tyranitar":"バンギラス","Lugia":"ルギア","Ho-Oh":"ホウオウ","Celebi":"セレビィ","Treecko":"キモリ","Grovyle":"ジュプトル","Sceptile":"ジュカイン","Torchic":"アチャモ","Combusken":"ワカシャモ","Blaziken":"バシャーモ","Mudkip":"ミズゴロウ","Marshtomp":"ヌマクロー","Swampert":"ラグラージ","Poochyena":"ポチエナ","Mightyena":"グラエナ","Zigzagoon":"ジグザグマ","Linoone":"マッスグマ","Wurmple":"ケムッソ","Silcoon":"カラサリス","Beautifly":"アゲハント","Cascoon":"マユルド","Dustox":"ドクケイル","Lotad":"ハスボー","Lombre":"ハスブレロ","Ludicolo":"ルンパッパ","Seedot":"タネボー","Nuzleaf":"コノハナ","Shiftry":"ダーテング","Taillow":"スバメ","Swellow":"オオスバメ","Wingull":"キャモメ","Pelipper":"ペリッパー","Ralts":"ラルトス","Kirlia":"キルリア","Gardevoir":"サーナイト","Surskit":"アメタマ","Masquerain":"アメモース","Shroomish":"キノココ","Breloom":"キノガッサ","Slakoth":"ナマケロ","Vigoroth":"ヤルキモノ","Slaking":"ケッキング","Nincada":"ツチニン","Ninjask":"テッカニン","Shedinja":"ヌケニン","Whismur":"ゴニョニョ","Loudred":"ドゴーム","Exploud":"バクオング","Makuhita":"マクノシタ","Hariyama":"ハリテヤマ","Azurill":"ルリリ","Nosepass":"ノズパス","Skitty":"エネコ","Delcatty":"エネコロロ","Sableye":"ヤミラミ","Mawile":"クチート","Aron":"ココドラ","Lairon":"コドラ","Aggron":"ボスゴドラ","Meditite":"アサナン","Medicham":"チャーレム","Electrike":"ラクライ","Manectric":"ライボルト","Plusle":"プラスル","Minun":"マイナン","Volbeat":"バルビート","Illumise":"イルミーゼ","Roselia":"ロゼリア","Gulpin":"ゴクリン","Swalot":"マルノーム","Carvanha":"キバニア","Sharpedo":"サメハダー","Wailmer":"ホエルコ","Wailord":"ホエルオー","Numel":"ドンメル","Camerupt":"バクーダ","Torkoal":"コータス","Spoink":"バネブー","Grumpig":"ブーピッグ","Spinda":"パッチール","Trapinch":"ナックラー","Vibrava":"ビブラーバ","Flygon":"フライゴン","Cacnea":"サボネア","Cacturne":"ノクタス","Swablu":"チルット","Altaria":"チルタリス","Zangoose":"ザングース","Seviper":"ハブネーク","Lunatone":"ルナトーン","Solrock":"ソルロック","Barboach":"ドジョッチ","Whiscash":"ナマズン","Corphish":"ヘイガニ","Crawdaunt":"シザリガー","Baltoy":"ヤジロン","Claydol":"ネンドール","Lileep":"リリーラ","Cradily":"ユレイドル","Anorith":"アノプス","Armaldo":"アーマルド","Feebas":"ヒンバス","Milotic":"ミロカロス","Castform":"ポワルン","Kecleon":"カクレオン","Shuppet":"カゲボウズ","Banette":"ジュペッタ","Duskull":"ヨマワル","Dusclops":"サマヨール","Tropius":"トロピウス","Chimecho":"チリーン","Absol":"アブソル","Wynaut":"ソーナノ","Snorunt":"ユキワラシ","Glalie":"オニゴーリ","Spheal":"タマザラシ","Sealeo":"トドグラー","Walrein":"トドゼルガ","Clamperl":"パールル","Huntail":"ハンテール","Gorebyss":"サクラビス","Relicanth":"ジーランス","Luvdisc":"ラブカス","Bagon":"タツベイ","Shelgon":"コモルー","Salamence":"ボーマンダ","Beldum":"ダンバル","Metang":"メタング","Metagross":"メタグロス","Regirock":"レジロック","Regice":"レジアイス","Registeel":"レジスチル","Latias":"ラティアス","Latios":"ラティオス","Kyogre":"カイオーガ","Groudon":"グラードン","Rayquaza":"レックウザ","Jirachi":"ジラーチ","Deoxys":"デオキシス","Turtwig":"ナエトル","Grotle":"ハヤシガメ","Torterra":"ドダイトス","Chimchar":"ヒコザル","Monferno":"モウカザル","Infernape":"ゴウカザル","Piplup":"ポッチャマ","Prinplup":"ポッタイシ","Empoleon":"エンペルト","Starly":"ムックル","Staravia":"ムクバード","Staraptor":"ムクホーク","Bidoof":"ビッパ","Bibarel":"ビーダル","Kricketot":"コロボーシ","Kricketune":"コロトック","Shinx":"コリンク","Luxio":"ルクシオ","Luxray":"レントラー","Budew":"スボミー","Roserade":"ロズレイド","Cranidos":"ズガイドス","Rampardos":"ラムパルド","Shieldon":"タテトプス","Bastiodon":"トリデプス","Burmy":"ミノムッチ","Wormadam":"ミノマダム","Mothim":"ガーメイル","Combee":"ミツハニー","Vespiquen":"ビークイン","Pachirisu":"パチリス","Buizel":"ブイゼル","Floatzel":"フローゼル","Cherubi":"チェリンボ","Cherrim":"チェリム","Shellos":"カラナクシ","Gastrodon":"トリトドン","Ambipom":"エテボース","Drifloon":"フワンテ","Drifblim":"フワライド","Buneary":"ミミロル","Lopunny":"ミミロップ","Mismagius":"ムウマージ","Honchkrow":"ドンカラス","Glameow":"ニャルマー","Purugly":"ブニャット","Chingling":"リーシャン","Stunky":"スカンプー","Skuntank":"スカタンク","Bronzor":"ドーミラー","Bronzong":"ドータクン","Bonsly":"ウソハチ","Mime Jr.":"マネネ","Happiny":"ピンプク","Chatot":"ペラップ","Spiritomb":"ミカルゲ","Gible":"フカマル","Gabite":"ガバイト","Garchomp":"ガブリアス","Munchlax":"ゴンベ","Riolu":"リオル","Lucario":"ルカリオ","Hippopotas":"ヒポポタス","Hippowdon":"カバルドン","Skorupi":"スコルピ","Drapion":"ドラピオン","Croagunk":"グレッグル","Toxicroak":"ドクロッグ","Carnivine":"マスキッパ","Finneon":"ケイコウオ","Lumineon":"ネオラント","Mantyke":"タマンタ","Snover":"ユキカブリ","Abomasnow":"ユキノオー","Weavile":"マニューラ","Magnezone":"ジバコイル","Lickilicky":"ベロベルト","Rhyperior":"ドサイドン","Tangrowth":"モジャンボ","Electivire":"エレキブル","Magmortar":"ブーバーン","Togekiss":"トゲキッス","Yanmega":"メガヤンマ","Leafeon":"リーフィア","Glaceon":"グレイシア","Gliscor":"グライオン","Mamoswine":"マンムー","Porygon-Z":"ポリゴンＺ","Gallade":"エルレイド","Probopass":"ダイノーズ","Dusknoir":"ヨノワール","Froslass":"ユキメノコ","Rotom":"ロトム","Uxie":"ユクシー","Mesprit":"エムリット","Azelf":"アグノム","Dialga":"ディアルガ","Palkia":"パルキア","Heatran":"ヒードラン","Regigigas":"レジギガス","Giratina":"ギラティナ","Cresselia":"クレセリア","Phione":"フィオネ","Manaphy":"マナフィ","Darkrai":"ダークライ","Shaymin":"シェイミ","Arceus":"アルセウス","Victini":"ビクティニ","Snivy":"ツタージャ","Servine":"ジャノビー","Serperior":"ジャローダ","Tepig":"ポカブ","Pignite":"チャオブー","Emboar":"エンブオー","Oshawott":"ミジュマル","Dewott":"フタチマル","Samurott":"ダイケンキ","Patrat":"ミネズミ","Watchog":"ミルホッグ","Lillipup":"ヨーテリー","Herdier":"ハーデリア","Stoutland":"ムーランド","Purrloin":"チョロネコ","Liepard":"レパルダス","Pansage":"ヤナップ","Simisage":"ヤナッキー","Pansear":"バオップ","Simisear":"バオッキー","Panpour":"ヒヤップ","Simipour":"ヒヤッキー","Munna":"ムンナ","Musharna":"ムシャーナ","Pidove":"マメパト","Tranquill":"ハトーボー","Unfezant":"ケンホロウ","Blitzle":"シママ","Zebstrika":"ゼブライカ","Roggenrola":"ダンゴロ","Boldore":"ガントル","Gigalith":"ギガイアス","Woobat":"コロモリ","Swoobat":"ココロモリ","Drilbur":"モグリュー","Excadrill":"ドリュウズ","Audino":"タブンネ","Timburr":"ドッコラー","Gurdurr":"ドテッコツ","Conkeldurr":"ローブシン","Tympole":"オタマロ","Palpitoad":"ガマガル","Seismitoad":"ガマゲロゲ","Throh":"ナゲキ","Sawk":"ダゲキ","Sewaddle":"クルミル","Swadloon":"クルマユ","Leavanny":"ハハコモリ","Venipede":"フシデ","Whirlipede":"ホイーガ","Scolipede":"ペンドラー","Cottonee":"モンメン","Whimsicott":"エルフーン","Petilil":"チュリネ","Lilligant":"ドレディア","Basculin":"バスラオ","Sandile":"メグロコ","Krokorok":"ワルビル","Krookodile":"ワルビアル","Darumaka":"ダルマッカ","Darmanitan":"ヒヒダルマ","Maractus":"マラカッチ","Dwebble":"イシズマイ","Crustle":"イワパレス","Scraggy":"ズルッグ","Scrafty":"ズルズキン","Sigilyph":"シンボラー","Yamask":"デスマス","Cofagrigus":"デスカーン","Tirtouga":"プロトーガ","Carracosta":"アバゴーラ","Archen":"アーケン","Archeops":"アーケオス","Trubbish":"ヤブクロン","Garbodor":"ダストダス","Zorua":"ゾロア","Zoroark":"ゾロアーク","Minccino":"チラーミィ","Cinccino":"チラチーノ","Gothita":"ゴチム","Gothorita":"ゴチミル","Gothitelle":"ゴチルゼル","Solosis":"ユニラン","Duosion":"ダブラン","Reuniclus":"ランクルス","Ducklett":"コアルヒー","Swanna":"スワンナ","Vanillite":"バニプッチ","Vanillish":"バニリッチ","Vanilluxe":"バイバニラ","Deerling":"シキジカ","Sawsbuck":"メブキジカ","Emolga":"エモンガ","Karrablast":"カブルモ","Escavalier":"シュバルゴ","Foongus":"タマゲタケ","Amoonguss":"モロバレル","Frillish":"プルリル","Jellicent":"ブルンゲル","Alomomola":"ママンボウ","Joltik":"バチュル","Galvantula":"デンチュラ","Ferroseed":"テッシード","Ferrothorn":"ナットレイ","Klink":"ギアル","Klang":"ギギアル","Klinklang":"ギギギアル","Tynamo":"シビシラス","Eelektrik":"シビビール","Eelektross":"シビルドン","Elgyem":"リグレー","Beheeyem":"オーベム","Litwick":"ヒトモシ","Lampent":"ランプラー","Chandelure":"シャンデラ","Axew":"キバゴ","Fraxure":"オノンド","Haxorus":"オノノクス","Cubchoo":"クマシュン","Beartic":"ツンベアー","Cryogonal":"フリージオ","Shelmet":"チョボマキ","Accelgor":"アギルダー","Stunfisk":"マッギョ","Mienfoo":"コジョフー","Mienshao":"コジョンド","Druddigon":"クリムガン","Golett":"ゴビット","Golurk":"ゴルーグ","Pawniard":"コマタナ","Bisharp":"キリキザン","Bouffalant":"バッフロン","Rufflet":"ワシボン","Braviary":"ウォーグル","Vullaby":"バルチャイ","Mandibuzz":"バルジーナ","Heatmor":"クイタラン","Durant":"アイアント","Deino":"モノズ","Zweilous":"ジヘッド","Hydreigon":"サザンドラ","Larvesta":"メラルバ","Volcarona":"ウルガモス","Cobalion":"コバルオン","Terrakion":"テラキオン","Virizion":"ビリジオン","Tornadus":"トルネロス","Thundurus":"ボルトロス","Reshiram":"レシラム","Zekrom":"ゼクロム","Landorus":"ランドロス","Kyurem":"キュレム","Keldeo":"ケルディオ","Meloetta":"メロエッタ","Genesect":"ゲノセクト","Chespin":"ハリマロン","Quilladin":"ハリボーグ","Chesnaught":"ブリガロン","Fennekin":"フォッコ","Braixen":"テールナー","Delphox":"マフォクシー","Froakie":"ケロマツ","Frogadier":"ゲコガシラ","Greninja":"ゲッコウガ","Bunnelby":"ホルビー","Diggersby":"ホルード","Fletchling":"ヤヤコマ","Fletchinder":"ヒノヤコマ","Talonflame":"ファイアロー","Scatterbug":"コフキムシ","Spewpa":"コフーライ","Vivillon":"ビビヨン","Litleo":"シシコ","Pyroar":"カエンジシ","Flabébé":"フラベベ","Floette":"フラエッテ","Florges":"フラージェス","Skiddo":"メェークル","Gogoat":"ゴーゴート","Pancham":"ヤンチャム","Pangoro":"ゴロンダ","Furfrou":"トリミアン","Espurr":"ニャスパー","Meowstic":"ニャオニクス","Honedge":"ヒトツキ","Doublade":"ニダンギル","Aegislash":"ギルガルド","Spritzee":"シュシュプ","Aromatisse":"フレフワン","Swirlix":"ペロッパフ","Slurpuff":"ペロリーム","Inkay":"マーイーカ","Malamar":"カラマネロ","Binacle":"カメテテ","Barbaracle":"ガメノデス","Skrelp":"クズモー","Dragalge":"ドラミドロ","Clauncher":"ウデッポウ","Clawitzer":"ブロスター","Helioptile":"エリキテル","Heliolisk":"エレザード","Tyrunt":"チゴラス","Tyrantrum":"ガチゴラス","Amaura":"アマルス","Aurorus":"アマルルガ","Sylveon":"ニンフィア","Hawlucha":"ルチャブル","Dedenne":"デデンネ","Carbink":"メレシー","Goomy":"ヌメラ","Sliggoo":"ヌメイル","Goodra":"ヌメルゴン","Klefki":"クレッフィ","Phantump":"ボクレー","Trevenant":"オーロット","Pumpkaboo":"バケッチャ","Gourgeist":"パンプジン","Bergmite":"カチコール","Avalugg":"クレベース","Noibat":"オンバット","Noivern":"オンバーン","Xerneas":"ゼルネアス","Yveltal":"イベルタル","Zygarde":"ジガルデ","Diancie":"ディアンシー","Hoopa":"フーパ","Volcanion":"ボルケニオン","Rowlet":"モクロー","Dartrix":"フクスロー","Decidueye":"ジュナイパー","Litten":"ニャビー","Torracat":"ニャヒート","Incineroar":"ガオガエン","Popplio":"アシマリ","Brionne":"オシャマリ","Primarina":"アシレーヌ","Pikipek":"ツツケラ","Trumbeak":"ケララッパ","Toucannon":"ドデカバシ","Yungoos":"ヤングース","Gumshoos":"デカグース","Grubbin":"アゴジムシ","Charjabug":"デンヂムシ","Vikavolt":"クワガノン","Crabrawler":"マケンカニ","Crabominable":"ケケンカニ","Oricorio":"オドリドリ","Cutiefly":"アブリー","Ribombee":"アブリボン","Rockruff":"イワンコ","Lycanroc":"ルガルガン","Wishiwashi":"ヨワシ","Mareanie":"ヒドイデ","Toxapex":"ドヒドイデ","Mudbray":"ドロバンコ","Mudsdale":"バンバドロ","Dewpider":"シズクモ","Araquanid":"オニシズクモ","Fomantis":"カリキリ","Lurantis":"ラランテス","Morelull":"ネマシュ","Shiinotic":"マシェード","Salandit":"ヤトウモリ","Salazzle":"エンニュート","Stufful":"ヌイコグマ","Bewear":"キテルグマ","Bounsweet":"アマカジ","Steenee":"アママイコ","Tsareena":"アマージョ","Comfey":"キュワワー","Oranguru":"ヤレユータン","Passimian":"ナゲツケサル","Wimpod":"コソクムシ","Golisopod":"グソクムシャ","Sandygast":"スナバァ","Palossand":"シロデスナ","Pyukumuku":"ナマコブシ","Type: Null":"タイプ：ヌル","Silvally":"シルヴァディ","Minior":"メテノ","Komala":"ネッコアラ","Turtonator":"バクガメス","Togedemaru":"トゲデマル","Mimikyu":"ミミッキュ","Bruxish":"ハギギシリ","Drampa":"ジジーロン","Dhelmise":"ダダリン","Jangmo-o":"ジャラコ","Hakamo-o":"ジャランゴ","Kommo-o":"ジャラランガ","Tapu Koko":"カプ・コケコ","Tapu Lele":"カプ・テテフ","Tapu Bulu":"カプ・ブルル","Tapu Fini":"カプ・レヒレ","Cosmog":"コスモッグ","Cosmoem":"コスモウム","Solgaleo":"ソルガレオ","Lunala":"ルナアーラ","Nihilego":"ウツロイド","Buzzwole":"マッシブーン","Pheromosa":"フェローチェ","Xurkitree":"デンジュモク","Celesteela":"テッカグヤ","Kartana":"カミツルギ","Guzzlord":"アクジキング","Necrozma":"ネクロズマ","Magearna":"マギアナ","Marshadow":"マーシャドー","Poipole":"ベベノム","Naganadel":"アーゴヨン","Stakataka":"ツンデツンデ","Blacephalon":"ズガドーン","Zeraora":"ゼラオラ","Meltan":"メルタン","Melmetal":"メルメタル","Grookey":"サルノリ","Thwackey":"バチンキー","Rillaboom":"ゴリランダー","Scorbunny":"ヒバニー","Raboot":"ラビフット","Cinderace":"エースバーン","Sobble":"メッソン","Drizzile":"ジメレオン","Inteleon":"インテレオン","Skwovet":"ホシガリス","Greedent":"ヨクバリス","Rookidee":"ココガラ","Corvisquire":"アオガラス","Corviknight":"アーマーガア","Blipbug":"サッチムシ","Dottler":"レドームシ","Orbeetle":"イオルブ","Nickit":"クスネ","Thievul":"フォクスライ","Gossifleur":"ヒメンカ","Eldegoss":"ワタシラガ","Wooloo":"ウールー","Dubwool":"バイウールー","Chewtle":"カムカメ","Drednaw":"カジリガメ","Yamper":"ワンパチ","Boltund":"パルスワン","Rolycoly":"タンドン","Carkol":"トロッゴン","Coalossal":"セキタンザン","Applin":"カジッチュ","Flapple":"アップリュー","Appletun":"タルップル","Silicobra":"スナヘビ","Sandaconda":"サダイジャ","Cramorant":"ウッウ","Arrokuda":"サシカマス","Barraskewda":"カマスジョー","Toxel":"エレズン","Toxtricity":"ストリンダー","Sizzlipede":"ヤクデ","Centiskorch":"マルヤクデ","Clobbopus":"タタッコ","Grapploct":"オトスパス","Sinistea":"ヤバチャ","Polteageist":"ポットデス","Hatenna":"ミブリム","Hattrem":"テブリム","Hatterene":"ブリムオン","Impidimp":"ベロバー","Morgrem":"ギモー","Grimmsnarl":"オーロンゲ","Obstagoon":"タチフサグマ","Perrserker":"ニャイキング","Cursola":"サニゴーン","Sirfetch'd":"ネギガナイト","Mr. Rime":"バリコオル","Runerigus":"デスバーン","Milcery":"マホミル","Alcremie":"マホイップ","Falinks":"タイレーツ","Pincurchin":"バチンウニ","Snom":"ユキハミ","Frosmoth":"モスノウ","Stonjourner":"イシヘンジン","Eiscue":"コオリッポ","Indeedee":"イエッサン","Morpeko":"モルペコ","Cufant":"ゾウドウ","Copperajah":"ダイオウドウ","Dracozolt":"パッチラゴン","Arctozolt":"パッチルドン","Dracovish":"ウオノラゴン","Arctovish":"ウオチルドン","Duraludon":"ジュラルドン","Dreepy":"ドラメシヤ","Drakloak":"ドロンチ","Dragapult":"ドラパルト","Zacian":"ザシアン","Zamazenta":"ザマゼンタ","Eternatus":"ムゲンダイナ","Kubfu":"ダクマ","Urshifu":"ウーラオス","Zarude":"ザルード","Regieleki":"レジエレキ","Regidrago":"レジドラゴ","Glastrier":"ブリザポス","Spectrier":"レイスポス","Calyrex":"バドレックス","Wyrdeer":"アヤシシ","Kleavor":"バサギリ","Ursaluna":"ガチグマ","Basculegion":"イダイトウ","Sneasler":"オオニューラ","Overqwil":"ハリーマン","Enamorus":"ラブトロス","Sprigatito":"ニャオハ","Floragato":"ニャローテ","Meowscarada":"マスカーニャ","Fuecoco":"ホゲータ","Crocalor":"アチゲータ","Skeledirge":"ラウドボーン","Quaxly":"クワッス","Quaxwell":"ウェルカモ","Quaquaval":"ウェーニバル","Lechonk":"グルトン","Oinkologne":"パフュートン","Tarountula":"タマンチュラ","Spidops":"ワナイダー","Nymble":"マメバッタ","Lokix":"エクスレッグ","Pawmi":"パモ","Pawmo":"パモット","Pawmot":"パーモット","Tandemaus":"ワッカネズミ","Maushold":"イッカネズミ","Fidough":"パピモッチ","Dachsbun":"バウッツェル","Smoliv":"ミニーブ","Dolliv":"オリーニョ","Arboliva":"オリーヴァ","Squawkabilly":"イキリンコ","Nacli":"コジオ","Naclstack":"ジオヅム","Garganacl":"キョジオーン","Charcadet":"カルボウ","Armarouge":"グレンアルマ","Ceruledge":"ソウブレイズ","Tadbulb":"ズピカ","Bellibolt":"ハラバリー","Wattrel":"カイデン","Kilowattrel":"タイカイデン","Maschiff":"オラチフ","Mabosstiff":"マフィティフ","Shroodle":"シルシュルー","Grafaiai":"タギングル","Bramblin":"アノクサ","Brambleghast":"アノホラグサ","Toedscool":"ノノクラゲ","Toedscruel":"リククラゲ","Klawf":"ガケガニ","Capsakid":"カプサイジ","Scovillain":"スコヴィラン","Rellor":"シガロコ","Rabsca":"ベラカス","Flittle":"ヒラヒナ","Espathra":"クエスパトラ","Tinkatink":"カヌチャン","Tinkatuff":"ナカヌチャン","Tinkaton":"デカヌチャン","Wiglett":"ウミディグダ","Wugtrio":"ウミトリオ","Bombirdier":"オトシドリ","Finizen":"ナミイルカ","Palafin":"イルカマン","Varoom":"ブロロン","Revavroom":"ブロロローム","Cyclizar":"モトトカゲ","Orthworm":"ミミズズ","Glimmet":"キラーメ","Glimmora":"キラフロル","Greavard":"ボチ","Houndstone":"ハカドッグ","Flamigo":"カラミンゴ","Cetoddle":"アルクジラ","Cetitan":"ハルクジラ","Veluza":"ミガルーサ","Dondozo":"ヘイラッシャ","Tatsugiri":"シャリタツ","Annihilape":"コノヨザル","Clodsire":"ドオー","Farigiraf":"リキキリン","Dudunsparce":"ノココッチ","Kingambit":"ドドゲザン","Great Tusk":"イダイナキバ","Scream Tail":"サケブシッポ","Brute Bonnet":"アラブルタケ","Flutter Mane":"ハバタクカミ","Slither Wing":"チヲハウハネ","Sandy Shocks":"スナノケガワ","Iron Treads":"テツノワダチ","Iron Bundle":"テツノツツミ","Iron Hands":"テツノカイナ","Iron Jugulis":"テツノコウベ","Iron Moth":"テツノドクガ","Iron Thorns":"テツノイバラ","Frigibax":"セビエ","Arctibax":"セゴール","Baxcalibur":"セグレイブ","Gimmighoul":"コレクレー","Gholdengo":"サーフゴー","Wo-Chien":"チオンジェン","Chien-Pao":"パオジアン","Ting-Lu":"ディンルー","Chi-Yu":"イーユイ","Roaring Moon":"トドロクツキ","Iron Valiant":"テツノブジン","Koraidon":"コライドン","Miraidon":"ミライドン","Walking Wake":"ウネルミナモ","Iron Leaves":"テツノイサハ","Dipplin":"カミッチュ","Poltchageist":"チャデス","Sinistcha":"ヤバソチャ","Okidogi":"イイネイヌ","Munkidori":"マシマシラ","Fezandipiti":"キチキギス","Ogerpon":"オーガポン","Archaludon":"ブリジュラス","Hydrapple":"カミツオロチ","Gouging Fire":"ウガツホムラ","Raging Bolt":"タケルライコ","Iron Boulder":"テツノイワオ","Iron Crown":"テツノカシラ","Terapagos":"テラパゴス","Pecharunt":"モモワロウ"};

// カード名の個別対訳 (トレーナーズ全種 + 辞書で訳せない特殊なポケモン名)
// ※一部は公式の日本語名が確認できていない暫定訳
const CARD_JA = {
  // --- ポケモン (特殊な名前) ---
  "Dawn Wings Necrozma": "ネクロズマ(あかつきのつばさ)",
  "Dusk Mane Necrozma": "ネクロズマ(たそがれのたてがみ)",
  "Ultra Necrozma ex": "ウルトラネクロズマex",
  "Mow Rotom": "カットロトム",
  "Heat Rotom": "ヒートロトム",
  "Wash Rotom": "ウォッシュロトム",
  "Frost Rotom": "フロストロトム",
  "Fan Rotom": "スピンロトム",
  "Mega Charizard X ex": "メガリザードンXex",
  "Mega Charizard Y ex": "メガリザードンYex",
  "Mega Mewtwo X ex": "メガミュウツーXex",
  "Mega Mewtwo Y ex": "メガミュウツーYex",
  "Teal Mask Ogerpon ex": "みどりのめんオーガポンex",
  "Hearthflame Mask Ogerpon": "かまどのめんオーガポン",
  "Wellspring Mask Ogerpon": "いどのめんオーガポン",
  "Cornerstone Mask Ogerpon": "いしずえのめんオーガポン",

  // --- グッズ・どうぐ・スタジアム ---
  "Hand Scope": "ハンドスコープ",
  "Mythical Slab": "ふしぎな石板",
  "Pokémon Communication": "ポケモン通信",
  "Big Malasada": "おおきいマラサダ",
  "Fishing Net": "釣りあみ",
  "Rare Candy": "ふしぎなアメ",
  "Rotom Dex": "ロトム図鑑",
  "Poison Barb": "どくバリ",
  "Leaf Cape": "リーフマント",
  "Beast Wall": "ビーストウォール",
  "Repel": "むしよけスプレー",
  "Electrical Cord": "でんきコード",
  "Beastite": "ビースタイト",
  "Eevee Bag": "イーブイバッグ",
  "Leftovers": "たべのこし",
  "Elemental Switch": "エレメンタルスイッチ",
  "Squirt Bottle": "ゼニガメじょうろ",
  "Steel Apron": "はがねのエプロン",
  "Dark Pendant": "あくのペンダント",
  "Rescue Scarf": "レスキュースカーフ",
  "Inflatable Boat": "ゴムボート",
  "Memory Light": "メモリーライト",
  "Prank Spinner": "いたずらスピナー",
  "Plume Fossil": "はねのカセキ",
  "Hitting Hammer": "たたきハンマー",
  "Cover Fossil": "ふたのカセキ",
  "Flame Patch": "ほのおのパッチ",
  "Sitrus Berry": "オボンのみ",
  "Heavy Helmet": "ヘビーヘルメット",
  "Lucky Mittens": "ラッキーミトン",
  "Clemont's Backpack": "シトロンのリュック",
  "Quick-Grow Extract": "すくすくエキス",
  "Jaw Fossil": "アゴのカセキ",
  "Lucky Ice Pop": "あたりつきアイス",
  "Sail Fossil": "ヒレのカセキ",
  "Protective Poncho": "まもりのポンチョ",
  "Metal Core Barrier": "メタルコアバリア",
  "Training Area": "トレーニングエリア",
  "Starting Plains": "はじまりの平原",
  "Peculiar Plaza": "ふしぎな広場",
  "Electric Generator": "エレキジェネレーター",
  "Big Air Balloon": "おおきなふうせん",
  "Mesagoza": "テーブルシティ",

  // --- サポート (人物) ---
  "Budding Expeditioner": "かけだし探検家",
  "Cynthia": "シロナ",
  "Volkner": "デンジ",
  "Celestic Town Elder": "カンナギタウンの古老",
  "Barry": "ジュン",
  "Iono": "ナンジャモ",
  "Red": "レッド",
  "Team Rocket Grunt": "ロケット団のしたっぱ",
  "Acerola": "アセロラ",
  "Ilima": "イリマ",
  "Kiawe": "カキ",
  "Guzma": "グズマ",
  "Lana": "スイレン",
  "Sophocles": "マーマネ",
  "Mallow": "マオ",
  "Lillie": "リーリエ",
  "Gladion": "グラジオ",
  "Looker": "ハンサム",
  "Lusamine": "ルザミーネ",
  "Hau": "ハウ",
  "Penny": "ボタン",
  "Will": "イツキ",
  "Lyra": "コトネ",
  "Silver": "シルバー",
  "Fisher": "つりびと",
  "Jasmine": "ミカン",
  "Hiker": "やまおとこ",
  "Whitney": "アカネ",
  "Traveling Merchant": "旅の商人",
  "Morty": "マツバ",
  "Marlon": "シズイ",
  "Hala": "ハラ",
  "May": "ハルカ",
  "Fantina": "メリッサ",
  "Copycat": "ものまね娘",
  "Lisia": "ルチア",
  "Clemont": "シトロン",
  "Serena": "セレナ",
  "Diantha": "カルネ",
  "Sightseer": "かんこうきゃく",
  "Juggler": "ジャグラー",
  "Piers": "ネズ",
  "Team Star Grunt": "スター団のしたっぱ",
  "Nemona": "ネモ",
  "Arven": "ペパー",

  // --- 初期から対訳済みのもの ---
  "Professor's Research": "博士の研究",
  "Poké Ball": "モンスターボール",
  "Potion": "キズぐすり",
  "X Speed": "スピーダー",
  "Red Card": "レッドカード",
  "Pokédex": "ポケモン図鑑",
  "Pokémon Flute": "ポケモンのふえ",
  "Pokémon Center Lady": "ポケモンセンターのお姉さん",
  "Rocky Helmet": "ゴツゴツメット",
  "Giant Cape": "おおきなマント",
  "Lum Berry": "ラムのみ",
  "Helix Fossil": "かいのカセキ",
  "Dome Fossil": "ドームのカセキ",
  "Old Amber": "ひみつのコハク",
  "Skull Fossil": "ずがいのカセキ",
  "Armor Fossil": "たてのカセキ",
  "Erika": "エリカ",
  "Misty": "カスミ",
  "Blaine": "カツラ",
  "Koga": "キョウ",
  "Giovanni": "サカキ",
  "Brock": "タケシ",
  "Sabrina": "ナツメ",
  "Lt. Surge": "マチス",
  "Blue": "グリーン",
  "Leaf": "リーフ",
  "Cyrus": "アカギ",
  "Team Galactic Grunt": "ギンガ団のしたっぱ",
  "Dawn": "ヒカリ",
  "Mars": "マーズ",
  "Irida": "カイ",
  "Adaman": "セキ",
  "Volo": "ウォロ",
};

const TYPE_JA = {
  Grass: "草", Fire: "炎", Water: "水", Lightning: "雷", Psychic: "超",
  Fighting: "闘", Darkness: "悪", Metal: "鋼", Colorless: "無色", Dragon: "ドラゴン",
};

const STAGE_JA = {
  "Basic": "たね", "Stage1": "1進化", "Stage 1": "1進化",
  "Stage2": "2進化", "Stage 2": "2進化",
};

const RARITY_JA = {
  "One Diamond": "◇", "Two Diamond": "◇◇", "Three Diamond": "◇◇◇", "Four Diamond": "◇◇◇◇",
  "One Star": "☆", "Two Star": "☆☆", "Three Star": "☆☆☆",
  "One Shiny": "✦", "Two Shiny": "✦✦", "Crown": "♛",
};

// パック名 (A3b以降は公式日本語名が未確認のため暫定訳)
const SET_JA = {
  "A1": "最強の遺伝子", "A1a": "幻のいる島",
  "A2": "時空の激闘", "A2a": "超克の光", "A2b": "シャイニングハイ",
  "A3": "双天の守護者", "A3a": "異次元クライシス", "A3b": "イーブイのもり",
  "A4": "海と空の叡智", "A4a": "ひめられた泉",
  "B1": "メガライジング", "B1a": "クリムゾンブレイズ",
  "B2": "幻想パレード", "B2a": "パルデアワンダー",
  "P-A": "プロモカード",
};

const NAME_PREFIX_JA = [
  ["Alolan ", "アローラ"],
  ["Galarian ", "ガラル"],
  ["Hisuian ", "ヒスイ"],
  ["Paldean ", "パルデア"],
  ["Mega ", "メガ"],
  ["Origin Forme ", "オリジン"],
  ["Shining ", "ひかる"],
];

function jaCardName(name) {
  if (CARD_JA[name]) return CARD_JA[name];
  let base = name;
  let suffix = "";
  if (base.endsWith(" ex")) {
    base = base.slice(0, -3);
    suffix = "ex";
  }
  let prefix = "";
  for (const [enPrefix, jaPrefix] of NAME_PREFIX_JA) {
    if (base.startsWith(enPrefix)) {
      base = base.slice(enPrefix.length);
      prefix = jaPrefix;
      break;
    }
  }
  const translated = POKEMON_JA[base];
  return translated ? prefix + translated + suffix : name;
}

const jaType = (t) => TYPE_JA[t] || t;
const jaStage = (s) => STAGE_JA[s] || s;
const jaRarity = (r) => RARITY_JA[r] || r;
const jaSetName = (id, fallback) => SET_JA[id] || fallback;

// ---------- わざ・特性の効果テキストの雑訳 ----------
// 文単位で定型パターンを変換し、変換できない文は英語のまま残す。
// 効果テキスト中のエネルギーは {R} のような記号で表記される
const ENERGY_LETTER = { G: "草", R: "炎", W: "水", L: "雷", P: "超", F: "闘", D: "悪", M: "鋼", C: "無色" };
const ene = (letter) => (ENERGY_LETTER[letter] || letter) + "エネルギー";
const num = (n) => (n === "a" || n === "an" ? "1" : n);
const expandEnergyTokens = (s) => s.replace(/\{(\w)\}/g, (m, l) => ENERGY_LETTER[l] || l);

// 「〜に」の対象表現 (訳せない対象は null を返してパターン全体を不成立にする)
function jaTarget(raw) {
  const s = expandEnergyTokens(raw.trim());
  const table = [
    [/^this Pokémon$/i, "このポケモン"],
    [/^itself$/i, "このポケモン自身"],
    [/^your Active Pokémon$/i, "自分のバトルポケモン"],
    [/^your opponent'?s Active Pokémon$/i, "相手のバトルポケモン"],
    [/^the Defending Pokémon$/i, "相手のバトルポケモン"],
    [/^the Attacking Pokémon$/i, "ワザを使ったポケモン"],
    [/^1 of your opponent'?s Pokémon$/i, "相手のポケモン1匹"],
    [/^1 of your opponent'?s Benched Pokémon$/i, "相手のベンチポケモン1匹"],
    [/^each of your opponent'?s Benched Pokémon$/i, "相手のベンチポケモン全員"],
    [/^each of your opponent'?s Pokémon$/i, "相手のポケモン全員"],
    [/^each of your Pokémon$/i, "自分のポケモン全員"],
    [/^1 of your Pokémon$/i, "自分のポケモン1匹"],
    [/^1 of your Benched Pokémon$/i, "自分のベンチポケモン1匹"],
    [/^your Benched Basic Pokémon in any way you like$/i, "自分のベンチのたねポケモンに好きなように"],
    [/^it$/i, "そのポケモン"],
  ];
  for (const [re, ja] of table) if (re.test(s)) return ja;
  const word = (w) => (w === "Basic" ? "たね" : w);
  let m = s.match(/^1 of your Benched (\S+) Pokémon$/i);
  if (m) return `自分のベンチの${word(m[1])}ポケモン1匹`;
  m = s.match(/^your Benched (\S+) Pokémon in any way you like$/i);
  if (m) return `自分のベンチの${word(m[1])}ポケモンに好きなように`;
  m = s.match(/^1 of your (\S+) Pokémon$/i);
  if (m) return `自分の${word(m[1])}ポケモン1匹`;
  return null;
}

// 「〜の数×」の対象表現
function jaEach(raw) {
  const s = expandEnergyTokens(raw.trim());
  const table = [
    [/^heads$/i, "オモテ"],
    [/^Energy attached to your opponent'?s Active Pokémon$/i, "相手のバトルポケモンについているエネルギー"],
    [/^Energy attached to this Pokémon$/i, "このポケモンについているエネルギー"],
    [/^of your Benched Pokémon$/i, "自分のベンチポケモン"],
    [/^of your opponent'?s Benched Pokémon$/i, "相手のベンチポケモン"],
    [/^Pokémon on your opponent'?s Bench$/i, "相手のベンチポケモン"],
    [/^card in your opponent'?s hand$/i, "相手の手札"],
    [/^card in your hand$/i, "自分の手札"],
    [/^damage counter on this Pokémon$/i, "このポケモンのダメカン"],
  ];
  for (const [re, ja] of table) if (re.test(s)) return ja;
  let m = s.match(/^of your Benched (\S+) Pokémon$/i);
  if (m) return `自分のベンチの${m[1]}ポケモン`;
  m = s.match(/^(\S+) Energy attached to this Pokémon$/i);
  if (m) return `このポケモンについている${m[1]}エネルギー`;
  return null;
}

// 特殊状態
const COND_JA = { Poisoned: "どく", Asleep: "ねむり", Paralyzed: "マヒ", Burned: "やけど", Confused: "こんらん" };

const EFFECT_PATTERNS = [
  [/^Flip a coin\. If heads, (.+)$/i, (m, rest) => `コインを1回投げオモテなら、${jaEffect(rest)}`],
  [/^Flip a coin\. If tails, (.+)$/i, (m, rest) => `コインを1回投げウラなら、${jaEffect(rest)}`],
  [/^Flip (\d+) coins\. This attack does (\d+)(?: more)? damage for each heads\.$/i,
    (m, n, dmg) => `コインを${n}回投げ、オモテの数×${dmg}ダメージ${/more/.test(m) ? "追加" : ""}。`],
  [/^Flip a coin until you get tails\. This attack does (\d+)(?: more)? damage for each heads\.$/i,
    (m, dmg) => `ウラが出るまでコインを投げ、オモテの数×${dmg}ダメージ${/more/.test(m) ? "追加" : ""}。`],
  [/^this attack does (\d+) more damage\.?$/i, (m, dmg) => `${dmg}ダメージ追加。`],
  [/^This attack does (\d+) more damage\.$/i, (m, dmg) => `このワザのダメージを${dmg}追加。`],
  [/^this attack does nothing\.?$/i, () => `このワザは失敗。`],
  [/^This attack does nothing\.$/i, () => `このワザは失敗。`],
  [/^This attack does (\d+) damage to 1 of your opponent'?s Pokémon\.$/i,
    (m, dmg) => `相手のポケモン1匹に${dmg}ダメージ。`],
  [/^This attack does (\d+) damage to 1 of your opponent'?s Benched Pokémon\.$/i,
    (m, dmg) => `相手のベンチポケモン1匹に${dmg}ダメージ。`],
  [/^This attack also does (\d+) damage to each of your opponent'?s Benched Pokémon\.$/i,
    (m, dmg) => `相手のベンチポケモン全員にも${dmg}ダメージ。`],
  [/^This Pokémon also does (\d+) damage to itself\.$/i, (m, dmg) => `このポケモン自身にも${dmg}ダメージ。`],
  [/^Heal (\d+) damage from this Pokémon\.$/i, (m, n) => `このポケモンのHPを${n}回復。`],
  [/^Draw a card\.$/i, () => `自分の山札を1枚引く。`],
  [/^Draw (\d+) cards\.$/i, (m, n) => `自分の山札を${n}枚引く。`],
  [/^Your opponent reveals their hand\.$/i, () => `相手の手札を見る。`],
  [/^Discard a random card from your opponent'?s hand\.$/i, () => `相手の手札をランダムに1枚トラッシュ。`],
  [/^Discard (a|\d+) \{(\w)\} Energy from this Pokémon\.$/i,
    (m, n, t) => `このポケモンから${ene(t)}を${num(n)}個トラッシュ。`],
  [/^Discard all Energy from this Pokémon\.$/i, () => `このポケモンからエネルギーをすべてトラッシュ。`],
  [/^Take (a|\d+) \{(\w)\} Energy from your Energy Zone and attach it to this Pokémon\.$/i,
    (m, n, t) => `自分のエネルギーゾーンから${ene(t)}を${num(n)}個出し、このポケモンにつける。`],
  [/^Switch this Pokémon with 1 of your Benched Pokémon\.$/i, () => `このポケモンをベンチポケモン1匹と入れ替える。`],
  [/^Switch out your opponent'?s Active Pokémon to the Bench\. \(Your opponent chooses the new Active Pokémon\.\)$/i,
    () => `相手のバトルポケモンをベンチと入れ替える。(新しいバトルポケモンは相手が選ぶ)`],
  [/^your opponent'?s Active Pokémon is now Poisoned\.?$/i, () => `相手のバトルポケモンをどく状態にする。`],
  [/^Your opponent'?s Active Pokémon is now Poisoned\.$/i, () => `相手のバトルポケモンをどく状態にする。`],
  [/^your opponent'?s Active Pokémon is now Asleep\.?$/i, () => `相手のバトルポケモンをねむり状態にする。`],
  [/^Your opponent'?s Active Pokémon is now Asleep\.$/i, () => `相手のバトルポケモンをねむり状態にする。`],
  [/^your opponent'?s Active Pokémon is now Paralyzed\.?$/i, () => `相手のバトルポケモンをマヒ状態にする。`],
  [/^Your opponent'?s Active Pokémon is now Paralyzed\.$/i, () => `相手のバトルポケモンをマヒ状態にする。`],
  [/^your opponent'?s Active Pokémon is now Burned\.?$/i, () => `相手のバトルポケモンをやけど状態にする。`],
  [/^Your opponent'?s Active Pokémon is now Burned\.$/i, () => `相手のバトルポケモンをやけど状態にする。`],
  [/^your opponent'?s Active Pokémon is now Confused\.?$/i, () => `相手のバトルポケモンをこんらん状態にする。`],
  [/^Your opponent'?s Active Pokémon is now Confused\.$/i, () => `相手のバトルポケモンをこんらん状態にする。`],
  [/^During your opponent'?s next turn, this Pokémon takes −(\d+) damage from attacks\.$/i,
    (m, n) => `相手の次の番、このポケモンが受けるワザのダメージを−${n}。`],
  [/^During your opponent'?s next turn, attacks used by the Defending Pokémon do −(\d+) damage\.$/i,
    (m, n) => `相手の次の番、このワザを受けたポケモンのワザのダメージを−${n}。`],
  [/^During your opponent'?s next turn, the Defending Pokémon can'?t attack\.$/i,
    () => `相手の次の番、このワザを受けたポケモンはワザが使えない。`],
  [/^During your opponent'?s next turn, the Defending Pokémon can'?t retreat\.$/i,
    () => `相手の次の番、このワザを受けたポケモンはにげられない。`],
  [/^If this Pokémon has damage on it, this attack does (\d+) more damage\.$/i,
    (m, n) => `このポケモンにダメージがのっているなら、${n}ダメージ追加。`],

  // --- 汎用パターン (対象・回数をパラメータ化 / 訳せない対象なら不成立) ---
  [/^This attack (also )?does (\d+) damage to (.+?)\.$/i,
    (m, also, n, tgt) => { const t = jaTarget(tgt); return t && `${t}に${also ? "も" : ""}${n}ダメージ。`; }],
  [/^do (\d+) damage to (.+?)\.$/i,
    (m, n, tgt) => { const t = jaTarget(tgt); return t && `${t}に${n}ダメージ。`; }],
  [/^This attack does (\d+) more damage for each (.+?)\.$/i,
    (m, n, each) => { const e = jaEach(each); return e && `${e}の数×${n}ダメージ追加。`; }],
  [/^This attack does (\d+) damage for each (.+?)\.$/i,
    (m, n, each) => { const e = jaEach(each); return e && `${e}の数×${n}ダメージ。`; }],
  [/^Heal (\d+) damage from (.+?)\.$/i,
    (m, n, tgt) => { const t = jaTarget(tgt); return t && `${t}のHPを${n}回復。`; }],
  [/^Discard a random Energy from (.+?)\.$/i,
    (m, tgt) => { const t = jaTarget(tgt); return t && `${t}からエネルギーをランダムに1個トラッシュ。`; }],
  [/^Take (a|an|\d+) \{(\w)\} Energy from your Energy Zone and attach (?:it|them) to (.+?)\.$/i,
    (m, n, t, tgt) => { const j = jaTarget(tgt); return j && `自分のエネルギーゾーンから${ene(t)}を${num(n)}個出し、${j}につける。`; }],
  [/^(?:Your opponent'?s Active|The Defending) Pokémon is now (\w+)(?: and (\w+))?\.$/i,
    (m, c1, c2) => {
      const a = COND_JA[c1];
      const b = c2 ? COND_JA[c2] : "";
      return a && (!c2 || b) ? `相手のバトルポケモンを${a}${b ? "・" + b : ""}状態にする。` : null;
    }],
  [/^This Pokémon is now (\w+)\.$/i,
    (m, c) => COND_JA[c] && `このポケモンを${COND_JA[c]}状態にする。`],

  // --- コイン・ターン関連 ---
  [/^Flip (\d+) coins\.\s+(.+)$/i, (m, n, rest) => `コインを${n}回投げる。${jaEffect(rest)}`],
  [/^Flip (\d+) coins\.$/i, (m, n) => `コインを${n}回投げる。`],
  [/^Flip a coin until you get tails\.\s+(.+)$/i, (m, rest) => `ウラが出るまでコインを投げる。${jaEffect(rest)}`],
  [/^Flip a coin until you get tails\.$/i, () => `ウラが出るまでコインを投げる。`],
  [/^Flip a coin\.$/i, () => `コインを1回投げる。`],
  [/^If heads, (.+)$/i, (m, rest) => `オモテなら、${jaEffect(rest)}`],
  [/^If tails, that attack doesn'?t happen\.$/i, () => `ウラならそのワザは失敗。`],
  [/^If tails, (.+)$/i, (m, rest) => `ウラなら、${jaEffect(rest)}`],
  [/^For each heads, (.+)$/i, (m, rest) => `オモテの数ぶん、${jaEffect(rest)}`],
  [/^Once during your turn, you may (.+)$/i, (m, rest) => `自分の番に1回使える。${jaEffect(rest)}`],
  [/^Once during your turn, if this Pokémon is in the Active Spot, you may (.+)$/i,
    (m, rest) => `自分の番に1回、このポケモンがバトル場にいるなら使える。${jaEffect(rest)}`],
  [/^Once during your turn, if this Pokémon is on your Bench, you may (.+)$/i,
    (m, rest) => `自分の番に1回、このポケモンがベンチにいるなら使える。${jaEffect(rest)}`],
  [/^As long as this Pokémon is in the Active Spot, (.+)$/i,
    (m, rest) => `このポケモンがバトル場にいるかぎり、${jaEffect(rest)}`],
  [/^At the end of your turn, if this Pokémon is in the Active Spot, draw a card\.$/i,
    () => `自分の番の終わりに、このポケモンがバトル場にいるなら、自分の山札を1枚引く。`],
  [/^During your next turn, this Pokémon can'?t attack\.$/i, () => `次の自分の番、このポケモンはワザが使えない。`],
  [/^During your next turn, this Pokémon can'?t use (.+?)\.$/i, (m, w) => `次の自分の番、このポケモンは「${w}」が使えない。`],
  [/^During your opponent'?s next turn, prevent all damage from—and effects of—attacks done to this Pokémon\.$/i,
    () => `相手の次の番、このポケモンはワザのダメージや効果を受けない。`],

  // --- その他の頻出定型文 ---
  [/^This Pokémon takes −(\d+) damage from attacks\.$/i, (m, n) => `このポケモンが受けるワザのダメージを−${n}。`],
  [/^If this Pokémon has a Pokémon Tool attached, this attack does (\d+) more damage\.$/i,
    (m, n) => `このポケモンにポケモンのどうぐがついているなら、${n}ダメージ追加。`],
  [/^If this Pokémon is in the Active Spot and is damaged by an attack from your opponent'?s Pokémon, do (\d+) damage to the Attacking Pokémon\.$/i,
    (m, n) => `このポケモンがバトル場で、相手のポケモンからワザのダメージを受けたとき、ワザを使ったポケモンに${n}ダメージ。`],
  [/^\(Your opponent chooses the new Active Pokémon\.\)$/i, () => `(新しいバトルポケモンは相手が選ぶ。)`],
  [/^Put a random Pokémon from your deck into your hand\.$/i, () => `自分の山札からランダムにポケモンを1枚、手札に加える。`],
  [/^Put a random Basic Pokémon from your deck into your hand\.$/i, () => `自分の山札からランダムにたねポケモンを1枚、手札に加える。`],
  [/^This Pokémon can'?t be affected by any Special Conditions\.$/i, () => `このポケモンは特殊状態にならない。`],
  [/^Your opponent can'?t use any Supporter cards from their hand during their next turn\.$/i,
    () => `次の相手の番、相手は手札からサポートを使えない。`],
  [/^Choose 1 of your opponent'?s Active Pokémon'?s attacks and use it as this attack\.$/i,
    () => `相手のバトルポケモンのワザを1つ選び、このワザとして使う。`],

  // --- 追加パターン (第2弾) ---
  [/^If this Pokémon has at least (\d+) extra \{(\w)\} Energy attached, this attack does (\d+) more damage\.$/i,
    (m, n, t, dmg) => `このポケモンに${ene(t)}があと${n}個多くついているなら、${dmg}ダメージ追加。`],
  [/^For each time a Pokémon was chosen, do (\d+) damage to it\.$/i,
    (m, n) => `選ばれた回数ぶん、そのポケモンに${n}ダメージ。`],
  [/^1 of your opponent'?s Pokémon is chosen at random (\d+) times\.$/i,
    (m, n) => `相手のポケモン1匹をランダムに${n}回選ぶ。`],
  [/^If 1 of your Pokémon used (.+?) during your last turn, this attack does (\d+) more damage\.$/i,
    (m, w, n) => `前の自分の番に自分のポケモンが「${w}」を使っていたなら、${n}ダメージ追加。`],
  [/^During your opponent'?s next turn, if the Defending Pokémon tries to use an attack, your opponent flips a coin\.\s*(.+)?$/i,
    (m, rest) => `相手の次の番、このワザを受けたポケモンがワザを使うとき、相手はコインを1回投げる。${rest ? jaEffect(rest) : ""}`],
  [/^Take an amount of \{(\w)\} Energy from your Energy Zone equal to the number of heads and attach (?:it|them) to (.+?)\.$/i,
    (m, t, tgt) => { const j = jaTarget(tgt); return j && `オモテの数ぶん、自分のエネルギーゾーンから${ene(t)}を出し、${j}につける。`; }],
  [/^move all \{(\w)\} Energy from (.+?) to (.+?)\.$/i,
    (m, t, src, dst) => {
      const s = jaTarget(src);
      const d2 = jaTarget(dst);
      return s && d2 && `${s}についている${ene(t)}をすべて${d2}に付け替える。`;
    }],
  [/^Take a ((?:\{\w\},? )+and \{\w\}) Energy from your Energy Zone and attach them to (.+?)\.$/i,
    (m, list, tgt) => {
      const types = [...list.matchAll(/\{(\w)\}/g)].map((x) => ENERGY_LETTER[x[1]] || x[1]);
      const j = jaTarget(tgt);
      return j && `自分のエネルギーゾーンから${types.join("・")}エネルギーを1個ずつ出し、${j}につける。`;
    }],
  [/^Discard a ((?:\{\w\},? )+and \{\w\}) Energy from this Pokémon\.$/i,
    (m, list) => {
      const types = [...list.matchAll(/\{(\w)\}/g)].map((x) => ENERGY_LETTER[x[1]] || x[1]);
      return `このポケモンから${types.join("・")}エネルギーを1個ずつトラッシュ。`;
    }],
  [/^Discard all \{(\w)\} Energy from this Pokémon\.$/i, (m, t) => `このポケモンから${ene(t)}をすべてトラッシュ。`],
  [/^switch it with your Active Pokémon\.$/i, () => `このポケモンをバトルポケモンと入れ替える。`],
  [/^your opponent can'?t use any Supporter cards from their hand\.$/i, () => `相手は手札からサポートを使えない。`],
  [/^Whenever you attach a \{(\w)\} Energy from your Energy Zone to this Pokémon, do (\d+) damage to your opponent'?s Active Pokémon\.$/i,
    (m, t, n) => `自分のエネルギーゾーンから${ene(t)}をこのポケモンにつけるたび、相手のバトルポケモンに${n}ダメージ。`],
  [/^Choose (\d+) of your Benched Pokémon\.$/i, (m, n) => `自分のベンチポケモンを${n}匹選ぶ。`],
  [/^For each of those Pokémon, take a \{(\w)\} Energy from your Energy Zone and attach it to that Pokémon\.$/i,
    (m, t) => `選んだポケモン1匹ずつに、自分のエネルギーゾーンから${ene(t)}を1個つける。`],
  [/^If this Pokémon evolved during this turn, this attack does (\d+) more damage\.$/i,
    (m, n) => `この番このポケモンが進化していたなら、${n}ダメージ追加。`],
  [/^Flip a coin for each Energy attached to this Pokémon\.\s*(.+)?$/i,
    (m, rest) => `このポケモンについているエネルギーの数ぶんコインを投げる。${rest ? jaEffect(rest) : ""}`],
  [/^Discard a random Energy from among the Energy attached to all Pokémon \(both yours and your opponent'?s\)\.$/i,
    () => `お互いの場のポケモンについているエネルギーの中からランダムに1個トラッシュ。`],
  [/^Your opponent can'?t play any Pokémon from their hand to evolve their Active Pokémon\.$/i,
    () => `相手は手札からポケモンを出して、相手のバトルポケモンを進化させられない。`],
  [/^Put (\d+) random Basic Pokémon from your deck onto your Bench\.$/i,
    (m, n) => `自分の山札からランダムにたねポケモンを${n}匹、ベンチに出す。`],
  [/^If your opponent'?s Active Pokémon has damage on it, this attack does (\d+) more damage\.$/i,
    (m, n) => `相手のバトルポケモンにダメージがのっているなら、${n}ダメージ追加。`],
  [/^If any damage is done to this Pokémon by attacks, flip a coin\.\s*(.+)?$/i,
    (m, rest) => `このポケモンがワザのダメージを受けたとき、コインを1回投げる。${rest ? jaEffect(rest) : ""}`],
  [/^During Pokémon Checkup, if this Pokémon is in the Active Spot, do (\d+) damage to your opponent'?s Active Pokémon\.$/i,
    (m, n) => `ポケモンチェックのとき、このポケモンがバトル場にいるなら、相手のバトルポケモンに${n}ダメージ。`],
  [/^your opponent reveals a random card from their hand and shuffles it into their deck\.$/i,
    () => `相手は手札をランダムに1枚公開し、山札に戻して切る。`],
  [/^If any of your Pokémon were Knocked Out by damage from an attack during your opponent'?s last turn, this attack does (\d+) more damage\.$/i,
    (m, n) => `前の相手の番に自分のポケモンがワザのダメージできぜつしていたなら、${n}ダメージ追加。`],

  // --- 追加パターン (第3弾) ---
  [/^If your opponent'?s Active Pokémon is (\w+), this attack does (\d+) more damage\.$/i,
    (m, c, n) => COND_JA[c] && `相手のバトルポケモンが${COND_JA[c]}状態なら、${n}ダメージ追加。`],
  [/^If your opponent'?s Active Pokémon is a Pokémon ex, this attack does (\d+) more damage\.$/i,
    (m, n) => `相手のバトルポケモンがポケモンexなら、${n}ダメージ追加。`],
  [/^This attack does (\d+) damage to 1 of your opponent'?s Pokémon that have damage on them\.$/i,
    (m, n) => `ダメージがのっている相手のポケモン1匹に、${n}ダメージ。`],
  [/^During your opponent'?s next turn, they can'?t play any Item cards from their hand\.$/i,
    () => `相手の次の番、相手は手札からグッズを使えない。`],
  [/^During your opponent'?s next turn, they can'?t take any Energy from their Energy Zone to attach to their Active Pokémon\.$/i,
    () => `相手の次の番、相手はエネルギーゾーンからバトルポケモンにエネルギーをつけられない。`],
  [/^If this Pokémon is in the Active Spot and is Knocked Out by damage from an attack from your opponent'?s Pokémon, (.+)$/i,
    (m, rest) => `このポケモンがバトル場で、相手のポケモンのワザのダメージできぜつしたとき、${jaEffect(rest)}`],
  [/^attach a \{(\w)\} Energy from your discard pile to this Pokémon\.$/i,
    (m, t) => `自分のトラッシュから${ene(t)}を1個、このポケモンにつける。`],
  [/^If you do, (.+)$/i, (m, rest) => `そうしたなら、${jaEffect(rest)}`],
  [/^Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, you may (.+)$/i,
    (m, rest) => `自分の番に1回、手札からこのポケモンを出して進化させたとき使える。${jaEffect(rest)}`],
  [/^switch in 1 of your opponent'?s Benched Pokémon that has damage on it to the Active Spot\.$/i,
    () => `ダメージがのっている相手のベンチポケモン1匹を、バトル場に出す。`],
  [/^Discard the top card of your opponent'?s deck\.$/i, () => `相手の山札を上から1枚トラッシュ。`],
  [/^This attack does (\d+) damage for each Benched Pokémon \(both yours and your opponent'?s\)\.$/i,
    (m, n) => `お互いのベンチポケモンの数×${n}ダメージ。`],
  [/^This effect stacks\.$/i, () => `この効果は重複する。`],
  [/^Discard a card from your hand\.$/i, () => `自分の手札を1枚トラッシュ。`],
  [/^If you can'?t, this attack does nothing\.$/i, () => `できなければ、このワザは失敗。`],
  [/^Put (\d+) random \{(\w)\} Pokémon from your deck into your hand\.$/i,
    (m, n, t) => `自分の山札からランダムに${ENERGY_LETTER[t] || t}ポケモンを${n}枚、手札に加える。`],
  [/^This attack does (\d+) more damage for each of your Benched (\w[\w' .-]*)\.$/i,
    (m, n, sp) => {
      const names = sp.split(/ and /i).map((x) => jaCardName(x.trim())).join("と");
      return `自分のベンチの「${names}」の数×${n}ダメージ追加。`;
    }],
  [/^If you have (.+?) in play, this Pokémon takes −(\d+) damage from attacks\.$/i,
    (m, who, n) => {
      const names = who.split(/ or /i).map((x) => jaCardName(x.trim())).join("か");
      return `自分の場に${names}がいるなら、このポケモンが受けるワザのダメージを−${n}。`;
    }],
  [/^At the end of your first turn, take a \{(\w)\} Energy from your Energy Zone and attach it to this Pokémon\.$/i,
    (m, t) => `最初の自分の番の終わりに、自分のエネルギーゾーンから${ene(t)}を1個出し、このポケモンにつける。`],
  [/^This Pokémon takes −(\d+) damage from attacks from \{(\w)\} or \{(\w)\} Pokémon\.$/i,
    (m, n, t1, t2) => `${ENERGY_LETTER[t1]}または${ENERGY_LETTER[t2]}ポケモンから受けるワザのダメージを−${n}。`],
  [/^Flip a coin for each Pokémon you have in play\.\s*(.+)?$/i,
    (m, rest) => `自分の場のポケモンの数ぶんコインを投げる。${rest ? jaEffect(rest) : ""}`],
  [/^Flip a coin for each \{(\w)\} Energy attached to this Pokémon\.\s*(.+)?$/i,
    (m, t, rest) => `このポケモンについている${ene(t)}の数ぶんコインを投げる。${rest ? jaEffect(rest) : ""}`],
  [/^Halve your opponent'?s Active Pokémon'?s remaining HP, rounded down\.$/i,
    () => `相手のバトルポケモンの残りHPを半分にする(切り捨て)。`],
  [/^This attack does more damage equal to the damage this Pokémon has on it\.$/i,
    () => `このポケモンにのっているダメージぶん、ダメージ追加。`],
  [/^If you use this Ability, your turn ends\.$/i, () => `この特性を使ったら、自分の番は終わる。`],
  [/^Discard a random Energy from both Active Pokémon\.$/i,
    () => `お互いのバトルポケモンからエネルギーをランダムに1個ずつトラッシュ。`],
  [/^During your next turn, this Pokémon'?s (.+?) attack does \+(\d+) damage\.$/i,
    (m, w, n) => `次の自分の番、このポケモンの「${w}」のダメージを+${n}。`],
  [/^Prevent all damage done to this Pokémon by attacks from your opponent'?s Pokémon ex\.$/i,
    () => `相手のポケモンexから受けるワザのダメージを受けない。`],
  [/^Put a random card that evolves from (\w[\w' .-]*) from your deck into your hand\.$/i,
    (m, sp) => `自分の山札からランダムに「${POKEMON_JA[sp] || sp}」から進化するカードを1枚、手札に加える。`],
  [/^1 Special Condition from among Asleep, Burned, Confused, Paralyzed, and Poisoned is chosen at random, and your opponent'?s Active Pokémon is now affected by that Special Condition\.$/i,
    () => `ねむり・やけど・こんらん・マヒ・どくの中からランダムに1つ選び、相手のバトルポケモンをその特殊状態にする。`],
  [/^Any Special Conditions already affecting that Pokémon will not be chosen\.$/i,
    () => `すでにかかっている特殊状態は選ばれない。`],
  [/^whenever you attach an Energy from your Energy Zone to it, it is now Asleep\.$/i,
    () => `エネルギーゾーンからそのポケモンにエネルギーをつけるたび、そのポケモンはねむり状態になる。`],
  [/^attacks used by your opponent'?s Active Pokémon cost 1 \{C\} more\.$/i,
    () => `相手のバトルポケモンが使うワザは、必要なエネルギーが1個多くなる。`],
  [/^If you played a Supporter card from your hand during this turn, this attack does (\d+) more damage\.$/i,
    (m, n) => `この番、手札からサポートを使っていたなら、${n}ダメージ追加。`],
  [/^This Pokémon can evolve into any Pokémon that evolves from Eevee if you play it from your hand onto this Pokémon\.$/i,
    () => `イーブイから進化するポケモンなら、どれでも手札からこのポケモンに重ねて進化できる。`],
  [/^\(This Pokémon can'?t evolve during your first turn or the turn you play it\.\)$/i,
    () => `(最初の番と、場に出した番には進化できない。)`],
  [/^At the end of your turn, if this Pokémon is in the Active Spot, heal (\d+) damage from it\.$/i,
    (m, n) => `自分の番の終わりに、このポケモンがバトル場にいるなら、HPを${n}回復。`],
];

function jaEffectSentence(sentence) {
  const s = sentence.trim();
  for (const [re, rep] of EFFECT_PATTERNS) {
    const m = s.match(re);
    if (m) {
      const out = rep(...m);
      if (out != null && out !== false) return out; // repがnullなら次のパターンへ
    }
  }
  return s; // 変換できない文は英語のまま
}

function jaEffect(text) {
  if (!text) return text;
  // "Flip a coin. If heads, ..." のような複合文はパターン側で先に処理し、
  // 残りは文単位で変換する
  const whole = jaEffectSentence(text);
  if (whole !== text.trim()) return whole;
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => jaEffectSentence(s))
    .join(" ");
}
