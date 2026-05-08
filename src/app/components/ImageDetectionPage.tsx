import { useState, useRef, useEffect } from 'react';
import { ImageIcon, Loader2, CheckCircle2, AlertCircle, X, HelpCircle, TrendingUp, Activity, UploadCloud, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageDetectionPageProps {
  balance: number;
  imageBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
  onAddHistory: () => void;
}

export default function ImageDetectionPage({ balance, imageBalance, onBalanceUpdate, onAddHistory }: ImageDetectionPageProps) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [result]);

  const IMAGE_COST = 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetect = async () => {
    if (!image) {
      toast.error('请先选择图片');
      return;
    }

    if (imageBalance < IMAGE_COST) {
      toast.error('鉴图次数不足，请联系客服获取');
      return;
    }

    setLoading(true);
    try {
      const base64Content = image.split(',')[1];
      
      const response = await fetch('/api/moderate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileContent: base64Content }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        onAddHistory();
        toast.success('检测完成');
      } else {
        toast.error(data.error || '检测失败，请重试');
      }
    } catch (err) {
      toast.error('网络连接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
  };

  const getResultColor = (score: number) => {
    if (score >= 70) return "text-red-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getResultIcon = (score: number) => {
    if (score >= 70) return <AlertCircle className="size-8" />;
    if (score >= 40) return <AlertCircle className="size-8" />;
    return <CheckCircle2 className="size-8" />;
  };

  const getConclusion = (score: number) => {
    if (score >= 80) return "高概率 AI 生成";
    if (score >= 40) return "疑似 AI 生成";
    return "极高概率为人工拍摄/设计";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 pb-20">
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">AI 图片生成率检测</h1>
            <p className="text-sm text-gray-600 mt-1">一键鉴定图片是否由AI生成，智能分析图片真伪</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-900">上传待检测图片</label>
              <div className="flex items-center gap-4">
                {image && (
                  <button
                    onClick={handleClear}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    清空
                  </button>
                )}
              </div>
            </div>

            <div className="relative aspect-square max-w-lg mx-auto w-full bg-gray-50 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-gray-200 group">
              {image ? (
                <>
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  {!loading && (
                    <button 
                      onClick={handleClear}
                      className="absolute bottom-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg transition-all border border-gray-200 shadow-sm"
                      title="一键清空"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-black/10 z-10 overflow-hidden">
                      <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  )}
                </>
              ) : (
                <label className="flex flex-col items-center cursor-pointer group w-full h-full justify-center">
                  <div className="size-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                     <UploadCloud className="size-8 text-blue-500" />
                  </div>
                  <span className="font-semibold text-gray-900">点击上传或将图片拖拽到此处</span>
                  <span className="text-sm text-gray-500 mt-1">支持 JPG, PNG, WEBP (最大 10MB)</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <button
              onClick={handleDetect}
              disabled={loading || !image}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  正在深度扫图分析中...
                </>
              ) : (
                !image ? '请选择图片上传' : `开始原创性检测（扣除 1 次）`
              )}
            </button>
          </div>
        </div>

        {/* Tencent Cloud API Badge */}
        {!result && !loading && (
          <div className="mt-8 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
            <img src="https://wxqun988.vxjuejin.com/%E8%85%BE%E8%AE%AF%E4%BA%91.png" className="h-6 opacity-60" alt="Tencent Cloud" />
            <p>采用腾讯云API，准确 & 稳定</p>
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div ref={resultRef} className="bg-white rounded-2xl shadow-xl p-6 border-2 border-blue-50 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">检测报告</h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <HelpCircle className="size-3.5" />
                评分标准
              </button>
            </div>

            <div className="text-center p-8 bg-gray-50 rounded-xl mb-6">
              <div className={`flex items-center justify-center gap-3 mb-3 ${getResultColor(result.aiScore)}`}>
                {getResultIcon(result.aiScore)}
                <span className="text-5xl font-bold">{result.aiScore}%</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-1">AI 生成概率</p>
              <p className={`text-lg font-medium ${getResultColor(result.aiScore)}`}>
                {getConclusion(result.aiScore)}
              </p>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <p>系统已完成深度图像特征提取与比对，结果仅供参考。</p>
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
                  <p className="font-bold text-gray-900">0% ～ 10% 原创</p>
                  <p className="text-xs text-gray-500 mt-0.5">自然拍摄或人工设计内容，符合光学规律</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-blue-500 text-white p-2 rounded-xl shadow-sm">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">分值代表 AI 特征强度</p>
                  <p className="text-xs text-gray-500 mt-0.5">代表算法检测到的图像生成痕迹</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-amber-500 text-white p-2 rounded-xl shadow-sm">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">50% ～ 80% 疑似 AI</p>
                  <p className="text-xs text-gray-500 mt-0.5">可能经过 AI 局部重绘或大幅后期</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50/80 rounded-2xl">
                <div className="bg-red-500 text-white p-2 rounded-xl shadow-sm">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">80% ～ 100% 确认 AI</p>
                  <p className="text-xs text-gray-500 mt-0.5">像素分布完全符合生成模型逻辑</p>
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

