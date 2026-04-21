# Trusted Publisher Setup Guide

このドキュメントでは、`@shuji-bonji/ifc-core-mcp` を npm の **Trusted Publisher (OIDC)** 方式で公開するための一度きりの設定手順を説明します。

## 概要

npm の Trusted Publisher は、GitHub Actions の OIDC トークンを利用して、長期的な `NPM_TOKEN` を保存せずにパッケージを公開できる仕組みです。

**利点:**

- `NPM_TOKEN` シークレットの管理・ローテーションが不要
- `--provenance` による公開証明（どの GitHub commit から publish されたかを検証可能）
- トークン漏洩リスクの排除

## 前提条件

- npmjs.com のアカウントで `@shuji-bonji/ifc-core-mcp` の publish 権限を持っていること
- 少なくとも 1 回、従来の `NPM_TOKEN` 方式でこのパッケージを publish 済みであること（本リポジトリは v0.1.0 / v0.1.1 で公開済み）
- 2FA が有効化されていること（npm の推奨設定）

## 設定手順

### 1. npmjs.com で Trusted Publisher を登録

1. <https://www.npmjs.com> にログイン
2. パッケージページ（<https://www.npmjs.com/package/@shuji-bonji/ifc-core-mcp>）を開く
3. 右上の **Settings** をクリック
4. **Publishing access** セクションへ移動
5. **Trusted Publisher** のエリアで **GitHub Actions** を選択
6. 以下の値を入力:

   | 項目 | 値 |
   | --- | --- |
   | Organization or user | `shuji-bonji` |
   | Repository | `ifc-core-mcp` |
   | Workflow filename | `publish.yml` |
   | Environment name | （空欄で OK。特定 environment に限定したい場合のみ指定） |

7. **Save** をクリック

### 2. 既存の NPM_TOKEN シークレットの削除（任意・推奨）

Trusted Publisher 化後は `NPM_TOKEN` は不要です。GitHub リポジトリ側から削除します。

1. <https://github.com/shuji-bonji/ifc-core-mcp/settings/secrets/actions> を開く
2. `NPM_TOKEN` の **Remove** をクリック

### 3. ワークフローの確認

本リポジトリの `.github/workflows/publish.yml` はすでに Trusted Publisher 対応済みです。重要ポイント:

```yaml
permissions:
  contents: read
  id-token: write  # OIDC トークン発行に必要

# ...

- run: npx -y npm@latest publish --access public --provenance
```

> `npx -y npm@latest` を使うことで、`actions/setup-node` が同梱する npm バージョンに依存せず、`--provenance` が確実にサポートされた最新の npm CLI で publish できます。

環境変数 `NODE_AUTH_TOKEN` や `secrets.NPM_TOKEN` は **不要** です。

## 動作確認（初回 publish 時）

1. `package.json` の `version` を更新（例: `0.2.0`）
2. `CHANGELOG.md` にエントリを追加
3. コミット & プッシュ

   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v0.2.0"
   git push
   ```

4. タグを作成してプッシュ

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

5. GitHub Actions の **Publish to npm** ワークフローが起動
6. 成功すると:
   - <https://www.npmjs.com/package/@shuji-bonji/ifc-core-mcp> の該当バージョンに **Provenance** バッジが表示される
   - Sigstore の透明ログにも記録される

## トラブルシューティング

### `npm error code E401` / `Unable to authenticate` が出る場合

- npmjs.com 側の Trusted Publisher 設定値（repository 名、workflow ファイル名）が一致しているか確認
- `permissions: id-token: write` が `publish` ジョブに付与されているか確認
- 公開済みパッケージ名と `package.json` の `name` が一致しているか確認

### Provenance が付与されない場合

- `npm publish` に `--provenance` フラグが付いているか確認
- npm CLI バージョンが `9.5.0` 以上であること（`actions/setup-node@v4` + Node 20 なら基本 OK）
- ワークフローが public リポジトリで実行されていること（private では provenance 未対応の場合あり）

### 既存の NPM_TOKEN を残しておきたい場合

Trusted Publisher 有効化後も、`NPM_TOKEN` を併用することは可能です（フォールバック用途）。ただし、OIDC が機能している限り token は使用されません。

## 参考リンク

- [npm: Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements)
- [npm: Trusted Publishers](https://docs.npmjs.com/trusted-publishers)
- [GitHub Actions: OIDC with npm](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
