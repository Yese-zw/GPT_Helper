# ChatGPT 账号入库助手

这是一个用于 OpenAI 注册、Codex OAuth 授权和 SUB2API 账号入库的 Chrome MV3 扩展。它会按邮箱池逐个执行注册流程，在需要验证码时弹窗暂停，最终把授权账号导入 SUB2API。

## 本地加载

1. 打开 `chrome://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录：`manual-codex2api-flow`。

## 启动前配置

在扩展侧边栏里先填写：

- `邮箱号池`，一行一个邮箱。
- `手机号池`，一行一个 `手机号----短信验证码接收链接`。
- `SUB2API 地址`
- `SUB2API Admin API Key`
- `SUB2API OpenAI 分组`
- `密码`，可留空自动生成。

## 流程

1. 打开 ChatGPT 官网。
2. 注册并输入邮箱。
3. 手动输入邮箱验证码。
4. 填写姓名和生日。
5. 生成 SUB2API OpenAI OAuth 授权链接并登录 Codex。
6. 如遇手机号验证，按手机号池顺序发送并获取短信验证码。
7. 确认 OAuth，扩展点击继续并监听 localhost 回调。
8. 回填授权 code，调用 SUB2API 管理接口完成账号入库。

## SUB2API 接口

扩展主要使用这些接口：

- `GET /api/v1/admin/groups/all`
- `POST /api/v1/admin/openai/generate-auth-url`
- `POST /api/v1/admin/openai/create-from-oauth`
- `PUT /api/v1/admin/accounts/:id`，仅用于尝试补充备注；失败不会影响入库完成。

请求头会携带：

```http
x-api-key: <Admin API Key>
```

## 说明

这个版本以“成功导入 SUB2API”为最终完成状态。导入成功后会清理 OpenAI/ChatGPT Cookies，关闭当前注册标签页，并自动准备下一轮邮箱。
