import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Trash2, X, TrendingUp, Activity, HelpCircle, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';

interface HomePageProps {
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
  onAddHistory: (record: any) => void;
  onAddUsageDetail: (detail: any) => void;
}

export default function HomePage({
  balance,
  onBalanceUpdate,
  onAddHistory,
  onAddUsageDetail,
}: HomePageProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const resultRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const isValidLength = charCount >= 200 && charCount <= 2000;
  const hasEnoughBalance = balance >= charCount;

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [result]);


  const handleDetect = async () => {
    if (!isValidLength) {
      toast.error('请输入 200-2000 字的文本');
      return;
    }

    if (!hasEnoughBalance) {
      toast.error('字数余额不足，请前往个人中心充值');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/moderate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: text, type: 'TEXT_AIGC' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '检测服务请求失败');
      }

      const data = await response.json();
      
      // 腾讯云 SDK 返回的对象可能直接包含结果，也可能嵌套在 Response 中
      const resData = data.Response || data;

      // 根据腾讯云 TEXT_AIGC 文档规范解读结果
      // Suggestion: Block (高概率), Review (疑似), Pass (通过/低概率)
      // Score: AI 生成概率分数 (0-100)
      
      let aiProbability = resData.Score ?? 0;
      let conclusion = "原创度高";
      
      if (resData.Suggestion === 'Block' || aiProbability >= 80) {
        conclusion = "高概率 AI 生成";
        if (aiProbability < 80) aiProbability = 89;
      } else if (resData.Suggestion === 'Review' || aiProbability >= 40) {
        conclusion = "疑似 AI 生成";
        if (aiProbability < 40) aiProbability = 55;
      } else {
        conclusion = "内容原创度高";
      }

      setResult({
        aiProbability,
        conclusion,
        analyzedText: text,
        timestamp: new Date().toISOString(),
        details: resData.Keywords?.length ? `命中关键词: ${resData.Keywords.join(', ')}` : ""
      });

      // 刷新记录和余额
      onAddHistory({}); 
      toast.success('检测完成！');
    } catch (error: any) {
      console.error('Detection error:', error);
      toast.error(error.message || '检测失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        setText(text + clipboardText);
      } else {
        throw new Error('API not supported');
      }
    } catch (err) {
      toast.error('浏览器限制无法直接读取，请点击输入框后使用 Ctrl+V 或长按进行粘贴', { duration: 4000 });
      // 聚焦文本框方便用户直接使用快捷键
      const textarea = document.getElementById('detect-textarea') as HTMLTextAreaElement;
      if (textarea) textarea.focus();
    }
  };

  const getResultColor = (probability: number) => {
    if (probability >= 70) return 'text-red-600';
    if (probability >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getResultIcon = (probability: number) => {
    if (probability >= 70) return <AlertCircle className="size-8" />;
    if (probability >= 40) return <AlertCircle className="size-8" />;
    return <CheckCircle2 className="size-8" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-2 pb-16">
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">AI 文本生成率检测</h1>
            <p className="text-xs text-gray-600 mt-0.5">一键检测文案是否由AI生成，智能判断原创度</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-sm text-gray-900">输入待检测文本</label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isValidLength ? 'text-green-600' : 'text-gray-500'}`}>
                  {charCount} / 2000 字
                </span>
                {charCount > 0 && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    清空
                  </button>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg">
              <textarea
                id="detect-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入 200-2000 字符的文本内容，系统将调用腾讯云服务分析其 AI 生成概率..."
                maxLength={2000}
                className="w-full h-96 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-gray-900 pr-10 relative z-0 text-sm"
                disabled={loading}
              />
              {!loading && (
                <button
                  onClick={charCount > 0 ? handleClear : handlePaste}
                  className="absolute bottom-3 right-3 p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-blue-500 rounded-lg transition-all border border-gray-200 shadow-sm z-10"
                  title={charCount > 0 ? "一键清空" : "粘贴文本"}
                >
                  {charCount > 0 ? <Trash2 className="size-4 hover:text-red-500" /> : <ClipboardPaste className="size-4" />}
                </button>
              )}
              {loading && (
                <div className="absolute inset-0 bg-blue-50/10 z-20 pointer-events-none rounded-lg">
                  <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              )}
            </div>

            <button
              onClick={handleDetect}
              disabled={loading || charCount < 200}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  正在深度分析...
                </>
              ) : (
                charCount < 200 ? '请输入至少 200 字' : `开始原创性检测（扣除 ${charCount} 字符）`
              )}
            </button>
          </div>
        </div>
        
        {/* Tencent Cloud API Badge */}
        {!result && !loading && (
          <div className="mt-4 text-center text-gray-500 text-xs flex flex-col items-center gap-1">
            <img src="https://wxqun988.vxjuejin.com/%E8%85%BE%E8%AE%AF%E4%BA%91.png" className="h-5 opacity-60" alt="Tencent Cloud" />
            <p>采用腾讯云API，准确 & 稳定</p>
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div ref={resultRef} className="bg-white rounded-xl shadow-sm p-4 border-2 border-blue-50 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">检测报告</h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <HelpCircle className="size-3" />
                评分标准
              </button>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-lg mb-4">
              <div className={`flex items-center justify-center gap-2 mb-2 ${getResultColor(result.aiProbability)}`}>
                {getResultIcon(result.aiProbability)}
                <span className="text-4xl font-bold">{result.aiProbability}%</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-0.5">AI 生成概率</p>
              <p className={`text-base font-medium ${getResultColor(result.aiProbability)}`}>
                {result.conclusion}
              </p>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>本次检测字数共 {charCount} 字。{result.details || "系统已完成深度指纹比对，结果仅供参考。"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Score Explanation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-bold text-gray-900">AI 评分标准</h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-green-500 text-white p-2 rounded-xl shadow-sm">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">0% ～ 10% AI 生成</p>
                  <p className="text-xs text-gray-500 mt-0.5">纯人工原创内容，原创度最高</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-blue-500 text-white p-2 rounded-xl shadow-sm">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">分值代表 AI 特征强度</p>
                  <p className="text-xs text-gray-500 mt-0.5">数字代表可能的机器生成比例</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-amber-500 text-white p-2 rounded-xl shadow-sm">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">50% ～ 80% 疑似 AI</p>
                  <p className="text-xs text-gray-500 mt-0.5">可能是 AI 写作或大量人工干预</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-red-500 text-white p-2 rounded-xl shadow-sm">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">80% ～ 100% 几乎纯 AI</p>
                  <p className="text-xs text-gray-500 mt-0.5">检测到极强生成逻辑，结论纯 AI</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-6 bg-gray-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-md focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
