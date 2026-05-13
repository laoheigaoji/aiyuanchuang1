import { useState, useEffect } from 'react';
import { User, Package, TrendingUp, History, CreditCard, ChevronRight, Home, Loader2, Headset, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ProfilePageProps {
  balance: number;
  imageBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
  nickname: string;
  avatarUrl: string;
  onPurchaseSuccess?: () => void;
}

export default function ProfilePage({
  balance,
  imageBalance,
  onBalanceUpdate,
  nickname,
  avatarUrl,
  onPurchaseSuccess
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'packages' | 'records' | 'usage' | 'history'>('packages');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [pkgCategory, setPkgCategory] = useState<'text' | 'image'>('text');
  
  const [packages, setPackages] = useState<any[]>([]);
  const [packageRecords, setPackageRecords] = useState<any[]>([]);
  const [usageDetails, setUsageDetails] = useState<any[]>([]);
  const [detectionHistory, setDetectionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCustomerServiceOpen, setIsCustomerServiceOpen] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (activeTab === 'packages') fetchPackages();
    if (activeTab === 'records') fetchPackageRecords();
    if (activeTab === 'usage') fetchUsageDetails();
    if (activeTab === 'history') fetchDetectionHistory();
  }, [activeTab]);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/packages');
      if (res.ok) setPackages(await res.json());
    } catch (e) {
      console.error('Fetch packages failed', e);
    }
  };

  const fetchPackageRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/records/packages');
      if (res.ok) setPackageRecords(await res.json());
    } catch (e) {
      console.error('Fetch records failed', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/records/usage');
      if (res.ok) setUsageDetails(await res.json());
    } catch (e) {
      console.error('Fetch usage failed', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetectionHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/records/detection');
      if (res.ok) setDetectionHistory(await res.json());
    } catch (e) {
      console.error('Fetch history failed', e);
    } finally {
      setLoading(false);
    }
  };

  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPolling) {
      const initialBalance = balance;
      const initialImageBalance = imageBalance;
      timer = setInterval(async () => {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const userData = await res.json();
            if (userData.balance > initialBalance || (userData.imageBalance && userData.imageBalance > initialImageBalance)) {
              if (userData.balance > initialBalance) {
                onBalanceUpdate(userData.balance);
              }
              if (onPurchaseSuccess) {
                onPurchaseSuccess();
              }
              setIsPolling(false);
              setShowPurchaseModal(false);
              toast.success('支付成功，余额已更新！', { id: 'payment' });
            }
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPolling, balance, imageBalance, onBalanceUpdate, onPurchaseSuccess]);

  const handlePurchase = (pkg: any) => {
    setSelectedPackage(pkg);
    setIsPolling(false);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedPackage) return;

    toast.loading('正在准备支付链接...', { id: 'payment' });

    try {
      const res = await fetch('/api/pay/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'alipay', 
          money: selectedPackage.price.toString(), 
          name: `${selectedPackage.name}`,
          chars: selectedPackage.chars,
          category: selectedPackage.category || 'text'
        })
      });
      const data = await res.json();
      console.log('Payment API response:', data);
      
      if (data.code === 1) {
        toast.success('正引导至支付页面...', { id: 'payment' });
        const redirectUrl = data.qrcode;
        if (redirectUrl) {
          setIsPolling(true);
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          
          if (isMobile) {
            window.location.href = redirectUrl;
          } else {
            window.open(redirectUrl, '_blank');
            toast.info('请在打开的页面中完成支付，支付完成后此处将自动更新余额', { id: 'payment-hint', duration: 10000 });
          }
        } else {
          toast.error('支付跳转链接提取失败', { id: 'payment' });
        }
      } else {
        const errorMsg = data.msg || data.error || '未知错误';
        toast.error('支付发起失败: ' + errorMsg, { id: 'payment' });
        console.error('Payment failure:', data);
      }
    } catch (e) {
      console.error('Purchase error:', e);
      toast.error('网络错误，请稍后重试', { id: 'payment' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-2 pb-16">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* User Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-sm p-4 text-white relative">
          <button 
            onClick={() => setIsCustomerServiceOpen(true)}
            className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center justify-center border border-white/10"
            title="在线客服"
          >
            <Headset className="size-4" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <img src={avatarUrl} alt={nickname} className="size-12 rounded-full border-2 border-white shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{nickname && nickname.length > 5 ? nickname.substring(0, 5) + '...' : nickname}</h2>
              <p className="text-xs opacity-90">个人中心</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center divide-x divide-white/20">
            <div className="flex-1 text-center">
              <p className="text-xs opacity-90 mb-0.5">可用文字额度</p>
              <p className="text-2xl font-bold tracking-tight">{balance.toLocaleString()}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs opacity-90 mb-0.5">可用鉴图次数</p>
              <p className="text-2xl font-bold tracking-tight">{imageBalance?.toLocaleString() || 0} <span className="text-base">次</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="grid grid-cols-4 bg-gray-50/50">
            {[
              { id: 'packages', label: '购买套餐' },
              { id: 'records', label: '套餐记录' },
              { id: 'usage', label: '使用明细' },
              { id: 'history', label: '检测记录' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-xs font-bold transition-all relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading && (
              <div className="flex justify-center py-20">
                <Loader2 className="size-8 text-blue-600 animate-spin" />
              </div>
            )}

            {!loading && (
              <>
                {/* Packages Tab */}
                {activeTab === 'packages' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                         <CreditCard className="size-4 text-blue-600" />
                         购买资源包
                      </h3>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg">
                        <button 
                          onClick={() => setPkgCategory('text')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${pkgCategory === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                          文字包
                        </button>
                        <button 
                          onClick={() => setPkgCategory('image')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${pkgCategory === 'image' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                          图片包
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {packages
                        .filter(p => p.category === pkgCategory || (!p.category && pkgCategory === 'text'))
                        .map((pkg) => (
                        <div
                          key={pkg._id}
                          onClick={() => handlePurchase(pkg)}
                          className={`relative border rounded-xl p-4 transition-all cursor-pointer group hover:shadow-sm ${
                            pkg.recommended ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-300'
                          }`}
                        >
                          {pkg.recommended && (
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">
                              推荐
                            </div>
                          )}
                          <div className="flex flex-col h-full">
                            <h4 className="font-bold text-sm text-gray-900 mb-0.5 group-hover:text-blue-600 transition">
                              {pkg.name}
                            </h4>
                            <p className="text-[10px] text-gray-500 mb-3">
                              {pkgCategory === 'image' 
                                ? `${pkg.chars / 500} 次图片鉴定` 
                                : `${pkg.chars.toLocaleString()} 字符 ・ 约 ${Math.floor(pkg.chars / 1000)} 次检测`
                              }
                            </p>
                            <div className="mt-auto flex items-end justify-between">
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-xs font-bold text-blue-600">¥</span>
                                  <span className="text-lg font-black text-blue-600 tracking-tight">{pkg.price}</span>
                                </div>
                                {pkgCategory === 'image' && (
                                  <span className="text-[9px] font-bold text-gray-400">单价: ¥{(pkg.price / (pkg.chars / 500)).toFixed(2)} / 次</span>
                                )}
                              </div>
                              <div className="bg-blue-600 text-white size-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm">
                                <ChevronRight className="size-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase Records Tab */}
                {activeTab === 'records' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 mb-4 tracking-tight">套餐购买明细</h3>
                    {packageRecords.length === 0 ? (
                      <div className="text-center py-16">
                        <Package className="size-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400">暂无购买记录</p>
                      </div>
                    ) : (
                      packageRecords.map((record, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-100 rounded-lg p-3 group hover:bg-white hover:border-gray-200 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-900 text-sm">
                              {record.packageName}
                            </span>
                            <span className="text-blue-600 font-bold text-sm">¥{record.price}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-500 gap-2">
                            <span className="font-mono truncate max-w-[150px] sm:max-w-none break-all" title={record.orderId}>#{record.orderId}</span>
                            <span className="shrink-0">{new Date(record.timestamp).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Usage Details Tab */}
                {activeTab === 'usage' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 mb-4">字数收支明细</h3>
                    {usageDetails.length === 0 ? (
                      <div className="text-center py-16">
                        <TrendingUp className="size-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400">暂无使用明细</p>
                      </div>
                    ) : (
                      usageDetails.map((detail, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center justify-between group hover:bg-white transition">
                          <div>
                            <p className="font-bold text-gray-900 text-xs mb-0.5">{detail.description}</p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                              {new Date(detail.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <span
                             className={`font-black text-sm ${
                               detail.type === 'recharge' ? 'text-green-500' : 'text-red-500'
                             }`}
                          >
                             {detail.type === 'recharge' ? '+' : '-'}
                             {detail.description?.includes('图片') 
                               ? `${Math.floor(detail.amount / 500)} 次`
                               : detail.amount.toLocaleString()
                             }
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Detection History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 mb-4">最近检测记录</h3>
                    {detectionHistory.length === 0 ? (
                      <div className="text-center py-16">
                        <History className="size-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400">暂无检测记录</p>
                      </div>
                    ) : (
                      detectionHistory.map((record, index) => {
                        const res = record.result?.Response || record.result;
                        const isAIGC = record.type === 'TEXT_AIGC' || record.type === 'IMAGE_AIGC';
                        
                        let statusColor = 'bg-green-100 text-green-700';
                        let statusText = '正常';
                        
                        if (isAIGC) {
                          const score = res?.aiScore ?? res?.Score ?? 0;
                          if (res?.Suggestion === 'Block' || score >= 80) {
                            statusColor = 'bg-red-100 text-red-700';
                            statusText = '极高生成概率';
                          } else if (res?.Suggestion === 'Review' || score >= 40) {
                            statusColor = 'bg-yellow-100 text-yellow-700';
                            statusText = '疑似 AI 生成';
                          } else {
                            statusText = '原创度高';
                          }
                        } else {
                          if (res?.Suggestion === 'Block') {
                            statusColor = 'bg-red-100 text-red-700';
                            statusText = '违规';
                          } else if (res?.Suggestion === 'Review') {
                            statusColor = 'bg-yellow-100 text-yellow-700';
                            statusText = '审核';
                          }
                        }

                        return (
                          <div key={index} className="bg-gray-50 border border-gray-100 rounded-lg p-3 hover:shadow-sm transition">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] text-gray-400 font-medium">
                                {new Date(record.timestamp).toLocaleString('zh-CN')}
                              </span>
                              <div
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}
                              >
                                {statusText}
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-700 mb-2 bg-white p-2 rounded-md border border-gray-50 overflow-hidden text-ellipsis">
                              {record.type === 'IMAGE_AIGC' ? (
                                <div className="flex items-center gap-1 text-indigo-600 font-medium">
                                  <ImageIcon className="size-3" />
                                  <span>[图片检测] {record.content === '[Base64 Image]' ? '本地上传图片' : '网络图片'}</span>
                                </div>
                              ) : (
                                <p className="italic line-clamp-2">"{record.content}..."</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                              <span className="flex items-center gap-0.5">
                                 <History className="size-2.5" />
                                 {record.type === 'IMAGE_AIGC' ? '1 次' : `${record.charCount} 字符`} ・ {record.type === 'IMAGE_AIGC' ? '图片鉴定' : (isAIGC ? 'AI 识别' : '内容审核')}
                              </span>
                              <span className="text-blue-600">
                                {isAIGC ? `概率: ${res?.aiScore ?? res?.Score ?? 0}%` : (res?.Label || '未知')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">支付详情报告</h3>

            <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 font-medium">项目</span>
                <span className="font-bold text-gray-900">{selectedPackage.name}</span>
              </div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-gray-500 font-medium">合计金额</span>
                <span className="text-3xl font-black text-blue-600">¥{selectedPackage.price}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <CreditCard className="size-4" />
                  <span>支付网关: 支付宝 (Alipay Secure)</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition text-sm"
              >
                放弃购买
              </button>
              <button
                onClick={confirmPurchase}
                disabled={isPolling}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPolling ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    支付确认中...
                  </>
                ) : (
                  '立即支付'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Service Modal */}
      {isCustomerServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsCustomerServiceOpen(false)}>
          <div className="relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsCustomerServiceOpen(false)}
              className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all border border-white/20"
            >
              <X className="size-6" />
            </button>
            <img 
              src="https://wxqun988.vxjuejin.com/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260429095846_208_4.jpg" 
              alt="客服二维码" 
              className="w-72 h-72 rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
