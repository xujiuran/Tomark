import React, { useState, useEffect, useRef } from 'react';
import { 
  Bookmark as BookmarkIcon, Star, Archive, Trash2, ExternalLink, 
  Sparkles, Search, Plus, Settings, Tag as TagIcon, BarChart2, 
  CheckCircle, Globe, RefreshCw, X, BookOpen, Layers, FileUp,
  Clock, AlertCircle, FolderTree, Code2, ChevronDown, ChevronRight, Compass,
  Maximize2, Minimize2, Highlighter, Edit3, Check, Loader2, Type, Coffee, Moon, Sun,
  FileText
} from 'lucide-react';
import { 
  GetBookmarks, AddBookmark, DeleteBookmark, ToggleFavorite, 
  ToggleArchive, AnalyzeBookmark, GetTags, GetCategoryHierarchy, GetStats, 
  SaveAIConfig, GetAIConfig, SelectAndImportBookmarks, 
  StartBatchAIAnalysis, GetAnalysisProgress, ResetAndReanalyzeAll,
  HasArcBrowser, ImportFromArc, ExportArcBookmarks,
  UpdateBookmarkNotes, UpdateBookmarkHighlights, FetchAndSaveContent
} from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';

const CATEGORY_ICONS: Record<string, string> = {
  '代码与开源平台': '💻',
  '视频与流媒体': '🎬',
  '技术文档与教程': '📖',
  '技术博客与社区': '✍️',
  'AI 与前沿技术': '🤖',
  '设计与视觉灵感': '🎨',
  '效率与开发工具': '⚡',
  '资讯与社交媒体': '🌐',
  '生活与日常休闲': '☕',
  '商业与职场金融': '💼',
};

interface HighlightItem {
  id: string;
  text: string;
  color: 'yellow' | 'green' | 'purple';
  created_at: string;
}

const READER_THEMES = {
  dark: {
    bg: 'bg-[#0b0f17]',
    cardBg: 'bg-[#111827]',
    text: 'text-slate-200',
    subtext: 'text-slate-400',
    border: 'border-slate-800',
    highlightYellow: 'bg-amber-400/25 text-amber-200 border-b border-amber-400/60',
    highlightGreen: 'bg-emerald-400/25 text-emerald-200 border-b border-emerald-400/60',
    highlightPurple: 'bg-purple-400/25 text-purple-200 border-b border-purple-400/60',
  },
  sepia: {
    bg: 'bg-[#fbf0d9]',
    cardBg: 'bg-[#f3e3be]',
    text: 'text-[#3d2f1d]',
    subtext: 'text-[#7d6549]',
    border: 'border-[#dfcca5]',
    highlightYellow: 'bg-amber-300/80 text-[#3d2f1d] border-b border-amber-600',
    highlightGreen: 'bg-emerald-200/90 text-[#1b4332] border-b border-emerald-600',
    highlightPurple: 'bg-purple-200/90 text-[#3c096c] border-b border-purple-600',
  },
  midnight: {
    bg: 'bg-black',
    cardBg: 'bg-[#121212]',
    text: 'text-neutral-200',
    subtext: 'text-neutral-500',
    border: 'border-neutral-900',
    highlightYellow: 'bg-amber-400/30 text-amber-200 border-b border-amber-400',
    highlightGreen: 'bg-emerald-400/30 text-emerald-200 border-b border-emerald-400',
    highlightPurple: 'bg-purple-400/30 text-purple-200 border-b border-purple-400',
  },
};

export default function App() {
  const [bookmarks, setBookmarks] = useState<models.Bookmark[]>([]);
  const [tags, setTags] = useState<models.Tag[]>([]);
  const [hierarchies, setHierarchies] = useState<models.CategoryHierarchy[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isTagsCollapsed, setIsTagsCollapsed] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [stats, setStats] = useState<models.Stats | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<models.Bookmark | null>(null);

  // Reader & Notes state
  const [rightTab, setRightTab] = useState<'insights' | 'reader' | 'notes'>('insights');
  const [noteText, setNoteText] = useState('');
  const [noteSaveStatus, setNoteSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [readerFontSize, setReaderFontSize] = useState<number>(15);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'sepia' | 'midnight'>('dark');
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);
  const [isSplitNoteOpen, setIsSplitNoteOpen] = useState(true);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<'yellow' | 'green' | 'purple'>('yellow');
  const [selectedText, setSelectedText] = useState('');
  
  // Navigation & filters
  const [currentTab, setCurrentTab] = useState<'all' | 'favorites' | 'archived'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSubName, setSelectedSubName] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & loading states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasArc, setHasArc] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<models.AnalysisProgress | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'completed' | 'processing' | 'pending' | 'failed'>('all');

  // Settings form
  const [aiBaseURL, setAiBaseURL] = useState('http://127.0.0.1:3425/v1');
  const [aiModel, setAiModel] = useState('auto/deepseek-v4.1-flash');
  const [aiApiKey, setAiApiKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Track active filters in Ref to eliminate stale closures in timers and background updates
  const filtersRef = useRef({
    currentTab,
    selectedCategory,
    selectedDomain,
    selectedTag,
    searchQuery,
  });

  useEffect(() => {
    filtersRef.current = {
      currentTab,
      selectedCategory,
      selectedDomain,
      selectedTag,
      searchQuery,
    };
  }, [currentTab, selectedCategory, selectedDomain, selectedTag, searchQuery]);

  const reqIdRef = useRef(0);

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
      if (res) {
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

  const handleImportArc = async () => {
    setIsImporting(true);
    try {
      const res = await ImportFromArc();
      if (res) {
        alert(`🎉 ${res.message}\n已加入后台并发队列，本地 Magpie (DeepSeek) 正在持续深度分析中...`);
        await loadData();
        const prog = await GetAnalysisProgress();
        setAnalysisProgress(prog);
      }
    } catch (err: any) {
      alert("导入 Arc 书签失败: " + err);
    } finally {
      setIsImporting(false);
    }
  };

  // Load bookmarks & metadata using latest filter state with race-condition prevention
  const loadData = async (overrideFilters?: Partial<typeof filtersRef.current>) => {
    const cur = { ...filtersRef.current, ...overrideFilters };
    const myReqId = ++reqIdRef.current;
    try {
      const fav = cur.currentTab === 'favorites';
      const arch = cur.currentTab === 'archived';
      const list = await GetBookmarks(cur.searchQuery, cur.selectedTag, cur.selectedCategory, cur.selectedDomain, fav, arch);
      if (myReqId === reqIdRef.current) {
        setBookmarks(list || []);
      }
      
      const hiers = await GetCategoryHierarchy();
      setHierarchies(hiers || []);

      const t = await GetTags();
      setTags(t || []);
      
      const s = await GetStats();
      setStats(s);

      if (selectedBookmark && myReqId === reqIdRef.current) {
        const updated = list?.find(b => b.id === selectedBookmark.id);
        if (updated) setSelectedBookmark(updated);
      }
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTab, selectedCategory, selectedDomain, selectedTag, searchQuery]);

  // Load AI configuration & check Arc browser on mount
  useEffect(() => {
    HasArcBrowser().then(setHasArc).catch(console.error);

    GetAIConfig().then(cfg => {
      if (cfg) {
        setAiBaseURL(cfg.base_url || 'http://127.0.0.1:3425/v1');
        setAiModel(cfg.model || 'auto/deepseek-v4.1-flash');
        if (cfg.api_key) setAiApiKey(cfg.api_key);
      }
    }).catch(console.error);
  }, []);

  // Sync noteText when selectedBookmark changes
  useEffect(() => {
    if (selectedBookmark) {
      setNoteText(selectedBookmark.user_notes || '');
      setNoteSaveStatus('idle');
      setSelectedText('');
    }
  }, [selectedBookmark?.id]);

  // Listen for Escape key to exit fullscreen reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isReaderFullscreen) {
        setIsReaderFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReaderFullscreen]);

  const noteSaveTimerRef = useRef<any>(null);

  const handleNoteChange = (newVal: string) => {
    setNoteText(newVal);
    if (!selectedBookmark) return;
    setNoteSaveStatus('saving');

    if (noteSaveTimerRef.current) {
      clearTimeout(noteSaveTimerRef.current);
    }

    noteSaveTimerRef.current = setTimeout(async () => {
      try {
        await UpdateBookmarkNotes(selectedBookmark.id, newVal);
        setNoteSaveStatus('saved');
        setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, user_notes: newVal }) : null);
        setBookmarks(prev => prev.map(b => b.id === selectedBookmark.id ? models.Bookmark.createFrom({ ...b, user_notes: newVal }) : b));
      } catch (e) {
        console.error("Failed to save notes:", e);
        setNoteSaveStatus('idle');
      }
    }, 600);
  };

  const insertNoteTemplate = (template: string) => {
    const updated = noteText ? `${noteText}\n\n${template}` : template;
    handleNoteChange(updated);
  };

  const handleFetchContent = async (bmId: string) => {
    setIsFetchingContent(true);
    try {
      const text = await FetchAndSaveContent(bmId);
      if (text) {
        setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, content_raw: text }) : null);
        setBookmarks(prev => prev.map(b => b.id === bmId ? models.Bookmark.createFrom({ ...b, content_raw: text }) : b));
      }
    } catch (e: any) {
      alert("提取网页正文失败: " + e);
    } finally {
      setIsFetchingContent(false);
    }
  };

  const getHighlights = (bm?: models.Bookmark | null): HighlightItem[] => {
    if (!bm || !bm.highlights) return [];
    try {
      const parsed = JSON.parse(bm.highlights);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleAddHighlight = async (text: string, color: 'yellow' | 'green' | 'purple') => {
    if (!selectedBookmark || !text.trim()) return;
    const current = getHighlights(selectedBookmark);
    if (current.some(h => h.text === text.trim())) {
      setSelectedText('');
      return;
    }
    const newItem: HighlightItem = {
      id: Date.now().toString(),
      text: text.trim(),
      color,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newItem, ...current];
    const jsonStr = JSON.stringify(updated);
    try {
      await UpdateBookmarkHighlights(selectedBookmark.id, jsonStr);
      setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, highlights: jsonStr }) : null);
      setBookmarks(prev => prev.map(b => b.id === selectedBookmark.id ? models.Bookmark.createFrom({ ...b, highlights: jsonStr }) : b));
      setSelectedText('');
    } catch (e) {
      console.error("Failed to save highlight:", e);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!selectedBookmark) return;
    const current = getHighlights(selectedBookmark);
    const updated = current.filter(h => h.id !== highlightId);
    const jsonStr = JSON.stringify(updated);
    try {
      await UpdateBookmarkHighlights(selectedBookmark.id, jsonStr);
      setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, highlights: jsonStr }) : null);
      setBookmarks(prev => prev.map(b => b.id === selectedBookmark.id ? models.Bookmark.createFrom({ ...b, highlights: jsonStr }) : b));
    } catch (e) {
      console.error("Failed to delete highlight:", e);
    }
  };

  const getReadingStats = (text: string) => {
    const chars = text ? text.replace(/\s+/g, '').length : 0;
    const minutes = Math.max(1, Math.ceil(chars / 450));
    return { chars, minutes };
  };

  const renderParagraphs = (content: string, currentHighlights: HighlightItem[], themeKey: 'dark' | 'sepia' | 'midnight', fontSize: number) => {
    if (!content) return null;
    const theme = READER_THEMES[themeKey];
    const paragraphs = content.split(/\n+/).map(p => p.trim()).filter(Boolean);

    return paragraphs.map((para, pIdx) => {
      let parts: React.ReactNode[] = [para];

      currentHighlights.forEach(hl => {
        if (!hl.text || !para.includes(hl.text)) return;
        const newParts: React.ReactNode[] = [];
        parts.forEach(part => {
          if (typeof part === 'string' && part.includes(hl.text)) {
            const split = part.split(hl.text);
            split.forEach((subStr, sIdx) => {
              if (sIdx > 0) {
                const colorClass = hl.color === 'green' ? theme.highlightGreen : hl.color === 'purple' ? theme.highlightPurple : theme.highlightYellow;
                newParts.push(
                  <mark key={`${hl.id}-${sIdx}`} className={`px-1 py-0.5 rounded cursor-pointer transition ${colorClass}`} title={`划线于 ${hl.created_at}`}>
                    {hl.text}
                  </mark>
                );
              }
              if (subStr) newParts.push(subStr);
            });
          } else {
            newParts.push(part);
          }
        });
        parts = newParts;
      });

      return (
        <p key={pIdx} className="mb-5 leading-loose text-justify font-serif" style={{ fontSize: `${fontSize}px` }}>
          {parts}
        </p>
      );
    });
  };

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
            <span>{isImporting ? '正在解析...' : '导入 HTML'}</span>
          </button>

          {hasArc && (
            <button
              onClick={handleImportArc}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-950/40 hover:bg-orange-900/50 text-orange-200 border border-orange-700/50 text-xs font-medium shadow-sm transition shrink-0 disabled:opacity-50"
              title="一键直接读取本地 Arc 浏览器书签并自动去重导入"
            >
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span>{isImporting ? '正在去重...' : '导入 Arc'}</span>
            </button>
          )}

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
              onClick={() => { setCurrentTab('all'); setSelectedCategory(''); setSelectedDomain(''); setSelectedSubName(''); setSelectedTag(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'all' && !selectedCategory && !selectedDomain && !selectedTag ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>全部书签</span>
              </div>
              <span className="text-[10px] opacity-75">{stats?.total_bookmarks ?? 0}</span>
            </button>

            <button
              onClick={() => { setCurrentTab('favorites'); setSelectedCategory(''); setSelectedDomain(''); setSelectedSubName(''); setSelectedTag(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'favorites' && !selectedCategory && !selectedDomain && !selectedTag ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>星标收藏</span>
              </div>
              <span className="text-[10px] opacity-75">{stats?.favorites ?? 0}</span>
            </button>

            <button
              onClick={() => { setCurrentTab('archived'); setSelectedCategory(''); setSelectedDomain(''); setSelectedSubName(''); setSelectedTag(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                currentTab === 'archived' && !selectedCategory && !selectedDomain && !selectedTag ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4" />
                <span>归档箱</span>
              </div>
              <span className="text-[10px] opacity-75">{stats?.archived ?? 0}</span>
            </button>
          </div>

          {/* 分类目录树：一级大类 -> 二级站点(主域名) */}
          <div className="px-3 py-2 border-t border-slate-800/60 flex-1 overflow-y-auto">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                <span>分类与站点</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {hierarchies.length} 大类
              </span>
            </div>

            <div className="mt-1 space-y-1 select-none pr-0.5">
              {hierarchies.map((cat) => {
                const isCatActive = selectedCategory === cat.name && !selectedDomain;
                const isExpanded = expandedCategories[cat.name] ?? true;

                return (
                  <div key={cat.name} className="space-y-0.5">
                    {/* 一级大类行 */}
                    <div
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition cursor-pointer group ${
                        isCatActive
                          ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                      onClick={() => {
                        if (isCatActive) {
                          setSelectedCategory('');
                          setSelectedDomain('');
                          setSelectedSubName('');
                        } else {
                          setSelectedCategory(cat.name);
                          setSelectedDomain('');
                          setSelectedSubName('');
                          setSelectedTag('');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories(prev => ({ ...prev, [cat.name]: !isExpanded }));
                          }}
                          className="p-0.5 rounded hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <span className="text-xs shrink-0">{CATEGORY_ICONS[cat.name] || '📁'}</span>
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded-full">{cat.count}</span>
                    </div>

                    {/* 二级站点/主域名行 (仅在展开且有二级分类时显示) */}
                    {isExpanded && cat.sub_categories && cat.sub_categories.length > 0 && (
                      <div className="pl-4 space-y-0.5 border-l border-slate-800/80 ml-3">
                        {cat.sub_categories.map((sub) => {
                          const isSubSelected = selectedDomain === sub.domain;
                          return (
                            <button
                              key={`${cat.name}-${sub.domain}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSubSelected) {
                                  setSelectedDomain('');
                                  setSelectedSubName('');
                                } else {
                                  setSelectedCategory(cat.name);
                                  setSelectedDomain(sub.domain);
                                  setSelectedSubName(sub.name);
                                  setSelectedTag('');
                                }
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition ${
                                isSubSelected
                                  ? 'bg-blue-600/40 text-blue-300 border border-blue-500/50 font-medium'
                                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>
                                <span className="truncate">{sub.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{sub.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {hierarchies.length === 0 && (
                <p className="text-[11px] text-slate-500 px-2 py-2 italic">暂无分类，AI 分析后自动构建二级站点体系</p>
              )}
            </div>
          </div>

          {/* 精简标签区 (折叠式展示，杜绝无意义刷屏) */}
          <div className="px-3 py-2 border-t border-slate-800/60 shrink-0">
            <div 
              className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between cursor-pointer hover:text-slate-300 select-none"
              onClick={() => setIsTagsCollapsed(!isTagsCollapsed)}
            >
              <div className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>核心标签</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-mono">{tags.length}</span>
                {isTagsCollapsed ? <ChevronRight className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
              </div>
            </div>

            {!isTagsCollapsed && (
              <div className="mt-1 flex flex-wrap gap-1 px-1 max-h-36 overflow-y-auto">
                {tags.slice(0, showAllTags ? tags.length : 12).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTag(selectedTag === t.name ? '' : t.name)}
                    className={`px-2 py-0.5 rounded text-[10px] transition flex items-center gap-1 ${
                      selectedTag === t.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    <span>#{t.name}</span>
                    <span className="text-[9px] opacity-75 font-mono">({t.count})</span>
                  </button>
                ))}

                {tags.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="text-[10px] text-blue-400 hover:underline px-1 py-0.5"
                  >
                    {showAllTags ? '收起' : `+ 展开全部 (${tags.length})`}
                  </button>
                )}

                {tags.length === 0 && (
                  <p className="text-[11px] text-slate-500 py-1 italic">暂无内容标签</p>
                )}
              </div>
            )}
          </div>

          {/* 状态统计卡片 */}
          <div className="p-3 border-t border-slate-800/60 text-xs shrink-0">
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
          {/* 次级筛选栏与面包屑路径 */}
          <div className="h-9 border-b border-slate-800/60 px-4 flex items-center justify-between text-xs bg-[#0d121c]/40 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium truncate">
              <button
                onClick={() => { setSelectedCategory(''); setSelectedDomain(''); setSelectedSubName(''); setSelectedTag(''); }}
                className="hover:text-blue-400 transition"
              >
                {currentTab === 'all' && '全部书签'}
                {currentTab === 'favorites' && '星标收藏'}
                {currentTab === 'archived' && '归档箱'}
              </button>

              {selectedCategory && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-600">/</span>
                  <button
                    onClick={() => { setSelectedDomain(''); setSelectedSubName(''); }}
                    className={`px-1.5 py-0.5 rounded transition ${!selectedDomain ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-blue-300'}`}
                  >
                    {CATEGORY_ICONS[selectedCategory] || '📁'} {selectedCategory}
                  </button>
                </div>
              )}

              {selectedDomain && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-600">/</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-300 font-semibold flex items-center gap-1">
                    <Globe className="w-3 h-3 text-blue-400" />
                    <span>{selectedSubName || selectedDomain} (子页面)</span>
                  </span>
                </div>
              )}

              {selectedTag && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-600">/</span>
                  <span className="text-blue-400 font-mono">#{selectedTag}</span>
                </div>
              )}

              <span className="text-slate-600 font-mono ml-1">({bookmarks.length})</span>
            </div>

            {(selectedCategory || selectedDomain || selectedTag) && (
              <button
                onClick={() => { setSelectedCategory(''); setSelectedDomain(''); setSelectedSubName(''); setSelectedTag(''); }}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>重置筛选</span>
              </button>
            )}
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

                  {/* Category, Notes, Content & Tags row */}
                  {((bm.tags && bm.tags.length > 0) || bm.category || bm.user_notes || bm.content_raw) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {bm.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50 flex items-center gap-1">
                          <span>{CATEGORY_ICONS[bm.category] || '📁'}</span>
                          <span>{bm.category}</span>
                          {bm.sub_category && <span className="opacity-80">· {bm.sub_category}</span>}
                        </span>
                      )}
                      {bm.user_notes && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-950/60 text-amber-300 border border-amber-700/60 flex items-center gap-1 shadow-sm" title={bm.user_notes}>
                          <Edit3 className="w-2.5 h-2.5 text-amber-400" />
                          <span>有笔记</span>
                        </span>
                      )}
                      {bm.content_raw && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 flex items-center gap-1" title="正文已提取，可沉浸阅读">
                          <BookOpen className="w-2.5 h-2.5 text-emerald-400" />
                          <span>可阅读</span>
                        </span>
                      )}
                      {bm.tags && bm.tags.map((t, idx) => (
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

        {/* 3. 右侧详情、阅读器与私人笔记面板 (Detail, Reader & Notes Panel) */}
        <aside className="w-96 xl:w-[420px] flex flex-col border-l border-slate-800/80 bg-[#0f1420]/50 backdrop-blur-xl shrink-0">
          {selectedBookmark ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* 顶栏 Tab 切换栏 */}
              <div className="h-10 px-3 border-b border-slate-800/60 flex items-center justify-between select-none shrink-0 bg-[#0c1017]/40">
                <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-lg border border-slate-800/60 text-xs">
                  <button
                    onClick={() => setRightTab('insights')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                      rightTab === 'insights'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-blue-300" />
                    <span>AI 洞察</span>
                  </button>
                  <button
                    onClick={() => setRightTab('reader')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                      rightTab === 'reader'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>阅读器</span>
                    {selectedBookmark.content_raw && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                  <button
                    onClick={() => setRightTab('notes')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                      rightTab === 'notes'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>笔记</span>
                    {selectedBookmark.user_notes && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {rightTab === 'reader' && selectedBookmark.content_raw && (
                    <button
                      onClick={() => setIsReaderFullscreen(true)}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      title="全屏沉浸阅读"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <a
                    href={selectedBookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                    title="在浏览器中打开原网页"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 选项卡 1：AI 知识洞察 */}
              {rightTab === 'insights' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedBookmark.cover_image && (
                    <img
                      src={selectedBookmark.cover_image}
                      alt=""
                      className="w-full h-36 object-cover rounded-xl border border-slate-800"
                    />
                  )}

                  <div>
                    <h2 className="text-base font-bold text-white leading-snug">
                      {selectedBookmark.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 break-all font-mono">
                      {selectedBookmark.url}
                    </p>
                    {selectedBookmark.category && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50 font-medium inline-flex items-center gap-1">
                          <span>{CATEGORY_ICONS[selectedBookmark.category] || '📁'}</span>
                          <span>{selectedBookmark.category}</span>
                        </span>
                        {selectedBookmark.sub_category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium inline-flex items-center gap-1">
                            <Globe className="w-3 h-3 text-blue-400" />
                            <span>{selectedBookmark.sub_category}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI 知识洞察 */}
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
                      <div className="space-y-2.5 text-xs">
                        {selectedBookmark.category && (
                          <div className="flex items-center justify-between pb-2 border-b border-blue-900/30">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">归属分类</span>
                            <span className="text-xs font-medium text-blue-300 flex items-center gap-1">
                              <span>{CATEGORY_ICONS[selectedBookmark.category] || '📁'}</span>
                              <span>{selectedBookmark.category}</span>
                            </span>
                          </div>
                        )}

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

                  {/* 快捷跳转阅读与笔记卡片 */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setRightTab('reader')}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                        <span className="text-[10px] text-slate-500 font-mono">
                          {selectedBookmark.content_raw ? '离线就绪' : '未提取'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200">进入阅读器</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">清爽长文排版与划线</div>
                    </button>

                    <button
                      onClick={() => setRightTab('notes')}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Edit3 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                        <span className="text-[10px] text-slate-500 font-mono">
                          {selectedBookmark.user_notes ? '已有笔记' : '草稿'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200">私人笔记</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">记录思考心得与批注</div>
                    </button>
                  </div>
                </div>
              )}

              {/* 选项卡 2：沉浸式阅读器 */}
              {rightTab === 'reader' && (
                <div className={`flex-1 flex flex-col h-full overflow-hidden ${READER_THEMES[readerTheme].bg} ${READER_THEMES[readerTheme].text}`}>
                  {/* 控制工具条 */}
                  <div className={`px-3 py-2 border-b flex items-center justify-between text-xs shrink-0 ${READER_THEMES[readerTheme].border} ${READER_THEMES[readerTheme].cardBg}`}>
                    {/* 字数与预估时间 */}
                    <div className="flex items-center gap-2 text-[11px] opacity-80 font-mono">
                      <span>{getReadingStats(selectedBookmark.content_raw).chars} 字</span>
                      <span>·</span>
                      <span>约 {getReadingStats(selectedBookmark.content_raw).minutes} 分钟</span>
                    </div>

                    {/* 控制按钮组 */}
                    <div className="flex items-center gap-1.5">
                      {/* 字号调整 */}
                      <div className="flex items-center border border-slate-700/60 rounded px-1 text-[11px]">
                        <button
                          onClick={() => setReaderFontSize(s => Math.max(12, s - 1))}
                          className="px-1 hover:text-blue-400"
                          title="缩小字号"
                        >
                          A-
                        </button>
                        <span className="text-[10px] opacity-60 mx-0.5">{readerFontSize}</span>
                        <button
                          onClick={() => setReaderFontSize(s => Math.min(22, s + 1))}
                          className="px-1 hover:text-blue-400"
                          title="放大字号"
                        >
                          A+
                        </button>
                      </div>

                      {/* 主题选择 */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setReaderTheme('dark')}
                          className={`w-3.5 h-3.5 rounded-full bg-[#111827] border ${readerTheme === 'dark' ? 'ring-2 ring-blue-500 border-white' : 'border-slate-600'}`}
                          title="深空暗黑主题"
                        />
                        <button
                          onClick={() => setReaderTheme('sepia')}
                          className={`w-3.5 h-3.5 rounded-full bg-[#fbf0d9] border ${readerTheme === 'sepia' ? 'ring-2 ring-blue-500 border-amber-800' : 'border-amber-300'}`}
                          title="暖沙羊皮纸护眼主题"
                        />
                        <button
                          onClick={() => setReaderTheme('midnight')}
                          className={`w-3.5 h-3.5 rounded-full bg-black border ${readerTheme === 'midnight' ? 'ring-2 ring-blue-500 border-white' : 'border-neutral-700'}`}
                          title="极黑纯粹主题"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 选中文本时的浮动划线工具条 */}
                  {selectedText && (
                    <div className="mx-3 my-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700 shadow-xl flex items-center justify-between text-xs animate-in fade-in">
                      <span className="text-[11px] text-slate-300 truncate max-w-[130px] italic">
                        "{selectedText}"
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleAddHighlight(selectedText, 'yellow')}
                          className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 font-medium text-[10px] hover:bg-amber-300 transition"
                        >
                          🟡 划线
                        </button>
                        <button
                          onClick={() => handleAddHighlight(selectedText, 'green')}
                          className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-900 font-medium text-[10px] hover:bg-emerald-300 transition"
                        >
                          🟢 重点
                        </button>
                        <button
                          onClick={() => {
                            insertNoteTemplate(`> ${selectedText}\n\n我的想法：`);
                            setSelectedText('');
                            setRightTab('notes');
                          }}
                          className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium text-[10px] hover:bg-blue-500 transition"
                        >
                          📝 记入笔记
                        </button>
                        <button
                          onClick={() => setSelectedText('')}
                          className="p-0.5 hover:text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 阅读正文区域 */}
                  <div
                    onMouseUp={() => {
                      const sel = window.getSelection();
                      const t = sel ? sel.toString().trim() : '';
                      if (t.length > 2) setSelectedText(t);
                    }}
                    className="flex-1 overflow-y-auto p-4 select-text"
                  >
                    {selectedBookmark.content_raw ? (
                      <div className="space-y-4">
                        <h1 className="text-base font-bold leading-snug pb-2 border-b border-slate-800/60 font-serif">
                          {selectedBookmark.title}
                        </h1>

                        <div className="pt-2">
                          {renderParagraphs(
                            selectedBookmark.content_raw,
                            getHighlights(selectedBookmark),
                            readerTheme,
                            readerFontSize
                          )}
                        </div>

                        {/* 划线列表区块 */}
                        {getHighlights(selectedBookmark).length > 0 && (
                          <div className="mt-8 pt-4 border-t border-slate-800/80">
                            <div className="flex items-center justify-between text-xs font-semibold mb-2 opacity-80">
                              <span className="flex items-center gap-1">
                                <Highlighter className="w-3.5 h-3.5 text-amber-400" />
                                <span>我的划线批注 ({getHighlights(selectedBookmark).length})</span>
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {getHighlights(selectedBookmark).map(hl => (
                                <div key={hl.id} className="p-2 rounded bg-slate-900/40 border border-slate-800/60 text-xs flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="italic text-slate-300">"{hl.text}"</p>
                                    <span className="text-[10px] text-slate-500 mt-0.5 block">{hl.created_at}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteHighlight(hl.id)}
                                    className="text-slate-500 hover:text-red-400 transition p-1"
                                    title="删除划线"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <BookOpen className="w-10 h-10 text-slate-600 opacity-60" />
                        <div>
                          <p className="text-xs font-semibold text-slate-300">正文尚未离线抓取</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            点击下方按钮使用 Readability 智能提取文章纯净正文
                          </p>
                        </div>
                        <button
                          onClick={() => handleFetchContent(selectedBookmark.id)}
                          disabled={isFetchingContent}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50 shadow"
                        >
                          {isFetchingContent ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>正文智能提取中...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              <span>一键离线提取正文</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 选项卡 3：私人笔记与知识沉淀 */}
              {rightTab === 'notes' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3">
                  {/* 笔记标题与自动保存状态 */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>我的随想与知识笔记</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {noteSaveStatus === 'saving' && '正在保存...'}
                      {noteSaveStatus === 'saved' && '● 已自动保存至 SQLite'}
                      {noteSaveStatus === 'idle' && (selectedBookmark.user_notes ? '已同步' : '空白草稿')}
                    </span>
                  </div>

                  {/* 快捷模板栏 */}
                  <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-[10px] text-slate-500 shrink-0">快捷模板:</span>
                    <button
                      onClick={() => insertNoteTemplate('💡 核心启发：\n- ')}
                      className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition shrink-0"
                    >
                      💡 核心启发
                    </button>
                    <button
                      onClick={() => insertNoteTemplate('📌 落地实践：\n1. ')}
                      className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition shrink-0"
                    >
                      📌 落地实践
                    </button>
                    <button
                      onClick={() => insertNoteTemplate('⚠️ 疑问/待考证：\n- ')}
                      className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition shrink-0"
                    >
                      ⚠️ 疑问备忘
                    </button>
                  </div>

                  {/* 笔记编辑框 */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <textarea
                      value={noteText}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      placeholder="写下你对本篇文章的理解、核心启发、落地步骤或行动清单...（支持 Markdown，内容会自动实时保存至本地数据库）"
                      className="flex-1 w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 leading-relaxed font-sans resize-none select-text"
                    />
                  </div>

                  {/* 笔记底部信息 */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 shrink-0">
                    <span>{noteText.length} 字</span>
                    <span>支持标准 Markdown 语法</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="h-10 px-4 border-b border-slate-800/60 flex items-center justify-between text-xs select-none shrink-0 bg-[#0c1017]/40">
                <span className="font-semibold text-slate-500">书签详情 & 阅读洞察</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <Layers className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">选择左侧任意书签查看 AI 摘要、沉浸阅读正文或记录私人笔记</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 4. 全屏沉浸式大阅读器弹窗 (Full-window Immersive Reader) */}
      {isReaderFullscreen && selectedBookmark && (
        <div className={`fixed inset-0 z-50 flex flex-col ${READER_THEMES[readerTheme].bg} ${READER_THEMES[readerTheme].text}`}>
          {/* 顶部工具栏 */}
          <header className={`h-14 px-6 border-b flex items-center justify-between shrink-0 select-none ${READER_THEMES[readerTheme].border} ${READER_THEMES[readerTheme].cardBg}`}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsReaderFullscreen(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${READER_THEMES[readerTheme].border} hover:opacity-80`}
                title="退出阅读模式 (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>退出阅读 (Esc)</span>
              </button>

              <div className="h-4 w-px bg-slate-700/50 mx-1" />

              <div className="min-w-0">
                <h2 className="text-sm font-bold truncate max-w-md font-serif">
                  {selectedBookmark.title}
                </h2>
                <div className="flex items-center gap-2 text-[11px] opacity-60 font-mono">
                  <span>{selectedBookmark.domain}</span>
                  <span>·</span>
                  <span>{getReadingStats(selectedBookmark.content_raw).chars} 字</span>
                  <span>·</span>
                  <span>预计阅读 {getReadingStats(selectedBookmark.content_raw).minutes} 分钟</span>
                </div>
              </div>
            </div>

            {/* 中右部：字号、主题、分屏笔记 */}
            <div className="flex items-center gap-3">
              {/* 字号调节 */}
              <div className={`flex items-center border rounded-lg px-2 py-1 text-xs gap-1.5 ${READER_THEMES[readerTheme].border}`}>
                <Type className="w-3.5 h-3.5 opacity-60" />
                <button
                  onClick={() => setReaderFontSize(s => Math.max(12, s - 1))}
                  className="px-1 font-bold hover:text-blue-400 transition"
                  title="缩小字号"
                >
                  A-
                </button>
                <span className="font-mono text-xs opacity-75">{readerFontSize}px</span>
                <button
                  onClick={() => setReaderFontSize(s => Math.min(26, s + 1))}
                  className="px-1 font-bold hover:text-blue-400 transition"
                  title="放大字号"
                >
                  A+
                </button>
              </div>

              {/* 三套经典阅读主题 */}
              <div className={`flex items-center gap-1.5 border rounded-lg p-1 ${READER_THEMES[readerTheme].border}`}>
                <button
                  onClick={() => setReaderTheme('dark')}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                    readerTheme === 'dark' ? 'bg-blue-600 text-white font-medium' : 'hover:opacity-75'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>深空</span>
                </button>
                <button
                  onClick={() => setReaderTheme('sepia')}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                    readerTheme === 'sepia' ? 'bg-amber-600 text-white font-medium' : 'hover:opacity-75'
                  }`}
                >
                  <Coffee className="w-3 h-3" />
                  <span>暖沙</span>
                </button>
                <button
                  onClick={() => setReaderTheme('midnight')}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                    readerTheme === 'midnight' ? 'bg-neutral-800 text-white font-medium' : 'hover:opacity-75'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/50" />
                  <span>极黑</span>
                </button>
              </div>

              {/* 分屏笔记切换开关 */}
              <button
                onClick={() => setIsSplitNoteOpen(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                  isSplitNoteOpen
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : `${READER_THEMES[readerTheme].border} hover:opacity-80`
                }`}
                title="切换左右分屏边读边记笔记"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>随堂笔记 {isSplitNoteOpen ? '已开启' : '已收起'}</span>
              </button>

              <a
                href={selectedBookmark.url}
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-lg border hover:opacity-80 transition ${READER_THEMES[readerTheme].border}`}
                title="在浏览器中查看原网页"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </header>

          {/* 主体双栏 / 单栏区域 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧：文章沉浸式阅读正文 */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-10 relative select-text"
              onMouseUp={() => {
                const sel = window.getSelection();
                const t = sel ? sel.toString().trim() : '';
                if (t.length > 2) setSelectedText(t);
              }}
            >
              <div className="max-w-3xl mx-auto">
                {/* 划线工具条 */}
                {selectedText && (
                  <div className="sticky top-2 z-20 mb-6 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl flex items-center justify-between text-xs animate-in fade-in">
                    <span className="text-slate-300 truncate max-w-sm italic mr-2">
                      "{selectedText}"
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAddHighlight(selectedText, 'yellow')}
                        className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-medium text-xs hover:bg-amber-300 transition"
                      >
                        🟡 划线
                      </button>
                      <button
                        onClick={() => handleAddHighlight(selectedText, 'green')}
                        className="px-2.5 py-1 rounded bg-emerald-400 text-slate-950 font-medium text-xs hover:bg-emerald-300 transition"
                      >
                        🟢 重点
                      </button>
                      <button
                        onClick={() => handleAddHighlight(selectedText, 'purple')}
                        className="px-2.5 py-1 rounded bg-purple-400 text-slate-950 font-medium text-xs hover:bg-purple-300 transition"
                      >
                        🟣 批注
                      </button>
                      <button
                        onClick={() => {
                          insertNoteTemplate(`> ${selectedText}\n\n我的想法：`);
                          setSelectedText('');
                          setIsSplitNoteOpen(true);
                        }}
                        className="px-2.5 py-1 rounded bg-blue-600 text-white font-medium text-xs hover:bg-blue-500 transition"
                      >
                        📝 记入随堂笔记
                      </button>
                      <button
                        onClick={() => setSelectedText('')}
                        className="p-1 hover:text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 文章标题及元数据 */}
                <div className="mb-8 pb-6 border-b border-slate-800/60">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight font-serif">
                    {selectedBookmark.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-xs opacity-60">
                    <span>来源: {selectedBookmark.domain}</span>
                    <span>·</span>
                    <span className="break-all">{selectedBookmark.url}</span>
                  </div>
                  {selectedBookmark.ai_summary && (
                    <div className="mt-4 p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 text-xs text-blue-200/90 leading-relaxed font-sans">
                      <span className="font-semibold text-blue-400 mr-1.5">💡 AI 导读摘要:</span>
                      {selectedBookmark.ai_summary}
                    </div>
                  )}
                </div>

                {/* 文章段落 */}
                <div className="prose max-w-none">
                  {renderParagraphs(
                    selectedBookmark.content_raw,
                    getHighlights(selectedBookmark),
                    readerTheme,
                    readerFontSize
                  )}
                </div>

                {/* 文章末尾：高亮与书签备注汇总 */}
                {getHighlights(selectedBookmark).length > 0 && (
                  <div className="mt-12 pt-6 border-t border-slate-800/60">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-sm flex items-center gap-1.5">
                        <Highlighter className="w-4 h-4 text-amber-400" />
                        <span>全篇划线高亮 ({getHighlights(selectedBookmark).length})</span>
                      </span>
                    </div>
                    <div className="space-y-2">
                      {getHighlights(selectedBookmark).map(hl => (
                        <div key={hl.id} className="p-3 rounded-lg border text-xs flex items-start justify-between gap-3 bg-slate-900/30 border-slate-800/60">
                          <div className="flex-1">
                            <p className="leading-relaxed italic">"{hl.text}"</p>
                            <span className="text-[10px] opacity-50 mt-1 block font-mono">{hl.created_at}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteHighlight(hl.id)}
                            className="opacity-50 hover:opacity-100 hover:text-red-400 p-1"
                            title="删除此划线"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：分屏随堂笔记编辑器 */}
            {isSplitNoteOpen && (
              <div className={`w-96 border-l flex flex-col h-full shrink-0 select-none ${READER_THEMES[readerTheme].border} ${READER_THEMES[readerTheme].cardBg}`}>
                <div className={`h-11 px-4 border-b flex items-center justify-between text-xs shrink-0 ${READER_THEMES[readerTheme].border}`}>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>边读边记 · 私人笔记</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-60 font-mono">
                      {noteSaveStatus === 'saving' ? '正在保存...' : noteSaveStatus === 'saved' ? '已自动保存' : ''}
                    </span>
                    <button
                      onClick={() => setIsSplitNoteOpen(false)}
                      className="opacity-60 hover:opacity-100"
                      title="收起分屏笔记"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-2 border-b border-slate-800/40 flex items-center gap-1.5 flex-wrap shrink-0">
                  <span className="text-[10px] opacity-50 px-1">模板:</span>
                  <button
                    onClick={() => insertNoteTemplate("### 📌 关键收获\n- \n- ")}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition"
                  >
                    + 关键收获
                  </button>
                  <button
                    onClick={() => insertNoteTemplate("### ❓ 疑问与待查\n- ")}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition"
                  >
                    + 疑问待查
                  </button>
                  <button
                    onClick={() => insertNoteTemplate("### 💡 行动想法\n- ")}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition"
                  >
                    + 行动想法
                  </button>
                </div>

                <div className="flex-1 p-3 flex flex-col">
                  <textarea
                    value={noteText}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="边阅读边随手记录思考、批注或下一步行动... (Markdown 支持，自动存至本地 SQLite 数据库)"
                    className={`w-full flex-1 p-3 rounded-lg border resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-xs leading-relaxed ${READER_THEMES[readerTheme].border} ${READER_THEMES[readerTheme].bg} ${READER_THEMES[readerTheme].text}`}
                  />
                  <div className="flex items-center justify-between text-[10px] opacity-50 pt-2 shrink-0">
                    <span>{noteText.length} 字</span>
                    <span>支持实时自动落盘</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. 添加书签弹窗 (Add Modal) */}
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
                  <>
                    <button
                      onClick={async () => {
                        const p = await StartBatchAIAnalysis();
                        setAnalysisProgress(p);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                      title="分析尚未处理或未分类的书签"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>启动/继续分析</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("确定要对所有书签重新进行标准分类与深度摘要吗？")) return;
                        const p = await ResetAndReanalyzeAll();
                        setAnalysisProgress(p);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
                      title="根据最新的 10 大分类标准，重新对全部书签进行 AI 精准分析"
                    >
                      <Layers className="w-3 h-3" />
                      <span>重新全量分析</span>
                    </button>
                  </>
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
                          {task.category && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300 shrink-0 font-medium">
                              <span>{CATEGORY_ICONS[task.category] || '📁'}</span>
                              <span>{task.category}</span>
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
