
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, UserPlus, ShieldCheck, LogOut, Users, Package, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'packages' | 'settings'>('users');
  
  // System settings
  const [configs, setConfigs] = useState<any[]>([]);
  const [isSavingConfigs, setIsSavingConfigs] = useState(false);
  
  // Custom balance modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAddType, setBalanceAddType] = useState<'text' | 'image'>('text');
  const [customAmount, setCustomAmount] = useState('');

  // New package form
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgChars, setPkgChars] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgRecommended, setPkgRecommended] = useState(false);
  const [pkgCategory, setPkgCategory] = useState<'text' | 'image'>('text');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/check');
      const data = await res.json();
      if (data.isAdmin) {
        setIsAdmin(true);
        fetchData();
      }
    } catch (e) {
      console.error('Check admin status failed', e);
    }
  };

  const fetchData = () => {
    fetchUsers();
    fetchPackages();
    fetchConfigs();
  };

  const fetchConfigs = async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) setConfigs(await res.json());
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
  };

  const handleSaveConfigs = async () => {
    setIsSavingConfigs(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });
      if (res.ok) {
        toast.success('配置已保存');
      } else {
        toast.error('保存失败');
      }
    } catch (e) {
      toast.error('网络错误');
    } finally {
      setIsSavingConfigs(false);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setIsAdmin(true);
      fetchData();
    } else {
      toast.error('登录失败');
    }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
  };

  const fetchPackages = async () => {
    const res = await fetch('/api/packages');
    if (res.ok) setPackages(await res.json());
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || !customAmount) return;
    
    let amount = parseInt(customAmount);
    if (isNaN(amount)) {
      toast.error('请输入正确的数值');
      return;
    }

    const res = await fetch(`/api/admin/users/${selectedUser._id}/balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, type: balanceAddType }),
    });
    if (res.ok) {
        toast.success(`充值成功`);
        setShowBalanceModal(false);
        setCustomAmount('');
        fetchUsers();
    } else {
        toast.error('充值失败');
    }
  };

  const handleSavePackage = async () => {
    if (!pkgName || !pkgChars || !pkgPrice) {
      toast.error('请填写完整信息');
      return;
    }

    const payload = {
      name: pkgName,
      chars: pkgCategory === 'image' ? parseInt(pkgChars) * 500 : parseInt(pkgChars),
      price: parseFloat(pkgPrice),
      recommended: pkgRecommended,
      category: pkgCategory
    };

    const url = editingPkg ? `/api/admin/packages/${editingPkg._id}` : '/api/admin/packages';
    const method = editingPkg ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      toast.success(editingPkg ? '更新成功' : '创建成功');
      setShowPkgForm(false);
      setEditingPkg(null);
      resetPkgForm();
      fetchPackages();
    } else {
      toast.error('操作失败');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('确定删除此套餐吗？')) return;
    const res = await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('删除成功');
      fetchPackages();
    }
  };

  const resetPkgForm = () => {
    setPkgName('');
    setPkgChars('');
    setPkgPrice('');
    setPkgRecommended(false);
    setPkgCategory('text');
  };

  const startEditPackage = (pkg: any) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgChars(pkg.category === 'image' ? (pkg.chars / 500).toString() : pkg.chars.toString());
    setPkgPrice(pkg.price.toString());
    setPkgRecommended(pkg.recommended);
    setPkgCategory(pkg.category || 'text');
    setShowPkgForm(true);
  };

  const filteredUsers = users.filter(user => 
    (user.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.wechatOpenId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
             <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <ShieldCheck className="size-8" />
             </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">管理员登录</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
              <input 
                className="w-full border-gray-300 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="请输入管理员账号" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input 
                className="w-full border-gray-300 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="请输入密码" 
              />
            </div>
            <button 
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 mt-4 text-lg" 
              onClick={handleLogin}
            >
              登 录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Admin Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600 size-6" />
            <h1 className="text-xl font-bold text-gray-900">后台管理系统</h1>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-gray-500 text-sm flex items-center gap-1"
          >
            <LogOut className="size-4" />
            返回首页
          </button>
        </div>
        
        {/* Tab Switcher */}
        <div className="max-w-4xl mx-auto px-4 flex gap-8">
          <button 
            onClick={() => setActiveTab('users')}
            className={`py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          >
            <span className="flex items-center gap-2">
              <Users className="size-4" />
              会员管理
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('packages')}
            className={`py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'packages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          >
            <span className="flex items-center gap-2">
              <Package className="size-4" />
              套餐管理
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              系统设置
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-2 space-y-3">
        {/* Balance Adjustment Modal */}
        {showBalanceModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900">充值字数</h3>
                  <button onClick={() => setShowBalanceModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="size-6" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-6 bg-gray-50 p-4 rounded-2xl">
                  <img src={selectedUser.avatarUrl} className="size-12 rounded-full border border-white shadow-sm" alt="" />
                  <div>
                    <h4 className="font-bold text-gray-900">{selectedUser.nickname || '未设置昵称'}</h4>
                    <p className="text-xs text-blue-600 font-bold">字数: {selectedUser.balance?.toLocaleString()} | 鉴图: {selectedUser.imageBalance?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center p-1 bg-gray-100 rounded-xl">
                    <button
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${balanceAddType === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                      onClick={() => { setBalanceAddType('text'); setCustomAmount(''); }}
                    >
                      增加字数
                    </button>
                    <button
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${balanceAddType === 'image' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                      onClick={() => { setBalanceAddType('image'); setCustomAmount(''); }}
                    >
                      增加鉴图次数
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                       {balanceAddType === 'text' ? '增加额度 (字数)' : '增加额度 (鉴图次数)'}
                    </label>
                    <input 
                      type="number"
                      className="w-full border-2 border-gray-100 bg-gray-50 p-4 rounded-2xl focus:border-blue-500 focus:bg-white focus:outline-none text-xl font-black transition-all"
                      placeholder={balanceAddType === 'text' ? "如: 10000" : "如: 50"}
                      autoFocus
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-2 mb-4">支持负数，输入负数即可扣除{balanceAddType === 'text' ? '字数' : '次数'}</p>
                  </div>

                  <button 
                    onClick={handleUpdateBalance}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-200"
                  >
                    确认充值
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' ? (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-xs text-gray-500 mb-1">总会员数</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-xs text-gray-500 mb-1">活跃会员</p>
                <p className="text-2xl font-bold text-green-600">{filteredUsers.length}</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
              <input 
                type="text" 
                placeholder="搜索昵称或 OpenID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm text-lg"
              />
            </div>

            {/* User list */}
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <div key={user._id} className="bg-white rounded-2xl border p-4 shadow-sm">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors p-1"
                    onClick={() => { setSelectedUser(user); setShowBalanceModal(true); setBalanceAddType('text'); }}
                  >
                    <img src={user.avatarUrl} className="size-12 rounded-full border" alt="" />
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-gray-900 truncate">{user.nickname || '未设置昵称'}</h3>
                      <p className="text-xs text-gray-400 truncate font-mono">{user.wechatOpenId}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-gray-500 mb-0.5">文本字数 / 鉴图次数</p>
                       <p className="font-bold text-blue-600">{user.balance?.toLocaleString() || 0} / {user.imageBalance?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                   <Search className="size-12 mx-auto mb-3 opacity-20" />
                   <p>没有找到相关会员</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'packages' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">收费套餐列表</h2>
              <button 
                onClick={() => { resetPkgForm(); setEditingPkg(null); setShowPkgForm(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1"
              >
                <Plus className="size-4" />
                新增套餐
              </button>
            </div>

            {showPkgForm && (
              <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">{editingPkg ? '编辑套餐' : '新建套餐'}</h3>
                  <button onClick={() => setShowPkgForm(false)} className="text-gray-400"><X className="size-5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2 text-center flex bg-gray-100 p-1 rounded-xl mb-2">
                    <button 
                      onClick={() => setPkgCategory('text')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pkgCategory === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      文字检测包
                    </button>
                    <button 
                      onClick={() => setPkgCategory('image')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${pkgCategory === 'image' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      图片检测包
                    </button>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">套餐标题 (如: 10万字超值包)</label>
                    <input className="w-full border p-2 rounded-lg text-sm" value={pkgName} onChange={e => setPkgName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{pkgCategory === 'image' ? '鉴定次数' : '字数 (整数)'}</label>
                    <input className="w-full border p-2 rounded-lg text-sm" type="number" value={pkgChars} onChange={e => setPkgChars(e.target.value)} />
                    {pkgCategory === 'image' && <p className="text-[10px] text-gray-400 mt-1">后台将存储为 {parseInt(pkgChars) * 500 || 0} 积分</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">价格 (元)</label>
                    <input className="w-full border p-2 rounded-lg text-sm" type="number" step="0.01" value={pkgPrice} onChange={e => setPkgPrice(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input type="checkbox" id="recom" checked={pkgRecommended} onChange={e => setPkgRecommended(e.target.checked)} />
                  <label htmlFor="recom" className="text-sm font-medium text-gray-700">标记为“推荐”</label>
                </div>
                <button 
                  onClick={handleSavePackage}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Save className="size-4" />
                  保存套餐
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {packages.map(pkg => (
                <div key={pkg._id} className={`bg-white rounded-2xl border p-4 shadow-sm relative overflow-hidden ${pkg.recommended ? 'border-blue-200 ring-2 ring-blue-50 ring-offset-0' : ''}`}>
                  {pkg.recommended && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg">
                      推荐
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 mb-1">
                    {pkg.name}
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-tighter">
                      {pkg.category === 'image' ? '图片包' : '文字包'}
                    </span>
                  </h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-black text-blue-600">¥{pkg.price}</span>
                    <span className="text-sm text-gray-400">/ {pkg.category === 'image' ? `${pkg.chars / 500} 次` : `${pkg.chars.toLocaleString()} 字`}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEditPackage(pkg)}
                      className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 border"
                    >
                      <Edit2 className="size-3" />
                      编辑
                    </button>
                    <button 
                      onClick={() => handleDeletePackage(pkg._id)}
                      className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 border border-red-100"
                    >
                      <Trash2 className="size-3" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
              
              {packages.length === 0 && !showPkgForm && (
                <div className="col-span-full text-center py-20 text-gray-400">
                  <Package className="size-12 mx-auto mb-3 opacity-20" />
                  <p>暂无套餐，点击右上角新增</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-4">系统环境与接口配置</h2>
            
            <div className="space-y-4">
              {configs.map(conf => (
                <div key={conf.key}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{conf.description} ({conf.key})</label>
                  <input 
                    type="text"
                    className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                    value={conf.value}
                    onChange={(e) => handleConfigChange(conf.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSaveConfigs}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                disabled={isSavingConfigs}
              >
                {isSavingConfigs ? '正在保存...' : '保存系统设置'}
              </button>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-6">
              <h4 className="text-sm font-bold text-amber-800 mb-1">注意事项</h4>
              <p className="text-xs text-amber-600 leading-relaxed">
                1. 修改配置后立即生效，无需重启服务器。<br/>
                2. 微信、易支付和腾讯云相关密钥至关重要，请确保填写真实有效的后台参数。<br/>
                3. 新用户注册默认赠送额度直接影响用户表内 balance，文字和图数按 1图=500字 比例内部转换计算汇总。
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
