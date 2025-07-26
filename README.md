# GitHub Release Downloader

一个使用 TypeScript 和 Bun 编写的 GitHub 最新版本下载器，支持通过架构、文件类型、文件名进行模糊匹配。

## 功能特性

- 🚀 使用 Bun 运行时，快速执行
- 🎯 支持架构、文件类型、文件名模糊匹配
- 📦 自动获取 GitHub 仓库最新版本
- ⬇️ 智能文件选择和下载
- 🔍 详细的文件信息显示

## 安装要求

- [Bun](https://bun.sh/) 运行时

## 使用方法

```bash
# 基本用法
bun download-latest.ts <github-repo-url>

# 指定架构
bun download-latest.ts https://github.com/denoland/deno --arch=x86_64

# 指定文件类型
bun download-latest.ts https://github.com/microsoft/vscode --type=.zip,.dmg

# 指定文件名模糊匹配
bun download-latest.ts https://github.com/rust-lang/rust --name=linux

# 指定输出目录
bun download-latest.ts https://github.com/nodejs/node --output=./downloads

# 组合使用
bun download-latest.ts https://github.com/oven-sh/bun --arch=darwin --type=.zip --name=aarch64
```

## 参数说明

| 参数 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `--arch` | 指定架构，支持多个值（逗号分隔） | `x64,amd64,arm64,universal` | `--arch=arm64,x86_64` |
| `--type` | 指定文件类型，支持多个值（逗号分隔） | `.zip,.tar.gz,.exe,.dmg,.deb,.rpm,.AppImage` | `--type=.zip,.dmg` |
| `--name` | 指定文件名模糊匹配，支持多个值（逗号分隔） | 无 | `--name=linux,windows` |
| `--output` | 指定输出目录 | 当前目录 | `--output=./downloads` |

## 匹配逻辑

1. **文件类型匹配**：文件必须以指定的扩展名结尾
2. **架构匹配**：文件名中必须包含指定的架构标识符
3. **文件名匹配**：文件名中必须包含指定的关键词（可选）

## 示例

### 下载 Deno 的 macOS x86_64 版本
```bash
bun download-latest.ts https://github.com/denoland/deno --arch=x86_64 --type=.zip
```

### 下载 VS Code 的所有 .zip 和 .dmg 文件
```bash
bun download-latest.ts https://github.com/microsoft/vscode --type=.zip,.dmg
```

### 下载 Rust 的 Linux 版本
```bash
bun download-latest.ts https://github.com/rust-lang/rust --name=linux --arch=x86_64
```

## 输出示例

```
🔍 获取最新版本信息: https://api.github.com/repos/denoland/deno/releases/latest
📦 找到版本: v2.4.2 - v2.4.2
🎯 找到 6 个匹配文件:
  1. deno-x86_64-apple-darwin.zip (40.5 MB)
  2. deno-x86_64-pc-windows-msvc.zip (42.2 MB)
  3. deno-x86_64-unknown-linux-gnu.zip (42.4 MB)
  4. denort-x86_64-apple-darwin.zip (29.1 MB)
  5. denort-x86_64-pc-windows-msvc.zip (30.6 MB)
  6. denort-x86_64-unknown-linux-gnu.zip (31.0 MB)

自动选择第一个文件进行下载...
⬇️  开始下载: deno-x86_64-apple-darwin.zip (40.5 MB)
✅ 下载完成: /path/to/current/directory/deno-x86_64-apple-darwin.zip
```

## 注意事项

- 如果找到多个匹配文件，会自动下载第一个
- 如果没有找到匹配文件，会列出所有可用文件
- 支持大文件下载（通过 ArrayBuffer 处理）
- 下载的文件会保存在指定的输出目录中

## 许可证

MIT License
