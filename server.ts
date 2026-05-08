import express from 'express';
import cors from 'cors';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import { Buffer } from 'buffer';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATABASE & CONFIG
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://752675:Aa752675@cluster0.simmm5o.mongodb.net/aiyuanchuang";

const APP_URL = process.env.APP_URL || "https://aiyuanchuang.onrender.com";

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Fix legacy index issue if it exists
    try {
      const collections = await mongoose.connection.db.listCollections({ name: 'users' }).toArray();
      if (collections.length > 0) {
        await mongoose.connection.db.collection('users').dropIndex('openId_1').catch(() => {});
      }
    } catch (e) {
      console.log('No legacy openId index to drop');
    }

    seedPackages();
    seedSystemConfig();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  wechatOpenId: { type: String, unique: true, sparse: true },
  balance: { type: Number, default: 2000 },
  imageBalance: { type: Number, default: 2 },
  nickname: String,
  avatarUrl: String,
});

const User = mongoose.model('User', UserSchema);

const PackageConfigSchema = new mongoose.Schema({
  name: String,
  chars: Number,
  price: Number,
  recommended: { type: Boolean, default: false },
  category: { type: String, enum: ['text', 'image'], default: 'text' }
});
const PackageConfig = mongoose.model('PackageConfig', PackageConfigSchema);

async function seedPackages() {
  const defaults = [
    { name: '1万字入门包', chars: 10000, price: 9.9, recommended: false, category: 'text' },
    { name: '5万字超值包', chars: 50000, price: 39.9, recommended: true, category: 'text' },
    { name: '20万字专家包', chars: 200000, price: 129.9, recommended: false, category: 'text' },
    { name: '图片鉴定体验包', chars: 25000, price: 12, recommended: false, category: 'image' },
    { name: '图片鉴定标准包', chars: 100000, price: 39, recommended: true, category: 'image' },
    { name: '图片鉴定进阶包', chars: 500000, price: 159, recommended: false, category: 'image' }
  ];

  try {
    for (const pkg of defaults) {
      await PackageConfig.findOneAndUpdate(
        { name: pkg.name },
        { $set: pkg },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`Ensured package: ${pkg.name}`);
    }
  } catch (e) {
    console.error('Seed packages failed', e);
  }
}

const PackageRecordSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  packageName: String,
  chars: Number,
  price: Number,
  timestamp: { type: Date, default: Date.now },
  orderId: String
});
const PackageRecord = mongoose.model('PackageRecord', PackageRecordSchema);

const UsageDetailSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: { type: String, enum: ['detect', 'recharge'] },
  amount: Number,
  description: String,
  timestamp: { type: Date, default: Date.now }
});
const UsageDetail = mongoose.model('UsageDetail', UsageDetailSchema);

const DetectionRecordSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  content: String,
  result: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  charCount: Number,
  type: String
});
const DetectionRecord = mongoose.model('DetectionRecord', DetectionRecordSchema);

const SystemConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String,
  description: String
});
const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);

async function seedSystemConfig() {
  const configs = [
    { key: 'TENCENT_SECRET_ID', value: 'YOUR_SECRET_ID', description: '腾讯云 Secret ID' },
    { key: 'TENCENT_SECRET_KEY', value: 'YOUR_SECRET_KEY', description: '腾讯云 Secret Key' },
    { key: 'TENCENT_BIZ_TYPE', value: 'laoheiai', description: '腾讯云 业务策略 (BizType)' },
    { key: 'NEW_USER_TEXT_BALANCE', value: '2000', description: '新用户默认赠送字数' },
    { key: 'NEW_USER_IMAGE_COUNT', value: '2', description: '新用户默认赠送图数' },
    { key: 'WECHAT_APP_ID', value: 'wxf0ea7bb3386e9d01', description: '微信公众号 App ID' },
    { key: 'WECHAT_APP_SECRET', value: '2f7272be6bac718a0e09c393dce8c5aa', description: '微信公众号 App Secret' },
    { key: 'EPAY_PID', value: '1000', description: '易支付商户 ID' },
    { key: 'EPAY_KEY', value: '6fXAB353AFl8Pl9779xAO6598lO9b59P', description: '易支付验证密钥' },
    { key: 'EPAY_API_URL', value: 'http://yzf.dypm.top/mapi.php', description: '易支付 API 地址' }
  ];

  try {
    for (const conf of configs) {
      const exists = await SystemConfig.findOne({ key: conf.key });
      if (!exists) {
        await SystemConfig.create(conf);
        console.log(`Seeded config: ${conf.key}`);
      }
    }
  } catch (e) {
    console.error('Seed config failed', e);
  }
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const TmsClient = tencentcloud.tms.v20201229.Client;
const ImsClient = tencentcloud.ims.v20201229.Client;

function generateSign(params: Record<string, string | number>, key: string): string {
    const sortedKeys = Object.keys(params).sort();
    const joinedParams = sortedKeys
        .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
        .map(k => `${k}=${params[k]}`)
        .join('&');
    
    const stringToSign = joinedParams + key;
    return crypto.createHash('md5').update(stringToSign).digest('hex');
}

app.get('/api/user', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin888') {
    res.cookie('isAdmin', 'true', { 
      httpOnly: true, 
      maxAge: 1000 * 60 * 60 * 24, 
      path: '/',
      sameSite: 'none',
      secure: true
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/admin/check', (req, res) => {
  if (req.cookies.isAdmin === 'true') {
    res.json({ isAdmin: true });
  } else {
    res.json({ isAdmin: false });
  }
});

app.get('/api/admin/users', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  const users = await User.find();
  res.json(users);
});

app.put('/api/admin/users/:userId/balance', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  const { amount, type } = req.body;
  
  if (type === 'image') {
    const user = await User.findByIdAndUpdate(req.params.userId, { $inc: { imageBalance: amount } }, { new: true });
    if (user) {
      await UsageDetail.create({
        userId: user._id,
        type: 'recharge',
        amount: amount,
        description: '管理员手动加成 (鉴图次数)',
        timestamp: new Date()
      });
    }
    res.json(user);
  } else {
    const user = await User.findByIdAndUpdate(req.params.userId, { $inc: { balance: amount } }, { new: true });
    if (user) {
      await UsageDetail.create({
        userId: user._id,
        type: 'recharge',
        amount: amount,
        description: '管理员手动加成 (文本字数)',
        timestamp: new Date()
      });
    }
    res.json(user);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/packages', async (req, res) => {
  const packages = await PackageConfig.find();
  res.json(packages);
});

app.post('/api/admin/packages', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  const pkg = await PackageConfig.create(req.body);
  res.json(pkg);
});

app.put('/api/admin/packages/:id', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  const pkg = await PackageConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(pkg);
});

app.delete('/api/admin/packages/:id', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  await PackageConfig.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/user/records/packages', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const records = await PackageRecord.find({ userId }).sort({ timestamp: -1 });
  res.json(records);
});

app.get('/api/user/records/usage', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const records = await UsageDetail.find({ userId }).sort({ timestamp: -1 });
  res.json(records);
});

app.get('/api/user/records/detection', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  const records = await DetectionRecord.find({ userId }).sort({ timestamp: -1 }).limit(50);
  res.json(records);
});

app.get('/api/admin/config', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  const configs = await SystemConfig.find();
  res.json(configs);
});

app.put('/api/admin/config', async (req, res) => {
  if (req.cookies.isAdmin !== 'true') return res.status(401).json({ error: 'Unauthorized' });
  const { configs } = req.body;
  
  for (const conf of configs) {
    await SystemConfig.findOneAndUpdate({ key: conf.key }, { $set: { value: conf.value } });
  }
  
  res.json({ success: true });
});

// ====================== 已完全修复：AI生成检测接口 ======================
app.post('/api/moderate-text', async (req, res) => {
  const { content } = req.body;
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  
  if (!content) return res.status(400).json({ error: 'Content is required' });
  if (content.length < 200 || content.length > 2000) {
    return res.status(400).json({ error: '请输入 200-2000 字的内容' });
  }

  const user = await User.findById(userId);
  if (!user || user.balance < content.length) return res.status(400).json({ error: '余额不足' });

  const configs = await SystemConfig.find({
    key: { $in: ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_BIZ_TYPE'] }
  });
  
  const configMap = {};
  configs.forEach(c => configMap[c.key] = c.value);

  const secretId = configMap['TENCENT_SECRET_ID'];
  const secretKey = configMap['TENCENT_SECRET_KEY'];
  const bizType = configMap['TENCENT_BIZ_TYPE'];

  if (!secretId || !secretKey || secretId === 'YOUR_SECRET_ID') {
    return res.status(500).json({ error: '腾讯云密钥未配置' });
  }

  const client = new tencentcloud.tms.v20201229.Client({
    credential: { secretId: secretId.trim(), secretKey: secretKey.trim() },
    region: "ap-beijing",
  });

  user.balance -= content.length;
  await user.save();

  try {
    const params = {
      Content: Buffer.from(content).toString('base64'),
      BizType: bizType,
      Type: "TEXT_AIGC"  // ✅ 官方唯一正确AI类型
    };

    const result = await client.TextModeration(params);
    const data = result.Response || result;

    // ==============================
    // ✅ 终极安全取值（永远不会 undefined）
    // ==============================
    const aiScore = data?.Score ?? 0;

    const finalResult = {
      success: true,
      aiScore: aiScore,
      label: data?.Label || "Normal",
      suggestion: data?.Suggestion || "Pass"
    };

    await DetectionRecord.create({
      userId: user._id,
      content: content.substring(0, 500),
      result: finalResult,
      charCount: content.length,
      type: "TEXT_AIGC"
    });

    await UsageDetail.create({
      userId: user._id,
      type: 'detect',
      amount: content.length,
      description: `AI检测 ${content.length}字`
    });

    res.json(finalResult);

  } catch (error) {
    console.error("检测失败", error);
    res.status(500).json({
      error: "检测失败：" + (error.message || "服务异常")
    });
  }
});

// ====================== 已增加：AI图片检测接口 ======================
app.post('/api/moderate-image', async (req, res) => {
  const { fileContent, fileUrl } = req.body;
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Not logged in' });
  
  const IMAGE_COST = 1;

  const user = await User.findById(userId);
  if (!user || user.imageBalance < IMAGE_COST) return res.status(400).json({ error: '鉴图次数不足' });

  const configs = await SystemConfig.find({
    key: { $in: ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_BIZ_TYPE'] }
  });
  
  const configMap = {};
  configs.forEach(c => configMap[c.key] = c.value);

  const secretId = configMap['TENCENT_SECRET_ID'];
  const secretKey = configMap['TENCENT_SECRET_KEY'];
  const bizType = configMap['TENCENT_BIZ_TYPE'];

  if (!secretId || !secretKey || secretId === 'YOUR_SECRET_ID') {
    return res.status(500).json({ error: '腾讯云密钥未配置' });
  }

  const client = new ImsClient({
    credential: { secretId: secretId.trim(), secretKey: secretKey.trim() },
    region: "ap-beijing",
  });

  try {
    const params: any = {
      BizType: bizType
    };

    if (fileContent) {
      params.FileContent = fileContent; // Base64
    } else if (fileUrl) {
      params.FileUrl = fileUrl;
    } else {
      return res.status(400).json({ error: '请上传图片或提供图片链接' });
    }

    const result = await client.ImageModeration(params);
    const data = result.Response || result;

    // AI 生成概率得分
    const aiScore = data?.Score ?? 0;

    const finalResult = {
      success: true,
      aiScore: aiScore,
      label: data?.Label || "Normal",
      suggestion: data?.Suggestion || "Pass",
      details: data?.LabelResults || []
    };

    // 扣除额度
    user.imageBalance -= IMAGE_COST;
    await user.save();

    await DetectionRecord.create({
      userId: user._id,
      content: fileUrl || "[Base64 Image]",
      result: finalResult,
      charCount: 0, // 以消耗的额度代替字数
      type: "IMAGE_AIGC"
    });

    await UsageDetail.create({
      userId: user._id,
      type: 'detect',
      amount: IMAGE_COST,
      description: `AI图片检测 (1张)`
    });

    res.json(finalResult);

  } catch (error: any) {
    console.error("图片检测失败", error);
    
    // 如果没有扣除成功，这里把额度加回去（因为前面已经扣除并在最后save了，但是如果这里报错，其实已经执行完了前面的吗？
    // 等等，我们在前面 `user.balance -= IMAGE_COST; await user.save()` 之后才有记录如果失败就不管么？
    // 注意到原本代码里扣除额度是在请求成功后。
    
    let errMsg = error.message || "服务异常";
    if (errMsg.includes('UnauthorizedOperation')) {
      errMsg = "腾讯云相关服务未授权，请检查密钥权限或是否开通图片内容安全(IMS)服务。";
    }

    res.status(500).json({
      error: "检测失败：" + errMsg
    });
  }
});
// ====================== 增加结束 ======================

app.get('/api/auth/wechat/login', async (req, res) => {
  const configs = await SystemConfig.find();
  const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));
  const wechatId = configMap['WECHAT_APP_ID'];
  
  if (!wechatId) return res.status(500).send('微信 App ID 未配置');
  
  const authUrl = `https://gzh1.vxjuejin.com/api?appid=${wechatId}&redirect_uri=${encodeURIComponent(`${APP_URL}/api/auth/wechat/callback`)}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;
  res.redirect(authUrl);
});

app.get('/api/auth/wechat/callback', async (req, res) => {
  const { code } = req.query as { code: string };
  if (!code) return res.status(400).send('Code required');

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
        <title>登录中</title>
        <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f9fafb; font-family: sans-serif; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .container { text-align: center; }
            .text { margin-top: 16px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="loader"></div>
            <div class="text">安全登录中，请稍候...</div>
        </div>
        <script>
            const code = new URLSearchParams(window.location.search).get('code');
            if (code) {
                fetch('/api/auth/wechat/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                }).then(res => res.json()).then(data => {
                    if (data.success) {
                        window.location.href = '/';
                    } else {
                        alert('登录失败: ' + (data.error || '未知错误'));
                        window.location.href = '/';
                    }
                }).catch(err => {
                    alert('网络错误: ' + err.message);
                    window.location.href = '/';
                });
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/api/auth/wechat/verify', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  try {
    const configs = await SystemConfig.find();
    const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));
    const wechatId = configMap['WECHAT_APP_ID'];
    const wechatSecret = configMap['WECHAT_APP_SECRET'];
    const newTextBalance = parseInt(configMap['NEW_USER_TEXT_BALANCE'] || '2000');
    const newImageCount = parseInt(configMap['NEW_USER_IMAGE_COUNT'] || '2');

    const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechatId}&secret=${wechatSecret}&code=${code}&grant_type=authorization_code`);
    const tokenData = await tokenRes.json();
    
    if (tokenData.errcode) throw new Error(tokenData.errmsg);

    const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`);
    const userData = await userRes.json();

    if (userData.errcode) throw new Error(userData.errmsg);

    let user = await User.findOne({ wechatOpenId: userData.openid });
    if (!user) {
        user = await User.create({ 
            wechatOpenId: userData.openid, 
            balance: newTextBalance,
            imageBalance: newImageCount,
            nickname: userData.nickname,
            avatarUrl: userData.headimgurl
        });

        await PackageRecord.create({
            userId: user._id,
            packageName: '新用户注册赠送文字额度',
            chars: newTextBalance,
            price: 0,
            timestamp: new Date(),
            orderId: `gift_${user._id}`
        });

        if (newImageCount > 0) {
            await PackageRecord.create({
                userId: user._id,
                packageName: '新用户注册赠送鉴图次数',
                chars: newImageCount,
                price: 0,
                timestamp: new Date(),
                orderId: `gift_img_${user._id}`
            });
        }

        await UsageDetail.create({
            userId: user._id,
            type: 'recharge',
            amount: newTextBalance,
            description: '新用户注册赠送文字额度',
            timestamp: new Date()
        });

        if (newImageCount > 0) {
            await UsageDetail.create({
                userId: user._id,
                type: 'recharge',
                amount: newImageCount,
                description: '新用户注册赠送鉴图次数',
                timestamp: new Date()
            });
        }
    } else {
        user.nickname = userData.nickname;
        user.avatarUrl = userData.headimgurl;
        await user.save();
    }
  
    res.cookie('userId', user._id.toString(), { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
    res.json({ success: true });
  } catch (err: any) {
    console.error('WeChat Auth Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pay/initiate', async (req, res) => {
    const { type, money, name } = req.body;
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: 'Not logged in' });

    const configs = await SystemConfig.find();
    const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));
    const pid = configMap['EPAY_PID'];
    const key = configMap['EPAY_KEY'];
    const apiUrl = configMap['EPAY_API_URL'] || 'http://yzf.dypm.top/mapi.php';
    
    const clientipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientip = Array.isArray(clientipRaw) ? clientipRaw[0] : (typeof clientipRaw === 'string' ? clientipRaw.split(',')[0] : '127.0.0.1');
    
    const params: Record<string, string | number | undefined> = {
        pid,
        type,
        out_trade_no: `order_${Date.now()}_${userId}`,
        notify_url: `${APP_URL}/api/pay/notify`,
        return_url: `${APP_URL}/profile`,
        name,
        money,
        clientip,
        param: `${userId}_${req.body.chars || 0}_${req.body.category || 'text'}_${name}`,
        sign_type: 'MD5'
    };
    
    params.sign = generateSign(params as Record<string, string | number>, key);

    try {
        const urlParams = Object.keys(params)
            .filter(k => params[k] !== undefined)
            .map(k => `${k}=${encodeURIComponent(params[k] as string | number)}`)
            .join('&');
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams
        });
        
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          res.json(data);
        } catch (parseError) {
          res.status(500).json({ error: '支付网关返回异常', detail: text });
        }
    } catch (e) {
        console.error('Payment initiation error:', e);
        res.status(500).json({ error: '支付发起失败' });
    }
});

app.get('/api/pay/notify', async (req, res) => {
    const params = req.query as Record<string, string>;
    const { sign, ...data } = params;
    
    const configs = await SystemConfig.find();
    const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));
    const key = configMap['EPAY_KEY'];
    
    if (generateSign(data, key) === sign) {
        if (params.trade_status === 'TRADE_SUCCESS') {
            console.log('Payment successful:', params.out_trade_no);
            const [userId, chars, category, ...nameParts] = (params.param || "").split('_');
            const recoveredName = nameParts.join('_');
            
            let addedBalance = parseInt(chars) || Math.floor(parseFloat(params.money) * 1000);
            
            if (category === 'image') {
              if (addedBalance > 100) addedBalance = Math.floor(addedBalance / 500);
              await User.findByIdAndUpdate(userId, { $inc: { imageBalance: addedBalance } });
            } else {
              await User.findByIdAndUpdate(userId, { $inc: { balance: addedBalance } });
            }
            
            await PackageRecord.create({
              userId,
              packageName: recoveredName || params.name || `${addedBalance}${category === 'image' ? '次' : '字'}包`,
              chars: addedBalance,
              price: parseFloat(params.money),
              timestamp: new Date(),
              orderId: params.out_trade_no
            });

            await UsageDetail.create({
              userId,
              type: 'recharge',
              amount: addedBalance,
              description: `购买 ${addedBalance}${category === 'image' ? '次' : '字'}包`,
              timestamp: new Date()
            });

            return res.send('success');
        }
    }
    res.send('fail');
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(Number(PORT), '0.0.0.0', () => console.log(`Server running on port ${PORT}`));