# cmd-pick

Command Code Desktop (v0.1.30) のモデルピッカーに、CLI と同じ BYOK プロバイダ (`~/.commandcode/providers.json`) を出すパッチ。

公式 GUI は `GET_CLI_MODELS` で静的カタログだけ返す。セッション側の harness は BYOK を読めるが、ピッカーに載らない。このリポジトリはその穴を埋める。

## 何が変わるか

- `fetchModels()` が `~/.commandcode/providers.json` を読む
- 可能なら `@commandcode/harness` の `loadProvidersConfig` を使い、失敗時はディスク直読み
- ピッカーに `xAI (byok)` / `Meta (byok)` / `Xiaomi MiMo (SGP Token Plan) (byok)` などの見出しで出る
- モデル id は CLI と同じ `provider/model`（例: `xai/grok-4.6`）

## 適用

macOS のインストール済みアプリにパッチする。アプリは再署名が必要。

```bash
python3 scripts/apply-byok-picker.py
```

対象:

```
/Applications/Command Code.app/Contents/Resources/app/out/main/index.js
```

適用後に Command Code を再起動し、モデルピッカーを開き直す。公式アップデートが入ると上書きされるので、そのときは再実行する。

## 元に戻す

```bash
python3 scripts/apply-byok-picker.py --revert
```

バックアップは `index.js.pre-byok`。
