import React, { useState, useEffect } from 'react';
import { 
  Bookmark as BookmarkIcon, Star, Archive, Trash2, ExternalLink, 
  Sparkles, Search, Plus, Settings, Tag as TagIcon, BarChart2, 
  CheckCircle, Globe, RefreshCw, X, BookOpen, Layers, FileUp,
  Clock, AlertCircle
} from 'lucide-react';
import { 
  GetBookmarks, AddBookmark, DeleteBookmark, ToggleFavorite, 
  ToggleArchive, AnalyzeBookmark, GetTags, GetStats, 
  SaveAIConfig, GetAIConfig, SelectAndImportBookmarks, 
  StartBatchAIAnalysis, GetAnalysisProgress
} from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';

export default function App() {
  const [bookmarks, setBookmarks] = useState<models.Bookmark[]>([]);
  const [tags, setTags] = useState<models.Tag[]>([]);
  const [stats, setStats] = useState<models.Stats | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<models.Bookmark | null>(null);
  
  // Navigation & filters
  const [currentTab, setCurrentTab] = useState<'all' | 'favorites' | 'archived'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & loading states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<models.AnalysisProgress | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'processing' | 'pending' | 'failed'>('all');

  // Settings form
  const [aiBaseURL, setAiBaseURL] = useState('http://127.0.0.1:3425/v1');
  const [aiModel, setAiModel] = useState('auto/deepseek-v4.1-flash');
  const [aiApiKey, setAiApiKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Periodically check analysis progress if running or modal is open
  useEffect(() => {
    let timer: any;
    const checkProgress = async () => {
      try {
        const prog = await GetAnalysisProgress();
        setAnalysisProgress(prog);
        if (prog && (prog.is_running || isProgressModalOpen)) {
          if (prog.is_running) {
            await loadData();
          }
          timer = setTimeout(checkProgress, 2000);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkProgress();
    return () => clearTimeout(timer);
  }, [isProgressModalOpen]);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await SelectAndImportBookmarks();
      if (res && res.total_imported > 0) {
        alert(`🎉 ${res.message}\n已加入后台并发队列，本地 Magpie (DeepSeek) 正在持续深度分析中...`);
        await loadData();
        const prog = await GetAnalysisProgress();
        setAnalysisProgress(prog);
      }
    } catch (err: any) {
      alert("导入失败: " + err);
    } finally {
      setIsImporting(false);
    }
  };

  // Load initial data
  const loadData = async () => {
    try {
      const fav = currentTab === 'favorites';
      const arch = currentTab === 'archived';
      const list = await GetBookmarks(searchQuery, selectedTag, fav, arch);
      setBookmarks(list || []);
      
      const t = await GetTags();
      setTags(t || []);
      
      const s = await GetStats();
      setStats(s);

      if (selectedBookmark) {
        const updated = list?.find(b => b.id === selectedBookmark.id);
        if (updated) setSelectedBookmark(updated);
      }
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTab, selectedTag, searchQuery]);

  // Load AI configuration on mount
  useEffect(() => {
    GetAIConfig().then(cfg => {
      if (cfg) {
        setAiBaseURL(cfg.base_url || 'http://127.0.0.1:3425/v1');
        setAiModel(cfg.model || 'auto/deepseek-v4.1-flash');
        if (cfg.api_key) setAiApiKey(cfg.api_key);
      }
    }).catch(console.error);
  }, []);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setIsLoading(true);
    try {
      const created = await AddBookmark(newUrl.trim());
      setNewUrl('');
      setIsAddModalOpen(false);
      await loadData();
      if (created) setSelectedBookmark(created);
    } catch (err: any) {
      alert("添加书签失败: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFav = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await ToggleFavorite(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchive = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await ToggleArchive(id);
      await loadData();
      if (selectedBookmark?.id === id) {
        setSelectedBookmark(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("确定要删除这个书签吗？")) return;
    try {
      await DeleteBookmark(id);
      if (selectedBookmark?.id === id) setSelectedBookmark(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async (id: string) => {
    setIsAnalyzing(true);
    try {
      const res = await AnalyzeBookmark(id);
      await loadData();
      alert(`AI 分析完成！已生成摘要与 ${res.suggested_tags?.length || 0} 个智能标签`);
    } catch (err: any) {
      alert("AI 分析失败: " + err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SaveAIConfig(aiBaseURL, aiModel, aiApiKey.includes('••••') ? '' : aiApiKey);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsSettingsOpen(false);
      }, 1200);
    } catch (err: any) {
      alert("保存设置失败: " + err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans">
      {/* 顶部通栏导航 (Full-Width Native Titlebar，Mac 交通灯独立保留 92px 安全距离) */}
      <header 
        className="h-12 border-b border-slate-800/80 bg-[#0d121c]/90 backdrop-blur-md flex items-center justify-between px-4 select-none shrink-0"
        style={{ '--wails-draggable': 'drag' } as any}
      >
        {/* 左侧：为 macOS 交通灯留出充足空间 (pl-[92px])，展示 Logo 与标题 */}
        <div className="flex items-center gap-3 pl-[88px] min-w-0" style={{ '--wails-draggable': 'no-drag' } as any}>
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <BookmarkIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-white">Linkit</span>
            <span className="text-slate-600 text-xs hidden sm:inline">/</span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">AI Bookmark & PKM</span>
          </div>
        </div>

        {/* 右侧：全局搜索框 + 导入/添加按钮 + 状态 + 设置 */}
        <div className="flex items-center gap-2.5" style={{ '--wails-draggable': 'no-drag' } as any}>
          {analysisProgress && (analysisProgress.total > 0 || analysisProgress.is_running) && (
            <button
              onClick={() => setIsProgressModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 text-[11px] text-blue-300 transition shadow-sm shrink-0"
              title="点击打开 AI 深度分析任务中心，查看每个书签的处理进度与结果"
            >
              {analysisProgress.is_running ? (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
              ) : (
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              )}
              <span className="font-medium">
                {analysisProgress.is_running 
                  ? `AI 分析中 (${analysisProgress.processed}/${analysisProgress.total})` 
                  : `AI 分析 (${analysisProgress.processed}项)`}
              </span>
              <span className="text-[10px] text-blue-400/90 underline font-mono ml-0.5">查看结果</span>
            </button>
          )}

          <div className="relative w-56 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索书签或语义探索 (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-medium shadow-sm transition shrink-0 disabled:opacity-50"
            title="导入从 Chrome/Edge 等浏览器导出的 HTML 书签文件"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-400" />
            <span>{isImporting ? '正在解析...' : '导入书签'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加书签</span>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 下方三栏主工作区 */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 1. 左侧边栏 (Sidebar) */}
        <aside className="w-60 flex flex-col border-r border-slate-800/80 bg-[#0f1420]/70 backdrop-blur-xl select-none shrink-0">
          {/* 导航菜单 */}
          <div className="p-3 space-y-1">
            <button
              onClick={() => { setCurrentTab('all'); setSelectedTag(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'all' && !selectedTag ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>全部书签</span>
              </div>
              <span className="text-[10px] opacity-75">{stats?.total_bookmarks ?? 0}</span>
            </button>

            <button
              onClick={() => { setCurrentTab('favorites'); setSelectedTag(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'favorites' && !selectedTag ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>星标收藏</span>
              </div>
              <span className="text-[10px] opacity-75">{stats?.favorites ?? 0}</span>
            </button>

            <button
              onClick={() => { setCurrentTab('archived'); setSelectedTag(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'archived' && !selectedTag ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4" />
                <span>归档箱</span>
              </div>
              <span className="text-[10px] opacity-75">{stats?.archived ?? 0}</span>
            </button>
          </div>

          {/* 标签列表 */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
              <span>智能标签</span>
              <span className="text-[10px] text-slate-500">{tags.length}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {tags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTag(selectedTag === t.name ? '' : t.name)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition ${
                    selectedTag === t.name ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <TagIcon className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="truncate">#{t.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{t.count}</span>
                </button>
              ))}
              {tags.length === 0 && (
                <p className="text-[11px] text-slate-500 px-2 py-3 italic">暂无标签，添加书签后由 AI 自动生成</p>
              )}
            </div>
          </div>

          {/* 状态统计卡片 */}
          <div className="p-3 border-t border-slate-800/60 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">本地存储 (SQLite)</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                离线就绪
              </span>
            </div>
          </div>
        </aside>

        {/* 2. 中间书签列表流 (Bookmark List) */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-slate-800/80 bg-[#0d121c]/40">
          {/* 次级筛选栏与状态栏 */}
          <div className="h-9 border-b border-slate-800/60 px-4 flex items-center justify-between text-xs bg-[#0d121c]/40 shrink-0">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <span>
                {currentTab === 'all' && '全部书签'}
                {currentTab === 'favorites' && '星标收藏'}
                {currentTab === 'archived' && '归档箱'}
              </span>
              {selectedTag && <span className="text-blue-400 font-mono">#{selectedTag}</span>}
              <span className="text-slate-600 font-mono">({bookmarks.length})</span>
            </div>
          </div>

          {/* 书签流 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {bookmarks.map((bm) => {
              const isSelected = selectedBookmark?.id === bm.id;
              return (
                <div
                  key={bm.id}
                  onClick={() => setSelectedBookmark(bm)}
                  className={`group p-4 rounded-xl border transition cursor-pointer relative ${
                    isSelected 
                      ? 'bg-blue-950/20 border-blue-500/60 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30' 
                      : 'bg-[#121824]/60 hover:bg-[#151c2a] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Favicon & Title */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img 
                        src={bm.favicon_url || 'https://www.google.com/s2/favicons?domain=' + bm.url} 
                        alt=""
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        className="w-5 h-5 rounded mt-0.5 object-contain bg-slate-800 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition truncate">
                          {bm.title || bm.url}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          {bm.url}
                        </p>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={(e) => handleToggleFav(bm.id, e)}
                        className={`p-1.5 rounded hover:bg-slate-700/60 transition ${bm.is_favorite ? 'text-amber-400' : 'text-slate-400'}`}
                        title="收藏"
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={(e) => handleToggleArchive(bm.id, e)}
                        className={`p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition`}
                        title="归档"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(bm.id, e)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* AI Summary snippet */}
                  {bm.ai_summary ? (
                    <div className="mt-2.5 p-2 rounded-lg bg-blue-900/15 border border-blue-800/30 text-xs text-blue-200/90 leading-relaxed">
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-semibold mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI 智能摘要</span>
                      </div>
                      {bm.ai_summary}
                    </div>
                  ) : (
                    bm.description && (
                      <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {bm.description}
                      </p>
                    )
                  )}

                  {/* Tags row */}
                  {bm.tags && bm.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {bm.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {bookmarks.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">书签库空空如也</p>
                <p className="text-xs text-slate-500 mt-1">点击右上角「+ 添加书签」输入任意网页链接体验 AI 自动解析</p>
              </div>
            )}
          </div>
        </main>

        {/* 3. 右侧详情与阅读器面板 (Detail & Reader Panel) */}
        <aside className="w-96 flex flex-col border-l border-slate-800/80 bg-[#0f1420]/50 backdrop-blur-xl shrink-0">
          {selectedBookmark ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* 详情标题栏 */}
              <div className="h-9 px-4 border-b border-slate-800/60 flex items-center justify-between select-none shrink-0">
                <span className="text-xs font-semibold text-slate-300">书签详情 & 洞察</span>
                <a
                  href={selectedBookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  <span>在浏览器中打开</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* 详情内容 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Cover Image */}
                {selectedBookmark.cover_image && (
                  <img
                    src={selectedBookmark.cover_image}
                    alt=""
                    className="w-full h-36 object-cover rounded-xl border border-slate-800"
                  />
                )}

                {/* Title & URL */}
                <div>
                  <h2 className="text-base font-bold text-white leading-snug">
                    {selectedBookmark.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 break-all font-mono">
                    {selectedBookmark.url}
                  </p>
                </div>

                {/* AI 洞察分析区块 */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-blue-950/30 to-indigo-950/20 border border-blue-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>AI 知识洞察 (DeepSeek / OpenAI)</span>
                    </div>
                    <button
                      onClick={() => handleAnalyze(selectedBookmark.id)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{isAnalyzing ? '分析中...' : '重新分析'}</span>
                    </button>
                  </div>

                  {selectedBookmark.ai_summary ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">核心摘要</span>
                        <p className="text-slate-200 mt-0.5 leading-relaxed">{selectedBookmark.ai_summary}</p>
                      </div>

                      {selectedBookmark.ai_key_points && selectedBookmark.ai_key_points.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">关键 Takeaways</span>
                          <ul className="mt-1 space-y-1 list-disc list-inside text-slate-300">
                            {selectedBookmark.ai_key_points.map((pt, i) => (
                              <li key={i} className="text-xs leading-relaxed">{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      <p>尚未进行 AI 总结</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">点击上方按钮自动生成精炼摘要与知识要点</p>
                    </div>
                  )}
                </div>

                {/* 正文预览模式 */}
                {selectedBookmark.content_raw && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400">文章提取纯文本 (Readability)</span>
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text font-serif">
                      {selectedBookmark.content_raw}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="h-9 px-4 border-b border-slate-800/60 flex items-center justify-between text-xs select-none shrink-0">
                <span className="font-semibold text-slate-500">书签详情 & 洞察</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <Layers className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">选择左侧任意书签查看详细内容与 AI 深度洞察</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 4. 添加书签弹窗 (Add Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>添加新书签</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBookmark} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  输入网页网址 (URL)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/article"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  系统将自动使用 Readability 抓取标题、Favicon 和正文，并触发 AI 生成摘要。
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isLoading ? '正在抓取...' : '解析入库'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 设置弹窗 (Settings Modal) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span>AI 大模型与系统设置</span>
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 预设提供商快捷按钮 */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">快速预设接入点</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAiBaseURL('http://127.0.0.1:3425/v1');
                    setAiModel('auto/deepseek-v4.1-flash');
                    setAiApiKey('');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                    aiBaseURL.includes('3425')
                      ? 'bg-blue-600/30 text-blue-400 border-blue-500/50 shadow-sm'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60'
                  }`}
                >
                  ⚡ Magpie (本地 3425)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiBaseURL('https://api.deepseek.com/v1');
                    setAiModel('deepseek-chat');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                    aiBaseURL.includes('deepseek.com')
                      ? 'bg-blue-600/30 text-blue-400 border-blue-500/50 shadow-sm'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60'
                  }`}
                >
                  DeepSeek 官方
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiBaseURL('http://localhost:11434/v1');
                    setAiModel('qwen2.5:7b');
                    setAiApiKey('');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                    aiBaseURL.includes('11434')
                      ? 'bg-blue-600/30 text-blue-400 border-blue-500/50 shadow-sm'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60'
                  }`}
                >
                  Ollama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiBaseURL('https://api.openai.com/v1');
                    setAiModel('gpt-4o-mini');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                    aiBaseURL.includes('openai.com')
                      ? 'bg-blue-600/30 text-blue-400 border-blue-500/50 shadow-sm'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60'
                  }`}
                >
                  OpenAI
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">API Base URL</label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1 或 https://api.deepseek.com/v1"
                  value={aiBaseURL}
                  onChange={(e) => setAiBaseURL(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  支持 DeepSeek、OpenAI、本地 Ollama (http://localhost:11434/v1) 等。
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">模型名称 (Model)</label>
                <input
                  type="text"
                  placeholder="deepseek-chat 或 gpt-4o-mini"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">API Key (加密存储于系统钥匙串)</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  密钥使用系统原生 Keychain / Credential Manager 安全保护，绝不上传云端。
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> 已保存至系统钥匙串
                  </span>
                ) : <span></span>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                  >
                    关闭
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                  >
                    保存配置
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. AI 深度分析任务中心弹窗 (Progress & Results Inspector Modal) */}
      {isProgressModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">AI 深度分析任务中心</h3>
                  <p className="text-[10px] text-slate-400">
                    本地 Magpie 网关 · DeepSeek V4.1 Flash 实时处理
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!analysisProgress?.is_running && (
                  <button
                    onClick={async () => {
                      const p = await StartBatchAIAnalysis();
                      setAnalysisProgress(p);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>启动/继续分析</span>
                  </button>
                )}
                <button
                  onClick={() => setIsProgressModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 总体进度条与指标 */}
            <div className="py-3 border-b border-slate-800/80 shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-slate-200">
                    {analysisProgress?.is_running ? '正在分析...' : '分析就绪'}
                  </span>
                  <span className="text-blue-400 font-mono">
                    {analysisProgress?.processed || 0} / {analysisProgress?.total || 0}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono">
                  {analysisProgress?.total ? Math.round(((analysisProgress.processed || 0) / analysisProgress.total) * 100) : 0}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{
                    width: `${analysisProgress?.total ? Math.round(((analysisProgress.processed || 0) / analysisProgress.total) * 100) : 0}%`
                  }}
                />
              </div>

              {/* 状态筛选标签 */}
              <div className="flex items-center gap-1.5 pt-1">
                {(['all', 'completed', 'processing', 'pending', 'failed'] as const).map((tab) => {
                  const tasks = analysisProgress?.tasks || [];
                  const count = tab === 'all' 
                    ? tasks.length 
                    : tasks.filter(t => t.status === tab).length;

                  const labels: Record<string, string> = {
                    all: '全部',
                    completed: '已完成',
                    processing: '分析中',
                    pending: '排队中',
                    failed: '失败'
                  };

                  return (
                    <button
                      key={tab}
                      onClick={() => setTaskFilter(tab)}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition ${
                        taskFilter === tab
                          ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                          : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {labels[tab]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 任务明细卡片列表 */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {(analysisProgress?.tasks || [])
                .filter(t => taskFilter === 'all' || t.status === taskFilter)
                .map((task) => (
                  <div
                    key={task.bookmark_id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {task.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 shrink-0 font-medium">
                              <CheckCircle className="w-2.5 h-2.5" /> 已完成
                            </span>
                          )}
                          {task.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-400 shrink-0 font-medium animate-pulse">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> 分析中...
                            </span>
                          )}
                          {task.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 shrink-0 font-medium">
                              <Clock className="w-2.5 h-2.5" /> 排队中
                            </span>
                          )}
                          {task.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-400 shrink-0 font-medium">
                              <AlertCircle className="w-2.5 h-2.5" /> 失败
                            </span>
                          )}
                          <h4 className="font-semibold text-slate-100 truncate">{task.title || task.url}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{task.url}</p>
                      </div>

                      <button
                        onClick={() => {
                          const bm = bookmarks.find(b => b.id === task.bookmark_id);
                          if (bm) setSelectedBookmark(bm);
                          setIsProgressModalOpen(false);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 transition shrink-0 underline"
                      >
                        在列表查看
                      </button>
                    </div>

                    {/* AI 结果预览 */}
                    {task.summary && (
                      <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-200/90 leading-relaxed">
                        <div className="flex items-center gap-1 text-blue-400 font-semibold mb-0.5">
                          <Sparkles className="w-3 h-3" />
                          <span>AI 摘要</span>
                        </div>
                        {task.summary}
                      </div>
                    )}

                    {/* 智能标签 */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {task.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 错误提示 */}
                    {task.error && (
                      <p className="text-[11px] text-red-400/90 font-mono bg-red-950/30 p-1.5 rounded border border-red-900/40">
                        错误: {task.error}
                      </p>
                    )}
                  </div>
                ))}

              {(!analysisProgress?.tasks || analysisProgress.tasks.length === 0) && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  暂无正在进行的 AI 批量分析任务。点击右上角「启动/继续分析」或导入书签触发分析。
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                已成功: {analysisProgress?.success || 0} | 失败: {analysisProgress?.failed || 0} | 队列总数: {analysisProgress?.total || 0}
              </span>
              <button
                type="button"
                onClick={() => setIsProgressModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
