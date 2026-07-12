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
