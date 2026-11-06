package main

import (
	"context"
	"fmt"
	"strings"

	"linkit/pkg/ai"
	"linkit/pkg/db"
	"linkit/pkg/keychain"
	"linkit/pkg/models"
	"linkit/pkg/scraper"
)

// App struct
type App struct {
	ctx context.Context
	db  *db.DB
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
	go func(bmID, title, content string) {
		baseURL := a.db.GetSetting("ai_base_url", "http://127.0.0.1:3425/v1")
		model := a.db.GetSetting("ai_model", "auto/deepseek-v4.1-flash")
		apiKey, _ := keychain.GetAPIKey()
		isLocal := strings.Contains(baseURL, "127.0.0.1") || strings.Contains(baseURL, "localhost")
		if isLocal && apiKey == "" {
			apiKey = "magpie"
		}
		if (apiKey != "" || isLocal) && len(content) > 20 {
			res, err := ai.AnalyzeContent(title, content, apiKey, baseURL, model)
			if err == nil && res != nil {
				_ = a.db.UpdateBookmarkAI(bmID, res.Summary, res.KeyTakeaways, res.SuggestedTags)
			}
		}
	}(saved.ID, saved.Title, pageMeta.ContentText)

	return saved, nil
}

// GetBookmarks returns bookmarks matching search and filter parameters.
func (a *App) GetBookmarks(search, tagName string, favoriteOnly, archivedOnly bool) ([]*models.Bookmark, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.db.GetBookmarks(search, tagName, favoriteOnly, archivedOnly)
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

	res, err := ai.AnalyzeContent(bm.Title, content, apiKey, baseURL, model)
	if err != nil {
		return nil, err
	}

	err = a.db.UpdateBookmarkAI(id, res.Summary, res.KeyTakeaways, res.SuggestedTags)
	if err != nil {
		return nil, err
	}

	return res, nil
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
