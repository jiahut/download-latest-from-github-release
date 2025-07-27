# GitHub Release Downloader

一个使用 TypeScript 和 Bun 编写的 GitHub 最新版本下载器，支持文件名关键词筛选和 fzf 交互式选择

## 功能特性

- 📦 自动获取 GitHub 仓库最新版本
- 🎯 多参数 筛选
- ⬇️ 无歧义时自动下载
- 🔍 fzf 交互式选择和模糊搜索
- 📊 详细的文件信息显示

## 安装要求

- [Bun](https://bun.sh/) 运行时
- [fzf](https://github.com/junegunn/fzf) 模糊搜索工具
  ```bash
  # macOS
  brew install fzf
  
  # Ubuntu/Debian
  apt install fzf
  
  # CentOS/RHEL
  yum install fzf
  ```

## 使用方法

```bash
# 基本用法 - 使用默认筛选规则
bun download-latest.ts <github-repo-url>

# 使用筛选条件 - 文件名必须包含所有筛选条件
bun download-latest.ts https://github.com/denoland/deno arm64 .zip
bun download-latest.ts https://github.com/microsoft/vscode linux x64
bun download-latest.ts https://github.com/rust-lang/rust windows .exe
bun download-latest.ts https://github.com/openai/codex aarch64 tar.gz
```

## 筛选逻辑

### 无筛选条件时（默认行为）
- **文件类型匹配**：只显示常见的可执行文件格式（`.zip`, `.tar.gz`, `.exe`, `.dmg`, `.deb`, `.rpm`, `.AppImage`）
- **架构智能匹配**：优先显示包含常见架构标识的文件，同时包含无架构标识的通用文件

### 有筛选条件时
- **全匹配**：文件名必须包含所有提供的筛选条件
- **不区分大小写**：筛选时忽略大小写
- **灵活筛选**：可以是架构、操作系统、文件类型等任意关键词

## 交互式选择

- **单个匹配**：直接下载，无需选择
- **多个匹配**：自动弹出 fzf 界面进行选择
  - 支持实时输入过滤
  - 方向键选择文件
  - Enter 确认下载
  - Ctrl+C 或 Esc 取消

## 示例

### 下载 Deno 的 ARM64 版本
```bash
bun download-latest.ts https://github.com/denoland/deno arm64
```

### 下载 VS Code 的 Linux 版本
```bash
bun download-latest.ts https://github.com/microsoft/vscode linux
```

### 下载 OpenAI Codex 的 macOS tar.gz 文件
```bash
bun download-latest.ts https://github.com/openai/codex darwin tar.gz
```

## 输出示例

### 单个匹配文件（直接下载）
```
🔍 获取最新版本信息: https://api.github.com/repos/denoland/deno/releases/latest
📦 找到版本: v2.4.2 - v2.4.2
⬇️  开始下载: deno-x86_64-apple-darwin.zip (40.5 MB)
✅ 下载完成: /Users/username/deno-x86_64-apple-darwin.zip
```

### 多个匹配文件（fzf 选择）
```
🔍 获取最新版本信息: https://api.github.com/repos/openai/codex/releases/latest
📦 找到版本: rust-v0.10.0 - 0.10.0
🎯 找到 16 个匹配文件，使用 fzf 选择:

┌─────────────────────────────────────────────────────────────┐
│ 选择文件:                                                    │
│ > codex-aarch64-apple-darwin.tar.gz (15.2 MB)              │
│   codex-aarch64-unknown-linux-gnu.tar.gz (16.8 MB)        │
│   codex-aarch64-unknown-linux-musl.tar.gz (16.4 MB)       │
│   codex-exec-aarch64-apple-darwin.tar.gz (15.2 MB)        │
│   codex-exec-aarch64-unknown-linux-gnu.tar.gz (16.8 MB)   │
│   codex-x86_64-apple-darwin.tar.gz (16.1 MB)              │
│   codex-x86_64-pc-windows-msvc.zip (15.8 MB)              │
│   ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

### 没有匹配文件
```
🔍 获取最新版本信息: https://api.github.com/repos/user/repo/releases/latest
📦 找到版本: v1.0.0 - Release v1.0.0
❌ 没有找到匹配的文件

📋 可用的文件列表:
  1. source-code.zip (2.3 MB)
  2. documentation.pdf (1.1 MB)
  3. binary-linux-amd64 (45.2 MB)
```

## 注意事项

- **智能选择**：找到一个匹配文件时直接下载，多个文件时使用 fzf 选择
- **fzf 依赖**：需要安装 fzf 才能进行交互式选择
- **大文件支持**：使用流式下载，支持大文件
- **错误处理**：如果 GitHub API 请求失败或网络异常会显示详细错误信息
- **文件存储**：所有文件下载到当前工作目录

## 许可证

MIT License
