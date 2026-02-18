# 开发环境设置

本文档介绍如何设置 OpenCode Chat for Obsidian 的开发环境。

---

## 前置条件

### 必需软件

| 软件 | 版本 | 安装命令 |
|------|------|---------|
| Node.js | 20.x+ | `nvm install 20` |
| npm | 10.x+ | 随 Node.js 安装 |
| OpenCode CLI | latest | `curl -fsSL https://opencode.ai/install \| bash` |
| Obsidian | 0.15.0+ | [下载](https://obsidian.md/download) |

### 验证安装

```bash
# 检查 Node.js
node --version  # v20.x 或更高
npm --version   # 10.x 或更高

# 检查 OpenCode CLI
opencode --version

# 如果找不到 opencode，添加 PATH
export PATH="$HOME/.opencode/bin:$PATH"
```

---

## 克隆项目

```bash
git clone https://github.com/juncas/obsidian-opencode-chat.git
cd obsidian-opencode-chat
```

---

## 安装依赖

```bash
# 安装所有依赖
npm install

# 或清理安装（推荐用于 CI）
npm ci
```

### 依赖说明

**开发依赖**:
- `typescript` - TypeScript 编译器
- `esbuild` - 快速打包工具
- `eslint` - 代码风格检查
- `@typescript-eslint/*` - TypeScript ESLint 规则
- `obsidian` - Obsidian 插件类型定义

**运行时依赖**:
- 无外部依赖（纯 TypeScript + Obsidian API）

---

## 开发构建

### 监听模式（推荐）

```bash
npm run dev
```

**行为**:
- 监听 `src/` 目录变化
- 自动重建到 `main.js`
- 输出到项目根目录

### 生产构建

```bash
npm run build
```

**行为**:
- 运行 TypeScript 类型检查
- 压缩打包到 `main.js`
- 生成生产环境代码

### 代码检查

```bash
# ESLint 检查
npm run lint

# 自动修复
npm run lint:fix

# TypeScript 类型检查
npx tsc -noEmit
```

---

## 安装到 Obsidian

### 方法 A: 手动复制

```bash
# 设置变量
VAULT_PATH="/path/to/your/vault"
PLUGIN_ID="claude-chat-obsidian"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/$PLUGIN_ID"

# 创建目录
mkdir -p "$PLUGIN_DIR"

# 复制构建产物
cp main.js manifest.json styles.css "$PLUGIN_DIR/"

# 复制技能文件
mkdir -p "$PLUGIN_DIR/opencode-skills"
cp -R opencode-skills/. "$PLUGIN_DIR/opencode-skills/"
```

### 方法 B: 符号链接（开发推荐）

```bash
# 创建符号链接（macOS/Linux）
ln -s $(pwd)/main.js "$PLUGIN_DIR/main.js"
ln -s $(pwd)/manifest.json "$PLUGIN_DIR/manifest.json"
ln -s $(pwd)/styles.css "$PLUGIN_DIR/styles.css"
ln -s $(pwd)/opencode-skills "$PLUGIN_DIR/opencode-skills"
```

**优势**: `npm run dev` 后自动生效，无需重新复制

### 方法 C: 自动安装脚本

```bash
#!/bin/bash
# install-dev.sh

VAULT_PATH="$1"
if [ -z "$VAULT_PATH" ]; then
    echo "Usage: ./install-dev.sh /path/to/vault"
    exit 1
fi

PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/claude-chat-obsidian"
mkdir -p "$PLUGIN_DIR"

npm run build
cp main.js manifest.json styles.css "$PLUGIN_DIR/"
cp -R opencode-skills/. "$PLUGIN_DIR/opencode-skills/"

echo "Installed to: $PLUGIN_DIR"
```

---

## 启用插件

1. **打开 Obsidian**
2. **设置** → **第三方插件**
3. **禁用「受限模式」**（如启用）
4. **已安装的插件** → 找到「OpenCode Chat」
5. **点击启用**

### 验证安装

1. 打开命令面板 (`Ctrl/Cmd + P`)
2. 搜索「Open OpenCode Chat」
3. 打开聊天面板
4. 查看是否显示「Connected」状态

---

## 调试技巧

### Obsidian 开发者工具

```
打开方式：Ctrl/Cmd + Shift + I
```

**常用功能**:
- **Console 标签**: 查看日志输出
- **Elements 标签**: 检查 DOM 结构
- **Network 标签**: 查看 HTTP 请求（OpenCode API）

### 日志级别

```typescript
console.log('OpenCodeChat: Plugin loaded');        // 普通信息
console.warn('OpenCodeChat: Port 14000 failed');   // 警告
console.error('OpenCodeChat: Server error:', e);   // 错误
```

### 关键日志点

**插件启动**:
```
OpenCodeChat: Plugin loaded
OpenCodeChat: Loaded data, sessions: 1
OpenCodeServer: Starting on port 14000
OpenCodeServer: Server started on port 14000
OpenCodeServer: SSE connected
```

**命令处理**:
```
OpenCodeChatView: Processing command: /write start 主题
OpenCodeServer: Sending message to session abc123
```

**错误日志**:
```
OpenCodeServer: stderr: <error message>
OpenCodeChatView: Command error: <error message>
```

### 常见问题调试

**问题 1: 找不到 OpenCode CLI**

```bash
# 验证安装
opencode --version

# 如果找不到，检查 PATH
echo $PATH | grep -o '\.opencode/bin'

# 临时添加 PATH
export PATH="$HOME/.opencode/bin:$PATH"

# 永久添加（~/.zshrc 或 ~/.bashrc）
echo 'export PATH="$HOME/.opencode/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**问题 2: 端口占用**

```bash
# 检查端口占用
lsof -i :14000

# 杀掉占用进程
kill -9 <PID>

# 或让插件自动故障转移到其他端口（14001-14004）
```

**问题 3: 插件不显示**

```bash
# 检查文件是否存在
ls -la "$PLUGIN_DIR"

# 必须存在的文件：
# - main.js
# - manifest.json
# - styles.css
# - opencode-skills/
```

---

## 热重载设置

### 方式 1: 手动重载

1. `npm run dev` 监听构建
2. 修改代码后自动重建
3. 在 Obsidian 中：设置 → 第三方插件 → 禁用 → 启用

### 方式 2: 自动重载（推荐）

使用 [Obsidian Auto Refresh Plugin](https://github.com/RyotaUshimi/obsidian-auto-refresh):

1. 安装「Hot Reload」插件
2. 启用自动刷新
3. 修改代码后自动重载

---

## 测试流程

### 核心功能测试

**1. 基础聊天**:
```
1. 打开聊天面板
2. 输入「你好，介绍一下这个项目」
3. 验证流式响应显示
4. 验证消息历史保存
```

**2. 多会话**:
```
1. 点击「+」创建新会话
2. 输入不同内容
3. 切换会话验证历史
```

**3. 写作工作流**:
```
1. 输入 `/write start 测试主题`
2. 验证任务面板显示
3. 点击阶段按钮验证跳转
4. 验证草稿版本记录
```

**4. KB 审计**:
```
1. 输入 `/kb audit full`
2. 验证审计报告生成
3. 验证问题列表显示
```

---

## 发布前检查

```bash
# 1. 类型检查
npx tsc -noEmit

# 2. ESLint
npm run lint

# 3. 生产构建
npm run build

# 4. 验证产物
ls -la main.js manifest.json styles.css

# 5. 验证版本号
node -p "require('./manifest.json').version"
node -p "require('./package.json').version"
# 两者应该一致
```

---

## CI/CD 本地验证

### 验证 CI 工作流

```bash
# 本地运行 CI 步骤
npm ci
npm run lint
npx tsc -noEmit
npm run build

# 验证产物
test -f main.js && echo "✅ main.js exists"
test -f manifest.json && echo "✅ manifest.json exists"
test -f styles.css && echo "✅ styles.css exists"
```

### 验证版本一致性

```bash
MANIFEST_VERSION=$(node -p "require('./manifest.json').version")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

if [ "$MANIFEST_VERSION" = "$PACKAGE_VERSION" ]; then
    echo "✅ Version consistency: $MANIFEST_VERSION"
else
    echo "❌ Version mismatch: manifest=$MANIFEST_VERSION, package=$PACKAGE_VERSION"
    exit 1
fi
```

---

## 性能优化

### 构建优化

**esbuild 配置** (`esbuild.config.mjs`):
```javascript
{
    bundle: true,
    minify: true,      // 生产环境压缩
    sourcemap: false,  // 不生成 source map（减小体积）
    target: 'es2020',
    platform: 'browser'
}
```

### 开发体验优化

**推荐 VS Code 设置**:
```json
{
    "typescript.tsdk": "node_modules/typescript/lib",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "files.watcherExclude": {
        "**/node_modules/**": true,
        "**/main.js": true
    }
}
```

---

## 故障排查

### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| `npm install` 失败 | Node 版本过低 | 升级到 Node 20+ |
| `opencode` 找不到 | PATH 未配置 | 添加 `~/.opencode/bin` 到 PATH |
| 端口占用 | 上次未正常退出 | `kill` 占用进程或等待 3 秒 |
| 插件不显示 | 文件缺失 | 重新复制构建产物 |
| SSE 连接失败 | 服务器未启动 | 检查 `opencode serve` 是否运行 |

### 获取帮助

- [GitHub Issues](https://github.com/juncas/obsidian-opencode-chat/issues)
- [AGENTS.md](../AGENTS.md)

---

*最后更新：2026-02-19*
