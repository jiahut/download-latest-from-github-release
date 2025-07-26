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
  arch?: string[];
  fileTypes?: string[];
  fileNames?: string[];
}

class GitHubReleaseDownloader {
  private readonly defaultArch = ['x64', 'amd64', 'arm64', 'universal'];
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
        console.log(`🎯 找到 ${matchedAssets.length} 个匹配文件:`);
        matchedAssets.forEach((asset, index) => {
          console.log(`  ${index + 1}. ${asset.name} (${this.formatSize(asset.size)})`);
        });
        
        console.log('\n自动选择第一个文件进行下载...');
        await this.downloadAsset(matchedAssets[0], outputDir);
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
    const { arch = this.defaultArch, fileTypes = this.defaultFileTypes, fileNames = [] } = options;
    
    return assets.filter(asset => {
      const name = asset.name.toLowerCase();
      
      // 文件类型匹配
      const typeMatch = fileTypes.some(type => name.endsWith(type.toLowerCase()));
      if (!typeMatch) return false;
      
      // 架构匹配
      const archMatch = arch.some(a => name.includes(a.toLowerCase()));
      
      // 文件名模糊匹配
      const nameMatch = fileNames.length === 0 || 
        fileNames.some(pattern => name.includes(pattern.toLowerCase()));
      
      return archMatch && nameMatch;
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
  bun download-latest.ts <github-repo-url> [选项]

示例:
  bun download-latest.ts https://github.com/microsoft/vscode
  bun download-latest.ts https://github.com/denoland/deno --arch=arm64 --type=.zip
  bun download-latest.ts github.com/user/repo --name=linux --output=./downloads

选项:
  --arch=<arch>      指定架构 (如: x64,arm64,universal)
  --type=<types>     指定文件类型 (如: .zip,.tar.gz,.exe)
  --name=<names>     指定文件名模糊匹配 (如: linux,windows)
  --output=<dir>     指定输出目录 (默认: 当前目录)
`);
    process.exit(0);
  }

  const repoUrl = args[0];
  const options: MatchOptions = {};
  let outputDir = process.cwd();

  args.slice(1).forEach(arg => {
    if (arg.startsWith('--arch=')) {
      options.arch = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--type=')) {
      options.fileTypes = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--name=')) {
      options.fileNames = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--output=')) {
      outputDir = arg.split('=')[1];
    }
  });

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
