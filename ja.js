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

// 個別対訳辞書 (パターンで訳せなかった全文を直接和訳 / 未知の新カード文のみ英語のまま)
const EFFECT_SENTENCE_JA = {
  "You may switch this Pokémon with 1 of your Benched Pokémon.": "このポケモンをベンチポケモン1匹と入れ替えてもよい。",
  "If you have Latias in play, this Pokémon has no Retreat Cost.": "自分の場にラティアスがいるなら、このポケモンのにげるコストは0になる。",
  "If this Pokémon has any {W} Energy attached, this attack does 40 more damage.": "このポケモンに水エネルギーがついているなら、40ダメージ追加。",
  "This attack does 30 more damage for each Energy in your opponent's Active Pokémon's Retreat Cost.": "相手のバトルポケモンのにげるコストの数×30ダメージ追加。",
  "Discard Fire{R} Energy from this Pokémon.": "このポケモンから炎エネルギーをトラッシュ。",
  "Discard the top 3 cards of your opponent's deck.": "相手の山札を上から3枚トラッシュ。",
  "1 of your opponent's Benched Pokémon is chosen at random 3 times.": "相手のベンチポケモン1匹をランダムに3回選ぶ。",
  "For each time a Pokémon was chosen, also do 20 damage to it.": "選ばれた回数ぶん、そのポケモンにも20ダメージ。",
  "This attack's damage isn't affected by Weakness.": "このワザのダメージは弱点の影響を受けない。",
  "If this Pokémon is in the Active Spot and is damaged by an attack from your opponent's Pokémon, the Attacking Pokémon is now Poisoned.": "このポケモンがバトル場で相手のポケモンからワザのダメージを受けたとき、ワザを使ったポケモンをどく状態にする。",
  "If this Pokémon has at least 3 extra {W} Energy attached, this attack also does 50 damage to 2 of your opponent's Benched Pokémon.": "このポケモンに水エネルギーがあと3個多くついているなら、相手のベンチポケモン2匹にも50ダメージ。",
  "During your opponent's next turn, this Pokémon takes  damage from attacks and has no Weakness.": "相手の次の番、このポケモンが受けるワザのダメージが減り、弱点もなくなる。",
  "If the amount of Energy attached to both Active Pokémon is 5 or more, this attack does 60 more damage.": "お互いのバトルポケモンについているエネルギーが合計5個以上なら、60ダメージ追加。",
  "Each of your Pokémon that has any Energy attached recovers from all Special Conditions and can't be affected by any Special Conditions.": "エネルギーがついている自分のポケモン全員は、特殊状態がすべて回復し、特殊状態にならない。",
  "Discard 2 random Energy from among the Energy attached to all Pokémon (both yours and your opponent's).": "お互いの場のポケモンについているエネルギーの中からランダムに2個トラッシュ。",
  "This attack also does 30 damage to each of your opponent's Benched Pokémon that has damage on it.": "ダメージがのっている相手のベンチポケモン全員にも30ダメージ。",
  "Take 3 {P} Energy from your Energy Zone and attach it to your {P} Pokémon in any way you like.": "自分のエネルギーゾーンから超エネルギーを3個出し、自分の超ポケモンに好きなようにつける。",
  "When this Pokémon is first damaged by an attack after coming into play, prevent that damage.": "このポケモンが場に出てから最初に受けるワザのダメージを防ぐ。",
  "Until this Pokémon leaves the Active Spot, this Pokémon's Heat-Up Crunch attack does +30 damage.": "このポケモンがバトル場を離れるまで、このポケモンの「Heat-Up Crunch」のダメージを+30。",
  "This attack is used twice in a row.": "このワザは2回連続で使う。",
  "The second attack does 40 damage.": "2回目のワザは40ダメージ。",
  "(If the first attack Knocks Out your opponent's Active Pokémon, the second attack is used after your opponent chooses a new Active Pokémon.)": "(1回目のワザで相手のバトルポケモンがきぜつしたら、相手が新しいバトルポケモンを出した後に2回目のワザを使う。)",
  "Choose a spot from among your opponent's Active Spot and Bench.": "相手のバトル場とベンチから場所を1つ選ぶ。",
  "At the end of your opponent's next turn, do 70 damage to the Pokémon in the spot you chose.": "相手の次の番の終わりに、選んだ場所にいるポケモンに70ダメージ。",
  "This Pokémon takes –30 damage from attacks.": "このポケモンが受けるワザのダメージを−30。",
  "If you have 4 or more Lightning Energy in play, this attack does 70 more damage.": "自分の場に雷エネルギーが4個以上あるなら、70ダメージ追加。",
  "Discard all Water Energy from this Pokémon.": "このポケモンから水エネルギーをすべてトラッシュ。",
  "1 of your opponent's Pokémon is chosen at random for each Metal Energy attached to this Pokémon.": "このポケモンについている鋼エネルギーの数ぶん、相手のポケモン1匹をランダムに選ぶ。",
  "If this Pokémon is in the Active Spot, once during your turn, you may switch in 1 of your opponent's Benched Basic Pokémon to the Active Spot.": "自分の番に1回、このポケモンがバトル場にいるなら、相手のベンチのたねポケモン1匹をバトル場に出させてもよい。",
  "During your opponent’s next turn, attacks used by the Defending Pokémon do −20 damage.": "相手の次の番、このワザを受けたポケモンのワザのダメージを−20。",
  "Heal from this Pokémon the same amount of damage you did to your opponent's Active Pokémon.": "相手のバトルポケモンに与えたダメージぶん、このポケモンのHPを回復。",
  "Put 1 random Nidoran♂ from your deck onto your Bench.": "自分の山札からランダムにニドラン♂を1匹、ベンチに出す。",
  "Choose 1 of your opponent’s Pokémon’s attacks and use it as this attack.": "相手のポケモンのワザを1つ選び、このワザとして使う。",
  "If this Pokémon doesn’t have the necessary Energy to use that attack, this attack does nothing.": "そのワザに必要なエネルギーがこのポケモンについていなければ、このワザは失敗。",
  "This attack does 40 damage for each time your Pokémon used Sweets Relay during this game.": "このゲーム中に自分のポケモンが「Sweets Relay」を使った回数×40ダメージ。",
  "During your opponent's next turn, if this Pokémon is damaged by an attack, do 30 damage to the Attacking Pokémon.": "相手の次の番、このポケモンがワザのダメージを受けたとき、ワザを使ったポケモンに30ダメージ。",
  "If your opponent's Active Pokémon is an Evolution Pokémon, this attack does 40 more damage.": "相手のバトルポケモンが進化ポケモンなら、40ダメージ追加。",
  "Each {G} Energy attached to your {G} Pokémon provides 2 {G} Energy.": "自分の草ポケモンについている草エネルギーは、それぞれ2個ぶんの草エネルギーとしてはたらく。",
  "This effect doesn't stack.": "この効果は重複しない。",
  "As often as you like during your turn, you may move a {W} Energy from 1 of your Benched {W} Pokémon to your Active {W} Pokémon.": "自分の番に何回でも、ベンチの水ポケモンについている水エネルギーを1個、バトル場の水ポケモンに付け替えてもよい。",
  "If your opponent's Active Pokémon has a Pokémon Tool attached, this attack does 30 more damage.": "相手のバトルポケモンにポケモンのどうぐがついているなら、30ダメージ追加。",
  "You can use this attack only if you have Uxie and Azelf on your Bench.": "自分のベンチにユクシーとアグノムがいなければ、このワザは使えない。",
  "If this Pokémon has any Energy attached, it has no Retreat Cost.": "このポケモンにエネルギーがついているなら、にげるコストは0になる。",
  "Discard the top 3 cards of your deck.": "自分の山札を上から3枚トラッシュ。",
  "Attacks used by your {F} Pokémon do +20 damage to your opponent's Active Pokémon.": "自分の闘ポケモンが使うワザの、相手のバトルポケモンへのダメージを+20。",
  "You must discard a card from your hand in order to use this Ability.": "この特性を使うには、自分の手札を1枚トラッシュする。",
  "Before doing damage, discard all Pokémon Tools from your opponent's Active Pokémon.": "ダメージを与える前に、相手のバトルポケモンについているポケモンのどうぐをすべてトラッシュ。",
  "If you have Arceus or Arceus ex in play, attacks used by this Pokémon do +30 damage to your opponent's Active Pokémon.": "自分の場にアルセウスかアルセウスexがいるなら、このポケモンが使うワザの相手のバトルポケモンへのダメージを+30。",
  "If you have Arceus or Arceus ex in play, this Pokémon has no Retreat Cost.": "自分の場にアルセウスかアルセウスexがいるなら、このポケモンのにげるコストは0になる。",
  "Look at the top card of that player's deck.": "そのプレイヤーの山札を上から1枚見る。",
  "As long as this Pokémon is on your Bench, your Active Basic Pokémon's Retreat Cost is 1 less.": "このポケモンがベンチにいるかぎり、自分のバトル場のたねポケモンのにげるコストを1減らす。",
  "Put 1 random Weedle from your deck onto your Bench.": "自分の山札からランダムにビードルを1匹、ベンチに出す。",
  "1 of your opponent's Pokémon is chosen at random.": "相手のポケモン1匹をランダムに選ぶ。",
  "Your Active Dondozo has no Retreat Cost.": "自分のバトル場のヘイラッシャのにげるコストは0になる。",
  "Take a {L} Energy from your Energy Zone and attach it to 1 of your Benched  Pokémon.": "自分のエネルギーゾーンから雷エネルギーを1個出し、ベンチポケモン1匹につける。",
  "Switch this Pokémon with 1 of your Benched {L} Pokémon.": "このポケモンをベンチの雷ポケモン1匹と入れ替える。",
  "Each of your Pokémon that has any {P} Energy attached recovers from all Special Conditions and can't be affected by any Special Conditions.": "超エネルギーがついている自分のポケモン全員は、特殊状態がすべて回復し、特殊状態にならない。",
  "This attack does 20 damage to 1 of your opponent's Pokémon for each Energy attached to that Pokémon.": "相手のポケモン1匹に、そのポケモンについているエネルギーの数×20ダメージ。",
  "If your opponent's Active Pokémon has an Ability, this attack does 40 more damage.": "相手のバトルポケモンが特性を持っているなら、40ダメージ追加。",
  "If any of your Benched Pokémon have damage on them, this attack does 50 more damage.": "自分のベンチポケモンにダメージがのっているなら、50ダメージ追加。",
  "Discard a random Pokémon Tool card from your opponent's hand.": "相手の手札からランダムにポケモンのどうぐを1枚トラッシュ。",
  "Your opponent's Active Pokémon takes +10 damage from being Poisoned.": "相手のバトルポケモンが受けるどくのダメージを+10。",
  "This attack does 20 damage for each Energy attached to all of your opponent's Pokémon.": "相手の場のポケモン全員についているエネルギーの数×20ダメージ。",
  "This attack does 30 more damage for each Evolution Pokémon on your Bench.": "自分のベンチの進化ポケモンの数×30ダメージ追加。",
  "This attack also does 10 damage to each of your Benched Pokémon.": "自分のベンチポケモン全員にも10ダメージ。",
  "If the Defending Pokémon is a Basic Pokémon, it can't attack during your opponent's next turn.": "このワザを受けたポケモンがたねポケモンなら、相手の次の番、そのポケモンはワザが使えない。",
  "If this Pokémon has no damage on it, this attack does 40 more damage.": "このポケモンにダメージがのっていないなら、40ダメージ追加。",
  "You may discard any number of your Benched {W} Pokémon.": "自分のベンチの水ポケモンを好きな数トラッシュしてもよい。",
  "This attack does 40 more damage for each Benched Pokémon you discarded in this way.": "この方法でトラッシュしたベンチポケモンの数×40ダメージ追加。",
  "If the Defending Pokémon tries to use an attack, your opponent flips a coin.": "このワザを受けたポケモンがワザを使うとき、相手はコインを1回投げる。",
  "This Ability works if you have any Unown in play with an Ability other than .": "この特性は、これ以外の特性を持つアンノーンが自分の場にいるならはたらく。",
  "If this Pokémon was damaged by an attack during your opponent's last turn while it was in the Active Spot, this attack does 50 more damage.": "前の相手の番に、このポケモンがバトル場でワザのダメージを受けていたなら、50ダメージ追加。",
  "If this Pokémon moved from your Bench to the Active Spot this turn, this attack does 50 more damage.": "この番、このポケモンがベンチからバトル場に出ていたなら、50ダメージ追加。",
  "During your opponent's next turn, attacks used by the Defending Pokémon cost 1 {C} more.": "相手の次の番、このワザを受けたポケモンのワザは、必要なエネルギーが1個多くなる。",
  "This Pokémon can't be Asleep.": "このポケモンはねむり状態にならない。",
  "Change the type of a random Energy attached to your opponent's Active Pokémon to 1 of the following at random: {G}, {R}, {W}, {L}, {P}, {F}, {D}, or {M}.": "相手のバトルポケモンについているエネルギーをランダムに1個選び、そのタイプを草・炎・水・雷・超・闘・悪・鋼の中からランダムに変える。",
  "Put 1 random Poliwag from your deck onto your Bench.": "自分の山札からランダムにニョロモを1匹、ベンチに出す。",
  "If Latios is on your Bench, this attack does 20 more damage.": "自分のベンチにラティオスがいるなら、20ダメージ追加。",
  "This attack does damage to your opponent's Active Pokémon equal to the damage this Pokémon has on it.": "このポケモンにのっているダメージと同じだけ、相手のバトルポケモンにダメージ。",
  "During your opponent's next turn, prevent all damage done to this Pokémon by attacks if that damage is 40 or less.": "相手の次の番、このポケモンが受けるワザのダメージが40以下なら、そのダメージを受けない。",
  "Each of your {G} Pokémon gets +20 HP.": "自分の草ポケモン全員の最大HPを+20。",
  "Put a random card from your deck that evolves from this Pokémon onto this Pokémon to evolve it.": "自分の山札からランダムに、このポケモンから進化するカードをこのポケモンにのせて進化させる。",
  "If you have exactly 1, 3, or 5 cards in your hand, this attack does 60 more damage.": "自分の手札がちょうど1枚・3枚・5枚のいずれかなら、60ダメージ追加。",
  "If this Pokémon is in the Active Spot and is damaged by an attack from your opponent's Pokémon, take a {W} Energy from your Energy Zone and attach it to 1 of your Benched Pokémon.": "このポケモンがバトル場で相手のポケモンからワザのダメージを受けたとき、自分のエネルギーゾーンから水エネルギーを1個出し、ベンチポケモン1匹につける。",
  "If this Pokémon has full HP, it takes −40 damage from attacks from your opponent's Pokémon.": "このポケモンのHPが満タンなら、相手のポケモンから受けるワザのダメージを−40。",
  "Discard 2 cards from your hand.": "自分の手札を2枚トラッシュ。",
  "If you can't discard 2 cards, this attack does nothing.": "2枚トラッシュできなければ、このワザは失敗。",
  "This attack does 40 more damage for each of your opponent's Pokémon in play that has an Ability.": "特性を持つ相手の場のポケモンの数×40ダメージ追加。",
  "Attacks used by your {P} Pokémon and {M} Pokémon do +30 damage to your opponent's Active Pokémon.": "自分の超ポケモンと鋼ポケモンが使うワザの、相手のバトルポケモンへのダメージを+30。",
  "If your opponent's Active Pokémon is a Basic Pokémon, this attack does 70 more damage.": "相手のバトルポケモンがたねポケモンなら、70ダメージ追加。",
  "Your opponent's Active Pokémon's Retreat Cost is 1 more.": "相手のバトルポケモンのにげるコストを1増やす。",
  "If Quick-Grow Extract is in your discard pile, this attack does 30 more damage.": "自分のトラッシュに「すくすくエキス」があるなら、30ダメージ追加。",
  "This Pokémon gets +30 HP for each {P} Energy attached to it.": "このポケモンについている超エネルギーの数×30、最大HPを増やす。",
  "This attack's damage is reduced by the amount of damage this Pokémon has on it.": "このワザのダメージは、このポケモンにのっているダメージぶん減る。",
  "If your opponent has gotten exactly 1 points, this attack does 40 more damage.": "相手の獲得ポイントがちょうど1なら、40ダメージ追加。",
  "During your next turn, attacks used by your Pokémon do +20 damage to your opponent's Active Pokémon.": "次の自分の番、自分のポケモンが使うワザの相手のバトルポケモンへのダメージを+20。",
  "Discard Water2 {W} Energy from this Pokémon.": "このポケモンから水エネルギーを2個トラッシュ。",
  "If Plusle is on your Bench, this attack also does 10 damage to each of your opponent's Benched Pokémon.": "自分のベンチにプラスルがいるなら、相手のベンチポケモン全員にも10ダメージ。",
  "At the beginning of your turn, if this Pokémon is in the Active Spot, put a random {P} Pokémon from your deck into your hand.": "自分の番のはじめに、このポケモンがバトル場にいるなら、山札からランダムに超ポケモンを1枚手札に加える。",
  "If you have fewer Pokémon in play than your opponent, this attack does 80 more damage.": "自分の場のポケモンが相手より少ないなら、80ダメージ追加。",
  "If you have another Falinks in play, this Pokémon's attacks do +20 damage to your opponent's Active Pokémon, and this Pokémon takes −20 damage from attacks from your opponent's Pokémon.": "自分の場に別のタイレーツがいるなら、このポケモンのワザの相手バトルポケモンへのダメージを+20し、このポケモンが相手のポケモンから受けるワザのダメージを−20。",
  "Basic Pokémon in play (both yours and your opponent's) have no Abilities.": "お互いの場のたねポケモンの特性はなくなる。",
  "Discard a Lightning Energy from this Pokémon.": "このポケモンから雷エネルギーを1個トラッシュ。",
  "Take a Metal Energy from your Energy Zone and attach it to 1 of your Benched Pokémon.": "自分のエネルギーゾーンから鋼エネルギーを1個出し、ベンチポケモン1匹につける。",
  "This Pokémon takes -10 damage from attacks.": "このポケモンが受けるワザのダメージを−10。",
  "During your opponent's next turn, this Pokémon takes -20 damage from attacks.": "相手の次の番、このポケモンが受けるワザのダメージを−20。",
  "Switch out your opponent’s Active Pokémon to the Bench.": "相手のバトルポケモンをベンチと入れ替える。",
  "This Pokémon takes -20 damage from attacks.": "このポケモンが受けるワザのダメージを−20。",
  "Whenever you attach a {P} Energy from your Energy Zone to this Pokémon, heal 20 damage from this Pokémon.": "自分のエネルギーゾーンから超エネルギーをこのポケモンにつけるたび、このポケモンのHPを20回復。",
  "This Pokémon takes −30 damage from attacks from {F} Pokémon.": "闘ポケモンから受けるワザのダメージを−30。",
  "Discard the top 5 cards of each player's deck.": "お互いの山札を上から5枚ずつトラッシュ。",
  "Put 1 random Koffing from your deck onto your Bench.": "自分の山札からランダムにドガースを1匹、ベンチに出す。",
  "If your opponent’s Active Pokémon is a Pokémon {ex}, this attack does 80 more damage.": "相手のバトルポケモンがポケモンexなら、80ダメージ追加。",
  "Shuffle your hand into your deck.": "自分の手札をすべて山札に戻して切る。",
  "Draw a card for each card in your opponent's hand.": "相手の手札の枚数ぶん、自分の山札を引く。",
  "Prevent all effects of attacks used by your opponent's Pokémon done to this Pokémon.": "このポケモンは、相手のポケモンが使うワザの効果を受けない。",
  "If your opponent's Active Pokémon is a {F} Pokémon, this attack does 30 more damage.": "相手のバトルポケモンが闘ポケモンなら、30ダメージ追加。",
  "As often as you like during your turn, you may choose 1 of your Pokémon that has damage on it, and move all of its damage to this Pokémon.": "自分の番に何回でも、ダメージがのっている自分のポケモン1匹を選び、そのダメージをすべてこのポケモンに移し替えてもよい。",
  "Take a {P} Energy from your Energy Zone and attach it to Mesprit or Azelf.": "自分のエネルギーゾーンから超エネルギーを1個出し、エムリットかアグノムにつける。",
  "If your opponent's Pokémon is Knocked Out by damage from this attack, this Pokémon also does 50 damage to itself.": "このワザのダメージで相手のポケモンがきぜつしたなら、このポケモン自身にも50ダメージ。",
  "Change the type of the next Energy that will be generated for your opponent to 1 of the following at random: {G}, {R}, {W}, {L}, {P}, {F}, {D}, or {M}.": "相手のエネルギーゾーンに次に出るエネルギーのタイプを、草・炎・水・雷・超・闘・悪・鋼の中からランダムに変える。",
  "If you have Arceus or Arceus ex in play, attacks used by this Pokémon cost 1 less {C} Energy.": "自分の場にアルセウスかアルセウスexがいるなら、このポケモンが使うワザの必要エネルギーが1個少なくなる。",
  "If your opponent's Active Pokémon is a Pokémon {ex}, this attack does 30 more damage.": "相手のバトルポケモンがポケモンexなら、30ダメージ追加。",
  "Once during your turn, if you have Arceus or Arceus ex in play, you may do 30 damage to your opponent's Active Pokémon.": "自分の番に1回、自分の場にアルセウスかアルセウスexがいるなら、相手のバトルポケモンに30ダメージを与えてもよい。",
  "If your opponent's Active Pokémon is a {M} Pokémon, this attack does 30 more damage.": "相手のバトルポケモンが鋼ポケモンなら、30ダメージ追加。",
  "Discard 2 random Energy from this Pokémon.": "このポケモンからエネルギーをランダムに2個トラッシュ。",
  "This attack also does 20 damage to each of your opponent's Benched Pokémon that has any Energy attached.": "エネルギーがついている相手のベンチポケモン全員にも20ダメージ。",
  "During your first turn, this Pokémon has no Retreat Cost.": "最初の自分の番、このポケモンのにげるコストは0になる。",
  "If this Pokémon moved from your Bench to the Active Spot this turn, this attack does 60 more damage.": "この番、このポケモンがベンチからバトル場に出ていたなら、60ダメージ追加。",
  "During your opponent's next turn, if this Pokémon is damaged by an attack, do 40 damage to the Attacking Pokémon.": "相手の次の番、このポケモンがワザのダメージを受けたとき、ワザを使ったポケモンに40ダメージ。",
  "Put 1 random Wishiwashi or Wishiwashi ex from your deck onto your Bench.": "自分の山札からランダムにヨワシかヨワシexを1匹、ベンチに出す。",
  "If your opponent's Active Pokémon is a Basic Pokémon, this attack does 60 more damage.": "相手のバトルポケモンがたねポケモンなら、60ダメージ追加。",
  "If this Pokémon would be Knocked Out by damage from an attack, flip a coin.": "このポケモンがワザのダメージできぜつするとき、コインを1回投げる。",
  "If your opponent's Active Pokémon has more remaining HP than this Pokémon, this attack does 50 more damage.": "相手のバトルポケモンの残りHPがこのポケモンより多いなら、50ダメージ追加。",
  "Discard a random Item card from your opponent's hand.": "相手の手札からランダムにグッズを1枚トラッシュ。",
  "If your opponent's Active Pokémon is affected by a Special Condition, this attack does 60 more damage.": "相手のバトルポケモンが特殊状態なら、60ダメージ追加。",
  "During your opponent's next turn, this Pokémon takes +30 damage from attacks.": "相手の次の番、このポケモンが受けるワザのダメージを+30。",
  "If your opponent's Active Pokémon is a {D} Pokémon, this attack does 30 more damage.": "相手のバトルポケモンが悪ポケモンなら、30ダメージ追加。",
  "During your opponent's next turn, attacks used by the Defending Pokémon cost 1 {C} more, and its Retreat Cost is 1 {C} more.": "相手の次の番、このワザを受けたポケモンのワザの必要エネルギーと、にげるコストが1個ずつ多くなる。",
  "Pokémon (both yours and your opponent's) can't be healed.": "お互いのポケモンはHPを回復できない。",
  "If Passimian is on your Bench, this attack does 40 more damage.": "自分のベンチにナゲツケサルがいるなら、40ダメージ追加。",
  "Your opponent reveals that card and shuffles it into their deck.": "相手はそのカードを公開し、山札に戻して切る。",
  "Discard all Energy attached to this Pokémon.": "このポケモンについているエネルギーをすべてトラッシュ。",
  "Discard all Pokémon Tools from your opponent's Active Pokémon.": "相手のバトルポケモンについているポケモンのどうぐをすべてトラッシュ。",
  "This attack does 40 more damage for each Energy in your opponent's Active Pokémon's Retreat Cost.": "相手のバトルポケモンのにげるコストの数×40ダメージ追加。",
  "Your Active Pokémon has no Retreat Cost.": "自分のバトルポケモンのにげるコストは0になる。",
  "If this Pokémon has a Pokémon Tool attached, attacks used by this Pokémon cost 1 less {G} Energy.": "このポケモンにポケモンのどうぐがついているなら、このポケモンのワザに必要な草エネルギーが1個少なくなる。",
  "1 other Pokémon (either yours or your opponent's) is chosen at random 3 times.": "このポケモン以外のお互いのポケモンから、ランダムに3回選ぶ。",
  "As long as this Pokémon is on your Bench, attacks used by your Pokémon that evolve from Poliwhirl do +40 damage to your opponent's Active Pokémon.": "このポケモンがベンチにいるかぎり、ニョロゾから進化した自分のポケモンのワザの相手バトルポケモンへのダメージを+40。",
  "Move all Energy from this Pokémon to 1 of your Benched Pokémon.": "このポケモンについているエネルギーをすべて、ベンチポケモン1匹に付け替える。",
  "All of your Pokémon take −10 damage from attacks from your opponent's Pokémon.": "自分のポケモン全員が相手のポケモンから受けるワザのダメージを−10。",
  "Attacks used by your Pokémon do +10 damage to your opponent's Active Pokémon.": "自分のポケモンが使うワザの、相手のバトルポケモンへのダメージを+10。",
  "Both Active Pokémon are now Asleep.": "お互いのバトルポケモンをねむり状態にする。",
  "This attack also does 20 damage to each of your Benched Pokémon.": "自分のベンチポケモン全員にも20ダメージ。",
  "If your opponent's Active Pokémon is a {G} Pokémon, this attack does 40 more damage.": "相手のバトルポケモンが草ポケモンなら、40ダメージ追加。",
  "Whenever you attach an Energy from your Energy Zone to this Pokémon, put a random card from your deck that evolves from this Pokémon onto this Pokémon to evolve it.": "自分のエネルギーゾーンからこのポケモンにエネルギーをつけるたび、山札からランダムにこのポケモンから進化するカードをのせて進化させる。",
  "Draw cards until you have the same number of cards in your hand as your opponent.": "自分の手札が相手と同じ枚数になるように、山札を引く。",
  "If your opponent's Active Pokémon is an evolved Pokémon, devolve it by putting the highest Stage Evolution card on it into your opponent's hand.": "相手のバトルポケモンが進化ポケモンなら、いちばん上の進化カードを相手の手札に戻して退化させる。",
  "Discard up to 2 Pokémon Tool cards from your hand.": "自分の手札からポケモンのどうぐを2枚まで選んでトラッシュ。",
  "This attack does 50 damage for each card you discarded in this way.": "この方法でトラッシュしたカードの数×50ダメージ。",
  "If this Pokémon has damage on it, this attack can be used for 1 {L} Energy.": "このポケモンにダメージがのっているなら、このワザは雷エネルギー1個で使える。",
  "At the end of your opponent's next turn, do 90 damage to the Defending Pokémon.": "相手の次の番の終わりに、このワザを受けたポケモンに90ダメージ。",
  "Once during your turn, when you put this Pokémon from your hand onto your Bench, you may have your opponent reveal their hand.": "自分の番に1回、手札からこのポケモンをベンチに出したとき、相手の手札を見てもよい。",
  "Discard the top card of your deck.": "自分の山札を上から1枚トラッシュ。",
  "If that card is a {F} Pokémon, this attack does 60 more damage.": "そのカードが闘ポケモンなら、60ダメージ追加。",
  "If your opponent's Active Pokémon is Zangoose, this attack does 40 more damage.": "相手のバトルポケモンがザングースなら、40ダメージ追加。",
  "If your opponent's Pokémon is Knocked Out by damage from this Pokémon's attacks, during your opponent's next turn, prevent all damage from—and effects of—attacks done to this Pokémon.": "このポケモンのワザのダメージで相手のポケモンがきぜつしたなら、相手の次の番、このポケモンはワザのダメージや効果を受けない。",
  "If this Pokémon has 2 or more different types of Energy attached, this attack does 60 more damage.": "このポケモンに2種類以上のタイプのエネルギーがついているなら、60ダメージ追加。",
  "Until this Pokémon leaves the Active Spot, this Pokémon's Rolling Frenzy attack does +30 damage.": "このポケモンがバトル場を離れるまで、このポケモンの「Rolling Frenzy」のダメージを+30。",
  "Choose either Poisoned or Confused.": "どくかこんらんのどちらかを選ぶ。",
  "Your opponent's Active Pokémon is now affected by that Special Condition.": "相手のバトルポケモンをその特殊状態にする。",
  "Heal 30 damage from each of your Benched Basic Pokémon.": "自分のベンチのたねポケモン全員のHPを30回復。",
  "During your opponent's next turn, if this Pokémon is damaged by an attack, do 20 damage to the Attacking Pokémon.": "相手の次の番、このポケモンがワザのダメージを受けたとき、ワザを使ったポケモンに20ダメージ。",
  "If you have exactly 2, 4, or 6 cards in your hand, this attack does 30 more damage.": "自分の手札がちょうど2枚・4枚・6枚のいずれかなら、30ダメージ追加。",
  "Prevent all damage done to this Pokémon by attacks from Basic Pokémon during your opponent's next turn.": "相手の次の番、このポケモンはたねポケモンからワザのダメージを受けない。",
  "1 of your opponent's Benched Pokémon is chosen at random.": "相手のベンチポケモン1匹をランダムに選ぶ。",
  "Discard a {L} Energy from your opponent's Active Pokémon.": "相手のバトルポケモンから雷エネルギーを1個トラッシュ。",
  "When this Pokémon is Knocked Out, flip a coin.": "このポケモンがきぜつしたとき、コインを1回投げる。",
  "During your opponent's next turn, if they attach Energy from their Energy Zone to the Defending Pokémon, that Pokémon will be Asleep.": "相手の次の番、相手がエネルギーゾーンからこのワザを受けたポケモンにエネルギーをつけたら、そのポケモンはねむり状態になる。",
  "Reveal the top 3 cards of your deck.": "自分の山札を上から3枚公開する。",
  "This attack does 60 damage for each Pokémon with a Retreat Cost of 3 or more you find there.": "その中のにげるコストが3以上のポケモンの数×60ダメージ。",
  "Shuffle the revealed cards back into your deck.": "公開したカードを山札に戻して切る。",
  "If this Pokémon's remaining HP is 30 or less, this attack does 60 more damage.": "このポケモンの残りHPが30以下なら、60ダメージ追加。",
  "If your opponent's Active Pokémon is a {G} Pokémon, this attack does 50 more damage.": "相手のバトルポケモンが草ポケモンなら、50ダメージ追加。",
  "This attack's damage isn't affected by any effects on your opponent's Active Pokémon.": "このワザのダメージは、相手のバトルポケモンにかかっている効果の影響を受けない。",
  "If Durant is on your Bench, this attack does 40 more damage.": "自分のベンチにアイアントがいるなら、40ダメージ追加。",
  "Both Active Pokémon are now Confused.": "お互いのバトルポケモンをこんらん状態にする。",
  "If this Pokémon has at least 2 extra {W} Energy attached, this attack also does 50 damage to 1 of your opponent's Benched Pokémon.": "このポケモンに水エネルギーがあと2個多くついているなら、相手のベンチポケモン1匹にも50ダメージ。",
  "As long as this Pokémon is on your Bench, prevent all damage done to this Pokémon by attacks.": "このポケモンがベンチにいるかぎり、このポケモンはワザのダメージを受けない。",
  "If this Pokémon moved from your Bench to the Active Spot this turn, this attack does 40 more damage.": "この番、このポケモンがベンチからバトル場に出ていたなら、40ダメージ追加。",
  "Put a random Supporter card from your deck into your hand.": "自分の山札からランダムにサポートを1枚、手札に加える。",
  "During your opponent's next turn, this Pokémon has no Weakness.": "相手の次の番、このポケモンの弱点はなくなる。",
  "Choose 1 of your Benched Pokémon's attacks, except any Pokémon ex, and use it as this attack.": "ポケモンexをのぞく自分のベンチポケモンのワザを1つ選び、このワザとして使う。",
  "If this Pokémon doesn't have the necessary Energy to use that attack, this attack does nothing.": "そのワザに必要なエネルギーがこのポケモンについていなければ、このワザは失敗。",
  "Put 1 random Starly from your deck onto your Bench.": "自分の山札からランダムにムックルを1匹、ベンチに出す。",
  "This attack does 20 more damage for each Trainer card in your opponent's deck.": "相手の山札のトレーナーズの枚数×20ダメージ追加。",
  "This attack's damage isn't affected by Weakness or by any effects on your opponent's Active Pokémon.": "このワザのダメージは、弱点や相手のバトルポケモンにかかっている効果の影響を受けない。",
  "During your opponent's next turn, if this Pokémon is damaged by an attack, do 80 damage to the Attacking Pokémon.": "相手の次の番、このポケモンがワザのダメージを受けたとき、ワザを使ったポケモンに80ダメージ。",
  "You may shuffle this Pokémon and all attached cards into your deck.": "このポケモンとついているすべてのカードを、山札に戻して切ってもよい。",
  "If a Stadium is in play, this Pokémon has no Retreat Cost.": "場にスタジアムが出ているなら、このポケモンのにげるコストは0になる。",
  "1 other Pokémon (either yours or your opponent's) is chosen at random 1 time.": "このポケモン以外のお互いのポケモンから、ランダムに1回選ぶ。",
  "Do 100 damage to the chosen Pokémon.": "選ばれたポケモンに100ダメージ。",
  "If you have 5 or more {P} Energy in play, this attack does 60 more damage.": "自分の場に超エネルギーが5個以上あるなら、60ダメージ追加。",
  "This attack does 20 more damage for each Supporter card in your discard pile.": "自分のトラッシュのサポートの枚数×20ダメージ追加。",
  "For each remaining point that your opponent needs to win, they draw a card.": "相手が勝利に必要な残りポイントの数ぶん、相手は山札を引く。",
  "Discard a Stadium in play.": "場に出ているスタジアムをトラッシュ。",
  "If this Pokémon has any {P} Energy attached, this attack does 50 more damage.": "このポケモンに超エネルギーがついているなら、50ダメージ追加。",
  "If this Pokémon has more Energy attached than your opponent's Active Pokémon, this attack does 50 more damage.": "このポケモンについているエネルギーが相手のバトルポケモンより多いなら、50ダメージ追加。",
  "During your opponent's next turn, if this Pokémon is in the Active Spot when your opponent's Active Pokémon retreats, this attack does 40 damage to the new Active Pokémon.": "相手の次の番、このポケモンがバトル場にいる状態で相手のバトルポケモンがにげたなら、新しく出てきたバトルポケモンに40ダメージ。",
  "During your opponent's next turn, this Pokémon takes −80 damage from attacks from your opponent's Pokémon ex.": "相手の次の番、このポケモンが相手のポケモンexから受けるワザのダメージを−80。",
  "Use the effect of that card as the effect of this Ability.": "そのカードの効果を、この特性の効果として使う。",
  "If a Stadium is in play, this attack does 40 more damage.": "場にスタジアムが出ているなら、40ダメージ追加。",
  "Put 3 random cards from among Tandemaus and Maushold from your deck onto your Bench.": "自分の山札からランダムにワッカネズミかイッカネズミを合計3枚、ベンチに出す。",
  "Flip a coin for each Tandemaus and Maushold you have in play.": "自分の場のワッカネズミとイッカネズミの数ぶんコインを投げる。",
  "If your opponent's Active Pokémon is a Grass or Metal Pokémon, this attack does 40 more damage.": "相手のバトルポケモンが草か鋼ポケモンなら、40ダメージ追加。",
  "During your opponent's next turn, attacks used by the Defending Pokémon cost {C}{C} more.": "相手の次の番、このワザを受けたポケモンのワザは、必要なエネルギーが2個多くなる。",
  "During this turn, attacks used by your Fire Pokémon do +50 damage to your opponent's Active Pokémon.": "この番、自分の炎ポケモンが使うワザの相手のバトルポケモンへのダメージを+50。",
  "If this Pokémon's remaining HP is 50 or less, attacks used by this Pokémon do +60 damage to your opponent's Active Pokémon.": "このポケモンの残りHPが50以下なら、このポケモンが使うワザの相手のバトルポケモンへのダメージを+60。",
  "If you have no cards in your deck, this attack can be used for 1 Water Energy.": "自分の山札が0枚なら、このワザは水エネルギー1個で使える。",
  "This attack does 20 more damage for each Psychic Pokémon in your discard pile.": "自分のトラッシュの超ポケモンの枚数×20ダメージ追加。",
  "If this Pokémon's remaining HP is 60 or less, this attack does nothing.": "このポケモンの残りHPが60以下なら、このワザは失敗。",
  "If your Pokémon in play have 3 or more different types of Energy attached, this attack does 60 more damage.": "自分の場のポケモンに3種類以上のタイプのエネルギーがついているなら、60ダメージ追加。",
  "If your opponent’s Active Pokémon is a Pokémon {ex}, this attack does 70 more damage.": "相手のバトルポケモンがポケモンexなら、70ダメージ追加。"
};


// 入れ子の断片用の追加対訳
Object.assign(EFFECT_SENTENCE_JA, {
  "Choose a Supporter card you find there and discard it.": "その中からサポートを1枚選んでトラッシュ。",
  "Choose a card you find there and shuffle it into your opponent's deck.": "その中から1枚選び、相手の山札に戻して切る。",
  "Do 20 damage to this Pokémon instead of the usual amount for this Special Condition.": "この特殊状態のダメージは、通常のかわりに20になる。",
  "During your next turn, this Pokémon's Wild Spin attack does +20 damage to each of your opponent's Pokémon.": "次の自分の番、このポケモンの「Wild Spin」の相手のポケモン全員へのダメージを+20。",
  "During your opponent's next turn, that Pokémon can't retreat.": "相手の次の番、そのポケモンはにげられない。",
  "If at least 1 of them is heads, your opponent's Active Pokémon is now Burned.": "1枚でもオモテなら、相手のバトルポケモンをやけど状態にする。",
  "If at least 2 of them are heads, your opponent's Active Pokémon is now Poisoned.": "2枚以上オモテなら、相手のバトルポケモンをどく状態にする。",
  "If both of them are heads, this attack does 70 more damage.": "2枚ともオモテなら、70ダメージ追加。",
  "If both of them are heads, this attack does 80 more damage.": "2枚ともオモテなら、80ダメージ追加。",
  "If both of them are heads, your opponent's Active Pokémon is Knocked Out.": "2枚ともオモテなら、相手のバトルポケモンはきぜつする。",
  "If both of them are tails, this attack does nothing.": "2枚ともウラなら、このワザは失敗。",
  "If this Pokémon has Lucky Mittens attached, flip 4 coins instead.": "このポケモンに「ラッキーミトン」がついているなら、かわりにコインを4回投げる。",
  "Shuffle this Pokémon into your deck.": "このポケモンを山札に戻して切る。",
  "This effect lasts until the Defending Pokémon leaves the Active Spot, and it doesn't stack.": "この効果は、このワザを受けたポケモンがバトル場を離れるまで続き、重複しない。",
  "a card is chosen at random from your opponent's hand.": "相手の手札からランダムに1枚選ぶ。",
  "attacks used by your opponent's Active Pokémon do −20 damage.": "相手のバトルポケモンが使うワザのダメージを−20。",
  "choose either player.": "どちらかのプレイヤーを選ぶ。",
  "discard 1 Fire Energy from this Pokémon in order to use this Ability.": "この特性を使うには、このポケモンから炎エネルギーを1個トラッシュする。",
  "discard 2 random Energy from this Pokémon.": "このポケモンからエネルギーをランダムに2個トラッシュ。",
  "discard a random Energy from that Pokémon.": "そのポケモンからエネルギーをランダムに1個トラッシュ。",
  "discard all Pokémon Tools from your opponent's Active Pokémon.": "相手のバトルポケモンについているポケモンのどうぐをすべてトラッシュ。",
  "discard this Pokémon.": "このポケモンをトラッシュ。",
  "discard your opponent's Active Pokémon.": "相手のバトルポケモンをトラッシュ。",
  "during your opponent's next turn, prevent all damage done to this Pokémon by attacks.": "相手の次の番、このポケモンはワザのダメージを受けない。",
  "during your opponent's next turn, prevent all damage from and effects of attacks done to this Pokémon.": "相手の次の番、このポケモンはワザのダメージや効果を受けない。",
  "during your opponent’s next turn, prevent all damage from—and effects of—attacks done to this Pokémon.": "相手の次の番、このポケモンはワザのダメージや効果を受けない。",
  "have your opponent shuffle their hand into their deck.": "相手は手札をすべて山札に戻して切る。",
  "heal 30 damage from each of your {W} Pokémon.": "自分の水ポケモン全員のHPを30回復。",
  "heal 60 damage from 1 of your Pokémon ex that has any Energy attached.": "エネルギーがついている自分のポケモンex1匹のHPを60回復。",
  "it can evolve during your first turn or the turn you play it.": "このポケモンは最初の番や場に出した番でも進化できる。",
  "look at a random Supporter card from your opponent's hand.": "相手の手札のサポートをランダムに1枚見る。",
  "look at a random card from your opponent's hand and shuffle it into their deck.": "相手の手札をランダムに1枚見て、山札に戻して切る。",
  "look at the top card of your deck.": "自分の山札を上から1枚見る。",
  "make your opponent's Active Pokémon Burned.": "相手のバトルポケモンをやけど状態にする。",
  "make your opponent's Active Pokémon Poisoned.": "相手のバトルポケモンをどく状態にする。",
  "prevent that damage.": "そのダメージを受けない。",
  "put 2 random Pokémon Tool cards from your discard pile into your hand.": "自分のトラッシュからランダムにポケモンのどうぐを2枚、手札に加える。",
  "put a Supporter card from your discard pile into your hand.": "自分のトラッシュからサポートを1枚、手札に加える。",
  "put a random Pokémon Tool card from your deck into your hand.": "自分の山札からランダムにポケモンのどうぐを1枚、手札に加える。",
  "put your opponent's Active Pokémon into their hand.": "相手のバトルポケモンを相手の手札に戻す。",
  "switch in 1 of your opponent's Benched Pokémon to the Active Spot.": "相手のベンチポケモン1匹をバトル場に出させる。",
  "switch out your opponent's Active Basic Pokémon to the Bench.": "相手のバトル場のたねポケモンをベンチと入れ替える。",
  "switch your Active Ultra Beast with 1 of your Benched Ultra Beasts.": "自分のバトル場のウルトラビーストをベンチのウルトラビースト1匹と入れ替える。",
  "switch your Active {W} Pokémon with 1 of your Benched Pokémon.": "自分のバトル場の水ポケモンをベンチポケモン1匹と入れ替える。",
  "take 1 {P} Energy from your Energy Zone and attach it to the {P} Pokémon in the Active Spot.": "自分のエネルギーゾーンから超エネルギーを1個出し、バトル場の超ポケモンにつける。",
  "take a Water Energy from your Energy Zone and attach it to the Water Pokémon in the Active Spot.": "自分のエネルギーゾーンから水エネルギーを1個出し、バトル場の水ポケモンにつける。",
  "take a {P} Energy from your Energy Zone and attach it to the {P} Pokémon in the Active Spot.": "自分のエネルギーゾーンから超エネルギーを1個出し、バトル場の超ポケモンにつける。",
  "take a {R} Energy from your Energy Zone and attach it to your Active {R} Pokémon.": "自分のエネルギーゾーンから炎エネルギーを1個出し、バトル場の炎ポケモンにつける。",
  "the Attacking Pokémon is Knocked Out.": "ワザを使ったポケモンはきぜつする。",
  "the Defending Pokémon can't attack during your opponent's next turn.": "相手の次の番、このワザを受けたポケモンはワザが使えない。",
  "this Pokémon is not Knocked Out, and its remaining HP becomes 10.": "このポケモンはきぜつせず、残りHPが10になる。",
  "this Pokémon takes −100 damage from that attack.": "このポケモンが受けるそのワザのダメージを−100。",
  "whenever your opponent attaches an Energy from their Energy Zone to 1 of their Pokémon, do 20 damage to that Pokémon.": "相手がエネルギーゾーンから相手のポケモンにエネルギーをつけるたび、そのポケモンに20ダメージ。",
  "your opponent can't get any points for it.": "相手はそのきぜつでポイントを獲得できない。",
  "your opponent shuffles their Active Pokémon into their deck.": "相手はバトルポケモンを山札に戻して切る。",
  "your opponent's Active Pokémon's remaining HP is now 10.": "相手のバトルポケモンの残りHPを10にする。"
});

function jaEffectSentence(sentence) {
  const s = sentence.trim();
  if (EFFECT_SENTENCE_JA[s]) return EFFECT_SENTENCE_JA[s];
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
