# 部署操作指南：Vercel(前端) + Railway(后端)

## 架构概览

```
用户浏览器
  ├── 静态页面 ──→ Vercel (CDN 加速)
  └── WebSocket ──→ Railway (海外服务器)
```

## 前置条件

- 代码已推送到 GitHub 仓库
- 拥有 GitHub 账号（用于登录 Railway 和 Vercel）
- 拥有 DeepSeek API Key

---

## Step 1: 推送代码到 GitHub

```bash
cd d:\AI尝试

# 如果还没有 remote，添加 GitHub 仓库地址
git remote add origin https://github.com/你的用户名/你的仓库.git

# 推送到 GitHub
git push -u origin master
```

> 如果仓库已有 remote，可用 `git remote set-url origin <新地址>` 修改。

---

## Step 2: Railway 部署后端

1. 登录 https://railway.app （用 GitHub 账号）
2. **New Project** → **Deploy from GitHub repo** → 选择你的仓库
3. 进入项目 **Settings**：
   - **Root Directory** 设为 `server`
4. 进入 **Variables** 添加环境变量：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
   - `PORT` = （**不需要手动添加**，Railway 会自动注入）
5. 等待部署成功
6. 进入 **Settings** → **Networking** → **Generate Domain**，得到类似 `xxx.up.railway.app` 的地址
7. **记录这个地址**，下一步 Vercel 需要用

---

## Step 3: Vercel 部署前端

1. 登录 https://vercel.com （用 GitHub 账号）
2. **Add New Project** → **Import Git Repository** → 选择你的仓库
3. **Configure Project**：
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **环境变量**:
     - `VITE_SOCKET_URL` = `https://xxx.up.railway.app`（填上一步得到的 Railway 地址，注意带 `https://`）
4. 点击 **Deploy**

---

## Step 4: 域名绑定（可选）

### 自定义域名指向 Vercel

1. 在阿里云（或其他域名服务商）添加 CNAME 记录：
   - 主机记录：你想用的子域名（如 `game`）
   - 记录类型：CNAME
   - 记录值：`cname.vercel-dns.com`
2. 在 Vercel 项目 **Settings** → **Domains** 中添加自定义域名（如 `game.你的域名.com`）
3. Vercel 会自动配置 SSL 证书

---

## 验证清单

1. [ ] 访问 Vercel 分配的域名，页面正常加载
2. [ ] 浏览器控制台无 WebSocket 连接错误
3. [ ] 开两个浏览器窗口，分别创建/加入房间
4. [ ] 提交答案，确认战斗流程正常（出题→答题→评判→展示结果）
5. [ ] 多轮战斗正常进行
6. [ ] game_over 后重开功能正常

---

## 常见问题

### Q: WebSocket 连接失败？
- 检查 Vercel 环境变量 `VITE_SOCKET_URL` 是否正确（需包含 `https://`）
- 检查 Railway 后端是否正常运行（访问 `https://xxx.up.railway.app` 应无连接错误）
- 确认 Railway 的 Networking 中已生成域名

### Q: Railway 部署失败？
- 确认 Root Directory 设置为 `server`
- 查看 Railway 部署日志排查错误
- 确认 `DEEPSEEK_API_KEY` 环境变量已设置

### Q: 需要更新代码后重新部署？
- 推送新代码到 GitHub 后，Railway 和 Vercel 都会自动重新部署
- 如果 Vercel 未自动部署，可在 Vercel Dashboard 手动触发 Redeploy
