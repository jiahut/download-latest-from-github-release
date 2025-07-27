#!/usr/bin/env bun

interface GitHubAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label?: string;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: GitHubAsset[];
}

interface MatchOptions {
  filters?: string[];
}

class GitHubReleaseDownloader {
  private readonly defaultArch = ['x64', 'amd64', 'arm64', 'aarch64', 'x86_64', 'universal'];
  private readonly defaultFileTypes = ['.zip', '.tar.gz', '.exe', '.dmg', '.deb', '.rpm', '.AppImage'];

  async downloadLatest(
    repoUrl: string,
    options: MatchOptions = {},
    outputDir: string = process.cwd()
  ): Promise<void> {
    try {
      const apiUrl = this.convertToApiUrl(repoUrl);
      console.log(`🔍 获取最新版本信息: ${apiUrl}`);
      
      const release = await this.fetchLatestRelease(apiUrl);
      console.log(`📦 找到版本: ${release.tag_name} - ${release.name}`);
      
      if (release.assets.length === 0) {
        console.log('❌ 该版本没有可下载的资源文件');
        return;
      }

      const matchedAssets = this.filterAssets(release.assets, options);
      
      if (matchedAssets.length === 0) {
        console.log('❌ 没有找到匹配的文件');
        this.listAvailableAssets(release.assets);
        return;
      }

      if (matchedAssets.length === 1) {
        await this.downloadAsset(matchedAssets[0], outputDir);
      } else {
        const selectedAsset = await this.selectAsset(matchedAssets);
        if (selectedAsset) {
          await this.downloadAsset(selectedAsset, outputDir);
        } else {
          console.log('❌ 未选择任何文件，取消下载');
        }
      }
    } catch (error) {
      console.error('❌ 下载失败:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private convertToApiUrl(repoUrl: string): string {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(regex);
    
    if (!match) {
      throw new Error('无效的 GitHub 仓库 URL');
    }
    
    const [, owner, repo] = match;
    return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  }

  private async fetchLatestRelease(apiUrl: string): Promise<GitHubRelease> {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Release-Downloader'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API 请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private filterAssets(assets: GitHubAsset[], options: MatchOptions): GitHubAsset[] {
    const { filters = [] } = options;
    
    // 如果没有筛选条件，使用默认筛选逻辑
    if (filters.length === 0) {
      return assets.filter(asset => {
        const name = asset.name.toLowerCase();
        
        // 文件类型匹配
        const typeMatch = this.defaultFileTypes.some(type => name.endsWith(type.toLowerCase()));
        
        // 架构匹配 - 如果文件名包含任一架构关键词则匹配，或者没有任何架构关键词也认为匹配
        const hasArchKeyword = this.defaultArch.some(a => name.includes(a.toLowerCase()));
        const archMatch = !hasArchKeyword || this.defaultArch.some(a => name.includes(a.toLowerCase()));
        
        return typeMatch && archMatch;
      });
    }
    
    // 有筛选条件时，文件名必须包含所有筛选条件
    return assets.filter(asset => {
      const name = asset.name.toLowerCase();
      return filters.every(filter => name.includes(filter.toLowerCase()));
    });
  }

  private async downloadAsset(asset: GitHubAsset, outputDir: string): Promise<void> {
    console.log(`⬇️  开始下载: ${asset.name} (${this.formatSize(asset.size)})`);
    
    const response = await fetch(asset.browser_download_url);
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    const filename = `${outputDir}/${asset.name}`;
    
    // 使用流式下载以支持大文件和进度显示
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(filename, arrayBuffer);
    
    console.log(`✅ 下载完成: ${filename}`);
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private async selectAsset(assets: GitHubAsset[]): Promise<GitHubAsset | null> {
    console.log(`🎯 找到 ${assets.length} 个匹配文件，使用 fzf 选择:`);
    
    // 创建选项列表，格式：文件名 (文件大小)
    const options = assets.map(asset => 
      `${asset.name} (${this.formatSize(asset.size)})`
    );
    
    try {
      // 使用 fzf 进行实时过滤选择
      const proc = Bun.spawn([
        'fzf', 
        '--prompt=选择文件: ', 
        '--height=40%',
        '--reverse',
        '--border'
      ], {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'inherit' // 让 fzf 的界面直接显示在终端
      });
      
      // 将选项写入 fzf 的 stdin
      proc.stdin.write(options.join('\n'));
      proc.stdin.end();
      
      // 等待 fzf 完成并获取结果
      await proc.exited;
      
      if (proc.exitCode !== 0) {
        console.log('❌ 未选择任何文件，取消下载');
        return null;
      }
      
      const output = await new Response(proc.stdout).text();
      const selectedLine = output.trim();
      
      if (!selectedLine) {
        return null;
      }
      
      // 根据选择的行找到对应的资源
      const selectedIndex = options.findIndex(option => option === selectedLine);
      return selectedIndex >= 0 ? assets[selectedIndex] : null;
      
    } catch (error) {
      console.error('❌ fzf 选择失败:', error);
      console.log('💡 请确保系统已安装 fzf (brew install fzf 或 apt install fzf)');
      return null;
    }
  }


  private listAvailableAssets(assets: GitHubAsset[]): void {
    console.log('\n📋 可用的文件列表:');
    assets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.name} (${this.formatSize(asset.size)})`);
    });
  }
}

// 命令行参数解析
function parseArgs(): { repoUrl: string; options: MatchOptions; outputDir: string } {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
使用方法:
  bun download-latest.ts <github-repo-url> [筛选条件...]

示例:
  bun download-latest.ts https://github.com/microsoft/vscode
  bun download-latest.ts https://github.com/denoland/deno arm64 .zip
  bun download-latest.ts https://github.com/user/repo linux x64
  bun download-latest.ts github.com/user/repo windows .exe

说明:
  - 第一个参数必须是 GitHub 仓库地址
  - 后续参数都作为筛选条件，文件名必须包含所有筛选条件
  - 如果不提供筛选条件，会使用默认规则过滤常见的可执行文件
`);
    process.exit(0);
  }

  const repoUrl = args[0];
  const filters = args.slice(1);
  const options: MatchOptions = { filters };
  const outputDir = process.cwd();

  return { repoUrl, options, outputDir };
}

// 主函数
async function main() {
  const { repoUrl, options, outputDir } = parseArgs();
  const downloader = new GitHubReleaseDownloader();
  await downloader.downloadLatest(repoUrl, options, outputDir);
}

if (import.meta.main) {
  main();
}
