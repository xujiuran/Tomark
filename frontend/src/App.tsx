import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, Archive, Trash2, ExternalLink, 
  Sparkles, Search, Plus, Settings, Tag as TagIcon, BarChart2, 
  CheckCircle, Globe, RefreshCw, X, FolderTree, ChevronDown, ChevronRight,
  Edit3, Check, Loader2, ArrowRight, MoreVertical, LayoutGrid, Palette, Layers,
  FileText, CornerDownRight, FolderPlus, FileUp, Compass, Bookmark as BookmarkIcon,
  Clock, AlertCircle, CheckSquare, Square, CheckCheck, ListTodo, FolderInput, Tags, GripVertical,
  ChevronsUpDown
} from 'lucide-react';
import { 
  GetBookmarks, AddBookmark, DeleteBookmark, ToggleFavorite, 
  ToggleArchive, AnalyzeBookmark, GetTags, GetCategoryHierarchy, GetStats, 
  SaveAIConfig, GetAIConfig, SelectAndImportBookmarks, 
  StartBatchAIAnalysis, GetAnalysisProgress, ResetAndReanalyzeAll,
  HasArcBrowser, ImportFromArc, ExportArcBookmarks,
  CreateCategory, RenameCategory, MergeCategories, DeleteCategory,
  MoveSubCategory, RenameSubCategory, DeleteSubCategory,
  UpdateBookmarkCategory, UpdateBookmarkTags,
  BatchUpdateCategory, BatchAddTags, BatchRemoveTag, BatchToggleArchive, BatchToggleFavorite, BatchDeleteBookmarks
} from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';
import { 
  QuantumLogoIcon, getCategoryTechIcon, CATEGORY_ACCENT_COLORS 
} from './icons/techIcons';
import { TechIconShowcase } from './components/TechIconShowcase';

export default function App() {
  const [bookmarks, setBookmarks] = useState<models.Bookmark[]>([]);
  const [tags, setTags] = useState<models.Tag[]>([]);
  const [hierarchies, setHierarchies] = useState<models.CategoryHierarchy[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(false);
  const [isTagsCollapsed, setIsTagsCollapsed] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [stats, setStats] = useState<models.Stats | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<models.Bookmark | null>(null);

  // Tech Icon Showcase
  const [isIconShowcaseOpen, setIsIconShowcaseOpen] = useState(false);

  // Category & Sub-category modals & editing
  const [isCreateCatOpen, setIsCreateCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [catAction, setCatAction] = useState<{
    type: 'rename' | 'merge' | 'delete' | null;
    catName: string;
    newName?: string;
    targetCat?: string;
    deleteBookmarks?: boolean;
  }>({ type: null, catName: '' });

  const [subAction, setSubAction] = useState<{
    type: 'move' | 'rename' | 'delete' | null;
    catName: string;
    domain: string;
    subName: string;
    targetCat?: string;
    newName?: string;
    deleteBookmarks?: boolean;
  }>({ type: null, catName: '', domain: '', subName: '' });

  // Detail panel tag and category editing
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [detailSubCatInput, setDetailSubCatInput] = useState('');

  // Batch management mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);
  const [isBatchActionLoading, setIsBatchActionLoading] = useState(false);
  const [batchModal, setBatchModal] = useState<{
    type: 'category' | 'tags' | 'delete' | null;
    targetCategory?: string;
    subCategory?: string;
    newTagInput?: string;
  }>({ type: null });

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('tomark_sidebar_width') || localStorage.getItem('linkit_sidebar_width');
    return saved ? Math.min(480, Math.max(180, parseInt(saved, 10))) : 240;
  });
  const isResizingSidebar = useRef(false);

  // Resizable right detail panel width
  const [detailWidth, setDetailWidth] = useState<number>(() => {
    const saved = localStorage.getItem('tomark_detail_width') || localStorage.getItem('linkit_detail_width');
    return saved ? Math.min(650, Math.max(260, parseInt(saved, 10))) : 380;
  });
  const isResizingDetail = useRef(false);

  // Resizable tags section height
  const [tagsHeight, setTagsHeight] = useState<number>(() => {
    const saved = localStorage.getItem('tomark_tags_height') || localStorage.getItem('linkit_tags_height');
    return saved ? Math.min(450, Math.max(80, parseInt(saved, 10))) : 160;
  });
  const isResizingTags = useRef(false);

  // Drag and drop bookmarks or tree subcategories onto category tree
  const [draggingBookmarkIds, setDraggingBookmarkIds] = useState<string[]>([]);
  const [draggingSubCat, setDraggingSubCat] = useState<{
    sourceCat: string;
    domain: string;
    name: string;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

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
  const [aiModel, setAiModel] = useState('cpa/deepseek-v4.1-flash-1017');
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
        setAiModel(cfg.model || 'cpa/deepseek-v4.1-flash-1017');
        if (cfg.api_key) setAiApiKey(cfg.api_key);
      }
    }).catch(console.error);
  }, []);

  // Category management handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await CreateCategory(newCatName.trim());
      setNewCatName('');
      setIsCreateCatOpen(false);
      await loadData();
    } catch (err: any) {
      alert("创建分类失败: " + err);
    }
  };

  const handleRenameCategory = async () => {
    if (!catAction.catName || !catAction.newName?.trim()) return;
    try {
      await RenameCategory(catAction.catName, catAction.newName.trim());
      if (selectedCategory === catAction.catName) {
        setSelectedCategory(catAction.newName.trim());
      }
      setCatAction({ type: null, catName: '' });
      await loadData();
    } catch (err: any) {
      alert("重命名失败: " + err);
    }
  };

  const handleMergeCategory = async () => {
    if (!catAction.catName || !catAction.targetCat || catAction.catName === catAction.targetCat) return;
    try {
      await MergeCategories(catAction.catName, catAction.targetCat);
      if (selectedCategory === catAction.catName) {
        setSelectedCategory(catAction.targetCat);
      }
      setCatAction({ type: null, catName: '' });
      await loadData();
    } catch (err: any) {
      alert("合并分类失败: " + err);
    }
  };

  const handleDeleteCategory = async () => {
    if (!catAction.catName) return;
    try {
      await DeleteCategory(catAction.catName, !!catAction.deleteBookmarks);
      if (selectedCategory === catAction.catName) {
        setSelectedCategory('');
        setSelectedDomain('');
        setSelectedSubName('');
      }
      setCatAction({ type: null, catName: '' });
      await loadData();
    } catch (err: any) {
      alert("删除分类失败: " + err);
    }
  };

  const handleMoveSubCategory = async () => {
    if (!subAction.domain || !subAction.targetCat) return;
    try {
      await MoveSubCategory(subAction.domain, subAction.targetCat);
      if (selectedDomain === subAction.domain) {
        setSelectedCategory(subAction.targetCat);
      }
      setSubAction({ type: null, catName: '', domain: '', subName: '' });
      await loadData();
    } catch (err: any) {
      alert("转移大类失败: " + err);
    }
  };

  const handleRenameSubCategory = async () => {
    if (!subAction.domain || !subAction.newName?.trim()) return;
    try {
      await RenameSubCategory(subAction.domain, subAction.newName.trim());
      if (selectedDomain === subAction.domain) {
        setSelectedSubName(subAction.newName.trim());
      }
      setSubAction({ type: null, catName: '', domain: '', subName: '' });
      await loadData();
    } catch (err: any) {
      alert("修改站点名称失败: " + err);
    }
  };

  const handleDeleteSubCategory = async () => {
    if (!subAction.domain) return;
    try {
      await DeleteSubCategory(subAction.catName, subAction.domain, !!subAction.deleteBookmarks);
      if (selectedDomain === subAction.domain) {
        setSelectedDomain('');
        setSelectedSubName('');
      }
      setSubAction({ type: null, catName: '', domain: '', subName: '' });
      await loadData();
    } catch (err: any) {
      alert("删除站点书签失败: " + err);
    }
  };

  const handleUpdateBookmarkCat = async (cat: string, subCat?: string) => {
    if (!selectedBookmark) return;
    try {
      const finalSub = subCat !== undefined ? subCat : selectedBookmark.sub_category;
      await UpdateBookmarkCategory(selectedBookmark.id, cat, finalSub);
      setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, category: cat, sub_category: finalSub }) : null);
      setBookmarks(prev => prev.map(b => b.id === selectedBookmark.id ? models.Bookmark.createFrom({ ...b, category: cat, sub_category: finalSub }) : b));
      await loadData();
      setIsEditingCategory(false);
    } catch (err: any) {
      alert("修改书签分类失败: " + err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedBookmark) return;
    const currentTags = selectedBookmark.tags || [];
    const updated = currentTags.filter(t => t !== tagToRemove);
    try {
      await UpdateBookmarkTags(selectedBookmark.id, updated);
      setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, tags: updated }) : null);
      setBookmarks(prev => prev.map(b => b.id === selectedBookmark.id ? models.Bookmark.createFrom({ ...b, tags: updated }) : b));
      const t = await GetTags();
      setTags(t || []);
    } catch (err: any) {
      alert("移除标签失败: " + err);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookmark || !newTagInput.trim()) return;
    const val = newTagInput.trim();
    const currentTags = selectedBookmark.tags || [];
    if (currentTags.includes(val)) {
      setNewTagInput('');
      return;
    }
    const updated = [...currentTags, val];
    try {
      await UpdateBookmarkTags(selectedBookmark.id, updated);
      setSelectedBookmark(prev => prev ? models.Bookmark.createFrom({ ...prev, tags: updated }) : null);
      setBookmarks(prev => prev.map(b => b.id === selectedBookmark.id ? models.Bookmark.createFrom({ ...b, tags: updated }) : b));
      setNewTagInput('');
      const t = await GetTags();
      setTags(t || []);
    } catch (err: any) {
      alert("添加标签失败: " + err);
    }
  };

  // Batch Management Handlers
  const handleToggleSelect = (id: string, index: number, isShiftKey: boolean = false) => {
    const next = new Set(selectedBookmarkIds);
    if (isShiftKey && lastSelectedIdx !== null && lastSelectedIdx !== index) {
      const start = Math.min(lastSelectedIdx, index);
      const end = Math.max(lastSelectedIdx, index);
      const shouldSelect = !selectedBookmarkIds.has(id);
      for (let i = start; i <= end; i++) {
        if (bookmarks[i]) {
          if (shouldSelect) next.add(bookmarks[i].id);
          else next.delete(bookmarks[i].id);
        }
      }
    } else {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }
    setSelectedBookmarkIds(next);
    setLastSelectedIdx(index);
  };

  const handleSelectAll = () => {
    if (selectedBookmarkIds.size === bookmarks.length) {
      setSelectedBookmarkIds(new Set());
    } else {
      setSelectedBookmarkIds(new Set(bookmarks.map(b => b.id)));
    }
  };

  const handleBatchMoveCategory = async (targetCategory: string, subCategory: string = '') => {
    if (!targetCategory || selectedBookmarkIds.size === 0) return;
    setIsBatchActionLoading(true);
    try {
      const ids = Array.from(selectedBookmarkIds);
      await BatchUpdateCategory(ids, targetCategory, subCategory);
      setBatchModal({ type: null });
      setSelectedBookmarkIds(new Set());
      await loadData();
    } catch (err: any) {
      alert("批量移动分类失败: " + err);
    } finally {
      setIsBatchActionLoading(false);
    }
  };

  const handleBatchAddTags = async (tagsStr: string) => {
    if (!tagsStr.trim() || selectedBookmarkIds.size === 0) return;
    setIsBatchActionLoading(true);
    try {
      const ids = Array.from(selectedBookmarkIds);
      const newTags = tagsStr.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
      await BatchAddTags(ids, newTags);
      setBatchModal({ type: null });
      await loadData();
    } catch (err: any) {
      alert("批量添加标签失败: " + err);
    } finally {
      setIsBatchActionLoading(false);
    }
  };

  const handleBatchRemoveTag = async (tagName: string) => {
    if (!tagName.trim() || selectedBookmarkIds.size === 0) return;
    setIsBatchActionLoading(true);
    try {
      const ids = Array.from(selectedBookmarkIds);
      await BatchRemoveTag(ids, tagName.trim());
      await loadData();
    } catch (err: any) {
      alert("批量移除标签失败: " + err);
    } finally {
      setIsBatchActionLoading(false);
    }
  };

  const handleBatchArchive = async (archive: boolean) => {
    if (selectedBookmarkIds.size === 0) return;
    setIsBatchActionLoading(true);
    try {
      const ids = Array.from(selectedBookmarkIds);
      await BatchToggleArchive(ids, archive);
      setSelectedBookmarkIds(new Set());
      await loadData();
    } catch (err: any) {
      alert("批量归档操作失败: " + err);
    } finally {
      setIsBatchActionLoading(false);
    }
  };

  const handleBatchFavorite = async (favorite: boolean) => {
    if (selectedBookmarkIds.size === 0) return;
    setIsBatchActionLoading(true);
    try {
      const ids = Array.from(selectedBookmarkIds);
      await BatchToggleFavorite(ids, favorite);
      await loadData();
    } catch (err: any) {
      alert("批量星标操作失败: " + err);
    } finally {
      setIsBatchActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedBookmarkIds.size === 0) return;
    setIsBatchActionLoading(true);
    try {
      const ids = Array.from(selectedBookmarkIds);
      await BatchDeleteBookmarks(ids);
      setBatchModal({ type: null });
      setSelectedBookmarkIds(new Set());
      if (selectedBookmark && ids.includes(selectedBookmark.id)) {
        setSelectedBookmark(null);
      }
      await loadData();
    } catch (err: any) {
      alert("批量删除失败: " + err);
    } finally {
      setIsBatchActionLoading(false);
    }
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

  // Sidebar drag-to-resize handler
  const startResizingSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingSidebar.current) return;
      const newWidth = Math.min(480, Math.max(180, moveEvent.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem('tomark_sidebar_width', String(newWidth));
    };

    const onMouseUp = () => {
      isResizingSidebar.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Right detail panel drag-to-resize handler
  const startResizingDetail = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingDetail.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingDetail.current) return;
      const newWidth = Math.min(650, Math.max(260, window.innerWidth - moveEvent.clientX));
      setDetailWidth(newWidth);
      localStorage.setItem('tomark_detail_width', String(newWidth));
    };

    const onMouseUp = () => {
      isResizingDetail.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Tags section vertical height drag-to-resize handler
  const startResizingTags = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingTags.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const startY = e.clientY;
    const startHeight = tagsHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingTags.current) return;
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.min(450, Math.max(80, startHeight + delta));
      setTagsHeight(newHeight);
      localStorage.setItem('tomark_tags_height', String(newHeight));
    };

    const onMouseUp = () => {
      isResizingTags.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Toggle expand / collapse all categories in tree
  const handleToggleAllCategories = () => {
    const hasAnyExpanded = hierarchies.some(h => (expandedCategories[h.name] ?? true));
    const next: Record<string, boolean> = {};
    for (const h of hierarchies) {
      next[h.name] = !hasAnyExpanded;
    }
    setExpandedCategories(next);
  };

  // Move a subcategory (domain) to another major category via drag and drop
  const handleDropSubCategoryOnCategory = async (domain: string, targetCategory: string) => {
    if (!domain || !targetCategory) return;
    try {
      await MoveSubCategory(domain, targetCategory);
      setDraggingSubCat(null);
      await loadData();
    } catch (err: any) {
      alert("移动站点失败: " + err);
    }
  };

  // Drag and drop bookmarks onto category / subcategory
  const handleDropOnCategory = async (bookmarkIds: string[], targetCategory: string) => {
    if (!targetCategory || bookmarkIds.length === 0) return;
    try {
      if (bookmarkIds.length === 1) {
        const b = bookmarks.find(x => x.id === bookmarkIds[0]);
        await UpdateBookmarkCategory(bookmarkIds[0], targetCategory, b?.sub_category || '');
      } else {
        await BatchUpdateCategory(bookmarkIds, targetCategory, '');
      }
      if (isBatchMode) {
        setSelectedBookmarkIds(new Set());
      }
      await loadData();
    } catch (err: any) {
      alert("拖拽归类失败: " + err);
    }
  };

  const handleDropOnSubCategory = async (bookmarkIds: string[], targetCategory: string, subCategoryName: string) => {
    if (!targetCategory || bookmarkIds.length === 0) return;
    try {
      if (bookmarkIds.length === 1) {
        await UpdateBookmarkCategory(bookmarkIds[0], targetCategory, subCategoryName);
      } else {
        await BatchUpdateCategory(bookmarkIds, targetCategory, subCategoryName);
      }
      if (isBatchMode) {
        setSelectedBookmarkIds(new Set());
      }
      await loadData();
    } catch (err: any) {
      alert("拖拽归类失败: " + err);
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
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-900/60 to-indigo-900/40 border border-blue-500/30 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <QuantumLogoIcon size={18} glow={true} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-cyan-300">Tomark</span>
            <span className="text-slate-600 text-xs hidden sm:inline">/</span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">收藏不吃灰</span>
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
            onClick={() => setIsIconShowcaseOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-700/50 text-xs font-medium shadow-sm transition shrink-0"
            title="浏览本地科技感图标与文件映射图鉴"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">科技图鉴</span>
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
        <aside 
          style={{ width: `${sidebarWidth}px` }}
          className="flex flex-col border-r border-slate-800/80 bg-[#0f1420]/70 backdrop-blur-xl select-none shrink-0 relative"
        >
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
            {/* 表头：分类与站点，支持折叠全部、新建大类 */}
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between select-none">
              <div 
                className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition"
                onClick={() => setIsCategoriesCollapsed(!isCategoriesCollapsed)}
                title="折叠/展开分类树"
              >
                <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                <span>分类与站点</span>
                <span className="text-slate-500 hover:text-slate-300 ml-0.5">
                  {isCategoriesCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  {hierarchies.length} 大类
                </span>
                {!isCategoriesCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAllCategories();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                    title={hierarchies.some(h => (expandedCategories[h.name] ?? true)) ? "一键全部收起" : "一键全部展开"}
                  >
                    <ChevronsUpDown className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreateCatOpen(true);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="新建一级大类"
                >
                  <Plus className="w-3 h-3 text-blue-400" />
                </button>
              </div>
            </div>

            {!isCategoriesCollapsed && (
              <div className="mt-1 space-y-1 select-none pr-0.5">
              {hierarchies.map((cat) => {
                const isCatActive = selectedCategory === cat.name && !selectedDomain;
                const isExpanded = expandedCategories[cat.name] ?? true;

                return (
                  <div key={cat.name} className="space-y-0.5">
                    {/* 一级大类行 */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverTarget !== `cat:${cat.name}`) {
                          setDragOverTarget(`cat:${cat.name}`);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (dragOverTarget === `cat:${cat.name}`) {
                          setDragOverTarget(null);
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragOverTarget(null);
                        try {
                          const dataStr = e.dataTransfer.getData('application/json');
                          if (dataStr) {
                            const data = JSON.parse(dataStr);
                            if (data?.type === 'tree-subcategory') {
                              if (data.sourceCategory !== cat.name) {
                                await handleDropSubCategoryOnCategory(data.domain, cat.name);
                              }
                            } else if (data?.bookmarkIds?.length > 0) {
                              await handleDropOnCategory(data.bookmarkIds, cat.name);
                            }
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition cursor-pointer group ${
                        dragOverTarget === `cat:${cat.name}`
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-950/60 font-semibold scale-[1.02]'
                          : isCatActive
                            ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 font-semibold shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'
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
                          className="p-0.5 rounded hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        {getCategoryTechIcon(cat.name, 14, "shrink-0", isCatActive)}
                        <span className="truncate">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* 悬停大类管理快捷图标 */}
                        <div className="hidden group-hover:flex items-center gap-0.5 bg-slate-900/90 rounded px-1 py-0.5 border border-slate-700/60 shadow-sm">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCatAction({ type: 'rename', catName: cat.name, newName: cat.name });
                            }}
                            className="p-0.5 rounded hover:text-blue-400 text-slate-400 transition"
                            title="重命名大类"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCatAction({ type: 'merge', catName: cat.name, targetCat: '' });
                            }}
                            className="p-0.5 rounded hover:text-amber-400 text-slate-400 transition"
                            title="合并至其他分类"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCatAction({ type: 'delete', catName: cat.name, deleteBookmarks: false });
                            }}
                            className="p-0.5 rounded hover:text-red-400 text-slate-400 transition"
                            title="删除大类"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded-full group-hover:hidden">
                          {cat.count}
                        </span>
                      </div>
                    </div>

                    {/* 二级站点/主域名行 (仅在展开且有二级分类时显示) */}
                    {isExpanded && cat.sub_categories && cat.sub_categories.length > 0 && (
                      <div className="pl-4 space-y-0.5 border-l border-slate-800/80 ml-3">
                        {cat.sub_categories.map((sub) => {
                          const isSubSelected = selectedDomain === sub.domain;
                          const isBeingDragged = draggingSubCat?.domain === sub.domain && draggingSubCat?.sourceCat === cat.name;
                          return (
                            <div
                              key={`${cat.name}-${sub.domain}`}
                              draggable={true}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  type: 'tree-subcategory',
                                  sourceCategory: cat.name,
                                  domain: sub.domain,
                                  subName: sub.name,
                                }));
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggingSubCat({
                                  sourceCat: cat.name,
                                  domain: sub.domain,
                                  name: sub.name,
                                });
                              }}
                              onDragEnd={() => {
                                setDraggingSubCat(null);
                                setDragOverTarget(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverTarget !== `sub:${cat.name}:${sub.domain}`) {
                                  setDragOverTarget(`sub:${cat.name}:${sub.domain}`);
                                }
                              }}
                              onDragLeave={(e) => {
                                e.stopPropagation();
                                if (dragOverTarget === `sub:${cat.name}:${sub.domain}`) {
                                  setDragOverTarget(null);
                                }
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverTarget(null);
                                try {
                                  const dataStr = e.dataTransfer.getData('application/json');
                                  if (dataStr) {
                                    const data = JSON.parse(dataStr);
                                    if (data?.bookmarkIds?.length > 0) {
                                      await handleDropOnSubCategory(data.bookmarkIds, cat.name, sub.name || sub.domain);
                                    }
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
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
                              className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition cursor-pointer group/sub ${
                                isBeingDragged
                                  ? 'opacity-40 border border-dashed border-cyan-400 bg-cyan-950/40 scale-[0.98]'
                                  : dragOverTarget === `sub:${cat.name}:${sub.domain}`
                                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/50 font-medium scale-[1.02]'
                                    : isSubSelected
                                      ? 'bg-blue-600/40 text-blue-300 border border-blue-500/50 font-medium'
                                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                              }`}
                              title="点击筛选站点；支持按住拖拽至其他「一级大类」进行转移"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <GripVertical className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover/sub:opacity-80 cursor-grab shrink-0 transition -mr-0.5" />
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubSelected ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                                <span className="truncate">{sub.name}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* 悬停站点管理快捷图标 */}
                                <div className="hidden group-hover/sub:flex items-center gap-0.5 bg-slate-900/90 rounded px-1 py-0.5 border border-slate-700/60 shadow-sm">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubAction({ type: 'move', catName: cat.name, domain: sub.domain, subName: sub.name, targetCat: cat.name });
                                    }}
                                    className="p-0.5 rounded hover:text-cyan-400 text-slate-400 transition"
                                    title="将该站点书签移动到其他大类"
                                  >
                                    <FolderPlus className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubAction({ type: 'rename', catName: cat.name, domain: sub.domain, subName: sub.name, newName: sub.name });
                                    }}
                                    className="p-0.5 rounded hover:text-blue-400 text-slate-400 transition"
                                    title="修改站点显示别名"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubAction({ type: 'delete', catName: cat.name, domain: sub.domain, subName: sub.name, deleteBookmarks: true });
                                    }}
                                    className="p-0.5 rounded hover:text-red-400 text-slate-400 transition"
                                    title="删除该站点的书签"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono group-hover/sub:hidden">
                                  {sub.count}
                                </span>
                              </div>
                            </div>
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
            )}
          </div>

          {/* 拖拽调整核心标签与分类树垂直高度分配的分割把手 */}
          <div
            onMouseDown={startResizingTags}
            className="h-1.5 -my-0.5 cursor-row-resize z-20 bg-transparent hover:bg-cyan-500/60 active:bg-cyan-500 transition-colors group relative flex items-center justify-center shrink-0 select-none border-t border-slate-800/80"
            title="按住鼠标拖拽调整标签区与分类树的垂直高度比例（双击复位默认 160px）"
            onDoubleClick={() => {
              setTagsHeight(160);
              localStorage.setItem('tomark_tags_height', '160');
            }}
          >
            <div className="h-0.5 w-8 bg-slate-700/60 group-hover:bg-cyan-400 group-active:bg-cyan-400 rounded-full transition" />
          </div>

          {/* 精简标签区 (高度可拖拽调整，折叠式展示) */}
          <div 
            style={isTagsCollapsed ? undefined : { height: `${tagsHeight}px` }}
            className="px-3 py-2 shrink-0 flex flex-col overflow-hidden"
          >
            <div 
              className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between cursor-pointer hover:text-slate-300 select-none shrink-0"
              onClick={() => setIsTagsCollapsed(!isTagsCollapsed)}
              title="折叠/展开标签区"
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
              <div className="mt-1 flex-1 flex flex-wrap content-start gap-1 px-1 overflow-y-auto">
                {tags.slice(0, showAllTags ? tags.length : 25).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTag(selectedTag === t.name ? '' : t.name)}
                    className={`px-2 py-0.5 rounded text-[10px] transition flex items-center gap-1 shrink-0 ${
                      selectedTag === t.name
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    <span>#{t.name}</span>
                    <span className="text-[9px] opacity-75 font-mono">({t.count})</span>
                  </button>
                ))}

                {tags.length > 25 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="text-[10px] text-cyan-400 hover:underline px-1 py-0.5 shrink-0"
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

        {/* 拖拽调整左侧栏宽度的分割把手 */}
        <div
          onMouseDown={startResizingSidebar}
          className="w-1.5 -ml-1 cursor-col-resize z-30 bg-transparent hover:bg-blue-500/60 active:bg-blue-500 transition-colors group relative flex items-center justify-center shrink-0 select-none"
          title="按住鼠标拖拽调整左侧栏宽度（双击复位默认 240px）"
          onDoubleClick={() => {
            setSidebarWidth(240);
            localStorage.setItem('tomark_sidebar_width', '240');
          }}
        >
          <div className="w-0.5 h-7 bg-slate-700/60 group-hover:bg-blue-400 group-active:bg-blue-400 rounded-full transition" />
        </div>

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
                    className={`px-1.5 py-0.5 rounded transition flex items-center gap-1.5 ${!selectedDomain ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-blue-300'}`}
                  >
                    {getCategoryTechIcon(selectedCategory, 13)}
                    <span>{selectedCategory}</span>
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

            <div className="flex items-center gap-2 shrink-0">
              {(selectedCategory || selectedDomain || selectedTag) && (
                <button
                  onClick={() => { setSelectedCategory(''); setSelectedDomain(''); setSelectedSubName(''); setSelectedTag(''); }}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 shrink-0"
                >
                  <X className="w-3 h-3" />
                  <span>重置筛选</span>
                </button>
              )}

              {/* 批量整理模式开关 */}
              <button
                onClick={() => {
                  const next = !isBatchMode;
                  setIsBatchMode(next);
                  if (!next) {
                    setSelectedBookmarkIds(new Set());
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 border shadow-sm ${
                  isBatchMode
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-cyan-950/50 font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
                title="开启多选批量整理（移动分类、批量增删标签、归档或删除）"
              >
                <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isBatchMode ? '退出批量' : '批量整理'}</span>
              </button>
            </div>
          </div>

          {/* 批量模式顶栏工具栏 */}
          {isBatchMode && (
            <div className="px-4 py-2 bg-cyan-950/40 border-b border-cyan-800/50 flex items-center justify-between text-xs animate-in fade-in shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 font-medium"
                >
                  {selectedBookmarkIds.size === bookmarks.length && bookmarks.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Square className="w-4 h-4 text-cyan-400/60" />
                  )}
                  <span>
                    {selectedBookmarkIds.size === bookmarks.length && bookmarks.length > 0
                      ? '取消全选'
                      : `全选当前筛选 (${bookmarks.length} 项)`}
                  </span>
                </button>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  已选 <strong className="text-cyan-300 font-mono">{selectedBookmarkIds.size}</strong> 项
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  (支持 Shift 连选范围)
                </span>
              </div>

              {selectedBookmarkIds.size > 0 && (
                <button
                  onClick={() => setSelectedBookmarkIds(new Set())}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  清空已选
                </button>
              )}
            </div>
          )}

          {/* 拖拽中的全局指引横幅 */}
          {draggingSubCat && (
            <div className="px-4 py-2 bg-gradient-to-r from-blue-950/90 via-cyan-950/90 to-blue-950/90 border-b border-cyan-500/50 flex items-center justify-center gap-2 text-xs text-cyan-300 font-medium animate-pulse shrink-0">
              <FolderInput className="w-4 h-4 text-cyan-400" />
              <span>正在拖拽转移站点「{draggingSubCat.name}」：拖拽到任意「一级大类」上松开即可转移分类</span>
            </div>
          )}

          {draggingBookmarkIds.length > 0 && !draggingSubCat && (
            <div className="px-4 py-2 bg-gradient-to-r from-blue-950/90 via-cyan-950/90 to-blue-950/90 border-b border-cyan-500/50 flex items-center justify-center gap-2 text-xs text-cyan-300 font-medium animate-pulse shrink-0">
              <FolderInput className="w-4 h-4 text-cyan-400" />
              <span>拖拽到左侧任意「大类」或「二级站点」即可快速归类 ({draggingBookmarkIds.length} 项)</span>
            </div>
          )}

          {/* 书签流 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            {bookmarks.map((bm, index) => {
              const isSelected = selectedBookmark?.id === bm.id;
              const isChecked = selectedBookmarkIds.has(bm.id);
              const isDragging = draggingBookmarkIds.includes(bm.id);

              return (
                <div
                  key={bm.id}
                  draggable={true}
                  onDragStart={(e) => {
                    const dragIds = (isBatchMode && selectedBookmarkIds.has(bm.id) && selectedBookmarkIds.size > 1)
                      ? Array.from(selectedBookmarkIds)
                      : [bm.id];
                    e.dataTransfer.setData('application/json', JSON.stringify({ bookmarkIds: dragIds }));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingBookmarkIds(dragIds);
                  }}
                  onDragEnd={() => {
                    setDraggingBookmarkIds([]);
                    setDragOverTarget(null);
                  }}
                  onClick={(e) => {
                    if (isBatchMode) {
                      handleToggleSelect(bm.id, index, e.shiftKey);
                    } else {
                      setSelectedBookmark(bm);
                    }
                  }}
                  className={`group p-4 rounded-xl border transition cursor-pointer relative ${
                    isDragging
                      ? 'opacity-40 border-dashed border-cyan-400 scale-[0.98]'
                      : isBatchMode && isChecked
                        ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                        : isSelected 
                          ? 'bg-blue-950/20 border-blue-500/60 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30' 
                          : 'bg-[#121824]/60 hover:bg-[#151c2a] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* 拖拽抓手图标 */}
                    <div 
                      className="mt-0.5 text-slate-600 group-hover:text-slate-400 transition cursor-grab active:cursor-grabbing shrink-0"
                      title="拖拽到左侧分类或二级站点进行归类"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* 批量勾选框 */}
                    {isBatchMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(bm.id, index, e.shiftKey);
                        }}
                        className="mt-0.5 p-0.5 text-cyan-400 hover:scale-110 transition shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                        )}
                      </button>
                    )}

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
                  {/* Category & Tags row (Pure bookmark focus) */}
                  {((bm.tags && bm.tags.length > 0) || bm.category) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {bm.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-900/90 text-blue-300 border border-slate-700/70 flex items-center gap-1.5 shadow-sm">
                          {getCategoryTechIcon(bm.category, 12)}
                          <span>{bm.category}</span>
                          {bm.sub_category && <span className="text-slate-400">· {bm.sub_category}</span>}
                        </span>
                      )}
                      {bm.tags && bm.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50">
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
                <QuantumLogoIcon size={36} className="mx-auto mb-3 opacity-30 text-blue-400" />
                <p className="text-sm text-slate-400 font-medium">书签库空空如也</p>
                <p className="text-xs text-slate-500 mt-1">点击右上角「+ 添加书签」输入任意网页链接体验 AI 自动解析</p>
              </div>
            )}
          </div>

          {/* 浮动批量操作快捷控制舱 (Cyberpunk Action Dock) */}
          {isBatchMode && selectedBookmarkIds.size > 0 && (
            <div className="p-3 border-t border-slate-800/80 bg-[#0c121e]/95 backdrop-blur-xl shrink-0 flex items-center justify-between gap-3 shadow-2xl shadow-cyan-950/80 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 shrink-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>已选择 <strong className="font-mono text-cyan-200">{selectedBookmarkIds.size}</strong> 项</span>
              </div>

              {/* 动作按钮组 */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setBatchModal({ type: 'category', targetCategory: '', subCategory: '' })}
                  disabled={isBatchActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/25 hover:bg-blue-600/35 text-blue-300 border border-blue-500/40 text-xs font-medium transition shadow-sm"
                  title="批量移动到指定大类或二级站点"
                >
                  <FolderInput className="w-3.5 h-3.5 text-blue-400" />
                  <span>移动分类</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchModal({ type: 'tags', newTagInput: '' })}
                  disabled={isBatchActionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/40 text-xs font-medium transition shadow-sm"
                  title="批量增删标签"
                >
                  <Tags className="w-3.5 h-3.5 text-indigo-400" />
                  <span>打标签</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchFavorite(true)}
                  disabled={isBatchActionLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/60 text-xs font-medium transition"
                  title="批量设为星标"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>星标</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchArchive(true)}
                  disabled={isBatchActionLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 text-xs font-medium transition"
                  title="批量移入归档箱"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>归档</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchModal({ type: 'delete' })}
                  disabled={isBatchActionLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/50 text-xs font-medium transition"
                  title="批量彻底删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBookmarkIds(new Set())}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
                  title="清空已选"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </main>

        {/* 拖拽调整右侧面板宽度的分割把手 */}
        <div
          onMouseDown={startResizingDetail}
          className="w-1.5 -ml-1 cursor-col-resize z-30 bg-transparent hover:bg-blue-500/60 active:bg-blue-500 transition-colors group relative flex items-center justify-center shrink-0 select-none"
          title="按住鼠标拖拽调整右侧栏宽度（双击复位默认 380px）"
          onDoubleClick={() => {
            setDetailWidth(380);
            localStorage.setItem('tomark_detail_width', '380');
          }}
        >
          <div className="w-0.5 h-8 bg-slate-700/60 group-hover:bg-blue-400 group-active:bg-blue-400 rounded-full transition" />
        </div>

        {/* 3. 右侧详情与分类管理面板 */}
        <aside 
          style={{ width: `${detailWidth}px` }}
          className="flex flex-col border-l border-slate-800/80 bg-[#0f1420]/50 backdrop-blur-xl shrink-0 relative"
        >
          {selectedBookmark ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* 顶栏操作区 */}
              <div className="h-11 px-4 border-b border-slate-800/70 flex items-center justify-between shrink-0 bg-[#0b0f17]/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    {getCategoryTechIcon(selectedBookmark.category, 14)}
                    <span>书签元数据与分类</span>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleFav(selectedBookmark.id)}
                    className={`p-1.5 rounded-md transition ${selectedBookmark.is_favorite ? 'text-amber-400 bg-amber-950/30' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'}`}
                    title={selectedBookmark.is_favorite ? '取消星标' : '设为星标'}
                  >
                    <Star className={`w-3.5 h-3.5 ${selectedBookmark.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(selectedBookmark.id)}
                    className={`p-1.5 rounded-md transition ${selectedBookmark.is_archived ? 'text-blue-400 bg-blue-950/30' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'}`}
                    title={selectedBookmark.is_archived ? '移出归档' : '归档书签'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={selectedBookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                    title="在浏览器中打开原网页"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(selectedBookmark.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                    title="删除此书签"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 详情主体滚动区 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
                {selectedBookmark.cover_image && (
                  <img
                    src={selectedBookmark.cover_image}
                    alt=""
                    className="w-full h-36 object-cover rounded-xl border border-slate-800 shadow-md"
                  />
                )}

                {/* 标题与网址 */}
                <div className="space-y-1.5">
                  <h2 className="text-sm font-bold text-white leading-snug">
                    {selectedBookmark.title}
                  </h2>
                  <a 
                    href={selectedBookmark.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-blue-400/90 hover:underline break-all font-mono block"
                  >
                    {selectedBookmark.url}
                  </a>
                </div>

                {/* 核心分类管理器 (Category & Sub-Category Reassignment) */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                      <span>所属大类与二级站点</span>
                    </span>
                    <button
                      onClick={() => {
                        setIsEditingCategory(!isEditingCategory);
                        setDetailSubCatInput(selectedBookmark.sub_category || '');
                      }}
                      className="text-[10px] text-blue-400 hover:underline font-medium"
                    >
                      {isEditingCategory ? '完成' : '修改分类'}
                    </button>
                  </div>

                  {!isEditingCategory ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-700/50 font-medium inline-flex items-center gap-1.5 shadow-sm">
                        {getCategoryTechIcon(selectedBookmark.category, 14)}
                        <span>{selectedBookmark.category || '未分类'}</span>
                      </span>

                      {selectedBookmark.sub_category && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium inline-flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          <span>{selectedBookmark.sub_category}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">选择归属大类</label>
                        <select
                          value={selectedBookmark.category || ''}
                          onChange={(e) => handleUpdateBookmarkCat(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">未分类</option>
                          {hierarchies.map(h => (
                            <option key={h.name} value={h.name}>{h.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">二级站点显示别名</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="如: GitHub 社区 / 季然博客"
                            value={detailSubCatInput}
                            onChange={(e) => setDetailSubCatInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateBookmarkCat(selectedBookmark.category, detailSubCatInput)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 标签管理 (Tag Management) */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TagIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>标签管理 ({(selectedBookmark.tags || []).length})</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(selectedBookmark.tags || []).map((t, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/80 inline-flex items-center gap-1.5 group"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-slate-500 hover:text-red-400 transition"
                          title="移除标签"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {(!selectedBookmark.tags || selectedBookmark.tags.length === 0) && (
                      <span className="text-[11px] text-slate-500 italic">暂无标签</span>
                    )}
                  </div>

                  {/* 快速追加标签表单 */}
                  <form onSubmit={handleAddTag} className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="+ 添加标签，回车保存..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!newTagInput.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-40"
                    >
                      添加
                    </button>
                  </form>
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
                            <span className="text-xs font-medium text-blue-300 flex items-center gap-1.5">
                              {getCategoryTechIcon(selectedBookmark.category, 13)}
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

                {/* 科技图鉴快捷入口卡片 */}
                <div 
                  onClick={() => setIsIconShowcaseOpen(true)}
                  className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-blue-500/40 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center justify-center">
                      <Palette className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">开源科技感图标图鉴</div>
                      <div className="text-[10px] text-slate-400">浏览本地科技微标与文件格式映射</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                </div>
              </div>


            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="h-10 px-4 border-b border-slate-800/60 flex items-center justify-between text-xs select-none shrink-0 bg-[#0c1017]/40">
                <span className="font-semibold text-slate-400">书签详情 & 分类管理</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <QuantumLogoIcon size={36} className="mb-3 opacity-40 text-blue-400" />
                <p className="text-xs text-slate-400 font-medium">选择任意书签查看 AI 智能摘要、归类与标签管理</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-[220px]">
                  可在右侧实时调整大类归属、自定义站点别名与编辑标签
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>


      {/* 科技感图标图鉴弹窗 */}
      <TechIconShowcase
        isOpen={isIconShowcaseOpen}
        onClose={() => setIsIconShowcaseOpen(false)}
      />

      {/* 新建大类弹窗 */}
      {isCreateCatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-400" />
                <span>新建自定义大类</span>
              </h3>
              <button onClick={() => setIsCreateCatOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">分类名称</label>
                <input
                  type="text"
                  placeholder="如: 云原生与架构 / 游戏开发"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCatOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重命名大类弹窗 */}
      {catAction.type === 'rename' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>重命名大类</span>
              </h3>
              <button onClick={() => setCatAction({ type: null, catName: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  原名称: <span className="text-white font-semibold">{catAction.catName}</span>
                </label>
                <input
                  type="text"
                  value={catAction.newName || ''}
                  onChange={(e) => setCatAction(prev => ({ ...prev, newName: e.target.value }))}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCatAction({ type: null, catName: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleRenameCategory}
                  disabled={!catAction.newName?.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  保存更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 合并大类弹窗 */}
      {catAction.type === 'merge' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span>合并大类</span>
              </h3>
              <button onClick={() => setCatAction({ type: null, catName: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                将分类 <span className="text-amber-400 font-semibold">{catAction.catName}</span> 下的所有书签与站点合并转移到目标分类中：
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">选择目标分类</label>
                <select
                  value={catAction.targetCat || ''}
                  onChange={(e) => setCatAction(prev => ({ ...prev, targetCat: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {hierarchies.filter(h => h.name !== catAction.catName).map(h => (
                    <option key={h.name} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCatAction({ type: null, catName: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleMergeCategory}
                  disabled={!catAction.targetCat}
                  className="px-4 py-1.5 rounded-lg text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
                >
                  确认合并
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除大类确认弹窗 */}
      {catAction.type === 'delete' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-red-900/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>删除分类: {catAction.catName}</span>
              </h3>
              <button onClick={() => setCatAction({ type: null, catName: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">请选择删除方式：</p>
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="delCatMode"
                    checked={!catAction.deleteBookmarks}
                    onChange={() => setCatAction(prev => ({ ...prev, deleteBookmarks: false }))}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-white">仅解绑分类 (推荐)</span>
                    <p className="text-[11px] text-slate-400">保留所有书签，移至「未分类」中，防止误删收藏。</p>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-800/80">
                  <input
                    type="radio"
                    name="delCatMode"
                    checked={!!catAction.deleteBookmarks}
                    onChange={() => setCatAction(prev => ({ ...prev, deleteBookmarks: true }))}
                    className="mt-0.5 text-red-600"
                  />
                  <div>
                    <span className="font-semibold text-red-400">彻底删除书签</span>
                    <p className="text-[11px] text-slate-400">连同该分类下的所有书签彻底从数据库删除。</p>
                  </div>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCatAction({ type: null, catName: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  className="px-4 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white font-medium"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 转移二级站点到其他大类 */}
      {subAction.type === 'move' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-400" />
                <span>转移站点到其他大类</span>
              </h3>
              <button onClick={() => setSubAction({ type: null, catName: '', domain: '', subName: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                将站点 <span className="text-blue-400 font-semibold">{subAction.subName || subAction.domain}</span> ({subAction.domain}) 下的所有书签转移到新大类：
              </p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">选择目标大类</label>
                <select
                  value={subAction.targetCat || ''}
                  onChange={(e) => setSubAction(prev => ({ ...prev, targetCat: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {hierarchies.map(h => (
                    <option key={h.name} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubAction({ type: null, catName: '', domain: '', subName: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleMoveSubCategory}
                  disabled={!subAction.targetCat}
                  className="px-4 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  确认转移
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重命名二级站点显示别名 */}
      {subAction.type === 'rename' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>修改站点显示别名</span>
              </h3>
              <button onClick={() => setSubAction({ type: null, catName: '', domain: '', subName: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  域名: <span className="font-mono text-white">{subAction.domain}</span>
                </label>
                <input
                  type="text"
                  placeholder="如: 季然技术博客 / Storyset 插画"
                  value={subAction.newName || ''}
                  onChange={(e) => setSubAction(prev => ({ ...prev, newName: e.target.value }))}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubAction({ type: null, catName: '', domain: '', subName: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleRenameSubCategory}
                  disabled={!subAction.newName?.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  保存别名
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除二级站点书签 */}
      {subAction.type === 'delete' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-red-900/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>删除站点书签: {subAction.subName || subAction.domain}</span>
              </h3>
              <button onClick={() => setSubAction({ type: null, catName: '', domain: '', subName: '' })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                确定要删除站点 <span className="text-white font-semibold">{subAction.domain}</span> 下的所有书签吗？
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubAction({ type: null, catName: '', domain: '', subName: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubCategory}
                  className="px-4 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white font-medium"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量移动分类弹窗 */}
      {batchModal.type === 'category' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131926] border border-blue-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-400" />
                <span>批量移动分类 ({selectedBookmarkIds.size} 项)</span>
              </h3>
              <button onClick={() => setBatchModal({ type: null })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                将选中的 <strong className="text-cyan-300 font-mono">{selectedBookmarkIds.size}</strong> 个书签一次性移动至目标大类：
              </p>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">目标一级大类</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {hierarchies.map((h) => {
                    const isSelected = (batchModal.targetCategory || hierarchies[0]?.name) === h.name;
                    return (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => setBatchModal(prev => ({ ...prev, targetCategory: h.name }))}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs border text-left transition ${
                          isSelected
                            ? 'bg-blue-600/30 border-blue-500/60 text-blue-300 font-semibold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        {getCategoryTechIcon(h.name, 14, "shrink-0", isSelected)}
                        <span className="truncate">{h.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  二级站点别名（可选，留空则保持书签原有二级站点）：
                </label>
                <input
                  type="text"
                  placeholder="如统一指定为某平台或站点别名"
                  value={batchModal.subCategory || ''}
                  onChange={(e) => setBatchModal(prev => ({ ...prev, subCategory: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBatchModal({ type: null })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isBatchActionLoading}
                  onClick={() => handleBatchMoveCategory(batchModal.targetCategory || hierarchies[0]?.name, batchModal.subCategory || '')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md transition disabled:opacity-50"
                >
                  {isBatchActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>确认批量移动</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量打标签弹窗 */}
      {batchModal.type === 'tags' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131926] border border-indigo-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Tags className="w-4 h-4 text-indigo-400" />
                <span>批量管理标签 ({selectedBookmarkIds.size} 项)</span>
              </h3>
              <button onClick={() => setBatchModal({ type: null })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1.5">
                  为选中的 {selectedBookmarkIds.size} 个书签统一添加新标签：
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入标签名，多个可用逗号或空格隔开，如: 前端, 重点, 工具"
                    value={batchModal.newTagInput || ''}
                    onChange={(e) => setBatchModal(prev => ({ ...prev, newTagInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (batchModal.newTagInput?.trim()) {
                          handleBatchAddTags(batchModal.newTagInput);
                        }
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (batchModal.newTagInput?.trim()) {
                        handleBatchAddTags(batchModal.newTagInput);
                      }
                    }}
                    disabled={!batchModal.newTagInput?.trim() || isBatchActionLoading}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition disabled:opacity-50 shrink-0"
                  >
                    添加
                  </button>
                </div>
              </div>

              {tags.length > 0 && (
                <div>
                  <div className="text-[11px] text-slate-400 mb-1.5 font-medium">常用已有标签（点击直接追加给所选书签）：</div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-lg border border-slate-800">
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleBatchAddTags(t.name)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-950/60 hover:text-indigo-300 hover:border-indigo-600/60 border border-slate-700 text-slate-300 text-[11px] transition"
                      >
                        +{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBatchModal({ type: null })}
                  className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {batchModal.type === 'delete' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#131926] border border-red-900/70 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>批量删除书签</span>
              </h3>
              <button onClick={() => setBatchModal({ type: null })} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                确定要从本地数据库中彻底删除选中的 <strong className="text-red-400 font-bold font-mono">{selectedBookmarkIds.size}</strong> 个书签吗？
              </p>
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-[11px] text-red-300/90">
                ⚠️ 此操作不可撤销，关联的标签索引与快照数据也将一并清除。
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBatchModal({ type: null })}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isBatchActionLoading}
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-500 text-white font-medium shadow-md transition disabled:opacity-50"
                >
                  {isBatchActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>彻底删除 ({selectedBookmarkIds.size})</span>
                </button>
              </div>
            </div>
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
                    setAiModel('cpa/deepseek-v4.1-flash-1017');
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
                            <span className="inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300 shrink-0 font-medium">
                              {getCategoryTechIcon(task.category, 11)}
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
