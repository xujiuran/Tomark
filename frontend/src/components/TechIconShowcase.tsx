import React, { useState } from 'react';
import { X, Search, Check, Sparkles, Copy, Terminal } from 'lucide-react';
import { ALL_TECH_ICONS_SHOWCASE, QuantumLogoIcon } from '../icons/techIcons';

interface TechIconShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechIconShowcase: React.FC<TechIconShowcaseProps> = ({ isOpen, onClose }) => {
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedName(text);
    setTimeout(() => setCopiedName(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#0c101a] border border-blue-900/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#111624] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <QuantumLogoIcon size={18} glow />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white tracking-wide">
                  科技感开源图标库 & 文件类型图鉴
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50 font-mono">
                  v2.0 极客套件
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                精细矢量渲染、微光霓虹色彩、100% 本地纯离线打包，支持自定义分类映射
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索过滤栏 */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-[#0e1320] flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索图标名称、文件扩展名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>点击任意卡片复制图标标识符</span>
          </div>
        </div>

        {/* 图标展示网格内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 select-text">
          {ALL_TECH_ICONS_SHOWCASE.map((group, gIdx) => {
            const filteredItems = group.items.filter(
              item => item.name.toLowerCase().includes(search.toLowerCase()) || 
                      item.en.toLowerCase().includes(search.toLowerCase()) ||
                      item.desc.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800/60">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                    {group.group}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({filteredItems.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.map((item, idx) => {
                    const IconComp = item.icon;
                    const isCopied = copiedName === item.name;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleCopy(item.name)}
                        className="group relative p-3.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer flex items-start gap-3 shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
                      >
                        {/* 左侧图标容器 */}
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition group-hover:scale-105"
                          style={{
                            backgroundColor: `${item.color}15`,
                            borderColor: `${item.color}40`,
                          }}
                        >
                          <IconComp size={20} glow={true} />
                        </div>

                        {/* 右侧信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white group-hover:text-blue-300 transition truncate">
                              {item.name}
                            </span>
                            {isCopied ? (
                              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> 已复制
                              </span>
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.en}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed truncate">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部信息栏 */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0e1320] flex items-center justify-between text-xs text-slate-400 shrink-0 select-none">
          <span className="font-mono text-[11px]">
            SVG 矢量源码位于 <code className="text-blue-400">frontend/src/icons/techIcons.tsx</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition text-xs"
          >
            关闭图鉴
          </button>
        </div>
      </div>
    </div>
  );
};
