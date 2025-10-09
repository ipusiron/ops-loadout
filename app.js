// app.js — Escape Kit Checklist (MVP front-end)
// Vanilla JS + Tailwind + jsPDF
// Save as app.js alongside index.html

(() => {
  // simple in-memory presets (safe items only, dual_use/hazard flagged where appropriate)
  const PRESETS = {
    "embassy": {
      name: "大使館脱出型",
      items: [
        { id: "em_cash", name: "緊急現金（現地通貨+USD）", category: "都市型回避", weight_g: 50, volume_cm3: 20, purpose_short: "短期の現地通貨不足対策", dual_use: false, hazard_flag: false, legality_notes: {US:"許可",JP:"許可"}, sources: [{title:"米国務省 Go Bagガイダンス"}], scores: {survivability:1, signalability:0, exfiltration_support:2, concealability:3, legality_penalty:0} },
        { id: "em_water_tab", name: "浄水タブレット", category: "サバイバル", weight_g: 15, volume_cm3: 6, purpose_short: "少量の飲料水の処理", dual_use: false, hazard_flag: false, legality_notes: {US:"許可",JP:"許可"}, sources: [{title:"AF SERE ハンドブック"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id: "em_whistle", name: "ホイッスル", category: "信号発信", weight_g: 10, volume_cm3: 4, purpose_short: "注意を引く音響信号", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"AF SERE 事例"}], scores:{survivability:1,signalability:2,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id: "em_mirror", name: "シグナルミラー（ポケット型）", category: "信号発信", weight_g:20, volume_cm3:10, purpose_short:"遠距離視覚信号", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"MARSOC SERE 装備リスト"}], scores:{survivability:1,signalability:3,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id: "em_blanket", name: "マイラーサバイバルブランケット", category: "サバイバル", weight_g:120, volume_cm3:40, purpose_short:"体温保持、軽量シェルター補助", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"AF SERE ハンドブック"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id: "em_firstaid", name: "小型救急セット（基本）", category: "医療", weight_g:150, volume_cm3:80, purpose_short:"基本的な創傷処置と包帯", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"赤十字 サバイバルキットガイド"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id: "em_led", name: "ケミカルライト / LED（信号用）", category: "信号発信", weight_g:30, volume_cm3:12, purpose_short:"暗所での信号発信・照明", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"CIA博物館 E&Eキット事例"}], scores:{survivability:1,signalability:2,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id: "em_multitool", name: "小型マルチツール（ハサミ、缶切り、プライヤー）", category: "工具", weight_g:80, volume_cm3:30, purpose_short:"汎用工具作業（非破壊的）", dual_use:true, hazard_flag:false, legality_notes:{US:"航空機内で制限される場合あり",JP:"制限される場合あり"}, sources:[{title:"CIA博物館 E&Eキット マルチツール事例"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:1} },
        { id: "em_compass", name: "小型コンパス（ボタン型）", category: "ナビゲーション", weight_g:20, volume_cm3:8, purpose_short:"基本的な方向確認", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"MARSOC SERE 装備リスト"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} },
        { id: "em_map", name: "現地地図（小型、防水スリーブ）", category: "ナビゲーション", weight_g:40, volume_cm3:20, purpose_short:"現地ルートと安全地点の記載地図", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"米国大使館 PREP ガイド"}], scores:{survivability:1,signalability:0,exfiltration_support:2,concealability:2,legality_penalty:0} },
        { id: "em_contacts", name: "緊急連絡先リスト（ラミネート加工）", category: "書類", weight_g:20, volume_cm3:10, purpose_short:"重要な電話番号と大使館連絡先", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"国務省 Go Bag ガイド"}], scores:{survivability:1,signalability:0,exfiltration_support:2,concealability:3,legality_penalty:0} },
        { id: "em_sim", name: "予備SIM / 現地SIM + 小型アダプター", category: "通信", weight_g:5, volume_cm3:2, purpose_short:"現地モバイル接続のバックアップ", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"大使館 Go Bag ガイダンス（通信）"}], scores:{survivability:1,signalability:0,exfiltration_support:2,concealability:3,legality_penalty:0} },
        { id: "em_powerbank", name: "モバイルバッテリー", category: "その他", weight_g:200, volume_cm3:70, purpose_short:"モバイル機器充電、通信維持", dual_use:false, hazard_flag:true, legality_notes:{US:"航空輸送制限（バッテリー容量）",JP:"航空輸送制限"}, sources:[{title:"Ready.gov キット構築ガイド"}], scores:{survivability:1,signalability:0,exfiltration_support:2,concealability:2,legality_penalty:1} },
        { id: "em_energy_bars", name: "軽量エナジーバー（3〜5本）", category: "サバイバル", weight_g:300, volume_cm3:200, purpose_short:"短期高エネルギー配給", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"Ready.gov 食料・水ガイダンス"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:1,legality_penalty:0} },
        { id: "em_duct_tape", name: "ダクトテープ（小型ロール）", category: "工具", weight_g:60, volume_cm3:40, purpose_short:"修理・応急処置", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"汎用サバイバルキット推奨品"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} },
        { id: "em_paracord", name: "パラコード（3〜5m）", category: "工具", weight_g:70, volume_cm3:30, purpose_short:"シェルター・修理用コード", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"Backpacker SERE ガイダンス"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} },
        { id: "em_sewing_kit", name: "裁縫セット（針、糸）", category: "工具", weight_g:25, volume_cm3:10, purpose_short:"衣服修理と小規模補修", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"大使館 Go Bag 推奨品"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} },
        { id: "em_water_bottle", name: "折りたたみ水筒", category: "サバイバル", weight_g:80, volume_cm3:150, purpose_short:"水の運搬、可能な限り補充", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"Ready.gov 水ガイダンス"}], scores:{survivability:3,signalability:0,exfiltration_support:1,concealability:1,legality_penalty:0} },
        { id: "em_notebook", name: "防水ノート＆ペン", category: "書類", weight_g:40, volume_cm3:20, purpose_short:"メモ、連絡先、短文メッセージ", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"大使館 PREP 個人緊急行動計画"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} },
        { id: "em_waterproof_bags", name: "防水袋（小型ジップロック）", category: "その他", weight_g:10, volume_cm3:5, purpose_short:"書類・電子機器の防湿保護", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"汎用緊急キット推奨品"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} }
      ]
    },
    "sere": {
      name: "SERE航空兵型",
      items: [
        { id:"s_blanket", name:"マイラーサバイバルブランケット", category:"サバイバル", weight_g:120, volume_cm3:40, purpose_short:"保温", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"AF SERE ハンドブック"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"s_mirror", name:"シグナルミラー", category:"信号発信", weight_g:20, volume_cm3:10, purpose_short:"視覚信号", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"AF SERE"}], scores:{survivability:1,signalability:3,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"s_whistle", name:"ホイッスル", category:"信号発信", weight_g:10, volume_cm3:4, purpose_short:"音響信号", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"AF SERE 事例"}], scores:{survivability:1,signalability:2,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"s_water_tab", name:"浄水タブレット", category:"サバイバル", weight_g:15, volume_cm3:6, purpose_short:"少量の飲料水処理", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"AF SERE ハンドブック"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"s_compass", name:"小型コンパス", category:"ナビゲーション", weight_g:20, volume_cm3:8, purpose_short:"基本的な方向確認", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"MARSOC SERE 装備リスト"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} },
        { id:"s_firstaid", name:"小型救急セット", category:"医療", weight_g:150, volume_cm3:80, purpose_short:"基本的な創傷処置", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"SERE 医療キット"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"s_fire_starter", name:"防水マッチ / ファイヤースターター", category:"サバイバル", weight_g:30, volume_cm3:15, purpose_short:"火起こし", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"AF SERE"}], scores:{survivability:3,signalability:1,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id:"s_knife", name:"小型ナイフ", category:"工具", weight_g:60, volume_cm3:20, purpose_short:"汎用作業", dual_use:true, hazard_flag:true, legality_notes:{US:"地域・空港制限の対象",JP:"地域制限の対象"}, sources:[{title:"AF SERE"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:2} },
        { id:"s_paracord", name:"パラコード", category:"工具", weight_g:70, volume_cm3:30, purpose_short:"シェルター・修理用", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"SERE ガイダンス"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} },
        { id:"s_signal_panel", name:"反射パネル / 信号布", category:"信号発信", weight_g:40, volume_cm3:30, purpose_short:"航空機・遠距離発見用大型視覚信号", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"SERE 信号装備事例"}], scores:{survivability:1,signalability:3,exfiltration_support:0,concealability:1,legality_penalty:0} }
      ]
    },
    "urban": {
      name: "都市個人型",
      items: [
        { id:"u_cash", name:"少額緊急現金", category:"都市型回避", weight_g:30, volume_cm3:10, purpose_short:"短期の購入用", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"個人緊急対応計画"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} },
        { id:"u_powerbank", name:"モバイルバッテリー", category:"その他", weight_g:200, volume_cm3:70, purpose_short:"モバイル機器充電", dual_use:false, hazard_flag:true, legality_notes:{US:"航空輸送制限",JP:"航空輸送制限"}, sources:[{title:"Ready.gov"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:1} },
        { id:"u_bandage", name:"小型包帯セット", category:"医療", weight_g:50, volume_cm3:30, purpose_short:"基本的な創傷処置", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"応急処置ガイド"}], scores:{survivability:2,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"u_water_bottle", name:"折りたたみ水筒", category:"サバイバル", weight_g:80, volume_cm3:150, purpose_short:"水の運搬", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"Ready.gov"}], scores:{survivability:3,signalability:0,exfiltration_support:1,concealability:1,legality_penalty:0} },
        { id:"u_mask", name:"マスク（サージカル / N95）", category:"医療", weight_g:10, volume_cm3:8, purpose_short:"混雑・大気汚染環境での呼吸保護", dual_use:false, hazard_flag:false, legality_notes:{US:"許可"}, sources:[{title:"CDC Pack Smart ガイダンス"}], scores:{survivability:1,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"u_sanitizer", name:"小型ハンドサニタイザー", category:"医療", weight_g:30, volume_cm3:30, purpose_short:"衛生管理と感染対策", dual_use:false, hazard_flag:true, legality_notes:{US:"航空輸送アルコール含有量制限"}, sources:[{title:"CDC Pack Smart"}], scores:{survivability:1,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"u_whistle", name:"ホイッスル", category:"信号発信", weight_g:10, volume_cm3:4, purpose_short:"注意を引く", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"個人安全装備"}], scores:{survivability:1,signalability:2,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"u_led", name:"小型LEDライト", category:"信号発信", weight_g:25, volume_cm3:10, purpose_short:"照明", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"緊急キット推奨品"}], scores:{survivability:1,signalability:1,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"u_multitool", name:"小型マルチツール", category:"工具", weight_g:60, volume_cm3:25, purpose_short:"汎用作業", dual_use:true, hazard_flag:false, legality_notes:{US:"航空機内で制限",JP:"制限あり"}, sources:[{title:"EDCガイド"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:1} },
        { id:"u_notebook", name:"小型ノート＆ペン", category:"書類", weight_g:30, volume_cm3:15, purpose_short:"メモ、連絡先記録", dual_use:false, hazard_flag:false, legality_notes:{US:"許可",JP:"許可"}, sources:[{title:"個人準備"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} }
      ]
    },
    "disaster": {
      name: "災害避難型（1人分・1日）",
      items: [
        { id:"d_water", name:"飲料水（ペットボトル 2L）", category:"サバイバル", weight_g:2000, volume_cm3:2000, purpose_short:"1日分の飲料水確保", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"内閣府防災情報"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"d_food", name:"非常食（アルファ米3食分）", category:"サバイバル", weight_g:300, volume_cm3:600, purpose_short:"1日分の食料", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"東京都防災ホームページ"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"d_flashlight", name:"懐中電灯・ヘッドランプ", category:"信号発信", weight_g:100, volume_cm3:150, purpose_short:"停電時の照明", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"消防庁 防災マニュアル"}], scores:{survivability:2,signalability:1,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id:"d_radio", name:"ラジオ（手回し充電式）", category:"通信", weight_g:200, volume_cm3:300, purpose_short:"災害情報の収集", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"総務省 災害時の情報収集"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:1,legality_penalty:0} },
        { id:"d_firstaid", name:"救急セット", category:"医療", weight_g:150, volume_cm3:80, purpose_short:"応急手当用", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"日本赤十字社 備蓄リスト"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id:"d_mask", name:"マスク（不織布マスク10枚）", category:"医療", weight_g:20, volume_cm3:50, purpose_short:"粉塵・感染症対策", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"厚生労働省 感染症対策"}], scores:{survivability:2,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"d_powerbank", name:"モバイルバッテリー", category:"通信", weight_g:200, volume_cm3:70, purpose_short:"携帯電話の充電", dual_use:false, hazard_flag:true, legality_notes:{JP:"航空輸送制限"}, sources:[{title:"東京都防災ホームページ"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} },
        { id:"d_cash", name:"現金（小銭含む10,000円）", category:"その他", weight_g:100, volume_cm3:50, purpose_short:"停電時の買い物", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"内閣府防災情報"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} },
        { id:"d_id_copy", name:"身分証明書のコピー", category:"書類", weight_g:20, volume_cm3:10, purpose_short:"身元確認用", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"東京都防災ホームページ"}], scores:{survivability:1,signalability:0,exfiltration_support:2,concealability:3,legality_penalty:0} },
        { id:"d_medicine", name:"常備薬（持病薬・痛み止め）", category:"医療", weight_g:50, volume_cm3:30, purpose_short:"持病の管理と応急処置", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"日本赤十字社"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"d_towel", name:"タオル（2枚）", category:"その他", weight_g:200, volume_cm3:400, purpose_short:"清拭、保温、止血補助", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"消防庁 防災マニュアル"}], scores:{survivability:2,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"d_tissue", name:"ティッシュペーパー", category:"その他", weight_g:100, volume_cm3:200, purpose_short:"衛生管理", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"内閣府防災情報"}], scores:{survivability:1,signalability:0,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id:"d_wet_tissue", name:"ウェットティッシュ", category:"その他", weight_g:150, volume_cm3:200, purpose_short:"清拭、手指消毒", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"東京都防災ホームページ"}], scores:{survivability:2,signalability:0,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id:"d_whistle", name:"ホイッスル", category:"信号発信", weight_g:10, volume_cm3:4, purpose_short:"救助要請の音響信号", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"消防庁 防災マニュアル"}], scores:{survivability:1,signalability:3,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"d_gloves", name:"軍手（作業用手袋）", category:"工具", weight_g:60, volume_cm3:100, purpose_short:"がれき処理、作業時の手の保護", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"内閣府防災情報"}], scores:{survivability:2,signalability:0,exfiltration_support:0,concealability:2,legality_penalty:0} },
        { id:"d_vinyl_bags", name:"ビニール袋（10枚）", category:"その他", weight_g:50, volume_cm3:100, purpose_short:"荷物の防水、ゴミ袋", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"東京都防災ホームページ"}], scores:{survivability:2,signalability:0,exfiltration_support:0,concealability:3,legality_penalty:0} },
        { id:"d_notebook", name:"筆記用具（ノート・ペン）", category:"書類", weight_g:40, volume_cm3:20, purpose_short:"メモ、伝言、記録", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"消防庁 防災マニュアル"}], scores:{survivability:1,signalability:0,exfiltration_support:1,concealability:3,legality_penalty:0} },
        { id:"d_portable_toilet", name:"携帯トイレ（5回分）", category:"その他", weight_g:200, volume_cm3:300, purpose_short:"トイレが使えない時の衛生対策", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"内閣府防災情報"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"d_blanket", name:"ブランケット（防寒用）", category:"サバイバル", weight_g:300, volume_cm3:400, purpose_short:"体温保持、防寒", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"日本赤十字社"}], scores:{survivability:3,signalability:0,exfiltration_support:0,concealability:1,legality_penalty:0} },
        { id:"d_rope", name:"ロープ（5m）", category:"工具", weight_g:100, volume_cm3:150, purpose_short:"荷物の固定、救助補助", dual_use:false, hazard_flag:false, legality_notes:{JP:"許可"}, sources:[{title:"消防庁 防災マニュアル"}], scores:{survivability:2,signalability:0,exfiltration_support:1,concealability:2,legality_penalty:0} }
      ]
    }
  };

  // Application state
  let state = {
    checklistName: PRESETS.embassy.name,
    scenario: 'urban',
    items: JSON.parse(JSON.stringify(PRESETS.embassy.items)), // deep copy
    viewMode: 'table', // table or card
    selectedItemId: null
  };

  // DOM refs
  const presetSelect = document.getElementById('presetSelect');
  const itemTable = document.getElementById('itemTable');
  const itemDetail = document.getElementById('itemDetail');
  const currentChecklistName = document.getElementById('currentChecklistName');
  const totalWeightEl = document.getElementById('totalWeight');
  const totalVolumeEl = document.getElementById('totalVolume');
  const addItemBtn = document.getElementById('addItemBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const itemForm = document.getElementById('itemForm');
  const f_name = document.getElementById('f_name');
  const f_category = document.getElementById('f_category');
  const f_weight = document.getElementById('f_weight');
  const f_volume = document.getElementById('f_volume');
  const f_purpose = document.getElementById('f_purpose');
  const f_dual = document.getElementById('f_dual');
  const f_hazard = document.getElementById('f_hazard');
  const f_legality = document.getElementById('f_legality');
  const modalCancel = document.getElementById('modalCancel');
  const modalSave = document.getElementById('modalSave');
  const exportJsonBtn = document.getElementById('exportJson');
  const exportCsvBtn = document.getElementById('exportCsv');
  const exportPdfBtn = document.getElementById('exportPdf');
  const exportBtn = document.getElementById('exportBtn');
  const saveBtn = document.getElementById('saveBtn');
  const presetSelectEl = document.getElementById('presetSelect');
  const scenarioSelect = document.getElementById('scenarioSelect');
  const globalSearch = document.getElementById('globalSearch');
  const filterDual = document.getElementById('filterDual');
  const filterHazard = document.getElementById('filterHazard');
  const toggleView = document.getElementById('toggleView');
  const savedList = document.getElementById('savedList');
  const newChecklistBtn = document.getElementById('newChecklist');

  // Utility
  function uid(prefix='id') { return prefix + '-' + Math.random().toString(36).slice(2,9); }

  // Multiple checklist management
  let currentChecklistId = null;

  function getAllChecklists() {
    return JSON.parse(localStorage.getItem('ekc_checklists') || '[]');
  }

  function saveAllChecklists(checklists) {
    localStorage.setItem('ekc_checklists', JSON.stringify(checklists));
  }

  function saveCurrentChecklist() {
    const checklists = getAllChecklists();
    const payload = {
      id: currentChecklistId || uid('checklist'),
      name: state.checklistName,
      scenario: state.scenario,
      items: state.items,
      createdAt: currentChecklistId ? (checklists.find(c => c.id === currentChecklistId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!currentChecklistId) {
      currentChecklistId = payload.id;
      checklists.push(payload);
    } else {
      const index = checklists.findIndex(c => c.id === currentChecklistId);
      if (index !== -1) {
        checklists[index] = payload;
      } else {
        checklists.push(payload);
      }
    }

    saveAllChecklists(checklists);
    renderSavedList();
  }

  function loadChecklist(id) {
    const checklists = getAllChecklists();
    const checklist = checklists.find(c => c.id === id);
    if (checklist) {
      currentChecklistId = checklist.id;
      state.checklistName = checklist.name;
      state.scenario = checklist.scenario;
      state.items = JSON.parse(JSON.stringify(checklist.items));
      renderAll();
    }
  }

  function deleteChecklist(id) {
    const checklists = getAllChecklists();
    const filtered = checklists.filter(c => c.id !== id);
    saveAllChecklists(filtered);
    if (currentChecklistId === id) {
      createNewChecklist();
    }
    renderSavedList();
  }

  function createNewChecklist() {
    currentChecklistId = null;
    state.checklistName = '新規チェックリスト';
    state.scenario = 'urban';
    state.items = [];
    renderAll();
  }

  function loadFromPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    state.checklistName = p.name;
    state.items = JSON.parse(JSON.stringify(p.items));
    currentChecklistId = null; // Treat as new checklist
    renderAll();
  }

  function renderSavedList() {
    const checklists = getAllChecklists();
    const savedListEmpty = document.getElementById('savedListEmpty');

    if (checklists.length === 0) {
      savedList.classList.add('hidden');
      savedListEmpty.classList.remove('hidden');
    } else {
      savedList.classList.remove('hidden');
      savedListEmpty.classList.add('hidden');
      savedList.innerHTML = checklists.map(c => {
        const isActive = c.id === currentChecklistId;
        return `<li class="filter-item ${isActive ? 'bg-blue-50' : ''}">
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate font-medium">${escapeHtml(c.name)}</div>
            <div class="text-xs text-gray-500">${new Date(c.updatedAt).toLocaleDateString('ja-JP')}</div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button class="text-xs text-blue-600 hover:text-blue-800" data-id="${c.id}" data-action="load">読込</button>
            <button class="text-xs text-red-600 hover:text-red-800" data-id="${c.id}" data-action="delete">削除</button>
          </div>
        </li>`;
      }).join('');

      savedList.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const action = btn.dataset.action;
          if (action === 'load') {
            loadChecklist(id);
          } else if (action === 'delete') {
            if (confirm('このチェックリストを削除しますか？')) {
              deleteChecklist(id);
            }
          }
        });
      });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
  }

  // Render functions
  function renderAll() {
    currentChecklistName.textContent = state.checklistName;
    renderList();
    renderDetail(state.selectedItemId);
    renderTotals();
  }

  function filteredItems() {
    const q = globalSearch.value.trim().toLowerCase();
    return state.items.filter(it=>{
      if (filterDual.checked && !it.dual_use) return false;
      if (filterHazard.checked && !it.hazard_flag) return false;
      if (!q) return true;
      return (it.name && it.name.toLowerCase().includes(q)) || (it.purpose_short && it.purpose_short.toLowerCase().includes(q));
    });
  }

  function renderList() {
    const list = filteredItems();
    const totalItems = state.items.length;
    const itemCountDisplay = document.getElementById('itemCountDisplay');

    // Update item count display
    if (itemCountDisplay) {
      if (list.length < totalItems) {
        itemCountDisplay.textContent = `${totalItems}件中 ${list.length}件を表示`;
        itemCountDisplay.classList.remove('hidden');
      } else {
        itemCountDisplay.textContent = `${totalItems}件のアイテム`;
        itemCountDisplay.classList.remove('hidden');
      }
    }

    itemTable.innerHTML = '';
    if (list.length === 0) {
      itemTable.innerHTML = `<div class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-sm text-gray-500">${totalItems === 0 ? 'アイテムがありません。「アイテム追加」を使うか、プリセットを読み込んでください。' : 'フィルター条件に一致するアイテムがありません。'}</p>
      </div>`;
      return;
    }
    list.forEach(it => {
      const row = document.createElement('div');
      row.className = 'item-card';
      row.innerHTML = `
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <input type="checkbox" data-id="${it.id}" ${it.checked ? 'checked' : ''} class="item-check mt-1 cursor-pointer focus:ring-2 focus:ring-blue-500"/>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm">${escapeHtml(it.name)}</div>
            <div class="text-xs text-gray-500 mt-0.5">${escapeHtml(it.category)} • ${it.weight_g ?? 0} g</div>
            <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">${it.dual_use ? '<span class="badge badge-warning"><svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>両用</span>' : ''} ${it.hazard_flag ? '<span class="badge badge-danger"><svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>危険</span>' : ''}</div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <button data-id="${it.id}" class="detailBtn btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">詳細</button>
          <button data-id="${it.id}" class="editBtn btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">編集</button>
          <button data-id="${it.id}" class="delBtn btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">削除</button>
        </div>
      `;
      itemTable.appendChild(row);
    });

    // attach events
    itemTable.querySelectorAll('.item-check').forEach(cb=>{
      cb.addEventListener('change', e=>{
        const id = e.target.dataset.id;
        const it = state.items.find(x=>x.id===id);
        if (it) { it.checked = e.target.checked; renderTotals(); }
      });
    });
    itemTable.querySelectorAll('.detailBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        state.selectedItemId = id;
        renderDetail(id);
      });
    });
    itemTable.querySelectorAll('.editBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        openItemModal('edit', state.items.find(x=>x.id===id));
      });
    });
    itemTable.querySelectorAll('.delBtn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        if (confirm('このアイテムを削除しますか？')) {
          state.items = state.items.filter(x=>x.id!==id);
          renderAll();
        }
      });
    });
  }

  function renderDetail(id) {
    if (!id) {
      itemDetail.innerHTML = `<div class="text-sm text-gray-500">アイテムを選択すると詳細が表示されます。</div>`;
      return;
    }
    const it = state.items.find(x=>x.id===id);
    if (!it) { itemDetail.innerHTML = `<div class="text-sm text-gray-500">アイテムが見つかりません。</div>`; return; }
    const legalityHtml = JSON.stringify(it.legality_notes || {}, null, 2);
    itemDetail.innerHTML = `
      <h4 class="font-semibold">${escapeHtml(it.name)}</h4>
      <p class="text-sm text-gray-600 mt-1">${escapeHtml(it.purpose_short || '')}</p>
      <dl class="mt-2 text-sm text-gray-700">
        <dt class="font-medium text-xs">カテゴリー</dt><dd>${escapeHtml(it.category)}</dd>
        <dt class="font-medium text-xs mt-1">重量</dt><dd>${it.weight_g ?? 0} g</dd>
        <dt class="font-medium text-xs mt-1">体積</dt><dd>${it.volume_cm3 ?? 0} cm³</dd>
        <dt class="font-medium text-xs mt-1">隠蔽性 / 軍民両用 / 危険物</dt>
        <dd>
          隠蔽性: ${it.concealability ?? '不明'} <br/>
          軍民両用: ${it.dual_use ? 'はい' : 'いいえ'} <br/>
          危険物: ${it.hazard_flag ? 'はい' : 'いいえ'}
        </dd>
        <dt class="font-medium text-xs mt-1">法的注意事項</dt>
        <dd><pre class="text-xs bg-gray-50 p-2 rounded">${escapeHtml(legalityHtml)}</pre></dd>
        <dt class="font-medium text-xs mt-1">出典</dt>
        <dd>${(it.sources||[]).map(s=>escapeHtml(s.title)).join('<br/>')}</dd>
      </dl>
      <div class="mt-3 flex gap-2">
        <button id="detailAdd" class="btn btn-secondary">チェックリストに追加</button>
        <button id="detailEdit" class="btn btn-secondary">編集</button>
      </div>
    `;
    document.getElementById('detailAdd').addEventListener('click', ()=>{
      const target = state.items.find(x=>x.id===it.id);
      if (target) {
        target.checked = true;
        renderAll();
      }
    });
    document.getElementById('detailEdit').addEventListener('click', ()=> openItemModal('edit', it));
  }

  function renderTotals() {
    const totals = state.items.reduce((acc, it) => {
      if (it.checked) {
        acc.weight += Number(it.weight_g || 0);
        acc.volume += Number(it.volume_cm3 || 0);
      }
      return acc;
    }, {weight:0, volume:0});
    totalWeightEl.textContent = totals.weight;
    totalVolumeEl.textContent = totals.volume;
  }

  // Modal management for add/edit
  let editingId = null;
  function openItemModal(mode='add', item=null) {
    modalBackdrop.classList.add('active');
    if (mode === 'edit' && item) {
      modalTitle.textContent = 'アイテム編集';
      editingId = item.id;
      f_name.value = item.name || '';
      f_category.value = item.category || 'サバイバル';
      f_weight.value = item.weight_g || 0;
      f_volume.value = item.volume_cm3 || 0;
      f_purpose.value = item.purpose_short || '';
      f_dual.checked = !!item.dual_use;
      f_hazard.checked = !!item.hazard_flag;
      f_legality.value = JSON.stringify(item.legality_notes || {});
    } else {
      modalTitle.textContent = 'アイテム追加';
      editingId = null;
      itemForm.reset();
      f_legality.value = '{"US":"許可"}';
    }
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
  }

  modalCancel.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // gather
    let legalityObj = {};
    try { legalityObj = JSON.parse(f_legality.value || '{}'); } catch(err){ alert('法的注意事項は有効なJSON形式である必要があります'); return; }
    const payload = {
      id: editingId || uid('item'),
      name: f_name.value.trim() || '名称未設定',
      category: f_category.value,
      weight_g: Number(f_weight.value || 0),
      volume_cm3: Number(f_volume.value || 0),
      purpose_short: f_purpose.value || '',
      dual_use: !!f_dual.checked,
      hazard_flag: !!f_hazard.checked,
      legality_notes: legalityObj,
      sources: [],
      scores: {survivability:1,signalability:0,exfiltration_support:0,concealability:2,legality_penalty: (f_dual.checked?1:0)}
    };
    if (editingId) {
      state.items = state.items.map(x => x.id === editingId ? Object.assign({}, x, payload) : x);
    } else {
      state.items.push(payload);
    }
    closeModal();
    renderAll();
  });

  addItemBtn.addEventListener('click', ()=> openItemModal('add'));
  document.getElementById('addItemBtn').addEventListener('click', ()=> openItemModal('add'));

  // Export functions
  function exportJSON() {
    const data = {
      checklistName: state.checklistName,
      scenario: state.scenario,
      createdAt: new Date().toISOString(),
      items: state.items
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${state.checklistName.replace(/\s+/g,'_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function itemsToCsv(items) {
    const header = ['id','name','category','weight_g','volume_cm3','purpose_short','dual_use','hazard_flag','legality_notes'];
    const rows = items.map(it => {
      const leg = JSON.stringify(it.legality_notes || {});
      return [it.id, it.name, it.category, it.weight_g||0, it.volume_cm3||0, it.purpose_short||'', it.dual_use?1:0, it.hazard_flag?1:0, `"${leg.replace(/"/g,'""')}"`];
    });
    return [header, ...rows].map(r => r.join(',')).join('\n');
  }

  function exportCSV() {
    const csv = itemsToCsv(state.items);
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${state.checklistName.replace(/\s+/g,'_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    // if includes dual_use, confirm
    const hasDual = state.items.some(it => it.dual_use);
    if (hasDual) {
      if (!confirm('このチェックリストには軍民両用とマークされたアイテムが含まれています。正当な/認可された用途のみでエクスポートしてください。続行しますか？')) return;
    }
    // Build simple PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt', format:'a4'});
    const margin = 40;
    let y = 40;
    doc.setFontSize(14); doc.text(state.checklistName, margin, y); y += 20;
    doc.setFontSize(10); doc.text(`シナリオ: ${state.scenario} — 生成日時: ${new Date().toLocaleString('ja-JP')}`, margin, y); y += 20;
    doc.setFontSize(11);
    let rowHeight = 14;
    // header
    doc.text('カテゴリー', margin, y); doc.text('名称', margin + 120, y); doc.text('重量(g)', margin + 380, y); y += rowHeight;
    doc.setLineWidth(0.5); doc.line(margin, y, 580, y); y += 6;
    state.items.forEach(it=>{
      if (y > 750) { doc.addPage(); y = 40; }
      doc.text( (it.category||''), margin, y);
      const name = (it.name || '') + (it.dual_use ? ' [両用]' : '') + (it.hazard_flag ? ' [危険]' : '');
      doc.text(name, margin + 120, y);
      doc.text(String(it.weight_g||0), margin + 380, y);
      y += rowHeight;
    });
    y += 10;
    doc.setFontSize(10);
    doc.text(`合計重量（チェック済みアイテム）: ${state.items.reduce((acc, it)=> acc + ((it.checked)?Number(it.weight_g||0):0), 0)} g`, margin, y);
    doc.save(`${state.checklistName.replace(/\s+/g,'_')}.pdf`);
  }

  // Exports with UI binding
  exportJsonBtn.addEventListener('click', exportJSON);
  exportCsvBtn.addEventListener('click', exportCSV);
  exportPdfBtn.addEventListener('click', exportPDF);
  exportBtn.addEventListener('click', ()=> {
    // quick export dialog
    const choice = prompt('エクスポート形式を入力してください: json / csv / pdf', 'json');
    if (!choice) return;
    if (choice.toLowerCase() === 'json') exportJSON();
    else if (choice.toLowerCase() === 'csv') exportCSV();
    else if (choice.toLowerCase() === 'pdf') exportPDF();
  });

  // Save button
  saveBtn.addEventListener('click', ()=> {
    saveCurrentChecklist();
    alert('ローカルに保存しました。');
  });

  // New checklist button
  newChecklistBtn.addEventListener('click', ()=> {
    createNewChecklist();
  });

  // Preset loading
  presetSelectEl.addEventListener('click', (e)=>{
    loadFromPreset(e.target.value);
  });

  scenarioSelect.addEventListener('change', (e)=> {
    state.scenario = e.target.value;
  });

  globalSearch.addEventListener('input', ()=> renderList());
  filterDual.addEventListener('change', ()=> renderList());
  filterHazard.addEventListener('change', ()=> renderList());
  toggleView.addEventListener('click', ()=>{
    state.viewMode = (state.viewMode === 'table') ? 'card' : 'table';
    toggleView.textContent = state.viewMode === 'table' ? 'Toggle View' : 'Toggle View';
    renderList();
  });

  // init load: load default preset
  (function init() {
    state.checklistName = PRESETS.embassy.name;
    state.items = JSON.parse(JSON.stringify(PRESETS.embassy.items));
    presetSelectEl.value = 'embassy';
    renderAll();
    renderSavedList();
  })();

})();
