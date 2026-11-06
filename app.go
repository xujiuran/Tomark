package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"linkit/pkg/ai"
	"linkit/pkg/db"
	"linkit/pkg/importer"
	"linkit/pkg/keychain"
	"linkit/pkg/models"
	"linkit/pkg/scraper"
)

// App struct
type App struct {
	ctx               context.Context
	db                *db.DB
	analysisMu        sync.Mutex
	isAnalyzing       bool
	analysisTotal     int
	analysisProcessed int
	analysisSuccess   int
	analysisFailed    int
	analysisTasks     []*models.AnalysisTaskItem
}

// NewApp creates a new App application struct
func NewApp() *App {
	database, err := db.GetInstance()
	if err != nil {
		fmt.Printf("Database init error: %v\n", err)
	}
	return &App{
		db: database,
	}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// AddBookmark scrapes a URL, saves it to the SQLite database, and runs AI analysis if configured.
func (a *App) AddBookmark(targetURL string) (*models.Bookmark, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	targetURL = strings.TrimSpace(targetURL)
	if !strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://") {
		targetURL = "https://" + targetURL
	}

	pageMeta, err := scraper.FetchPage(targetURL)
	if err != nil {
		return nil, fmt.Errorf("error scraping URL: %w", err)
	}

	b := &models.Bookmark{
		URL:         targetURL,
		Title:       pageMeta.Title,
		Description: pageMeta.Description,
		FaviconURL:  pageMeta.FaviconURL,
		CoverImage:  pageMeta.CoverImage,
		ContentRaw:  pageMeta.ContentText,
		StatusCode:  200,
	}

	saved, err := a.db.CreateBookmark(b, []string{})
	if err != nil {
		return nil, fmt.Errorf("failed to save bookmark: %w", err)
	}

	// Try auto AI analysis in the background
	go func(bmID, title, targetURL, content string) {
		baseURL := a.db.GetSetting("ai_base_url", "http://127.0.0.1:3425/v1")
		model := a.db.GetSetting("ai_model", "auto/deepseek-v4.1-flash")
		apiKey, _ := keychain.GetAPIKey()
		isLocal := strings.Contains(baseURL, "127.0.0.1") || strings.Contains(baseURL, "localhost")
		if isLocal && apiKey == "" {
			apiKey = "magpie"
		}
		if (apiKey != "" || isLocal) && len(content) > 20 {
			res, err := ai.AnalyzeContent(title, targetURL, content, apiKey, baseURL, model)
			if err == nil && res != nil {
				_ = a.db.UpdateBookmarkAI(bmID, res.Summary, res.Category, res.KeyTakeaways, res.SuggestedTags)
			}
		}
	}(saved.ID, saved.Title, targetURL, pageMeta.ContentText)

	return saved, nil
}

// GetBookmarks returns bookmarks matching search and filter parameters.
func (a *App) GetBookmarks(search, tagName, category, domainFilter string, favoriteOnly, archivedOnly bool) ([]*models.Bookmark, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetBookmarks(search, tagName, category, domainFilter, favoriteOnly, archivedOnly)
}

// GetBookmark retrieves a single bookmark by ID.
func (a *App) GetBookmark(id string) (*models.Bookmark, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetBookmarkByID(id)
}

// DeleteBookmark deletes a bookmark by ID.
func (a *App) DeleteBookmark(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteBookmark(id)
}

// ToggleFavorite toggles favorite status for a bookmark.
func (a *App) ToggleFavorite(id string) (bool, error) {
	if a.db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	return a.db.ToggleFavorite(id)
}

// ToggleArchive toggles archive status for a bookmark.
func (a *App) ToggleArchive(id string) (bool, error) {
	if a.db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	return a.db.ToggleArchive(id)
}

// UpdateBookmarkNotes updates the user's personal notes/reflections for a bookmark.
func (a *App) UpdateBookmarkNotes(id, notes string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.UpdateBookmarkNotes(id, notes)
}

// UpdateBookmarkHighlights updates the JSON highlights for a bookmark.
func (a *App) UpdateBookmarkHighlights(id, highlightsJSON string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.UpdateBookmarkHighlights(id, highlightsJSON)
}

// FetchAndSaveContent scrapes clean article text if missing and persists it to local SQLite.
func (a *App) FetchAndSaveContent(id string) (string, error) {
	if a.db == nil {
		return "", fmt.Errorf("database not initialized")
	}
	bm, err := a.db.GetBookmarkByID(id)
	if err != nil {
		return "", err
	}
	if bm.ContentRaw != "" {
		return bm.ContentRaw, nil
	}

	pageMeta, err := scraper.FetchPage(bm.URL)
	if err != nil {
		return "", fmt.Errorf("正文抓取失败: %w", err)
	}
	content := pageMeta.ContentText
	if content == "" {
		content = pageMeta.Excerpt
	}
	if content == "" {
		content = pageMeta.Description
	}
	if content != "" {
		_ = a.db.SaveBookmarkContent(id, content)
	}
	return content, nil
}

// AnalyzeBookmark triggers on-demand AI analysis for a specific bookmark.
func (a *App) AnalyzeBookmark(id string) (*models.AISummaryResult, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	bm, err := a.db.GetBookmarkByID(id)
	if err != nil {
		return nil, err
	}

	baseURL := a.db.GetSetting("ai_base_url", "http://127.0.0.1:3425/v1")
	model := a.db.GetSetting("ai_model", "auto/deepseek-v4.1-flash")

	apiKey, _ := keychain.GetAPIKey()
	isLocal := strings.Contains(baseURL, "127.0.0.1") || strings.Contains(baseURL, "localhost")
	if !isLocal && apiKey == "" {
		return nil, fmt.Errorf("AI API key is not configured. Please set it in Settings.")
	}
	if isLocal && apiKey == "" {
		apiKey = "magpie"
	}

	content := bm.ContentRaw
	if content == "" {
		content = bm.Description
	}

	res, err := ai.AnalyzeContent(bm.Title, bm.URL, content, apiKey, baseURL, model)
	if err != nil {
		return nil, err
	}

	err = a.db.UpdateBookmarkAI(id, res.Summary, res.Category, res.KeyTakeaways, res.SuggestedTags)
	if err != nil {
		return nil, err
	}

	return res, nil
}

// GetCategoryHierarchy returns the two-level category tree (一级分类 -> 二级站点/主域名).
func (a *App) GetCategoryHierarchy() ([]*models.CategoryHierarchy, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetCategoryHierarchy()
}

// GetCategories returns category counts from the database.
func (a *App) GetCategories() ([]*models.CategoryCount, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetCategories()
}

// GetTags returns all tags and their frequency.
func (a *App) GetTags() ([]*models.Tag, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetTags()
}

// GetStats returns summary counts for the library.
func (a *App) GetStats() (*models.Stats, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetStats()
}

// SaveAIConfig saves AI provider settings.
func (a *App) SaveAIConfig(baseURL, model, apiKey string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	if baseURL != "" {
		_ = a.db.SetSetting("ai_base_url", baseURL)
	}
	if model != "" {
		_ = a.db.SetSetting("ai_model", model)
	}
	if apiKey != "" {
		if err := keychain.SaveAPIKey(apiKey); err != nil {
			return fmt.Errorf("failed to securely store API key: %w", err)
		}
	}
	return nil
}

// GetAIConfig retrieves current AI configuration (without exposing the raw API key).
func (a *App) GetAIConfig() (*models.AIConfig, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	apiKey, _ := keychain.GetAPIKey()
	hasKey := ""
	if apiKey != "" {
		hasKey = "••••••••••••••••"
	}
	return &models.AIConfig{
		BaseURL: a.db.GetSetting("ai_base_url", "http://127.0.0.1:3425/v1"),
		Model:   a.db.GetSetting("ai_model", "auto/deepseek-v4.1-flash"),
		APIKey:  hasKey,
	}, nil
}

// SelectAndImportBookmarks opens a native macOS file dialog to pick an HTML file.
func (a *App) SelectAndImportBookmarks() (*models.ImportResult, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择浏览器导出的书签 HTML 文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "HTML Bookmarks (*.html)",
				Pattern:     "*.html;*.htm",
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open file dialog: %w", err)
	}
	if filePath == "" {
		return nil, nil // user cancelled
	}
	return a.ImportBookmarkFile(filePath)
}

// ImportBookmarkFile parses an HTML file and saves all bookmarks.
func (a *App) ImportBookmarkFile(filePath string) (*models.ImportResult, error) {
	parsed, err := importer.ParseBookmarkFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to parse bookmarks file: %w", err)
	}
	if len(parsed) == 0 {
		return &models.ImportResult{Message: "未在文件中找到有效书签"}, nil
	}

	bookmarks := make([]*models.Bookmark, len(parsed))
	for i, p := range parsed {
		bookmarks[i] = p.Bookmark
	}

	res, err := a.db.BatchCreateBookmarks(bookmarks)
	if err != nil {
		return nil, fmt.Errorf("failed to save bookmarks: %w", err)
	}

	// Automatically start background AI analysis for new items
	if res.TotalImported > 0 {
		go a.StartBatchAIAnalysis()
	}

	return res, nil
}

// HasArcBrowser returns true if Arc browser data is detected.
func (a *App) HasArcBrowser() bool {
	return importer.HasArcBrowser()
}

// ExportArcBookmarks exports Arc browser bookmarks to /Users/tomatoxcj/Downloads/arc_bookmarks_YYYY_MM_DD.html.
func (a *App) ExportArcBookmarks() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	downloadsDir := filepath.Join(home, "Downloads")
	nowStr := time.Now().Format("2006_01_02")
	destPath := filepath.Join(downloadsDir, fmt.Sprintf("arc_bookmarks_%s.html", nowStr))

	count, err := importer.ExportArcToHTML(destPath)
	if err != nil {
		return "", fmt.Errorf("导出 Arc 书签失败: %w", err)
	}
	return fmt.Sprintf("已成功导出 %d 个 Arc 书签至: %s", count, destPath), nil
}

// ImportFromArc reads Arc browser sidebar directly and imports bookmarks with full deduplication.
func (a *App) ImportFromArc() (*models.ImportResult, error) {
	parsed, err := importer.ParseArcSidebar("")
	if err != nil {
		return nil, fmt.Errorf("读取 Arc 浏览器数据失败: %w", err)
	}
	if len(parsed) == 0 {
		return &models.ImportResult{Message: "未在 Arc 中找到有效书签或固定标签"}, nil
	}

	bookmarks := make([]*models.Bookmark, len(parsed))
	for i, p := range parsed {
		bookmarks[i] = p.Bookmark
	}

	res, err := a.db.BatchCreateBookmarks(bookmarks)
	if err != nil {
		return nil, fmt.Errorf("入库失败: %w", err)
	}

	if res.TotalImported > 0 {
		go a.StartBatchAIAnalysis()
	}

	return res, nil
}

// StartBatchAIAnalysis processes unanalyzed bookmarks in the background with local Magpie.
func (a *App) StartBatchAIAnalysis() (*models.AnalysisProgress, error) {
	a.analysisMu.Lock()
	if a.isAnalyzing {
		prog := &models.AnalysisProgress{
			Total:     a.analysisTotal,
			Processed: a.analysisProcessed,
			Success:   a.analysisSuccess,
			Failed:    a.analysisFailed,
			IsRunning: true,
			Tasks:     a.analysisTasks,
		}
		a.analysisMu.Unlock()
		return prog, nil
	}
	a.isAnalyzing = true
	a.analysisMu.Unlock()

	baseURL := a.db.GetSetting("ai_base_url", "http://127.0.0.1:3425/v1")
	model := a.db.GetSetting("ai_model", "auto/deepseek-v4.1-flash")
	apiKey, _ := keychain.GetAPIKey()
	isLocal := strings.Contains(baseURL, "127.0.0.1") || strings.Contains(baseURL, "localhost")
	if isLocal && apiKey == "" {
		apiKey = "magpie"
	}

	unanalyzed, err := a.db.GetUnanalyzedBookmarks(500)
	if err != nil || len(unanalyzed) == 0 {
		a.analysisMu.Lock()
		a.isAnalyzing = false
		a.analysisMu.Unlock()
		return &models.AnalysisProgress{IsRunning: false}, nil
	}

	// Initialize task tracking
	tasks := make([]*models.AnalysisTaskItem, len(unanalyzed))
	for i, bm := range unanalyzed {
		tasks[i] = &models.AnalysisTaskItem{
			BookmarkID: bm.ID,
			Title:      bm.Title,
			URL:        bm.URL,
			Status:     "pending",
		}
	}

	a.analysisMu.Lock()
	a.analysisTotal = len(unanalyzed)
	a.analysisProcessed = 0
	a.analysisSuccess = 0
	a.analysisFailed = 0
	a.analysisTasks = tasks
	a.analysisMu.Unlock()

	go func() {
		defer func() {
			a.analysisMu.Lock()
			a.isAnalyzing = false
			a.analysisMu.Unlock()
		}()

		// Concurrency worker pool: 2 workers
		sem := make(chan struct{}, 2)
		for i, bm := range unanalyzed {
			taskItem := tasks[i]
			sem <- struct{}{}
			go func(target *models.Bookmark, item *models.AnalysisTaskItem) {
				defer func() { <-sem }()

				a.analysisMu.Lock()
				item.Status = "processing"
				a.analysisMu.Unlock()

				content := target.ContentRaw
				// If no content, try quick scrape or fallback to title
				if content == "" {
					page, err := scraper.FetchPage(target.URL)
					if err == nil && page != nil {
						content = page.ContentText
						if target.FaviconURL == "" && page.FaviconURL != "" {
							target.FaviconURL = page.FaviconURL
						}
						if target.Description == "" && page.Description != "" {
							target.Description = page.Description
						}
						if content != "" {
							_ = a.db.SaveBookmarkContent(target.ID, content)
						}
					}
				}
				if content == "" {
					content = target.Title
				}

				res, err := ai.AnalyzeContent(target.Title, target.URL, content, apiKey, baseURL, model)
				a.analysisMu.Lock()
				if err == nil && res != nil {
					_ = a.db.UpdateBookmarkAI(target.ID, res.Summary, res.Category, res.KeyTakeaways, res.SuggestedTags)
					item.Status = "completed"
					item.Category = res.Category
					item.Summary = res.Summary
					item.Tags = res.SuggestedTags
					a.analysisSuccess++
				} else {
					item.Status = "failed"
					if err != nil {
						item.Error = err.Error()
					}
					a.analysisFailed++
				}
				a.analysisProcessed++
				a.analysisMu.Unlock()
			}(bm, taskItem)
		}

		// Wait for all workers to finish
		for i := 0; i < cap(sem); i++ {
			sem <- struct{}{}
		}
	}()

	return &models.AnalysisProgress{
		Total:     len(unanalyzed),
		Processed: 0,
		Success:   0,
		Failed:    0,
		IsRunning: true,
		Tasks:     tasks,
	}, nil
}

// GetAnalysisProgress returns current background AI analysis status and all task results.
func (a *App) GetAnalysisProgress() (*models.AnalysisProgress, error) {
	a.analysisMu.Lock()
	defer a.analysisMu.Unlock()
	return &models.AnalysisProgress{
		Total:     a.analysisTotal,
		Processed: a.analysisProcessed,
		Success:   a.analysisSuccess,
		Failed:    a.analysisFailed,
		IsRunning: a.isAnalyzing,
		Tasks:     a.analysisTasks,
	}, nil
}

// ResetAndReanalyzeAll clears previous summaries and categories and restarts batch analysis.
func (a *App) ResetAndReanalyzeAll() (*models.AnalysisProgress, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	a.analysisMu.Lock()
	if a.isAnalyzing {
		a.analysisMu.Unlock()
		return nil, fmt.Errorf("analysis is currently in progress")
	}
	a.analysisMu.Unlock()

	if err := a.db.ResetAllAnalysis(); err != nil {
		return nil, err
	}
	return a.StartBatchAIAnalysis()
}

// CreateCategory adds a new user-defined category.
func (a *App) CreateCategory(name string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.CreateCategory(name)
}

// RenameCategory updates an existing category name.
func (a *App) RenameCategory(oldName, newName string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.RenameCategory(oldName, newName)
}

// MergeCategories merges source category into target category.
func (a *App) MergeCategories(sourceCat, targetCat string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.MergeCategories(sourceCat, targetCat)
}

// DeleteCategory deletes or unassigns a category.
func (a *App) DeleteCategory(category string, deleteBookmarks bool) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteCategory(category, deleteBookmarks)
}

// MoveSubCategory moves all bookmarks of a domain to a target category.
func (a *App) MoveSubCategory(domain, targetCategory string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.MoveSubCategory(domain, targetCategory)
}

// RenameSubCategory renames the display alias for a domain.
func (a *App) RenameSubCategory(domain, newDisplayName string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.RenameSubCategory(domain, newDisplayName)
}

// DeleteSubCategory deletes or unassigns bookmarks under a domain.
func (a *App) DeleteSubCategory(category, domain string, deleteBookmarks bool) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.DeleteSubCategory(category, domain, deleteBookmarks)
}

// UpdateBookmarkCategory updates category and sub_category for a single bookmark.
func (a *App) UpdateBookmarkCategory(bookmarkID, category, subCategory string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.UpdateBookmarkCategory(bookmarkID, category, subCategory)
}

// UpdateBookmarkTags updates tags for a bookmark.
func (a *App) UpdateBookmarkTags(bookmarkID string, tags []string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.db.UpdateBookmarkTags(bookmarkID, tags)
}
