# 财务规划工具

一个本地优先的个人财务规划网页。支持收入拆解、五险一金展示、账单/支出/目标管理、每月实际攒钱记录、15万目标倒推和手机桌面安装。

## 手机长期使用方式

推荐发布到 GitHub Pages：

1. 打开 GitHub，创建一个新仓库，例如 `finance-planner`。
2. 上传本文件夹里的全部文件。
3. 进入仓库 `Settings` -> `Pages`。
4. `Build and deployment` 选择 `Deploy from a branch`。
5. Branch 选择 `main`，文件夹选择 `/root`，保存。
6. 等 1-2 分钟后，GitHub 会给出网站地址。

手机打开网站后：

- iPhone Safari：点分享按钮 -> 添加到主屏幕。
- Android Chrome：点右上角菜单 -> 添加到主屏幕/安装应用。

你的工资、账单、存款等数据默认保存在当前手机浏览器本地，不会自动上传到 GitHub。

## 文件

- `index.html`：网页入口
- `styles.css`：界面样式
- `app.js`：财务规划逻辑
- `manifest.webmanifest`：手机安装配置
- `sw.js`：离线缓存
- `icon.svg`：应用图标
