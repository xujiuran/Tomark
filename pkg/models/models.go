package models

import "time"

// Bookmark represents a saved URL with its extracted and AI-enriched metadata.
type Bookmark struct {
	ID          string    `json:"id"`
	URL         string    `json:"url"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	SubCategory string    `json:"sub_category"`
	Domain      string    `json:"domain"`
	FaviconURL  string    `json:"favicon_url"`
	CoverImage  string    `json:"cover_image"`
	ContentRaw  string    `json:"content_raw"`
	UserNotes   string    `json:"user_notes"`
	Highlights  string    `json:"highlights"`
	AISummary   string    `json:"ai_summary"`
	AIKeyPoints []string  `json:"ai_key_points"`
	Tags        []string  `json:"tags"`
	StatusCode  int       `json:"status_code"`
	IsArchived  bool      `json:"is_archived"`
	IsFavorite  bool      `json:"is_favorite"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CategoryCount represents a category with bookmark count.
type CategoryCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// SubCategoryCount represents a site/domain grouping under a primary category.
type SubCategoryCount struct {
	Name   string `json:"name"`
	Domain string `json:"domain"`
	Count  int    `json:"count"`
}

// CategoryHierarchy represents an 一级大类 and its 二级分类 (sites/domains).
type CategoryHierarchy struct {
	Name          string              `json:"name"`
	Count         int                 `json:"count"`
	SubCategories []*SubCategoryCount `json:"sub_categories"`
}

// Tag represents a category label.
type Tag struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
	Count int    `json:"count"`
}

// PageMetadata is the result of scraping and readability extraction.
type PageMetadata struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	FaviconURL  string `json:"favicon_url"`
	CoverImage  string `json:"cover_image"`
	ContentText string `json:"content_text"`
	Excerpt     string `json:"excerpt"`
}

// AISummaryResult is the structured result returned by the LLM.
type AISummaryResult struct {
	Summary       string   `json:"summary"`
	KeyTakeaways  []string `json:"key_takeaways"`
	SuggestedTags []string `json:"suggested_tags"`
	Category      string   `json:"category"`
}

// Stats represents dashboard statistics.
type Stats struct {
	TotalBookmarks int `json:"total_bookmarks"`
	Favorites      int `json:"favorites"`
	Archived       int `json:"archived"`
	TotalTags      int `json:"total_tags"`
}

// AIConfig holds model provider settings.
type AIConfig struct {
	BaseURL string `json:"base_url"`
	Model   string `json:"model"`
	APIKey  string `json:"api_key,omitempty"`
}

// ImportResult describes the outcome of a bookmark import.
type ImportResult struct {
	TotalImported int    `json:"total_imported"`
	Duplicates    int    `json:"duplicates"`
	Message       string `json:"message"`
}

// AnalysisTaskItem tracks a single bookmark's processing status in batch analysis.
type AnalysisTaskItem struct {
	BookmarkID string    `json:"bookmark_id"`
	Title      string    `json:"title"`
	URL        string    `json:"url"`
	Status     string    `json:"status"` // "pending", "processing", "completed", "failed"
	Category   string    `json:"category,omitempty"`
	Summary    string    `json:"summary,omitempty"`
	Tags       []string  `json:"tags,omitempty"`
	Error      string    `json:"error,omitempty"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// AnalysisProgress tracks background AI batch analysis.
type AnalysisProgress struct {
	Total      int                 `json:"total"`
	Processed  int                 `json:"processed"`
	Success    int                 `json:"success"`
	Failed     int                 `json:"failed"`
	IsRunning  bool                `json:"is_running"`
	Tasks      []*AnalysisTaskItem `json:"tasks,omitempty"`
}
