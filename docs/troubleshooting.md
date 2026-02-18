# 故障排查指南

OpenCode Chat for Obsidian 的常见问题、诊断方法和解决方案。

---

## 诊断流程

### 第一步：收集信息

**1. 打开 Obsidian 开发者控制台**:
```
快捷键：Ctrl/Cmd + Shift + I
位置：Console 标签
```

**2. 查看错误日志**:
- 搜索 `OpenCodeChat:` 前缀
- 搜索 `error` 或 `Error`
- 截图错误信息

**3. 检查插件状态**:
```
设置 → 第三方插件 → OpenCode Chat
- 是否已启用
- 版本号
```

**4. 验证 OpenCode 安装**:
```bash
opencode --version
```

---

## 常见问题

### 问题 1: OpenCode CLI not found

**错误信息**:
```
OpenCodeServer: ENOENT: no such file or directory, opencode
```

**原因**: OpenCode CLI 未安装或不在 PATH 中

**解决方案**:

```bash
# 1. 验证安装
opencode --version

# 2. 如果未安装
curl -fsSL https://opencode.ai/install | bash

# 3. 添加 PATH（临时）
export PATH="$HOME/.opencode/bin:$PATH"

# 4. 添加 PATH（永久，~/.zshrc 或 ~/.bashrc）
echo 'export PATH="$HOME/.opencode/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 5. 重启 Obsidian
```

**验证**:
```bash
# 应该输出版本号
opencode --version
```

---

### 问题 2: Failed to start OpenCode server

**错误信息**:
```
OpenCodeServer: Failed to start on port 14000
EADDRINUSE: Address already in use
```

**原因**: 端口被占用（上次进程未正常退出）

**解决方案**:

**方式 A: 杀掉占用进程**
```bash
# macOS/Linux: 查找占用端口的进程
lsof -i :14000

# 杀掉进程
kill -9 <PID>
```

**方式 B: 等待自动故障转移**
- 插件会自动尝试 14001-14004 端口
- 查看日志确认成功的端口：`OpenCodeServer: Server started on port 14001`

**方式 C: 重启 Obsidian**
- 完全退出 Obsidian
- 等待 3 秒
- 重新打开

---

### 问题 3: SSE connection failed

**错误信息**:
```
OpenCodeServer: SSE connection failed with status 502
OpenCodeServer: Reconnect attempt 1/5
```

**原因**: OpenCode Server 进程异常或网络波动

**解决方案**:

1. **检查 Server 状态**:
```bash
# 查看 opencode 进程是否运行
ps aux | grep opencode
```

2. **重启 Server**:
```
在 Obsidian 中：
设置 → OpenCode Chat 设置 → 点击「Reload Server」
```

3. **重启 Obsidian**:
- 完全退出
- 重新打开

4. **检查日志**:
```
Console 标签查找：
- OpenCodeServer: stderr: <错误信息>
- OpenCodeChat: Server error: <错误信息>
```

---

### 问题 4: Chat view opens but no response

**现象**: 聊天面板打开，发送消息后无响应

**可能原因**:
1. OpenCode Server 未连接
2. 会话创建失败
3. 消息发送超时

**诊断步骤**:

```
1. 检查状态徽章（顶部）
   - "Connected" = 正常
   - "Disconnected" = 需要重启 Server
   - "Connecting..." = 等待中

2. 查看 Console 日志
   - 查找 "OpenCodeServer: SSE connected"
   - 查找 "OpenCodeChatView: Command error"

3. 验证会话创建
   - 查找 "Creating new session"
   - 查找 "Failed to create session"
```

**解决方案**:

```
1. 点击状态徽章查看详细信息
2. 设置 → 第三方插件 → 禁用 → 启用 OpenCode Chat
3. 重启 Obsidian
```

---

### 问题 5: Skills not loaded

**现象**: OpenCode 无法使用 bundled skills

**检查步骤**:

```bash
# 1. 检查源目录
ls -la ~/.obsidian/plugins/claude-chat-obsidian/opencode-skills/
# 应该包含 evidence-qa/, kb-health-audit/

# 2. 检查目标目录
ls -la ~/.opencode/skills/
# 应该包含同步的技能
```

**解决方案**:

```bash
# 手动同步技能
VAULT_PATH="~"  # 或你的 vault 路径
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/claude-chat-obsidian"
TARGET_DIR="$VAULT_PATH/.opencode/skills"

mkdir -p "$TARGET_DIR"
cp -R "$PLUGIN_DIR/opencode-skills/." "$TARGET_DIR/"

# 重启 Obsidian
```

---

### 问题 6: 插件不显示在列表中

**现象**: 安装后在第三方插件列表中找不到

**可能原因**:
1. 文件未正确复制
2. manifest.json 格式错误
3. Obsidian 未刷新

**解决方案**:

```bash
# 1. 验证文件存在
ls -la ~/.obsidian/plugins/claude-chat-obsidian/
# 应该有：main.js, manifest.json, styles.css, opencode-skills/

# 2. 验证 manifest.json
cat ~/.obsidian/plugins/claude-chat-obsidian/manifest.json
# 应该有有效的 JSON 格式

# 3. 重新安装
cd /path/to/obsidian-opencode-chat
npm run build
cp main.js manifest.json styles.css ~/.obsidian/plugins/claude-chat-obsidian/
cp -R opencode-skills/ ~/.obsidian/plugins/claude-chat-obsidian/

# 4. 重启 Obsidian
```

---

### 问题 7: /write 命令无响应

**现象**: 输入 `/write start 主题` 后无反应

**诊断**:

```
1. 查看 Console 日志
   - "Preparing write workflow command"
   - "Failed to create writing task"

2. 检查任务面板
   - 是否显示在输入框上方
   - 是否有错误提示

3. 验证 OpenCode 连接
   - 状态徽章是否显示 "Connected"
```

**解决方案**:

```
1. 刷新写作工作流状态
   设置 → OpenCode Chat → 点击「Reload Server」

2. 清空聊天历史
   Ctrl/Cmd + K

3. 重新创建会话
   点击「+」创建新会话
```

---

### 问题 8: 微信导出后图片无法显示

**现象**: 导出的 HTML 在微信编辑器中图片不显示

**原因**: 图片路径问题（相对路径 vs 绝对路径）

**解决方案**:

1. **使用绝对路径**:
```
确保图片使用绝对路径或网络 URL
```

2. **嵌入 base64**:
```
如需完全自包含，使用 base64 嵌入图片
```

3. **手动上传图片**:
```
微信编辑器手动上传本地图片
```

---

## 日志分析

### 关键日志点

**正常启动流程**:
```
OpenCodeChat: Plugin loaded
OpenCodeChat: Loaded data, sessions: 1
OpenCodeServer: Starting on port 14000, cwd: /vault/path
OpenCodeServer: Server started on port 14000
OpenCodeServer: SSE connected
OpenCodeChat: Server started on port 14000
```

**会话创建流程**:
```
OpenCodeChatView: Creating new session
OpenCodeServer: Creating session with permissions: [...]
OpenCodeServer: POST /session → 200
OpenCodeChatView: Session created: session-abc123
```

**消息发送流程**:
```
OpenCodeChatView: Processing command: /write start 主题
OpenCodeChatView: Preparing write workflow command
OpenCodeServer: Sending message to session session-abc123
OpenCodeServer: POST /session/session-abc123/prompt_async → 204
OpenCodeServer: text.delta event received
```

### 错误日志模式

**端口占用**:
```
OpenCodeServer: Port 14000 failed: EADDRINUSE
OpenCodeServer: Trying port 14001
```

**CLI 未找到**:
```
OpenCodeServer: ENOENT: no such file or directory, opencode
OpenCodeChat: OpenCode CLI not found. Please install it.
```

**SSE 断开**:
```
OpenCodeServer: SSE disconnected
OpenCodeServer: Reconnect attempt 1/5
OpenCodeServer: SSE connected
```

---

## 性能问题

### 问题：扫描大 vault 时卡顿

**症状**: `/kb audit` 命令执行缓慢

**解决方案**:

1. **缩小审计范围**:
```bash
# 仅扫描特定目录
/kb audit orphan 在 projects/ 目录下

# 仅扫描特定类型
/kb audit broken
```

2. **使用缓存结果**:
```
第一次扫描后，结果会缓存
再次执行相同审计会使用缓存
```

3. **排除大文件**:
```
在设置中配置排除目录
```

---

## 内存泄漏排查

### 症状

- Obsidian 运行越来越慢
- 内存占用持续增长
- 切换会话后内存不释放

### 诊断

```
1. 打开开发者工具 → Memory 标签
2. 点击「Garbage collect」
3. 查看内存占用
4. 执行操作（如切换会话）
5. 再次垃圾回收，查看内存是否释放
```

### 解决方案

```
1. 禁用插件后重新启用
2. 重启 Obsidian
3. 如持续存在，报告 GitHub Issue
```

---

## 获取帮助

### 提交 Issue

**GitHub Issues**: https://github.com/juncas/obsidian-opencode-chat/issues

**提供以下信息**:

1. **环境信息**:
   - Obsidian 版本
   - 插件版本
   - 操作系统（macOS/Windows/Linux）
   - Node.js 版本（如适用）

2. **错误日志**:
   - Console 完整输出
   - 截图

3. **重现步骤**:
   - 详细操作步骤
   - 预期行为
   - 实际行为

4. **其他信息**:
   - 是否首次安装
   - 是否最近更新
   - 是否有其他插件冲突

---

## 快速诊断清单

遇到问题时，按顺序检查:

- [ ] OpenCode CLI 已安装 (`opencode --version`)
- [ ] PATH 配置正确 (`echo $PATH`)
- [ ] 插件已启用 (设置 → 第三方插件)
- [ ] 状态徽章显示 "Connected"
- [ ] Console 无错误日志
- [ ] 技能文件存在 (`.opencode/skills/`)
- [ ] vault 路径可写
- [ ] 端口未被占用 (`lsof -i :14000`)

---

*最后更新：2026-02-19*
